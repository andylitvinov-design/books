/**
 * Wave Coaching Mode 2.0: pure deterministic *suggestion* for a single
 * server-authorized My Coach step. The existing Director owns stages, consent,
 * no-advice, safety and action permissions. This helper cannot advance them.
 *
 * No provider call, client facts in logs, account access, or new persistence.
 */
import {methodQuestionVariants} from './coach-method-question-variants.mjs'
import {personaSpeechCue} from './coach-persona-speech-variants.mjs'
import {chooseMethodStageReply} from './coach-stage-response-variants.mjs'
import {coachMethodStagePlan} from './method-protocol-v4.mjs'
export const COACH_DIALOGUE_SELECTOR_VERSION='hh-coach-dialogue-selector-v2-20261116'
const languages=new Set(['en','ru','es'])
const stageOverrides=new Set([
 'respond_socially','recontract','repair_misunderstanding','answer_first',
 'explain_question','allow_close','respect_no','reduce_scope',
 'listen_without_advice','reflect_without_question','invite_reflective_close'
])
const speechFor=Object.freeze({
 goal:'clarify',reality:'reflect',options:'transition',action:'action',review:'review'
})
const affinities=Object.freeze({
 mira:['gentle','reflective'],max:['direct','analytic'],
 sofia:['gentle','reflective'],alex:['analytic','direct'],
 merlin:['reflective','creative'],harry:['reflective','direct'],lea:['reflective','creative'],
 noah:['gentle','direct'],iris:['reflective','gentle'],
 ray:['creative','reflective']
})
const norm=text=>String(text||'').toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'')
 .replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const tokens=value=>new Set(norm(value).split(' ').filter(x=>x.length>2))
function sameQuestion(first,second){
 const a=norm(first),b=norm(second)
 if(!a||!b)return false
 if(a===b||a.includes(b)&&b.length>=24||b.includes(a)&&a.length>=24)return true
 const left=tokens(a),right=tokens(b)
 if(left.size<3||right.size<3)return false
 const intersection=[...left].filter(t=>right.has(t)).length
 return intersection>=3&&intersection/(left.size+right.size-intersection)>=.58
}
const recentCoachQuestions=input=>(Array.isArray(input?.turns)?input.turns:[])
 .filter(t=>t?.role==='assistant'&&typeof t.content==='string')
 .slice(-6).flatMap(t=>(t.content.match(/[^?!？]{6,220}[?？]/gu)||[]).map(q=>q.trim()))
const forceNoQuestion=new Set([
 'greeting','question_to_coach','clarification_request','gratitude',
 'correction','topic_shift','negation','affirmation','option_reference'
])
function actSpeech(act,stage){
 return act==='greeting'?'contact':
  act==='correction'||act==='topic_shift'?'repair':
  act==='gratitude'||act==='negation'?'pause':
  act==='uncertainty'||act==='hesitation'?'clarify':
  act==='question_to_coach'||act==='clarification_request'?'contact':
  speechFor[stage]||'reflect'
}
export function selectCoachDialogueVariant(input={},directive={},policy={},options={}){
 const locale=languages.has(directive?.locale)?directive.locale:
  languages.has(input?.locale)?input.locale:'en'
 const personaId=typeof directive?.personaId==='string'?directive.personaId:''
 const methodId=typeof directive?.methodId==='string'?directive.methodId:''
 const stepId=String(directive?.methodStepId||'').split(':')[1]||''
 const act=String(policy?.conversationAct||directive?.conversationAct||'')
 const speechAct=policy?.noAdvice===true?'pause':
  directive?.interventionId==='invite_reflective_close'?'review':
  actSpeech(act,directive?.stage)
 const cueAct=speechAct==='action'&&directive?.canOfferAction!==true?'transition':speechAct
 const personaCue=personaSpeechCue(personaId,cueAct,locale)
 const empty=(reasonCode)=>Object.freeze({
  version:COACH_DIALOGUE_SELECTOR_VERSION,locale,personaId,methodId,
  methodStepId:directive?.methodStepId||'',speechAct:cueAct,personaCue,
  stageCue:null,stageCueId:null,recommendedStepSeconds:null,sessionTargetSeconds:null,
  questionId:null,question:null,reasonCode
 })
 if(!methodId||!personaCue||!stepId||!directive?.methodStepId?.startsWith(methodId+':'))
  return empty('unsupported_editorial_context')
 if(forceNoQuestion.has(act)||stageOverrides.has(directive?.interventionId))
  return empty('latest_client_intent_wins')
 if(policy?.noAdvice===true)return empty('client_no_advice_boundary')
 if(policy?.questionStreak===true||policy?.allowQuestion===false||directive?.allowQuestion===false)
  return empty('question_streak_or_permission')
 if(options?.shortFragment===true)return empty('clarify_short_fragment_first')
 if(act==='uncertainty'||act==='hesitation')return empty('reduce_scope_first')
 const items=methodQuestionVariants(methodId,stepId,locale)
 if(items.length===0)return empty('no_approved_step_variant')
 const oldQuestions=recentCoachQuestions(input)
 const eligible=items.filter(row=>
   !oldQuestions.some(old=>sameQuestion(row.text,old)))
 if(!eligible.length)return empty('no_novel_question')
 const missing=Array.isArray(directive?.readiness?.missing)?directive.readiness.missing:[]
 const needed=eligible.filter(row=>missing.includes(row.target))
 const candidates=needed.length?needed:eligible
 const personaStyles=affinities[personaId]||[]
 const words=norm(input?.message).split(' ').filter(Boolean)
 const short=words.length<=9
 // 0.35 intent relevance, 0.25 missing-evidence fit, 0.15 persona style,
 // 0.15 novelty (already hard-filtered), 0.10 pacing/length compatibility.
 // These are editorial weights, NOT a validated psychological score.
 const ranked=candidates.map(row=>{
  const evidenceMatch=missing.includes(row.target)
  const styleFit=personaStyles.includes(row.style)
  const paceFit=short?row.text.length<=110:row.text.length>=58
  const latestFit=words.length>0&&(/pastException|keyFactsCaptured|positiveExperience/.test(row.target)
   ? /\b(?:when|last|yesterday|example)\b|(?:вчера|когда|случай|пример)|(?:ayer|cuando|ejemplo)/iu.test(input?.message||'')
   : true)
  return {row,score:.35*(latestFit?1:.65)+.25*(evidenceMatch?1:.45)+
   .15*(styleFit?1:.45)+.15+.10*(paceFit?1:.5)}
 }).sort((a,b)=>b.score-a.score||a.row.id.localeCompare(b.row.id))
 const selected=ranked[0]?.row
 if(!selected)return empty('no_eligible_question')
 const stageReply=chooseMethodStageReply(methodId,stepId,locale,cueAct,input?.turns)
 const time=coachMethodStagePlan(methodId,stepId)
 return Object.freeze({
  version:COACH_DIALOGUE_SELECTOR_VERSION,locale,personaId,methodId,
  methodStepId:directive.methodStepId,speechAct:cueAct,personaCue,
  stageCue:stageReply?.text||null,stageCueId:stageReply?.id||null,
  recommendedStepSeconds:time?.current?.recommendedSeconds||null,
  sessionTargetSeconds:time?.targetSeconds||null,
  questionId:selected.id,question:selected.text,
  reasonCode:needed.length?'missing_client_evidence':'stage_aligned_alternative'
 })
}
/**
 * Bounded semantic alternatives for the SAME, Director-authorized question
 * step. An LLM already handling the turn chooses the relevant meaning, never
 * this keyword score. No extra LLM call, stage transition or client retention.
 */
export function coachSemanticQuestionCandidates(input={},directive={},policy={},options={}){
 const selected=selectCoachDialogueVariant(input,directive,policy,options)
 if(!selected.question)return Object.freeze({selected,questions:Object.freeze([])})
 const [method,step]=String(selected.methodStepId||'').split(':')
 const rows=methodQuestionVariants(method,step,selected.locale)
 const primary=rows.find(row=>row.id===selected.questionId)
 const old=recentCoachQuestions(input)
 const missing=Array.isArray(directive?.readiness?.missing)?directive.readiness.missing:[]
 const allowed=rows.filter(row=>row.id!==selected.questionId&&
   !old.some(question=>sameQuestion(row.text,question)))
 const needed=allowed.filter(row=>missing.includes(row.target))
 const alternatives=needed.length?needed:allowed
 const second=[...alternatives].sort((a,b)=>
   Number(a.target===primary?.target)-Number(b.target===primary?.target)||
   a.id.localeCompare(b.id))[0]
 const questions=[Object.freeze({id:selected.questionId,text:selected.question,target:primary?.target||null})]
 if(second)questions.push(Object.freeze({id:second.id,text:second.text,target:second.target}))
 return Object.freeze({selected,questions:Object.freeze(questions)})
}

/**
 * This is inserted as one short guidance string into the EXISTING inference
 * prompt. The free/ZDR model may phrase the chosen question naturally, answer
 * the user's latest question instead, or omit a question. The bank may not
 * change the Director move or claim a completed stage.
 */
export function coachDialogueBankGuidance(input={},directive={},policy={},options={}){
 const {selected:chosen,questions}=coachSemanticQuestionCandidates(input,directive,policy,options)
 if(!chosen.personaCue)return ''
 const common='WAVE COACHING DIALOGUE BANK '+chosen.version+
  '; method-step='+chosen.methodStepId+
  '; speech act='+chosen.speechAct+
  '; reason='+chosen.reasonCode+'. '+
  'Persona cadence example (DO NOT copy verbatim or treat as a fact about the client): "'+
   chosen.personaCue+'". '+
  (chosen.stageCue?'Stage-specific neutral reply example (not a claim about the client, vary words): "'+
   chosen.stageCue+'". ':'')+
  (chosen.recommendedStepSeconds?'Estimated time for this step: '+chosen.recommendedStepSeconds+
   ' seconds within the nominal '+chosen.sessionTargetSeconds+
   '-second session. ADVISORY pacing only: elapsed time NEVER completes a step, forces disclosure, a plan, a deadline or an exit. ':'')
 if(!chosen.question)return common+
  'No method-step question is recommended on this turn. '+
  (chosen.reasonCode==='clarify_short_fragment_first'
    ?'If dictation was ambiguous, a brief neutral clarification is allowed. '
    :'Do not introduce a new method-stage question. ')+
  'Address the LATEST client words first. Never force an intake, diagnosis, plan, stage advancement or advice.'
 return common+'Director-authorized editorial question alternatives (NOT a questionnaire): '+
  questions.map((row,index)=>'candidate '+(index+1)+' question-id='+row.id+
    '; evidence='+row.target+'; "'+row.text+'"').join(' / ')+'. '+
  'SEMANTIC DECISION FOR THIS ONE MODEL TURN: First read what the latest client ACTUALLY said, what is clearly established and what remains unknown. Compare available alternatives for fit with the client meaning, readiness and missing evidence; never choose by keyword similarity alone. A question that the client already answered, that assumes a feeling/goal, or that prematurely asks for options, an action or a commitment is NOT appropriate. Express at most ONE authorized, genuinely useful question in your own natural words, or ask NONE and make one specific helpful observation. These are optional alternatives, NOT sequential questions. Follow the latest correction/refusal and the Director move, never advance the stage or claim agreement.'
}
