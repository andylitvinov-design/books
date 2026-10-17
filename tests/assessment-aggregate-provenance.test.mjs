import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { exactInterpretationDefinition } from '../lib/assessments/interpretation-context.js'
import { verifiedHistoryResult, verifiedHistoryView } from '../lib/assessments/verified-history.js'
import { resultChangeSummary, latestScoreObservation, nextPersonalRecommendation } from '../lib/assessments/personal-guidance.js'
import { buildProfileSummary } from '../lib/profile/summary.js'
import { buildClientReport } from '../lib/profile/client-report.js'
import { generateClientPdf } from '../lib/profile/client-report-pdf.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
const accountId = '10000000-0000-4000-8000-000000000001'
const now = new Date('2026-10-16T12:00:00Z')
function result(key='cbi-work', day=1, edge='min') {
  const def = getAssessmentDefinition(key, key==='hh-current-state'?'v2':'v1', 'en')
  return {id:randomUUID(),accountId,measurementAt:`2026-10-${String(day).padStart(2,'0')}T12:00:00Z`,
    ...scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q[edge]??def.answerScale[edge]])),syntheticTraumaContext(def))}
}
const snapshot = (...records) => ({accountId,dimensions:records.flatMap(r=>r.dimensions.map(d=>({...d,sourceResultId:r.id,sourceDefinitionId:r.definitionId,measurementAt:r.measurementAt,instrumentLocale:r.instrumentLocale})))})
const offGrid = r => ({...r,dimensions:r.dimensions.map((d,i)=>i?d:{...d,value:14.28})})

test('all frozen genuine scorer outputs retain history eligibility, including specialized instruments',()=>{
  for(const def of ASSESSMENT_DEFINITIONS) for(const edge of ['min','max']) {
    const scored=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q[edge]??def.answerScale?.[edge]])),syntheticTraumaContext(def))
    assert.equal(verifiedHistoryResult(scored),true,def.id+'/'+edge)
  }
})
for(const locale of ['en','ru']) {
  test(`rejected latest blocks older current/profile/advice while preserving all raw attempts (${locale})`,()=>{
    const old=result('cbi-work',1),middle=result('cbi-work',3,'max'),latest=offGrid(result('cbi-work',16))
    for(const snap of [snapshot(latest),snapshot(middle),snapshot(old)]) {
      const records=[old,middle,latest],saved=JSON.stringify({records,snap})
      const report=buildClientReport({results:records,snapshot:snap,locale,now})
      assert.equal(report.tests.length,1);assert.equal(report.counts.attempts,3)
      assert.equal(report.tests[0].attempts.length,3)
      assert.equal(report.tests[0].dimensions[0].value,14.28)
      assert.equal(report.tests[0].dimensions[0].change,null)
      assert.equal(report.latestScales.length,0)
      assert.equal(report.tests[0].interpretation.verified,false)
      assert.ok(report.verificationWarnings.length)
      assert.equal(latestScoreObservation(records,locale),'')
      assert.equal(nextPersonalRecommendation({results:records,snapshot:snap,locale,now:now.getTime()}).kind,'verify')
      assert.doesNotMatch(report.recommendations.join(' '),/comparable check-ins|сопоставимых прохождениях|first result|Первый результат/)
      assert.equal(JSON.stringify({records,snap}),saved)
    }
  })
  test(`rejected prior is skipped; genuine current and other verified instruments retain comparisons (${locale})`,()=>{
    const old=result(),bad=offGrid(result('cbi-work',8)),current=result('cbi-work',16,'max')
    const records=[old,bad,current],before=JSON.stringify(records)
    const change=resultChangeSummary(current,records)
    assert.equal(change.previous.id,old.id)
    assert.equal(change.changes[0].from,old.dimensions[0].value)
    assert.equal(change.changes[0].to,current.dimensions[0].value)
    const pure=buildClientReport({results:[old,current],snapshot:snapshot(current),locale,now})
    const mixed=buildClientReport({results:records,snapshot:snapshot(current),locale,now})
    assert.deepEqual(mixed.latestScales,pure.latestScales)
    assert.deepEqual(mixed.tests[0].dimensions,pure.tests[0].dimensions)
    assert.equal(mixed.tests[0].conclusion,pure.tests[0].conclusion)
    assert.equal(mixed.tests[0].attempts[1].verified,false)
    assert.equal(mixed.tests[0].attempts[1].scales[0].value,14.28)
    const otherOld=result('hh-current-state',2),otherNow=result('hh-current-state',15,'max')
    const blocked=offGrid(result('cbi-work',16))
    const all=[old,blocked,otherOld,otherNow]
    const report=buildClientReport({results:all,snapshot:snapshot(blocked,otherNow),locale,now})
    assert.equal(report.latestScales.length,otherNow.dimensions.length)
    assert.ok(report.latestScales.every(d=>d.source===otherNow.definitionId))
    assert.ok(latestScoreObservation(all,locale))
    assert.ok(!report.recommendations.join(' ').includes('14.28'))
    assert.equal(JSON.stringify(records),before)
  })
  test(`PDF warning precedes aggregate recommendations and raw rejected values remain available (${locale})`,async()=>{
    const prior=result(),latest=offGrid(result('cbi-work',16))
    const report=buildClientReport({results:[prior,latest],snapshot:snapshot(latest),locale,now})
    const printed=[],previous=globalThis.document
    const ctx={beginPath(){},rect(){},roundRect(){},fill(){},measureText(v){return{width:String(v).length*10}},fillText(v){printed.push(String(v))}}
    globalThis.document={createElement(){return{getContext:()=>ctx,toDataURL:()=>'data:image/jpeg;base64,/9j/2Q=='}}}
    try {
      assert.equal((await generateClientPdf(report)).type,'application/pdf')
      const output=printed.join(' ').replace(/\s+/g,' '),warning=report.verificationWarnings[0]
      assert.ok(output.includes(warning))
      assert.ok(output.indexOf(warning)<output.indexOf(locale==='ru'?'Рекомендации':'Personal next steps'))
      assert.ok(output.includes('14.28'));assert.ok(output.includes('14.29'))
      assert.doesNotMatch(output,/moved from 14.29 to 14.28|изменился с 14.29 на 14.28/)
    } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
  })
}
test('snapshot rows require exact current source and dimension values; distinct shared keys remain separate',()=>{
  const current=result('hh-current-state',16),old=result('hh-current-state',1)
  const valid=snapshot(current)
  assert.equal(buildProfileSummary({snapshot:valid,results:[old,current]}).rows.length,current.dimensions.length)
  for(const mutation of [{value:99},{sourceResultId:'unknown'},{sourceDefinitionId:'unknown'},{measurementAt:old.measurementAt},{instrumentLocale:'ru'}]) {
    const modified={...valid,dimensions:valid.dimensions.map((d,i)=>i?d:{...d,...mutation})}
    const summary=buildProfileSummary({snapshot:modified,results:[old,current]})
    assert.equal(summary.rows.length,current.dimensions.length-1);assert.equal(summary.withheldRows,1)
  }
  assert.equal(buildProfileSummary({snapshot:snapshot(old),results:[old,current]}).rows.length,0)
})
test('null, sparse and empty containers fail closed without repairing numbers or hiding raw attempts',()=>{
  const genuine=result(),later=result('cbi-work',16)
  for(const dimensions of [null,[],[null],new Array(1),[undefined],['bad']]) {
    const malformed={...later,dimensions},copy=structuredClone(malformed)
    assert.equal(verifiedHistoryResult(malformed),false)
    assert.equal(exactInterpretationDefinition(malformed),null)
    assert.equal(verifiedHistoryView([genuine,malformed]).eligible.length,0)
    const report=buildClientReport({results:[genuine,malformed],snapshot:snapshot(genuine),now})
    assert.equal(report.counts.attempts,2);assert.equal(report.tests[0].attempts.length,2)
    assert.equal(report.tests[0].interpretation.verified,false)
    assert.equal(report.latestScales.length,0)
    assert.deepEqual(malformed,copy)
  }
})
test('rejected ASRS, trauma and Bach remain neutral raw history instead of acquiring generic confidence',()=>{
  for(const key of ['asrs-6','pcl-5','itq-adult','hh-bach-flower-profile']) {
    const good=result(key),bad={...result(key,16),contentHash:'rejected'}
    const report=buildClientReport({results:[good,bad],snapshot:snapshot(bad),now})
    assert.equal(report.counts.attempts,2,key)
    assert.equal(report.tests[0].interpretation.verified,false,key)
    assert.equal(report.tests[0].dimensions.length,bad.dimensions.length,key)
    assert.deepEqual(report.tests[0].dimensions.map(d=>d.value),bad.dimensions.map(d=>d.value))
    assert.equal(report.latestScales.length,0,key)
    assert.ok(report.tests[0].interpretation.sections.every(s=>!s.steps.length),key)
  }
})
test('missing or changed claimed instrument keys retain raw rows and block known-family fallback',()=>{
  const old=result(),latest=result('cbi-work',16)
  for(const definitionKey of [undefined,'','gad-7']) {
    const damaged={...latest,definitionKey},report=buildClientReport({results:[old,damaged],snapshot:snapshot(old),now})
    assert.equal(report.counts.attempts,2)
    assert.equal(report.tests[0].attempts.length,2)
    assert.equal(report.latestScales.length,0)
    assert.ok(report.verificationWarnings.length)
    assert.equal(verifiedHistoryView([old,damaged]).eligible.length,0)
  }
})
test('missing values are not coerced to zero and rejected numeric precision is retained in the PDF',async()=>{
  const genuine=result('cbi-work',16),printed=[],previous=globalThis.document
  const ctx={beginPath(){},rect(){},roundRect(){},fill(){},measureText(v){return{width:String(v).length*10}},fillText(v){printed.push(String(v))}}
  globalThis.document={createElement(){return{getContext:()=>ctx,toDataURL:()=>'data:image/jpeg;base64,/9j/2Q=='}}}
  try {
    for(const value of [null,false,'',14.29000001]) {
      const damaged={...genuine,dimensions:[{...genuine.dimensions[0],value}]}
      const report=buildClientReport({results:[damaged],now})
      assert.equal(report.tests[0].dimensions[0].value,value)
      assert.equal(report.tests[0].interpretation.verified,false)
      printed.length=0;await generateClientPdf(report)
      const output=printed.join(' ')
      if(typeof value==='number') {
        assert.ok(output.includes('14.29000001 / 100'))
        assert.ok(report.tests[0].dimensions[0].note.includes('14.29000001'))
      } else {
        assert.ok(output.includes('— / 100'))
        assert.ok(report.tests[0].dimensions[0].note.includes('— / 100'))
        assert.ok(!output.includes('0 / 100'))
      }
    }
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous}
})
test('a stable latest score does not resurrect an older change as the current observation',()=>{
  const first=result('cbi-work',1),changed=result('cbi-work',3,'max'),stable=result('cbi-work',16,'max')
  assert.equal(latestScoreObservation([first,changed,stable]),'')
})
test('unrelated null records cannot crash profile comparisons; missing ownership does not promote older scores',()=>{
  const old=result(),current=result('cbi-work',16,'max')
  assert.equal(buildProfileSummary({snapshot:snapshot(current),results:[null,old,current]}).rows.length,1)
  const anonymousBad={...offGrid(current),accountId:undefined}
  const report=buildClientReport({results:[old,anonymousBad],snapshot:snapshot(old),now})
  assert.equal(report.latestScales.length,0)
  assert.ok(report.verificationWarnings.length)
  assert.equal(resultChangeSummary({...current,accountId:undefined},[old]).previous,null)
})
test('snapshot-only saved data requests verification rather than claiming a first baseline',()=>{
  const retained=snapshot(result())
  const recommendation=nextPersonalRecommendation({results:[],snapshot:retained,now:now.getTime()})
  assert.equal(recommendation.kind,'verify')
  assert.doesNotMatch(recommendation.reason,/first result|first baseline/i)
})
