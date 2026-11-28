import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {openSealed,operationHash,seal} from './crypto.js'
import {ownerMemoryFingerprint,projectOwnerMemoryArchiveRow} from './my-coach-memory-source.js'
import {OWNER_MEMORY_MAX_CIPHERTEXT_BYTES,searchOwnerReviewedEvidence} from '../coaching/coach-personal-memory.mjs'
import {MEMORY_SELECTION_VERSION,MEMORY_SELECTION_PAGE,MEMORY_SELECTION_LIMIT,
 normalizeMemorySelection,validMemorySelectionRevision,ownerMemorySelectionAllowed,matchingMemoryEvidence,memorySelectionView} from '../coaching/coach-memory-selection.mjs'
import {PRACTICE_HISTORY_LIMIT,practiceHistoryView} from '../coaching/coach-practice-memory.mjs'
import {chooseRememberedPractice} from '../coaching/coach-session-director.mjs'
import {lessonFor} from '../inner-growth/lesson-library.js'
import {normalizeMyCoachProtocolCursor} from '../personal-coaching/protocol-archive.mjs'
const refs='app_private.client_ai_memory_protocol_refs'
const versions='app_private.client_ai_memory_protocol_ref_versions'
const ops='app_private.client_ai_memory_protocol_ref_ops'
const settingsTable='app_private.client_ai_memory_settings'
const unavailable=()=>new AppError('MY_COACH_MEMORY_SOURCE_UNAVAILABLE',409)
export const coachMemorySelectionEnabled=(env=process.env)=>
 env.HH_COACH_MEMORY_SELECTION_ENABLED==='true'&&env.HH_CLIENT_MEMORY_ENABLED==='true'
async function active(db,actor){
 if(!actor?.id||!(await db.query("select 1 from app.accounts where id=$1 and status='active' and onboarding_state='active'",[actor.id])).rows.length)
  throw new AppError('ACCOUNT_REQUIRED',401)
}
async function readSettings(db,actor,lock=false){
 return (await db.query('select memory_enabled,sensitive_enabled,revision from '+settingsTable+
  ' where account_id=$1'+(lock?' for update':''),[actor.id])).rows[0]||null
}
const operation=(config,actor,input)=>operationHash({purpose:MEMORY_SELECTION_VERSION,accountId:actor.id,input},config)
async function refById(db,actor,id){
 return (await db.query('select * from '+refs+' where account_id=$1 and id=$2',[actor.id,id])).rows[0]||null
}
const correctionContext=(accountId,recordId)=>({accountId,recordId,field:'my_coach.memory_correction'})
const receipt=row=>({id:row?.id??null,revision:row?.revision??null,status:row?.status??'unavailable'})
async function priorOperation(db,actor,input,requestHash){
 const row=(await db.query('select action,request_hash,ref_id from '+ops+
  ' where account_id=$1 and operation_id=$2',[actor.id,input.operationId])).rows[0]
 if(!row)return null
 if(row.action!==input.action||row.request_hash!==requestHash)throw new AppError('IDEMPOTENCY_CONFLICT',409)
 return {...receipt(await refById(db,actor,row.ref_id)),duplicate:true}
}
async function recordOperation(db,actor,input,requestHash,refId){
 await db.query('insert into '+ops+'(account_id,operation_id,action,request_hash,ref_id) values($1,$2,$3,$4,$5)',
 [actor.id,input.operationId,input.action,requestHash,refId])
}
async function archiveRows(db,actor,ids){
 if(!ids.length)return []
 const {rows}=await db.query(
  'with chosen as (select account_id,protocol_id,schema_version,protocol_ciphertext,'+
  'sum(octet_length(protocol_ciphertext)) over(order by protocol_id rows unbounded preceding) as total_bytes '+
  'from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=any($2::uuid[])) '+
  'select account_id,protocol_id,schema_version,case when total_bytes<=$3 then protocol_ciphertext else null end as protocol_ciphertext from chosen',
  [actor.id,[...new Set(ids)],OWNER_MEMORY_MAX_CIPHERTEXT_BYTES])
 if(rows.some(row=>row.account_id!==actor.id))throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
 return rows
}
function evidence(config,actor,row,source){
 if(!row?.protocol_ciphertext)return null
 try{
  const result=projectOwnerMemoryArchiveRow(config,actor,row)
  return result.supported?matchingMemoryEvidence(result.items,source):null
 }catch{return null}
}
async function latestCorrections(db,config,actor,page){
 const revisionIds=page.filter(ref=>ref.revision>0).map(ref=>ref.id)
 if(!revisionIds.length)return new Map()
 const {rows}=await db.query('select v.ref_id,v.revision,v.value_ciphertext,v.created_at from '+versions+
  ' v join '+refs+' r on (v.account_id,v.ref_id,v.revision)=(r.account_id,r.id,r.revision)'+
  " where r.account_id=$1 and r.id=any($2::uuid[]) and r.status='active'",[actor.id,revisionIds])
 const corrections=new Map()
 for(const row of rows){
  try{
   const value=openSealed(row.value_ciphertext,correctionContext(actor.id,row.ref_id),config)
   if(value?.revision===row.revision&&typeof value.value==='string'&&value.value)
    corrections.set(row.ref_id,{revision:row.revision,value:value.value,confirmedAt:row.created_at})
  }catch{/* Missing or unreadable corrections stay unavailable. */}
 }
 return corrections
}
async function list(db,config,actor,input,checkpoint=null){
 const isSearch=input.action==='search'
 const isExport=input.action==='export'
 const bulk=isSearch||isExport||Boolean(checkpoint)
 const pageSize=bulk?MEMORY_SELECTION_LIMIT:MEMORY_SELECTION_PAGE
 const after=bulk?null:input.after
 const settings=await readSettings(db,actor,isExport||Boolean(checkpoint))
 const enabled=ownerMemorySelectionAllowed(settings)
 const empty={version:MEMORY_SELECTION_VERSION,consentRequired:!enabled,
  settingsRevision:settings?.revision??0,items:[],nextCursor:null,partial:false,
  ...(isSearch?{searchStatus:enabled?'no_match':'not_authorized'}:{})}
 if(!enabled)return empty
 const {rows}=await db.query('select * from '+refs+
  " where account_id=$1 and status='active' and ($2::uuid is null or id>$2::uuid)"+
  (checkpoint?' and field_id=$4 and protocol_id<>$5::uuid':'')+' order by id limit $3',
  [actor.id,after,pageSize+1,...(checkpoint?[checkpoint.fieldId,checkpoint.protocolId]:[])])
 if(rows.some(row=>row.account_id!==actor.id))throw new AppError('MY_COACH_MEMORY_UNAVAILABLE',503)
 const page=rows.slice(0,pageSize)
 const archives=await archiveRows(db,actor,page.map(r=>r.protocol_id))
 const corrections=await latestCorrections(db,config,actor,page)
 const items=[]
 let partial=rows.length>pageSize&&bulk
 // Decode each distinct archive record once, within the existing byte cap.
 const projected=new Map()
 for(const row of archives){
  try{const result=projectOwnerMemoryArchiveRow(config,actor,row)
   if(result.supported)projected.set(row.protocol_id,result.items)
  }catch{/* unavailable source */}
 }
 for(const ref of page){
  const source={kind:'reviewed_coaching_protocol',protocolId:ref.protocol_id,fieldId:ref.field_id,
   fieldRevision:ref.field_revision,turnIndex:ref.turn_index}
  const item=matchingMemoryEvidence(projected.get(ref.protocol_id),source)
  const view=item&&ownerMemoryFingerprint(config,actor.id,item)===ref.source_hash
   ?memorySelectionView(ref,item,corrections.get(ref.id)):null
  if(!view){
   partial=true
   items.push({id:ref.id,revision:ref.revision,status:'source_unavailable',scope:'owner_only',providerShareable:false})
   continue
  }
  items.push(view)
 }
 // Reauthorize current settings and active references; no cached text.
 const latest=await readSettings(db,actor)
 if(!ownerMemorySelectionAllowed(latest)||latest.revision!==settings.revision)
  return {...empty,consentRequired:!ownerMemorySelectionAllowed(latest),settingsRevision:latest?.revision??0,partial:true,
   ...(isSearch?{searchStatus:ownerMemorySelectionAllowed(latest)?'partial':'not_authorized'}:{})}
 if(!page.length)return empty
 const current=(await db.query('select id,revision from '+refs+
   " where account_id=$1 and status='active' and id=any($2::uuid[])",[actor.id,page.map(r=>r.id)])).rows
 const allowed=new Map(current.map(r=>[r.id,r.revision]))
 const valid=items.filter(item=>allowed.get(item.id)===item.revision)
 const incomplete=partial||valid.length!==items.length
 if(isSearch){
  const found=searchOwnerReviewedEvidence(valid.filter(item=>item.status==='active'&&item.providerShareable===false)
    .map(item=>({...item,accountId:actor.id})),actor.id,input.query)
  return {...empty,items:found,partial:incomplete,
   searchStatus:incomplete?'partial':found.length?'ok':'no_match'}
 }
 return {...empty,items:valid,
  nextCursor:rows.length>pageSize?page.at(-1).id:null,partial:incomplete}
}
// Called inside the locked draft transaction, with the target resolved by the course gate.
export async function readOwnerCheckpointMemory(db,config,actor,checkpoint){
 const result=await list(db,config,actor,{action:'checkpoint'},checkpoint)
 if(result.consentRequired)return {status:'not_authorized',item:null}
 if(result.partial)return {status:'partial',item:null}
 const matching=result.items.filter(item=>item.source?.courseSessionId===checkpoint.courseSessionId&&
  item.source.fieldId===checkpoint.fieldId&&item.source.protocolId!==checkpoint.protocolId&&
  Date.parse(item.sessionEndedAt)<Date.parse(checkpoint.startedAt))
 matching.sort((a,b)=>b.sessionEndedAt.localeCompare(a.sessionEndedAt))
 const item=matching[0]
 if(!item)return {status:'no_match',item:null}
 return {status:'ok',item:{value:item.value,sessionEndedAt:item.sessionEndedAt,valueSource:item.valueSource}}
}
async function exportSelection(db,config,actor,input){
 const {consentRequired,partial,items}=await list(db,config,actor,input)
 const result={version:MEMORY_SELECTION_VERSION,scope:'selected_memory',items:[]}
 if(consentRequired)return {...result,exportStatus:'not_authorized'}
 if(partial)return {...result,exportStatus:'partial'}
 if(!items.length)return {...result,exportStatus:'empty'}
 return {...result,exportStatus:'ok',items:items.map(item=>({
  kind:item.kind,value:item.value,valueSource:item.valueSource,
  evidenceStatus:item.evidenceStatus,temporalStatus:item.temporalStatus,
  confirmedAt:item.confirmedAt,sessionEndedAt:item.sessionEndedAt,
  ...(item.observedAt?{observedAt:item.observedAt}:{}),
  source:{kind:item.source.kind,courseSessionId:item.source.courseSessionId,fieldId:item.source.fieldId},
 }))}
}
async function correct(db,config,actor,input,requestHash){
 const row=await refById(db,actor,input.id)
 if(!row||row.status!=='active')throw unavailable()
 if(row.revision!==input.expectedRevision)throw new AppError('STALE_REVISION',409)
 const [archive]=await archiveRows(db,actor,[row.protocol_id])
 const item=evidence(config,actor,archive,{kind:'reviewed_coaching_protocol',protocolId:row.protocol_id,
  fieldId:row.field_id,fieldRevision:row.field_revision,turnIndex:row.turn_index})
 if(!item||ownerMemoryFingerprint(config,actor.id,item)!==row.source_hash)throw unavailable()
 const revision=row.revision+1
 const valueCiphertext=seal({revision,value:input.value},correctionContext(actor.id,row.id),config)
 await db.query('insert into '+versions+
  '(account_id,ref_id,revision,value_ciphertext) values($1,$2,$3,$4)',
  [actor.id,row.id,revision,valueCiphertext])
 const {rows}=await db.query('update '+refs+
  " set revision=revision+1 where account_id=$1 and id=$2 and revision=$3 and status='active' returning *",
  [actor.id,row.id,row.revision])
 if(rows.length!==1)throw new AppError('STALE_REVISION',409)
 await recordOperation(db,actor,input,requestHash,row.id)
 return {...receipt(rows[0]),duplicate:false}
}
async function selectionCount(db,actor){
 const total=Number((await db.query('select count(*)::integer as n from '+refs+
  " where account_id=$1 and status='active'",[actor.id])).rows[0]?.n)
 if(!Number.isSafeInteger(total)||total<0)throw unavailable()
 return total
}
async function insertSelectionReference(db,actor,source,fingerprint){
 const {rows}=await db.query('insert into '+refs+
  '(account_id,id,protocol_id,field_id,field_revision,turn_index,source_hash) values($1,$2,$3,$4,$5,$6,$7) returning *',
  [actor.id,randomUUID(),source.protocolId,source.fieldId,source.fieldRevision,source.turnIndex,fingerprint])
 if(rows.length!==1)throw unavailable()
 return rows[0]
}
// The archive writer calls this only for a new, explicitly opted-in protocol in
// the same transaction. The canonical settings lock also serializes manual
// selection, corrections and revocation.
export async function writeReviewedProtocolMemory(db,config,actor,protocolId,expectedSettingsRevision){
 const settings=await readSettings(db,actor,true)
 if(!ownerMemorySelectionAllowed(settings))return {status:'not_authorized',selected:0}
 if(settings.revision!==expectedSettingsRevision)return {status:'stale_consent',selected:0}
 const [archive]=await archiveRows(db,actor,[protocolId])
 return appendReviewedArchiveMemory(db,config,actor,archive)
}
async function appendReviewedArchiveMemory(db,config,actor,archive,remaining){
 if(!archive?.protocol_ciphertext)return {status:'unavailable',selected:0}
 let projection
 try{projection=projectOwnerMemoryArchiveRow(config,actor,archive)}catch{return {status:'unavailable',selected:0}}
 if(!projection.supported)return {status:'unavailable',selected:0}
 if(!projection.items.length)return {status:'no_change',selected:0}
 const {rows}=await db.query('select field_id from '+refs+' where account_id=$1 and protocol_id=$2',[actor.id,archive.protocol_id])
 const existing=new Set(rows.map(row=>row.field_id))
 const additions=projection.items.filter(item=>!existing.has(item.source.fieldId))
 if(!additions.length)return {status:'no_change',selected:0}
 const capacity=remaining??Math.max(0,MEMORY_SELECTION_LIMIT-await selectionCount(db,actor))
 const chosen=additions.slice(0,capacity)
 for(const item of chosen)await insertSelectionReference(db,actor,item.source,ownerMemoryFingerprint(config,actor.id,item))
 return {status:chosen.length<additions.length?'partial':'saved',selected:chosen.length}
}

// A run is bound to the owner, a saved-at cutoff and the consent revision
// captured before any archive inspection. Every page reauthorizes under lock.
const BACKFILL_PAGE=6
const backfillContext=actor=>({accountId:actor.id,recordId:actor.id,field:'my_coach.memory_backfill'})
const backfillResult=(status,selected=0,scanned=0,nextCursor=null)=>({status,selected,scanned,nextCursor})
async function startBackfill(db,config,actor,input,settings){
 if(!ownerMemorySelectionAllowed(settings))return backfillResult('not_authorized')
 if(settings.revision!==input.expectedSettingsRevision)return backfillResult('stale_consent')
 const {rows:[row]}=await db.query("select to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cutoff")
 const cursor=seal({version:1,settingsRevision:settings.revision,cutoff:row.cutoff,
  before:null,beforeId:null,sawRecords:false,incomplete:false},backfillContext(actor),config)
 return backfillResult('ready',0,0,cursor)
}
async function backfillPage(db,config,actor,input,settings){
 if(!ownerMemorySelectionAllowed(settings))return backfillResult('not_authorized')
 let state
 try{
  state=openSealed(input.cursor,backfillContext(actor),config)
  if(state?.version!==1||!validMemorySelectionRevision(state.settingsRevision))throw unavailable()
  normalizeMyCoachProtocolCursor({before:state.before,beforeId:state.beforeId})
 }catch{throw new AppError('MY_COACH_MEMORY_SELECTION_INVALID',400)}
 if(settings.revision!==state.settingsRevision)return backfillResult('stale_consent')
 const {rows}=await db.query(
  "select protocol_id,octet_length(protocol_ciphertext) as bytes,to_char(saved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as saved_at_cursor "+
  'from app_private.my_coach_protocol_records where account_id=$1 and saved_at<=$2::timestamptz '+
  'and ($3::timestamptz is null or (saved_at,protocol_id)<($3::timestamptz,$4::uuid)) '+
  'order by saved_at desc,protocol_id desc limit $5',[actor.id,state.cutoff,state.before,state.beforeId,BACKFILL_PAGE+1])
 const page=[],ids=[]
 let bytes=0
 for(const row of rows.slice(0,BACKFILL_PAGE)){
  if(row.bytes<=OWNER_MEMORY_MAX_CIPHERTEXT_BYTES){
   if(bytes+row.bytes>OWNER_MEMORY_MAX_CIPHERTEXT_BYTES)break
   ids.push(row.protocol_id)
   bytes+=row.bytes
  }
  page.push(row)
 }
 const archives=new Map((await archiveRows(db,actor,ids)).map(row=>[row.protocol_id,row]))
 let capacity=Math.max(0,MEMORY_SELECTION_LIMIT-await selectionCount(db,actor))
 let selected=0,scanned=0,limitReached=false
 for(const row of page){
  const result=await appendReviewedArchiveMemory(db,config,actor,archives.get(row.protocol_id),capacity)
  selected+=result.selected
  capacity-=result.selected
  // Keep the previous boundary so a retry after freeing space includes this record.
  if(result.status==='partial'){limitReached=true;break}
  if(result.status==='unavailable')state.incomplete=true
  state.before=row.saved_at_cursor;state.beforeId=row.protocol_id;state.sawRecords=true
  scanned++
 }
 if(limitReached||scanned<rows.length){
  const next=seal(state,backfillContext(actor),config)
  return backfillResult(limitReached?'limit':'partial',selected,scanned,next)
 }
 return backfillResult(state.incomplete?'partial':state.sawRecords?'complete':'none',selected,scanned)
}
function practiceTitle(item){
 const {day,focus}=item.context
 const lesson=lessonFor(focus,day,'en','standard',item.practiceVersion)
 if(lesson?.id!==item.practiceId)return null
 return {en:lesson.title,ru:lessonFor(focus,day,'ru','standard',item.practiceVersion).title}
}
async function readPracticeOutcomes(db,actor,settings,input){
 const selecting=input.action==='practice-selection'
 if(!ownerMemorySelectionAllowed(settings))
  return selecting?{status:'not_authorized',item:null}:{status:'not_authorized',counts:null,items:[]}
 if(selecting&&settings.revision!==input.expectedSettingsRevision)return {status:'stale_consent',item:null}
 const historyColumns=selecting?'':`, before_now,after_now,
  coalesce(signals->>'dailyMethodChoice',signals->>'moduleActivityChoice') as variant`
 const {rows}=await db.query(`select id,account_id,cycle_id,day_number,lesson_id,content_version,completed_at,
  feedback,signals->>'window' as window,signals->>'welcomeFocus' as focus,
  signals->>'comfort' as comfort,signals->>'usefulness' as usefulness,signals->>'practiceAttempt' as attempt${historyColumns}
  from app_private.growth_sessions where account_id=$1 and signals->>'window' in ('practice_v15','practice_v6')
  ${selecting?"and signals->>'welcomeFocus'=$3":''}
  order by completed_at desc,id desc limit $2`,[actor.id,PRACTICE_HISTORY_LIMIT+1,...(selecting?[input.focus]:[])])
 if(selecting)return chooseRememberedPractice(rows,{accountId:actor.id,focus:input.focus,
  titleFor:practiceTitle,partial:rows.length>PRACTICE_HISTORY_LIMIT})
 const view=practiceHistoryView(rows.slice(0,PRACTICE_HISTORY_LIMIT),actor.id,rows.length>PRACTICE_HISTORY_LIMIT)
 for(const item of view.items){
  const title=practiceTitle(item)
  if(title)item.title=title
 }
 return {...view,settingsRevision:settings.revision}
}
export async function manageMyCoachMemorySelection(config,actor,raw){
 let input
 try{input=normalizeMemorySelection(raw)}catch{throw new AppError('MY_COACH_MEMORY_SELECTION_INVALID',400)}
 return transaction(config,actor,async db=>{
  await active(db,actor)
  if(input.action==='permissions'){
   const settings=await readSettings(db,actor)
   return {allowed:ownerMemorySelectionAllowed(settings),settingsRevision:settings?.revision??0}
  }
  if(input.action==='export')return exportSelection(db,config,actor,input)
  if(input.action==='list'||input.action==='search')return list(db,config,actor,input)
  // Same canonical settings lock as the existing owner consent writer.
  const settings=await readSettings(db,actor,true)
  if(input.action==='practice-outcomes'||input.action==='practice-selection')return readPracticeOutcomes(db,actor,settings,input)
  if(input.action==='backfill-start')return startBackfill(db,config,actor,input,settings)
  if(input.action==='backfill-page')return backfillPage(db,config,actor,input,settings)
  if(!settings)throw new AppError('MY_COACH_MEMORY_CONSENT_REQUIRED',403)
  if(input.action!=='forget'&&!ownerMemorySelectionAllowed(settings))
   throw new AppError('MY_COACH_MEMORY_CONSENT_REQUIRED',403)
  const requestHash=operation(config,actor,input)
  const previous=await priorOperation(db,actor,input,requestHash)
  if(previous)return previous
  if(input.action==='correct')return correct(db,config,actor,input,requestHash)
  if(input.action==='forget'){
   const row=await refById(db,actor,input.id)
   if(!row)throw unavailable()
   if(row.revision!==input.expectedRevision)throw new AppError('STALE_REVISION',409)
   if(row.status==='blocked'){
    await recordOperation(db,actor,input,requestHash,row.id)
    return {...receipt(row),duplicate:false}
   }
   const {rows}=await db.query('update '+refs+
    " set status='blocked',source_hash=null,revision=revision+1 where account_id=$1 and id=$2 and revision=$3 and status='active' returning *",
    [actor.id,row.id,row.revision])
   if(rows.length!==1)throw new AppError('STALE_REVISION',409)
   await recordOperation(db,actor,input,requestHash,row.id)
   return {...receipt(rows[0]),duplicate:false}
  }
  if(settings.revision!==input.expectedSettingsRevision)throw new AppError('STALE_REVISION',409)
  const source=input.source
  const [archive]=await archiveRows(db,actor,[source.protocolId])
  const item=evidence(config,actor,archive,source)
  if(!item||ownerMemoryFingerprint(config,actor.id,item)!==input.sourceFingerprint)throw unavailable()
  const existing=(await db.query('select * from '+refs+' where account_id=$1 and protocol_id=$2 and field_id=$3',
   [actor.id,source.protocolId,source.fieldId])).rows[0]
  if(existing){
   if(existing.status!=='active')throw new AppError('MY_COACH_MEMORY_BLOCKED',409)
   if(existing.source_hash!==input.sourceFingerprint)throw unavailable()
   await recordOperation(db,actor,input,requestHash,existing.id)
   return {...receipt(existing),duplicate:false}
  }
  if(await selectionCount(db,actor)>=MEMORY_SELECTION_LIMIT)throw new AppError('MEMORY_LIMIT',429)
  const row=await insertSelectionReference(db,actor,source,input.sourceFingerprint)
  await recordOperation(db,actor,input,requestHash,row.id)
  return {...receipt(row),duplicate:false}
 })
}
