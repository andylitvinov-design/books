import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

// Anonymous fixture mirrors section lengths and the three-remedy layout that
// exposed a third page containing only a signature. It is not client content.
export function threeRemedyLayoutFixture(locale) {
  const ru = locale === 'ru'
  return {
    patientName: ru ? 'ТЕСТОВЫЙ КЛИЕНТ' : 'SYNTHETIC REPORT CLIENT',
    dateIssued: '2026-10-19',
    recommendationType: 'homeopathy',
    progressBefore: 3,
    progressAfter: 6,
    analysis: ru
      ? 'До консультации: человек сообщил об уровне интереса к цели 3/10.\nПосле консультации: отмечен уровень интереса к цели 6/10.\nЭто только демонстрационный текст без личных данных.'
      : 'Before consultation: the person recorded an interest score of 3/10.\nAfter consultation: the person recorded an interest score of 6/10.\nThis is anonymous layout-only text, not health advice.',
    recommendationsText: ru
      ? 'Здесь полностью сохраняется авторский текст рекомендаций, включая исходный порядок абзацев и формулировки.\nДополнительная строка нужна для проверки переносов на реальной странице.'
      : 'The original practitioner narrative is preserved in its original order without adding clinical instructions.\nOne additional sentence exercises real paragraph wrapping on the cover.',
    items: ['avena-sativa', 'phosphoricum-acidum', 'nux-vomica'].map(slug => ({
      displayName: slug === 'avena-sativa' ? 'Avena Sativa' :
        slug === 'phosphoricum-acidum' ? 'Phosphoricum Acidum' : 'Nux Vomica',
      remedySlug: slug,
      itemType: 'homeopathy',
      potency: '30',
      remedyPath: '/' + locale + '/homeopathy/remedies/' + slug,
    })),
    additionalNotes: ru
      ? 'Наблюдения и личные заметки сохраняются полностью.\nЭто вторая строка тестового текста.'
      : 'Observations and authored notes remain complete.\nA second anonymous sentence checks spacing.',
    followUpDate: '2026-11-02',
    includeDistanceHomeopathy: false,
    internalNotes: 'SYNTHETIC INTERNAL PRIVATE NEVER EXPORT',
  }
}

export function streamsOf(pdf) {
  const source=pdf.toString('latin1')
  const out=[]
  for(const entry of source.matchAll(/\/Type \/Page\b[^\r\n]*?\/Contents (\d+) 0 R/g)) {
    const match=source.match(new RegExp('\\n'+entry[1]+' 0 obj\\n<< /Length (\\d+) >>\\nstream\\n'))
    assert.ok(match,'every A4 page has a valid content stream')
    const pos=match.index+match[0].length
    out.push(source.slice(pos,pos+Number(match[1])))
  }
  return out
}

test('three source photographs and signature share the second core page, without a signature-only third sheet', () => {
  for (const locale of ['ru', 'en']) {
    const document=threeRemedyLayoutFixture(locale)
    const pdf=buildPrescriptionPdf(document,locale,'https://example.invalid')
    const pages=streamsOf(pdf)
    assert.ok(pages.length >= 3,'complete library appendix follows the signed core')
    const signaturePages=pages.flatMap((p,i)=>p.includes('/Signature Do Q')?[i]:[])
    assert.deepEqual(signaturePages,[1],locale+': ordinary three-remedy core ends on page 2')
    const signed=pages[1]
    for(const resource of ['/RemedyPhoto1 Do Q','/RemedyPhoto2 Do Q','/RemedyPhoto3 Do Q'])
      assert.ok(signed.includes(resource),locale+': all approved photographs fit alongside the recommendations')
    assert.ok(signed.includes(locale==='ru'?'2026-11-02':'November'),
      locale+': follow-up date remains with signature')
    assert.ok(pages.slice(2).some(p=>p.includes('/RemedyPhoto')),
      'full original library images remain in later appendix pages')
    assert.doesNotMatch(pdf.toString('latin1'),/SYNTHETIC INTERNAL PRIVATE NEVER EXPORT/)
    assert.equal((pages.join('\n').match(/\/Signature Do Q/g)??[]).length,1)
    // Keep the full-size original signature (no cropping or unapproved substitute).
    const position=signed.match(/q 207 0 0 81\.5 83 ([\d.]+) cm \/Signature Do Q/)
    assert.ok(position,locale+': approved wide signature remains')
    assert.ok(Number(position[1])>=89,'signature stays clear of the legal footer')
  }
})

test('cover art is a single approved coastal photograph if the deterministic build has run', () => {
  const pdf=buildPrescriptionPdf(threeRemedyLayoutFixture('en'),'en','https://example.invalid')
  const pages=streamsOf(pdf)
  assert.equal((pages[0].match(/\/Lighthouse Do Q/g)??[]).length,1)
  assert.equal((pages[0].match(/\/Signature Do Q/g)??[]).length,0)
  if (existsSync('assets/documents/report-coast-cover.jpg')) {
    assert.match(pages[0],/\/CoastalPhoto Do Q/,
      'first A4 sheet uses the self-hosted approved lighthouse source, not placeholder waves')
    assert.ok(pdf.toString('latin1').includes('/Width 1100 /Height 740'),
      'the photo is high-resolution JPEG, never a blurred screen thumbnail')
  } else {
    assert.match(pages[0],/0\.85 0\.91 0\.90 rg/,'vector fallback works before prebuild')
  }
  assert.ok(pages[0].includes('(START)')&&pages[0].includes('(END)'),
    'only two actual saved ratings are drawn')
})

test('long authored content stays complete and keeps the signature bounded even when a third core page is necessary', () => {
  const long=Array.from({length:88},(_,i)=>'SYNTHETIC-LAYOUT-LINE-'+i+' full text keeps the original sequence').join('\n')
  const document={...threeRemedyLayoutFixture('en'),recommendationsText:long}
  const pages=streamsOf(buildPrescriptionPdf(document,'en','https://example.invalid'))
  assert.ok(pages.length>4)
  const joined=pages.join('\n')
  assert.ok(joined.includes('SYNTHETIC-LAYOUT-LINE-0'))
  assert.ok(joined.includes('SYNTHETIC-LAYOUT-LINE-87'))
  assert.equal((joined.match(/\/Signature Do Q/g)??[]).length,1)
  const signature=pages.find(p=>p.includes('/Signature Do Q'))
  assert.ok(signature)
  assert.doesNotMatch(signature,/\/(?:RemedyPhoto)\d+ Do Q.*?APPENDIX/,
    'appendix should not be forced beneath signature')
})

test('receipt geometry and signature are untouched by the premium PDF cover redesign', () => {
  const result=buildPaymentPdf({
    patientName:'SYNTHETIC PAYMENT',dateIssued:'2026-10-19',
    dateOfService:'2026-10-19',service:'Synthetic consultation',
    amount:10000,currency:'CAD',paymentStatus:'received',
  },'en').toString('latin1')
  assert.match(result,/q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(result,/\/CoastalPhoto Do Q/)
})
