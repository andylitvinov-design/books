// Curated, owner-hosted SOURCE links only; never proxy, mirror, auto-fetch or
// serve copyrighted questionnaires from Holistic House. The linked document can
// be freely viewed/downloaded by visitors only on the owner's own website.
// Publicly accessible does NOT mean cleared for commercial digital administration.
export const OFFICIAL_QUESTIONNAIRE_SOURCES = Object.freeze({
  'maia-2-37': Object.freeze({
    url: 'https://osher.ucsf.edu/sites/osher.ucsf.edu/files/inline-files/MAIA-2.pdf',
    owner: 'UCSF Osher Center', locale: 'en', directPdf: true,
    notice: 'Read the UCSF permission terms in the original before personal use. Language versions need their own evidence.',
  }),
  'who-5': Object.freeze({
    url: 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01',
    owner: 'World Health Organization', locale: 'en', directPdf: false,
    notice: 'Open the WHO-hosted download. CC BY-NC-SA 3.0 IGO; no commercial redistribution or embedding is authorized here.',
  }),
  'asrs-6': Object.freeze({
    url: 'https://license.tov.med.nyu.edu/product/asrs6Qscreener',
    owner: 'NYU Technology Opportunities & Ventures', locale: 'en', directPdf: false,
    notice: 'Owner offers a downloadable 6-question patient-facing form. Not a diagnosis; electronic reproduction has separate attribution and no-modification rules.',
  }),
})

export function officialQuestionnaireSource(item) {
  if (!item?.key) return null
  const source = OFFICIAL_QUESTIONNAIRE_SOURCES[item.key]
  if (!source) return null
  if (['licensed_only', 'clinician_only', 'managed_safety_only', 'internal_reference'].includes(item.rightsStatus)) return null
  if (!/^https:\/\//.test(source.url)) return null
  return Object.freeze({ ...source, linkOnly: true, commercialDigitalRightsCleared: false })
}
