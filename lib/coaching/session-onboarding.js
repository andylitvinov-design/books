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

/** Optional nonclinical greeting. Mood selections are React memory only. */
export const COACHING_CHECKIN_OPTIONS=Object.freeze([
 {id:'good',label:{en:'Doing well',ru:'Всё неплохо',es:'Bastante bien'}},
 {id:'mixed',label:{en:'A bit of everything',ru:'По-разному',es:'Un poco de todo'}},
 {id:'hard',label:{en:'It is a hard day',ru:'Сейчас непросто',es:'Un día difícil'}},
 {id:'skip',label:{en:'Rather not say',ru:'Пока не хочу говорить',es:'Prefiero no decirlo'}},
])
const checkinReplies={
 en:{good:'Thanks for sharing. It is good that we can begin calmly.',mixed:'Thanks for telling me. You do not need to sort out every feeling before we begin.',hard:'Thank you for being open. We can go gently and only explore what feels comfortable.',skip:'Of course. You do not have to share anything about your mood to start.'},
 ru:{good:'Спасибо за ответ. Хорошо, что мы можем спокойно начать этот разговор.',mixed:'Спасибо, что поделились. Необязательно сразу разбираться со всеми чувствами.',hard:'Спасибо за доверие. Давайте без спешки и только в комфортном для вас темпе.',skip:'Конечно. Можно начать беседу и без рассказа о своём состоянии.'},
 es:{good:'Gracias por contármelo. Podemos empezar sin prisas.',mixed:'Gracias por compartirlo. No necesitas aclarar todos tus sentimientos antes de empezar.',hard:'Gracias por tu confianza. Avancemos con calma y solo hasta donde te sientas bien.',skip:'Por supuesto. No necesitas hablar de tu estado de ánimo para empezar.'},
}
export function coachingCheckinReply(choice,locale='en'){
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 return typeof choice==='string'&&COACHING_CHECKIN_OPTIONS.some(item=>item.id===choice)
   ?checkinReplies[lang][choice]:''
}
