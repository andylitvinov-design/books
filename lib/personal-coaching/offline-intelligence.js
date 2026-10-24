import { buildCoachingRecap, coachingAnswerText } from './guided-session.js'

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

// One canonical answer-label and stage-semantic interpretation for the free
// guided question, action-plan seed and saved recap. No second inference engine.
export const displayCoachingAnswer=coachingAnswerText

// An action plan is always a *draft* until the user edits and confirms it.
// A due date (TGROW), a resource (OSKAR) and a strategic direction
// (Appreciative Inquiry) must never be auto-labelled as "my chosen action".
export function draftCoachingActionPlan(questions=[],answers={},clientQuestion='',locale='en'){
  const items=Array.isArray(questions)?questions:[]
  const rows=buildCoachingRecap({answers},items,locale)
  const direct=(steps,max)=>{
    for(const question of items){
      const step=String(question?.stepKey||question?.stage||'').toLowerCase()
      if(!steps.includes(step))continue
      const text=coachingAnswerText(answers?.[question?.id],question,locale)
      if(text)return text.slice(0,max)
    }
    return ''
  }
  const find=(key,max)=>String(rows.find(row=>row.key===key)?.value||'').slice(0,max)
  return {
    goal:direct(['goal','outcome','wish','preferred'],300),
    obstacle:direct(['obstacle','barrier'],300),
    actionText:find('action',300),
    when:find('timing',120),
    confidence:null,
  }
}

export const COACHING_P1_VERSION='hh-coaching-offline-p1-v1'
