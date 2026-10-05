import { deepFreeze } from '../../lib/assessments/contracts.js'

const hh = (value) => ({ en: value.en, ru: value.ru })

export const ASSESSMENT_CATALOG = deepFreeze([
  {
    key: 'hh-current-state', version: 'v2', level: 'quick', category: 'state',
    definitionLocales: ['en','ru'], guestEligible: true, startable: true, access: 'public',
    questionCount: 5, duration: '~1 min', cooldownDays: 7, axis: 'state',
    moodAffinity: ['sad','neutral'], categoryAffinity: ['body','energy','emotions','other'],
    rightsStatus: 'cleared', sourceUrl: 'internal:Holistic-House',
    title: hh({ en: 'Current State Check', ru: 'Состояние сейчас' }),
    description: hh({ en: 'A short Holistic House self-check of difficulty, resource, tension, fatigue and life impact.', ru: 'Короткая самооценка Holistic House: трудность, ресурс, напряжение, усталость и влияние на жизнь.' }),
  },
  {
    key: 'phq-4', version: 'v1', level: 'gentle', category: 'mood-anxiety',
    definitionLocales: ['en'], guestEligible: true, startable: true, access: 'public',
    questionCount: 4, duration: '~1 min', cooldownDays: 14, axis: 'symptoms',
    moodAffinity: ['sad','neutral'], categoryAffinity: ['emotions','other'],
    rightsStatus: 'cleared', sourceUrl: 'https://www.nih.gov/node/21506',
    title: hh({ en: 'Mood & Anxiety — 1 Minute', ru: 'Настроение и тревога — 1 минута · EN' }),
    description: hh({ en: 'A very short professional screening signal for mood and anxiety. Not a diagnosis.', ru: 'Очень короткий профессиональный скрининг настроения и тревоги. Не диагноз. Вопросы на английском.' }),
  },
  {
    key: 'hh-weekly-pulse', version: 'v1', level: 'weekly', category: 'monitoring',
    definitionLocales: ['en','ru'], guestEligible: true, startable: true, access: 'public',
    questionCount: 8, duration: '~2 min', cooldownDays: 7, axis: 'state',
    moodAffinity: ['sad','neutral','happy'], categoryAffinity: ['body','energy','emotions','relationships','work-money','other'],
    rightsStatus: 'cleared', sourceUrl: 'internal:Holistic-House',
    title: hh({ en: 'Weekly Psychic Health', ru: 'Психическое состояние за неделю' }),
    description: hh({ en: 'Track mood, tension, load, sleep, energy, clarity, connection and functioning across the week.', ru: 'Отследите настроение, напряжение, нагрузку, сон, энергию, ясность, связь и функционирование за неделю.' }),
  },
  {
    key: 'k6', version: 'v1', level: 'core', category: 'distress',
    definitionLocales: ['en'], guestEligible: true, startable: true, access: 'public',
    questionCount: 6, duration: '1–2 min', cooldownDays: 30, axis: 'symptoms',
    moodAffinity: ['sad','neutral'], categoryAffinity: ['energy','emotions','work-money','other'],
    rightsStatus: 'cleared', sourceUrl: 'https://rckessler.scholars.harvard.edu/k10-and-k6-scales',
    title: hh({ en: 'Mental Load', ru: 'Психологическая нагрузка · EN' }),
    description: hh({ en: 'A short measure of non-specific psychological distress over the past 30 days.', ru: 'Короткая оценка общей психологической нагрузки за последние 30 дней. Вопросы на английском.' }),
  },
  {
    key: 'phq-9', version: 'v1', level: 'deep', category: 'mood',
    definitionLocales: ['en'], guestEligible: false, startable: true, access: 'account',
    questionCount: 9, duration: '~2 min', cooldownDays: 14, axis: 'symptoms',
    moodAffinity: ['sad'], categoryAffinity: ['emotions'],
    rightsStatus: 'cleared', sourceUrl: 'https://cde.nlm.nih.gov/formView?tinyId=mJsGoMU1m',
    title: hh({ en: 'Mood Deep Dive', ru: 'Глубокая проверка настроения · EN' }),
    description: hh({ en: 'Track depressive symptom burden over the past two weeks. Includes an explicit safety question.', ru: 'Более глубокая оценка симптомов за две недели. Есть прямой вопрос безопасности; вопросы на английском.' }),
  },
  {
    key: 'gad-7', version: 'v1', level: 'deep', category: 'anxiety',
    definitionLocales: ['en'], guestEligible: false, startable: true, access: 'account',
    questionCount: 7, duration: '1–2 min', cooldownDays: 14, axis: 'symptoms',
    moodAffinity: ['sad','neutral'], categoryAffinity: ['emotions'],
    rightsStatus: 'cleared', sourceUrl: 'https://www.nih.gov/node/19876',
    title: hh({ en: 'Anxiety Deep Dive', ru: 'Глубокая проверка тревожности · EN' }),
    description: hh({ en: 'Track anxiety symptom intensity over the past two weeks.', ru: 'Оценка выраженности тревожных симптомов за две недели. Вопросы на английском.' }),
  },
  {
    key: 'hh-resource-pulse', version: 'v1', level: 'resource', category: 'resources',
    definitionLocales: ['en','ru'], guestEligible: true, startable: true, access: 'public',
    questionCount: 6, duration: '~1 min', cooldownDays: 14, axis: 'resources',
    moodAffinity: ['happy','neutral'], categoryAffinity: ['energy','relationships','emotions','other'],
    rightsStatus: 'cleared', sourceUrl: 'internal:Holistic-House',
    title: hh({ en: 'Resources & Inner Support', ru: 'Ресурс и внутренняя опора' }),
    description: hh({ en: 'Notice energy, self-support, connection, agency and meaning.', ru: 'Отметьте энергию, внутреннюю опору, связь, влияние и смысл.' }),
  },
  {
    key: 'hh-monthly-profile', version: 'v1', level: 'monthly', category: 'resources',
    definitionLocales: ['en','ru'], guestEligible: false, startable: true, access: 'account',
    questionCount: 18, duration: '4–5 min', cooldownDays: 30, axis: 'resources',
    moodAffinity: ['happy','neutral'], categoryAffinity: ['body','energy','relationships','work-money','other'],
    rightsStatus: 'cleared', sourceUrl: 'internal:Holistic-House',
    title: hh({ en: 'Monthly Life Profile', ru: 'Профиль месяца' }),
    description: hh({ en: 'A broader monthly view of self, relationships, body, work, meaning and support.', ru: 'Более широкий профиль месяца: я, отношения, тело, работа, смысл и поддержка.' }),
  },
  {
    key: 'mini-ipip-20', version: 'v1', level: 'baseline', category: 'traits',
    definitionLocales: ['en'], guestEligible: true, startable: true, access: 'public',
    questionCount: 20, duration: '~3 min', cooldownDays: 90, axis: 'trait',
    moodAffinity: [], categoryAffinity: [],
    rightsStatus: 'cleared', sourceUrl: 'https://www.ipip.ori.org/MiniIPIPKey.htm',
    title: hh({ en: 'Personality Baseline', ru: 'Личностный профиль · EN' }),
    description: hh({ en: 'A brief public-domain self-report of broad personality tendencies.', ru: 'Краткий опрос общих личностных тенденций. Оригинал на английском.' }),
  },

  // Professional/specialty metadata. These stay non-startable until rights, language
  // and safety gates are individually verified and a definition is registered.
  ...[
    ['core-10','CORE-10','CORE-10','professional','review_required'],
    ['oq-45-2','OQ-45.2','OQ-45.2','professional','licensed'],
    ['pcl-5','PCL-5','PCL-5','specialty','review_required'],
    ['itq','International Trauma Questionnaire','ITQ','specialty','review_required'],
    ['asrs-6','Adult ADHD Self-Report Screener','ASRS-6','specialty','review_required'],
    ['audit-c','AUDIT-C','AUDIT-C','specialty','review_required'],
    ['audit','AUDIT','AUDIT','specialty','review_required'],
    ['assist','ASSIST','ASSIST','specialty','review_required'],
    ['c-ssrs','C-SSRS Screener','C-SSRS','clinician','clinician_only'],
    ['mmpi-3','MMPI-3','MMPI-3','clinician','licensed'],
    ['pai','PAI','PAI','clinician','licensed'],
    ['mini','MINI','MINI','clinician','licensed'],
  ].map(([key,en,ru,level,rightsStatus]) => ({
    key, version: 'reference', level, category: 'professional', definitionLocales: [],
    guestEligible: false, startable: false, access: 'clinician', questionCount: null,
    duration: null, cooldownDays: null, axis: 'context', moodAffinity: [], categoryAffinity: [],
    rightsStatus, sourceUrl: null, title: hh({ en, ru }), description: hh({ en: 'Professional reference — not available as a self-service test.', ru: 'Профессиональный инструмент — недоступен как обычный самостоятельный тест.' }),
  })),
])

const byKey = new Map(ASSESSMENT_CATALOG.map((entry) => [entry.key, entry]))

export function getAssessmentCatalogEntry(key) {
  return byKey.get(key) || null
}

export function catalogTitle(entry, locale = 'en') {
  return entry?.title?.[locale] || entry?.title?.en || entry?.key || ''
}

export function catalogDescription(entry, locale = 'en') {
  return entry?.description?.[locale] || entry?.description?.en || ''
}

export function definitionLocaleFor(entry, uiLocale = 'en') {
  if (!entry) return null
  if (entry.definitionLocales.includes(uiLocale)) return uiLocale
  return entry.definitionLocales[0] || null
}

export function startableCatalog({ guest = false } = {}) {
  return ASSESSMENT_CATALOG.filter((entry) => entry.startable && (!guest || entry.guestEligible))
}
