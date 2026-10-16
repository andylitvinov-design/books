import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { BACH_PROFILE_EN_V1, BACH_PROFILE_RU_V1 } from '../data/assessments/bach-flower-v1.js'
import { BACH_V2_DEFINITIONS } from '../data/assessments/bach-flower-v2.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { evaluateBachAnswers } from '../lib/assessments/bach-profile.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { compareResults } from '../lib/profile/history.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { interpretationPlan } from '../lib/assessments/interpretation-registry.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
const oldDefs=[BACH_PROFILE_EN_V1,BACH_PROFILE_RU_V1]
const answers=(d,n=0)=>Object.fromEntries(d.questions.map(q=>[q.id,n]))
const text=(d,id)=>d.questions.find(q=>q.id===id).text
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
// Independent formula, intentionally not calling the production evaluator.
function oracle(def,a,remedy){
 const qs=def.questions.filter(q=>q.remedy===remedy && a[q.id]>0)
 const sections=new Set(qs.map(q=>q.section))
 return qs.reduce((sum,q)=>sum+a[q.id]*(q.section==='control'?1.5:1)+(a[q.id]===4?1:a[q.id]===5?2:0),0)+(sections.size===3?4:sections.size===2?2:0)+(sections.has('control')?1.5:0)
}
test('Bach v2 is a new paired identity with only three authorized text changes; v1 remains exact',()=>{
 const historical=JSON.parse(read('supabase/migrations/20261011155000_bach_flower_profile_v1.sql').match(/\$defs\$([\s\S]*?)\$defs\$::jsonb/)[1])
 assert.deepEqual(oldDefs,historical)
 const proposal=JSON.parse(read('docs/assessments/registry-proposals/bach-flower-v2-definitions.json'))
 assert.deepEqual(proposal,BACH_V2_DEFINITIONS)
 for(const [i,d] of BACH_V2_DEFINITIONS.entries()){
  const old=oldDefs[i],{contentHash,...body}=d
  assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  assert.notEqual(d.id,old.id);assert.notEqual(d.contentHash,old.contentHash)
  assert.equal(d.version,'v2');assert.equal(d.resultVersion,'v2')
  assert.equal(d.translationVersion,`hh-bach-${d.instrumentLocale}-v2`)
  assert.equal(d.scoringKey,old.scoringKey);assert.equal(d.scoringVersion,old.scoringVersion)
  assert.equal(d.questions.length,115)
  assert.deepEqual(d.answerScale,old.answerScale);assert.deepEqual(d.responseAnchors,old.responseAnchors)
  const changed=[]
  d.questions.forEach((q,j)=>{const {text:qt,...qm}=q,{text:ot,...om}=old.questions[j];assert.deepEqual(qm,om);if(qt!==ot)changed.push(q.id)})
  assert.deepEqual(changed,d.instrumentLocale==='en'?['bach.situation.36']:['bach.situation.36','bach.control.03'])
  assert.equal(getAssessmentDefinition(d.key,'v1',d.instrumentLocale),old)
  assert.equal(getAssessmentDefinition(d.key,'v2',d.instrumentLocale),d)
  assert.ok(Object.isFrozen(d.questions[0]))
 }
 assert.equal(text(BACH_V2_DEFINITIONS[0],'bach.situation.36'),'I feel overly critical of others, irritable, or intolerant of differences.')
 assert.equal(text(BACH_V2_DEFINITIONS[1],'bach.situation.36'),'Я замечаю у себя чрезмерную критичность к другим, раздражительность или нетерпимость к различиям.')
 assert.equal(text(BACH_V2_DEFINITIONS[1],'bach.control.03'),'Поддержание внешней гармонии при сокрытии собственных трудностей.')
 assert.equal(text(BACH_V2_DEFINITIONS[0],'bach.control.03'),text(oldDefs[0],'bach.control.03'))
})
test('Bach v2 retains independent legacy math for every local remedy response combination',()=>{
 // Exhaustive per-remedy combinations establish all additive score components without 6^115 vectors.
 for(const [i,d] of BACH_V2_DEFINITIONS.entries()){
  for(const remedy of new Set(d.questions.map(q=>q.remedy))){
   const items=d.questions.filter(q=>q.remedy===remedy),a=answers(d)
   for(let code=0;code<6**items.length;code++){
    let n=code;for(const q of items){a[q.id]=n%6;n=Math.floor(n/6)}
    const current=evaluateBachAnswers(d.questions,a),prior=evaluateBachAnswers(oldDefs[i].questions,a)
    assert.deepEqual(current,prior)
    assert.equal(current.find(x=>x.remedy===remedy).total,oracle(d,a,remedy))
   }
  }
  for (const value of [0,1,2,3,4,5]) assert.deepEqual(scoreAssessment(d,answers(d,value)).dimensions,scoreAssessment(oldDefs[i],answers(d,value)).dimensions)
  const a=answers(d);delete a[d.questions[0].id]
  assert.throws(()=>validateAnswers(d,a))
  assert.throws(()=>validateAnswers(d,{...answers(d),[d.questions[0].id]:6}))
 }
})
test('Bach catalog, paired guides and report use exact versions and reject cross-version comparisons',()=>{
 assert.equal(MONITORING_CATALOG.find(x=>x.key==='hh-bach-flower-profile').version,'v2')
 for(const d of BACH_V2_DEFINITIONS){
  for(const v of ['v1','v2']){
   assert.ok(interpretationPlan(d.key,v))
   assert.ok(getTestScaleGuide(d.key,d.instrumentLocale,v))
   const def=getAssessmentDefinition(d.key,v,d.instrumentLocale),r=scoreAssessment(def,answers(def))
   const report=buildAssessmentResultReport(r,d.instrumentLocale)
   assert.equal(report.sections.length,38);assert.equal(report.highlightedCount,0)
  }
  const result=def=>({id:randomUUID(),runId:randomUUID(),accountId:'10000000-0000-4000-8000-000000000001',measurementAt:'2026-10-16T10:00:00.000Z',...scoreAssessment(def,answers(def))})
  assert.throws(()=>compareResults(result(d),result(getAssessmentDefinition(d.key,'v1',d.instrumentLocale))),e=>e.code==='INCOMPATIBLE_RESULTS')
 }
})
