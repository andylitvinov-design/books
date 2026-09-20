import { mkdirSync, writeFileSync } from 'node:fs'
import { getDocumentSample, sampleKinds } from '../lib/documents/samples.js'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { canonicalPublicOrigin } from '../data/site-metadata.js'

const directory = 'output/pdf'
const origin = canonicalPublicOrigin().origin
mkdirSync(directory, { recursive: true })
for (const kind of sampleKinds) {
  for (const locale of ['en', 'ru']) {
    const document = getDocumentSample(kind, locale)
    const render = kind === 'recommendation' ? buildPrescriptionPdf : buildPaymentPdf
    writeFileSync(`${directory}/synthetic-${kind}${locale === 'ru' ? '-ru' : ''}.pdf`, render(document, locale, origin))
  }
}
const recommendation = getDocumentSample('recommendation', 'ru')
const long = { ...recommendation, items: Array.from({ length: 24 }, (_, i) => ({ ...recommendation.items[i % 2], instructions: `Synthetic item ${i + 1}. ` + 'Long practitioner-entered test instruction. '.repeat(12) })) }
writeFileSync(`${directory}/synthetic-recommendation-long.pdf`, buildPrescriptionPdf(long, 'ru', origin))
console.log('Generated seven synthetic PDFs in output/pdf; no patient data.')
