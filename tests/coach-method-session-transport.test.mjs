import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {startCoachMethodSession,prepareCoachMethodTurn,prepareCoachMethodRequest,coachMethodAuthorityInput} from '../lib/coaching/method-session-transport.mjs'
import {sealCoachSession} from '../lib/coaching/session-authority.mjs'
const actor={id:'99999999-0000-4000-8000-000000000001',claims:{session_id:'11111111-0000-4000-8000-000000000001'}}
const config={encryptionKey:Buffer.alloc(32,15)}
const ctx={actor,config}
const body={personaId:'mira',locale:'en',consent:true,message:'I want to understand my goal',turns:[],methodId:'oskar'}
test('explicit method handshake is bound to verified account and auth session',()=>{
 const session=startCoachMethodSession({personaId:'mira',methodId:'oskar'},ctx)
 const token=sealCoachSession(session,config,actor)
 const prepared=prepareCoachMethodTurn(body,{...ctx,token})
 assert.equal(prepared.body.methodId,undefined)
 assert.equal(prepared.progress.session.methodId,'oskar')
 assert.throws(()=>prepareCoachMethodTurn(body,ctx),/COACH_SESSION_REQUIRED/)
 assert.throws(()=>prepareCoachMethodTurn(body,{...ctx,token,actor:{...actor,claims:{session_id:'different'}}}),/COACH_SESSION_REQUIRED/)
 assert.throws(()=>prepareCoachMethodTurn({...body,methodId:'grow'},{...ctx,token}),/COACH_SESSION_METHOD_CONFLICT/)
 assert.throws(()=>startCoachMethodSession({personaId:'mira',methodId:'grow'},{...ctx,token}),/COACH_SESSION_METHOD_CONFLICT/)
 assert.throws(()=>startCoachMethodSession({personaId:'mira',methodId:'tgrow'},ctx),/COACH_SESSION_INPUT_INVALID/)
})
test('legacy callers unchanged; explicit authority validates consent and rejects client-controlled fields',()=>{
 const {methodId,...legacy}=body
 assert.deepEqual(prepareCoachMethodTurn(legacy,ctx),{body:legacy,progress:null})
 assert.equal(coachMethodAuthorityInput(legacy,null),legacy)
 const token=sealCoachSession(startCoachMethodSession({personaId:'mira',methodId},ctx),config,actor)
 assert.throws(()=>prepareCoachMethodTurn({...body,consent:false},{...ctx,token}))
 assert.throws(()=>prepareCoachMethodTurn({...body,authoritativeEvidence:{goalConfirmed:true}},{...ctx,token}))
 const progress=prepareCoachMethodTurn(body,{...ctx,token}).progress
 assert.equal(coachMethodAuthorityInput({elapsedSeconds:17},progress).elapsedSeconds,17)
 assert.equal(coachMethodAuthorityInput({},progress).authoritativeMethodId,methodId)
})
test('both transports use server-only authority and private scoped cookies',()=>{
 const route=readFileSync('app/api/app/[...path]/route.js','utf8')
 const brain=readFileSync('lib/app/coaching-brain.js','utf8')
 assert.ok(route.includes("joined==='my-coach/session'"))
 assert.ok(route.includes("httpOnly:true,secure:!config.test,sameSite:'lax',path:'/api/app/my-coach'"))
 assert.equal(route.match(/methodAuthority:prepared.progress/g)?.length,2)
 assert.ok(brain.includes('coachMethodAuthorityInput(normalized.input,methodAuthority)'))
 assert.ok(brain.includes('coachMethodAuthorityInput(parsed.input,methodAuthority)'))
})

import {geminiFreeLiveCheckpoint} from '../lib/coaching/gemini-live-free.mjs'
test('explicit Live method uses the same verified cookie and cannot be omitted or changed',()=>{
 const session=startCoachMethodSession({personaId:'mira',methodId:'oskar'},ctx)
 const token=sealCoachSession(session,config,actor)
 const request={...body,voiceConsent:true,trainingUseConsent:true}
 const selected=prepareCoachMethodRequest(request,{...ctx,token})
 assert.equal(selected.session.methodId,'oskar')
 assert.throws(()=>prepareCoachMethodRequest(selected.body,{...ctx,token}),/COACH_SESSION_METHOD_CONFLICT/)
 assert.throws(()=>prepareCoachMethodRequest(request,ctx),/COACH_SESSION_REQUIRED/)
 assert.throws(()=>prepareCoachMethodRequest({...request,methodId:'grow'},{...ctx,token}),/COACH_SESSION_METHOD_CONFLICT/)
 const result=geminiFreeLiveCheckpoint(selected.body,{methodSession:selected.session})
 assert.equal(result.methodId,'oskar')
 assert.equal(result.__methodSession.methodId,'oskar')
 assert.throws(()=>geminiFreeLiveCheckpoint({...selected.body,voiceConsent:false},{methodSession:selected.session}))
 assert.throws(()=>geminiFreeLiveCheckpoint({...selected.body,authoritativeMethodId:'grow'},{methodSession:selected.session}))
 const route=readFileSync('app/api/app/[...path]/route.js','utf8')
 assert.ok(route.includes('const {__methodSession,...clientProgress}=progress'))
})

test('logical IDs reject old tabs after a deliberate new method start',()=>{
 const first='22222222-2222-4222-8222-222222222222',second='33333333-3333-4333-8333-333333333333'
 const start={personaId:'mira',methodId:'oskar',methodSessionId:first}
 const state=startCoachMethodSession(start,ctx)
 const token=sealCoachSession(state,config,actor)
 assert.equal(startCoachMethodSession(start,{...ctx,token}).nonce,state.nonce)
 assert.throws(()=>startCoachMethodSession({...start,methodId:'grow'},{...ctx,token}),/COACH_SESSION_METHOD_CONFLICT/)
 const next=startCoachMethodSession({...start,methodId:'grow',methodSessionId:second},{...ctx,token})
 const fresh=sealCoachSession(next,config,actor)
 assert.notEqual(next.nonce,state.nonce)
 assert.throws(()=>prepareCoachMethodRequest({...body,methodSessionId:first},{...ctx,token:fresh}),/COACH_SESSION_METHOD_CONFLICT/)
 assert.equal(prepareCoachMethodRequest({...body,methodId:'grow',methodSessionId:second},{...ctx,token:fresh}).session.clientSessionId,second)
 const {methodId,...legacy}=body
 assert.equal(prepareCoachMethodRequest(legacy,{...ctx,token:fresh}).session,null)
 assert.throws(()=>prepareCoachMethodRequest({...legacy,methodSessionId:second},{...ctx,token:fresh}),/COACH_SESSION_METHOD_CONFLICT/)
})
test('opt-in UI retains runtime across Live reconnect and verifies owner',()=>{
 const greeting=readFileSync('components/my-coach-greeting-gate.jsx','utf8')
 const dialogue=readFileSync('components/my-coach-live-dialogue.jsx','utf8')
 const live=readFileSync('components/my-coach-gemini-live.jsx','utf8')
 const route=readFileSync('app/api/app/[...path]/route.js','utf8')
 assert.ok(greeting.includes('data-coach-method-choice'))
 assert.ok(dialogue.includes('methodSelectionEnabled={protocolOwnerReady}'))
 assert.ok(dialogue.includes('methodSessionId:crypto.randomUUID()'))
 assert.ok(dialogue.includes('methodSession={methodSession} prepareMethodSession={ensureCoachMethodSession}'))
 assert.ok(live.includes('r.methodCheckpointQueue=(r.methodCheckpointQueue||Promise.resolve()).then(deliver)'))
 assert.ok(live.includes('connect(r,r.liveToken,{resume:true})'))
 assert.ok(live.includes('!await r.prepareMethodSession()'))
 assert.ok(route.includes("request.headers.get('x-hh-account-id')!==actor.id"))
})
