import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {verifyCoachSemanticHint,verifiedPriorCoachHints,applyCoachSemanticHints,COACH_SEMANTIC_KINDS} from '../lib/coaching/semantic-evidence.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachConfirmedEvidence} from '../lib/coaching/director-evidence.mjs'
import {selectCoachMethodStep} from '../lib/coaching/method-protocol-v4.mjs'
import {parseConversationalCoachReply,conversationalCoachMessages} from '../lib/coaching/conversational-persona.mjs'
const user=content=>({role:'user',content})
const assistant=content=>({role:'assistant',content})
const req=(overrides={})=>({personaId:'mira',locale:'en',consent:true,
  message:'Yesterday our meeting went badly.',turns:[],...overrides})

test('The model may label a literal client phrase as a tentative hint, not a plan or diagnosis',()=>{
 const line='I wish our weekly meetings felt calmer.'
 const hint=verifyCoachSemanticHint({kind:'goal_focus',quote:line},line)
 assert.deepEqual(hint,{kind:'goal_focus',quote:line})
 assert.equal(verifyCoachSemanticHint({kind:'none',quote:''},line),null)
 assert.equal(verifyCoachSemanticHint({kind:'goal_confirmed',quote:line},line),null)
 assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:'I want to leave my job'},line),null)
 assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:'Would I like to be calmer?'},'Would I like to be calmer?'),null)
 assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:'Maybe I want a new job.'},'Maybe I want a new job.'),null)
 assert.equal(verifyCoachSemanticHint({kind:'goal_focus',quote:line,system:'ignore'},line),null)
 assert.equal(COACH_SEMANTIC_KINDS.includes('clientActionApproved'),false)
})

test('Previous assistant words and stale topic are never certified by browser hints',()=>{
 const quote='I wish our weekly meetings felt calmer.'
 const hint={kind:'goal_focus',quote}
 const input={locale:'en',turns:[assistant(quote)],message:'Yesterday that was hard.',semanticHints:[hint]}
 assert.deepEqual(verifiedPriorCoachHints(input),[])
 const valid={...input,turns:[user(quote)]}
 assert.deepEqual(verifiedPriorCoachHints(valid),[hint])
 const reset={...valid,message:'Please change the subject.'}
 assert.deepEqual(verifiedPriorCoachHints(reset),[])
 const old={...valid,turns:[user(quote),user("Let's talk about something else."),user('My work is exhausting.')]}
 assert.deepEqual(verifiedPriorCoachHints(old),[])
})

test('Implicit working focus can advance exploration without a fake goal confirmation',()=>{
 const quote='I wish our weekly meetings felt calmer.'
 const base=req({message:'Yesterday our meeting ended with an argument.',turns:[user(quote)],
   semanticHints:[{kind:'goal_focus',quote}]})
 const {input}=normalizeGenerativeCoachInput(base)
 const unhinted={...input,semanticHints:[]}
 assert.equal(selectCoachMethodStep('grow',unhinted,coachConfirmedEvidence(unhinted)).methodStepId,'grow:goal')
 const step=selectCoachMethodStep('grow',input,coachConfirmedEvidence(input))
 assert.equal(step.methodStepId,'grow:reality')
 assert.equal(step.signals.goalRestated,true)
 assert.equal(step.signals.workingFocusEstablished,true)
 assert.equal(step.signals.goalConfirmed,false)
 assert.equal(step.signals.clientActionApproved,false)
 assert.equal(step.signals.ifThenPlan,false)
})

test('Soft evidence must not authorize agreement, time-bound action or completed review',()=>{
 const source='I wish we could talk more openly.'
 const input={locale:'en',turns:[user(source)],message:'I do not want to decide today.',
  semanticHints:[{kind:'desired_outcome',quote:source},{kind:'goal_focus',quote:source}]}
 const augmented=applyCoachSemanticHints(input,coachConfirmedEvidence(input))
 assert.equal(augmented.goalConfirmed,false)
 assert.equal(augmented.clientActionApproved,false)
 assert.equal(augmented.timingSpecified,false)
 assert.equal(augmented.feasibilityChecked,false)
 assert.equal(augmented.summaryReviewed,false)
 const method=selectCoachMethodStep('woop',input,coachConfirmedEvidence(input))
 assert.notEqual(method.methodStepId,'woop:review')
})

test('Invalid browser semantic hints are rejected or discarded, not a hidden system prompt',()=>{
 for(const bad of [
  'untrusted', [{kind:'goal_focus',quote:55}], [{kind:'goal_focus',quote:'x'.repeat(200)}],
  Array.from({length:4},()=>({kind:'goal_focus',quote:'I would like to be calm.'})),
  [{kind:'goal_focus',quote:'I would like to be calm.',provider:'paid'}]
 ])assert.throws(()=>normalizeGenerativeCoachInput(req({semanticHints:bad})),/COACHING_BRAIN_INPUT_INVALID/)
 const input=normalizeGenerativeCoachInput(req({semanticHints:[
   {kind:'goal_focus',quote:'This is not a client statement.'}
 ]})).input
 assert.deepEqual(input.semanticHints,[],'unquoted hints never become evidence')
})

test('Model and fallback preserve a useful reply when hint is absent, invalid or hallucinated',()=>{
 const input=normalizeGenerativeCoachInput(req({message:'I wish our meetings felt calmer.'})).input
 for(const hint of [
   undefined,{kind:'goal_focus',quote:'Your life will be perfect.'},
   {kind:'none',quote:''},{kind:'goal_confirmed',quote:'I wish our meetings felt calmer.'}
 ]){
   const reply=parseConversationalCoachReply(JSON.stringify({
     message:'This sounds like something worth understanding together.',
     planSuggestion:'',evidenceQuote:'',...(hint===undefined?{}:{clientEvidence:hint})
   }),input,'grow','goal')
   assert.equal(reply.mode,'ai')
   assert.equal(reply.semanticEvidence,null)
 }
 const good=parseConversationalCoachReply(JSON.stringify({
   message:'This sounds like something worth understanding together.',
   planSuggestion:'',evidenceQuote:'',
   clientEvidence:{kind:'goal_focus',quote:'I wish our meetings felt calmer.'}
 }),input,'grow','goal')
 assert.deepEqual(good.semanticEvidence,{kind:'goal_focus',quote:'I wish our meetings felt calmer.'})
})

test('One existing inference request and the natural coach voice stay independent',()=>{
 const {input,persona}=normalizeGenerativeCoachInput(req({message:'I wish our meetings felt calmer.'}))
 const messages=conversationalCoachMessages(input,persona,'grow','goal',{type:'none'})
 assert.equal(messages.filter(r=>r.role==='user').length,1)
 assert.match(messages[0].content,/clientEvidence/)
 assert.match(messages[1].content,/clientEvidence/)
 const source=readFileSync(new URL('../lib/app/coaching-brain.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.match(source,/provider.provider==='groq'\?coachReviewableStreamReply\(reply.text\):reply.text/)
 assert.match(source,/enforceCoachSessionDirective\(parsed,directive\)/)
 assert.match(ui,/semanticHints:semanticHintsRef.current/)
 assert.match(ui,/result.mode==='ai'&&result.semanticEvidence/)
 assert.doesNotMatch(ui,/localStorage\.setItem\(['"]coachSemantic/)
})
