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
    assert.match(source,/18\.5 Tf/,'mobile PDF—not only HTML—has 18.5pt body text')
    assert.match(source,/28 Tf/,'mobile PDF has full-size 28pt title')
    assert.match(source,/SYNTHETIC MOBILE CLIENT/)
    assert.match(source,/JOURNAL/)
    assert.match(source,/OBSERVATION/)
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


test('old saved owner reports and Google Cabinet expose a true large-PDF button',()=>{
  const owner=readFileSync('app/admin/documents/[id]/view/page.js','utf8')
  const ownerActions=readFileSync('components/admin-document-panels.jsx','utf8')
  const oldRoute=readFileSync('app/admin/api/documents/[id]/pdf/route.js','utf8')
  const cabinetPage=readFileSync('app/[locale]/app/document-view/[id]/page.jsx','utf8')
  const cabinetApi=readFileSync('app/api/app/[...path]/route.js','utf8')
  const consultationActions=readFileSync('components/consultation-document-actions.jsx','utf8')
  assert.match(owner,/pdf \+ '&preview=1'/)
  assert.match(owner,/Читать PDF крупно/)
  assert.match(ownerActions,/saved-document-preview-pdf/)
  assert.match(ownerActions,/preview=1/)
  assert.match(oldRoute,/buildPrescriptionMobilePdf/)
  assert.match(oldRoute,/const mobile = !payment && preview/)
  assert.match(oldRoute,/requireAdminRequest\(\)/)
  assert.match(oldRoute,/private, no-store/)
  assert.match(cabinetPage,/pdfUrl \+ '&preview=1'/)
  assert.match(cabinetPage,/Просмотреть PDF крупно/)
  assert.match(cabinetApi,/buildPrescriptionMobilePdf/)
  assert.match(cabinetApi,/mobile \? buildPrescriptionMobilePdf : buildPrescriptionPdf/)
  assert.match(cabinetApi,/readSavedDocument\(config, store, actor, path\[1\], locale\)/)
  assert.match(cabinetApi,/preview \? 'inline' : 'attachment'/)
  assert.match(consultationActions,/Открыть PDF крупным текстом/)
  assert.match(owner,/Скачать A4/,'A4 remains as a separate archival option')
})

test('mobile PDF preserves its actual sources at large sizes while invoices stay A4',()=>{
  const mobile=latin(buildPrescriptionMobilePdf(base,'en','https://example.invalid'))
  assert.match(mobile,/\/MediaBox \[0 0 390 780\]/)
  assert.match(mobile,/18\.5 Tf/)
  assert.match(mobile,/21 Tf/)
  assert.match(mobile,/28 Tf/)
  assert.match(mobile,/\/Signature Do Q/)
  assert.match(mobile,/\/MobileRemedy0 Do Q/)
  assert.doesNotMatch(mobile,/PRIVATE-NOT-FOR-CLIENT/)
  const paper=latin(buildPrescriptionPdf(base,'en','https://example.invalid'))
  assert.match(paper,/\/MediaBox \[0 0 595\.28 841\.89\]/)
})
