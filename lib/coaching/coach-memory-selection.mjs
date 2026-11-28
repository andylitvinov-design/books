import {normalizeOwnerMemoryQuery} from './coach-personal-memory.mjs'
import {GROWTH_GOALS} from '../inner-growth/course-model.js'
/** Versioned owner-selected evidence references. No duplicate source text. */
export const MEMORY_SELECTION_VERSION='hh-coach-memory-selection-v1'
export const MEMORY_SELECTION_PAGE=12
export const MEMORY_SELECTION_LIMIT=150
export const MEMORY_CORRECTION_MAX_LENGTH=600
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const key=/^[a-z0-9_]{1,60}$/
const hash=/^[0-9a-f]{64}$/
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
export const validMemorySelectionRevision=v=>Number.isSafeInteger(v)&&v>=0&&v<=2147483647
const invalid=()=>{throw Error('MY_COACH_MEMORY_SELECTION_INVALID')}
const exact=(v,keys)=>plain(v)&&Object.keys(v).every(k=>keys.includes(k))&&Object.keys(v).length===keys.length
export function normalizeMemorySelection(input){
 if(!plain(input))invalid()
 if(input.action==='list'){
  if(Object.keys(input).some(k=>!['action','after'].includes(k))||
    (input.after!==undefined&&input.after!==null&&(typeof input.after!=='string'||!uuid.test(input.after))))invalid()
  return {action:'list',after:input.after??null}
 }
 if(['export','permissions','practice-outcomes'].includes(input.action)){
  if(!exact(input,['action']))invalid()
  return {action:input.action}
 }
 if(input.action==='practice-selection'){
  if(!exact(input,['action','focus','confirmed','expectedSettingsRevision'])||input.confirmed!==true||
     typeof input.focus!=='string'||!Object.hasOwn(GROWTH_GOALS,input.focus)||
     !validMemorySelectionRevision(input.expectedSettingsRevision))invalid()
  return {...input}
 }
 if(input.action==='backfill-start'){
  if(!exact(input,['action','confirmed','expectedSettingsRevision'])||input.confirmed!==true||
     !validMemorySelectionRevision(input.expectedSettingsRevision))invalid()
  return {...input}
 }
 if(input.action==='backfill-page'){
  if(!exact(input,['action','cursor'])||typeof input.cursor!=='string'||!input.cursor||input.cursor.length>2048)invalid()
  return {...input}
 }
 if(input.action==='search'){
  if(!exact(input,['action','query']))invalid()
  try{return {action:'search',query:normalizeOwnerMemoryQuery(input.query)}}catch{invalid()}
 }
 if(input.action==='save'){
  if(!exact(input,['action','confirmed','operationId','expectedSettingsRevision','source','sourceFingerprint'])||
     input.confirmed!==true||typeof input.operationId!=='string'||!uuid.test(input.operationId)||
     !validMemorySelectionRevision(input.expectedSettingsRevision)||typeof input.sourceFingerprint!=='string'||!hash.test(input.sourceFingerprint))invalid()
  const s=input.source
  if(!exact(s,['kind','protocolId','courseSessionId','fieldId','fieldRevision','turnIndex'])||
     s.kind!=='reviewed_coaching_protocol'||typeof s.protocolId!=='string'||!uuid.test(s.protocolId)||
     typeof s.courseSessionId!=='string'||!key.test(s.courseSessionId)||typeof s.fieldId!=='string'||!key.test(s.fieldId)||
     !validMemorySelectionRevision(s.fieldRevision)||s.fieldRevision<1||!validMemorySelectionRevision(s.turnIndex)||s.turnIndex>511)invalid()
  return {...input,source:{...s}}
 }
 if(input.action==='correct'){
  if(!exact(input,['action','confirmed','operationId','id','expectedRevision','value'])||
     input.confirmed!==true||typeof input.operationId!=='string'||!uuid.test(input.operationId)||
     typeof input.id!=='string'||!uuid.test(input.id)||!validMemorySelectionRevision(input.expectedRevision)||
     typeof input.value!=='string'||input.value.length>MEMORY_CORRECTION_MAX_LENGTH||
     !input.value.trim()||/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(input.value))invalid()
  return {...input,value:input.value.trim()}
 }
 if(input.action==='forget'){
  if(!exact(input,['action','confirmed','operationId','id','expectedRevision'])||
     input.confirmed!==true||typeof input.operationId!=='string'||!uuid.test(input.operationId)||
     typeof input.id!=='string'||!uuid.test(input.id)||!validMemorySelectionRevision(input.expectedRevision))invalid()
  return {...input}
 }
 invalid()
}
export function ownerMemorySelectionAllowed(settings){
 return settings?.memory_enabled===true&&settings?.sensitive_enabled===true&&validMemorySelectionRevision(settings.revision)
}
export function matchingMemoryEvidence(items,source){
 if(!Array.isArray(items)||!source)return null
 const matches=items.filter(x=>x?.evidenceStatus==='client_confirmed'&&x.temporalStatus==='historical'&&
   x.source?.kind==='reviewed_coaching_protocol'&&x.source.protocolId===source.protocolId&&
   x.source.fieldId===source.fieldId&&x.source.fieldRevision===source.fieldRevision&&
   x.source.turnIndex===source.turnIndex&&(!source.courseSessionId||x.source.courseSessionId===source.courseSessionId))
 return matches.length===1?matches[0]:null
}
// Treat every archive excerpt as potentially sensitive. Never auto-share it.
export function memorySelectionView(row,item,correction=null){
 if(!row||row.status!=='active'||!item||row.account_id!==item.accountId)return null
 if(row.revision>0&&(!correction?.value||correction.revision!==row.revision))return null
 if(row.revision===0&&correction)return null
 const {accountId:ignored,...safe}=item
 const value=correction?{value:correction.value,valueSource:'owner_correction',confirmedAt:correction.confirmedAt}:
  {valueSource:'reviewed_coaching_protocol',confirmedAt:row.created_at}
 return {...safe,...value,id:row.id,revision:row.revision,status:'active',
  scope:'owner_only',providerShareable:false}
}
