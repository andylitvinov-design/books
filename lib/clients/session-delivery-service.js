import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { seal, openSealed } from '../app/crypto.js'
import { clientPayload, emptySessionDraft, normalizeDraft, normalizeClientPlan, validUuid } from './delivery-model.js'
import { selectedMaterialSnapshots } from './material-library.js'

const missing = () => { throw new AppError('SESSION_UNAVAILABLE',404) }
const documentFingerprint = record => createHash('sha256').update(JSON.stringify(record)).digest('hex')
// The editable consultation document is not the published client version.
// Copy only client-facing fields into the encrypted session publication: owner
// notes, invitation secrets and unapproved per-item notes must never enter it.
const reportSnapshotFields = Object.freeze([
  'id','clientId','kind','status','patientName','patientDob','dateIssued',
  'languagePreference','recommendationType','practitionerName','practitionerRole',
  'practitionerBackground','practitionerContact','generalInstructions','analysis',
  'progressBefore','progressAfter',
  'recommendationsText','additionalNotes','recommendedTestKeys','daoResourceScore',
  'daoResourcePublished','includeDistanceHomeopathy','recommendationNumber',
  'followUp','followUpDate','updatedAt',
  'dateOfService','amount','currency','service','consultations','documentNumber',
  'paymentMethod','paymentStatus',
])
const reportItemSnapshotFields = Object.freeze([
  'itemType','remedySlug','displayNameOverride','potency','granules','timesPerDay',
  'dosage','frequency','duration','instructions','purpose','sequence',
])
function selectApprovedFields(source,fields) {
  const output={}
  for(const field of fields) if(Object.hasOwn(source,field)) output[field]=source[field]
  return output
}
function approvedReportSnapshot(record) {
  if(!record) return null
  const visible=selectApprovedFields(record,reportSnapshotFields)
  if(Array.isArray(record.items))
    visible.items=record.items.map(item=>selectApprovedFields(item,reportItemSnapshotFields))
  return visible
}
// Source status is checked fresh for revocation on every request. When the
// source was edited after publication, return exactly the sealed, reviewed
// version; never substitute the new unreviewed document. Older publications
// without an embedded snapshot keep their strict legacy fingerprint guard.
function publishedReportVersion(payload,current,clientId) {
  if(!current||!payload?.reportDocumentId||!payload?.reportFingerprint)return null
  if(Object.hasOwn(payload,'reportSnapshot')) {
    const version=payload.reportSnapshot
    if(!version||version.id!==payload.reportDocumentId||version.clientId!==clientId||
      version.kind!==current.kind||version.status!=='active'||
      typeof payload.reportSnapshotFingerprint!=='string'||
      !/^[a-f0-9]{64}$/.test(payload.reportSnapshotFingerprint)||
      documentFingerprint(version)!==payload.reportSnapshotFingerprint) return null
    return version
  }
  return documentFingerprint(current)===payload.reportFingerprint?current:null
}
function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0,10)
  if(typeof value==='string') return value.slice(0,10)
  missing()
}
const context = (row,field) => ({ accountId:row.legacy_client_id, recordId:row.id, field:'session.'+field })
const unpack = (row,config,field) => openSealed(row[field+'_payload'],context(row,field),config)
const pack = (row,value,config,field) => seal(value,context(row,field),config)
const publicRow = (row,payload) => ({
  id:row.id, clientId:row.legacy_client_id, occurredOn:dateOnly(row.occurred_on),
  status:row.status, draftRevision:row.draft_revision, publishedRevision:row.published_revision,
  publishedAt:row.published_at, sourceConsultationId:row.source_consultation_id,
  ...payload,
})
async function activeClient(store,clientId) {
  if (!validUuid(clientId)) missing()
  const client=await store?.findClientById(clientId)
  if (!client || client.status!=='active') missing()
  return client
}
async function verifiedDocument(store,clientId,id) {
  if (!id) return null
  if (!validUuid(id)) missing()
  const doc=await store?.findById(id)
  if (!doc || doc.clientId!==clientId || doc.status!=='active' || doc.kind==='report') missing()
  return doc
}
async function verifyDraftAssets(db,session,draft,{onlyPublished=false}={}) {
  const ids = draft.media.filter(item=>!onlyPublished || item.scope==='client').map(item=>item.assetId)
  if (!ids.length) return []
  const rows = (await db.query(
    'select id,session_id,legacy_client_id,scope,asset_kind,mime,status,bytes,duration_seconds from app_private.client_delivery_assets where session_id=$1 and legacy_client_id=$2 and id=any($3::uuid[])',
    [session.id,session.legacy_client_id,ids])).rows
  if(rows.length!==ids.length || rows.some(asset=>asset.status!=='ready' ||
    !draft.media.some(item=>item.assetId===asset.id && item.scope===asset.scope))) missing()
  return rows
}
function assetView(asset) {
  return {id:asset.id,kind:asset.asset_kind,scope:asset.scope,mime:asset.mime,
    durationSeconds:asset.duration_seconds,bytes:asset.bytes,status:asset.status}
}
function dateOrToday(value) {
  const s=value||new Date().toISOString().slice(0,10)
  if(typeof s!=='string' || !/^20[2-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(s) ||
    Number.isNaN(Date.parse(s+'T00:00:00Z')) || new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s) throw new AppError('INVALID_DATE',400)
  return s
}
async function lookup(config,clientId,sessionId,lock=false) {
  if(!validUuid(sessionId)||!validUuid(clientId)) missing()
  return transaction(config,null,async db=>
    (await db.query('select * from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2'+(lock?' for update':''),
      [sessionId,clientId])).rows[0],{server:true})
}
export async function listClientSessions(config,store,clientId,{publishedOnly=false}={}) {
  await activeClient(store,clientId)
  return transaction(config,null,async db=>{
    const rows=(await db.query(
      'select * from app_private.client_delivery_sessions where legacy_client_id=$1'+(publishedOnly?" and status='published'":'')+
      ' order by occurred_on desc,created_at desc limit 150',[clientId])).rows
    return rows.map(row=>{
      const data=unpack(row,config,publishedOnly?'published':row.status==='draft'?'draft':'published')||unpack(row,config,'draft')
      return {id:row.id,occurredOn:dateOnly(row.occurred_on),status:row.status,
        title:data.title,publishedAt:row.published_at,sourceConsultationId:row.source_consultation_id}
    })
  },{server:true})
}
export async function createClientSession(config,store,clientId,{documentId=null,assessmentId=null,occurredOn,title}={}) {
  await activeClient(store,clientId)
  if(documentId&&assessmentId) throw new AppError('INVALID_SESSION_SOURCE',400)
  let assessment=null
  if(assessmentId){
    if(!validUuid(assessmentId)) missing()
    assessment=await store?.findClientAssessment?.(assessmentId)
    if(!assessment||assessment.clientId!==clientId||!['draft','shared'].includes(assessment.status))missing()
  }
  const doc=await verifiedDocument(store,clientId,documentId)
  // Existing source slot identifies the saved source. No assessment content or
  // practitioner comment is copied into the client-facing session payload.
  const consultationId=assessment?.id||(doc?(doc.consultationId||doc.id):null)
  const day=dateOrToday(occurredOn||assessment?.occurredOn||doc?.dateIssued)
  const id=randomUUID()
  const row={id,legacy_client_id:clientId}
  const draft=emptySessionDraft({title: typeof title==='string'&&title.trim()?title.trim().slice(0,160):'Personal consultation',
    reportDocumentId:doc?.id||null})
  return transaction(config,null,async db=>{
    if(consultationId) {
      const found=(await db.query(
        'select id from app_private.client_delivery_sessions where legacy_client_id=$1 and source_consultation_id=$2',
        [clientId,consultationId])).rows[0]
      if(found) return {id:found.id,existing:true}
    }
    const result=await db.query(
      'insert into app_private.client_delivery_sessions(id,legacy_client_id,source_consultation_id,occurred_on,draft_payload) values($1,$2,$3,$4,$5) on conflict do nothing returning id',
      [id,clientId,consultationId,day,pack(row,draft,config,'draft')])
    if(result.rows[0]) return {id,existing:false}
    const found=(await db.query('select id from app_private.client_delivery_sessions where legacy_client_id=$1 and source_consultation_id=$2',
      [clientId,consultationId])).rows[0]
    if(!found) missing()
    return {id:found.id,existing:true}
  },{server:true})
}
export async function getOwnerSession(config,store,clientId,sessionId) {
  await activeClient(store,clientId)
  const row=await lookup(config,clientId,sessionId)
  if(!row) missing()
  const draft=unpack(row,config,'draft')
  const reportRecord=draft.reportDocumentId ? await verifiedDocument(store,clientId,draft.reportDocumentId).catch(error=>{
    if(error?.code==='SESSION_UNAVAILABLE') return null
    throw error
  }) : null
  const assets=await transaction(config,null,async db=>
    (await db.query('select * from app_private.client_delivery_assets where session_id=$1 and legacy_client_id=$2 and status<>$3 order by created_at',
      [sessionId,clientId,'removed'])).rows.map(assetView),{server:true})
  // This review token is owner-only. Client/guest projections must never carry
  // it, and a later source edit must not silently replace it before publishing.
  const publicationSource={reportDocumentId:draft.reportDocumentId||null,
    reportFingerprint:reportRecord?documentFingerprint(reportRecord):null}
  return {...publicRow(row,{draft,assets,publicationSource}),published:row.published_payload?unpack(row,config,'published'):null}
}
export async function saveOwnerDraft(config,store,clientId,sessionId,body) {
  await activeClient(store,clientId)
  const draft=normalizeDraft(body?.draft)
  const expected=Number(body?.expectedRevision)
  if(!Number.isSafeInteger(expected)||expected<1) throw new AppError('REVISION_REQUIRED',409)
  await verifiedDocument(store,clientId,draft.reportDocumentId)
  return transaction(config,null,async db=>{
    const row=(await db.query('select * from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for update',
      [sessionId,clientId])).rows[0]
    if(!row || row.status==='archived') missing()
    if(expected!==row.draft_revision) throw new AppError('SESSION_CHANGED',409)
    await verifyDraftAssets(db,row,draft)
    if(draft.plan.materialIds!==undefined)
      draft.plan.materials=await selectedMaterialSnapshots(db,draft.plan.materialIds)
    else if(draft.plan.materials?.length)missing()
    const version=expected+1
    await db.query('update app_private.client_delivery_sessions set draft_payload=$3,draft_revision=$4,updated_at=now() where id=$1 and legacy_client_id=$2',
      [sessionId,clientId,pack(row,draft,config,'draft'),version])
    return {id:sessionId,draftRevision:version}
  },{server:true})
}
export async function attachSessionAsset(config,store,clientId,sessionId,assetId,{reviewFirst=false}={}) {
  await activeClient(store,clientId)
  return transaction(config,null,async db=>{
    const row=(await db.query('select * from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for update',
      [sessionId,clientId])).rows[0]
    const asset=(await db.query('select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3',
      [assetId,sessionId,clientId])).rows[0]
    if(!row || row.status==='archived' || !asset || asset.status!=='ready') missing()
    const draft=unpack(row,config,'draft')
    if(!draft.media.some(item=>item.assetId===assetId)) {
      if(asset.asset_kind==='image') {
        const attached=draft.media.map(item=>item.assetId)
        const count=attached.length?(await db.query(
          "select count(*)::integer as total from app_private.client_delivery_assets where session_id=$1 and legacy_client_id=$2 and asset_kind='image' and id=any($3::uuid[])",
          [sessionId,clientId,attached])).rows[0].total:0
        if(count>=12) throw new AppError('SESSION_PHOTO_LIMIT',413)
      }
      draft.media.push({assetId,scope:asset.scope,title:asset.asset_kind==='image'?'Consultation photo':asset.asset_kind==='pdf'?'Additional PDF material':
        asset.asset_kind==='video'?'Video message':
        asset.scope==='practitioner'?'Private voice note':'Voice message',
        role:['pdf','image'].includes(asset.asset_kind)?'additional':
        (reviewFirst&&asset.scope==='client'&&['audio','video'].includes(asset.asset_kind)?'hidden':'personal'),
        transcript:'',sortOrder:draft.media.length})
      await db.query('update app_private.client_delivery_sessions set draft_payload=$2,draft_revision=draft_revision+1,updated_at=now() where id=$1',
        [sessionId,pack(row,normalizeDraft(draft),config,'draft')])
    }
    return {id:assetId,attached:true}
  },{server:true})
}
// Permanently discard only an owner-selected, not-currently-published take.
// Lock the session before touching the asset; concurrent publish/edit cannot
// create a new client-visible reference after this revision is removed.
export async function markUnpublishedSessionAssetRemoved(config,store,clientId,sessionId,assetId) {
  await activeClient(store,clientId)
  if(!validUuid(sessionId)||!validUuid(assetId))missing()
  return transaction(config,null,async db=>{
    const row=(await db.query(
      'select * from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for update',
      [sessionId,clientId])).rows[0]
    if(!row||row.status==='archived')missing()
    const published=row.published_payload?unpack(row,config,'published'):null
    if(published?.media?.some(item=>item.assetId===assetId))
      throw new AppError('MEDIA_ALREADY_PUBLISHED',409)
    const asset=(await db.query(
      "select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3 for update",
      [assetId,sessionId,clientId])).rows[0]
    if(!asset||asset.status!=='ready'||!['audio','video'].includes(asset.asset_kind))
      missing()
    const draft=unpack(row,config,'draft')
    draft.media=draft.media.filter(item=>item.assetId!==assetId)
    const result=await db.query(
      "update app_private.client_delivery_assets set status='removed' where id=$1 and session_id=$2 and legacy_client_id=$3 and status='ready'",
      [assetId,sessionId,clientId])
    if(result.rowCount!==1)missing()
    await db.query(
      'update app_private.client_delivery_sessions set draft_payload=$3,draft_revision=draft_revision+1,updated_at=now() where id=$1 and legacy_client_id=$2',
      [sessionId,clientId,pack(row,normalizeDraft(draft),config,'draft')])
    return {assetId,objectKey:asset.object_key,provider:asset.storage_provider||'supabase'}
  },{server:true})
}
export async function publishClientSession(config,store,clientId,sessionId,review) {
  await activeClient(store,clientId)
  return transaction(config,null,async db=>{
    const row=(await db.query('select * from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for update',
      [sessionId,clientId])).rows[0]
    if(!row || row.status==='archived') missing()
    const draft=normalizeDraft(unpack(row,config,'draft'))
    // Publication is a distinct owner action for one reviewed revision. Never
    // substitute the latest draft or source after the owner pressed Publish.
    if(!Number.isSafeInteger(review?.expectedRevision)||review.expectedRevision<1)
      throw new AppError('PUBLICATION_REVIEW_REQUIRED',409)
    if(review.expectedRevision!==row.draft_revision)
      throw new AppError('SESSION_CHANGED',409)
    if(review.expectedReportDocumentId!==draft.reportDocumentId)
      throw new AppError('REPORT_SESSION_MISMATCH',409)
    if(draft.reportDocumentId ? !/^[a-f0-9]{64}$/.test(review.expectedReportFingerprint||'') :
      review.expectedReportFingerprint!==null)
      throw new AppError('PUBLICATION_REVIEW_REQUIRED',409)
    await verifyDraftAssets(db,row,draft,{onlyPublished:true})
    // Recheck material availability at publish time. Never publish fabricated
    // client-supplied object paths or allow orphan/private library media.
    if(draft.plan.materialIds!==undefined)
      draft.plan.materials=await selectedMaterialSnapshots(db,draft.plan.materialIds)
    else if(draft.plan.materials?.length)missing()
    // Read the exact source while the session row is locked. A source change
    // after this read still fails closed in the fingerprint-verified readers.
    const reportRecord=draft.reportDocumentId ? await verifiedDocument(store,clientId,draft.reportDocumentId) : null
    const reportFingerprint=reportRecord?documentFingerprint(reportRecord):null
    if(reportFingerprint!==review.expectedReportFingerprint)
      throw new AppError('REPORT_VERSION_CHANGED',409)
    const reportSnapshot=approvedReportSnapshot(reportRecord)
    const snapshot={...clientPayload(draft),reportFingerprint,
      reportSnapshot,reportSnapshotFingerprint:reportSnapshot?documentFingerprint(reportSnapshot):null}
    await db.query("update app_private.client_delivery_sessions set published_payload=$3,published_revision=draft_revision,status='published',published_at=now(),updated_at=now() where id=$1 and legacy_client_id=$2",
      [sessionId,clientId,pack(row,snapshot,config,'published')])
    return {id:sessionId,revision:row.draft_revision}
  },{server:true})
}
export async function archiveClientSession(config,store,clientId,sessionId) {
  await activeClient(store,clientId)
  return transaction(config,null,async db=>{
    const row=(await db.query("update app_private.client_delivery_sessions set status='archived',updated_at=now() where id=$1 and legacy_client_id=$2 returning id",
      [sessionId,clientId])).rows[0]
    if(!row) missing()
    return {id:row.id,status:'archived'}
  },{server:true})
}
export async function getPublishedClientSession(config,store,clientId,sessionId) {
  await activeClient(store,clientId)
  const row=await lookup(config,clientId,sessionId)
  if(!row||row.status!=='published'||!row.published_payload) missing()
  const payload=unpack(row,config,'published')
  const doc=payload.reportDocumentId?await verifiedDocument(store,clientId,payload.reportDocumentId).catch(error=>{
    if(error?.code==='SESSION_UNAVAILABLE') return null
    throw error
  }):null
  const publishedReport=publishedReportVersion(payload,doc,clientId)
  const publishedMedia=payload.media.filter(item=>item.scope==='client')
  const assets=publishedMedia.length ? await transaction(config,null,async db=>
    (await db.query(
      "select id,asset_kind,mime,duration_seconds from app_private.client_delivery_assets where session_id=$1 and legacy_client_id=$2 and scope='client' and status='ready' and id=any($3::uuid[])",
      [sessionId,clientId,publishedMedia.map(item=>item.assetId)])).rows,{server:true}) : []
  const assetMap=new Map(assets.map(asset=>[asset.id,asset]))
  return publicRow(row,{title:payload.title,summary:payload.summary,plan:normalizeClientPlan(payload.plan),
    report:publishedReport?{id:publishedReport.id,date:publishedReport.dateIssued,kind:publishedReport.kind}:null,
    media:publishedMedia.filter(item=>assetMap.has(item.assetId)).map(item=>{
      const asset=assetMap.get(item.assetId)
      return {...item,kind:asset.asset_kind,mime:asset.mime,durationSeconds:asset.duration_seconds}
    })})
}
export async function getSessionAsset(config,clientId,sessionId,assetId) {
  if(!validUuid(assetId)) missing()
  const asset=await transaction(config,null,async db=>(await db.query(
    "select * from app_private.client_delivery_assets where id=$1 and session_id=$2 and legacy_client_id=$3 and status='ready'",
    [assetId,sessionId,clientId])).rows[0],{server:true})
  if(!asset) missing()
  return asset
}


// Return the exact verified source used to render a PDF. Do not refetch it after
// fingerprint verification: a concurrent owner edit must not expose a new draft.
export async function getPublishedSessionReport(config,store,clientId,sessionId) {
  await activeClient(store,clientId)
  const row=await lookup(config,clientId,sessionId)
  if(!row||row.status!=='published'||!row.published_payload) missing()
  const payload=unpack(row,config,'published')
  if(!payload.reportDocumentId||!payload.reportFingerprint)missing()
  const record=await verifiedDocument(store,clientId,payload.reportDocumentId)
  const published=publishedReportVersion(payload,record,clientId)
  if(!published)missing()
  return published
}
