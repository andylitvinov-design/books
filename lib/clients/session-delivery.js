import 'server-only'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { transaction } from '@/lib/app/database'
import { openSealed, seal } from '@/lib/app/crypto'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { publicAssessmentView } from '@/lib/clients/assessment-share'
import { isUuid, selectorPattern, secretPattern, validateSessionContent, validateUpload } from './session-delivery-validation'

export const SESSION_BUCKET='hh-client-private-media'
const ttlSeconds=24*60*60
const digest=s=>createHash('sha256').update(s).digest('hex')
const bad=()=>{throw new Error('SESSION_UNAVAILABLE')}
const scope=(clientId,id)=>({accountId:clientId,recordId:id,field:'session_content'})
const encrypted=(data,clientId,id,config)=>seal(data,scope(clientId,id),config)
const displayDate=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10)
const decrypted=(data,row,config)=>openSealed(data,scope(row.client_id,row.id),config)
export const sessionPagesEnabled=()=>process.env.HH_CLIENT_SESSIONS_ENABLED==='true'&&appEnabled()
function configRequired(){
  if(!sessionPagesEnabled())throw new Error('SESSION_FEATURE_DISABLED')
  return getAppConfig()
}
const selector=()=>randomBytes(16).toString('base64url')
const hashEqual=(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false
  return timingSafeEqual(Buffer.from(a),Buffer.from(b))
}
function deriveGrant(config,grant){
  return createHmac('sha256',config.encryptionKey).update(JSON.stringify([
    'hh-client-session-invitation:v1',grant.id,grant.selector,grant.access_version
  ])).digest('base64url')
}
export function sessionViewerCookieName(s,env=process.env){
  if(!selectorPattern.test(s||''))bad()
  return (env.NODE_ENV==='production'?'__Host-hh_sv_':'hh_sv_dev_')+s
}
function dateOnly(input){
  if(typeof input!=='string'||!/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(input)||input.length!==10)bad()
  const d=new Date(input+'T12:00:00.000Z')
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==input)bad()
  return input
}
async function ownerClient(clientId){
  if(!isUuid(clientId))bad()
  const store=getPrescriptionStore()
  const client=await store?.findClientById(clientId)
  if(!client||client.status!=='active')bad()
  return {client,store}
}
async function fullSessionRow(config,id,clientId){
  if(!isUuid(id)||!isUuid(clientId))bad()
  return transaction(config,null,async db=>{
    const row=(await db.query(
      'select * from app_private.client_session_pages where id=$1 and client_id=$2',[id,clientId]
    )).rows[0]
    if(!row)bad()
    return row
  },{server:true})
}
const summary=(row,config,admin=false)=>{
  const content=decrypted(admin?row.draft_ciphertext:row.published_ciphertext,row,config)
  return {id:row.id,clientId:row.client_id,consultationId:row.consultation_id,
    date:displayDate(row.occurred_on),locale:row.locale,status:row.status,
    revision:row.revision,publishedRevision:row.published_revision,
    publishedAt:row.published_at,title:content?.title||'',summary:content?.summary||'',
    ...(admin?{items:content?.items||[]}:{}),
  }
}
export async function listOwnerSessions(clientId){
  const config=configRequired()
  await ownerClient(clientId)
  const rows=await transaction(config,null,async db=>(await db.query(
    'select * from app_private.client_session_pages where client_id=$1 order by occurred_on desc,created_at desc limit 100',[clientId]
  )).rows,{server:true})
  return rows.map(r=>summary(r,config,true))
}
export async function listClientSessions(clientId){
  const config=configRequired()
  if(!isUuid(clientId))bad()
  const rows=await transaction(config,null,async db=>(await db.query(
    "select * from app_private.client_session_pages where client_id=$1 and status='published' order by occurred_on desc,created_at desc limit 100",[clientId]
  )).rows,{server:true})
  return rows.map(r=>summary(r,config))
}
export async function createClientSession(clientId,{date,locale='en',consultationId=null,title}){
  const config=configRequired(),{store}=await ownerClient(clientId)
  dateOnly(date)
  if(!['en','ru'].includes(locale))bad()
  if(consultationId!==null){
    if(!isUuid(consultationId))bad()
    const records=await store.listClientDocuments(clientId)
    if(!records.some(r=>r.status==='active'&&r.clientId===clientId&&(r.consultationId??r.id)===consultationId))bad()
  }
  const id=randomUUID(),draft=validateSessionContent({title:title||'Personal session',summary:'',items:[]})
  await transaction(config,null,db=>db.query(
    'insert into app_private.client_session_pages(id,client_id,consultation_id,occurred_on,locale,draft_ciphertext) values($1,$2,$3,$4,$5,$6)',
    [id,clientId,consultationId,date,locale,encrypted(draft,clientId,id,config)]
  ),{server:true})
  return getOwnerSession(clientId,id)
}
export async function getOwnerSession(clientId,id){
  const config=configRequired()
  await ownerClient(clientId)
  return summary(await fullSessionRow(config,id,clientId),config,true)
}
export async function saveClientSession(clientId,id,revision,content){
  const config=configRequired()
  await ownerClient(clientId)
  const clean=validateSessionContent(content)
  const rev=Number(revision)
  if(!Number.isSafeInteger(rev)||rev<1)bad()
  const row=await transaction(config,null,async db=>{
    const current=(await db.query(
      'select * from app_private.client_session_pages where id=$1 and client_id=$2 for update',[id,clientId]
    )).rows[0]
    if(!current||current.status==='archived'||current.revision!==rev)bad()
    return (await db.query(
      'update app_private.client_session_pages set draft_ciphertext=$3,revision=revision+1,updated_at=now() where id=$1 and client_id=$2 returning *',
      [id,clientId,encrypted(clean,clientId,id,config)]
    )).rows[0]
  },{server:true})
  return summary(row,config,true)
}
async function verifyReferencedItems(db,store,clientId,sessionId,items){
  for(const item of items){
    if(item.kind==='report'){
      const rec=await store.findClientAssessment(item.refId)
      if(!rec||rec.clientId!==clientId||rec.status!=='shared')bad()
    }else if(item.kind==='document'){
      const rec=await store.findById(item.refId)
      if(!rec||rec.clientId!==clientId||rec.status!=='active'||rec.kind==='report')bad()
    }else if(['video','audio','pdf'].includes(item.kind)){
      const file=(await db.query(
        "select mime from app_private.client_session_assets where id=$1 and client_id=$2 and session_id=$3 and status='ready'",
        [item.assetId,clientId,sessionId]
      )).rows[0]
      if(!file || (item.kind==='video'&&!file.mime.startsWith('video/')) ||
        (item.kind==='audio'&&!file.mime.startsWith('audio/')) ||
        (item.kind==='pdf'&&file.mime!=='application/pdf'))bad()
    }
  }
}
export async function publishClientSession(clientId,id,revision){
  const config=configRequired(),{store}=await ownerClient(clientId)
  if(!isUuid(id)||!Number.isSafeInteger(revision)||revision<1)bad()
  const row=await transaction(config,null,async db=>{
    const current=(await db.query(
      'select * from app_private.client_session_pages where id=$1 and client_id=$2 for update',[id,clientId]
    )).rows[0]
    if(!current||current.status==='archived'||current.revision!==revision)bad()
    const content=decrypted(current.draft_ciphertext,current,config)
    await verifyReferencedItems(db,store,clientId,id,content.items)
    return (await db.query(
      "update app_private.client_session_pages set published_ciphertext=draft_ciphertext,published_revision=revision,status='published',published_at=now(),updated_at=now() where id=$1 and client_id=$2 returning *",
      [id,clientId]
    )).rows[0]
  },{server:true})
  return summary(row,config,true)
}
export async function archiveClientSession(clientId,id){
  const config=configRequired()
  await ownerClient(clientId)
  return transaction(config,null,async db=>{
    const session=(await db.query(
      "update app_private.client_session_pages set status='archived',updated_at=now() where id=$1 and client_id=$2 returning id",[id,clientId]
    )).rows[0]
    if(!session)bad()
    const grants=(await db.query(
      'update app_private.client_session_grants set revoked_at=now(),updated_at=now() where session_id=$1 and client_id=$2 returning id',[id,clientId]
    )).rows.map(r=>r.id)
    for(const gid of grants)await db.query('update app_private.client_session_viewers set revoked_at=now() where grant_id=$1',[gid])
    return {archived:true}
  },{server:true})
}
export async function copyClientSessionShare(clientId,id,rotate=false){
  const config=configRequired()
  await ownerClient(clientId)
  const grant=await transaction(config,null,async db=>{
    const session=(await db.query(
      "select id from app_private.client_session_pages where id=$1 and client_id=$2 and status='published' for share",
      [id,clientId]
    )).rows[0]
    if(!session)bad()
    let row=(await db.query(
      'select * from app_private.client_session_grants where session_id=$1 and client_id=$2 for update',[id,clientId]
    )).rows[0]
    if(row&& !rotate && !row.revoked_at && Date.parse(row.expires_at)>Date.now())return row
    if(!row){
      const gid=randomUUID(),s=selector()
      const newRow={id:gid,selector:s,access_version:1}
      const secret=deriveGrant(config,newRow)
      row=(await db.query(
        "insert into app_private.client_session_grants(id,session_id,client_id,selector,secret_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '30 days') returning *",
        [gid,id,clientId,s,digest(secret)]
      )).rows[0]
    }else{
      const newRow={...row,selector:selector(),access_version:row.access_version+1}
      const secret=deriveGrant(config,newRow)
      row=(await db.query(
        "update app_private.client_session_grants set selector=$2,secret_hash=$3,access_version=access_version+1,expires_at=now()+interval '30 days',revoked_at=null,updated_at=now() where id=$1 returning *",
        [row.id,newRow.selector,digest(secret)]
      )).rows[0]
      await db.query('update app_private.client_session_viewers set revoked_at=now() where grant_id=$1',[row.id])
    }
    return row
  },{server:true})
  const secret=deriveGrant(config,grant)
  if(!hashEqual(digest(secret),grant.secret_hash))bad()
  return {selector:grant.selector,secret,expiresAt:grant.expires_at}
}
export async function revokeClientSessionShare(clientId,id){
  const config=configRequired()
  await ownerClient(clientId)
  return transaction(config,null,async db=>{
    const row=(await db.query(
      'update app_private.client_session_grants set revoked_at=now(),updated_at=now() where client_id=$1 and session_id=$2 returning id',
      [clientId,id]
    )).rows[0]
    if(row)await db.query('update app_private.client_session_viewers set revoked_at=now() where grant_id=$1',[row.id])
    return {revoked:true}
  },{server:true})
}
export async function exchangeClientSessionShare(selectorValue,secret,ip='unknown'){
  const config=configRequired()
  if(!selectorPattern.test(selectorValue||'')||!secretPattern.test(secret||''))bad()
  const store=getPrescriptionStore()
  // Fail closed if durable shared limiter is unavailable.
  if(!await store?.consumeAccessAttempt(digest('sessions:ip:'+ip),30,300)||
     !await store.consumeAccessAttempt(digest('sessions:selector:'+selectorValue),12,300))bad()
  const grant=await transaction(config,null,async db=>(await db.query(
    "select g.*,p.status from app_private.client_session_grants g join app_private.client_session_pages p on p.id=g.session_id and p.client_id=g.client_id where g.selector=$1 and g.revoked_at is null and g.expires_at>now() and p.status='published'",
    [selectorValue]
  )).rows[0],{server:true})
  if(!grant||!hashEqual(grant.secret_hash,digest(secret))||!hashEqual(digest(deriveGrant(config,grant)),grant.secret_hash))bad()
  const client=await store.findClientById(grant.client_id)
  if(!client||client.status!=='active')bad()
  const id=randomUUID(),token=randomBytes(32).toString('base64url')
  const maxAge=Math.max(1,Math.min(ttlSeconds,Math.floor((Date.parse(grant.expires_at)-Date.now())/1000)))
  await transaction(config,null,db=>db.query(
    'insert into app_private.client_session_viewers(id,grant_id,secret_hash,access_version,expires_at) values($1,$2,$3,$4,now()+$5*interval \'1 second\')',
    [id,grant.id,digest(token),grant.access_version,maxAge]
  ),{server:true})
  return {selector:selectorValue,cookie:id+'.'+token,maxAge}
}
export async function getGuestClientSession(selectorValue){
  const config=configRequired()
  if(!selectorPattern.test(selectorValue||''))return undefined
  const raw=(await cookies()).get(sessionViewerCookieName(selectorValue))?.value||''
  const [id,token,extra]=raw.split('.')
  if(extra||!isUuid(id)||!secretPattern.test(token||''))return undefined
  const grant=await transaction(config,null,async db=>(await db.query(
    "select g.client_id,g.session_id,g.selector from app_private.client_session_viewers v join app_private.client_session_grants g on g.id=v.grant_id join app_private.client_session_pages p on p.id=g.session_id and p.client_id=g.client_id where v.id=$1 and v.secret_hash=$2 and v.revoked_at is null and v.expires_at>now() and g.selector=$3 and g.revoked_at is null and g.expires_at>now() and g.access_version=v.access_version and p.status='published'",
    [id,digest(token),selectorValue]
  )).rows[0],{server:true})
  if(!grant)return undefined
  const client=await getPrescriptionStore()?.findClientById(grant.client_id)
  if(!client||client.status!=='active')return undefined
  return {clientId:grant.client_id,sessionId:grant.session_id,selector:selectorValue,source:'guest'}
}
export async function getPublishedSession(clientId,id,locale='en'){
  const config=configRequired()
  const row=await fullSessionRow(config,id,clientId)
  if(row.status!=='published'||!row.published_ciphertext)bad()
  const draft=decrypted(row.published_ciphertext,row,config)
  const store=getPrescriptionStore()
  const items=[]
  for(const item of draft.items){
    const result={...item}
    if(item.kind==='report'){
      const rec=await store?.findClientAssessment(item.refId)
      if(!rec||rec.clientId!==clientId||rec.status!=='shared')continue
      result.report=publicAssessmentView(rec)
    }else if(item.kind==='document'){
      const rec=await store?.findById(item.refId)
      if(!rec||rec.clientId!==clientId||rec.status!=='active'||rec.kind==='report')continue
      result.documentType=rec.kind
    }else if(['video','audio','pdf'].includes(item.kind)){
      const asset=await transaction(config,null,async db=>(await db.query(
        "select mime,bytes from app_private.client_session_assets where id=$1 and client_id=$2 and session_id=$3 and status='ready'",
        [item.assetId,clientId,id]
      )).rows[0],{server:true})
      if(!asset)continue
      result.mime=asset.mime
    }
    items.push(result)
  }
  return {id:row.id,clientId,date:displayDate(row.occurred_on),locale,
    title:draft.title,summary:draft.summary,publishedAt:row.published_at,items}
}
function storageAdmin(config){
  const key=process.env.HH_APP_SUPABASE_SECRET_KEY
  if(!key || !(key.startsWith('sb_secret_')||key.split('.').length===3))throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
  return createClient(config.supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
export async function prepareSessionUpload(clientId,sessionId,file){
  const config=configRequired()
  await ownerClient(clientId)
  const input=validateUpload(file)
  const row=await fullSessionRow(config,sessionId,clientId)
  if(row.status==='archived')bad()
  const id=randomUUID(),path=sessionId+'/'+id
  // Requires explicit server-only secret, never return it to browser.
  const storage=storageAdmin(config)
  await transaction(config,null,db=>db.query(
    'insert into app_private.client_session_assets(id,client_id,session_id,object_key,mime,bytes) values($1,$2,$3,$4,$5,$6)',
    [id,clientId,sessionId,path,input.mime,input.bytes]
  ),{server:true})
  const {data,error}=await storage.storage.from(SESSION_BUCKET).createSignedUploadUrl(path)
  if(error||!data?.token)throw new Error('UPLOAD_UNAVAILABLE')
  return {assetId:id,bucket:SESSION_BUCKET,path:data.path||path,token:data.token,
    supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey}
}
export async function finalizeSessionUpload(clientId,sessionId,assetId){
  const config=configRequired()
  await ownerClient(clientId)
  if(!isUuid(assetId))bad()
  const a=await transaction(config,null,async db=>(await db.query(
    "select * from app_private.client_session_assets where id=$1 and client_id=$2 and session_id=$3 and status in('pending','ready')",
    [assetId,clientId,sessionId]
  )).rows[0],{server:true})
  if(!a)bad()
  if(a.status==='ready')return {assetId,ready:true}
  const {data,error}=await storageAdmin(config).storage.from(SESSION_BUCKET).info(a.object_key)
  if(error||!data||Number(data.size)!==Number(a.bytes))bad()
  // Signed upload intent cannot select another path; keep file MIME check server-side.
  if(data.contentType && data.contentType.toLowerCase()!==a.mime.toLowerCase())bad()
  // Check actual file bytes rather than trusting browser-provided MIME alone.
  const {data:signed,error:signError}=await storageAdmin(config).storage.from(SESSION_BUCKET).createSignedUrl(a.object_key,60)
  if(signError||!signed?.signedUrl)bad()
  const response=await fetch(signed.signedUrl,{headers:{Range:'bytes=0-63'},cache:'no-store'})
  if(!response.ok||!response.body)bad()
  const reader=response.body.getReader()
  const first=await reader.read()
  await reader.cancel().catch(()=>{})
  const bytes=first.value||new Uint8Array()
  const ascii=(from,len)=>String.fromCharCode(...bytes.slice(from,from+len))
  const isPdf=ascii(0,5)==='%PDF-'
  const isMp4=ascii(4,4)==='ftyp'
  const isWebm=bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3
  const isMp3=ascii(0,3)==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)
  const valid=a.mime==='application/pdf'?isPdf:
    a.mime==='video/mp4'?isMp4:a.mime==='video/webm'?isWebm:
    a.mime==='audio/webm'?isWebm:
    ['audio/mp4','audio/x-m4a'].includes(a.mime)?isMp4:
    a.mime==='audio/mpeg'?isMp3:false
  if(!valid)bad()
  await transaction(config,null,db=>db.query(
    "update app_private.client_session_assets set status='ready',updated_at=now() where id=$1 and client_id=$2 and session_id=$3 and status='pending'",
    [assetId,clientId,sessionId]
  ),{server:true})
  return {assetId,ready:true}
}
export async function signedClientSessionAsset(clientId,sessionId,itemId){
  const config=configRequired()
  if(!isUuid(itemId))bad()
  const row=await fullSessionRow(config,sessionId,clientId)
  if(row.status!=='published'||!row.published_ciphertext)bad()
  const current=decrypted(row.published_ciphertext,row,config)
  const item=current.items.find(i=>i.id===itemId&&['video','audio','pdf'].includes(i.kind))
  if(!item)bad()
  const a=await transaction(config,null,async db=>(await db.query(
    "select object_key,mime from app_private.client_session_assets where id=$1 and session_id=$2 and client_id=$3 and status='ready'",
    [item.assetId,sessionId,clientId]
  )).rows[0],{server:true})
  if(!a)bad()
  const {data,error}=await storageAdmin(config).storage.from(SESSION_BUCKET).createSignedUrl(a.object_key,300)
  if(error||!data?.signedUrl)bad()
  return {url:data.signedUrl,mime:a.mime,expiresIn:300}
}

export async function signedOwnerSessionAsset(clientId,sessionId,itemId){
  const config=configRequired()
  await ownerClient(clientId)
  if(!isUuid(itemId))bad()
  const row=await fullSessionRow(config,sessionId,clientId)
  if(row.status==='archived')bad()
  const content=decrypted(row.draft_ciphertext,row,config)
  const item=content.items.find(i=>i.id===itemId && ['video','audio','pdf'].includes(i.kind))
  if(!item)bad()
  const a=await transaction(config,null,async db=>(await db.query(
    "select object_key,mime from app_private.client_session_assets where id=$1 and session_id=$2 and client_id=$3 and status='ready'",
    [item.assetId,sessionId,clientId]
  )).rows[0],{server:true})
  if(!a)bad()
  const {data,error}=await storageAdmin(config).storage.from(SESSION_BUCKET).createSignedUrl(a.object_key,300)
  if(error||!data?.signedUrl)bad()
  return {url:data.signedUrl,mime:a.mime,expiresIn:300}
}
