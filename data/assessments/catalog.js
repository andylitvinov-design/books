import { HH_SPLIT_V2_KEYS } from './hh-split-reflections-v2.js'
import { IPIP_FIVE_CATALOG } from './ipip-five-2026.js'
import { IPIP_THREE_CATALOG } from './ipip-three-2026.js'
import { TRAUMA_SCREENING_CATALOG } from './trauma-screening-catalog-2026.js'
import { ASRS6_CATALOG } from './asrs-v1-6-nyu.js'
import { deepFreeze } from '../../lib/assessments/contracts.js'
import { EXPANDED_CATALOG_V2 } from './catalog-v2.js'
import { EXPANDED_CATALOG_V3 } from './expanded-battery-v3.js'
import { EXPANDED_CATALOG_V4 } from './expanded-battery-v4.js'
import { RELATIONSHIPS_INTIMACY_CATALOG } from './relationships-intimacy-v1.js'
import { TANTRIC_REFLECTION_CATALOG } from './tantric-reflections-v1.js'
import { PROFESSIONAL_BATTERY_2026_CATALOG } from './professional-battery-2026.js'
import { CDC_HEALTHY_DAYS_CATALOG } from './cdc-healthy-days-2026.js'
import { PROFESSIONAL_BATTERY_2026_B_CATALOG } from './professional-battery-2026-b.js'
import { IPIP_BIG_FIVE_50_CATALOG } from './ipip-big-five-50-en-v1.js'
import { PERSONALITY_TYPE_CATALOG } from './personality-types-original-2026.js'
import { COMPASSION_CATALOG } from './compassion-2026.js'
import { MHC_SF_CATALOG } from './mhc-sf-adult-dec2011.js'
import { OPEN_PROFESSIONAL_2026_CATALOG } from './open-professional-2026.js'
import { IPIP_VIA_R_COMPLETION_CATALOG } from './ipip-via-r-completion-2026.js'
import { IPIP_VIA_R_PROFILE_96_CATALOG } from './ipip-via-r-profile-96.js'
import { CFPB_FINANCIAL_WELLBEING_SHORT_CATALOG } from './cfpb-financial-wellbeing-short-v1.js'

export const MONITORING_AXES = deepFreeze([
  'state',
  'symptoms',
  'function',
  'resources',
  'baseline',
])

export const MONITORING_CATALOG = deepFreeze([
  ...IPIP_FIVE_CATALOG,
  ...IPIP_THREE_CATALOG,
  ...TRAUMA_SCREENING_CATALOG,
  {
    key: 'hh-bach-flower-profile',
    version: 'v2',
    instrumentLocale: 'dynamic',
    axis: 'state',
    resultAxes: ['state'],
    topics: ['mood', 'stress', 'anxiety', 'relationships', 'personality', 'resources'],
    moodAffinities: ['sad', 'neutral', 'happy'],
    categoryAffinities: ['emotions', 'relationships', 'body', 'other'],
    questionCount: 115,
    durationMinutes: 18,
    testStyle: 'engaging',
    testLength: 'comprehensive',
    suggestedRepeatDays: 14,
    cooldownDays: 7,
    startable: true,
    starterEligible: false, // An 18-minute questionnaire should never auto-fill the quick starter set.
    access: 'account',
    rightsStatus: 'cleared',
    guestEligible: true,
    free: true,
    analysisAxes: [
      { key: 'emotional_regulation', weight: 1 },
      { key: 'mood', weight: 0.9 },
      { key: 'stress', weight: 0.85 },
      { key: 'personality', weight: 0.65 },
      { key: 'relationships', weight: 0.65 },
      { key: 'self_support', weight: 0.6 },
    ],
    title: { en: 'Bach Flower Emotional Profile', ru: 'Эмоциональный профиль по Баху', es: 'Perfil emocional de flores de Bach' },
    description: {
      en: 'An in-depth reflection on 115 emotional statements across situation, recurring patterns and support, with traditional Bach flower-theme matches. Not a medical test or prescription.',
      ru: '115 утверждений о текущей ситуации, устойчивых паттернах и эмоциональной поддержке с сопоставлением традиционных тем 38 эссенций Баха. Не является диагностикой или назначением.',
      es: 'Reflexión detallada sobre 115 afirmaciones relativas a situaciones, patrones recurrentes y apoyo emocional, con asociaciones temáticas tradicionales de las flores de Bach. No es una prueba médica ni una prescripción.',
    },
  },
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
    title: { en: 'Current State Check', ru: 'Состояние сейчас', es: 'Chequeo del estado actual' },
    description: {
      en: 'A short check of difficulty, resource, tension, fatigue and daily-life impact.',
      ru: 'Короткий замер трудности, ресурса, напряжения, усталости и влияния на повседневную жизнь.',
      es: 'Chequeo breve de dificultades, recursos, tensión, cansancio y su impacto en la vida cotidiana.',
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
    title: { en: 'Personality Baseline', ru: 'Личностный baseline', es: 'Perfil inicial de personalidad' },
    description: {
      en: 'A separate baseline of broad personality tendencies using the English Mini-IPIP original.',
      ru: 'Отдельный baseline общих личностных тенденций по английскому оригиналу Mini-IPIP.',
      es: 'Perfil de tendencias generales de personalidad basado en el cuestionario original Mini-IPIP en inglés. No constituye un diagnóstico.',
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
    title: { en: 'Weekly Wellbeing Check-in', ru: 'Самочувствие за неделю', es: 'Bienestar de la semana' },
    description: {
      en: 'Original Holistic House weekly self-monitoring across state, symptoms, function and resources.',
      ru: 'Оригинальный еженедельный Holistic House check-in состояния, симптомов, функционирования и ресурсов.',
      es: 'Registro semanal original de autoobservación de Holistic House sobre estado emocional, síntomas, funcionamiento cotidiano y recursos. No es una evaluación clínica validada.',
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
    title: { en: 'Mood & Anxiety — 1 Minute', ru: 'Настроение и тревога — 1 минута · EN', es: 'Ánimo y ansiedad — 1 minuto · EN' },
    description: {
      en: 'A very short professional screening signal for mood and anxiety. Not a diagnosis.',
      ru: 'Очень короткий профессиональный скрининг настроения и тревоги. Не диагноз; вопросы на английском.',
      es: 'Breve cribado de síntomas relacionados con el ánimo y la ansiedad mediante PHQ-4. Preguntas en inglés; no es un diagnóstico.',
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
    title: { en: 'Mental Load', ru: 'Психологическая нагрузка · EN', es: 'Malestar psicológico · EN' },
    description: {
      en: 'A short K6 measure of non-specific psychological distress over the past 30 days.',
      ru: 'Короткая шкала K6 общей психологической нагрузки за последние 30 дней; вопросы на английском.',
      es: 'Breve escala K6 de malestar psicológico inespecífico durante los últimos 30 días. Preguntas en inglés; no es un diagnóstico.',
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
    title: { en: 'Mood Deep Dive', ru: 'Глубокая проверка настроения · EN', es: 'Síntomas del ánimo en profundidad · EN' },
    description: {
      en: 'A deeper PHQ-9 mood symptom check with an explicit safety question. Not a diagnosis.',
      ru: 'Более глубокая шкала PHQ-9 с прямым вопросом безопасности. Не диагноз; вопросы на английском.',
      es: 'Cuestionario PHQ-9 sobre síntomas depresivos, con una pregunta explícita de seguridad. Preguntas en inglés; no es un diagnóstico.',
    },
  },
  {
    key: 'gad-7',
    version: 'v1',
    instrumentLocale: 'dynamic',
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
    title: { en: 'Anxiety Deep Dive', ru: 'Тревожность · GAD-7 · 7 вопросов', es: 'Ansiedad en profundidad · GAD-7' },
    description: {
      en: 'A GAD-7 check of anxiety symptom intensity over the past two weeks.',
      ru: 'GAD-7 за последние две недели. Русская версия Holistic House — отдельный перевод, не прошедший самостоятельную психометрическую валидацию.',
      es: 'Chequeo GAD-7 de síntomas de ansiedad durante las últimas dos semanas. La versión rusa de Holistic House es una traducción sin validación psicométrica independiente.',
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
    title: { en: 'Resources & Inner Support', ru: 'Ресурс и внутренняя опора', es: 'Recursos y apoyo personal' },
    description: {
      en: 'Original Holistic House self-monitoring of energy, support, connection, agency and meaning.',
      ru: 'Оригинальный Holistic House замер энергии, внутренней опоры, связи, влияния и смысла.',
      es: 'Autoobservación original de Holistic House sobre energía, apoyo disponible, vínculos, capacidad de actuar y sentido personal. No es una prueba clínica validada.',
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
    title: { en: 'Monthly Life Profile', ru: 'Профиль месяца', es: 'Perfil mensual de vida' },
    description: {
      en: 'A broader monthly Holistic House profile of self, relationships, body, work, meaning and support.',
      ru: 'Более широкий месячный профиль Holistic House: я, отношения, тело, работа, смысл и поддержка.',
      es: 'Autoobservación mensual de Holistic House sobre la relación con uno mismo, vínculos, cuerpo, trabajo, sentido y apoyo disponible.',
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
  ...EXPANDED_CATALOG_V2.map(item => HH_SPLIT_V2_KEYS.includes(item.key)
    ? { ...item, version: 'v2', resultAxes: item.key === 'hh-screen-saturation' ? ['state'] : ['state', 'resources'],
      description: {
        en: 'Original non-clinical reflection: difficulty and coping or context are shown separately. No validated cutoffs.',
        ru: 'Авторская неклиническая саморефлексия: трудности и совладание или контекст показаны отдельно. Без валидированных порогов.',
      } } : item),
  ...EXPANDED_CATALOG_V3,
  ...EXPANDED_CATALOG_V4,
  ...RELATIONSHIPS_INTIMACY_CATALOG,
  ...TANTRIC_REFLECTION_CATALOG,
  ...PROFESSIONAL_BATTERY_2026_CATALOG,
  ...CDC_HEALTHY_DAYS_CATALOG,
  ...PROFESSIONAL_BATTERY_2026_B_CATALOG,
  ...IPIP_BIG_FIVE_50_CATALOG,
  ...PERSONALITY_TYPE_CATALOG,
  ...OPEN_PROFESSIONAL_2026_CATALOG,
  ...IPIP_VIA_R_COMPLETION_CATALOG,
  ...IPIP_VIA_R_PROFILE_96_CATALOG,
  ...CFPB_FINANCIAL_WELLBEING_SHORT_CATALOG,
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
    title: { en: 'Social Support Profile', ru: 'Социальная поддержка · EN', es: 'Perfil de apoyo social · EN' },
    description: {
      en: 'Professional MSPSS profile of perceived support from family, friends and a significant person.',
      ru: 'Профессиональный MSPSS-профиль воспринимаемой поддержки; вопросы на английском.',
      es: 'Cuestionario MSPSS sobre apoyo percibido de familiares, amistades y una persona significativa. Preguntas en inglés; no establece un diagnóstico.',
    },
  },
  ...COMPASSION_CATALOG,
  ...MHC_SF_CATALOG,
  ...ASRS6_CATALOG,
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
    title: { en: 'Daily Functioning', ru: 'Повседневное функционирование', es: 'Funcionamiento cotidiano' },
    description: {
      en: 'Reserved for a rights-cleared functioning measure; no questionnaire is exposed yet.',
      ru: 'Место для проверенной шкалы функционирования; опросник пока не публикуется.',
      es: 'Entrada reservada para un instrumento con derechos de uso verificados; por ahora no se ofrece un cuestionario.',
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
