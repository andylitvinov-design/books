import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'
import { getRemedy } from '../data/remedies.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'

const origin='https://example.invalid'
const base={
  dateIssued:'2026-10-14',
  patientName:'Synthetic Sample Client',
  recommendationType:'homeopathy',
  analysis:'Before: interest 3/10\nAfter session: interest 6/10\nTarget: aspirational 7.3/10',
  items:[{remedySlug:'veratrum-album',displayName:'Veratrum Album',itemType:'homeopathy',
    remedyPath:'/en/homeopathy/remedies/veratrum-album',potency:'30',granules:'8'}],
}
const textOf=pdf=>pdf.toString('latin1')
const pageCount=pdf=>(textOf(pdf).match(/\/Type \/Page \/Parent/g)??[]).length

test('premium report uses distinct hero/artwork columns, aligned sections, original art and two real rings',()=>{
  for(const locale of ['en','ru']){
    const source=textOf(buildPrescriptionPdf({...base,patientName:'Sample Subject'},locale,origin))
    assert.match(source,/^%PDF-1\.7/)
    assert.equal((source.match(/\/Lighthouse Do Q/g)??[]).length,1,
      'approved masthead mark stays, duplicated white-backed hero JPEG is removed')
    assert.ok(/\/CoastalPhoto Do Q/.test(source) || /0\.85 0\.91 0\.90 rg/.test(source),
      'approved lighthouse coast or vector-only fallback appears on cover')
    assert.ok(/\/CoastalPhoto Do Q/.test(source) || /0\.51 0\.72 0\.72 RG/.test(source),
      'sea treatment is integrated, not a hard white photo rectangle')
    assert.match(source,/0\.965 0\.980 0\.969 rg/,'balanced two-ring progress dashboard')
    assert.match(source,/\/RemedyPhoto1 Do Q/,'original selected remedy artwork')
    assert.match(source,/\/Signature Do Q/,'original signature')
    assert.ok(!source.includes('TARGET \\(PLAN\\)'),'planned goal is never plotted as third measurement')
    assert.ok(!source.includes('UNAUTHORIZED-NOTES'))
    assert.ok(source.includes(locale==='en'?'START':'PERSONAL REPORT') || locale==='ru')
    assert.ok(pageCount(buildPrescriptionPdf(base,locale,origin))>=2,
      'complete remedy source continues in the A4 appendix')
  }
})

test('remedy recommendation remains a single dynamic card with metadata, larger photo and clickable action',()=>{
  const source=readFileSync('lib/prescriptions/pdf.js','utf8')
  assert.match(source,/const cardHeight=mainHeight/)
  assert.match(source,/const imageArea=86/)
  assert.match(source,/text\(linkLabel,titleX,linkY/)
  assert.match(source,/page\.links\.push\(\{url,x:titleX,y:linkY/)
  assert.doesNotMatch(source,/const photoY = headerTop - 58/)
})

test('the approved photograph only floats beside the start of the full remedy appendix',()=>{
  const source=readFileSync('lib/prescriptions/pdf.js','utf8')
  const html=readFileSync('components/remedy-content.tsx','utf8')
  const css=readFileSync('components/consultation-report.css','utf8')
  assert.match(source,/introCount<4/)
  assert.match(source,/floatingRemedyPhoto=null/)
  assert.match(source,/for\(;cursor<entries\.length;cursor\+\+\)/)
  assert.match(html,/remedy-source-intro/)
  assert.match(html,/remedy-source-rest/)
  assert.match(html,/chunks\.slice\(0,4\)/)
  assert.match(html,/chunks\.slice\(4\)/)
  assert.match(css,/\.canonical-document--editorial \.remedy-source-rest\s*\{\s*clear:both;/)
  const remedy=getRemedy('en','veratrum-album')
  const last=remedy.description.trim().split(/\r?\n/).filter(Boolean).at(-1).trim()
  const entries=remedyDescriptionBlocks(remedy.description).filter(b=>b.kind!=='space')
  assert.equal(entries.at(-1).text,last)
})

test('long client-specific content retains signature and last user paragraph with paginated text',()=>{
  const notes=Array.from({length:93},(_,index)=>'SAFE-SYNTHETIC-LINE-'+index+' ongoing user journal entry').join('\n')
  const doc={...base,additionalNotes:notes}
  const pdf=buildPrescriptionPdf(doc,'en',origin)
  const contents=textOf(pdf)
  assert.ok(pageCount(pdf)>2)
  for(const marker of ['SAFE-SYNTHETIC-LINE-0','SAFE-SYNTHETIC-LINE-92'])
    assert.ok(contents.includes(marker),'missing complete practitioner content '+marker)
  assert.equal((contents.match(/\/Signature Do Q/g)??[]).length,1)
})

test('invoices remain untouched and must not acquire a premium cover or score board',()=>{
  const pdf=textOf(buildPaymentPdf({
    patientName:'Synthetic Billable Client',dateIssued:'2026-10-14',
    dateOfService:'2026-10-14',service:'Synthetic appointment',
    amount:10000,currency:'EUR',paymentStatus:'unpaid',
  },'en',origin))
  assert.match(pdf,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.equal((pdf.match(/\/Lighthouse Do Q/g)??[]).length,1)
  assert.doesNotMatch(pdf,/0\.989 0\.977 0\.966 rg/)
  assert.doesNotMatch(pdf,/SELF-RATED PROGRESS/)
})
