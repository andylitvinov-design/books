// Product QA rubric, not clinical scores. Never infer mode, scores or safety
// from a transcript. Only trusted independently reviewed evidence may be graded.
export const COACH_QUALITY_RUBRIC_VERSION='hh-coach-quality-rubric-v1'
const weights=Object.freeze({
 coaching:Object.freeze({protocol_accuracy:25,scenario_adherence:20,question_quality:20,empathy:15,persona:10,closure:10}),
 therapy:Object.freeze({protocol_accuracy:20,scenario_adherence:15,question_quality:15,empathy:25,persona:10,closure:15})
})
export function coachQualityRubric(mode){
 return Object.hasOwn(weights,mode)?{version:COACH_QUALITY_RUBRIC_VERSION,mode,criteria:Object.entries(weights[mode]).map(([id,weight])=>({id,weight})),minimumCoverage:80}:null
}
// Scores come from a trusted reviewer adapter, not arbitrary client submissions.
// Evidence indexes must reference existing literal transcript turns. A score is
// not proof of clinical effectiveness, or a replacement for safety review.
export function evaluateCoachQualityRubric({mode,turns,ratings=[],safety='not_performed',privacy='not_performed'}={}){
 const rubric=coachQualityRubric(mode)
 const empty={version:COACH_QUALITY_RUBRIC_VERSION,mode:rubric?.mode??null,coverage:0,overallScore:null,safety,privacy}
 if(!rubric||!Array.isArray(turns)||!Array.isArray(ratings))return {...empty,status:'unavailable',criteria:[]}
 const criteria=rubric.criteria.map(c=>{
  const entries=ratings.filter(r=>r?.id===c.id),r=entries[0]
  if(entries.length!==1||!Number.isInteger(r.score)||r.score<0||r.score>100||!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.length>8||r.evidence.some(e=>!Number.isInteger(e?.turnIndex)||!['assistant','user'].includes(turns[e.turnIndex]?.role)||typeof e.quote!=='string'||!e.quote.trim()||e.quote.length>240||!turns[e.turnIndex]?.content?.includes(e.quote))||!r.evidence.some(e=>turns[e.turnIndex].role==='assistant'))return {...c,score:null,status:'not_assessed',evidenceTurnIndexes:[]}
  return {...c,score:r.score,status:'assessed',evidenceTurnIndexes:[...new Set(r.evidence.map(e=>e.turnIndex))]}
 })
 const assessed=criteria.filter(c=>c.status==='assessed'),coverage=assessed.reduce((sum,c)=>sum+c.weight,0)
 const overallScore=coverage>=rubric.minimumCoverage&&safety==='passed'&&privacy==='passed'?Math.round(assessed.reduce((sum,c)=>sum+c.weight*c.score,0)/coverage):null
 return {...empty,status:overallScore===null?'partial':'assessed',criteria,coverage,overallScore}
}
