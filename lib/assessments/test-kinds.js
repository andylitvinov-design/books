import { interpretationPlan } from './interpretation-registry.js'

// Discovery type, not a diagnosis, psychometric validation or licensing status.
// A professional instrument is only labelled as such when the registered form
// names an external source; HH-created reflections never inherit this label.
export const TEST_KINDS = Object.freeze([
  Object.freeze({ key: 'professional', label: Object.freeze({ en: 'Published-source tests', ru: 'Методики с источником', es: 'Pruebas con fuente publicada' }),
    description: Object.freeze({ en: 'Documented assessment instruments', ru: 'Методики с указанным источником', es: 'Instrumentos con fuente documentada' }) }),
  Object.freeze({ key: 'monitoring', label: Object.freeze({ en: 'State questionnaires', ru: 'Опросники и шкалы', es: 'Cuestionarios y escalas' }),
    description: Object.freeze({ en: 'Check-ins and measures of present experience', ru: 'Измерение состояния и самонаблюдение', es: 'Seguimiento del estado actual' }) }),
  Object.freeze({ key: 'hobby', label: Object.freeze({ en: 'Hobby & self-discovery', ru: 'Хобби и самопознание', es: 'Aficiones y autoconocimiento' }),
    description: Object.freeze({ en: 'Exploratory, non-diagnostic typologies and reflections', ru: 'Игровые и типологические исследования без диагностики', es: 'Exploración no diagnóstica' }) }),
])

// Compact, truthful public labels. "Sourced" describes documentation only:
// it must never imply independent clinical validation or diagnostic ability.
// Only HH-authored monitoring keys get the "author's questionnaire" wording.
const TEST_KIND_CARD_COPY = Object.freeze({
  professional: Object.freeze({ en: 'Source-backed method', ru: 'Методика с источником', es: 'Método con fuente' }),
  monitoring: Object.freeze({ en: 'State questionnaire', ru: 'Опросник состояния', es: 'Cuestionario de estado' }),
  hobby: Object.freeze({ en: 'Self-discovery', ru: 'Самопознание', es: 'Autoconocimiento' }),
})
const AUTHORED_CHECK_IN_COPY = Object.freeze({
  en: 'Holistic House check-in', ru: 'Авторский опросник', es: 'Cuestionario de Holistic House',
})

/** Short labels shared by the public category tabs and individual test cards.
 * These are discovery groups, not a claim of independent clinical validation.
 */
export const TEST_KIND_SHORT_LABELS = Object.freeze({
  monitoring: Object.freeze({ en: 'Check-in', ru: 'Чек-ин', es: 'Chequeo' }),
  professional: Object.freeze({ en: 'Source', ru: 'Источник', es: 'Fuente' }),
  hobby: Object.freeze({ en: 'Hobby', ru: 'Хобби', es: 'Hobby' }),
})

export function testKindShortLabel(entry, locale = 'en') {
  const language = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  return TEST_KIND_SHORT_LABELS[entry?.testKind]?.[language] || null
}

export function testKindCardLabel(entry, locale = 'en') {
  const language = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  if (!entry || !TEST_KIND_CARD_COPY[entry.testKind]) return null
  if (entry.testKind === 'monitoring' && typeof entry.key === 'string' && entry.key.startsWith('hh-')) {
    return AUTHORED_CHECK_IN_COPY[language]
  }
  return TEST_KIND_CARD_COPY[entry.testKind][language]
}

// Explicit, reviewed non-validated / traditional typologies. A light visual
// style alone does not imply a hobby: most HH check-ins monitor real changes.
export const HOBBY_TEST_KEYS = Object.freeze([
  'hh-bach-flower-profile',
  'hh-chakra-kundalini-profile',
  'hh-socionics-32',
  'hh-enneagram-36',
  'hh-disc-style-20',
  'hh-temperaments-16',
])

const HOBBY = new Set(HOBBY_TEST_KEYS)
const SCORERS = new Set(['configured:v1', 'raw-state:v1', 'raw-dimensions:v1', 'mini-ipip-20:v1', 'bach-flower:v1', 'asrs-v1-6-classic:v1', 'pcl5-trauma:v1', 'itq-adult-trauma:v1', 'cfpb-short-2017:v1'])

export function testKindFor({ key, source, catalog, definition } = {}) {
  if (HOBBY.has(key)) return 'hobby'
  // Authored tools keep their purpose even while reference-only. Being listed
  // in the research registry is not evidence of professional provenance.
  if (key?.startsWith('hh-')) return 'monitoring'
  if (source === 'research') return 'professional' // external references only, NOT runnable
  if (!catalog) return 'monitoring' // missing metadata cannot establish a professional source
  // Source-cleared preparations retain their discovery label while start stays disabled.
  if (catalog.registrationRequired === true && catalog.startable === false &&
      catalog.rightsStatus === 'cleared' && catalog.testStyle === 'professional' &&
      /^https:\/\//.test(catalog.sourceUrl || '')) return 'professional'
  if (!key?.startsWith('hh-') && catalog.testStyle === 'professional' &&
      /^https:\/\//.test(definition?.source?.url || '')) return 'professional'
  return 'monitoring'
}

// Static registry integrity, not an independent external review of original
// manuals, translations, norms, rights or cutoffs. Running numeric scores and
// dimension-specific reports are exercised in the companion audit test.
export function auditTestKey({ catalog, definition } = {}) {
  if (!catalog?.startable) return Object.freeze({ status: 'reference', basis: 'reference' })
  if (!definition) return Object.freeze({ status: 'missing_definition', basis: 'unknown' })
  const questions = Array.isArray(definition.questions) ? definition.questions : []
  const ids = new Set(questions.map((question) => question.id))
  const scorer = definition.scoringKey + ':' + definition.scoringVersion
  const configuredScorer = ['configured:v1', 'pcl5-trauma:v1', 'itq-adult-trauma:v1'].includes(scorer)
  const specs = configuredScorer ? definition.scoring?.dimensions : null
  const configuredValid = !configuredScorer || (
    Array.isArray(specs) && specs.length > 0 &&
    specs.every((spec) => Array.isArray(spec.items) && spec.items.length > 0 &&
      spec.items.every((id) => ids.has(id)) &&
      (!spec.reverseItems || spec.reverseItems.every((id) => spec.items.includes(id))) &&
      Number.isFinite(spec.min) && Number.isFinite(spec.max) && spec.max > spec.min)
  )
  const keyValid = SCORERS.has(scorer) && configuredValid &&
    questions.length > 0 && ids.size === questions.length &&
    typeof definition.contentHash === 'string' && definition.contentHash.startsWith('sha256:') &&
    definition.key === catalog.key && definition.version === catalog.version
  const reportReady = Boolean(interpretationPlan(catalog.key, catalog.version))
  return Object.freeze({
    status: !keyValid ? 'key_review' : !reportReady ? 'interpretation_review' : 'ready',
    basis: catalog.key?.startsWith('hh-') ? 'authored' :
      /^https:\/\//.test(definition.source?.url || '') ? 'source_documented' : 'source_review',
    scorer,
    reportReady,
  })
}
