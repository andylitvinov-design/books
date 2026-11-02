import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildPrescriptionPdf, buildPrescriptionMobilePdf } from '../lib/prescriptions/pdf.js'

// Authoritative synthetic render regression: no real names, medical data,
// private URLs, signed client records or payment details are loaded.
const output=path.join(process.cwd(),'tmp','premium-pdf-qa')
mkdirSync(output,{recursive:true})
const items=['avena-sativa','phosphoricum-acidum','nux-vomica'].map((slug)=>({
  displayName:slug==='avena-sativa'?'Avena Sativa':slug==='phosphoricum-acidum'?'Phosphoricum Acidum':'Nux Vomica',
  remedySlug:slug,itemType:'homeopathy',potency:'30',granules:'8',timesPerDay:'2',
}))
for(const locale of ['en','ru']){
  const ru=locale==='ru'
  const document={
    patientName:ru?'СИНТЕТИЧЕСКИЙ КЛИЕНТ':'SYNTHETIC CLIENT',
    dateIssued:'2026-10-19',
    recommendationType:'homeopathy',
    progressBefore:3,progressAfter:6,
    analysis:ru
      ? 'До консультации: оценка исходного уровня 3/10.\nПосле консультации: оценка уровня 6/10.\nЭто тестовые значения, не сведения о реальном клиенте.'
      : 'Before consultation: a score of 3/10 was recorded.\nAfter consultation: a score of 6/10 was recorded.\nThese are test values, not a real client assessment.',
    recommendationsText:ru
      ? 'Этот пример проверяет красивую вёрстку полных авторских рекомендаций и сохранность текста.\nПоследняя фраза должна остаться рядом с заголовком, без обрыва страницы.'
      : 'This example checks the complete authored guidance and correct paragraph wrapping.\nThe final sentence should stay with the section instead of being orphaned.',
    items:items.map(item=>({...item,remedyPath:'/'+locale+'/homeopathy/remedies/'+item.remedySlug})),
    additionalNotes:ru?'Тестовые наблюдения: оставить материалы в том же порядке.':'Synthetic observations: preserve the original paragraph order.',
    followUpDate:'2026-11-02',
    includeDistanceHomeopathy:false,
  }
  const file=path.join(output,'sample-'+locale+'.pdf')
  writeFileSync(file,buildPrescriptionPdf(document,locale,'https://example.invalid'))
  console.log('SYNTHETIC_PDF_CREATED',locale,path.relative(process.cwd(),file))
  // Separate source-complete mobile reading edition; this is NOT an A4 export
  // and contains no real person, signed consultation or client-specific data.
  const phone=path.join(output,'sample-mobile-'+locale+'.pdf')
  writeFileSync(phone,buildPrescriptionMobilePdf(document,locale,'https://example.invalid'))
  console.log('SYNTHETIC_PHONE_PDF_CREATED',locale,path.relative(process.cwd(),phone))
}
