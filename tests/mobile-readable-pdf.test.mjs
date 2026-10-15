import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionMobilePdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const base={
  patientName:'SYNTHETIC MOBILE CLIENT',
  dateIssued:'2026-10-13',
  recommendationType:'homeopathy',
  analysis:'Before: interest 3/10\nAfter session: interest 6/10\nTarget: 7.3/10 (plan, not measured)',
  additionalNotes:'SYNTHETIC CLIENT JOURNAL OBSERVATION',
  followUpDate:'2026-10-25',
  internalNotes:'PRIVATE-NOT-FOR-CLIENT',
  items:[{displayName:'Veratrum Album',remedySlug:'veratrum-album',
    remedyPath:'/en/homeopathy/remedies/veratrum-album'}],
}
const latin=pdf=>pdf.toString('latin1')
const pageCount=pdf=>(latin(pdf).match(/\/Type \/Page \/Parent/g)??[]).length

test('mobile PDF is actually narrow and uses readable large text rather than miniaturized A4',()=>{
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionMobilePdf(base,locale,'https://example.invalid')
    const source=latin(pdf)
    assert.match(source,/^%PDF-1\.7/)
    assert.match(source,/\/MediaBox \[0 0 390 780\]/)
    assert.match(source,/16\.5 Tf/,'body text is comfortably sized on mobile PDF')
    assert.match(source,/26 Tf/,'headings use real large vector type')
    assert.match(source,/SYNTHETIC MOBILE CLIENT/)
    assert.match(source,/SYNTHETIC CLIENT JOURNAL OBSERVATION/)
    assert.doesNotMatch(source,/PRIVATE-NOT-FOR-CLIENT/)
    assert.match(source,/\/Signature Do Q/)
    assert.match(source,/\/MobileRemedy0 Do Q/,'original approved library image is embedded')
    assert.ok(pageCount(pdf)>=3,'full source text flows over multiple readable pages')
  }
  assert.match(latin(buildPrescriptionPdf(base,'en','https://example.invalid')),
    /\/MediaBox \[0 0 595\.28 841\.89\]/,
    'regular A4 PDF remains untouched for printing and archiving')
})

test('long practitioner notes flow to as many pages as necessary with no loss',()=>{
  const extra=Array.from({length:64},(_,i)=>'MOBILE-SYNTHETIC-LINE-'+i+' observation with full wording').join('\n')
  const src=latin(buildPrescriptionMobilePdf({...base,additionalNotes:extra},'en','https://example.invalid'))
  assert.ok((src.match(/\/Type \/Page \/Parent/g)??[]).length>5)
  for(const marker of ['MOBILE-SYNTHETIC-LINE-0','MOBILE-SYNTHETIC-LINE-63'])
    assert.ok(src.includes(marker),'no practitioner note was clipped: '+marker)
  assert.equal((src.match(/\/Signature Do Q/g)??[]).length,1)
  assert.match(src,/\/MobileRemedy0 Do Q/)
})

test('phone preview uses one-column mobile PDF while downloads and invoices retain original A4',()=>{
  const route=readFileSync('app/api/prescriptions/[selector]/pdf/route.js','utf8')
  const reader=readFileSync('components/app/report-invitation-gate.jsx','utf8')
  const page=readFileSync('app/[locale]/prescriptions/[selector]/page.js','utf8')
  const css=readFileSync('components/consultation-report.css','utf8')
  assert.match(route,/preview\s*\?\s*buildPrescriptionMobilePdf/)
  assert.match(route,/:\s*buildPrescriptionPdf\(document, locale/)
  assert.match(route,/authorizePrescriptionRequest\(selector\)/)
  assert.match(route,/Cache-Control': 'private, no-store, max-age=0'/)
  assert.match(route,/inlinePreview \? 'inline' : 'attachment'/)
  assert.match(page,/preview=1/)
  assert.match(reader,/href=\{viewPdfHref\}/)
  assert.match(css,/font-size:18\.5px/)
  assert.match(css,/@media screen and \(max-width:700px\)/)
  assert.match(latin(buildPaymentPdf({
    patientName:'SYNTHETIC BILL',dateIssued:'2026-10-13',dateOfService:'2026-10-13',
    amount:10000,currency:'EUR',service:'Synthetic service',paymentStatus:'unpaid',
  },'en','https://example.invalid')),/\/MediaBox \[0 0 595\.28 841\.89\]/)
})
