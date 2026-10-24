// Holistic House Coaching Intelligence P1: reviewed, deterministic prompts only.
// This module never calls a language model, storage, analytics or a provider.
// It offers a *question*, not an interpretation, diagnosis or fact about a client.

const prompts=Object.freeze({
  reality_choice_v1:{
    en:'What real example makes this answer relevant to your situation?',
    ru:'Какой реальный пример делает этот ответ подходящим к вашей ситуации?',
    es:'¿Qué ejemplo real hace que esta respuesta encaje con tu situación?',
  },
  reality_text_v1:{
    en:'Which part of what you described can you influence this week?',
    ru:'На какую часть описанной ситуации вы можете повлиять на этой неделе?',
    es:'¿En qué parte de esta situación puedes influir esta semana?',
  },
  options_choice_v1:{
    en:'What small experiment could help you check whether this option works?',
    ru:'Какой небольшой эксперимент поможет проверить, подходит ли этот вариант?',
    es:'¿Qué pequeño experimento podría ayudarte a comprobar esta opción?',
  },
  options_text_v1:{
    en:'What uncertainty would you want to check before choosing this option?',
    ru:'Какую неопределённость стоит проверить, прежде чем выбрать этот вариант?',
    es:'¿Qué incertidumbre te gustaría comprobar antes de elegir esta opción?',
  },
})

const stageMap=Object.freeze({
  reality:'reality',obstacle:'reality',explore:'reality',listen:'reality',
  scaling:'reality',knowhow:'reality',current:'reality',barrier:'reality',
  options:'options',option:'options',alternatives:'options',discover:'options',
  dream:'options',design:'options',experiment:'options',
  goal:'goal',topic:'goal',frame:'goal',outcome:'goal',wish:'goal',
  contract:'goal',define:'goal',desire:'goal',
  will:'action',action:'action',act:'action',affirm:'action',
  commitment:'action',plan:'action',when:'when',destiny:'action',
  review:'review',deliver:'review',
})
const urgent=/(?:\b(?:suicid\w*|kill\s+myself|self[- ]harm|immediate\s+danger)\b|суицид|самоубийств|убить себя|покончить с собой|quiero morir|suicid|hacerme da[nñ]o)/iu

export function coachingStageKey(question){
  const key=String(question?.stepKey||question?.stage||'').toLowerCase()
  return stageMap[key]||null
}

// Only one extra reflection per category and two per entire session.
// A customer may always skip it and return to the fixed authored course.
export function authoredFollowupFor(question,answer,reflections={}){
  if(!question||typeof question.id!=='string'||typeof answer!=='string'||!answer.trim()||urgent.test(answer))return null
  const stage=coachingStageKey(question)
  if(stage!=='reality'&&stage!=='options')return null
  const rows=reflections&&typeof reflections==='object'&&!Array.isArray(reflections)
    ?Object.values(reflections).filter(value=>value&&typeof value==='object'):[]
  if(rows.length>=2||rows.some(row=>row.stage===stage))return null
  const variant=answer.startsWith('choice:')?'choice':'text'
  const key=stage+'_'+variant+'_v1'
  return {key,stage,questionId:question.id,prompt:prompts[key]}
}

export function displayCoachingAnswer(value,question,locale='en'){
  if(typeof value!=='string'||!value.trim())return ''
  if(!value.startsWith('choice:'))return value.trim()
  const option=value.slice(7)
  if(question?.type==='scale_0_10')return /^(?:10|[0-9])$/.test(option)?option+'/10':''
  const label=question?.choices?.find(c=>c?.id===option)?.label
  return typeof label?.[locale]==='string'?label[locale]:typeof label?.en==='string'?label.en:''
}

// Nothing inferred: every suggested field is a direct answer or the user's
// own original question. Blank fields remain blank until the user edits them.
export function draftCoachingActionPlan(questions=[],answers={},clientQuestion='',locale='en'){
  const rows=(Array.isArray(questions)?questions:[]).map(question=>({
    stage:coachingStageKey(question),
    key:String(question?.stepKey||question?.stage||'').toLowerCase(),
    text:displayCoachingAnswer(answers?.[question?.id],question,locale),
  })).filter(row=>row.text)
  const first=(predicate)=>rows.find(predicate)?.text||''
  const goal=first(row=>row.key==='goal'||row.key==='outcome'||row.key==='wish')
    ||(typeof clientQuestion==='string'?clientQuestion.trim().slice(0,300):'')
  const obstacle=first(row=>row.key==='obstacle'||row.key==='barrier')
    ||first(row=>row.stage==='reality')
  const actionText=first(row=>['action','will','act','affirm','commitment','plan'].includes(row.key))
  const when=first(row=>row.key==='when')
  return {goal:goal.slice(0,300),obstacle:obstacle.slice(0,300),
    actionText:actionText.slice(0,300),when:when.slice(0,120),confidence:null}
}

export const COACHING_P1_VERSION='hh-coaching-offline-p1-v1'
