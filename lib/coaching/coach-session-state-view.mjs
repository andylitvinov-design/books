/**
 * Read-only, per-tab session state for the existing My Coach screen.
 * All content is a literal excerpt of the client's current-topic utterances;
 * method/stage are accepted only from the Director's progress metadata.
 * No network, extra inference, durable storage, inferred diagnosis or consent.
 */
import {coachSessionCard} from './coach-session-card.mjs'
import {coachProtocolEvidenceVeto,coachProtocolCandidateStatus} from './coach-protocol-relevance.mjs'
import {verbatimClientClauses} from './coach-ephemeral-context.mjs'
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'

export const COACH_SESSION_STATE_VIEW_VERSION='hh-coach-session-state-view-v1-20261119'
const allowedMethods=new Set(['grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry'])
const allowedLocales=new Set(['en','ru','es'])
const explicitReset=/(?:^не об этом|^нет[,;:]?\s*я имел|^давайте о другом|^поменяем тему|^new topic|^let's switch topics|^hablemos de otra cosa)/iu
const cues=Object.freeze({
  topic:/(?:\b(?:i (?:want|need|would like|am trying|hope) to|my (?:goal|priority|problem|concern) is)\b|(?:я хочу|я пытаюсь|мне важно|мне нужно|моя цель|мой запрос|меня волнует)|(?:quiero|necesito|me gustaría|mi objetivo|me preocupa))/iu,
  outcome:/(?:\b(?:i want to (?:feel|be able|understand|decide|change)|i would like (?:to feel|to be able|to understand|to decide)|my desired outcome|i hope to)\b|(?:я хочу (?:чувствовать|понять|разобраться|решить|изменить)|хотелось бы (?:понять|изменить|научиться)|мой желаемый результат)|(?:me gustaría (?:sentir|comprender|cambiar|decidir)|quiero (?:sentirme|entender|cambiar)))/iu,
  fact:/(?:\b(?:yesterday|today|last week|last month|for example|when i|this morning|the last time)\b|(?:вчера|сегодня|на прошлой неделе|в прошлый раз|например|когда я|в понедельник)|(?:ayer|hoy|la semana pasada|por ejemplo|cuando yo))/iu,
  constraint:/(?:\b(?:because|but i can't|i cannot|not enough time|i lack|the obstacle|the problem is|what stops me)\b|(?:потому что|мне мешает|не хватает|нет времени|ограничени|препятстви|проблема в том)|(?:porque|me impide|no tengo tiempo|me falta|el obstáculo))/iu,
  resource:/(?:\b(?:i (?:can|managed|have managed|succeeded|know how to|got through)|my (?:strength|resource) is|what helps me|i have support)\b|(?:мне помог(?:ает|ло)|я (?:смог|смогла|умею|справился|справилась|могу)|у меня (?:получилось|получалось|есть поддержка)|меня поддержива(?:ет|ют))|(?:me ayuda|me ayudó|puedo|pude|sé cómo|me apoyan))/iu,
  possibleTension:/(?:\b(?:on the one hand|on the other hand|i'm torn between|i want .{3,140} but |i need .{3,140} but )|(?:с одной стороны|с другой стороны|я хочу.{3,140}но\s|мне важно.{3,140}но\s|я разрываюсь|и хочется.{3,140}и страшно)|(?:por un lado|por otro lado|quiero .{3,140} pero |necesito .{3,140} pero ))/iu,
})

function activeClientUtterances(turns,locale){
  const onlyClient=(Array.isArray(turns)?turns:[])
    .filter(turn=>turn?.role==='user'&&typeof turn.content==='string'&&turn.content.trim())
    .slice(-96).map(turn=>turn.content.trim())
  let resetAt=0
  for(let i=0;i<onlyClient.length;i++){
    const act=understandCoachingTurn({locale,message:onlyClient[i]}).act
    if(act==='correction'||act==='topic_shift'||explicitReset.test(onlyClient[i]))resetAt=i
  }
  return onlyClient.slice(resetAt)
}

export function coachSessionStateView({turns=[],locale='en',progress=null}={}){
  const language=allowedLocales.has(locale)?locale:'en'
  const client=activeClientUtterances(turns,language)
  const current=client.at(-1)||''
  const isDirector=progress?.source==='director-client-evidence'&&
    allowedMethods.has(progress.methodId)&&Number.isInteger(progress.index)&&
    progress.index>=0&&progress.index<=5
  const methodId=isDirector?progress.methodId:null
  const currentAuthorizedStep=isDirector&&typeof progress.stepId==='string'&&progress.stepId!=='complete'
    ?methodId+':'+progress.stepId:null
  const base=coachSessionCard({locale:language,turns:client.slice(0,-1).map(content=>({role:'user',content})),message:current},
    {methodId,methodStepId:currentAuthorizedStep,readiness:{missing:[]}})
  // Read only active-topic client clauses, never coach assertions or old topics.
  // Latest matching excerpts take priority; every excerpt is verifiable in a
  // user-authored turn, even after the ten-turn LLM context window has moved.
  const clauses=[...new Set(client.filter(text=>!coachProtocolEvidenceVeto(text)).flatMap(verbatimClientClauses))].filter(text=>!coachProtocolEvidenceVeto(text))
  const take=(pattern,limit)=>{
    const picked=[]
    for(let i=clauses.length-1;i>=0&&picked.length<limit;i--){
      if(pattern.test(clauses[i]))picked.push(clauses[i])
    }
    return picked.reverse()
  }
  const one=pattern=>take(pattern,1)[0]||null
  return Object.freeze({
    version:COACH_SESSION_STATE_VIEW_VERSION,
    provenance:'provisional_verbatim_client_only',
    factStatus:Object.freeze({
      topic:coachProtocolCandidateStatus(one(cues.topic)),
      outcome:coachProtocolCandidateStatus(one(cues.outcome)),
      facts:coachProtocolCandidateStatus(take(cues.fact,3).length),
      tensions:coachProtocolCandidateStatus(take(cues.possibleTension,2).length),
      resources:coachProtocolCandidateStatus(take(cues.resource,3).length),
    }),
    clientTurnCount:client.length,
    workingTopicQuote:one(cues.topic),
    desiredOutcomeQuote:one(cues.outcome),
    keyFactQuotes:Object.freeze(take(cues.fact,3)),
    constraintQuotes:Object.freeze(take(cues.constraint,3)),
    possibleTensionQuotes:Object.freeze(take(cues.possibleTension,2)),
    resourceQuotes:Object.freeze(take(cues.resource,3)),
    attemptedApproachQuote:base.attemptedApproachQuote,
    selfReportedFeelingQuote:base.selfReportedFeelingQuote,
    valueQuote:base.valueQuote,
    selectedMethodId:methodId,
    currentAuthorizedStep,
    stageVerifiedByDirector:isDirector,
  })
}
