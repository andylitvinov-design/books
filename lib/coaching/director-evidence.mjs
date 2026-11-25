/**
 * Evidence-only hint extraction for ephemeral My Coach.
 * These flags come ONLY from client-authored text, never coach questions or
 * language-model claims. They are not consent, authenticated facts, or a
 * persisted session-state record. Correction/topic change invalidates old
 * topic evidence; one "yes" or a word in a model response proves nothing.
 */
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'

const goal=/(?:\b(?:my goal is|i want to|i would like to|i'm trying to)\b|(?:моя цель|мой запрос|я хочу|мне важно)|\b(?:mi objetivo es|quiero|me gustaría)\b)/iu
const goalConfirm=/(?:\b(?:my (?:actual )?goal is|that is my goal|i confirm (?:that|this|my goal)|yes, (?:that|this) is (?:my goal|what i want))\b|(?:моя цель\s*[:—-]|подтверждаю (?:эту )?цель|это мой запрос|да[,;:]? именно (?:этого|этот результат) я хочу)|\b(?:mi objetivo es|confirmo (?:este )?objetivo|sí, eso quiero)\b)/iu
const factualExample=/(?:\b(?:yesterday|last week|last time|this morning|for example|at work|when i (?:met|spoke|tried))\b|(?:вчера|на прошлой неделе|в последний раз|например|на работе|когда я (?:говорил|сказал|пробовал|пытал))|\b(?:ayer|la semana pasada|por ejemplo|en el trabajo|la última vez)\b)/iu
const constraint=/(?:\b(?:because|what stopped me|i (?:cannot|can't) because|what gets in the way|the obstacle is|i don't have time|i lack)\b|(?:потому что|мне мешает|препятстви|ограничени|не хватает времени|проблема в том[,]? что)|\b(?:porque|me impide|el obstáculo|no tengo tiempo|me falta)\b)/iu
const twoOptions=/(?:\b(?:either .{3,90} or |i could .{3,90} or |two options|two alternatives|option one .{3,90} option two)\b|(?:либо .{3,90} либо |один вариант .{3,90} другой|два варианта|могу .{3,90} или .{3,90})|\b(?:dos opciones|dos alternativas|puedo .{3,90} o .{3,90})\b)/iu
const explicitAction=/(?:\b(?:i will|i'll|i have decided to|i'm going to)\b|(?:я (?:сделаю|начну|попробую|выбираю)|я решил(?:а)? (?:начать|сделать))|\b(?:voy a|he decidido)\b)/iu
const negation=/(?:\b(?:i will not|i won't|not ready|maybe|perhaps|i am not going to)\b|(?:я не (?:буду|готов|сделаю|начну)|может быть|пока не готов)|\b(?:no voy a|no quiero|quizás|tal vez)\b)/iu
const when=/(?:\b(?:tomorrow|on monday|next week|this weekend|on friday|by friday|at (?:[1-9]|1[0-2]) (?:am|pm))\b|(?:завтра|в понедельник|на следующей неделе|в пятницу|к пятнице|сегодня вечером)|\b(?:mañana|el lunes|la próxima semana|el viernes)\b)/iu
const feasibility=/(?:\b(?:i have time|i can manage|i can do this|it is realistic|it is feasible|this feels doable)\b|(?:это реально|мне по силам|я могу это сделать|время есть|это выполнимо)|\b(?:es realista|lo puedo hacer|tengo tiempo|es viable)\b)/iu
const summary=/(?:\b(?:yes, that sums it up|that summary fits|that's my takeaway|i agree with that summary)\b|(?:да[,;:]? это мой итог|верно подытожили|это то[,]? что я понял|согласен с итогом)|\b(?:ese es mi resumen|sí, eso resume|estoy de acuerdo con el resumen)\b)/iu

function clientTurns(input){
 const current=String(input?.message||'').trim()
 const act=understandCoachingTurn(input).act
 // The client may correct an earlier inference; old history cannot
 // silently authorize a new stage on another topic.
 if(['correction','topic_shift'].includes(act))return current?[current]:[]
 const history=(Array.isArray(input?.turns)?input.turns:[])
   .filter(t=>t?.role==='user'&&typeof t.content==='string')
   .slice(-10).map(t=>t.content)
 // Previous corrections/topic changes must invalidate older client milestones.
 // Resetting only for the latest message let old goals reappear one turn later.
 const lastReset=history.reduce((index,text,at)=>{
   const act=understandCoachingTurn({locale:input?.locale,message:text}).act
   return ['correction','topic_shift'].includes(act)?at:index
 },-1)
 return [...history.slice(lastReset+1),...(current?[current]:[])]
}
export function coachClientTurns(input={}){ return clientTurns(input) }
export function coachConfirmedEvidence(input={}){
 const authored=clientTurns(input).filter(value=>!coachProtocolEvidenceVeto(value))
 const latest=String(input.message||'')
 const positive=latest.length>0&&!negation.test(latest)&&!coachProtocolEvidenceVeto(latest)
 const earlier=positive?authored.slice(0,-1):authored
 const flags={
   goalRestated:authored.some(text=>goal.test(text)&&!negation.test(text)),
   goalConfirmed:authored.some(text=>goalConfirm.test(text)&&goal.test(text)&&!negation.test(text)),
   keyFactsCaptured:authored.some(text=>factualExample.test(text)),
   constraintsReviewed:authored.some(text=>constraint.test(text)),
   optionsExplored:authored.some(text=>twoOptions.test(text)&&!negation.test(text)),
   // An isolated "I will do it tomorrow" is NOT a confirmed plan. There
   // must be prior client-authored alternatives, not a coach suggestion.
   clientActionApproved:positive&&explicitAction.test(latest)&&earlier.some(text=>twoOptions.test(text)),
   timingSpecified:positive&&explicitAction.test(latest)&&when.test(latest),
   feasibilityChecked:positive&&explicitAction.test(latest)&&feasibility.test(latest),
   summaryReviewed:positive&&summary.test(latest)
 }
 return Object.freeze(flags)
}
