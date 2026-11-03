import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { streamsOf, threeRemedyLayoutFixture } from './report-premium-pagination-v5.test.mjs'

const origin='https://example.invalid'
const a4=(doc,locale='en')=>buildPrescriptionPdf(doc,locale,origin).toString('latin1')

test('individual remedy cards have distinct inset marks without repetitive micro-labels',()=>{
  const doc=threeRemedyLayoutFixture('en')
  const source=a4(doc)
  const core=streamsOf(Buffer.from(source,'latin1')).slice(0,2).join('\n')
  assert.equal((core.match(/\/RemedyPhoto\d+ Do Q/g)??[]).length,3,
    'all original source images remain in the signed two-page recommendation')
  assert.match(core,/\(1\. Avena Sativa 30\)/)
  assert.match(core,/\(2\. Phosphoricum Acidum 30\)/)
  assert.match(core,/\(3\. Nux Vomica 30\)/)
  assert.equal((core.match(/\(SELECTED REMEDY\) Tj ET/g)??[]).length,0,
    'the repeated all-caps micro-label is removed; titles carry the meaning')
  const signed=streamsOf(Buffer.from(source,'latin1')).findIndex(p=>p.includes('/Signature Do Q'))
  assert.equal(signed,1,'small card refinements must not move the signature to a third core page')
  assert.ok((core.match(/0\.40 0\.22 0\.32 rg [0-9.]+ [0-9.]+ 2\.5 [0-9.]+ re f/g)??[]).length>=3,
    'each image card has its own inset accent instead of a continuous table stripe')
  assert.doesNotMatch(source,/SYNTHETIC INTERNAL PRIVATE NEVER EXPORT/)
})

test('reading appendix uses clean typographic chapters and preserves library photographs',()=>{
  const doc=threeRemedyLayoutFixture('en')
  const pdf=buildPrescriptionPdf(doc,'en',origin)
  const all=streamsOf(pdf)
  const signedIndex=all.findIndex(x=>x.includes('/Signature Do Q'))
  assert.equal(signedIndex,1)
  const appendix=all.slice(signedIndex+1).join('\n')
  assert.match(appendix,/\/RemedyPhoto1 Do Q/,'original illustration reappears in the full source')
  assert.match(appendix,/\/F3 14\.4 Tf/,'appendix chapter uses large, editorial serif text')
  assert.match(appendix,/\/F4 12\.3 Tf/,'secondary source headings are legible')
  assert.doesNotMatch(appendix,/0\.961 0\.975 0\.968 rg/,
    'repetitive coloured full-width source section banners were removed')
  for(const marker of ['Avena Sativa','Phosphoricum Acidum','Nux Vomica'])
    assert.ok(appendix.includes(marker),'no selected source profile was dropped: '+marker)
})

test('mixed actual chapters and payment documents retain semantic differences',()=>{
  const mixed={
    ...threeRemedyLayoutFixture('en'),
    recommendationType:'mixed',
    items:[{
      displayName:'Avena Sativa',remedySlug:'avena-sativa',itemType:'homeopathy',
      potency:'30',remedyPath:'/en/homeopathy/remedies/avena-sativa',
    },{
      displayName:'Synthetic Bach Flower',itemType:'bach',
      remedyPath:'/en/academy/bach',
    }],
  }
  const pdf=a4(mixed)
  assert.match(pdf,/\(HOMEOPATHY\)/,'mixed report keeps source-type grouping')
  assert.match(pdf,/\(BACH ESSENCES\)/,'mixed report keeps Bach section')
  assert.match(pdf,/\/Signature Do Q/)
  const invoice=buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-20',
    dateOfService:'2026-10-20',service:'Synthetic service',amount:10000,
    currency:'CAD',paymentStatus:'unpaid',
  },'en',origin).toString('latin1')
  assert.match(invoice,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice,/\/RemedyPhoto\d+ Do Q/)
})
