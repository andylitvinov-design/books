import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin='https://example.invalid'
const synthetic={
  patientName:'SYNTHETIC EDITORIAL CLIENT',
  dateIssued:'2026-10-20',
  recommendationType:'homeopathy',
  progressBefore:3,
  progressAfter:6,
  analysis:'Before: goal interest 3/10\nAfter session: goal interest 6/10\nThe complete neutral source explanation must stay readable.',
  recommendationsText:'A source-preserving editorial paragraph with no invented personal information.',
  items:['avena-sativa','phosphoricum-acidum','nux-vomica'].map(slug=>({
    displayName:slug==='avena-sativa'?'Avena Sativa':
      slug==='phosphoricum-acidum'?'Phosphoricum Acidum':'Nux Vomica',
    remedySlug:slug, potency:'30',granules:'8',timesPerDay:'2',
    itemType:'homeopathy',
    remedyPath:'/en/homeopathy/remedies/'+slug,
  })),
  additionalNotes:'An original synthetic aftercare paragraph.',
  internalNotes:'PRIVATE SYNTHETIC NOTES MUST STAY PRIVATE',
}
const latin=pdf=>pdf.toString('latin1')
function streams(pdf){
  const body=latin(pdf)
  return [...body.matchAll(/\/Type \/Page\b[^\r\n]*?\/Contents (\d+) 0 R/g)].map(m=>{
    const object=body.match(new RegExp('\\n'+m[1]+' 0 obj\\n<< /Length (\\d+) >>\\nstream\\n'))
    assert.ok(object,'every A4 page has a content stream')
    const begin=object.index+object[0].length
    return body.slice(begin,begin+Number(object[1]))
  })
}

test('premium report shows remedy names without three repetitive tiny labels',()=>{
  for(const locale of ['ru','en']){
    const doc={...synthetic,items:synthetic.items.map(item=>({
      ...item,remedyPath:'/'+locale+'/homeopathy/remedies/'+item.remedySlug,
    }))}
    const pdf=buildPrescriptionPdf(doc,locale,origin)
    const rendered=latin(pdf)
    assert.ok(streams(pdf).length>=3,'complete library descriptions still follow the signed report')
    for(const marker of ['Avena Sativa','Phosphoricum Acidum','Nux Vomica'])
      assert.match(rendered,new RegExp(marker),'original remedy names remain visible')
    assert.doesNotMatch(rendered,/\(SELECTED REMEDY\) Tj ET/,
      'the chapter heading already identifies each recommended item')
    assert.doesNotMatch(rendered,/PRIVATE SYNTHETIC NOTES MUST STAY PRIVATE/)
    assert.equal((rendered.match(/\/Signature Do Q/g)??[]).length,1)
    assert.ok((rendered.match(/\/RemedyPhoto\d+ Do Q/g)??[]).length>=6,
      'original artwork occurs in recommendation and full appendix')
  }
})

test('signature stays in core pages after independent cards gain a measured white gutter',()=>{
  for(const locale of ['ru','en']){
    const doc={...synthetic,items:synthetic.items.map(item=>({
      ...item,remedyPath:'/'+locale+'/homeopathy/remedies/'+item.remedySlug,
    }))}
    const pages=streams(buildPrescriptionPdf(doc,locale,origin))
    const signed=pages.findIndex(page=>page.includes('/Signature Do Q'))
    assert.ok(signed>=0 && signed<=1,
      locale+': normal three-remedy report must not create a signature-only page')
    assert.ok(pages.slice(signed+1).some(page=>page.includes('/RemedyPhoto')),
      'the educational original library remains after the signed summary')
  }
})

test('appendix photo has a hairline boundary and subheadings are editorials, not repeated tinted UI boxes',()=>{
  const source=readFileSync('lib/prescriptions/pdf.js','utf8')
  assert.match(source,/y=cardBottom-8/,'independent cards keep a measured 8pt gutter without moving the signature to a third core page')
  assert.match(source,/frameX,frameBottom,frameWidth,frameHeight,'re S Q'/,
    'each uncropped source picture receives a light neutral frame')
  assert.match(source,/Elegant source sections:/)
  assert.doesNotMatch(source,/drawReportSprig\(A4\.left \+ A4\.contentWidth - 12, 745, 0\.42\)/,
    'the library chapter header has no repeated ornamental leaf')
  const pdf=latin(buildPrescriptionPdf(synthetic,'en',origin))
  assert.match(pdf,/\/RemedyPhoto1 Do Q/)
  assert.match(pdf,/\/Signature Do Q/)
})

test('invoices stay on their original approved image and neutral palette',()=>{
  const invoice=latin(buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-20',dateOfService:'2026-10-20',
    service:'Synthetic consultation',paymentStatus:'unpaid',amount:15000,currency:'EUR',
  },'en',origin))
  assert.match(invoice,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice,/\(SELECTED REMEDIES\)/)
})
