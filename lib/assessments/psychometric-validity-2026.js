// Psychometric evidence governance for the exact instrument edition and respondent language.
// IMPORTANT: a publication, PDF, copyright grant, and an interface translation are not
// interchangeable evidence of psychometric validity. This is NOT a clinical score.
export const PSYCHOMETRIC_CRITERIA = Object.freeze({
  contentValidity: 18,
  structuralValidity: 16,
  internalConsistency: 14,
  constructValidity: 14,
  reliability: 12,
  crossCulturalValidity: 10,
  responsiveness: 6,
  scoringAndInterpretation: 10,
})

// Discovery group is a statement about evidence GOVERNANCE, not measured accuracy.
// Groups never authorize test administration, diagnostic use or translations.
export const ASSESSMENT_EVIDENCE_GROUPS = Object.freeze([
  { key:'reviewed_exact_edition', label:{en:'Independently reviewed edition',ru:'Независимо проверенная версия',es:'Edición revisada independientemente'} },
  { key:'published_source_pending', label:{en:'Published-source method · review pending',ru:'Опубликованная методика · проверка не завершена',es:'Método publicado · revisión pendiente'} },
  { key:'author_self_reflection', label:{en:'Holistic House author check-in · developing',ru:'Авторский чек-ин Holistic House · разработка',es:'Autoobservación Holistic House · en desarrollo'} },
  { key:'symbolic_typology', label:{en:'Symbolic or typological exploration',ru:'Символическое или типологическое исследование',es:'Exploración simbólica o tipológica'} },
  { key:'reference_only', label:{en:'Research reference · not runnable',ru:'Исследовательский справочник · недоступен для прохождения',es:'Referencia de investigación · no administrable'} },
])

// Traditional/typology/energetic constructs are disclosed separately from
// routine self-observation and must not inherit claims from validated scales.
const SYMBOLIC_KEYS = new Set([
  'hh-bach-flower-profile','hh-socionics-32','hh-enneagram-36',
  'hh-disc-style-20','hh-temperaments-16','hh-chakra-kundalini-profile',
  'hh-tantra-development-levels','hh-tantric-energy-sensitivity',
  'hh-tantric-personality-portrait',
])

export function assessmentEvidenceGroup(item, {independentlyReviewed = false} = {}) {
  if (item?.startable !== true || item?.rightsStatus !== 'cleared') return 'reference_only'
  if (independentlyReviewed) return 'reviewed_exact_edition'
  if (SYMBOLIC_KEYS.has(item?.key)) return 'symbolic_typology'
  if (item?.key?.startsWith('hh-')) return 'author_self_reflection'
  return 'published_source_pending'
}

// These records are verified SOURCE POINTERS, not pre-approved validity grades.
// Manual evidence extraction for each edition and population is still required.
const SOURCE_POINTERS = Object.freeze({
  'phq-9@v1@en': 'https://doi.org/10.1046/j.1525-1497.2001.016009606.x',
  'phq-4@v1@en': 'https://doi.org/10.1016/j.jpsychores.2009.06.019',
  'gad-7@v1@en': 'https://doi.org/10.1001/archinte.166.10.1092',
  'mini-ipip-20@v1@en': 'https://doi.org/10.1037/1040-3590.18.2.192',
  'ipip-big-five-50@v1@en': 'https://ipip.ori.org/',
  'asrs-6@v1@en': 'https://license.tov.med.nyu.edu/product/asrs6Qscreener',
})

// A review is edition + respondent-language + population specific. Never infer an
// RU/ES validation from 'dynamic' catalog copy or from an English validation.
export const ASSESSMENT_EVIDENCE_REVIEWS = Object.freeze({
  // Quality reviews will be inserted only with item/scoring equivalence verified,
// a human-reviewed study reference, and ratings for the COSMIN-inspired domains.
})

const integerRating = value => Number.isInteger(value) && value >= 0 && value <= 2
const gradeFrom = value => value >= 85 ? 'A' : value >= 70 ? 'B' : value >= 50 ? 'C' : 'D'
const effectiveLocale = (locale, item) =>
  item?.instrumentLocale === 'dynamic' ? (locale === 'ru' ? 'ru' : 'en') :
  (item?.instrumentLocale || 'en').toLowerCase()
const evidenceKey = (key, version, locale) => [key, version || 'v1', locale].join('@')

export function calculatePsychometricGrade(review) {
  if (!review || review.exactEdition !== true || review.respondentLanguageVerified !== true ||
      review.populationDocumented !== true || review.scoringVerified !== true || !review.primarySourceUrl ||
      !/^https:\/\/[^ ]+$/i.test(review.primarySourceUrl) || review.independentReview !== true)
    return null
  const criteria = Object.entries(PSYCHOMETRIC_CRITERIA)
  // Omitted measurements are unknown, not zeros or favorable assessments.
  if (criteria.some(([key]) => !integerRating(review.ratings?.[key]))) return null
  const score = Math.round(criteria.reduce((total, [key, weight]) =>
    total + weight * review.ratings[key] / 2, 0))
  return Object.freeze({ score, grade: gradeFrom(score), coverage: 1 })
}

export function assessmentValidity(item, { locale = 'en', sourceUrl = null } = {}) {
  const respondentLocale = effectiveLocale(locale, item)
  const key = evidenceKey(item?.key, item?.version, respondentLocale)
  const review = ASSESSMENT_EVIDENCE_REVIEWS[key]
  const scored = calculatePsychometricGrade(review)
  const custom = item?.key?.startsWith('hh-') ||
    (item?.testStyle !== 'professional' && item?.rightsStatus === 'cleared')
  const pointer = SOURCE_POINTERS[key] || sourceUrl || null
  const status = scored ? 'graded' : custom ? 'development' : pointer ? 'source_documented' : 'unreviewed'
  const group = assessmentEvidenceGroup(item, {independentlyReviewed:Boolean(scored)})
  return Object.freeze({
    key, respondentLocale, status, group,
    grade: scored?.grade ?? null, score: scored?.score ?? null,
    // Never conflate evidence strength with a legal right to administer.
    // Do not boost a questionnaire merely because someone found a DOI or a
    // publisher link. Search boosts require independently reviewed psychometric
    // evidence for the exact form, respondent language and population.
    priority: scored ? 5 + scored.score / 100 : 0,
    sourceUrl: review?.primarySourceUrl || pointer,
    languageVerified: Boolean(review?.respondentLanguageVerified),
    itemScoringVerified: Boolean(review?.exactEdition && review?.scoringVerified),
    gaps: scored ? [] : custom ?
      ['content_validity', 'cognitive_interviews', 'independent_field_validation', 'scoring_review'] :
      ['primary_study_review', 'exact_edition', 'respondent_language', 'population_fit', 'scoring_review'],
  })
}

export function compareAssessmentValidity(a, b) {
  return (b?.validity?.priority ?? 0) - (a?.validity?.priority ?? 0)
}

export function auditAssessmentCatalog(catalog, { locale = 'en' } = {}) {
  const rows = (Array.isArray(catalog) ? catalog : []).map(item => {
    const validity = assessmentValidity(item, { locale })
    const launchEligible = item.startable === true && item.rightsStatus === 'cleared'
    return Object.freeze({
      key: item.key, version: item.version || 'v1',
      respondentLocale: validity.respondentLocale,
      level: validity.grade || validity.status, group: validity.group,
      evidenceUrl: validity.sourceUrl, gaps: validity.gaps,
      launchEligible, // existing product gate, NOT a new activation grant
      verifiedForLocale: validity.languageVerified,
    })
  })
  return Object.freeze({
    rows: Object.freeze(rows),
    total: rows.length,
    graded: rows.filter(r => /^[A-D]$/.test(r.level)).length,
    reviewPending: rows.filter(r => !/^[A-D]$/.test(r.level)).length,
    development: rows.filter(r => r.level === 'development').length,
    evidenceGroups: Object.freeze(Object.fromEntries(ASSESSMENT_EVIDENCE_GROUPS.map(group => [
      group.key, rows.filter(row => row.group === group.key).length,
    ]))),
  })
}

export const VALIDATION_IMPROVEMENT_PROTOCOL = Object.freeze([
  { id: 'scope', outcome: 'Register precise construct, item edition, language, population and intended use; check digital rights and ethics.' },
  { id: 'content', outcome: 'Independent expert panel, content-validity index and cognitive interviews in each respondent language.' },
  { id: 'pilot', outcome: 'Pilot response patterns and missingness, then preregister scoring and a powered sampling plan.' },
  { id: 'structure', outcome: 'Evaluate EFA/CFA or IRT on separate samples; test age, sex and language measurement invariance.' },
  { id: 'reliability', outcome: 'Estimate omega / alpha and test-retest ICC with confidence intervals when the construct is expected to remain stable.' },
  { id: 'construct', outcome: 'Test predefined convergent, discriminant and known-groups hypotheses against established measures.' },
  { id: 'change', outcome: 'For monitoring scales, assess responsiveness, measurement error, minimal important change and floor/ceiling effects.' },
  { id: 'release', outcome: 'Independent review of exact item/scoring version, contraindications, permissions, accessibility, localized instructions and safety before optional release.' },
])
