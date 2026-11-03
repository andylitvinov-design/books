import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { createProfileSnapshot, validateResult } from '../lib/profile/history.js'
import { buildProfileSummary } from '../lib/profile/summary.js'
import { buildClientReport } from '../lib/profile/client-report.js'
const accountId=randomUUID()
const full=getAssessmentDefinition('ipip-via-r-strengths-96','v1','en')
const standalone=getAssessmentDefinition('ipip-via-r-curiosity-4','v1','en')
function result(def, day, upper) {
 const answers=Object.fromEntries(def.questions.map(q=>[q.id, upper ? 5 : 1]))
 // Vary one actual source item, ensuring a distinct score without changing keys.
 if(upper) answers[def.questions[0].id]=1
 return {id:randomUUID(),accountId,measurementAt:`2026-10-${day}T12:00:00.000Z`,...scoreAssessment(def,answers)}
}
const snapshot=(generated,carried=[])=>createProfileSnapshot({id:randomUUID(),accountId,generatedResult:generated,carriedResults:carried,createdAt:'2026-10-15T12:00:00.000Z'})
test('shared raw scale keys coexist in either completion order with original provenance',()=>{
 const a=result(full,'10',false),b=result(standalone,'11',true)
 for(const [generated,carried] of [[a,b],[b,a]]){
  const s=snapshot(generated,[carried]);assert.equal(s.dimensions.length,25)
  const rows=s.dimensions.filter(d=>d.key==='trait.via.curiosity');assert.equal(rows.length,2)
  for(const source of [a,b]) assert.deepEqual(rows.find(d=>d.sourceResultId===source.id),{...source.dimensions.find(d=>d.key==='trait.via.curiosity'),sourceResultId:source.id,sourceDefinitionId:source.definitionId,measurementAt:source.measurementAt,instrumentLocale:'en',remeasured:source.id===generated.id})
  assert.equal(new Set(s.dimensions.map(d=>d.sourceDefinitionId+'::'+d.key)).size,25)
  assert.equal(buildClientReport({results:[a,b],snapshot:s}).latestScales.length,25)
 }
})
test('repeat comparisons stay within exact instrument and historical snapshot shape',()=>{
 const a=result(full,'10',false),old=result(standalone,'11',false),recent=result(standalone,'12',true)
 assert.notEqual(old.dimensions[0].value,recent.dimensions[0].value)
 const s=snapshot(recent,[a,old]);const rows=buildProfileSummary({snapshot:JSON.parse(JSON.stringify(s)),results:[a,old,recent]}).rows.filter(d=>d.key==='trait.via.curiosity')
 assert.equal(rows.find(d=>d.sourceResultId===a.id).priorValue,null)
 assert.equal(rows.find(d=>d.sourceResultId===recent.id).priorValue,old.dimensions[0].value)
 assert.equal(rows.find(d=>d.sourceResultId===recent.id).delta,recent.dimensions[0].value-old.dimensions[0].value)
})
test('duplicate dimensions, missing or forged provenance and foreign ownership still fail closed',()=>{
 const a=result(full,'10',false)
 assert.throws(()=>validateResult({...a,dimensions:[a.dimensions[0],a.dimensions[0],...a.dimensions.slice(2)]}),/INVALID_RESULT/)
 for(const patch of [{definitionId:undefined},{contentHash:'forged'},{definitionKey:standalone.key}])assert.throws(()=>snapshot({...a,...patch}),/INVALID_PROVENANCE|UNKNOWN_DEFINITION/)
 assert.throws(()=>snapshot({...a,accountId:randomUUID()}),/OWNER_MISMATCH/)
})
test('three aggregate React lists use instrument-qualified identity without altering measurement keys',()=>{
 const s=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
 assert.ok(s.includes('MetricCard key={`${d.sourceDefinitionId}::${d.key}`}'))
 assert.ok(s.includes('className="hh-profile-chart-row" key={`${row.sourceDefinitionId}::${row.key}`}'))
 assert.ok(s.includes('<tr key={`${row.sourceDefinitionId}::${row.key}`}>'))
})
