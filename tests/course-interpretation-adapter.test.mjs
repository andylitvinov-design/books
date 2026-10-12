import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { courseInterpretationFromResult } from '../lib/inner-growth/course-interpretation-adapter.js'
const def=getAssessmentDefinition('cbi-personal')
function fixture(version='2026-10-12.v2'){
 const result=structuredClone(scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min]))))
 result.interpretations={en:{status:'available',origin:'database',identity:provenance(def),uiLocale:'en',interpretationVersion:version,payloadHash:'sha256:'+'a'.repeat(64),
  sections:result.dimensions.map(d=>({...d,meaning:'Synthetic public-v1 DB prose',compact:version.endsWith('v2')?{meaning:'Synthetic v2 DB prose'}:undefined}))}}
 return result
}
test('public v1 and new v2 report envelopes normalize without mixing instrument and payload hashes',()=>{
 for(const version of ['2026-10-12.v1','2026-10-12.v2']){
  const result=fixture(version),report=courseInterpretationFromResult(result,'en')
  assert.equal(report.revision,version);assert.equal(report.contentHash,'a'.repeat(64));assert.equal(report.identity.contentHash,def.contentHash)
  assert.equal(report.sections[0].compact.meaning,version.endsWith('v1')?'Synthetic public-v1 DB prose':'Synthetic v2 DB prose')
 }
})
test('adapter fail-closed mutation matrix, including v2 without compact; no synthetic prose fallback',()=>{
 const changes=[r=>delete r.interpretations,r=>r.interpretations.en.origin='static',r=>r.interpretations.en.status='unavailable',r=>r.interpretations.en.uiLocale='ru',r=>r.interpretations.en.interpretationVersion='future',r=>r.interpretations.en.payloadHash='a'.repeat(64),r=>r.interpretations.en.identity.contentHash='wrong',r=>r.interpretations.en.sections[0].value=99,r=>r.interpretations.en.sections[0].min=-1,r=>r.interpretations.en.sections[0].key='wrong',r=>r.interpretations.en.sections.push(r.interpretations.en.sections[0]),r=>delete r.interpretations.en.sections[0].compact]
 for(const change of changes){const r=fixture();change(r);assert.equal(courseInterpretationFromResult(r,'en'),null)}
 assert.equal(courseInterpretationFromResult(fixture(),'ru'),null)
 assert.equal(courseInterpretationFromResult(fixture(),'en',{allowedVersions:['2026-10-12.v1']}),null)
})
