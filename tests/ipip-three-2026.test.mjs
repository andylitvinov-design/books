import { TANTRIC_REFLECTION_KEYS } from '../data/assessments/tantric-reflections-v1.js'
import {IPIP_VIA_R_COMPLETION_DEFINITIONS} from '../data/assessments/ipip-via-r-completion-2026.js'
import test from 'node:test'
import {IPIP_FIVE_DEFINITIONS} from '../data/assessments/ipip-five-2026.js'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { IPIP_THREE_DEFINITIONS as added, IPIP_THREE_CATALOG } from '../data/assessments/ipip-three-2026.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationForDimension, classificationDirection, interpretationRegistryCoverage } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { testKindFor, auditTestKey } from '../lib/assessments/test-kinds.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
const proof = JSON.parse(readFileSync(new URL('../docs/assessments/ipip-three-source-proof.json',import.meta.url)))
const answers=(d,value)=>Object.fromEntries(d.questions.map(q=>[q.id,value]))
const fingerprint=d=>JSON.stringify(d.questions.map(q=>q.text.trim().toLowerCase()).sort())
for(const [index,d] of added.entries()) {
 test(d.key+' exact source, keys, immutable identity and no exact-scale duplicate',()=>{
  assert.deepEqual(d.questions.map(q=>q.text),proof.scales[index].items)
  assert.deepEqual(d.scoring.dimensions[0].reverseItems.map(id=>Number(id.split('.').at(-1))),proof.scales[index].negativePositions)
  assert.equal(d.questions.length,10)
  assert.equal(d.instrumentLocale,'en')
  assert.throws(()=>getAssessmentDefinition(d.key,'v1','ru'))
  assert.equal(getAssessmentDefinition(d.key,'v1','en'),d)
  assert.equal(ASSESSMENT_DEFINITIONS.filter(x=>fingerprint(x)===fingerprint(d)).length,1)
  const {contentHash,...body}=d
  assert.equal(contentHash,'sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'))
  assert.equal(d.source.url,proof.scales[index].sourceUrl)
  assert.equal(d.source.permissionUrl,proof.permissionUrl)
  assert.equal(d.source.onlinePermissionUrl,proof.onlinePermissionUrl)
 })
 test(d.key+' every item reverse rule, endpoints, missing and malformed input',()=>{
  const reversed=d.scoring.dimensions[0].reverseItems
  for(const [positive,negative,expected] of [[1,5,10],[5,1,50],[3,3,30]]) {
   const a=Object.fromEntries(d.questions.map(q=>[q.id,reversed.includes(q.id)?negative:positive]))
   assert.equal(scoreAssessment(d,a).dimensions[0].value,expected)
  }
  for(const q of d.questions) {
   assert.equal(scoreAssessment(d,{...answers(d,3),[q.id]:4}).dimensions[0].value,reversed.includes(q.id)?29:31)
   for(const bad of [0,6,2.5,'3',NaN,Infinity,null,undefined]) assert.throws(()=>scoreAssessment(d,{...answers(d,3),[q.id]:bad}))
   const missing=answers(d,3);delete missing[q.id];assert.throws(()=>scoreAssessment(d,missing))
  }
  assert.throws(()=>scoreAssessment(d,{...answers(d,3),extra:3}))
 })
 test(d.key+' continuous neutral reports at every possible sum and no course target',()=>{
  const reverse=d.scoring.dimensions[0].reverseItems
  for(let total=10;total<=50;total++) {
   let remaining=total-10
   const a=Object.fromEntries(d.questions.map(q=>{const scored=1+Math.min(4,remaining);remaining-=scored-1;return [q.id,reverse.includes(q.id)?6-scored:scored]}))
   const result=scoreAssessment(d,a),dim=result.dimensions[0]
   assert.equal(dim.value,total)
   assert.equal(classificationDirection(dim),'neutral')
   for(const locale of ['en','ru']) {
    const interpretation=interpretationForDimension(result,dim,locale)
    assert.equal(interpretation.code,'continuous')
    assert.equal(interpretation.basis,'descriptive')
    assert.equal(interpretation.recommendedReview,false)
    const report=buildAssessmentResultReport(result,locale)
    assert.equal(report.sections.length,1)
    assert.equal(report.sections[0].bandBasis,'descriptive')
    const guide=getTestScaleGuide(d.key,locale)
    assert.equal(guide.scales[0].canChooseSkill,false)
    assert.equal(guide.scales[0].type,'trait')
   }
  }
  const result=scoreAssessment(d,answers(d,3)),dim=result.dimensions[0]
  for(const patch of [{definitionVersion:'v2'},{contentHash:'bad'},{instrumentLocale:'ru'},{definitionId:'bad'},{scoringVersion:'v2'},{timeframe:'past-week'}])
   assert.equal(interpretationForDimension({...result,...patch},dim).basis,'unavailable')
  for(const patch of [{value:9},{value:51},{value:30.5},{direction:'higher-reported-wellbeing'},{min:0},{dimensionClass:'resources'}])
   assert.equal(interpretationForDimension(result,{...dim,...patch}).basis,'unavailable')
  if(d.key.includes('attending')) assert.match(interpretationForDimension(result,dim).meaning,/not necessarily healthier or better/)
 })
 test(d.key+' source-backed professional discovery, English-only administration',()=>{
  const catalog=IPIP_THREE_CATALOG[index]
  assert.equal(testKindFor({key:d.key,catalog,definition:d}),'professional')
  assert.equal(auditTestKey({catalog,definition:d}).status,'ready')
  assert.equal(assessmentMethodology({key:d.key,catalog,definition:d}).status,'research')
  for(const locale of ['en','ru'])for(const audience of ['guest','account']) {
   const entries=buildExplorerEntries({locale,audience}).filter(e=>e.key===d.key)
   assert.equal(entries.length,1)
   assert.equal(entries[0].selectable,true)
   assert.equal(entries[0].startable,true)
   assert.equal(entries[0].testKind,'professional')
   assert.equal(entries[0].definition.instrumentLocale,'en')
   assert.equal(catalog.registrationRequired,true)
  }
 })
}
test('three additive versions: 150 runnable, 77 source-backed, 73 HH after exact registration; exact registration payload',()=>{
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,150)
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable&&c.testStyle==='professional').length,77)
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable&&c.key.startsWith('hh-')).length,73)
 assert.deepEqual(interpretationRegistryCoverage(MONITORING_CATALOG),{total:150,registered:150,uncovered:[],obsolete:[]})
 assert.deepEqual(JSON.parse(readFileSync(new URL('../docs/assessments/ipip-three-registration.json',import.meta.url))),added)
 // Exclude only the six appended split-v2 IDs from this historical baseline.
 const splitV2Ids=new Set([
   '52c75d85-d99e-5178-8ee4-3b7faa802601',
   '7715324b-f54c-5d7c-8ca7-08ff17ba8c8e',
   'f65b9e09-2818-5c01-abb7-438600530e8f',
   '3ea615ee-b188-5c1e-8e41-2bfd221a75d7',
   '0c27f7d6-0280-5dcd-8f10-59447585b1df',
   '9a864e36-7362-567b-923e-ea99228f933d',
 ])
 assert.equal(ASSESSMENT_DEFINITIONS.filter(d=>splitV2Ids.has(d.id)&&d.version==='v2').length,6)
 // The separately approved Bach pair is additive; no historical ID is excluded.
 const bachV2Ids=new Set(['181604ad-23ed-4c9b-952b-299519edcacf','25fe2fac-ccaf-4483-b213-cf78db40af0e'])
 assert.equal(ASSESSMENT_DEFINITIONS.filter(d=>bachV2Ids.has(d.id)&&d.version==='v2').length,2)
 // These five owner-added v1 English forms are additive, not part of the frozen historical baseline.
 const professionalAdditionIdentities = [
  { key: 'ipip-emotion-decision-making-9', id: '13deba1e-e350-5593-85c7-30f2c9815cbd', version: 'v1', instrumentLocale: 'en' },
  { key: 'ipip-responsive-joy-10', id: '00089afb-3905-5e84-8efb-f0566342aff5', version: 'v1', instrumentLocale: 'en' },
  { key: 'ipip-responsive-distress-10', id: 'eea5bd21-9620-5fd6-bc2a-9809e590fbd2', version: 'v1', instrumentLocale: 'en' },
  { key: 'ipip-empathic-concern-10', id: '608dce45-8984-51bc-9f1d-5dc8aa9eac8e', version: 'v1', instrumentLocale: 'en' },
  { key: 'ons-personal-wellbeing-4', id: '78e257f3-7d2d-5feb-a317-d39f8c2a8e19', version: 'v1', instrumentLocale: 'en' },
 ]
 const professionalAdditionIds = new Set(professionalAdditionIdentities.map(d => d.id))
 const professionalAdditionKeys = new Set(professionalAdditionIdentities.map(d => d.key))
 assert.deepEqual(
  ASSESSMENT_DEFINITIONS.filter(d => professionalAdditionIds.has(d.id) || professionalAdditionKeys.has(d.key))
   .map(({ key, id, version, instrumentLocale }) => ({ key, id, version, instrumentLocale }))
   .sort((a, b) => a.key.localeCompare(b.key)),
  [...professionalAdditionIdentities].sort((a, b) => a.key.localeCompare(b.key)),
 )
 const prior=ASSESSMENT_DEFINITIONS.filter(d=>!professionalAdditionIds.has(d.id)).filter(d=>!TANTRIC_REFLECTION_KEYS.includes(d.key)).filter(d=>!splitV2Ids.has(d.id)&&!bachV2Ids.has(d.id)).filter(d=>!['ipip-via-r-strengths-96','cfpb-financial-wellbeing-5'].includes(d.key)).filter(d=>!['pcl-5','itq-adult'].includes(d.key)).filter(d=>!(d.key==='gad-7'&&d.instrumentLocale==='ru')).filter(d=>!IPIP_VIA_R_COMPLETION_DEFINITIONS.some(v=>v.id===d.id)).filter(d=>![...added,...IPIP_FIVE_DEFINITIONS].some(n=>n.id===d.id))
 assert.equal(createHash('sha256').update(canonicalJSON(prior)).digest('hex'),'7635478d0c3762d2af209716cef82788c786504fc097895d786d4115604108f1')
})


