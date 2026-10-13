import { interpretationPlan } from './interpretation-registry.js'

// Discovery type, not a diagnosis, psychometric validation or licensing status.
// A professional instrument is only labelled as such when the registered form
// names an external source; HH-created reflections never inherit this label.
export const TEST_KINDS = Object.freeze([
  Object.freeze({ key: 'professional', label: Object.freeze({ en: 'Professional', ru: 'Профессиональные', es: 'Profesionales' }),
    description: Object.freeze({ en: 'Documented assessment instruments', ru: 'Методики с указанным источником', es: 'Instrumentos con fuente documentada' }) }),
  Object.freeze({ key: 'monitoring', label: Object.freeze({ en: 'State questionnaires', ru: 'Опросники и шкалы', es: 'Cuestionarios y escalas' }),
    description: Object.freeze({ en: 'Check-ins and measures of present experience', ru: 'Измерение состояния и самонаблюдение', es: 'Seguimiento del estado actual' }) }),
  Object.freeze({ key: 'hobby', label: Object.freeze({ en: 'Hobby & self-discovery', ru: 'Хобби и самопознание', es: 'Aficiones y autoconocimiento' }),
    description: Object.freeze({ en: 'Exploratory, non-diagnostic typologies and reflections', ru: 'Игровые и типологические исследования без диагностики', es: 'Exploración no diagnóstica' }) }),
])

// Explicit, reviewed non-validated / traditional typologies. A light visual
// style alone does not imply a hobby: most HH check-ins monitor real changes.
export const HOBBY_TEST_KEYS = Object.freeze([
  'hh-bach-flower-profile',
  'hh-socionics-32',
  'hh-enneagram-36',
  'hh-disc-style-20',
  'hh-temperaments-16',
])

const HOBBY = new Set(HOBBY_TEST_KEYS)
const SCORERS = new Set(['configured:v1', 'raw-state:v1', 'raw-dimensions:v1', 'mini-ipip-20:v1', 'bach-flower:v1', 'asrs-v1-6-classic:v1'])

export function testKindFor({ key, source, catalog, definition } = {}) {
  if (!catalog || source === 'research') return 'professional' // research/reference only, NOT runnable
  if (HOBBY.has(key)) return 'hobby'
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
  const specs = scorer === 'configured:v1' ? definition.scoring?.dimensions : null
  const configuredValid = scorer !== 'configured:v1' || (
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
