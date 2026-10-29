import { assessmentResultOverview } from './result-overview.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { interpretConcern } from './personal-guidance.js'
import { verifiedHistoryResult, verifiedPreviousResult } from './verified-history.js'
import { scoreChangeReading } from './score-change-reading.js'

// Stores only one opaque, server-issued save-intent id; never a test score or answer.
export const TEST_DISCUSSION_INTENT_KEY = 'hh:discuss-guest-test-intent:v1'

// Local editorial routing; never put scores, answers, user questions or identity in URLs.
const FOCUS = Object.freeze({
  work: ['work', 'business', 'money', 'financial', 'function'],
  relationships: ['relationships', 'relationship', 'love', 'intimacy', 'connection'],
  energy: ['stress', 'anxiety', 'energy', 'body', 'sleep', 'mood', 'fatigue', 'burnout', 'resources'],
  meaning: ['meaning', 'values', 'goals', 'attention', 'personality', 'direction'],
})
const JOURNEY = { work:'business', relationships:'relationships', energy:'energy', meaning:'effectiveness' }

export function discussionTopicForTags(tags = [], fallback = 'meaning') {
  const selected = new Set(Array.isArray(tags) ? tags.filter(s => typeof s === 'string') : [])
  for (const key of ['work','relationships','energy','meaning'])
    if (FOCUS[key].some(tag => selected.has(tag))) return key
  return fallback
}

// Read the original scale, never a fictional average or a diagnosis.
// These captions intentionally explain why a source measurement appears.
const bounded = (value, max = 320) => {
  if (typeof value !== 'string') return ''
  const clean = value.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  const part = clean.slice(0, max - 1)
  return part.slice(0, part.lastIndexOf(' ') > max / 2 ? part.lastIndexOf(' ') : part.length) + '…'
}
const TALK = Object.freeze({
  en:{
    first: 'Here are the source-recorded measures that may be useful to discuss. You choose what matters.',
    noNorm: 'This is a descriptive scale, not a population average or a clinical threshold.',
    difficulty: 'The source describes reported difficulties, not a diagnosis.',
    resource: 'The source describes reported resources. A higher score is not a medical outcome.',
    neutral: 'This describes a tendency, not a weakness or a target to fix.',
    screening: 'Only the source-published screening interpretation applies; it is not a diagnosis.',
    care: 'This source includes a professional-review notice, so no services are recommended from the score.',
    question: 'Does this reflect your recent experience, or would you rather explore another measure?',
    source: 'Interpretation uses the identified questionnaire and its recorded version. Scores from different scales are not compared as percentages.',
  },
  ru:{
    first: 'Это показатели из исходного отчёта, которые можно обсудить. Вы сами выбираете, что сейчас важно.',
    noNorm: 'Шкала описательная: это не средний показатель населения и не клинический порог.',
    difficulty: 'Исходная методика описывает отмеченные трудности, но не устанавливает диагноз.',
    resource: 'Исходная методика отражает ответы о ресурсах, а не медицинский результат.',
    neutral: 'Это описание особенности, а не недостаток, который требуется исправлять.',
    screening: 'Применима только опубликованная интерпретация скрининга; это не диагноз.',
    care: 'По этому тесту есть рекомендация профессионального обсуждения; услуги не подбираются по баллу.',
    question: 'Это похоже на ваш недавний опыт или лучше рассмотреть другой показатель?',
    source: 'Использованы шкалы и версия исходного опросника. Баллы разных шкал не сравниваются как проценты.',
  },
  es:{
    first: 'Estos son los indicadores del informe original que podemos comentar. Tú eliges qué es importante.',
    noNorm: 'La escala es descriptiva: no representa un promedio poblacional ni un umbral clínico.',
    difficulty: 'El instrumento describe dificultades informadas, pero no establece un diagnóstico.',
    resource: 'Refleja recursos declarados, no un resultado clínico.',
    neutral: 'Describe una tendencia, no una deficiencia que debas corregir.',
    screening: 'Solo se aplica la interpretación publicada para este cribado; no es un diagnóstico.',
    care: 'El resultado recomienda una evaluación profesional; no se ofrecen servicios a partir de la puntuación.',
    question: '¿Coincide con tu experiencia reciente o prefieres ver otro indicador?',
    source: 'Se usan las escalas y la versión del cuestionario original. No se comparan puntuaciones de diferentes escalas como porcentajes.',
  },
})
const talk = locale => TALK[locale] || TALK.en

export function discussionPriorityReason(section, locale = 'en') {
  const t = talk(locale)
  if (section?.recommendedReview === true) return t.care
  if (section?.bandBasis === 'screening' || section?.bandBasis === 'published-reference') return t.screening
  if (section?.presentationDirection === 'difficulty') return t.difficulty + ' ' + t.noNorm
  if (section?.presentationDirection === 'resource') return t.resource + ' ' + t.noNorm
  return t.neutral + ' ' + t.noNorm
}

export function discussionReflectionQuestion(topic = 'meaning', locale = 'en') {
  // Ask about subjective relevance rather than infer the source of a difficulty.
  return talk(locale).question
}

export function discussionSourceNote(result, report, locale = 'en') {
  const t = talk(locale)
  const sourceLanguage = result?.instrumentLocale
  const translation = sourceLanguage && sourceLanguage !== locale
    ? locale === 'ru' ? ' Язык исходных вопросов может отличаться от языка пояснения.'
      : locale === 'es' ? ' El idioma de las preguntas puede diferir del idioma del informe.'
      : ' The questionnaire language may differ from the explanation language.'
    : ''
  return t.source + translation
}

export function discussionOpening({ title = '', highlights = [], locale = 'en' } = {}) {
  const t = talk(locale)
  const name = bounded(title, 90)
  if (!highlights.length) return t.first
  const lead = locale === 'ru' ? 'В тесте «' + name + '»'
    : locale === 'es' ? 'En la prueba «' + name + '»'
    : 'For “' + name + '”'
  const count = highlights.length
  const ending = locale === 'ru' ? 'есть ' + count + ' показателя для начала разговора.'
    : locale === 'es' ? 'hay ' + count + ' indicadores para comentar.'
    : 'there are ' + count + ' measures we can explore.'
  return lead + ' ' + ending + ' ' + t.first
}

// Explicit format choice. Unknown free text must not be treated as a high-confidence
// personal interpretation or as a user's consent to booking/CRM.
export function discussionFormatFromText(value = '') {
  const s = String(value).slice(0, 240).toLocaleLowerCase()
  if (/самоубий|покончи.*собой|не хочу жить|хочу умереть|суицид|самоповрежд|suicid|self.harm|kill myself|quitarme la vida|hacerme daño/.test(s)) return 'urgent'
  if (/видео|медитац|посмотр|video|medit|vídeo/.test(s)) return 'video'
  if (/курс|практик|урок|программ|course|lesson|practice|program|curso|práctica/.test(s)) return 'course'
  if (/следующ.*тест|друг.*тест|опросник|тест|test|questionnaire|prueba|cuestionario/.test(s)) return 'test'
  if (/консультац|встреч|сесси|психотерап|consult|session|therap|sesión/.test(s)) return 'session'
  return null
}

export function buildTestResultDiscussion({ result, report, locale = 'en', history = [] } = {}) {
  // ASRS and trauma use source-verified reports without a top-level verified flag.
  // The narrow fallback requires the canonical immutable source verifier.
  const sourceVerified = report?.verified === true ||
    (report?.verified == null && verifiedHistoryResult(result))
  const verified = Boolean(result?.id && sourceVerified &&
    Array.isArray(report?.sections) && report.sections.length > 0)
  if (!verified) return { verified:false, highlights:[], needsProfessional:false, reviewNote:'', topic:'meaning', title:'' }
  const item = monitoringCatalogItem(result.definitionKey)
  const title = item?.title?.[locale] || item?.title?.en || result.definitionKey
  const overview = assessmentResultOverview(report, result, locale === 'es' ? 'en' : locale)
  const previous = Array.isArray(history) && verifiedHistoryResult(result)
    ? verifiedPreviousResult(result, history) : null
  const sections = new Map(report.sections.filter(s => s?.key).map(s => [s.key,s]))
  const highlights = overview.preview.flatMap(row => {
    const section = sections.get(row.key)
    if (!section || section.bandBasis === 'unavailable' || !row.score) return []
    const dimension = Array.isArray(result?.dimensions)
      ? result.dimensions.find(value => value?.key === section.key) : null
    const prior = Array.isArray(previous?.dimensions)
      ? previous.dimensions.find(value => value?.key === section.key &&
          value.min === section.min && value.max === section.max &&
          value.unit === dimension?.unit && value.timeframe === dimension?.timeframe)
      : null
    const comparable = prior && Number.isFinite(prior.value) && Number.isFinite(section.value)
    const trend = comparable
      ? scoreChangeReading({ state: prior.value === section.value ? 'unchanged' : 'change',
          delta: section.value - prior.value }, dimension, locale, section.presentationDirection || 'neutral')
      : null
    const topic = discussionTopicForTags([section.domain, ...(item?.topics || [])], 'meaning')
    return [{
      key:row.key,
      label:row.label || section.construct || section.title || row.key,
      score:row.score,
      summary:bounded(section.summary || section.meaning || '', 360),
      domain:section.domain || '',
      topic,
      recommendedReview:section.recommendedReview === true,
      band: ['screening', 'published-reference'].includes(section.bandBasis) ? bounded(section.band, 160) : '',
      evidence:section.bandBasis,
      orientation:section.presentationDirection || 'neutral',
      priorityReason:discussionPriorityReason(section, locale),
      reflectionQuestion:discussionReflectionQuestion(topic, locale),
      optionalStep:section.recommendedReview ? '' : bounded(section.primarySupport || section.steps?.[0] || '', 220),
      trend: trend ? {
        from:prior.value, to:section.value,
        label:locale === 'es' ? 'Cambio aritmético de las respuestas' : trend.label,
        detail:locale === 'es'
          ? 'El cambio por sí solo no demuestra una mejoría ni su causa.'
          : trend.detail,
        measurementAt:previous.measurementAt,
      } : null,
    }]
  }).slice(0,3)
  const review = report.sections.find(s => s?.recommendedReview === true)
  return {
    verified:highlights.length > 0, title, highlights, needsProfessional:Boolean(review),
    reviewNote:bounded(review?.followUp || report.seekSupport || '', 420),
    topic:discussionTopicForTags(item?.topics || [],'meaning'),
    sourceNote:discussionSourceNote(result, report, locale),
    measureCount:report.sections.length,
    comparablePrior:Boolean(previous),
    summary:discussionOpening({ title, highlights, locale }),
  }
}

export function interpretTestDiscussionQuestion(value, fallback='meaning') {
  const text = typeof value === 'string' ? value.trim().slice(0,240) : ''
  const matched = interpretConcern(text)
  if (matched.urgent) return { urgent:true, topic:null }
  return { urgent:false, topic:discussionTopicForTags(matched.focus || [],fallback) }
}

const COPY = {
  en: {
    video:['Explore videos','Browse existing published meditations and guided practices.'],
    course:['Explore a programme','Choose an existing self-paced course or lesson.'],
    test:['Explore another test','Choose an available rights-cleared questionnaire.'],
    session:['Consider a personal session','See services; an enquiry is not a booking or payment.'],
  },
  ru: {
    video:['Посмотреть видео','Выбрать опубликованную медитацию или практику.'],
    course:['Выбрать программу','Посмотреть существующие самостоятельные курсы и уроки.'],
    test:['Подобрать следующий тест','Выбрать доступный тест с подтверждёнными правами.'],
    session:['Обратиться за консультацией','Посмотреть услуги; заявка не означает бронь или оплату.'],
  },
  es: {
    video:['Explorar vídeos','Elegir meditaciones y prácticas ya publicadas.'],
    course:['Explorar un programa','Ver cursos y lecciones existentes.'],
    test:['Elegir otra prueba','Ver cuestionarios disponibles con derechos verificados.'],
    session:['Consultar servicios','Una solicitud no es una reserva ni un pago.'],
  },
}

export function testDiscussionOffers({ topic='meaning', locale='en', needsProfessional=false, verified=true, preference='video' }={}) {
  // A source-flagged professional review is guidance, never a monetization signal.
  if (!verified || needsProfessional) return []
  const lang = ['ru','es'].includes(locale) ? locale : 'en'
  const prefix = '/' + lang, c = COPY[lang]
  const videoTheme = { work:'business', relationships:'love', energy:'energy' }[topic] || null
  const videoHref = prefix + '/holistic-support/mobile?view=meditation' + (videoTheme ? '&topic=' + videoTheme : '')
  const choices = [
    { id:'video', title:c.video[0], description:c.video[1], href:videoHref },
    { id:'course', title:c.course[0], description:c.course[1],
      href:prefix+(topic === 'work' ? '/explore/business' : '/academy') },
    { id:'session', title:c.session[0], description:c.session[1], href:prefix+'/services#consultation' },
    { id:'test', title:c.test[0], description:c.test[1],
      href:prefix+'/client/tests?journey='+(JOURNEY[topic] || JOURNEY.meaning) },
  ]
  const order = { video:['video','course','test','session'], course:['course','video','test','session'],
    test:['test','video','course','session'], session:['session','video','course','test'] }[preference] || ['video','course','test','session']
  return order.map(key => choices.find(item => item.id === key)).filter(Boolean)
}
