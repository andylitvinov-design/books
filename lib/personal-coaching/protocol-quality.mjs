// Private, client-observed coaching QA metadata. Never a provider receipt,
// clinical conclusion, permission to share, or automatic quality score.
import {coachProtocolEvidenceAudit} from './protocol-evidence-audit.mjs'
const locales=new Set(['en','ru','es'])
const providers=new Set(['groq','openrouter','gemini_free','gemini_paid','gemini_live_free'])
const safeId=/^[a-z0-9_-]{1,48}$/
const modelId=/^[a-zA-Z0-9._:/-]{1,128}$/
const visitId=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function coachTranscriptQualityFields(row){
 const out={}
 if(locales.has(row?.locale))out.locale=row.locale
 if(typeof row?.capturedAt==='string'&&row.capturedAt.length===24&&Number.isFinite(Date.parse(row.capturedAt))&&new Date(row.capturedAt).toISOString()===row.capturedAt)out.capturedAt=row.capturedAt
 if(row?.role==='assistant'){
  // Private-memory provenance survives encrypted draft/review round trips.
  // These flags can only restrict reuse; they never grant external access.
  if(row.requestedSavedContext===true||row.privateGreetingPrefix===true)out.requestedSavedContext=true
  if(row.privateGreetingPrefix===true)out.privateGreetingPrefix=true
  if(typeof row.coachId==='string'&&safeId.test(row.coachId))out.coachId=row.coachId
  const v=row.inference
  if(v&&providers.has(v.provider)&&typeof v.model==='string'&&modelId.test(v.model))out.inference={provider:v.provider,model:v.model}
 }
 return out
}
// Existing observed metadata cannot be silently changed or erased by a
// retry/review. Old archives without these fields can still be resumed.
export function coachTranscriptQualityExtends(before,after){
 const a=coachTranscriptQualityFields(before),b=coachTranscriptQualityFields(after)
 return Object.keys(a).every(key=>JSON.stringify(a[key])===JSON.stringify(b[key]))
}
export function coachQualityTranscript(protocol){
 if(!protocol||!Array.isArray(protocol.turns)||!protocol.turns.length)throw Error('MY_COACH_QUALITY_TRANSCRIPT_INVALID')
 const turns=protocol.turns.map((row,index)=>({
  sequence:index+1,role:row.role,content:row.content,...coachTranscriptQualityFields(row),
  // Only already-normalized archive attribution; QA fields alone never grant a visit.
  ...(visitId.test(row.visitId||'')&&safeId.test(row.coachId||'')?{visitId:row.visitId,coachId:row.coachId,...(row.role==='assistant'&&row.authorPersonaId===row.coachId?{authorPersonaId:row.authorPersonaId}:{})}:{}),
  ...(row.role==='assistant'&&row.mode?{mode:row.mode}:{}),
  ...(row.role==='assistant'&&row.stage?{stage:row.stage}:{}),
  ...(row.interrupted===true?{interrupted:true}:{}),
  ...(row.unanswered===true?{unanswered:true}:{})
 }))
 return {schema:'hh-coach-quality-transcript-v1',source:'client_observed_visible_transcript',
  reviewStatus:protocol.provenance==='client_reviewed_dialogue'?'reviewed':'unreviewed',
  session:{id:protocol.id,personaId:protocol.personaId,courseSessionId:protocol.courseSessionId??null,
   methodId:protocol.methodId??null,locale:protocol.locale,startedAt:protocol.startedAt,endedOrCheckpointAt:protocol.completedAt,
   durationSeconds:protocol.durationSeconds??null},
  counts:{turns:turns.length,client:turns.filter(x=>x.role==='user').length,coach:turns.filter(x=>x.role==='assistant').length,
   interrupted:turns.filter(x=>x.interrupted).length,unanswered:turns.filter(x=>x.unanswered).length},
  turns,qualityReport:coachProtocolEvidenceAudit(protocol)}
}
// Explicit owner click only. No upload, network request, vendor or analytics.
export function downloadCoachQualityTranscript(protocol){
 const payload=coachQualityTranscript(protocol)
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}))
 const a=document.createElement('a')
 a.href=url;a.download='my-coach-private-transcript-'+protocol.id+'.json'
 document.body.appendChild(a)
 try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
