import { deepFreeze } from '../../lib/assessments/contracts.js'
import { EXPANDED_CATALOG_V2 } from './catalog-v2.js'

export const MONITORING_AXES = deepFreeze([
  'state',
  'symptoms',
  'function',
  'resources',
  'baseline',
])

export const MONITORING_CATALOG = deepFreeze([
  {
    key: 'hh-current-state',
    version: 'v2',
    instrumentLocale: 'dynamic',
    axis: 'state',
    resultAxes: ['state'],
    topics: ['mood', 'stress', 'energy', 'body'],
    moodAffinities: ['sad', 'neutral', 'happy'],
    categoryAffinities: ['body', 'energy', 'emotions', 'relationships', 'work-money', 'other'],
    questionCount: 5,
    durationMinutes: 1,
    testStyle: 'engaging',
    testLength: 'short',
    suggestedRepeatDays: 7,
    cooldownDays: 3,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'stress', weight: 0.85 }, { key: 'mood', weight: 0.7 }, { key: 'energy', weight: 0.75 },
      { key: 'functioning', weight: 0.65 }, { key: 'clarity', weight: 0.45 }, { key: 'resource', weight: 0.55 },
    ],
    title: { en: 'Current State Check', ru: 'Состояние сейчас' },
    description: {
      en: 'A short check of difficulty, resource, tension, fatigue and daily-life impact.',
      ru: 'Короткий замер трудности, ресурса, напряжения, усталости и влияния на повседневную жизнь.',
    },
  },
  {
    key: 'mini-ipip-20',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'baseline',
    resultAxes: ['baseline'],
    topics: ['personality'],
    moodAffinities: [],
    categoryAffinities: [],
    questionCount: 20,
    durationMinutes: 3,
    testStyle: 'professional',
    testLength: 'comprehensive',
    suggestedRepeatDays: null,
    cooldownDays: null,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'personality', weight: 1 }, { key: 'relationships', weight: 0.55 }, { key: 'emotional_regulation', weight: 0.55 },
      { key: 'focus', weight: 0.5 }, { key: 'functioning', weight: 0.45 },
    ],
    title: { en: 'Personality Baseline', ru: 'Личностный baseline' },
    description: {
      en: 'A separate baseline of broad personality tendencies using the English Mini-IPIP original.',
      ru: 'Отдельный baseline общих личностных тенденций по английскому оригиналу Mini-IPIP.',
    },
  },
  {
    key: 'hh-weekly-pulse',
    version: 'v1',
    instrumentLocale: 'dynamic',
    axis: 'state',
    resultAxes: ['state', 'symptoms', 'function', 'resources'],
    topics: ['mood', 'stress', 'sleep', 'energy', 'support'],
    moodAffinities: ['sad', 'neutral', 'happy'],
    categoryAffinities: ['body', 'energy', 'emotions', 'relationships', 'work-money', 'other'],
    questionCount: 8,
    durationMinutes: 2,
    testStyle: 'engaging',
    testLength: 'medium',
    suggestedRepeatDays: 7,
    cooldownDays: 5,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'stress', weight: 0.85 }, { key: 'mood', weight: 0.7 }, { key: 'sleep', weight: 0.9 },
      { key: 'energy', weight: 0.85 }, { key: 'relationships', weight: 0.5 }, { key: 'resource', weight: 0.7 },
      { key: 'functioning', weight: 0.65 }, { key: 'emotional_regulation', weight: 0.55 },
    ],
    title: { en: 'Weekly Psychic Health', ru: 'Психическое состояние за неделю' },
    description: {
      en: 'Original Holistic House weekly self-monitoring across state, symptoms, function and resources.',
      ru: 'Оригинальный еженедельный Holistic House check-in состояния, симптомов, функционирования и ресурсов.',
    },
  },
  {
    key: 'phq-4',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'symptoms',
    resultAxes: ['symptoms'],
    topics: ['mood', 'anxiety'],
    moodAffinities: ['sad', 'neutral'],
    categoryAffinities: ['emotions', 'relationships', 'other'],
    questionCount: 4,
    durationMinutes: 1,
    testStyle: 'professional',
    testLength: 'short',
    suggestedRepeatDays: 14,
    cooldownDays: 7,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'mood', weight: 0.95 }, { key: 'anxiety', weight: 0.95 }, { key: 'stress', weight: 0.55 }, { key: 'functioning', weight: 0.35 },
    ],
    title: { en: 'Mood & Anxiety — 1 Minute', ru: 'Настроение и тревога — 1 минута · EN' },
    description: {
      en: 'A very short professional screening signal for mood and anxiety. Not a diagnosis.',
      ru: 'Очень короткий профессиональный скрининг настроения и тревоги. Не диагноз; вопросы на английском.',
    },
  },
  {
    key: 'k6',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'symptoms',
    resultAxes: ['symptoms'],
    topics: ['stress', 'mood', 'function'],
    moodAffinities: ['sad', 'neutral'],
    categoryAffinities: ['energy', 'work-money', 'emotions', 'other'],
    questionCount: 6,
    durationMinutes: 2,
    testStyle: 'professional',
    testLength: 'short',
    suggestedRepeatDays: 30,
    cooldownDays: 14,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'stress', weight: 0.9 }, { key: 'mood', weight: 0.75 }, { key: 'functioning', weight: 0.6 },
      { key: 'energy', weight: 0.45 }, { key: 'emotional_regulation', weight: 0.45 },
    ],
    title: { en: 'Mental Load', ru: 'Психологическая нагрузка · EN' },
    description: {
      en: 'A short K6 measure of non-specific psychological distress over the past 30 days.',
      ru: 'Короткая шкала K6 общей психологической нагрузки за последние 30 дней; вопросы на английском.',
    },
  },
  {
    key: 'phq-9',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'symptoms',
    resultAxes: ['symptoms'],
    topics: ['mood'],
    moodAffinities: ['sad'],
    categoryAffinities: ['emotions'],
    questionCount: 9,
    durationMinutes: 2,
    testStyle: 'professional',
    testLength: 'medium',
    suggestedRepeatDays: 14,
    cooldownDays: 7,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: false,
    free: true,
    analysisAxes: [
      { key: 'mood', weight: 1 }, { key: 'sleep', weight: 0.65 }, { key: 'energy', weight: 0.7 },
      { key: 'focus', weight: 0.6 }, { key: 'self_support', weight: 0.45 }, { key: 'functioning', weight: 0.7 },
    ],
    title: { en: 'Mood Deep Dive', ru: 'Глубокая проверка настроения · EN' },
    description: {
      en: 'A deeper PHQ-9 mood symptom check with an explicit safety question. Not a diagnosis.',
      ru: 'Более глубокая шкала PHQ-9 с прямым вопросом безопасности. Не диагноз; вопросы на английском.',
    },
  },
  {
    key: 'gad-7',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'symptoms',
    resultAxes: ['symptoms'],
    topics: ['anxiety'],
    moodAffinities: ['sad', 'neutral'],
    categoryAffinities: ['emotions'],
    questionCount: 7,
    durationMinutes: 2,
    testStyle: 'professional',
    testLength: 'medium',
    suggestedRepeatDays: 14,
    cooldownDays: 7,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'anxiety', weight: 1 }, { key: 'stress', weight: 0.75 }, { key: 'emotional_regulation', weight: 0.6 },
      { key: 'sleep', weight: 0.35 }, { key: 'focus', weight: 0.35 },
    ],
    title: { en: 'Anxiety Deep Dive', ru: 'Глубокая проверка тревожности · EN' },
    description: {
      en: 'A GAD-7 check of anxiety symptom intensity over the past two weeks.',
      ru: 'Шкала GAD-7 выраженности тревожных симптомов за две недели; вопросы на английском.',
    },
  },
  {
    key: 'hh-resource-pulse',
    version: 'v1',
    instrumentLocale: 'dynamic',
    axis: 'resources',
    resultAxes: ['resources'],
    topics: ['energy', 'support', 'self-support', 'meaning'],
    moodAffinities: ['happy', 'neutral'],
    categoryAffinities: ['energy', 'relationships', 'emotions', 'other'],
    questionCount: 6,
    durationMinutes: 1,
    testStyle: 'engaging',
    testLength: 'short',
    suggestedRepeatDays: 14,
    cooldownDays: 7,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'resource', weight: 1 }, { key: 'energy', weight: 0.85 }, { key: 'self_support', weight: 0.9 },
      { key: 'relationships', weight: 0.65 }, { key: 'meaning', weight: 0.85 }, { key: 'emotional_regulation', weight: 0.5 },
    ],
    title: { en: 'Resources & Inner Support', ru: 'Ресурс и внутренняя опора' },
    description: {
      en: 'Original Holistic House self-monitoring of energy, support, connection, agency and meaning.',
      ru: 'Оригинальный Holistic House замер энергии, внутренней опоры, связи, влияния и смысла.',
    },
  },
  {
    key: 'hh-monthly-profile',
    version: 'v1',
    instrumentLocale: 'dynamic',
    axis: 'resources',
    resultAxes: ['resources', 'function'],
    topics: ['body', 'relationships', 'work', 'meaning', 'support'],
    moodAffinities: ['happy', 'neutral'],
    categoryAffinities: ['body', 'energy', 'relationships', 'work-money', 'other'],
    questionCount: 18,
    durationMinutes: 5,
    testStyle: 'engaging',
    testLength: 'comprehensive',
    suggestedRepeatDays: 30,
    cooldownDays: 21,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'functioning', weight: 0.9 }, { key: 'relationships', weight: 0.85 }, { key: 'energy', weight: 0.65 },
      { key: 'resource', weight: 0.75 }, { key: 'meaning', weight: 0.8 }, { key: 'clarity', weight: 0.55 }, { key: 'self_support', weight: 0.45 },
    ],
    title: { en: 'Monthly Life Profile', ru: 'Профиль месяца' },
    description: {
      en: 'A broader monthly Holistic House profile of self, relationships, body, work, meaning and support.',
      ru: 'Более широкий месячный профиль Holistic House: я, отношения, тело, работа, смысл и поддержка.',
    },
  },
  {
    "key": "phq-2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "mood"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "categoryAffinities": [
      "emotions"
    ],
    "questionCount": 2,
    "durationMinutes": 1,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Mood Quick Check",
      "ru": "Быстрая проверка настроения · EN"
    },
    "description": {
      "en": "Two-item PHQ-2 depression screening signal. Not a diagnosis.",
      "ru": "Короткий профессиональный PHQ-2 скрининг настроения; вопросы на английском. Не диагноз."
    }
  },
  {
    "key": "gad-2",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "anxiety"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "categoryAffinities": [
      "emotions"
    ],
    "questionCount": 2,
    "durationMinutes": 1,
    "testStyle": "professional",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Anxiety Quick Check",
      "ru": "Быстрая проверка тревоги · EN"
    },
    "description": {
      "en": "Two-item GAD-2 anxiety screening signal. Not a diagnosis.",
      "ru": "Короткий профессиональный GAD-2 скрининг тревоги; вопросы на английском. Не диагноз."
    }
  },
  {
    "key": "k10",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "symptoms",
    "resultAxes": [
      "symptoms"
    ],
    "topics": [
      "stress",
      "mood",
      "function"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "categoryAffinities": [
      "energy",
      "work-money",
      "emotions",
      "other"
    ],
    "questionCount": 10,
    "durationMinutes": 3,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": 30,
    "cooldownDays": 14,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Mental Load — Full K10",
      "ru": "Психологическая нагрузка K10 · EN"
    },
    "description": {
      "en": "Full K10 measure of non-specific psychological distress over the past 30 days.",
      "ru": "Полная шкала K10 общей психологической нагрузки за последние 30 дней; вопросы на английском."
    }
  },
  {
    "key": "hh-social-battery",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "relationships",
      "support",
      "energy"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "categoryAffinities": [
      "relationships",
      "energy",
      "emotions"
    ],
    "questionCount": 6,
    "durationMinutes": 1,
    "testStyle": "engaging",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 5,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Your Social Battery",
      "ru": "Твоя социальная батарейка"
    },
    "description": {
      "en": "A playful check of social energy, space and connection.",
      "ru": "Лёгкая проверка социальной энергии, потребности в пространстве и контакте."
    }
  },
  {
    "key": "hh-focus-mode",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "function",
    "resultAxes": [
      "function"
    ],
    "topics": [
      "function",
      "work",
      "attention",
      "energy"
    ],
    "moodAffinities": [
      "neutral",
      "happy",
      "sad"
    ],
    "categoryAffinities": [
      "work-money",
      "energy",
      "other"
    ],
    "questionCount": 6,
    "durationMinutes": 1,
    "testStyle": "engaging",
    "testLength": "short",
    "suggestedRepeatDays": 7,
    "cooldownDays": 3,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Focus Mode",
      "ru": "Режим фокуса"
    },
    "description": {
      "en": "A quick playful read on focus readiness and task momentum.",
      "ru": "Быстрая игровая проверка готовности к фокусу и движению по задачам."
    }
  },
  {
    "key": "hh-stress-weather",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "state",
    "resultAxes": [
      "state"
    ],
    "topics": [
      "stress",
      "body",
      "relationships"
    ],
    "moodAffinities": [
      "sad",
      "neutral"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "emotions",
      "relationships",
      "work-money"
    ],
    "questionCount": 6,
    "durationMinutes": 1,
    "testStyle": "engaging",
    "testLength": "short",
    "suggestedRepeatDays": 7,
    "cooldownDays": 3,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Stress Weather",
      "ru": "Погода стресса"
    },
    "description": {
      "en": "A playful snapshot of how stress is showing up in body, mind and contact.",
      "ru": "Лёгкий снимок того, как стресс проявляется в теле, мыслях и контакте."
    }
  },
  {
    "key": "hh-recharge-decoder",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "sleep",
      "recovery",
      "energy",
      "support"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "categoryAffinities": [
      "body",
      "energy",
      "relationships",
      "other"
    ],
    "questionCount": 8,
    "durationMinutes": 2,
    "testStyle": "engaging",
    "testLength": "medium",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Recharge Decoder",
      "ru": "Декодер восстановления"
    },
    "description": {
      "en": "See which forms of rest are actually restoring you this week.",
      "ru": "Посмотрите, какие формы отдыха действительно восстанавливают вас на этой неделе."
    }
  },
  {
    "key": "hh-boundary-radar",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "relationships",
      "support",
      "self-support"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "categoryAffinities": [
      "relationships",
      "emotions",
      "other"
    ],
    "questionCount": 8,
    "durationMinutes": 2,
    "testStyle": "engaging",
    "testLength": "medium",
    "suggestedRepeatDays": 14,
    "cooldownDays": 7,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Boundary Radar",
      "ru": "Радар границ"
    },
    "description": {
      "en": "A playful reflection on noticing, expressing and respecting boundaries.",
      "ru": "Лёгкая рефлексия о том, как вы замечаете, обозначаете и уважаете границы."
    }
  },
  {
    "key": "hh-tiny-joys",
    "version": "v1",
    "instrumentLocale": "dynamic",
    "axis": "resources",
    "resultAxes": [
      "resources"
    ],
    "topics": [
      "mood",
      "recovery",
      "energy",
      "support"
    ],
    "moodAffinities": [
      "happy",
      "neutral",
      "sad"
    ],
    "categoryAffinities": [
      "energy",
      "relationships",
      "emotions",
      "other"
    ],
    "questionCount": 6,
    "durationMinutes": 1,
    "testStyle": "engaging",
    "testLength": "short",
    "suggestedRepeatDays": 14,
    "cooldownDays": 5,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "title": {
      "en": "Tiny Joys Scanner",
      "ru": "Сканер маленьких радостей"
    },
    "description": {
      "en": "A light check for small sources of pleasure, curiosity and warmth.",
      "ru": "Лёгкая проверка маленьких источников удовольствия, любопытства и тепла."
    }
  },
  ...EXPANDED_CATALOG_V2,
  {
    key: 'mspss',
    version: 'v1',
    instrumentLocale: 'en',
    axis: 'resources',
    resultAxes: ['resources'],
    topics: ['support', 'relationships'],
    moodAffinities: ['happy', 'neutral', 'sad'],
    categoryAffinities: ['relationships'],
    questionCount: 12,
    durationMinutes: 3,
    testStyle: 'professional',
    testLength: 'comprehensive',
    suggestedRepeatDays: 30,
    cooldownDays: 14,
    startable: true,
    access: 'account',
    rightsStatus: 'cleared',
    title: { en: 'Social Support Profile', ru: 'Социальная поддержка · EN' },
    description: {
      en: 'Professional MSPSS profile of perceived support from family, friends and a significant person.',
      ru: 'Профессиональный MSPSS-профиль воспринимаемой поддержки; вопросы на английском.',
    },
  },
  {
    key: 'scs-sf',
    version: 'source-controlled',
    instrumentLocale: 'source-controlled',
    axis: 'resources',
    topics: ['self-support', 'recovery'],
    moodAffinities: ['happy', 'neutral'],
    categoryAffinities: ['emotions', 'other'],
    questionCount: 12,
    durationMinutes: 3,
    suggestedRepeatDays: 30,
    cooldownDays: 14,
    startable: false,
    access: 'account',
    rightsStatus: 'review_required',
    title: { en: 'Self-Compassion', ru: 'Внутренняя поддержка' },
    description: {
      en: 'Resource measure metadata; start remains disabled until source and rights review.',
      ru: 'Метаданные ресурсной шкалы; запуск отключён до проверки источника и прав.',
    },
  },
  {
    key: 'functioning-review',
    version: 'planned',
    instrumentLocale: 'dynamic',
    axis: 'function',
    topics: ['function', 'work', 'relationships'],
    moodAffinities: [],
    categoryAffinities: ['work-money', 'relationships', 'body'],
    questionCount: null,
    durationMinutes: null,
    suggestedRepeatDays: null,
    cooldownDays: null,
    startable: false,
    access: 'account',
    rightsStatus: 'review_required',
    title: { en: 'Daily Functioning', ru: 'Повседневное функционирование' },
    description: {
      en: 'Reserved for a rights-cleared functioning measure; no questionnaire is exposed yet.',
      ru: 'Место для проверенной шкалы функционирования; опросник пока не публикуется.',
    },
  },
])

export function activeMonitoringTestCounts() {
  const active = MONITORING_CATALOG.filter((item) => item.startable)
  return {
    total: active.length,
    engaging: active.filter((item) => item.testStyle === 'engaging').length,
    professional: active.filter((item) => item.testStyle === 'professional').length,
    short: active.filter((item) => item.testLength === 'short').length,
    medium: active.filter((item) => item.testLength === 'medium').length,
    comprehensive: active.filter((item) => item.testLength === 'comprehensive').length,
  }
}

export function monitoringCatalogItem(key) {
  return MONITORING_CATALOG.find((item) => item.key === key) || null
}
