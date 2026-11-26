import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_METHOD_IDS,COACH_SESSION_TARGET_SECONDS,coachMethodStagePlan}
 from '../lib/coaching/method-protocol-v4.mjs'
import {COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'
import {COACH_METHOD_QUESTION_VARIANTS,methodQuestionVariants}
 from '../lib/coaching/coach-method-question-variants.mjs'
import {COACH_METHOD_STAGE_REPLIES,methodStageReplyVariants,chooseMethodStageReply}
 from '../lib/coaching/coach-stage-response-variants.mjs'
import {COACH_PERSONA_SPEECH_VARIANTS,personaSpeechCue}
 from '../lib/coaching/coach-persona-speech-variants.mjs'
import {selectCoachDialogueVariant,coachDialogueBankGuidance}
 from '../lib/coaching/coach-dialogue-selector.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachSessionDirective,directedCoachOfflineReply}
 from '../lib/coaching/coach-session-director.mjs'
import {coachDialoguePolicy} from '../lib/coaching/unified-coach-policy.mjs'

const localeNames=['en','ru','es']
const methodNames=['grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry']
const data=(methodId,stepId,personaId='mira',extra={})=>({
 locale:'ru',personaId,methodId,methodStepId:methodId+':'+stepId,
 stage:'goal',phase:'contract',interventionId:'stage_move',allowQuestion:true,
 canOfferAction:false,readiness:{ready:false,missing:methodQuestionVariants(methodId,stepId,'ru').map(x=>x.target)},
 ...extra
})
const policy={conversationAct:'substantive_reply',allowQuestion:true,noAdvice:false,questionStreak:false}
const message=(turns=[])=>({locale:'ru',message:'Я хотел бы глубже разобраться с выбором на работе',turns})
test('one canonical Director method order gives 31 steps and exact 20-minute advisory budgets',()=>{
 assert.deepEqual(COACH_METHOD_IDS,methodNames)
 assert.equal(COACH_SESSION_TARGET_SECONDS,1200)
 let stepCount=0
 for(const method of COACH_METHOD_IDS){
  const plan=coachMethodStagePlan(method)
  assert.equal(plan.targetSeconds,1200)
  assert.equal(plan.advisoryOnly,true)
  assert.equal(plan.advanceByClock,false)
  assert.equal(plan.currentIndex,0)
  assert.equal(plan.stages.at(-1).nominalEndSeconds,1200)
  assert.deepEqual(plan.stages.map(s=>s.id),Object.keys(COACH_METHOD_QUESTION_VARIANTS[method]))
  assert.deepEqual(plan.stages.map(s=>s.id),Object.keys(COACH_METHOD_STAGE_REPLIES[method]))
  for(const stage of plan.stages){
   assert.equal(stage.nominalEndSeconds-stage.nominalStartSeconds,stage.recommendedSeconds)
   assert.ok(stage.recommendedSeconds>=90&&stage.recommendedSeconds<=360)
   assert.ok(stage.requiredEvidence.length>=1)
   assert.equal(coachMethodStagePlan(method,stage.id).current.id,stage.id)
   stepCount++
  }
 }
 assert.equal(stepCount,31)
 assert.equal(coachMethodStagePlan('grow','does_not_exist'),null)
 assert.equal(coachMethodStagePlan('invalid'),null)
})
test('each one of 31 steps offers three original questions and three stage replies for every language',()=>{
 let questions=0,replies=0
 for(const m of COACH_METHOD_IDS)for(const {id} of coachMethodStagePlan(m).stages){
  for(const locale of localeNames){
   const qs=methodQuestionVariants(m,id,locale),rs=methodStageReplyVariants(m,id,locale)
   assert.equal(qs.length,3,m+':'+id+':'+locale)
   assert.equal(rs.length,3,m+':'+id+':'+locale)
   assert.equal(new Set(qs.map(q=>q.text)).size,3)
   assert.equal(new Set(rs.map(q=>q.text)).size,3)
   assert.ok(qs.every(x=>x.target&&x.text.length>=25&&/[?？]$/.test(x.text)))
   assert.ok(rs.every(x=>x.text.length>=24&&!/[?？]$/.test(x.text)))
   questions+=qs.length;replies+=rs.length
  }
 }
 assert.equal(questions,279)
 assert.equal(replies,279)
})
test('all current twelve personas, including Samir and Caesar, retain eight original tone moves in three locales',()=>{
 assert.equal(COACH_PERSONAS.length,12)
 assert.equal(Object.keys(COACH_PERSONA_SPEECH_VARIANTS).length,12)
 for(const p of COACH_PERSONAS){
  assert.ok(p.methods[0]&&p.methods.length>=1,'one active primary method for '+p.id)
  for(const locale of localeNames)for(const act of ['contact','reflect','clarify','repair','transition','pause','review','action']){
   assert.ok(personaSpeechCue(p.id,act,locale).length>=18,p.id+':'+locale+':'+act)
  }
 }
})
test('stage selection gives one contextual question plus method reply, persona voice and advisory seconds',()=>{
 for(const method of COACH_METHOD_IDS){
  const step=coachMethodStagePlan(method).stages[0].id
  const d=data(method,step)
  const turn=selectCoachDialogueVariant(message(),d,policy)
  assert.ok(turn.questionId?.startsWith(method+':'+step+':'))
  assert.ok(turn.stageCueId?.startsWith(method+':'+step+':line:'))
  assert.ok(turn.personaCue)
  assert.ok(turn.recommendedStepSeconds>=90)
  assert.equal(turn.sessionTargetSeconds,1200)
  const guidance=coachDialogueBankGuidance(message(),d,policy)
  assert.match(guidance,/Stage-specific neutral reply example/)
  assert.match(guidance,/ADVISORY pacing only/)
  assert.match(guidance,/at most ONE authorized/)
 }
})
test('three stage lines vary with speech act and avoid echoing recent coach reply',()=>{
 const first=chooseMethodStageReply('grow','goal','ru','clarify',[])
 const second=chooseMethodStageReply('grow','goal','ru','clarify',
  [{role:'assistant',content:first.text}])
 assert.ok(first&&second)
 assert.notEqual(first.id,second.id)
 const recent=methodStageReplyVariants('grow','goal','ru').map(x=>({role:'assistant',content:x.text}))
 assert.equal(chooseMethodStageReply('grow','goal','ru','clarify',recent),null)
 for(const act of ['pause','contact','repair'])
  assert.equal(chooseMethodStageReply('grow','goal','ru',act,[]),null)
})
test('clock never advances stage and correction/direct question/no advice override questions and stage framing',()=>{
 for(const id of ['mira','max','sofia','alex','harry']){
  const {input,persona}=normalizeGenerativeCoachInput({
   personaId:id,locale:'ru',consent:true,
   message:'Я пока пытаюсь разобраться с вопросом',turns:[],elapsedSeconds:1200
  })
  const d=coachSessionDirective(input,persona)
  assert.ok(d.stageTiming?.recommendedSeconds>0)
  assert.equal(d.stageTiming.sessionTargetSeconds,1200)
  assert.equal(d.stageTiming.advanceByClock,false)
  assert.equal(d.readiness.ready,false)
  const original=coachSessionDirective({...input,elapsedSeconds:10},persona)
  assert.equal(original.methodStepId,d.methodStepId)
 }
 const d=data('grow','goal')
 for(const act of ['question_to_coach','correction','greeting','negation']){
  const out=selectCoachDialogueVariant(message(),d,{...policy,conversationAct:act})
  assert.equal(out.question,null)
  assert.equal(out.stageCue,null)
 }
 for(const stop of [{noAdvice:true},{questionStreak:true},{allowQuestion:false}]){
  const out=selectCoachDialogueVariant(message(),d,{...policy,...stop})
  assert.equal(out.question,null)
  assert.equal(out.stageCue,null)
 }
})
test('provider-free reply uses original method-step cue and persona, never a fabricated client plan',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({
  personaId:'mira',locale:'ru',consent:true,
  message:'Хочу разобраться с выбором на работе',turns:[]
 })
 const director=coachSessionDirective(input,persona)
 const chosen=selectCoachDialogueVariant(input,director,coachDialoguePolicy(input))
 const output=directedCoachOfflineReply(input,director,'model_unavailable')
 assert.equal(output.method,director.methodId)
 assert.equal(output.stage,director.stage)
 assert.equal(output.planSuggestion,'')
 assert.equal(output.hypothesis,'')
 if(chosen.stageCue&&!director.empathyReflection)assert.ok(output.reflection.includes(chosen.stageCue))
 assert.ok(output.question===''||output.question.endsWith('?'))
})
