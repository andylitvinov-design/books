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
