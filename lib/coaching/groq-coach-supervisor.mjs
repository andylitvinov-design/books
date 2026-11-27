// Separate supervisor completion, not the coach's generative reply. Internal
// server adapter only. No route, browser import, automatic retry or fallback.
// Call ONLY through the supervisor's trusted authorization/reservation adapter.
import {coachingGroqConfig,GROQ_COACH_MODEL} from './groq-coach-provider.mjs'
const endpoint='https://api.groq.com/openai/v1/chat/completions'
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/u.test(v)
const keys=(o,expected)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===expected.length&&expected.every(k=>Object.hasOwn(o,k))
const secret=/(?:gsk_[A-Za-z0-9_-]{20,}|sk-(?:or-v1-)?[A-Za-z0-9_-]{20,}|github_pat_|-----BEGIN .+ PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/iu
const text=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!secret.test(v)
const verdicts=['MATCH','PARTIAL','MISMATCH','AMBIGUOUS','CONTRADICTION']
const types=['situation','problem','emotion','need','motivation','goal','obstacle','resource','option','decision','action','outcome','reflection','personal_image','rating','time','business','other']
const reasons=['sufficient','missing_specificity','incomplete','wrong_information_type','unrelated','uncertain_meaning','uncertain_transcription','conflicting_source']
const evidenceSchema={type:'object',additionalProperties:false,required:['turnId','quote'],properties:{turnId:{type:'string'},quote:{type:'string'}}}
const format={type:'json_schema',json_schema:{name:'hh_coach_supervisor_v1',strict:true,schema:{type:'object',additionalProperties:false,
 required:['reviewId','fieldId','verdict','informationType','reasonCode','evidence'],properties:{
 reviewId:{type:'string'},fieldId:{type:'string'},verdict:{type:'string',enum:verdicts},
 informationType:{type:'string',enum:types},reasonCode:{type:'string',enum:reasons},evidence:{type:'array',items:evidenceSchema}}}}}
function packet(p){
 if(!keys(p,['reviewId','fieldId','locale','mode','question','criterion','candidate','context'])||!identifier(p.reviewId)||!identifier(p.fieldId)||!['en','ru','es'].includes(p.locale)||!['coaching','therapy'].includes(p.mode)||!text(p.question,480)||!text(p.criterion,360)||!keys(p.candidate,['turnId','quote'])||!identifier(p.candidate.turnId)||!text(p.candidate.quote,1200)||!Array.isArray(p.context)||p.context.length>3)return false
 const seen=new Set([p.candidate.turnId])
 for(const row of p.context){
  if(!keys(row,['turnId','quote'])||!identifier(row.turnId)||seen.has(row.turnId)||!text(row.quote,240))return false
  seen.add(row.turnId)
 }
 return JSON.stringify(p).length<=3600
}
export function createGroqCoachSupervisorInvoker(env={},fetcher=globalThis.fetch){
 // The pre-existing coaching flags alone do not authorize a second AI call.
 // New separate feature flag is OFF unless explicitly enabled by owner.
 const config=coachingGroqConfig(env)
 if(env.HH_COACH_SUPERVISOR_GROQ_ENABLED!=='true'||!config||typeof fetcher!=='function')return null
 return async ({system,payload,signal}={})=>{
  if(!text(system,3000)||!packet(payload)||!signal||typeof signal.aborted!=='boolean'||signal.aborted)throw Error('COACH_SUPERVISOR_REQUEST_INVALID')
  const body={model:GROQ_COACH_MODEL,stream:false,include_reasoning:false,reasoning_effort:'low',temperature:0,max_completion_tokens:512,
   messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],response_format:format}
  let res
  try{res=await fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.apiKey},body:JSON.stringify(body)})}catch{throw Error('COACH_SUPERVISOR_PROVIDER_UNAVAILABLE')}
  if(!res?.ok||signal.aborted||typeof res.text!=='function')throw Error('COACH_SUPERVISOR_PROVIDER_UNAVAILABLE')
  try{
   const raw=await res.text()
   if(typeof raw!=='string'||raw.length>16000||signal.aborted)throw Error()
   const data=JSON.parse(raw),choice=data?.choices?.[0]
   if(data?.model!==GROQ_COACH_MODEL||data.choices.length!==1||choice?.finish_reason!=='stop'||choice.message?.tool_calls?.length||typeof choice.message?.content!=='string'||choice.message.content.length>3000)throw Error()
   const result=JSON.parse(choice.message.content)
   // Provider output must still be checked by validateSupervisorVerdict.
   if(!keys(result,['reviewId','fieldId','verdict','informationType','reasonCode','evidence'])||result.reviewId!==payload.reviewId||result.fieldId!==payload.fieldId||!verdicts.includes(result.verdict)||!types.includes(result.informationType)||!reasons.includes(result.reasonCode)||!Array.isArray(result.evidence)||result.evidence.length<1||result.evidence.length>4)throw Error()
   const sources=[payload.candidate,...payload.context]
   if(result.evidence.some(e=>!keys(e,['turnId','quote'])||!text(e.quote,240)||!sources.some(s=>s.turnId===e.turnId&&s.quote.includes(e.quote)))||!result.evidence.some(e=>e.turnId===payload.candidate.turnId)||result.verdict==='CONTRADICTION'&&!result.evidence.some(e=>e.turnId!==payload.candidate.turnId))throw Error()
   return result
  }catch{throw Error('COACH_SUPERVISOR_RESPONSE_INVALID')}
 }
}
