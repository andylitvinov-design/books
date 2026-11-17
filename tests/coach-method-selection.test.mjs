import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCoachPersona,COACH_PERSONAS,COACH_METHOD_CODES,resolveCoachMethodId,resolveCoachSelection,coachSessionHref} from '../lib/coaching/persona-registry.mjs'
import {normalizeGenerativeCoachInput} from '../lib/coaching/generative-persona.mjs'
import {coachSessionDirective} from '../lib/coaching/coach-session-director.mjs'
import {newCoachSession,sealCoachSession,openCoachSession,advanceCoachSession} from '../lib/coaching/session-authority.mjs'
const actor={id:'99999999-0000-4000-8000-000000000001',claims:{session_id:'11111111-0000-4000-8000-000000000001'}}
const otherActor={id:'99999999-0000-4000-8000-000000000002',claims:{session_id:'11111111-0000-4000-8000-000000000001'}}
const config={encryptionKey:Buffer.alloc(32,15)}
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('all nine coaches have exactly two allowlisted method codes',()=>{
 assert.equal(COACH_PERSONAS.length,9)
 assert.equal(new Set(Object.values(COACH_METHOD_CODES)).size,6)
 for(const p of COACH_PERSONAS){
  const codes=p.methods.map(title=>COACH_METHOD_CODES[title])
  assert.equal(codes.length,2)
  assert.equal(resolveCoachMethodId(p.id),codes[0])
  assert.equal(resolveCoachMethodId(p.id,codes[1]),codes[1])
  assert.equal(resolveCoachMethodId(p.id,'not_approved'),null)
  for(const code of Object.values(COACH_METHOD_CODES))
   if(!codes.includes(code))assert.equal(resolveCoachMethodId(p.id,code),null)
 }
 assert.equal(getCoachPersona('__proto__'),null)
})
test('URL method choice is allowed only for the selected persona',()=>{
 for(const p of COACH_PERSONAS){
  const method=COACH_METHOD_CODES[p.methods[1]]
  const href=coachSessionHref('ru',p.id,{},method)
  const params=Object.fromEntries(new URL(href,'https://example.test').searchParams)
  assert.equal(params.method,method)
  assert.equal(resolveCoachSelection(params).methodId,method)
  assert.equal(resolveCoachSelection({...params,method:'unregistered'}),null)
  assert.equal(coachSessionHref('en',p.id,{},'unregistered'),null)
 }
})
test('signed cookie locks the chosen method and rejects different accounts or tampered choices',()=>{
 const now=Date.now()
 const state=newCoachSession(actor,'mira',now-2500,'oskar')
 const token=sealCoachSession(state,config,actor)
 assert.equal(openCoachSession(token,config,actor,'mira',now).methodId,'oskar')
 assert.equal(openCoachSession(token,config,otherActor,'mira',now),null)
 assert.equal(openCoachSession(token,config,actor,'sofia',now),null)
 assert.throws(()=>newCoachSession(actor,'mira',now,'tgrow'),/COACH_SESSION_INPUT_INVALID/)
 assert.throws(()=>sealCoachSession({...state,methodId:'tgrow'},config,actor),/COACH_SESSION_INPUT_INVALID/)
 assert.equal(advanceCoachSession(state,{locale:'ru',message:'Я хочу разобраться с делами'},now+100).session.methodId,'oskar')
})
test('Director uses authoritative session method; browser turn cannot switch it',()=>{
 const {input,persona}=normalizeGenerativeCoachInput({personaId:'mira',locale:'ru',consent:true,
  message:'Я хочу разобраться с рабочей задачей',turns:[]})
 assert.equal(coachSessionDirective(input,persona).methodId,'grow')
 const approved=coachSessionDirective({...input,authoritativeMethodId:'oskar'},persona)
 assert.equal(approved.methodId,'oskar')
 assert.equal(approved.methodStepId,'oskar:outcome')
 assert.equal(approved.methodLocked,true)
 assert.throws(()=>coachSessionDirective({...input,authoritativeMethodId:'tgrow'},persona),/COACHING_BRAIN_INPUT_INVALID/)
 // Browser method is allowed only as an equality assertion against the cookie.
 assert.equal(normalizeGenerativeCoachInput({personaId:'mira',locale:'ru',consent:true,
  message:'Hello',turns:[],methodId:'oskar'}).persona.personaId,'mira')
 assert.throws(()=>normalizeGenerativeCoachInput({personaId:'mira',locale:'ru',consent:true,
  message:'Hello',turns:[],methodId:'tgrow'}),/COACHING_BRAIN_INPUT_INVALID/)
})
test('the existing site locks a method before either text or voice and never silently downgrades',()=>{
 const route=source('app/api/app/[...path]/route.js')
 const brain=source('lib/app/coaching-brain.js')
 const ui=source('components/my-coach-live-dialogue.jsx')
 const catalog=source('components/my-coach-catalog.jsx')
 const bridge=source('components/public-coaching-discovery.jsx')
 assert.match(route,/onlyKeys\(body,\['personaId','methodId'\]\)/)
 assert.match(route,/resolveCoachMethodId\(body\?\.personaId,body\?\.methodId\)/)
 assert.match(brain,/authoritativeMethodId:sessionState\.methodId/)
 assert.match(route,/body\.methodId!==session\.methodId/)
 assert.match(ui,/const sessionStart=await requestServerCoachSession\(\)/)
 assert.match(ui,/if\(!sessionStart\.ok\)/)
 assert.match(catalog,/data-coach-method-selector/)
 assert.match(bridge,/methodId=\{personaSelection\?\.methodId\}/)
})
