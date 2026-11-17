/**
 * An editorial guard for natural, low-context My Coach dialogue.
 * Pure and ephemeral: no new inference, persistence, speech processing or model calls.
 * Method/stage selection, consent and safety remain server-owned elsewhere.
 */
import {coachDialogueBankGuidance} from './coach-dialogue-selector.mjs'
const excludedActs=new Set(['greeting','gratitude','affirmation','negation',
  'uncertainty','hesitation','option_reference','correction','topic_shift',
  'clarification_request','question_to_coach'])
const genericOpening=/^(?:(?:вы|ты)\s+(?:упомянули|сказали|назвали|говорите|говорили)|you\s+(?:mentioned|said|brought\s+up)|mencionaste|has\s+mencionado)(?=[\s«"'.:,—!?-]|$)/iu
const genericIntake=/(?:что\s+бы\s+(?:вам|тебе)\s+хотелось|что\s+(?:вы|ты)\s+хотели\s+бы|какую\s+(?:цель|задачу)\s+(?:вы|ты)|what\s+would\s+you\s+like|what\s+do\s+you\s+want\s+to\s+(?:achieve|discuss|change)|qu[eé]\s+(?:te|le)\s+gustar[ií]a)/iu
const earlierRepair=/^(?:можно чуть подробнее\?|кажется, я пока не улавливаю|could you tell me a little more\?|i'm still not quite following|¿me cuentas un poco más\?|creo que aún no te sigo)/iu

export function isShortCoachFragment(input={},act='substantive_reply'){
  const value=typeof input.message==='string'?input.message.trim():''
  const words=value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]
  return act==='substantive_reply'&&!excludedActs.has(act)&&
    value.length>=2&&value.length<=64&&words.length>0&&words.length<=4&&
    /\p{L}/u.test(value)&&!/[?？]/u.test(value)
}
export function isMechanicalCoachIntake(value){
  const text=typeof value==='string'?value.trim():''
  return genericOpening.test(text)&&genericIntake.test(text)&&/[?？]\s*$/u.test(text)
}
export function coachNaturalDialogueGuidance(input={},dialogue={},directive=null){
  const recent=(Array.isArray(input.turns)?input.turns:[])
    .filter(x=>x?.role==='assistant'&&typeof x.content==='string').slice(-2)
  const short=isShortCoachFragment(input,dialogue.conversationAct)
  return [
    'SPOKEN-CONVERSATION QUALITY: The server-selected method stays fixed, but a method step is NOT a questionnaire template.',
    'Avoid the canned pattern "You mentioned X. What would you like to achieve/discuss/change about it?" and its RU/ES equivalents. Do not begin with "Вы упомянули" or "You mentioned".',
    'Match the client register. Use a fresh, everyday conversational sentence; specific listening is more important than formal empathy. Some turns naturally end without a question.',
    short?'LOW-CONTEXT SPOKEN FRAGMENT: This is only a few words, possibly imperfect dictation. It is not a verified topic, goal or commitment. Do NOT ask for outcomes, success metrics or what they wish to achieve. First clarify what they mean or gently invite one more detail, in a short relaxed line. This is the authorized clarification move, not a new coaching stage.':'',
    recent.some(x=>isMechanicalCoachIntake(x.content)||earlierRepair.test(x.content.trim()))
      ?'The coach already used a formulaic intake or clarification. Do not repeat its wording or ask an equivalent goal-intake question. Give room or clarify differently.':'',
    directive?coachDialogueBankGuidance(input,directive,dialogue,{shortFragment:short}):'',
  ].filter(Boolean).join(' ')
}
const repairs=Object.freeze({
  ru:Object.freeze({
    first:'Можно чуть подробнее? Хочу понять вас правильно.',
    again:'Кажется, я пока не улавливаю. Можете сказать иначе?',
    noQuestion:'Я слушаю. Не буду додумывать за вас.',
  }),
  en:Object.freeze({
    first:'Could you tell me a little more? I want to understand.',
    again:"I'm still not quite following. Could you put that another way?",
    noQuestion:"I'm listening. I won't guess what you mean.",
  }),
  es:Object.freeze({
    first:'¿Me cuentas un poco más? Quiero entenderte bien.',
    again:'Creo que aún no te sigo del todo. ¿Me lo dices de otra manera?',
    noQuestion:'Te escucho. No voy a adivinar lo que quieres decir.',
  }),
})
/**
 * Very narrow repair for short fragments that a model turns into boilerplate.
 * Do NOT rewrite substantive, corrected or direct-question responses.
 * A corrected wording never carries semantic evidence or a proposed plan.
 */
export function polishMechanicalCoachReply(message,input={},dialogue={}){
  if(!isShortCoachFragment(input,dialogue.conversationAct)||
    !isMechanicalCoachIntake(message))return null
  const locale=['ru','en','es'].includes(input.locale)?input.locale:'en'
  const phrases=repairs[locale]
  if(dialogue.allowQuestion===false)return phrases.noQuestion
  const recent=(Array.isArray(input.turns)?input.turns:[])
    .filter(x=>x?.role==='assistant'&&typeof x.content==='string').slice(-2)
  const alreadyAsked=recent.some(x=>isMechanicalCoachIntake(x.content)||earlierRepair.test(x.content.trim()))
  return alreadyAsked?phrases.again:phrases.first
}
