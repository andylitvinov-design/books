import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPrescriptionPdf, buildPrescriptionMobilePdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

const origin='https://example.invalid'
const item={
  displayName:'Veratrum Album',
  remedySlug:'veratrum-album',
  potency:'30',
  itemType:'homeopathy',
  remedyPath:'/en/homeopathy/remedies/veratrum-album',
}
function pages(pdf) {
  const source=pdf.toString('latin1')
  return [...source.matchAll(/\/Type \/Page\b[^\r\n]*?\/Contents (\d+) 0 R/g)].map(match=>{
    const entry=source.match(new RegExp('\\n'+match[1]+' 0 obj\\n<< /Length (\\d+) >>\\nstream\\n'))
    assert.ok(entry,'every output page owns an A4/phone content stream')
    const offset=entry.index+entry[0].length
    return source.slice(offset,offset+Number(entry[1]))
  })
}

test('iPhone PDF includes the original authored Recommendations section before the remedy photographs',()=>{
  const document={
    patientName:'SYNTHETIC MOBILE CLIENT',
    dateIssued:'2026-10-20',
    recommendationType:'homeopathy',
    analysis:'The user described ordinary daily events.',
    recommendationsText:'AUTHOR RECOMMENDATION HERE',
    items:[item],
    internalNotes:'INTERNAL NOTES MUST NEVER EXPORT',
  }
  for(const locale of ['en','ru']){
    const mobile=buildPrescriptionMobilePdf(document,locale,origin)
    const printed=pages(mobile)
    const authored=printed.findIndex(p=>p.includes('(AUTHOR RECOMMENDATION HERE) Tj ET'))
    const firstCard=printed.findIndex(p=>p.includes('/MobileRemedy0 Do Q'))
    assert.ok(authored>=0,locale+': the signed phone reader must not silently omit practitioner text')
    assert.ok(firstCard>=authored,locale+': the authored guidance appears before its actual remedy')
    assert.ok(printed.some(p=>p.includes('/Signature Do Q')),'approved signature is present')
    assert.ok(printed.slice(firstCard).some(p=>p.includes('/MobileRemedy0 Do Q')))
    assert.ok(mobile.toString('latin1').includes('/MediaBox [0 0 390 780]'))
    assert.match(mobile.toString('latin1'),/0\.40 0\.22 0\.32 rg 0 774 390 6 re f/,
      'phone letterhead uses the matching deep-burgundy approved A4 identity')
    assert.doesNotMatch(mobile.toString('latin1'),/INTERNAL NOTES MUST NEVER EXPORT/)
  }
})

test('written recommendations suppress unapproved generic dosing boilerplate in mobile PDF',()=>{
  const core={
    patientName:'SYNTHETIC MOBILE CLIENT',dateIssued:'2026-10-20',
    recommendationType:'homeopathy',analysis:'Synthetic note.',
    items:[item],
  }
  const automatic=buildPrescriptionMobilePdf(core,'en',origin).toString('latin1')
  assert.match(automatic,/\(HOW TO TAKE\) Tj ET/,
    'legacy no-text reports still retain existing generic educational section')
  const authored=buildPrescriptionMobilePdf({
    ...core,recommendationsText:'AUTHOR RECOMMENDATION HERE',
  },'en',origin).toString('latin1')
  assert.doesNotMatch(authored,/\(HOW TO TAKE\) Tj ET/,
    'no default regimen may be silently appended after individualized author guidance')
  assert.match(authored,/\(AUTHOR RECOMMENDATION HERE\) Tj ET/)
  assert.match(buildPrescriptionPdf({...core,recommendationsText:'AUTHOR RECOMMENDATION HERE'},'en',origin).toString('latin1'),
    /\(AUTHOR RECOMMENDATION HERE\) Tj ET/,
    'A4 and iPhone versions preserve the same author-controlled recommendation')
})

test('short A4 narrative paragraphs stay on one reading sheet, with no lost source markers',()=>{
  const paras=Array.from({length:48},(_,i)=>(
    'PARA_'+i+'_BEGIN This is an ordinary synthetic sentence testing the report reading '+
    'column and keeping both ends of an authored thought together through page breaks. '+
    'No diagnoses or instructions are provided. PARA_'+i+'_END'
  ))
  const document={
    patientName:'SYNTHETIC LONG AUTHOR TEXT',dateIssued:'2026-10-20',
    recommendationType:'homeopathy',analysis:paras.join('\n'),
    recommendationsText:'AUTHOR RECOMMENDATION HERE',items:[],
    internalNotes:'PRIVATE SYNTHETIC NOTE',
  }
  const printed=pages(buildPrescriptionPdf(document,'en',origin))
  assert.ok(printed.length>=3,'many complete paragraphs exercise actual A4 continuations')
  for(let i=0;i<paras.length;i++){
    const first=printed.findIndex(p=>p.includes('PARA_'+i+'_BEGIN'))
    const last=printed.findIndex(p=>p.includes('PARA_'+i+'_END'))
    assert.ok(first>=0&&last>=0,'no source words are truncated for paragraph '+i)
    assert.equal(first,last,'paragraph '+i+' may not leave one trailing line on the next page')
  }
  const source=printed.join('\n')
  assert.equal((source.match(/\/Signature Do Q/g)??[]).length,1)
  assert.match(source,/\(AUTHOR RECOMMENDATION HERE\) Tj ET/)
  assert.doesNotMatch(source,/PRIVATE SYNTHETIC NOTE/)
})

test('all full source photos stay after the signed mobile core, with their own titles',()=>{
  const doc={
    patientName:'SYNTHETIC',dateIssued:'2026-10-20',
    recommendationType:'homeopathy',
    analysis:'Sample note.',recommendationsText:'AUTHOR RECOMMENDATION HERE',
    items:[item],
  }
  const printed=pages(buildPrescriptionMobilePdf(doc,'en',origin))
  const sig=printed.findIndex(p=>p.includes('/Signature Do Q'))
  assert.ok(sig>=0)
  const appendix=printed.findIndex((p,i)=>i>sig&&p.includes('/MobileRemedy0 Do Q'))
  assert.ok(appendix>sig,'appendix image follows real signature, not a client summary')
  assert.ok(printed[appendix].includes('(Veratrum Album) Tj ET'),
    'source title and original library photograph occupy the same mobile page')
})

test('invoices remain original A4 with no client-report iPhone presentation changes',()=>{
  const invoice=buildPaymentPdf({
    patientName:'Synthetic Payer',dateIssued:'2026-10-20',dateOfService:'2026-10-20',
    service:'Synthetic appointment',amount:10000,currency:'EUR',paymentStatus:'unpaid',
  },'en').toString('latin1')
  assert.match(invoice,/\/MediaBox \[0 0 595\.28 841\.89\]/)
  assert.match(invoice,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice,/\(AUTHOR RECOMMENDATION HERE\)/)
})
