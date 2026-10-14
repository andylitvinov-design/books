// Rights-aware discovery suggestions for research-only measures.
// These are TOPIC-RELATED instruments already registered in the site, NEVER
// equivalent versions of the copyrighted measure and NEVER new scoring keys.
// Do not add an instrument here until its existing catalogue version is startable.
const BY_REFERENCE = Object.freeze({
  'who-5': ['mhc-sf', 'hh-resource-pulse'],
  'wemwbs-14': ['mhc-sf', 'hh-resource-pulse'],
  'swemwbs-7': ['mhc-sf', 'hh-resource-pulse'],
  'flourishing-scale': ['mhc-sf', 'hh-meaning-compass'],
  swls: ['hh-monthly-profile', 'hh-values-direction'],
  'promis-gmh-4': ['mhc-sf', 'phq-4'],
  'promis-gh-10': ['cdc-hrqol-4', 'hh-monthly-profile'],
  'promis-anxiety-4a': ['gad-7', 'phq-4'],
  'promis-depression-4a': ['phq-8', 'phq-4'],
  'bdi-ii': ['phq-8', 'phq-4'],
  'bai-21': ['gad-7', 'phq-4'],
  'hads-14': ['phq-4', 'phq-8'],
  'panas-20': ['hh-current-state', 'hh-emotion-clarity'],
  'spane-12': ['hh-current-state', 'hh-weekly-pulse'],
  'pss-10': ['hh-stress-weather', 'k6'],
  'pss-4': ['hh-stress-weather', 'k6'],
  'promis-sleep-4a': ['hh-sleep-reset', 'hh-evening-landing'],
  'promis-sleep-8a': ['hh-sleep-reset', 'hh-evening-landing'],
  'promis-sleep-impairment-4a': ['hh-sleep-reset', 'hh-morning-battery'],
  psqi: ['hh-sleep-reset', 'hh-evening-landing'],
  isi: ['hh-sleep-reset', 'hh-evening-landing'],
  'ru-sated': ['hh-sleep-reset', 'hh-daily-rhythm'],
  'promis-fatigue-4a': ['hh-energy-drains', 'cdc-healthy-days-symptoms'],
  'promis-fatigue-8a': ['hh-energy-drains', 'cdc-healthy-days-symptoms'],
  'promis-cognitive-4a': ['hh-focus-mode', 'hh-decision-fog'],
  'neuro-qol-cognitive-8': ['hh-focus-mode', 'hh-decision-fog'],
  'promis-pain-interference-4a': ['cdc-healthy-days-symptoms', 'hh-body-signals'],
  'brs': ['brcs', 'hh-resource-pulse'],
  'gse-10': ['hh-confidence-pulse', 'hh-start-button'],
  'maas-15': ['hh-body-signals', 'hh-tantra-presence'],
  'tas-20': ['hh-emotion-clarity', 'hh-inner-imagery'],
  'ders-16': ['erq', 'hh-emotion-clarity'],
  'ders-36': ['erq', 'hh-emotion-clarity'],
  'aaq-ii': ['hh-uncertainty-flexibility', 'hh-change-readiness'],
  'beaq-15': ['hh-change-readiness', 'hh-uncertainty-flexibility'],
  'osss-3': ['mspss', 'hh-support-seeking'],
  'djgls-6': ['hh-belonging', 'hh-social-battery'],
  'promis-social-isolation-4a': ['hh-belonging', 'mspss'],
  'promis-emotional-support-4a': ['mspss', 'hh-support-seeking'],
  'promis-companionship-4a': ['mspss', 'hh-belonging'],
  'ecr-r-36': ['hh-closeness-compass', 'hh-relationship-balance'],
  'ecr-rs-9': ['hh-closeness-compass', 'hh-relationship-balance'],
  'aas-collins-read-18': ['hh-closeness-compass', 'hh-relationship-balance'],
  'iip-32': ['hh-relationship-balance', 'hh-conflict-repair'],
  'iip-64': ['hh-relationship-balance', 'hh-conflict-repair'],
  'whodas-12': ['cdc-hrqol-4', 'hh-monthly-profile'],
  'whoqol-bref': ['hh-monthly-profile', 'cdc-hrqol-4'],
  wsas: ['hh-goal-obstacles', 'cdc-hrqol-4'],
  ors: ['hh-weekly-pulse', 'hh-monthly-profile'],
  'core-10': ['hh-weekly-pulse', 'phq-4'],
  'core-om': ['hh-monthly-profile', 'phq-4'],
  'oq-45-2': ['hh-monthly-profile', 'phq-4'],
  'reqol-10': ['hh-monthly-profile', 'mhc-sf'],
  'promis-29': ['cdc-hrqol-4', 'hh-monthly-profile'],
  cbi: ['cbi-personal', 'cbi-work'],
  mbi: ['cbi-work', 'cbi-personal'],
  'copsoq-iii': ['cbi-work', 'hh-workload-weather'],
  'stai-40': ['gad-7', 'phq-4'],
  'pswq-16': ['gad-7', 'hh-overthinking-loop'],
  'lsas-sr-24': ['hh-social-ease', 'gad-7'],
  spin: ['hh-social-ease', 'gad-7'],
  'sias-20': ['hh-social-ease', 'gad-7'],
  oasis: ['gad-7', 'hh-stress-weather'],
  odsis: ['phq-8', 'hh-weekly-pulse'],
  'ius-12': ['hh-uncertainty-flexibility', 'hh-overthinking-loop'],
  'bfi-2-60': ['ipip-big-five-50', 'mini-ipip-20'],
  'asrs-v1-18': ['asrs-6', 'hh-focus-mode'],
  'wfirs-s': ['hh-focus-mode', 'hh-goal-obstacles'],
  'cdc-hrqol-14': ['cdc-hrqol-4', 'cdc-healthy-days-symptoms'],
  'cdc-healthy-days-activity': ['cdc-hrqol-4', 'cdc-healthy-days-symptoms'],
  'srs-pcoms-4': ['hh-session-clarity'],
  'wai-sr-12': ['hh-session-clarity'],
  'csq-8': ['hh-session-clarity'],
  'rfq-8': ['hh-emotion-clarity', 'hh-closeness-compass'],
  'ptgi-21': ['hh-life-transition', 'hh-meaning-compass'],
  'mcmaster-fad-gf-12': ['hh-family-roles', 'hh-relationship-balance'],
})

const BY_AREA = Object.freeze({
  quick: ['hh-current-state', 'phq-4'],
  mood: ['phq-4', 'hh-emotion-clarity'],
  stress: ['hh-stress-weather', 'k6'],
  sleep: ['hh-sleep-reset', 'hh-evening-landing'],
  body: ['cdc-healthy-days-symptoms', 'hh-body-signals'],
  relationships: ['hh-relationship-balance', 'mspss'],
  resources: ['hh-resource-pulse', 'brcs'],
  function: ['cdc-hrqol-4', 'hh-goal-obstacles'],
  attention: ['hh-focus-mode', 'asrs-6'],
  personality: ['ipip-big-five-50', 'mini-ipip-20'],
})

// In sensitive or clinician-administered domains even a topical click-through
// can suggest an inappropriate replacement for a professional risk assessment.
// Never generate an alternative there, including when an explicit map exists.
const UNSUITABLE_AREAS = new Set(['trauma', 'substances'])
const UNSUITABLE_ACCESS = new Set(['clinician', 'managed'])
const UNSUITABLE_STATUS = new Set(['clinician_only', 'managed_safety_only'])
const ALREADY_AVAILABLE = new Set(['cleared'])

export function suggestedAvailableKeys(reference) {
  if (!reference || typeof reference.key !== 'string') return []
  if (UNSUITABLE_AREAS.has(reference.area) ||
      UNSUITABLE_ACCESS.has(reference.access) ||
      UNSUITABLE_STATUS.has(reference.rightsStatus) ||
      ALREADY_AVAILABLE.has(reference.rightsStatus)) return []
  return Object.freeze([...(BY_REFERENCE[reference.key] || BY_AREA[reference.area] || [])])
}

export function availableRelatedTests(reference, activeEntries) {
  const active = new Map(activeEntries.filter((entry) => entry?.selectable).map((entry) => [entry.key, entry]))
  const unique = new Set()
  return Object.freeze(suggestedAvailableKeys(reference).flatMap((key) => {
    const entry = active.get(key)
    if (!entry || entry.key === reference.key || unique.has(key)) return []
    unique.add(key)
    return [Object.freeze({
      key, title: entry.title, testKind: entry.testKind,
      instrumentLocale: entry.catalog?.instrumentLocale || 'en',
    })]
  }).slice(0, 2))
}
