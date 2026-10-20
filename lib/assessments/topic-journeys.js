import { TEST_RECOMMENDATION_FOCUS } from './test-recommendations.js'
import { normalizeProblemsForTopics } from './test-problems.js'

// These are navigation topics, not diagnoses, test results, or financial / medical assessments.
// Only existing test-catalog focus keys may reach the questionnaire explorer.
const entry = (id, titleEn, titleRu, detailEn, detailRu, focus) => Object.freeze({
  id, title: Object.freeze({ en: titleEn, ru: titleRu }),
  detail: Object.freeze({ en: detailEn, ru: detailRu }),
  focus: Object.freeze(focus),
})

const BASE_TOPIC_JOURNEYS = Object.freeze([
  Object.freeze({
    id: 'relationships', courseProgram: 'confidence',
    title: Object.freeze({ en: 'Relationships & intimacy', ru: 'Отношения и близость' }),
    eyebrow: Object.freeze({ en: 'CONNECTION & RELATIONSHIPS', ru: 'ЛЮБОВЬ И БЛИЗОСТЬ' }),
    summary: Object.freeze({ en: 'Trust, communication, personal boundaries and the art of closeness.', ru: 'Доверие, общение, личные границы и искусство близости.' }),
    introduction: Object.freeze({ en: 'What matters most in your relationships right now? Choose one or several themes to find relevant self-reflection tests.', ru: 'Что сейчас важнее всего в ваших отношениях? Отметьте одну или несколько тем — мы предложим соответствующие тесты.' }),
    focus: Object.freeze(['relationships', 'intimacy']),
    topics: Object.freeze([
      entry('trust', 'Trust & emotional closeness', 'Доверие и эмоциональная близость', 'Connection, openness and support', 'Контакт, открытость и поддержка', ['relationships', 'intimacy']),
      entry('boundaries', 'Boundaries & consent', 'Границы и согласие', 'Personal choice and honest communication', 'Свобода выбора и честный диалог', ['relationships', 'sexuality']),
      entry('conflict', 'Conflict & communication', 'Конфликты и общение', 'Navigate disagreements with greater clarity', 'Лучше понимать общение и разногласия', ['relationships', 'stress']),
      entry('presence', 'Embodied presence', 'Телесное присутствие', 'Attention to your own experience', 'Внимание к собственным ощущениям', ['tantra', 'intimacy']),
    ]),
  }),
  Object.freeze({
    id: 'business', courseProgram: 'focus',
    title: Object.freeze({ en: 'Business & money', ru: 'Бизнес и деньги' }),
    eyebrow: Object.freeze({ en: 'DECISIONS & WORK', ru: 'РАБОТА И РЕШЕНИЯ' }),
    summary: Object.freeze({ en: 'Focus, decisions, work pressure and your relationship with goals.', ru: 'Концентрация, решения, рабочее давление и отношение к целям.' }),
    introduction: Object.freeze({ en: 'Explore the psychological side of decisions, motivation and work. These are wellbeing tests, not financial assessments.', ru: 'Исследуйте психологические стороны решений, мотивации и работы. Это тесты самонаблюдения, не финансовая диагностика.' }),
    focus: Object.freeze(['clarity', 'function']),
    topics: Object.freeze([
      entry('decisions', 'Confidence in decisions', 'Уверенность в решениях', 'Inner support and everyday choices', 'Внутренняя опора и выбор', ['resources', 'function']),
      entry('productivity', 'Focus & productivity', 'Концентрация и результат', 'Attention, clarity and getting things done', 'Внимание, ясность и действия', ['attention', 'clarity']),
      entry('work-stress', 'Pressure at work', 'Стресс на работе', 'Notice workload and recovery needs', 'Рабочая перегрузка и восстановление', ['stress', 'function']),
      entry('money-beliefs', 'Goals & money beliefs', 'Цели и установки о деньгах', 'Reflect on values and personal resources', 'Ценности, установки и личные ресурсы', ['meaning', 'resources']),
    ]),
  }),
  Object.freeze({
    id: 'stress', courseProgram: 'stress',
    title: Object.freeze({ en: 'Stress & balance', ru: 'Стресс и равновесие' }),
    eyebrow: Object.freeze({ en: 'STRESS & RECOVERY', ru: 'СТРЕСС И ВОССТАНОВЛЕНИЕ' }),
    summary: Object.freeze({ en: 'Overload, anxiety, recovery and emotional steadiness.', ru: 'Перегрузка, тревога, восстановление и устойчивость.' }),
    introduction: Object.freeze({ en: 'Understand your current stress and choose the area you would like to observe or support.', ru: 'Разберитесь, как проявляется напряжение, и выберите, за чем хотите наблюдать.' }),
    focus: Object.freeze(['stress', 'anxiety']),
    topics: Object.freeze([
      entry('overload', 'Overload & tension', 'Перегрузка и напряжение', 'Recognise pressure and body tension', 'Замечать давление и напряжение', ['stress', 'anxiety']),
      entry('worry', 'Worry & uncertainty', 'Тревога и неопределённость', 'Explore worry and apprehension', 'Понимать волнение и опасения', ['anxiety', 'stress']),
      entry('recovery', 'Sleep & recovery', 'Сон и восстановление', 'Rest and available support', 'Отдых и доступная поддержка', ['sleep', 'resources']),
      entry('emotions', 'Emotional steadiness', 'Эмоциональная устойчивость', 'Make room for difficult feelings', 'Бережное отношение к переживаниям', ['mood', 'resources']),
    ]),
  }),
  Object.freeze({
    id: 'energy', courseProgram: 'focus',
    title: Object.freeze({ en: 'Energy & wellbeing', ru: 'Энергия и здоровье' }),
    eyebrow: Object.freeze({ en: 'BODY & WELLBEING', ru: 'ТЕЛО И РЕСУРС' }),
    summary: Object.freeze({ en: 'Fatigue, sleep, body awareness and everyday resources.', ru: 'Усталость, сон, телесные ощущения и повседневный ресурс.' }),
    introduction: Object.freeze({ en: 'Explore everyday wellbeing through self-reports. These tests do not assess medical conditions or replace healthcare.', ru: 'Оцените повседневное самочувствие по опросникам. Они не выявляют заболевания и не заменяют медицинскую помощь.' }),
    focus: Object.freeze(['body', 'sleep', 'resources']),
    topics: Object.freeze([
      entry('fatigue', 'Fatigue & energy', 'Усталость и энергия', 'Notice fatigue and daily resources', 'Усталость и запас сил в течение дня', ['body', 'resources']),
      entry('sleep', 'Sleep quality', 'Качество сна', 'Sleep and restoration', 'Сон и восстановление', ['sleep', 'body']),
      entry('body', 'Stress in the body', 'Напряжение в теле', 'Observe stress-related bodily sensations', 'Наблюдать телесные ощущения при стрессе', ['body', 'stress']),
      entry('resources', 'Recovery & self-support', 'Восстановление и опора', 'Supportive routines and resilience', 'Ресурсы и поддерживающие привычки', ['body', 'resources']),
    ]),
  }),
  Object.freeze({
    id: 'effectiveness', courseProgram: 'focus',
    title: Object.freeze({ en: 'Personal effectiveness', ru: 'Личная эффективность' }),
    eyebrow: Object.freeze({ en: 'FOCUS & DEVELOPMENT', ru: 'ФОКУС И РАЗВИТИЕ' }),
    summary: Object.freeze({ en: 'Attention, motivation, habits and confident action.', ru: 'Внимание, мотивация, привычки и уверенные действия.' }),
    introduction: Object.freeze({ en: 'Find tests for the skills you want to understand and practise in everyday life.', ru: 'Подберите тесты по навыкам, которые хотите понять и тренировать в повседневной жизни.' }),
    focus: Object.freeze(['attention', 'clarity', 'function']),
    topics: Object.freeze([
      entry('attention', 'Attention & concentration', 'Внимание и концентрация', 'Find your focus', 'Умение сохранять фокус', ['attention', 'clarity']),
      entry('action', 'Planning & starting', 'Планирование и начало дела', 'Turning intentions into manageable steps', 'Переход от намерений к действиям', ['function', 'attention']),
      entry('motivation', 'Motivation & direction', 'Мотивация и направление', 'Explore what matters to you', 'Понимать свои ценности и желания', ['mood', 'meaning']),
      entry('confidence', 'Self-support & confidence', 'Внутренняя опора и уверенность', 'Take your next step with more confidence', 'Действовать с большей уверенностью', ['resources', 'personality']),
    ]),
  }),
])

// Spanish editorial labels only: preserve scored definitions, IDs, EN/RU sources and focus links.
const SPANISH_JOURNEYS = Object.freeze({
  "relationships": {
    "title": "Relaciones e intimidad",
    "eyebrow": "CONEXIÓN Y RELACIONES",
    "summary": "Confianza, comunicación, límites personales y cercanía emocional.",
    "introduction": "¿Qué es importante para ti en tus relaciones ahora mismo? Elige uno o varios temas para encontrar cuestionarios de reflexión.",
    "topics": {
      "trust": [
        "Confianza y cercanía emocional",
        "Conexión, apertura y apoyo"
      ],
      "boundaries": [
        "Límites y consentimiento",
        "Elección personal y comunicación honesta"
      ],
      "conflict": [
        "Conflictos y comunicación",
        "Comprender mejor los desacuerdos"
      ],
      "presence": [
        "Presencia corporal",
        "Atención a tu experiencia y tus límites"
      ]
    }
  },
  "business": {
    "title": "Trabajo y dinero",
    "eyebrow": "DECISIONES Y TRABAJO",
    "summary": "Concentración, decisiones, presión laboral y relación con las metas.",
    "introduction": "Explora cómo te afectan las decisiones y las exigencias del trabajo. Estas pruebas observan el bienestar, no evalúan las finanzas.",
    "topics": {
      "decisions": [
        "Seguridad al decidir",
        "Apoyo interior y decisiones cotidianas"
      ],
      "productivity": [
        "Concentración y productividad",
        "Atención, claridad y acciones posibles"
      ],
      "work-stress": [
        "Presión en el trabajo",
        "Observa la carga de trabajo y la necesidad de descanso"
      ],
      "money-beliefs": [
        "Metas y creencias sobre el dinero",
        "Reflexiona sobre tus valores y recursos personales"
      ]
    }
  },
  "stress": {
    "title": "Estrés y equilibrio",
    "eyebrow": "ESTRÉS Y RECUPERACIÓN",
    "summary": "Sobrecarga, ansiedad, descanso y equilibrio emocional.",
    "introduction": "Observa cómo aparece la tensión y elige los aspectos que quieres comprender o cuidar.",
    "topics": {
      "overload": [
        "Sobrecarga y tensión",
        "Reconocer la presión y la tensión corporal"
      ],
      "worry": [
        "Preocupación e incertidumbre",
        "Comprender el nerviosismo y las dudas"
      ],
      "recovery": [
        "Sueño y descanso",
        "Reposo y apoyo disponible"
      ],
      "emotions": [
        "Equilibrio emocional",
        "Dar espacio a los sentimientos difíciles"
      ]
    }
  },
  "energy": {
    "title": "Energía y bienestar",
    "eyebrow": "CUERPO Y BIENESTAR",
    "summary": "Cansancio, sueño, conciencia corporal y recursos cotidianos.",
    "introduction": "Explora tu bienestar diario mediante cuestionarios. No detectan enfermedades ni sustituyen la atención sanitaria.",
    "topics": {
      "fatigue": [
        "Cansancio y energía",
        "Observa tu vitalidad durante el día"
      ],
      "sleep": [
        "Calidad del sueño",
        "Descanso y recuperación"
      ],
      "body": [
        "Estrés y sensaciones corporales",
        "Observa las sensaciones corporales sin asumir su causa"
      ],
      "resources": [
        "Recuperación y apoyo interior",
        "Hábitos de apoyo y resiliencia"
      ]
    }
  },
  "effectiveness": {
    "title": "Eficacia personal",
    "eyebrow": "ATENCIÓN Y DESARROLLO",
    "summary": "Atención, motivación, hábitos y acciones con confianza.",
    "introduction": "Encuentra cuestionarios que te ayuden a explorar las habilidades que deseas practicar a tu ritmo.",
    "topics": {
      "attention": [
        "Atención y concentración",
        "Descubre qué te ayuda a mantener el foco"
      ],
      "action": [
        "Planificar y comenzar",
        "Pasos pequeños para pasar de la intención a la acción"
      ],
      "motivation": [
        "Motivación y dirección",
        "Explora lo que es importante para ti"
      ],
      "confidence": [
        "Apoyo interior y confianza",
        "Elige el siguiente paso con más seguridad"
      ]
    }
  }
});
export const TOPIC_JOURNEYS = Object.freeze(BASE_TOPIC_JOURNEYS.map((journey) => {
  const es = SPANISH_JOURNEYS[journey.id];
  return Object.freeze({
    ...journey,
    title: Object.freeze({ ...journey.title, es: es.title }),
    eyebrow: Object.freeze({ ...journey.eyebrow, es: es.eyebrow }),
    summary: Object.freeze({ ...journey.summary, es: es.summary }),
    introduction: Object.freeze({ ...journey.introduction, es: es.introduction }),
    topics: Object.freeze(journey.topics.map((topic) => {
      const [title, detail] = es.topics[topic.id];
      return Object.freeze({ ...topic, title: Object.freeze({ ...topic.title, es: title }), detail: Object.freeze({ ...topic.detail, es: detail }) });
    })),
  });
}));

const validFocus = new Set(TEST_RECOMMENDATION_FOCUS.map((item) => item.key))
export function getTopicJourney(slug) {
  return TOPIC_JOURNEYS.find((entry) => entry.id === slug) || null
}
export function normalizeJourneyFocus(value) {
  if (typeof value !== 'string' || value.length > 180) return []
  return [...new Set(value.split(',').filter((key) => validFocus.has(key)))].slice(0, 7)
}
export function journeyFocusForTopics(journey, selectedTopicIds = []) {
  if (!journey || !Array.isArray(selectedTopicIds)) return []
  const selected = new Set(selectedTopicIds)
  const relevant = journey.topics.filter((topic) => selected.has(topic.id))
  return normalizeJourneyFocus((relevant.length ? relevant.flatMap((topic) => topic.focus) : journey.focus).join(','))
}

// Each detailed theme maps to REAL, selectable Step 2 concerns. Keep this
// mapping separate from focus facets: a theme is a user's choice, not a diagnosis.
export const JOURNEY_TOPIC_PROBLEMS = Object.freeze({
  relationships: Object.freeze({
    trust: ['intimate-conversation','low-support'],
    boundaries: ['boundaries','consent-pressure'],
    conflict: ['relationship-stress','social-anxiety'],
    presence: ['tantric-grounding','intimate-conversation'],
  }),
  business: Object.freeze({
    decisions: ['decision-doubt','self-doubt'],
    productivity: ['concentration','organizing'],
    'work-stress': ['work-overload','relaxation'],
    'money-beliefs': ['goal-uncertainty','self-doubt'],
  }),
  stress: Object.freeze({
    overload: ['body-tension','relaxation'],
    worry: ['constant-worry','uncertainty'],
    recovery: ['unrested','coping'],
    emotions: ['emotions','self-criticism'],
  }),
  energy: Object.freeze({
    fatigue: ['fatigue','exhaustion'],
    sleep: ['unrested','falling-asleep'],
    body: ['body-tension','physical-discomfort'],
    resources: ['coping','fatigue'],
  }),
  effectiveness: Object.freeze({
    attention: ['distracted','concentration'],
    action: ['task-start','organizing'],
    motivation: ['motivation','goal-uncertainty'],
    confidence: ['self-doubt','self-criticism'],
  }),
})

export function normalizeJourneyTopicIds(journey, value) {
  if (!journey) return []
  const values = Array.isArray(value) ? value : typeof value === 'string' && value.length <= 180 ? value.split(',') : []
  const available = new Set(journey.topics.map(topic => topic.id))
  return [...new Set(values.filter(id => typeof id === 'string' && available.has(id)))].slice(0, journey.topics.length)
}

export function journeyProblemsForTopics(journey, topicIds = []) {
  if (!journey) return []
  const selected = normalizeJourneyTopicIds(journey, topicIds)
  if (!selected.length) return []
  const focus = journeyFocusForTopics(journey, selected)
  const suggested = selected.flatMap(id => JOURNEY_TOPIC_PROBLEMS[journey.id]?.[id] || [])
  return normalizeProblemsForTopics(suggested, focus)
}
