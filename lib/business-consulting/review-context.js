// Public editorial navigation only. Never accept the visitor's free-text wish,
// a personal answer, assessment result, contact, or arbitrary query value.
// Keep labels aligned with the existing public Business journey; do not import
// assessment catalogs into the consultation form just to display navigation.
export const BUSINESS_REVIEW_TOPICS = Object.freeze({
  decisions: Object.freeze({ en: 'Confidence in decisions', ru: 'Уверенность в решениях', es: 'Seguridad al decidir' }),
  productivity: Object.freeze({ en: 'Focus & productivity', ru: 'Концентрация и результат', es: 'Concentración y productividad' }),
  'work-stress': Object.freeze({ en: 'Pressure at work', ru: 'Стресс на работе', es: 'Presión en el trabajo' }),
  'money-beliefs': Object.freeze({ en: 'Goals & money beliefs', ru: 'Цели и установки о деньгах', es: 'Metas y creencias sobre el dinero' }),
})
export const BUSINESS_REVIEW_TOPIC_IDS = Object.freeze([
  'decisions', 'productivity', 'work-stress', 'money-beliefs',
])

export function businessReviewTopic(value) {
  return typeof value === 'string' && BUSINESS_REVIEW_TOPIC_IDS.includes(value) ? value : null
}

export function businessReviewQuery(value) {
  const topic = businessReviewTopic(value)
  return topic ? '?businessTopic=' + topic : ''
}

export function readBusinessReviewContext(search, locale) {
  if (typeof search !== 'string' || search.length > 2048 || !['en', 'ru', 'es'].includes(locale)) return null
  const params = new URLSearchParams(search)
  if (params.getAll('businessTopic').length !== 1) return null
  const id = businessReviewTopic(params.get('businessTopic'))
  if (!id) return null
  return { id, title: BUSINESS_REVIEW_TOPICS[id][locale] }
}
