// Owner-private cross-mode memory. Not an LLM context packet, permission,
// fresh therapy assessment, completed session result or transcript export.
import {antiStressBoundProtocol} from './anti-stress-runs.mjs'
const clip=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/gu,' ').replace(/\s+/gu,' ').trim().slice(0,n):''
const stamp=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const bad=()=>{throw Error('COACH_PRIVATE_MEMORY_INVALID')}
const fields=new Set(['ground_anchor','ground_when','calm_variant','calm_steps','calm_fallback','calm_when','chosen_resource','resource_plan','routine_cue','low_energy_option','support_threshold','practice_status','resource_response'])
export function antiStressReviewStamp(rows){
 if(!Array.isArray(rows))bad()
 if(!rows.length)return null
 for(const r of rows)if(!r||!stamp(r.confirmedAt)||!['confirmed','skipped'].includes(r.status)||r.reviewed!==true||typeof r.evidenceId!=='string'||!r.evidenceId)bad()
 return Math.max(...rows.map(r=>r.confirmedAt))
}
export function projectAntiStressPrivateMemory(run,sessionId,protocolId,ledger,reviewedAt,locale='en'){
 const {binding,rows}=antiStressBoundProtocol(run,sessionId,protocolId,ledger,locale)
 if(!binding.time||!stamp(reviewedAt)||antiStressReviewStamp(ledger.rows)!==reviewedAt)bad()
 const day=run.clock.days[binding.number-1]
 if(ledger.rows.some(r=>!day.segments.some(s=>s.coachId===r.coachId&&r.confirmedAt>=s.startedAt&&r.confirmedAt<=s.observedAt)))bad()
 const get=id=>rows.find(r=>r.fieldId===id&&r.status==='confirmed')?.value
 const resourceOkay=get('practice_consent')==='accepted'&&['attempted','adapted'].includes(get('practice_status'))&&['comfortable','neutral'].includes(get('resource_response'))&&get('meditation_consent')==='accepted'
 const selected=rows.filter(r=>r.status==='confirmed'&&(fields.has(r.fieldId)||(resourceOkay&&r.fieldId==='resource_selected')))
 return {kind:'therapy_reviewed_fields',scope:'owner_private_only',mode:'therapy',protocolId,sessionId,reviewedAt:new Date(reviewedAt).toISOString(),sessionStatus:binding.time.status,
  fields:selected.map(r=>({fieldId:r.fieldId,label:r.label,value:clip(r.value,180)})).filter(r=>r.value).slice(0,8),requiresFreshPracticeConsent:true}
}
export function projectCoachingPrivateMemory(protocols,exclude=null){
 if(exclude!==null&&!uuid(exclude))bad()
 if(!Array.isArray(protocols))bad()
 const eligible=protocols.filter(r=>r?.provenance==='client_reviewed_dialogue'&&uuid(r.id)&&r.id!==exclude&&typeof r.savedAt==='string'&&stamp(Date.parse(r.savedAt)))
 const r=[...eligible].sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt)||b.id.localeCompare(a.id))[0]
 return r?{kind:'coaching_reviewed_record',scope:'owner_private_only',mode:'coaching',protocolId:r.id,reviewedAt:new Date(r.savedAt).toISOString(),topic:clip(r.goal,120),conclusions:clip(r.clientSummary,300),nextStep:clip(r.clientNextStep,160)}:null
}
// Each source has an explicit status: a failed read is never an empty archive.
// No provider ticket, raw log, resource imagery details or automatic reuse.
export function assembleOwnerCrossModeMemory({identity,coaching,therapy}){
 const read=(result,mode)=>result?.status!=='fulfilled'?{status:'unavailable',record:null}:result.value===null?{status:'empty',record:null}:
  result.value?.scope==='owner_private_only'&&result.value.mode===mode?{status:'available',record:result.value}:{status:'unavailable',record:null}
 const c=read(coaching,'coaching'),t=read(therapy,'therapy')
 const recent=[c.record,t.record].filter(Boolean).sort((a,b)=>Date.parse(b.reviewedAt)-Date.parse(a.reviewedAt))
 return {schema:'HH_OWNER_CROSS_MODE_MEMORY_V1',scope:'owner_private_only',
  identity:identity?.status==='fulfilled'?{status:'available',preferredName:clip(identity.value?.preferredName,60)}:{status:'unavailable',preferredName:''},
  coaching:c,therapy:t,latest:c.status==='unavailable'||t.status==='unavailable'?null:recent[0]?.mode??null,requiresProviderSpecificConsent:true}
}

// Read only the bounded newest-first owner archive until a reviewed record
// is found. An incomplete search is unavailable, never "no previous session".
export async function latestReviewedCoachingMemory(readPage,exclude=null){
 if(typeof readPage!=='function'||exclude!==null&&!uuid(exclude))bad()
 let cursor=null
 for(let i=0;i<3;i++){
  const page=await readPage(cursor)
  if(!Array.isArray(page?.protocols)||typeof page.hasMore!=='boolean')bad()
  const result=projectCoachingPrivateMemory(page.protocols,exclude)
  if(result)return result
  if(!page.hasMore)return null
  if(!page.nextCursor||typeof page.nextCursor.before!=='string'||!uuid(page.nextCursor.beforeId)||
     cursor&&cursor.before===page.nextCursor.before&&cursor.beforeId===page.nextCursor.beforeId)bad()
  cursor=page.nextCursor
 }
 bad()
}
// A strictly bounded display projection, never a provider context packet.
// No raw transcript, stage token, unrecognized field or future action is
// copied from the response.
export function crossModeMemoryDisplay(value,exclude=null){
 if(exclude!==null&&!uuid(exclude))bad()
 if(value?.schema!=='HH_OWNER_CROSS_MODE_MEMORY_V1'||value.scope!=='owner_private_only'||value.requiresProviderSpecificConsent!==true)bad()
 const result={}
 for(const mode of ['coaching','therapy']){
  const item=value[mode]
  if(!['available','empty','unavailable'].includes(item?.status))bad()
  if(item.status!=='available'){if(item.record!==null)bad();result[mode]={status:item.status,record:null};continue}
  const r=item.record
  if(r?.mode!==mode||r.scope!=='owner_private_only'||!uuid(r.protocolId)||r.protocolId===exclude||!stamp(Date.parse(r.reviewedAt)))bad()
  const base={reviewedAt:new Date(r.reviewedAt).toISOString()}
  if(mode==='coaching'){
   if(r.kind!=='coaching_reviewed_record')bad()
   result.coaching={status:'available',record:{...base,topic:clip(r.topic,120),conclusions:clip(r.conclusions,300),nextStep:clip(r.nextStep,160)}}
  }else{
   if(r.kind!=='therapy_reviewed_fields'||r.requiresFreshPracticeConsent!==true||!Array.isArray(r.fields)||r.fields.length>8)bad()
   const safe=r.fields.map(row=>{if(!(fields.has(row?.fieldId)||row?.fieldId==='resource_selected')||typeof row.label!=='string'||typeof row.value!=='string')bad();return {fieldId:row.fieldId,label:clip(row.label,160),value:clip(row.value,180)}})
   if(new Set(safe.map(x=>x.fieldId)).size!==safe.length)bad()
   result.therapy={status:'available',record:{...base,fields:safe}}
  }
 }
 return result
}
