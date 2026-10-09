import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { createProfileSnapshot } from '../lib/profile/history.js'
import { buildClientReport } from '../lib/profile/client-report.js'
import { rasterPagesToPdf } from '../lib/profile/client-report-pdf.js'

const accountId='10000000-0000-4000-8000-000000000001'
const valueFor=(question,definition)=>question.min ?? definition.answerScale?.min ?? 0
function fakeResult(definition,date='2026-10-08T12:00:00.000Z',override={}) {
 const answers=Object.fromEntries(definition.questions.map(q=>[q.id, valueFor(q,definition)]))
 return {
  id:randomUUID(),accountId,measurementAt:date,
  ...scoreAssessment(definition,{...answers,...override}),
 }
}
test('complete PDF model includes every runnable public assessment and every stored profile scale',()=>{
 const available=MONITORING_CATALOG.filter(item=>item.startable&&item.rightsStatus==='cleared')
 assert.ok(available.length>=70,'published catalog must keep its cleared executable assessments')
 const all=available.map((item,index)=>{
  const lang=item.instrumentLocale==='dynamic'?'en':item.instrumentLocale
  const def=getAssessmentDefinition(item.key,item.version,lang)
  return fakeResult(def,'2026-10-08T12:00:00.000Z')
 })
 const snapshot=createProfileSnapshot({
  id:randomUUID(),accountId,generatedResult:all.at(-1),
  carriedResults:all.slice(0,-1),createdAt:'2026-10-09T12:00:00.000Z',
 })
 const model=buildClientReport({account:{displayName:'Synthetic Client'},results:all,snapshot,locale:'en',now:new Date('2026-10-09T12:00:00.000Z')})
 assert.equal(model.counts.tests,available.length)
 assert.equal(model.counts.attempts,available.length)
 assert.equal(model.tests.length,available.length)
 assert.equal(model.latestScales.length,snapshot.dimensions.length)
 assert.equal(model.counts.scales,snapshot.dimensions.length)
 for(const testResult of model.tests){
  assert.ok(testResult.title)
  assert.ok(testResult.description)
  assert.ok(testResult.conclusion.length>40)
  assert.ok(testResult.dimensions.length>0)
  assert.equal(testResult.attempts.length,1)
  assert.ok(testResult.dimensions.every(d=>Number.isFinite(d.value)&&Number.isFinite(d.min)&&Number.isFinite(d.max)))
 }
 assert.ok(model.recommendations.length>0)
 assert.match(model.disclaimer,/not a diagnosis/i)
})
test('repeat measurements preserve all attempts but latest scale value in profile',()=>{
 const def=getAssessmentDefinition('hh-current-state','v2','en')
 const before=fakeResult(def,'2026-10-07T12:00:00.000Z')
 const different=Object.fromEntries(def.questions.map(q=>[q.id,valueFor(q,def)]))
 const key=def.questions.find(q=>(q.max??def.answerScale?.max) > valueFor(q,def))?.id
 assert.ok(key)
 different[key]=different[key]+1
 const after=fakeResult(def,'2026-10-08T12:00:00.000Z',different)
 const snapshot=createProfileSnapshot({id:randomUUID(),accountId,generatedResult:after,carriedResults:[before],createdAt:'2026-10-09T12:00:00.000Z'})
 const report=buildClientReport({results:[after,before],snapshot,locale:'ru',now:new Date('2026-10-09T12:00:00.000Z')})
 assert.equal(report.counts.tests,1)
 assert.equal(report.counts.attempts,2)
 assert.equal(report.tests[0].attempts.length,2)
 assert.equal(report.tests[0].dimensions.length,after.dimensions.length)
 assert.equal(report.latestScales.length,after.dimensions.length)
 assert.equal(report.latestScales.find(x=>x.key===key)?.value,different[key])
 assert.match(report.tests[0].conclusion,/измен/)
 assert.match(report.disclaimer,/не является диагнозом/)
})
test('PDF output is a genuine A4 PDF with all pages and no network requirements',async()=>{
 // Minimal JPEG header/footer is sufficient to validate the PDF writer's
 // object streams and exact cross-reference offsets without a browser canvas.
 const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9])
 const blob=rasterPagesToPdf([jpeg,jpeg])
 assert.equal(blob.type,'application/pdf')
 const bytes=new Uint8Array(await blob.arrayBuffer())
 const text=new TextDecoder('latin1').decode(bytes)
 assert.ok(text.startsWith('%PDF-1.4'))
 assert.match(text,/\/Type \/Catalog/)
 assert.match(text,/\/Count 2/)
 assert.match(text,/\/MediaBox \[0 0 595 842\]/)
 assert.match(text,/\/Filter \/DCTDecode/)
 assert.match(text,/startxref\n[0-9]+\n%%EOF/)
 assert.throws(()=>rasterPagesToPdf([]),/INVALID_PAGE_COUNT/)
 assert.throws(()=>rasterPagesToPdf([Uint8Array.from([1,2,3,4])]),/EXPECTED_JPEG/)
})
