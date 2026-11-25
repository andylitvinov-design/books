/**
 * Provisional per-turn My Coach state card for the EXISTING single model call.
 * Only literal client statements from the active topic are permitted. This is
 * not a persisted profile, clinical assessment, verified fact or a consent flag.
 * Coach messages, inferred motives and stale pre-correction themes are excluded.
 */
import {coachProtocolControlUtterance} from './coach-protocol-relevance.mjs'
import {coachClientTurns} from './director-evidence.mjs'
import {verbatimClientClauses} from './coach-ephemeral-context.mjs'
import {coachInformationCoverage} from './coach-information-coverage.mjs'

export const COACH_SESSION_CARD_VERSION='hh-coach-session-card-v1-20261119'

const patterns=Object.freeze({
 workingTopic:/(?:\b(?:i (?:want|need|would like|am trying|hope) to|my (?:goal|priority|problem|concern) is)\b|(?:я хочу|я пытаюсь|мне важно|мне нужно|моя цель|мой запрос|меня волнует)|(?:quiero|necesito|me gustaría|mi objetivo|me preocupa))/iu,
 desiredResult:/(?:\b(?:i want to (?:feel|be able|understand|decide|change)|i would like (?:to feel|to be able|to understand|to decide)|my desired outcome|i hope to)\b|(?:я хочу (?:чувствовать|понять|разобраться|решить|изменить)|хотелось бы (?:понять|изменить|научиться)|мой желаемый результат)|(?:me gustaría (?:sentir|comprender|cambiar|decidir)|quiero (?:sentirme|entender|cambiar)))/iu,
 keyFacts:/(?:\b(?:yesterday|today|last week|last month|for example|when i|at work|this morning|the last time)\b|(?:вчера|сегодня|на прошлой неделе|в прошлый раз|например|когда я|на работе|в понедельник)|(?:ayer|hoy|la semana pasada|por ejemplo|cuando yo|en el trabajo))/iu,
 constraints:/(?:\b(?:because|but i can't|i cannot|not enough time|i lack|the obstacle|the problem is|what stops me)\b|(?:потому что|мне мешает|не хватает|нет времени|ограничени|препятстви|проблема в том)|(?:porque|me impide|no tengo tiempo|me falta|el obstáculo))/iu,
 attempted:/(?:\b(?:i tried|i have tried|i used to|i already did|last time i tried|i attempted)\b|(?:я пробовал|я пробовала|я пытался|я пыталась|уже делал|уже делала|раньше я)|(?:intenté|he intentado|ya probé|antes yo))/iu,
 feelings:/(?:\b(?:i feel|i am afraid|i'm afraid|i feel torn|i'm worried|i feel anxious|i'm angry)\b|(?:мне (?:страшно|тревожно|грустно|обидно|тяжело)|я (?:боюсь|тревожусь|злюсь|расстроен|расстроена|чувствую))|(?:me siento|tengo miedo|estoy preocupado|estoy preocupada))/iu,
 values:/(?:\b(?:what matters to me|i value|my values|most important to me)\b|(?:для меня важно|я ценю|мои ценности|мне дороже)|(?:para mí es importante|valoro|mis valores))/iu,
})
const allowedEvidence=/^[a-z][A-Za-z0-9]{1,56}$/

export function coachSessionCard(input={},directive={}){
 // coachClientTurns owns both the recent-turn limit and invalidation following
 // a client correction or topic change; all source text is already validated.
 const clauses=[...new Set(coachClientTurns(input).filter(value=>!coachProtocolControlUtterance(value)).flatMap(verbatimClientClauses))].filter(value=>!coachProtocolControlUtterance(value))
 const take=(expression,limit=1)=>{
   const hits=[]
   for(let i=clauses.length-1;i>=0&&hits.length<limit;i--){
     if(expression.test(clauses[i]))hits.push(clauses[i])
   }
   return hits.reverse()
 }
 const one=key=>take(patterns[key])[0]||null
 const coverage=coachInformationCoverage({
   personaId:directive?.personaId,methodId:directive?.methodId,
   evidence:directive?.evidence,clientClauses:clauses,
   currentMissing:directive?.readiness?.missing
 })
 const missing=(Array.isArray(directive?.readiness?.missing)?directive.readiness.missing:[])
   .filter(key=>typeof key==='string'&&allowedEvidence.test(key)).slice(0,4)
 return Object.freeze({
   version:COACH_SESSION_CARD_VERSION,
   provenance:'provisional_verbatim_client_only',
   currentAuthorizedStep:typeof directive?.methodStepId==='string'?directive.methodStepId:null,
   workingTopicQuote:one('workingTopic'),
   desiredOutcomeQuote:one('desiredResult'),
   keyFactQuotes:Object.freeze(take(patterns.keyFacts,2)),
   constraintQuotes:Object.freeze(take(patterns.constraints,2)),
   attemptedApproachQuote:one('attempted'),
   selfReportedFeelingQuote:one('feelings'),
   valueQuote:one('values'),
   stillMissingEvidence:Object.freeze(missing),
   // Compact provisional evidence inventory for the EXISTING single model turn.
   // No new provider request, persisted record, or authority over the Director.
   informationAudit:coverage?Object.freeze({
     methodId:coverage.methodId,
     fields:Object.freeze(coverage.fields.map(row=>Object.freeze({
       id:row.id,status:row.status,quote:row.quote,
       missingSignals:row.missingSignals
     }))),
     required:coverage.required,
     nextFieldWithinAuthorizedStage:coverage.nextFieldWithinAuthorizedStage,
     semanticRelevanceVerified:false
   }):null,
 })
}
