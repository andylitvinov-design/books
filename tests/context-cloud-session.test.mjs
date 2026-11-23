import { execFileSync } from 'node:child_process'
import test from 'node:test'

test('session token binds consent and saved-context lookup to the same authenticated account', () => {
  const session = new URL('../lib/app/coach-context-session.js', import.meta.url)
  const snapshot = new URL('../lib/app/coach-context-snapshot.js', import.meta.url)
  execFileSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    import { issueCoachContextSession, verifyCoachContextSession } from ${JSON.stringify(session.href)}
    import { createCoachContextLoader, manageCoachContextConsent } from ${JSON.stringify(snapshot.href)}
    const config = { encryptionKey: Buffer.alloc(32, 42) }
    const actor = { id: 'owner' }
    const other = { id: 'different-account' }
    const now = Date.now()
    const { token, sessionId, expiresAt } = issueCoachContextSession(config, actor, now)
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    assert.deepEqual(verifyCoachContextSession(config, actor, token, now), { sessionId, expiresAt })
    assert.notEqual(issueCoachContextSession(config, actor, now).sessionId, sessionId)
    assert.equal(verifyCoachContextSession(config, actor, token, expiresAt), null)
    assert.equal(verifyCoachContextSession(config, actor, tampered, now), null)

    const env = { HH_COACH_CONTEXT_ENABLED: 'true', HH_COACH_CONTEXT_GROQ_POLICY:'fixture',
      HH_COACH_CONTEXT_GROQ_NOTICE_EN:'test', HH_COACH_CONTEXT_GROQ_NOTICE_RU:'test',
      HH_COACH_CONTEXT_GROQ_NOTICE_ES:'test' }
    const body = { contextTopic: 'career_business', contextSessionToken: token }
    assert.equal(typeof createCoachContextLoader(config, actor, body, env), 'function')
    assert.equal(createCoachContextLoader(config, other, body, env), undefined)
    assert.equal(createCoachContextLoader(config, actor, { ...body, contextSessionToken: tampered }, env), undefined)
    const nearExpiry=issueCoachContextSession(config,actor,now-4*60*60*1000+1000).token
    const pending=createCoachContextLoader(config,actor,{...body,contextSessionToken:nearExpiry},env)
    const realNow=Date.now
    Date.now=()=>now+2000
    assert.equal(await pending('groq',{sessionId:'ignored'}),undefined)
    Date.now=realNow
    await assert.rejects(manageCoachContextConsent(config, other, {
      operation: 'grant', contextSessionToken: token,
    }, env), { message: 'CONTEXT_SESSION_INVALID' })
  `], { encoding: 'utf8' })
})

test('staged preview rejects a session token belonging to another account before any context lookup', () => {
  const session = new URL('../lib/app/coach-context-session.js', import.meta.url)
  const staged = new URL('../lib/app/my-coach-staged-memory.js', import.meta.url)
  const ticket = new URL('../lib/coaching/coach-staged-memory-ticket.mjs', import.meta.url)
  execFileSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    import {issueCoachContextSession} from ${JSON.stringify(session.href)}
    import {readMyCoachStagedMemory} from ${JSON.stringify(staged.href)}
    import {issueCoachMemoryTicket} from ${JSON.stringify(ticket.href)}
    const config={encryptionKey:Buffer.alloc(32,42)}
    const actor={id:'account-one'}, other={id:'account-two'}
    const contextSessionToken=issueCoachContextSession(config,other).token
    const stageToken=issueCoachMemoryTicket({accountId:actor.id,provider:'groq',secret:config.encryptionKey})
    await assert.rejects(readMyCoachStagedMemory(config,actor,{stage:'personal',provider:'groq',
      stageToken,contextSessionToken,topicKey:'career_business',
      consent:{sessionAccepted:true,providerSharing:true,goals:true}},
      {HH_COACH_CONTEXT_ENABLED:'true'}),{message:'CONTEXT_SESSION_INVALID'})
    const expired=issueCoachContextSession(config,actor,Date.now()-5*60*60*1000).token
    await assert.rejects(readMyCoachStagedMemory(config,actor,{stage:'personal',provider:'groq',
      stageToken,contextSessionToken:expired,topicKey:'career_business',
      consent:{sessionAccepted:true,providerSharing:true,goals:true}},
      {HH_COACH_CONTEXT_ENABLED:'true'}),{message:'CONTEXT_SESSION_INVALID'})
  `], {encoding:'utf8'})
})
