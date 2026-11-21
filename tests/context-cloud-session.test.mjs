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

    const env = { HH_COACH_CONTEXT_ENABLED: 'true' }
    const body = { contextTopic: 'career_business', contextSessionToken: token }
    assert.equal(typeof createCoachContextLoader(config, actor, body, env), 'function')
    assert.equal(createCoachContextLoader(config, other, body, env), undefined)
    assert.equal(createCoachContextLoader(config, actor, { ...body, contextSessionToken: tampered }, env), undefined)
    await assert.rejects(manageCoachContextConsent(config, other, {
      operation: 'grant', contextSessionToken: token,
    }, env), { message: 'CONTEXT_SESSION_INVALID' })
  `], { encoding: 'utf8' })
})
