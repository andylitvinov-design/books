import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { deterministicPatterns, compatibleSeries } from '../lib/assessments/monitoring.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'
import { buildTestDynamicsGroups } from '../lib/assessments/test-dynamics.js'
const make=(key,version,locale='en',value=0,day=1)=>{
 const d=getAssessmentDefinition(key,version,locale)
 return {...scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,Math.min(q.max??d.answerScale.max,Math.max(q.min??d.answerScale.min,value))]))),id:`00000000-0000-4000-8000-${String(day).padStart(12,'0')}`,accountId:'10000000-0000-4000-8000-000000000001',measurementAt:`2026-10-${String(day).padStart(2,'0')}T12:00:00Z`}
}
for(const locale of ['en','ru']) for(const value of [0,1,2,3,4]) test(`neutral situational relief is not a personality trait ${locale}/${value}`,()=>{
 const r=make('hh-screen-saturation','v2',locale,value),before=JSON.stringify(r)
 const d=r.dimensions.find(d=>d.key.endsWith('offline_relief')), m=gaugeModel(d,r,locale)
 assert.equal(m.rangeReading.trait,false)
 assert.doesNotMatch(m.rangeReading.heading,/personality|личностн/i)
 for(const row of m.rangeReading.rows) assert.doesNotMatch(row.note,/personality type|whole person|тип личности|определяет личность/i)
 assert.equal(m.rangeReading.current.originalAnswerCode,value)
 assert.equal(m.rangeReading.rows.length,5);assert.match(m.rangeReading.caution,/not clinical|не клиническ/)
 assert.equal(JSON.stringify(r),before)
})
for(const key of ['hh-money-pressure','hh-overthinking-loop','hh-screen-saturation','hh-bach-flower-profile']) test(`invalid current ${key} cannot resurrect historical trend`,()=>{
 const old=[1,2,3].map(day=>make(key,'v1','en',day,day));const latest={...make(key,'v2','en',2,4),contentHash:'invalid'}
 assert.ok(deterministicPatterns({results:old}).some(p=>p.instrumentKey===key),'valid historical-only fallback remains')
 assert.deepEqual(compatibleSeries(monitoringCatalogItem(key),[...old,latest]),[])
 assert.deepEqual(deterministicPatterns({results:[...old,latest]}),[])
 assert.deepEqual(deterministicPatterns({results:[latest,...old].reverse()}),[])
 const current=[4,5,6].map(day=>make(key,'v2','en',2,day));assert.ok(deterministicPatterns({results:[...old,...current]}).every(p=>p.from===current[0].measurementAt))
})
for(const dimensions of [[null],[undefined],[false],[0],['bad'],Array(1)])test('malformed dimensions remain raw attempts without crashing '+String(dimensions[0]),()=>{
 const good=make('hh-current-state','v2'),bad={...good,id:'bad',measurementAt:'2026-10-03T12:00:00Z',dimensions}
 const view=buildTestDynamicsGroups([good,bad]);assert.equal(view.attempts,2);assert.equal(view.groups[0].unverifiedCount,1);assert.deepEqual(view.groups[0].scales,[]);assert.equal(view.repeated,0)
})
for(const locale of ['en','ru'])test('trait and symptom classifications retain their distinct meaning '+locale,()=>{
 const trait=make('hh-socionics-32','v1',locale,3),t=gaugeModel(trait.dimensions[0],trait,locale)
 assert.equal(t.rangeReading.trait,true);assert.match(t.rangeReading.heading,/personality|личностн/i)
 const symptom=make('gad-7','v1',locale,2),s=gaugeModel(symptom.dimensions[0],symptom,locale)
 assert.equal(s.rangeReading.trait,false);assert.equal(s.rangeReading.kind,locale==='en'?'published':'descriptive');assert.equal(s.bands.length,locale==='en'?4:0)
 const tampered={...trait,contentHash:'bad'};assert.equal(gaugeModel(trait.dimensions[0],tampered,locale),null)
})
test('malformed sibling dimension preserves raw row but cannot create a verified trend',()=>{
 const valid=make('hh-screen-saturation','v2'),bad={...valid,id:'bad',measurementAt:'2026-10-04T12:00:00Z',dimensions:[valid.dimensions[0],null]}
 const view=buildTestDynamicsGroups([valid,bad]);assert.equal(view.attempts,2);assert.equal(view.groups[0].scales.length,1);assert.deepEqual(view.groups[0].scales[0].track,[]);assert.equal(view.groups[0].unverifiedCount,1);assert.equal(gaugeModel(view.groups[0].scales[0].gaugeDimension,bad),null)
})
test('unrelated instrument and other source locale do not block preserved historical series',()=>{
 const old=[1,2,3].map(day=>make('hh-screen-saturation','v1','en',day,day))
 const unrelated={...make('hh-money-pressure','v2','en',2,4),contentHash:'bad'}
 const foreign={...make('hh-screen-saturation','v2','ru',2,4),contentHash:'bad'}
 for(const extra of [unrelated,foreign])assert.ok(deterministicPatterns({results:[...old,extra]}).some(p=>p.instrumentKey==='hh-screen-saturation'))
})
