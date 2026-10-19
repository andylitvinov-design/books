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


const neutralCaption={
  en:['Your ratings','before and after.'],
  ru:['Ваши оценки','до и после сессии.'],
}

// Read the generated text operators, including Cyrillic through the PDF's own
// ToUnicode map. Captions occupy two separate runs, not one literal string.
function pdfTextRuns(pdf){
  const glyphs=new Map()
  for(const [,entries] of pdf.matchAll(/\d+ beginbfchar\n([\s\S]*?)\nendbfchar/g)){
    for(const [,glyph,unicode] of entries.matchAll(/<([0-9A-F]{4})> <([0-9A-F]{4})>/g))
      glyphs.set(glyph,String.fromCharCode(parseInt(unicode,16)))
  }
  return [...pdf.matchAll(/BT \/(F[1-4]) ([\d.]+) Tf 1 0 0 1 [-\d.]+ [-\d.]+ Tm (\((?:\\.|[^\\)])*\)|<[0-9A-F]+>) Tj ET/g)]
    .map(([,font,size,encoded])=>({
      size:Number(size),
      text:encoded.startsWith('(')
        ? encoded.slice(1,-1).replace(/\\([\\()])/g,'$1')
        : encoded.slice(1,-1).match(/.{4}/g).map(glyph=>{
          assert.equal(font,'F2','hexadecimal text uses the embedded Unicode font')
          assert.ok(glyphs.has(glyph),'PDF ToUnicode defines caption/text glyph '+glyph)
          return glyphs.get(glyph)
        }).join(''),
    }))
}

function assertNeutralCaption(pdf,locale){
  const runs=pdfTextRuns(pdf)
  assert.deepEqual(runs.filter(run=>run.size===9.15).map(run=>run.text),neutralCaption[locale],
    'caption attributes exactly two observations to the client without implying improvement')
  assert.doesNotMatch(runs.map(run=>run.text).join('\n'),/A small step forward/,
    'the removed directional caption must not reappear elsewhere in the PDF')
  return runs
}

test('PDF prints approved lighthouse twice plus ocean and botanical vector graphics in both languages',()=>{
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.match(pdf,/^%PDF-1\.7/)
    assert.ok((pdf.match(/\/Lighthouse Do Q/g)??[]).length>=2,
      'cover includes brand lighthouse and a second illustrated ocean lighthouse')
    assert.match(pdf,/0\.85 0\.91 0\.90 rg/,'soft coastal mountains replace rectangular photo fill')
    assert.match(pdf,/0\.51 0\.72 0\.72 RG/,'editorial coastal wave paths are rendered')
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
  assert.ok(lighthousePlacements.length>=2 && Number(lighthousePlacements[1][1])>=96,
    'hero lighthouse occupies a larger integrated illustration area')
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
  assert.match(generator,/if \(y < 203\) startPage\(\)/,
    'signature is kept safely above the reserved footer')
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
  assert.match(generator,/const titleSize = 24\.6/)
  assert.match(reader,/className="canonical-progress-note"/)
  assert.match(css,/\.canonical-document--editorial \.canonical-progress-note \{/)
  for(const locale of ['ru','en']){
    const pdf=buildPrescriptionPdf(sample(locale),locale,origin).toString('latin1')
    assert.match(pdf,/\/Lighthouse Do Q/,'real lighthouse remains')
    assert.match(pdf,/0\.981 0\.963 0\.948 rg/,'both ivory client/date cards drawn')
    assert.match(pdf,/\/RemedyPhoto1 Do Q/,'original remedy source photo remains')
    assert.match(pdf,/\/Signature Do Q/,'signed white closing remains')
    assert.doesNotMatch(pdf,/\(TARGET\)/,'a future goal is never a third score')
    const runs=assertNeutralCaption(pdf,locale)
    assert.deepEqual(runs.filter(run=>run.size===13.6).map(run=>run.text),['3/10','6/10'],
      'only the two actual supplied values appear in the gauges')
  }
  const single=buildPrescriptionPdf({
    patientName:'SYNTHETIC NON-MEASURED CLIENT',
    dateIssued:'2026-10-14',
    recommendationType:'homeopathy',
    analysis:'Only a future target: 7/10',
    items:[],
  },'en',origin).toString('latin1')
  assert.doesNotMatch(single,/A small step forward/,
    'no measurement graphic or caption when the client provided no paired observations')
})


test('paired self-ratings keep neutral captions and exact numbers for increases, ties and decreases',()=>{
  for(const locale of ['en','ru'])for(const [before,after] of [[3,6],[6,6],[6,3],[0,0],[10,0]]){
    for(const source of ['structured','legacy']){
      const document=sample(locale,{
        items:[],
        ...(source==='structured'
          ? {progressBefore:before,progressAfter:after}
          : {analysis:locale==='ru'
            ? `Было: ${before}/10\nПосле сессии: ${after}/10\nЦель: 7.3/10`
            : `Before: ${before}/10\nAfter session: ${after}/10\nTarget: 7.3/10`}),
      })
      const pdf=buildPrescriptionPdf(document,locale,origin).toString('latin1')
      const runs=assertNeutralCaption(pdf,locale)
      assert.deepEqual(runs.filter(run=>run.size===13.6).map(run=>run.text),
        [before+'/10',after+'/10'],locale+' '+source+': no invented score, reordered change or third target')
    }
  }
})

test('missing, cleared and invalid score pairs never gain a rating caption or fabricated gauge',()=>{
  for(const locale of ['en','ru'])for(const extra of [
    {analysis:'Only a future target: 7/10'},
    {analysis:'Before: 3/10\nTarget: 7/10'},
    {analysis:'After session: 6/10'},
    {progressBefore:null,progressAfter:null},
    {progressBefore:3,progressAfter:''},
    {progressBefore:11,progressAfter:6},
  ]){
    const pdf=buildPrescriptionPdf(sample(locale,{items:[],...extra}),locale,origin).toString('latin1')
    const runs=pdfTextRuns(pdf)
    for(const caption of neutralCaption[locale])
      assert.ok(!runs.some(run=>run.text===caption),'the new neutral caption is absent without paired observations')
    assert.deepEqual(runs.filter(run=>run.size===9.15 || run.size===13.6),[],
      'no caption or score may be manufactured from a missing or invalid observation')
    assert.ok(!pdf.includes('0.965 0.980 0.969 rg'),'no measurement panel without a complete valid pair')
    assert.ok(!runs.some(run=>/^(?:SELF-RATED PROGRESS|ДИНАМИКА САМООЦЕНКИ|START|END|НАЧАЛО|КОНЕЦ|A small step forward)$/.test(run.text)),
      'no progress title, gauge labels or removed improvement caption without a real pair')
  }
})

test('caption check rejects fabricated improvement and incomplete before/after wording',()=>{
  const pdf=buildPrescriptionPdf(sample('en',{items:[]}), 'en',origin).toString('latin1')
  for(const [original,replacement] of [
    ['(Your ratings)','(A small step forward)'],
    ['(Your ratings)','(Your improvement)'],
    ['(before and after.)','(after treatment improved.)'],
    ['(before and after.)','(before only.)'],
  ]){
    assert.ok(pdf.includes(original),'mutation targets a real PDF caption operator')
    assert.throws(()=>assertNeutralCaption(pdf.replace(original,replacement),'en'),
      {code:'ERR_ASSERTION',message:/caption attributes exactly two observations/},
      'a wrong or directional caption must fail even when genuine scores are still present')
  }
})
