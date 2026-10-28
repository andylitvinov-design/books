import { assessmentResultOverview } from './result-overview.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'
import { interpretConcern } from './personal-guidance.js'

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

export function buildTestResultDiscussion({ result, report, locale = 'en' } = {}) {
  const verified = Boolean(result?.id && report?.verified === true &&
    Array.isArray(report.sections) && report.sections.length > 0)
  if (!verified) return { verified:false, highlights:[], needsProfessional:false, reviewNote:'', topic:'meaning', title:'' }
  const item = monitoringCatalogItem(result.definitionKey)
  const title = item?.title?.[locale] || item?.title?.en || result.definitionKey
  const overview = assessmentResultOverview(report, result, locale === 'es' ? 'en' : locale)
  const sections = new Map(report.sections.filter(s => s?.key).map(s => [s.key,s]))
  const highlights = overview.preview.flatMap(row => {
    const section = sections.get(row.key)
    if (!section || section.bandBasis === 'unavailable') return []
    return [{
      key:row.key, label:row.label || section.construct || section.title || row.key,
      score:row.score, summary:section.summary || section.meaning || '',
      domain:section.domain || '', recommendedReview:section.recommendedReview === true,
    }]
  }).slice(0,3)
  const review = report.sections.find(s => s?.recommendedReview === true)
  return {
    verified:true, title, highlights, needsProfessional:Boolean(review),
    reviewNote:review?.followUp || report.seekSupport || '',
    topic:discussionTopicForTags(item?.topics || [],'meaning'),
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

export function testDiscussionOffers({ topic='meaning', locale='en', needsProfessional=false, verified=true }={}) {
  if (!verified) return []
  const lang = ['ru','es'].includes(locale) ? locale : 'en'
  const prefix = '/' + lang, c = COPY[lang]
  return [
    { id:'video', title:c.video[0], description:c.video[1], href:prefix+'/holistic-support/mobile?view=meditation' },
    { id:'course', title:c.course[0], description:c.course[1],
      href:prefix+(topic === 'work' ? '/explore/business' : '/academy') },
    ...(!needsProfessional ? [{
      id:'session', title:c.session[0], description:c.session[1], href:prefix+'/services#consultation',
    }] : []),
    { id:'test', title:c.test[0], description:c.test[1],
      href:prefix+'/client/tests?journey='+(JOURNEY[topic] || JOURNEY.meaning) },
  ]
}
