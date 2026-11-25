import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin='https://example.invalid'
const fixture={
  patientName:'SYNTHETIC EDITORIAL CLIENT',
  dateIssued:'2026-10-20',
  recommendationType:'homeopathy',
  progressBefore:4.5,
  progressAfter:5.5,
  analysis:'The practitioner recorded a self-rating before and after consultation.',
  recommendationsText:'Practitioner-authored observations are preserved verbatim.',
  items:[{
    displayName:'Veratrum Album',remedySlug:'veratrum-album',
    remedyPath:'/en/homeopathy/remedies/veratrum-album',
  }],
  additionalNotes:'Synthetic notes only; no private client data.',
  internalNotes:'PRIVATE SYNTHETIC NOTE NEVER EXPORT',
}
const build=(document,locale='en')=>buildPrescriptionPdf(document,locale,origin).toString('latin1')
const pages=source=>(source.match(/\/Type \/Page \/Parent/g)??[]).length

test('approved premium A4 art direction has warm ivory, burgundy accents and adaptive chapters',()=>{
  const pdf=build(fixture)
  assert.match(pdf,/^%PDF-1\.7/)
  assert.match(pdf,/0\.40 0\.22 0\.32 rg/,'visible warm burgundy heading accents')
  assert.match(pdf,/0\.986 0\.973 0\.953 rg/,'matched client and date cards use warm ivory')
  assert.match(pdf,/0\.964 0\.980 0\.976 rg/,'calm report section backgrounds')
  assert.match(pdf,/0\.959 0\.976 0\.975 rg/,'analysis section is subtly distinct')
  for(const numeral of ['01','02','03','04'])assert.match(pdf,
    new RegExp('\\('+numeral+'\\) Tj ET'),numeral+': adaptive editorial chapter exists')
  assert.match(pdf,/\/RemedyPhoto1 Do Q/)
  assert.match(pdf,/\/Signature Do Q/)
  assert.match(pdf,/\/URI \(https:\/\/example\.invalid\/en\/homeopathy\/remedies\/veratrum-album\)/)
  assert.doesNotMatch(pdf,/PRIVATE SYNTHETIC NOTE NEVER EXPORT/)
  assert.doesNotMatch(pdf,/\(TARGET\)/)
  assert.ok(pages(pdf)>=2,'the original complete remedy library appendix is still printed')
})

test('missing sections do not create numbering gaps or introduce health information',()=>{
  const onlyNotes=build({...fixture,
    analysis:'',recommendationsText:'',progressBefore:null,progressAfter:null,items:[],
  })
  assert.match(onlyNotes,/\(01\) Tj ET/,'first actual section is numbered 01')
  assert.doesNotMatch(onlyNotes,/\(02\) Tj ET/,'no phantom recommendation chapters')
  assert.doesNotMatch(onlyNotes,/\(START\) Tj ET/,'no invented before score')
  assert.doesNotMatch(onlyNotes,/\(END\) Tj ET/,'no invented after score')
  assert.match(onlyNotes,/\/Signature Do Q/)
})

test('invoice keeps its approved neutral letterhead rather than client report chapters',()=>{
  const invoice=buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-20',
    dateOfService:'2026-10-20',service:'Synthetic consultation',
    amount:10000,currency:'EUR',paymentStatus:'unpaid',
  },'en',origin).toString('latin1')
  assert.match(invoice,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice,/0\.40 0\.22 0\.32 rg/)
  assert.doesNotMatch(invoice,/\(01\) Tj ET/)
})
