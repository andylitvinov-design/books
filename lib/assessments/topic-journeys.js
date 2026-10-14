import { TEST_RECOMMENDATION_FOCUS } from './test-recommendations.js'

// These are navigation topics, not diagnoses, test results, or financial / medical assessments.
// Only existing test-catalog focus keys may reach the questionnaire explorer.
const entry = (id, titleEn, titleRu, detailEn, detailRu, focus) => Object.freeze({
  id, title: Object.freeze({ en: titleEn, ru: titleRu }),
  detail: Object.freeze({ en: detailEn, ru: detailRu }),
  focus: Object.freeze(focus),
})

export const TOPIC_JOURNEYS = Object.freeze([
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
