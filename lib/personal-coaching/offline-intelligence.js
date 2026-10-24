import { buildCoachingRecap, coachingAnswerText } from './guided-session.js'

// Holistic House Coaching Intelligence P1: reviewed, deterministic prompts only.
// This module never calls a language model, storage, analytics or a provider.
// It offers a *question*, not an interpretation, diagnosis or fact about a client.

const prompts=Object.freeze({
  goal_choice_v1:{
    en:'What makes this direction meaningful to you right now?',
    ru:'Что делает это направление важным для вас именно сейчас?',
    es:'¿Qué hace que esta dirección sea importante para ti ahora?',
  },
  goal_text_v1:{
    en:'What would be one small sign that this conversation has helped?',
    ru:'По какому небольшому признаку вы поймёте, что разговор вам помог?',
    es:'¿Qué pequeña señal te indicaría que esta conversación te ayudó?',
  },
  reality_choice_v1:{
    en:'What real example makes this answer relevant to your situation?',
    ru:'Какой реальный пример делает этот ответ подходящим к вашей ситуации?',
    es:'¿Qué ejemplo real hace que esta respuesta encaje con tu situación?',
  },
  reality_text_v1:{
    en:'Which part of this situation would you like to understand a little better first?',
    ru:'Какую часть этой ситуации вам хотелось бы сначала чуть лучше понять?',
    es:'¿Qué parte de esta situación te gustaría comprender un poco mejor primero?',
  },
  options_choice_v1:{
    en:'What might let you explore this option without pressure to commit?',
    ru:'Что поможет вам исследовать этот вариант без необходимости сразу решать?',
    es:'¿Qué te permitiría explorar esta opción sin presión por decidir?',
  },
  options_text_v1:{
    en:'What is one small and safe way to find out whether this option suits you?',
    ru:'Как можно маленьким и безопасным шагом проверить, подходит ли вам этот вариант?',
    es:'¿Cómo podrías explorar con un paso pequeño y seguro si esta opción te conviene?',
  },
})

const stageMap=Object.freeze({
  reality:'reality',obstacle:'reality',explore:'reality',listen:'reality',
  scaling:'reality',knowhow:'reality',current:'reality',barrier:'reality',
  options:'options',option:'options',alternatives:'options',discover:'options',
  dream:'options',design:'options',experiment:'options',
  goal:'goal',topic:'goal',frame:'goal',outcome:'goal',wish:'goal',preferred:'goal',
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

// At most one deeper reflection per stage (focus, reality, possibilities), three total.
// A customer may always skip it and return to the fixed authored course.
export function authoredFollowupFor(question,answer,reflections={}){
  if(!question||typeof question.id!=='string'||typeof answer!=='string'||!answer.trim()||urgent.test(answer))return null
  const stage=coachingStageKey(question)
  if(stage!=='goal'&&stage!=='reality'&&stage!=='options')return null
  const rows=reflections&&typeof reflections==='object'&&!Array.isArray(reflections)
    ?Object.values(reflections).filter(value=>value&&typeof value==='object'):[]
  if(rows.length>=3||rows.some(row=>row.stage===stage))return null
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
  // A question is not necessarily a goal; retain the API argument but never infer one.
  void clientQuestion
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
