import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash,randomUUID} from 'node:crypto'
import {clientPayload,emptySessionDraft,normalizeDraft,normalizeClientPlan,validUuid,guestSessionProjection} from '../lib/clients/delivery-model.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const service=read('lib/clients/session-delivery-service.js')
const studio=read('components/admin-session-studio.jsx')
const CLIENT='65067674-3aa7-40c8-8c4b-0a096732f9f1'
const SESSION='1ef902ca-37f8-4fd7-a720-8352f1d072e5'
const DOC='b9ae1f6d-0cf2-4d46-aa80-b2aa37c86d22'
const OTHER='b9ae1f6d-0cf2-4d46-aa80-b2aa37c86d23'
const AUDIO='29e2a748-ea4c-4cb4-9561-5224482f9b44'
const PRIVATE='09a8c81b-93c4-4a89-adb0-084e293bdacc'
const HIDDEN='09a8c81b-93c4-4a89-adb0-084e293bdacd'
const MATERIAL='d7a9c2de-667e-43c2-9e16-134bbf000001'
const clone=value=>structuredClone(value)
const fingerprint=record=>createHash('sha256').update(JSON.stringify(record)).digest('hex')
class AppError extends Error {constructor(code,status){super(code);this.name='AppError';this.code=code;this.status=status}}
const load=(source,dependencies,result)=>new Function(...Object.keys(dependencies),
  source.replace(/^import .*\n/gm,'').replace(/export /g,'')+'\nreturn '+result)(...Object.values(dependencies))

function fixture({withoutReport=false,afterMaterials,afterPublishSeal}={}) {
  let record={id:DOC,clientId:CLIENT,kind:'recommendation',status:'active',
    updatedAt:'2026-10-16T00:00:00Z',analysis:'Reviewed report',internalNotes:'Practitioner source note'}
  const draft=normalizeDraft({...emptySessionDraft({title:'Reviewed session',reportDocumentId:withoutReport?null:DOC}),
    summary:'Reviewed client message',plan:{materialIds:[MATERIAL]},media:[
      {assetId:AUDIO,scope:'client',title:'Reviewed recording',transcript:'Approved',role:'personal'},
      {assetId:PRIVATE,scope:'practitioner',title:'Practitioner-only note',transcript:'Secret',role:'personal'},
      {assetId:HIDDEN,scope:'client',title:'Hidden recording',transcript:'Hidden',role:'hidden'},
    ]})
  const row={id:SESSION,legacy_client_id:CLIENT,source_consultation_id:DOC,
    occurred_on:'2026-10-16',status:'published',draft_revision:4,published_revision:2,
    draft_payload:draft,published_payload:{...clientPayload(emptySessionDraft({title:'Previously published',reportDocumentId:withoutReport?null:DOC})),
      reportFingerprint:withoutReport?null:fingerprint(record)}}
  const assets=draft.media.map(item=>({id:item.assetId,session_id:SESSION,legacy_client_id:CLIENT,
    scope:item.scope,status:'ready',asset_kind:'audio',mime:'audio/mp4',bytes:512}))
  let publicationWrites=0,draftWrites=0
  const events=[]
  const db={query:async(sql,values=[])=>{
    events.push(sql)
    if(sql.startsWith('select * from app_private.client_delivery_sessions'))
      return {rows:values[0]===SESSION&&values[1]===CLIENT?[row]:[]}
    if(sql.startsWith('select * from app_private.client_delivery_assets'))return {rows:clone(assets)}
    if(sql.startsWith('select id,session_id')||sql.startsWith('select id,asset_kind'))
      return {rows:clone(assets.filter(asset=>values[2].includes(asset.id)))}
    if(sql.startsWith('update app_private.client_delivery_sessions set draft_payload')) {
      draftWrites++;row.draft_payload=clone(values[2]);row.draft_revision=values[3];return {rowCount:1}
    }
    if(sql.startsWith('update app_private.client_delivery_sessions set published_payload')) {
      publicationWrites++;row.published_payload=clone(values[2]);row.published_revision=row.draft_revision
      row.status='published';return {rowCount:1}
    }
    throw new Error('Unexpected synthetic query: '+sql)
  }}
  const store={findClientById:async id=>id===CLIENT?{status:'active'}:null,
    findById:async id=>{events.push('source-read');return id===record.id?clone(record):null}}
  const dependencies={createHash,randomUUID,AppError,
    transaction:async(config,actor,work)=>work(db),
    seal:(value,context)=>{if(context.field==='session.published')afterPublishSeal?.(changeSource);return clone(value)},
    openSealed:value=>clone(value),clientPayload,emptySessionDraft,normalizeDraft,normalizeClientPlan,validUuid,
    selectedMaterialSnapshots:async(database,ids)=>{
      afterMaterials?.(changeSource)
      return ids.map(id=>({id,kind:'image',title:'Approved general diagram',description:'',mime:'image/png'}))
    }}
  const functions=load(service,dependencies,'({getOwnerSession,saveOwnerDraft,publishClientSession,getPublishedClientSession,getPublishedSessionReport})')
  function changeSource(patch){record={...record,...patch}}
  const review=()=>({expectedRevision:row.draft_revision,expectedReportDocumentId:row.draft_payload.reportDocumentId,
    expectedReportFingerprint:row.draft_payload.reportDocumentId?fingerprint(record):null})
  return {row,events,review,changeSource,
    writes:()=>({publicationWrites,draftWrites}),
    owner:()=>functions.getOwnerSession({},store,CLIENT,SESSION),
    save:body=>functions.saveOwnerDraft({},store,CLIENT,SESSION,body),
    publish:(intent,clientId=CLIENT,sessionId=SESSION)=>functions.publishClientSession({},store,clientId,sessionId,intent),
    published:()=>functions.getPublishedClientSession({},store,CLIENT,SESSION),
    publishedReport:()=>functions.getPublishedSessionReport({},store,CLIENT,SESSION)}
}

test('owner review token identifies the current source and never enters guest projection',async()=>{
  const f=fixture(),owner=await f.owner()
  assert.deepEqual(owner.publicationSource,{reportDocumentId:DOC,reportFingerprint:f.review().expectedReportFingerprint})
  const guest=guestSessionProjection({...clientPayload(owner.draft),publicationSource:owner.publicationSource,
    id:SESSION,occurredOn:'2026-10-16'})
  assert.equal(Object.hasOwn(guest,'publicationSource'),false)
  assert.equal(JSON.stringify(guest).includes(owner.publicationSource.reportFingerprint),false)
})

test('current explicit publication succeeds and excludes practitioner-only and hidden media',async()=>{
  const f=fixture(),intent=f.review()
  const result=await f.publish(intent)
  assert.deepEqual(result,{id:SESSION,revision:4})
  assert.deepEqual(f.writes(),{publicationWrites:1,draftWrites:0})
  assert.equal(f.row.published_revision,4)
  assert.equal(f.row.published_payload.reportFingerprint,intent.expectedReportFingerprint)
  assert.deepEqual(f.row.published_payload.media.map(item=>item.assetId),[AUDIO])
  assert.deepEqual(f.row.published_payload.plan.materialIds,[MATERIAL])
  for(const secret of ['Practitioner-only note','Secret','Hidden recording','Practitioner source note','publicationSource'])
    assert.equal(JSON.stringify(f.row.published_payload).includes(secret),false,secret)
  assert.ok(f.events.findIndex(event=>event.includes('for update'))<f.events.indexOf('source-read'))
})

test('a deliberately reviewed session without a source report remains publishable',async()=>{
  const f=fixture({withoutReport:true})
  // Assessment-origin and legacy sessions legitimately have no report document.
  f.row.source_consultation_id=OTHER
  assert.deepEqual((await f.owner()).publicationSource,{reportDocumentId:null,reportFingerprint:null})
  await f.publish(f.review())
  assert.equal(f.row.published_payload.reportDocumentId,null)
  assert.equal(f.row.published_payload.reportFingerprint,null)
})

test('no-report sessions still require explicit null source fields and a review revision',async()=>{
  for(const key of ['expectedRevision','expectedReportDocumentId','expectedReportFingerprint']) {
    const f=fixture({withoutReport:true}),intent=f.review()
    delete intent[key]
    await assert.rejects(f.publish(intent),{code:key==='expectedReportDocumentId'?
      'REPORT_SESSION_MISMATCH':'PUBLICATION_REVIEW_REQUIRED'})
    assert.equal(f.writes().publicationWrites,0)
  }
})

test('saving pending media and selected materials leaves the published snapshot untouched',async()=>{
  const f=fixture(),before=clone(f.row.published_payload)
  await f.save({expectedRevision:4,draft:{...f.row.draft_payload,summary:'Pending owner changes'}})
  assert.deepEqual(f.row.published_payload,before)
  assert.deepEqual(f.writes(),{publicationWrites:0,draftWrites:1})
  const client=await f.published()
  assert.equal(client.title,'Previously published')
  assert.deepEqual(client.media,[])
  assert.equal(client.plan.materials,undefined)
})

test('missing or malformed review versions fail before publication',async()=>{
  for(const patch of [null,{}, {expectedRevision:0},{expectedRevision:'4'},
    {expectedRevision:4.1},{expectedReportFingerprint:null},{expectedReportFingerprint:'unreviewed'}]) {
    const f=fixture(),intent=patch===null?undefined:{...f.review(),...patch}
    if(patch&&Object.keys(patch).length===0)delete intent.expectedRevision
    const before=clone(f.row.published_payload)
    await assert.rejects(f.publish(intent),{code:'PUBLICATION_REVIEW_REQUIRED'})
    assert.deepEqual(f.row.published_payload,before)
    assert.equal(f.writes().publicationWrites,0)
  }
})

test('stale revisions and changed source references reject without publishing',async()=>{
  for(const scenario of ['revision','source-reference','expected-reference']) {
    const f=fixture(),intent=f.review()
    if(scenario==='revision')f.row.draft_revision++
    if(scenario==='source-reference')f.row.draft_payload.reportDocumentId=OTHER
    if(scenario==='expected-reference')intent.expectedReportDocumentId=OTHER
    await assert.rejects(f.publish(intent),{code:scenario==='revision'?'SESSION_CHANGED':'REPORT_SESSION_MISMATCH'})
    assert.equal(f.writes().publicationWrites,0)
  }
})

test('same-ID source edits before or during publication fail the pinned fingerprint',async()=>{
  for(const during of [false,true]) {
    const f=fixture({afterMaterials:during?change=>change({updatedAt:'new-version',analysis:'Unreviewed edit'}):undefined})
    const intent=f.review(),before=clone(f.row.published_payload)
    if(!during)f.changeSource({updatedAt:'new-version',analysis:'Unreviewed edit'})
    await assert.rejects(f.publish(intent),{code:'REPORT_VERSION_CHANGED'})
    assert.deepEqual(f.row.published_payload,before)
    assert.equal(f.writes().publicationWrites,0)
  }
})

test('wrong client/session, archived session and unavailable source still fail closed',async()=>{
  for(const scenario of ['client','session','archive','revoked','foreign-source']) {
    const f=fixture(),intent=f.review()
    if(scenario==='archive')f.row.status='archived'
    if(scenario==='revoked')f.changeSource({status:'revoked'})
    if(scenario==='foreign-source')f.changeSource({clientId:OTHER})
    await assert.rejects(f.publish(intent,scenario==='client'?OTHER:CLIENT,scenario==='session'?OTHER:SESSION),
      {code:'SESSION_UNAVAILABLE'})
    assert.equal(f.writes().publicationWrites,0)
  }
})

test('an edit after publication never hides the reviewed text or shows the newer private draft',async()=>{
  const f=fixture({afterPublishSeal:change=>change({updatedAt:'later-version',analysis:'Later private draft'})})
  const intent=f.review()
  await f.publish(intent)
  assert.equal(f.row.published_payload.reportFingerprint,intent.expectedReportFingerprint)
  assert.equal(f.row.published_payload.reportSnapshot.analysis,'Reviewed report')
  assert.equal(f.row.published_payload.reportSnapshot.internalNotes,undefined)
  assert.equal((await f.published()).report.id,DOC)
  const approved=await f.publishedReport()
  assert.equal(approved.analysis,'Reviewed report')
  assert.equal(approved.internalNotes,undefined)
  assert.notEqual(approved.analysis,'Later private draft')
})

test('approved before/after scores survive publication while later edits stay private',async()=>{
  const f=fixture()
  f.changeSource({progressBefore:0,progressAfter:8.5})
  await f.publish(f.review())
  assert.equal(f.row.published_payload.reportSnapshot.progressBefore,0)
  assert.equal(f.row.published_payload.reportSnapshot.progressAfter,8.5)
  const first=await f.publishedReport()
  assert.equal(first.progressBefore,0)
  assert.equal(first.progressAfter,8.5)

  f.changeSource({progressBefore:9,progressAfter:2,analysis:'Not yet reviewed'})
  const stillPublished=await f.publishedReport()
  assert.equal(stillPublished.progressBefore,0)
  assert.equal(stillPublished.progressAfter,8.5)
  assert.equal(stillPublished.analysis,'Reviewed report')

  await f.publish(f.review())
  const updated=await f.publishedReport()
  assert.equal(updated.progressBefore,9)
  assert.equal(updated.progressAfter,2)
})

test('a later edit replaces the published text only after an explicit reviewed republish',async()=>{
  const f=fixture()
  await f.publish(f.review())
  f.changeSource({updatedAt:'later-version',analysis:'Pending owner changes'})
  assert.equal((await f.publishedReport()).analysis,'Reviewed report')
  assert.equal((await f.published()).report.id,DOC)
  await f.publish(f.review())
  assert.equal((await f.publishedReport()).analysis,'Pending owner changes')
})

test('revoking the source removes its sealed snapshot from client and guest views',async()=>{
  const f=fixture()
  await f.publish(f.review())
  f.changeSource({status:'revoked'})
  assert.equal((await f.published()).report,null)
  await assert.rejects(f.publishedReport(),{code:'SESSION_UNAVAILABLE'})
})

test('tampered or cross-client report snapshots fail closed',async()=>{
  for(const patch of [
    {clientId:OTHER},{id:OTHER},{analysis:'Unreviewed edit'},
  ]) {
    const f=fixture()
    await f.publish(f.review())
    Object.assign(f.row.published_payload.reportSnapshot,patch)
    assert.equal((await f.published()).report,null)
    await assert.rejects(f.publishedReport(),{code:'SESSION_UNAVAILABLE'})
  }
})

function studioFixture({changeReference=false}={}) {
  const originalSource={reportDocumentId:DOC,reportFingerprint:'a'.repeat(64)}
  const session={id:SESSION,draftRevision:4,publicationSource:originalSource,
    draft:{title:'Draft',summary:'Before',reportDocumentId:DOC,media:[]}}
  const draft={...session.draft,summary:'Owner edit',reportDocumentId:changeReference?OTHER:DOC}
  const calls=[],errors=[],loaded=[]
  const api=async(path,method='GET',body)=>{
    calls.push({method,body})
    if(method==='PATCH')return {id:SESSION,draftRevision:5}
    if(method==='GET')return {session:{...session,draftRevision:6,draft,
      publicationSource:{reportDocumentId:DOC,reportFingerprint:'b'.repeat(64)}}}
    if(method==='POST')throw new Error('SESSION_CHANGED')
  }
  const start=studio.indexOf('  const changed='),end=studio.indexOf('  async function play(')
  assert.ok(start>0&&end>start)
  const actions=new Function('dependencies',
    'const {api,session,draft,base,ru,locale,setSession,setDraft,setMessage,setBusy,setError,setLink}=dependencies;'+
    studio.slice(start,end)+';return {act,save,load};')({api,session,draft,base:'/synthetic-session',ru:false,locale:'en',
    setSession:value=>loaded.push(value),setDraft:()=>{},setMessage:()=>{},setBusy:()=>{},
    setError:value=>errors.push(value),setLink:()=>{}})
  return {actions,calls,errors,loaded,originalSource}
}

test('Publish auto-save pins the PATCH revision and pre-save source, not a later GET',async()=>{
  const f=studioFixture()
  await f.actions.act('publish')
  const posted=f.calls.find(call=>call.method==='POST').body
  assert.equal(posted.expectedRevision,5)
  assert.equal(posted.expectedReportDocumentId,DOC)
  assert.equal(posted.expectedReportFingerprint,'a'.repeat(64))
  assert.deepEqual(f.loaded[0].publicationSource,f.originalSource)
  assert.equal(f.calls.filter(call=>call.method==='POST').length,1)
  assert.match(f.errors.at(-1),/reload and review/)
})

test('selecting a different source requires a save/review before a Publish request',async()=>{
  const f=studioFixture({changeReference:true})
  await f.actions.act('publish')
  assert.deepEqual(f.calls,[])
  assert.match(f.errors.at(-1),/reload and review/)
})

test('the owner-authorized API forwards the explicit review payload unchanged',async()=>{
  const source=read('app/api/admin/clients/[id]/sessions/[sessionId]/route.js')
  const intent={action:'publish',expectedRevision:4,expectedReportDocumentId:DOC,expectedReportFingerprint:'a'.repeat(64)}
  const calls=[]
  const POST=load(source,{ownerDelivery:async(request,fn,options)=>{
    assert.deepEqual(options,{body:true});return fn({config:{},store:{},data:intent})
  },privateJson:value=>value,publishClientSession:async(...args)=>{calls.push(args);return {id:SESSION}}},'POST')
  await POST({}, {params:{id:CLIENT,sessionId:SESSION}})
  assert.equal(calls.length,1)
  assert.equal(calls[0][2],CLIENT)
  assert.equal(calls[0][3],SESSION)
  assert.equal(calls[0][4],intent)
  assert.match(source,/return ownerDelivery\(request/)
})
