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

test('PDF keeps one clean lighthouse masthead plus vector sea and botanical artwork in both languages',()=>{
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.match(pdf,/^%PDF-1\.7/)
    assert.equal((pdf.match(/\/Lighthouse Do Q/g)??[]).length,1,
      'brand masthead keeps the approved photograph without a second white-backed hero copy')
    assert.ok(/\/CoastalPhoto Do Q/.test(pdf) || /0\.85 0\.91 0\.90 rg/.test(pdf),
      'approved coastal cover or safe vector fallback exists')
    assert.ok(/\/CoastalPhoto Do Q/.test(pdf) || /0\.51 0\.72 0\.72 RG/.test(pdf),
      'sea is rendered from approved art, without a second lighthouse rectangle')
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
  assert.match(generator,/drawReportHeroArtwork\(579, 130\)/)
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


test('editorial A4 cover enlarges the identity art and keeps exactly two actual ratings',()=>{
  const pdf=buildPrescriptionPdf(sample('en'),'en',origin).toString('latin1')
  assert.match(readFileSync('lib/prescriptions/pdf.js','utf8'),/PEOPLE  ·  INSIGHT  ·  HARMONY/,
    'running identity includes the brand motto')
  assert.match(pdf,/A GENTLER PATH TO INNER BALANCE/,'approved editorial subtitle is printed')
  const lighthousePlacements=[...pdf.matchAll(/q (\d+(?:\.\d+)?) 0 0 [\d.]+ [\d.]+ [\d.]+ cm \/Lighthouse Do Q/g)]
  assert.equal(lighthousePlacements.length,1,
    'the graphic hero is scalable vector art rather than a second raster lighthouse')
  assert.equal(Number(lighthousePlacements[0][1]),82,
    'approved lighthouse stays in the letterhead')
  assert.match(pdf,/\(START\)/)
  assert.match(pdf,/\(END\)/)
  assert.doesNotMatch(pdf,/\(TARGET\)/,'a future goal must not become a third reading')
  assert.match(pdf,/\/RemedyPhoto1 Do Q/,'approved original library photo remains present')
  assert.match(pdf,/\/Signature Do Q/,'signed core report is preserved')
})

test('wide white signature is a report-body closing, not the legal footer (RU and EN)',()=>{
  const generator=readFileSync('lib/prescriptions/pdf.js','utf8')
  const component=readFileSync('components/document-letterhead.jsx','utf8')
  const css=readFileSync('components/consultation-report.css','utf8')
  assert.match(generator,/const signatureWidth = 207/)
  assert.match(generator,/const signatureHeight = 81\.5/)
  assert.match(generator,/if \(y < 190\) startPage\(\)/,
    'signature uses a measured footer-safe gate, avoiding an orphan signed sheet')
  assert.doesNotMatch(generator,/fill\(A4\.left, top - 63, A4\.contentWidth, 63, palette\.paper\)/,
    'the former small tinted signature plaque was removed')
  assert.match(component,/<section className="canonical-signature canonical-signature--compact canonical-signature--wide"/)
  assert.match(component,/<time dateTime=\{date\}>\{date\}<\/time>/)
  assert.match(css,/\.canonical-document--editorial \.canonical-signature--wide\s*\{/)
  assert.match(css,/background:#fff;/)
  assert.match(css,/@media print \{/)
  for (const locale of ['en','ru']){
    const pdf=buildPrescriptionPdf(sample(locale,{
      followUpDate:'2026-10-25',
      internalNotes:'SENSITIVE-INTERNAL-NEVER-EXPORT',
    }),locale,origin).toString('latin1')
    assert.match(pdf,/q 207 0 0 81\.5 83 [\d.]+ cm \/Signature Do Q/,
      locale+': exact wide approved signature is embedded')
    assert.equal((pdf.match(/\/Signature Do Q/g)??[]).length,1)
    assert.doesNotMatch(pdf,/SENSITIVE-INTERNAL-NEVER-EXPORT/)
    assert.match(pdf,/\/RemedyPhoto1 Do Q/)
  }
  const invoice=buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-14',
    dateOfService:'2026-10-14',service:'Synthetic session',
    currency:'EUR',amount:10000,paymentStatus:'unpaid',
  },'en',origin).toString('latin1')
  assert.doesNotMatch(invoice,/q 207 0 0 81\.5 83 /,
    'the approved invoice signature remains unchanged')
})


test('mockup-aligned first-page composition uses two measured gauges, split client cards and side motif',()=>{
  const generator=readFileSync('lib/prescriptions/pdf.js','utf8')
  const reader=readFileSync('components/prescription-document.jsx','utf8')
  const css=readFileSync('components/consultation-report.css','utf8')
  assert.match(generator,/roundedFill\(A4\.left,metadataTop-metadataHeight,280,metadataHeight,8/)
  assert.match(generator,/roundedFill\(A4\.left\+290,metadataTop-metadataHeight/)
  assert.match(generator,/const noteX=A4\.left\+308/)
  assert.match(generator,/const titleSize = 26\.2/)
  assert.match(reader,/className="canonical-progress-note"/)
  assert.match(css,/\.canonical-document--editorial \.canonical-progress-note \{/)
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.match(pdf,/\/Lighthouse Do Q/,'real lighthouse remains')
    assert.match(pdf,/0\.974 0\.982 0\.976 rg/,'both cream/teal client/date cards drawn')
    assert.match(pdf,/\/RemedyPhoto1 Do Q/,'original remedy source photo remains')
    assert.match(pdf,/\/Signature Do Q/,'signed white closing remains')
    assert.doesNotMatch(pdf,/\(TARGET\)/,'a future goal is never a third score')
    if(locale==='en'){
      assert.match(pdf,/\(Your ratings\)/,
        'the sidebar only describes the two actual recorded ratings')
      assert.match(pdf,/\(before and after\.\)/)
    }
  }
  const single=buildPrescriptionPdf({
    patientName:'SYNTHETIC NON-MEASURED CLIENT',
    dateIssued:'2026-10-14',
    recommendationType:'homeopathy',
    analysis:'Only a future target: 7/10',
    items:[],
  },'en',origin).toString('latin1')
  assert.doesNotMatch(single,/\(Your ratings\)/,
    'no measurement graphic or caption when the client provided no paired observations')
})
