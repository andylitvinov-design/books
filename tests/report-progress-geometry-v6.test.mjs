import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

// Raw PDF streams are intentional here: EN labels use the embedded Latin font.
// The two numeric observations are saved test data, not an inferred outcome.
const sample={
  patientName:'SYNTHETIC LAYOUT SUBJECT',
  dateIssued:'2026-10-20',
  recommendationType:'homeopathy',
  progressBefore:4.5,
  progressAfter:5.5,
  analysis:'The author described an ordinary stressful day.\nNo clinical diagnosis is presented.',
  recommendationsText:'A complete authored sentence is retained on the paper.',
  items:[],
  internalNotes:'PRIVATE SYNTHETIC INTERNAL NOTE NEVER EXPORT',
}
const a4=doc=>buildPrescriptionPdf(doc,'en','https://example.invalid').toString('latin1')
function baseline(source,label){
  const matches=[...source.matchAll(new RegExp(
    '1 0 0 1 [0-9.]+ ([0-9.]+) Tm \\('+label+'\\) Tj ET','g'))]
  assert.equal(matches.length,1,'expected one visible '+label+' on the A4 report')
  return Number(matches[0][1])
}

test('A4 before/after labels are fully within the progress panel and do not touch the analysis heading',()=>{
  const source=a4(sample)
  const first=baseline(source,'START')
  const second=baseline(source,'END')
  const analysis=baseline(source,'STATE ANALYSIS')
  const panel=source.match(/0\.965 0\.980 0\.969 rg 68 ([0-9.]+) 459\.28 120 re f/)
  assert.ok(panel,'the progress panel has measured height, not a cropped strip')
  const bottom=Number(panel[1])
  assert.equal(first,second,'both factual progress labels share a baseline')
  assert.ok(first>=bottom+7,'captions stay inside the shaded dashboard')
  assert.ok(first<=bottom+22,'captions are beneath both rings rather than through them')
  // Analysis band reaches 17pt above its text baseline. Leave at least 6pt
  // extra space instead of allowing the band to paint over START/END.
  assert.ok(first>=analysis+24,
    'progress labels must not overlap the next full-width section band')
  assert.match(source,/\(4\.5\/10\)/)
  assert.match(source,/\(5\.5\/10\)/)
  assert.doesNotMatch(source,/\(TARGET\)/)
  assert.doesNotMatch(source,/PRIVATE SYNTHETIC INTERNAL NOTE NEVER EXPORT/)
})

test('A4 footnote uses 8pt readable text without changing invoice/receipt typography',()=>{
  const report=a4(sample)
  assert.match(report,/\/F1 8 Tf 1 0 0 1 68 65 Tm/,
    'report disclaimer prints with consistent baseline and readable size')
  const invoice=buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-20',dateOfService:'2026-10-20',
    service:'Synthetic consultation',amount:10000,currency:'EUR',paymentStatus:'unpaid'
  },'en').toString('latin1')
  assert.doesNotMatch(invoice,/0\.965 0\.980 0\.969 rg 68 [0-9.]+ 459\.28 120 re f/)
  assert.match(invoice,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
})

test('absent actual paired measurements produce no progress dashboard or invented numeric ratings',()=>{
  const report=a4({...sample,progressBefore:null,progressAfter:null})
  assert.doesNotMatch(report,/\(START\) Tj/)
  assert.doesNotMatch(report,/\(END\) Tj/)
  assert.doesNotMatch(report,/0\.965 0\.980 0\.969 rg 68 [0-9.]+ 459\.28 120 re f/)
})
