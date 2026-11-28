import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { packCoachDialogueContext, projectCoachPriorSessions, projectCoachSelectedContext,
  COACH_STAGED_MEMORY_VERSION } from '../lib/coaching/coach-staged-memory.mjs'
import { issueCoachMemoryTicket, verifyCoachMemoryTicket } from '../lib/coaching/coach-staged-memory-ticket.mjs'
import { normalizeGenerativeCoachInput } from '../lib/coaching/generative-persona.mjs'

const now = '2026-11-22T10:00:00.000Z'
const protocol = {
  provenance: 'client_reviewed_dialogue', completedAt: now,
  opening: { name: 'Anna' }, goal: 'Improve confidence',
  clientSummary: 'I noticed I need clearer boundaries',
  clientNextStep: 'Ask for a discussion at work',
  turns: [{ role: 'user', content: 'SECRET FULL TRANSCRIPT' }],
}
test('identity stage projects only reviewed past-session recaps; never raw transcripts', () => {
  assert.match(COACH_STAGED_MEMORY_VERSION, /staged-memory/)
  const result = projectCoachPriorSessions([protocol, { ...protocol, provenance: 'ai_generated_only' }], 'Wrong Name')
  assert.equal(result.hasPreviousSession, true)
  assert.equal(result.preferredName, 'Anna')
  assert.equal(result.previous.length, 1)
  assert.equal(result.previous[0].clientConclusions, protocol.clientSummary)
  assert.equal(JSON.stringify(result).includes('SECRET FULL TRANSCRIPT'), false)
  assert.deepEqual(projectCoachPriorSessions([]).previous, [])
  assert.equal(projectCoachPriorSessions([{ ...protocol, provenance: 'ai_generated_only' }]).hasPreviousSession, false)
})
test('personal stage passes only server-reviewed source kinds and category-scoped opt-ins', () => {
  const snapshot = { items: [
    { kind: 'goals', sourceKind: 'saved_life_plan', text: 'Make time for deep work' },
    { kind: 'test_results', sourceKind: 'selected_assessment', text: 'Validated dimension score' },
    { kind: 'goals', sourceKind: 'unreviewed_model_guess', text: 'UNAPPROVED' },
    { kind: 'preferences', sourceKind: 'private_profile', text: 'PRIVATE EMAIL' },
  ] }
  const goals = projectCoachSelectedContext(snapshot, { goals: true })
  assert.equal(goals.items.length, 1)
  assert.equal(goals.items[0].kind, 'goals')
  const scores = projectCoachSelectedContext(snapshot, { assessments: true })
  assert.equal(scores.items.length, 1)
  assert.equal(scores.items[0].kind, 'test_results')
  assert.deepEqual(projectCoachSelectedContext(snapshot).items, [])
  assert.equal(JSON.stringify(goals).includes('PRIVATE EMAIL'), false)
})
test('reviewed context respects the full 1200-byte envelope without splitting multilingual evidence', () => {
  const first = { kind: 'goals', sourceKind: 'saved_life_plan', text: 'я'.repeat(240) }
  const oversizedRemainder = { ...first, text: 'ё'.repeat(210) + '—'.repeat(30) }
  const later = { ...first, text: 'Revisaré la decisión mañana 🌱' }
  const packet = projectCoachSelectedContext({ items: [first, oversizedRemainder, later] }, { goals: true })
  assert.ok(Buffer.byteLength(JSON.stringify(packet), 'utf8') <= 1200)
  assert.deepEqual(packet.items, [first, later])
})

test('the dialogue packer accepts an exact JSON byte limit and caps the item count', () => {
  const row = { kind: 'goals', sourceKind: 'saved_life_plan', text: 'я'.repeat(240) }
  const items = [row, row, { ...row, text: '' }]
  const padding = 1200 - Buffer.byteLength(JSON.stringify({ version: 2, purpose: 'coaching_dialogue', items }))
  const last = { ...row, text: 'a'.repeat(padding) }
  const packet = packCoachDialogueContext([row, row, last])
  assert.equal(Buffer.byteLength(JSON.stringify(packet), 'utf8'), 1200)
  assert.deepEqual(packet.items, [row, row, last])
  assert.deepEqual(packCoachDialogueContext([row, row, { ...last, text: last.text + 'a' }]).items, [row, row])
  assert.equal(packCoachDialogueContext(Array(10).fill({ ...row, text: 'mañana' })).items.length, 6)
})

test('route requires authenticated owner and origin; personal uses live policy+DB grants', () => {
  const route = readFileSync(new URL('../app/api/app/my-coach/staged-memory/route.js', import.meta.url), 'utf8')
  const service = readFileSync(new URL('../lib/app/my-coach-staged-memory.js', import.meta.url), 'utf8')
  assert.match(route, /requireSameOrigin\(request, config\)/)
  assert.match(route, /auth\.verified\(\)/)
  assert.match(route, /ACCOUNT_CHANGED/)
  assert.match(service, /consent\.sessionAccepted !== true/)
  assert.match(service, /consent\.providerSharing !== true/)
  assert.match(service, /listMyCoachProtocols\(config, actor, \{includeFoundation:true\}\)/)
  assert.match(service, /buildCoachContextSnapshot\(config, actor/)
  assert.match(service, /coachContextPolicy\(provider, env\)/)
  assert.doesNotMatch(route, /fetch\(/)
})
test('stage 3 token is bound to the signed-in owner, selected provider, and expiry', () => {
  const secret = 'integration-fixture-secret'
  const token = issueCoachMemoryTicket({ accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000000 })
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000001 }), true)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-two', provider: 'gemini_free', secret, now: 1000000000001 }), false)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_paid', secret, now: 1000000000001 }), false)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000000 + 46 * 60000 }), false)
  assert.equal(verifyCoachMemoryTicket('invalid', { accountId: 'account-one', provider: 'gemini_free', secret }), false)
})

test('prior-session permission is cryptographically scoped to a separately opted-in identity lookup',()=>{
  const args={accountId:'account-one',provider:'gemini_free',secret:'test-key',now:1000000000000}
  const noPrior=issueCoachMemoryTicket(args)
  const prior=issueCoachMemoryTicket({...args,priorSessions:true})
  assert.equal(verifyCoachMemoryTicket(noPrior,{...args,now:1000000000001}),true)
  assert.equal(verifyCoachMemoryTicket(noPrior,{...args,requirePrior:true,now:1000000000001}),false)
  assert.equal(verifyCoachMemoryTicket(prior,{...args,requirePrior:true,now:1000000000001}),true)
  assert.equal(verifyCoachMemoryTicket(prior,{...args,provider:'gemini_paid',requirePrior:true,now:1000000000001}),false)
  const tampered=prior.replace('.p.','.n.')
  assert.equal(verifyCoachMemoryTicket(tampered,{...args,now:1000000000001}),false)
  const service=readFileSync(new URL('../lib/app/my-coach-staged-memory.js',import.meta.url),'utf8')
  assert.match(service,/if \(consent\.providerSharing !== true\) return empty\(stage\)/)
  assert.match(service,/priorSessions: consent\.priorSessions === true/)
})

test('real signed four-part staged memory token reaches text/stream request normalization',()=>{
  const accountId='account-one',secret='staged-token-fixture'
  const token=issueCoachMemoryTicket({accountId,provider:'groq',secret,now:1000000000000,priorSessions:true})
  assert.match(token,/^[0-9a-f-]{36}\.[0-9]{13}\.p\.[0-9a-f]{64}$/)
  const input={personaId:'mira',locale:'en',consent:true,
    message:'I would like to explore a work goal today.',turns:[],
    memoryStageToken:token,memorySharePrior:true}
  assert.doesNotThrow(()=>normalizeGenerativeCoachInput(input))
  // A missing scope (the old three-part form) must never be accepted.
  assert.throws(()=>normalizeGenerativeCoachInput({...input,
    memoryStageToken:token.replace('.p.','.')}),/COACHING_BRAIN_INPUT_INVALID/)
  assert.throws(()=>normalizeGenerativeCoachInput({...input,
    memoryStageToken:token.replace('.p.','.untrusted.')}),/COACHING_BRAIN_INPUT_INVALID/)
  assert.equal(verifyCoachMemoryTicket(token,{accountId,provider:'groq',secret,now:1000000000001,requirePrior:true}),true)
  assert.equal(verifyCoachMemoryTicket(token,{accountId,provider:'gemini_free',secret,now:1000000000001,requirePrior:true}),false)
})

test('session-scoped grants require a staged provider ticket in model input',()=>{
  const stage=issueCoachMemoryTicket({accountId:'owner',provider:'groq',secret:'fixture'})
  const session='00000000-0000-4000-8000-000000000001.9999999999999.'+'a'.repeat(64)
  const input={personaId:'mira',locale:'en',consent:true,message:'Hello',turns:[],
    memoryStageToken:stage,contextSessionToken:session,memoryShareGoals:true}
  assert.doesNotThrow(()=>normalizeGenerativeCoachInput(input))
  assert.throws(()=>normalizeGenerativeCoachInput({...input,memoryStageToken:undefined}),/COACHING_BRAIN_INPUT_INVALID/)
  assert.throws(()=>normalizeGenerativeCoachInput({...input,contextSessionToken:'invalid'}),/COACHING_BRAIN_INPUT_INVALID/)
})

test('reviewed fields require separate prior consent and a signed stage token',()=>{
 const stage=issueCoachMemoryTicket({accountId:'owner',provider:'groq',secret:'fixture',priorSessions:true})
 const base={personaId:'mira',locale:'en',consent:true,message:'Hello',turns:[],memoryStageToken:stage,allowOpeningPrior:true,memorySharePrior:true}
 assert.doesNotThrow(()=>normalizeGenerativeCoachInput({...base,memoryShareReviewedFields:true}))
 assert.throws(()=>normalizeGenerativeCoachInput({...base,memorySharePrior:false,memoryShareReviewedFields:true}),/COACHING_BRAIN_INPUT_INVALID/)
 assert.throws(()=>normalizeGenerativeCoachInput({...base,memoryStageToken:undefined,memoryShareReviewedFields:true}),/COACHING_BRAIN_INPUT_INVALID/)
 assert.throws(()=>normalizeGenerativeCoachInput({...base,allowOpeningPrior:false,memoryShareReviewedFields:true}),/COACHING_BRAIN_INPUT_INVALID/)
})

test('explicitly confirmed preferred name wins over older reviewed names, without sharing draft identity',()=>{
 const earlier={...protocol,opening:{name:'Anna'}}
 const correction={source:'confirmed_preference',preferredName:'Anya',preferenceVersion:'private-version'}
 const result=projectCoachPriorSessions([earlier],'Profile Name',null,correction)
 assert.equal(result.preferredName,'Anya')
 assert.equal(result.previous[0].clientConclusions,earlier.clientSummary)
 assert.doesNotMatch(JSON.stringify(result),/private-version|SECRET FULL TRANSCRIPT/)
 assert.equal(projectCoachPriorSessions([earlier],'Profile Name',null,{source:'protocol',preferredName:'Draft Name'}).preferredName,'Anna')
 assert.equal(projectCoachPriorSessions([],'Profile Name',null,{source:'protocol',preferredName:'Draft Name'}).preferredName,'Profile Name')
 assert.equal(projectCoachPriorSessions([earlier],'Profile Name',null,{source:'confirmed_preference',preferredName:'Say again'}).preferredName,'Anna')
 assert.equal(projectCoachPriorSessions([],'Profile Name',null,correction).preferredName,'Anya')
 const source=readFileSync(new URL('../lib/app/my-coach-staged-memory.js',import.meta.url),'utf8')
 assert.match(source,/readMyCoachGreetingIdentity\(config, actor\)/)
 assert.match(source,/projectCoachPriorSessions\(archive\.protocols, account\.display_name, archive\.foundation, identity\)/)
 assert.ok(source.indexOf('if (consent.providerSharing !== true) return empty(stage)')<source.indexOf('readMyCoachGreetingIdentity(config, actor)'))
 assert.ok(source.indexOf('if (consent.priorSessions !== true) return { ...empty(stage), stageToken }')<source.indexOf('readMyCoachGreetingIdentity(config, actor)'))
})
