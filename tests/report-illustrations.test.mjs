import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'
import { getRemedy } from '../data/remedies.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'

const origin='https://example.test'
const sample=(locale, extra={})=>({
  patientName:'SYNTHETIC REPORT CLIENT',
  dateIssued:'2026-10-14',
  recommendationType:'homeopathy',
  analysis:locale==='ru'
    ? 'Было: интерес к цели 3/10\nПосле сессии: интерес к цели 6/10\nЦель: планируемый уровень 7.3/10'
    : 'Before: goal interest 3/10\nAfter session: goal interest 6/10\nTarget: 7.3/10 is only a plan',
  additionalNotes:locale==='ru'?'Вести дневник наблюдений.':'Maintain a personal observation journal.',
  items:[{displayName:'Veratrum Album',remedySlug:'veratrum-album',itemType:'homeopathy',
    remedyPath:'/'+locale+'/homeopathy/remedies/veratrum-album'}],
  ...extra,
})

test('PDF prints approved lighthouse twice plus ocean and botanical vector graphics in both languages',()=>{
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.match(pdf,/^%PDF-1\.7/)
    assert.ok((pdf.match(/\/Lighthouse Do Q/g)??[]).length>=2,
      'cover includes brand lighthouse and a second illustrated ocean lighthouse')
    assert.match(pdf,/0\.924 0\.960 0\.964 rg/,'pale ocean cover is rendered')
    assert.match(pdf,/0\.82 0\.90 0\.91 rg/,'coastal illustration is rendered')
    assert.match(pdf,/0\.75 0\.85 0\.78 rg/,'botanical leaf vector art is rendered')
    assert.match(pdf,/\/RemedyPhoto1 Do Q/,'selected library image remains')
    assert.match(pdf,/\/Signature Do Q/,'approved practitioner signature remains')
    assert.ok(!pdf.includes('TARGET \\(PLAN\\)'), 'planned future goal never becomes third gauge')
    assert.match(pdf,/\/Type \/Page \/Parent/,'the PDF contains real A4 pages')
  }
})

test('the original complete remedy text stays at the END, after the signed summary',()=>{
  for(const locale of ['ru','en']){
    const remedy=getRemedy(locale,'veratrum-album')
    const blocks=remedyDescriptionBlocks(remedy.description).filter(block=>block.kind!=='space')
    const lastLine=remedy.description.trim().split(/\r?\n/).filter(Boolean).at(-1).trim()
    assert.equal(blocks.at(-1).text,lastLine,'complete source final line remains')
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.ok(pdf.indexOf('APPENDIX')>pdf.indexOf('/Signature Do Q') || locale==='ru',
      'English appendix follows signed report')
  }
})

test('additional long client notes paginate without losing signature, images or source',()=>{
  const notes=Array.from({length:90},(_,i)=>'SYNTHETIC-OBSERVATION-'+i+' complete client-authorized observation').join('\n')
  const pdf=buildPrescriptionPdf(sample('en',{additionalNotes:notes}),'en',origin).toString('latin1')
  assert.ok((pdf.match(/\/Type \/Page \/Parent/g)??[]).length>2)
  for(const marker of ['SYNTHETIC-OBSERVATION-0','SYNTHETIC-OBSERVATION-89'])
    assert.ok(pdf.includes(marker),marker+' survives pagination')
  assert.equal((pdf.match(/\/Signature Do Q/g)??[]).length,1)
  assert.match(pdf,/\/RemedyPhoto1 Do Q/)
})

test('web and print share lighthouse art, arrows, readable responsive layout',()=>{
  const css=readFileSync('components/consultation-report.css','utf8')
  const html=readFileSync('components/prescription-document.jsx','utf8')
  const generator=readFileSync('lib/prescriptions/pdf.js','utf8')
  for(const phrase of ['/document-assets/lighthouse.png','canonical-progress-item--after::before',
    "background-size:cover,105px 105px"])assert.ok(css.includes(phrase),phrase)
  assert.ok(css.includes('@media(max-width:680px)'))
  assert.ok(css.includes('@media print'))
  assert.ok(html.includes('fullSource'))
  assert.ok(html.includes("key: 'after'"))
  assert.ok(!html.includes("key: 'target'"))
  assert.match(generator,/drawReportHeroArtwork\(panelBottom, panelHeight\)/)
  assert.match(generator,/drawReportSprig/)
})

test('invoice and receipt retain separately approved neutral geometry',()=>{
  const pdf=buildPaymentPdf({
    patientName:'Synthetic Payer', dateIssued:'2026-10-14',
    dateOfService:'2026-10-14',service:'Synthetic session',
    currency:'EUR',amount:15000,paymentStatus:'unpaid',
  },'en',origin).toString('latin1')
  assert.match(pdf,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.equal((pdf.match(/\/Lighthouse Do Q/g)??[]).length,1)
  assert.doesNotMatch(pdf,/0\.924 0\.960 0\.964 rg/)
  assert.doesNotMatch(pdf,/SELF-RATED PROGRESS/)
})
