// Holistic House · curated navigation taxonomy, not a medical/sexual classifier.
// Only published reference scheme tags enter this computation; no visitor text, cookies or scores.
export const COACHING_TOPIC_GROUPS=Object.freeze([
 {id:'all',icon:'✦',label:{en:'All topics',ru:'Все темы',es:'Todos'},tags:[]},
 {id:'business',icon:'💼',label:{en:'Business & career',ru:'Бизнес и карьера',es:'Negocio y carrera'},tags:['business','career','leadership','productivity']},
 {id:'money',icon:'€',label:{en:'Money',ru:'Деньги',es:'Dinero'},tags:['money','budget']},
 {id:'relationships',icon:'♡',label:{en:'Relationships',ru:'Отношения',es:'Relaciones'},tags:['relationships','conflict']},
 {id:'wellbeing',icon:'🌿',label:{en:'Health & wellbeing',ru:'Здоровье и ресурс',es:'Salud y bienestar'},tags:['wellbeing','stress','sleep']},
 {id:'sexuality',icon:'♥',label:{en:'Sexuality & intimacy 18+',ru:'Сексуальность 18+',es:'Sexualidad 18+'},tags:['sexuality','intimacy','consent','boundaries','desire','tantra']},
 {id:'growth',icon:'↗',label:{en:'Personal growth',ru:'Личное развитие',es:'Desarrollo personal'},tags:['goal','growth','confidence','motivation','transition','unclear','creativity','decision']},
])
const topicMap=new Map(COACHING_TOPIC_GROUPS.map(group=>[group.id,group]))
export const coachingTopicGroup=(id)=>topicMap.get(id)||topicMap.get('all')
export function coachingSchemeInGroup(scheme,groupId='all'){
 const group=coachingTopicGroup(groupId)
 if(group.id==='all')return true
 const tags=Array.isArray(scheme?.tags)?scheme.tags:[]
 return tags.some(tag=>group.tags.includes(tag))
}
export function coachingTopicSchemeCount(schemes,groupId){
 return (Array.isArray(schemes)?schemes:[]).filter(s=>coachingSchemeInGroup(s,groupId)).length
}
export function coachingSignalInGroup(signal,groupId){
 const group=coachingTopicGroup(groupId)
 return group.id==='all'||group.tags.includes(signal?.tag)
}
export function coachingSchemeRequiresAdultConsent(scheme){
 const tags=Array.isArray(scheme?.tags)?scheme.tags:[]
 return scheme?.modelKey==='tantric_intimacy_v1'||tags.includes('sexuality')
}

// Outcome-first coaching discovery: editorial priorities, not psychological scores.
// An outcome reorders visible published sessions; it never hides a valid method.
// All five options are client goals, not invented coach credentials.
export const COACHING_OUTCOMES=Object.freeze([
 {id:'clarity',icon:'✦',label:{en:'Understand my situation',ru:'Разобраться в ситуации',es:'Entender mi situación'},
  schemeKeys:['tgrow_compass_v1','grow_reflect_v1','oskar_resources_v1','oskar_money_confidence_v1','oskar_wellbeing_resources_v1','appreciative_future_v1'],tags:['unclear','transition','confidence']},
 {id:'decision',icon:'◇',label:{en:'Make a decision',ru:'Принять решение',es:'Tomar una decisión'},
  schemeKeys:['grow_quick_v1','grow_reflect_v1','tgrow_compass_v1','oskar_money_confidence_v1','clear_dialogue_v1','tantric_consent_quick_v1'],tags:['decision','conflict','boundaries']},
 {id:'action',icon:'↗',label:{en:'Find my next step',ru:'Найти следующий шаг',es:'Encontrar mi próximo paso'},
  schemeKeys:['grow_quick_v1','fuel_development_v1','solution_focus_quick_v1','solution_relationship_dialogue_v1','clear_intimacy_dialogue_v1'],tags:['goal','career','business']},
 {id:'habit',icon:'◌',label:{en:'Change a habit',ru:'Изменить привычку',es:'Cambiar un hábito'},
  schemeKeys:['woop_habit_v1','woop_money_habit_v1','woop_wellbeing_routine_v1','solution_focus_quick_v1'],tags:['budget','sleep','productivity','motivation']},
 {id:'reflection',icon:'♡',label:{en:'Explore more deeply',ru:'Исследовать глубже',es:'Explorar en profundidad'},
  schemeKeys:['solution_focus_reflect_v1','grow_reflect_v1','clear_dialogue_v1','appreciative_future_v1','tantric_intimacy_reflective_v1'],tags:['relationships','growth','intimacy']},
])
const outcomeMap=new Map(COACHING_OUTCOMES.map(item=>[item.id,item]))
export const coachingOutcome=(id)=>outcomeMap.get(id)||null
export function coachingOutcomeFit(scheme,outcomeId){
 const outcome=coachingOutcome(outcomeId)
 if(!outcome||!scheme)return 0
 if(outcome.schemeKeys.includes(scheme.schemeKey))return 2
 return (Array.isArray(scheme.tags)&&scheme.tags.some(tag=>outcome.tags.includes(tag)))?1:0
}


// Session choices are actual catalogue duration ranges, not a psychological diagnosis.
// Imagery is a separate authored tradition path (not a published standard scheme).
export const COACHING_SESSION_MODES=Object.freeze([
 {id:'express',icon:'⚡',
  label:{en:'Express',ru:'Экспресс',es:'Exprés'},
  hint:{en:'5–10 min',ru:'5–10 мин',es:'5–10 min'}},
 {id:'extended',icon:'◷',
  label:{en:'Extended',ru:'Расширенная',es:'Ampliada'},
  hint:{en:'10–20 min',ru:'10–20 мин',es:'10–20 min'}},
 {id:'imagery',icon:'✧',
  label:{en:'Imagery & meditation',ru:'Образы и медитация',es:'Imágenes y meditación'},
  hint:{en:'Guided reflection',ru:'Образная практика',es:'Reflexión guiada'}},
 {id:'all',icon:'✦',
  label:{en:'All sessions',ru:'Все сессии',es:'Todas las sesiones'},
  hint:{en:'See every method',ru:'Все методики',es:'Todos los métodos'}},
])
export function coachingSchemeMatchesSessionMode(scheme,mode='all'){
 if(mode==='all')return true
 if(mode==='imagery')return false // imagery is routed to authored traditions, not ordinary coaching models
 const minutes=Number(scheme?.minutes)
 if(!Number.isFinite(minutes))return false
 if(mode==='express')return minutes>=5&&minutes<=10
 if(mode==='extended')return minutes>10&&minutes<=20
 return false
}
