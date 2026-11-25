/**
 * Compact coaching information checklist.
 * Derived only from visible CLIENT turns; no coach text, inferred diagnosis,
 * session clock or LLM stage is treated as confirmed client information.
 * Values are provisional until the client reviews the end-of-session PDF.
 */
import {coachProtocolEvidenceVeto,coachProtocolCandidateStatus} from './coach-protocol-relevance.mjs'
export const COACH_INFORMATION_KEYS=Object.freeze([
  'goal','motivation','obstacles','resources','situation','nextSteps'
])
const cues=Object.freeze({
  goal:/(?:\b(?:i want|i need|i hope|i would like|my goal|my desired result|i'm trying to|i am trying to)\b|(?:я хочу|мне нужно|моя цель|мой результат|хотелось бы|хочу научиться)|(?:quiero|necesito|mi objetivo|me gustar[ií]a|mi meta))/iu,
  motivation:/(?:\b(?:important to me|matters to me|i value|so that|so i can|because i want|my motivation)\b|(?:для меня важно|это важно|чтобы|ради того|потому что я хочу|моя мотивация)|(?:importante para m[ií]|me importa|para poder|porque quiero|mi motivaci[oó]n))/iu,
  obstacles:/(?:\b(?:the obstacle|what stops|in the way|i struggle|i cannot|i can't|it's hard|it is hard|not enough|i'm afraid|i am afraid)\b|(?:мешает|не получается|препятств|трудно|сложно|не хватает|я боюсь|не могу)|(?:obst[aá]culo|me impide|me cuesta|no puedo|tengo miedo|me falta))/iu,
  resources:/(?:\b(?:i can rely|helps me|helped me|supports me|my support|my strength|i have support|i can ask)\b|(?:мне помогает|меня поддерж|могу опереться|могу попросить|у меня есть поддержка|мой ресурс|моя сила)|(?:me ayuda|me apoya|puedo apoyarme|tengo apoyo|mi fortaleza|puedo pedir))/iu,
  situation:/(?:\b(?:right now|currently|my situation|at work|in my family|in my relationship|these days|this week|at the moment)\b|(?:сейчас|в моей ситуации|на работе|в семье|в отношениях|в последнее время|сегодня)|(?:ahora mismo|actualmente|mi situaci[oó]n|en el trabajo|en mi familia|en mi relaci[oó]n|esta semana))/iu,
  nextSteps:/(?:\b(?:my next step|i will|i'll start|i plan to|i am going to|i'll try|i commit to)\b|(?:мой следующий шаг|я сделаю|я начну|я попробую|я планирую|завтра я|на этой неделе я)|(?:mi pr[oó]ximo paso|voy a|planeo|empezar[eé]|har[eé]|intentar[eé]))/iu
})
const topicReset=/(?:\b(?:let's change (?:the )?topic|different topic|actually i meant|i changed my mind about|forget that topic)\b|(?:давайте сменим тему|другая тема|сменим тему|я передумал|я передумала|я имел в виду другое|я имела в виду другое)|(?:cambiemos de tema|otro tema|en realidad quer[ií]a decir))/iu
export const coachInformationClientTurns=turns=>{
  if(!Array.isArray(turns))return []
  const rows=turns.filter(turn=>turn?.role==='user'&&
    typeof turn.content==='string'&&turn.content.trim().length>0&&turn.content.length<=1200)
    .map(turn=>turn.content.trim()).slice(-80)
  const reset=rows.findLastIndex(text=>topicReset.test(text))
  return (reset<0?rows:rows.slice(reset)).filter(text=>!coachProtocolEvidenceVeto(text))
}
export function coachInformationChecklist(turns=[],{selectedGoal=''}={}){
  const client=coachInformationClientTurns(turns)
  return COACH_INFORMATION_KEYS.map(key=>{
    const evidence=[...client].reverse().find(text=>cues[key].test(text))||null
    // Longer, specific client statements provide fuller evidence. An incomplete
    // phrase is marked PARTIAL, never promoted by a coach's own suggestion.
    const enough=!!evidence&&evidence.length>=32&&evidence.split(/\s+/u).length>=5
    const selected=key==='goal'&&typeof selectedGoal==='string'&&selectedGoal.trim().length>0
    return Object.freeze({
      key,status:evidence?(enough?'complete':'partial'):selected?'partial':'missing',
      factStatus:coachProtocolCandidateStatus(evidence||selected), // legacy coverage is not confirmation
      quote:evidence?evidence.slice(0,200):null
    })
  })
}
