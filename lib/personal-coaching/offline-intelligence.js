import { buildCoachingRecap, coachingAnswerText } from './guided-session.js'
import { selectNextBestAction } from './coaching-methodology.mjs'
import {isGrowClarityQuestion} from './grow-20.mjs'

// Holistic House Coaching Intelligence P1: reviewed, deterministic prompts only.
// This module never calls a language model, storage, analytics or a provider.
// It offers a *question*, not an interpretation, diagnosis or fact about a client.

const prompts=Object.freeze({
  priority_choice_v1:{
    en:'Which one of these matters most in the next seven days?',
    ru:'Что из этого важнее всего в ближайшие семь дней?',
    es:'¿Qué es lo más importante de todo esto durante los próximos siete días?',
  },
  priority_text_v1:{
    en:'What makes this the most important priority right now?',
    ru:'Почему именно этот приоритет важнее всего сейчас?',
    es:'¿Qué hace que esta sea la prioridad más importante ahora?',
  },
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
  resources_choice_v1:{
    en:'When has something similar felt a little easier, and what helped then?',
    ru:'Когда в похожей ситуации вам было хоть немного легче и что тогда помогло?',
    es:'¿Cuándo te resultó algo más fácil en una situación parecida y qué te ayudó?',
  },
  resources_text_v1:{
    en:'What support or personal strength could make this feel a little more manageable?',
    ru:'Какая поддержка или ваша сильная сторона могла бы немного облегчить ситуацию?',
    es:'¿Qué apoyo o fortaleza personal podría hacer esta situación un poco más llevadera?',
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
  action_choice_v1:{
    en:'How could this step become small enough to feel safe and manageable?',
    ru:'Как сделать этот шаг достаточно маленьким, безопасным и посильным?',
    es:'¿Cómo hacer que este paso sea pequeño, seguro y posible?',
  },
  action_text_v1:{
    en:'What would make it easier to take this step at your own pace?',
    ru:'Что поможет вам сделать этот шаг в собственном темпе?',
    es:'¿Qué te ayudaría a dar este paso a tu propio ritmo?',
  },
})

const stageMap=Object.freeze({
  reality:'reality',obstacle:'reality',priorities:'reality',explore:'reality',listen:'reality',
  scaling:'reality',current:'reality',barrier:'reality',
  knowhow:'resources',resources:'resources',support:'resources',affirm:'resources',
  priority:'priority',priorities:'priority',
  options:'options',option:'options',alternatives:'options',discover:'options',
  dream:'options',design:'options',experiment:'options',
  goal:'goal',topic:'goal',frame:'goal',pilot_start:'goal',pilot_end:'review',outcome:'goal',wish:'goal',preferred:'goal',
  contract:'goal',define:'goal',desire:'goal',
  will:'action',action:'action',act:'action',
  commitment:'action',plan:'action',when:'when',destiny:'action',
  review:'review',deliver:'review',
})

export function coachingStageKey(question){
  const key=String(question?.stepKey||question?.stage||'').toLowerCase()
  return stageMap[key]||null
}

// At most one gentle followup per stage: focus, reality, resources, options, action.
// A customer may always skip it and return to the fixed authored course.
/** Safety/stop/pause control applies even after the final authored question. */
export function coachingControlForAnswer(answer,locale='en'){
  if(typeof answer!=='string'||!answer.trim())return null
  const decision=selectNextBestAction({stage:'review',message:answer,locale})
  if(!['safety_hold','stopped','paused'].includes(decision.status))return null
  return {
    key:'control_'+decision.status+'_v2',
    stage:'review',
    prompt:decision.question,
    methodologyVersion:decision.version,
    intervention:decision.intervention,
    method:decision.method,
    controlStatus:decision.status,
  }
}

export function authoredFollowupFor(question,answer,reflections={}){
  if(!question||typeof question.id!=='string'||isGrowClarityQuestion(question.id)||typeof answer!=='string'||!answer.trim())return null
  const stage=coachingStageKey(question)
  if(!['goal','reality','priority','resources','options','action'].includes(stage))return null
  const rows=reflections&&typeof reflections==='object'&&!Array.isArray(reflections)
    ?Object.values(reflections).filter(value=>value&&typeof value==='object'):[]
  if(rows.length>=5||rows.some(row=>row.stage===stage))return null

  // A single deterministic method decision turns the next authored follow-up into
  // a response to the client's current difficulty. No provider, storage or transcript.
  const decisions=Object.fromEntries(['en','ru','es'].map(locale=>[
    locale,selectNextBestAction({stage,message:answer,locale}),
  ]))
  const decision=decisions.en
  // Stop/pause/safety are control signals, not invitations to ask another question.
  if(['safety_hold','stopped','paused'].includes(decision.status)){
    return {
      key:'control_'+decision.status+'_v2',stage,questionId:question.id,
      prompt:Object.fromEntries(['en','ru','es'].map(locale=>[locale,decisions[locale].question])),
      methodologyVersion:decision.version,
      intervention:decision.intervention,method:decision.method,
      controlStatus:decision.status,
    }
  }
  if(decision.status==='skipped')return null

  const variant=answer.startsWith('choice:')?'choice':'text'
  const key=stage+'_'+variant+'_v1'
  const adaptive=new Set([
    'overload','ambivalence','possible_contradiction','advice_requested',
    'uncertainty','insufficient_specificity','limited_perceived_control',
    'action_too_large','coach_misunderstanding','emotional_distress',
  ]).has(decision.difficulty)
  const prompt=adaptive
    ?Object.fromEntries(['en','ru','es'].map(locale=>[locale,decisions[locale].question]))
    :prompts[key]
  if(!prompt)return null
  return {
    key,stage,questionId:question.id,prompt,
    methodologyVersion:decision.version,
    intervention:adaptive?decision.intervention:null,
    method:decision.method,
  }
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
