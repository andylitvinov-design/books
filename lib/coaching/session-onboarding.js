// Shared non-diagnostic coaching entry vocabulary. Stable IDs, localized labels.
// Also used by the authenticated server to validate a client-selected topic.
export const COACHING_REQUEST_TOPICS = Object.freeze([
  {id:'love',icon:'♡',label:{en:'Love',ru:'Любовь',es:'Amor'}},
  {id:'relationships',icon:'🤝',label:{en:'Relationships',ru:'Отношения',es:'Relaciones'}},
  {id:'money',icon:'◈',label:{en:'Money',ru:'Деньги',es:'Dinero'}},
  {id:'business',icon:'▣',label:{en:'Business',ru:'Бизнес',es:'Negocios'}},
  {id:'career',icon:'↗',label:{en:'Career & work',ru:'Карьера и работа',es:'Carrera y trabajo'}},
  {id:'wellbeing',icon:'✳',label:{en:'Health & wellbeing',ru:'Здоровье и самочувствие',es:'Salud y bienestar'}},
  {id:'sexuality',icon:'♡',label:{en:'Intimacy · 18+',ru:'Интимность · 18+',es:'Intimidad · 18+'}},
  {id:'growth',icon:'✦',label:{en:'Personal growth',ru:'Личное развитие',es:'Desarrollo personal'}},
  {id:'other',icon:'…',label:{en:'Another topic',ru:'Другая тема',es:'Otro tema'}},
])
export function isCoachingRequestTopic(value){
  return typeof value==='string'&&COACHING_REQUEST_TOPICS.some(topic=>topic.id===value)
}
export function coachingRequestTopicLabel(value,locale='en'){
  const item=COACHING_REQUEST_TOPICS.find(topic=>topic.id===value)
  return item?.label?.[locale]||item?.label?.en||''
}
