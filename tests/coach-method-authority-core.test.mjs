import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PERSONAS,PUBLIC_COACH_PERSONA_IDS,COACH_METHOD_CODES,resolveCoachMethodId} from '../lib/coaching/persona-registry.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachSessionDirective} from '../lib/coaching/coach-session-director.mjs'
import {newCoachSession,sealCoachSession,openCoachSession,advanceCoachSession} from '../lib/coaching/session-authority.mjs'
const actor={id:'99999999-0000-4000-8000-000000000001',claims:{session_id:'11111111-0000-4000-8000-000000000001'}}
const otherActor={id:'99999999-0000-4000-8000-000000000002',claims:{session_id:'11111111-0000-4000-8000-000000000001'}}
const config={encryptionKey:Buffer.alloc(32,15)}
test('all registered personas allow only two canonical method choices',()=>{
 assert.equal(PUBLIC_COACH_PERSONA_IDS.length,7)
 assert.ok(COACH_PERSONAS.length>=PUBLIC_COACH_PERSONA_IDS.length)
 assert.equal(new Set(Object.values(COACH_METHOD_CODES)).size,6)
 for(const p of COACH_PERSONAS){
  const methods=p.methods.map(title=>COACH_METHOD_CODES[title])
  assert.equal(methods.length,2)
  assert.equal(resolveCoachMethodId(p.id),methods[0])
  assert.equal(resolveCoachMethodId(p.id,methods[1]),methods[1])
  for(const method of Object.values(COACH_METHOD_CODES))if(!methods.includes(method))
   assert.equal(resolveCoachMethodId(p.id,method),null)
 }
})
test('encrypted short-lived session rejects cross-account, changed persona and tampering',()=>{
 const now=Date.now()
 const state=newCoachSession(actor,'mira',now-2500,'oskar')
 const token=sealCoachSession(state,config,actor)
 assert.equal(openCoachSession(token,config,actor,'mira',now).methodId,'oskar')
 assert.equal(openCoachSession(token,config,otherActor,'mira',now),null)
 assert.equal(openCoachSession(token,config,actor,'sofia',now),null)
 assert.throws(()=>newCoachSession(actor,'mira',now,'tgrow'),/COACH_SESSION_INPUT_INVALID/)
 assert.throws(()=>sealCoachSession({...state,methodId:'tgrow'},config,actor),/COACH_SESSION_INPUT_INVALID/)
})
test('Director can use server-authorized secondary method but refuses wrong persona',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({personaId:'mira',locale:'ru',consent:true,message:'Я хочу разобраться с рабочей задачей',turns:[]})
 assert.equal(coachSessionDirective(input,persona).methodId,'grow')
 const directive=coachSessionDirective({...input,authoritativeMethodId:'oskar'},persona)
 assert.equal(directive.methodId,'oskar')
 assert.equal(directive.methodLocked,true)
 assert.throws(()=>coachSessionDirective({...input,authoritativeMethodId:'tgrow'},persona),/COACHING_BRAIN_INPUT_INVALID/)
})
test('client conversation history is not permission to advance private stages',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({personaId:'mira',locale:'ru',consent:true,message:'Привет',turns:[{role:'user',content:'Я сделаю это завтра, это реально'}]})
 const flags=['goalRestated','goalConfirmed','keyFactsCaptured','constraintsReviewed','optionsExplored','clientActionApproved','timingSpecified','feasibilityChecked','summaryReviewed','workingFocusEstablished','topicNamed','desiredOutcome','internalObstacle','clientScale','existingStrength','pastException','positiveExperience','ifThenPlan']
 const directive=coachSessionDirective({...input,authoritativeMethodId:'grow',authoritativeNoAdvice:false,authoritativeEvidence:Object.fromEntries(flags.map(k=>[k,false]))},persona)
 assert.equal(directive.methodStepId,'grow:goal')
 assert.equal(directive.canOfferAction,false)
})
test('session stores flags, not actual personal utterance',()=>{
 const state=newCoachSession(actor,'mira',Date.now()-1000,'oskar')
 const statement='Я хочу обсудить работу и отношения.'
 const result=advanceCoachSession(state,{locale:'ru',message:statement})
 assert.equal(JSON.stringify(result.session).includes(statement),false)
 assert.equal(result.session.methodId,'oskar')
})

test('pausing then continuing preserves method milestones and uses active time, not wall time',()=>{
 const now=Date.now()
 const initial=newCoachSession(actor,'mira',now-35*60*1000,'oskar')
 const before={...initial,turnCount:7,evidence:{...initial.evidence,goalRestated:true,desiredOutcome:true}}
 for(const [locale,message] of [['ru','Давайте продолжим'],['en','Let\'s continue'],['es','Sigamos']]){
  const result=advanceCoachSession(before,{message,locale,activeSeconds:60},now)
  assert.equal(result.session.startedAt,before.startedAt)
  assert.equal(result.session.turnCount,8)
  assert.equal(result.session.methodId,'oskar')
  assert.equal(result.session.evidence.goalRestated,true)
  assert.equal(result.session.evidence.desiredOutcome,true)
  assert.equal(result.closingOfferDue,false)
  assert.equal(result.elapsedSeconds,60)
 }
})
