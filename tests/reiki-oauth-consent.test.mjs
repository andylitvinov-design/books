import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID, randomBytes} from 'node:crypto'
import {reikiConsentProof, validReikiConsent, reikiConsentCookieOptions} from '../lib/academy/reiki-oauth-consent.js'

test('OAuth sharing consent is bound to the flow, verified account, and expiration', () => {
  const config = {encryptionKey: randomBytes(32)}
  const flow = randomUUID(), learner = randomUUID(), now = Date.now()
  const beforeLogin = reikiConsentProof(flow, null, config, now)
  const afterLogin = reikiConsentProof(flow, learner, config, now)
  assert.ok(validReikiConsent(beforeLogin, flow, null, config, now))
  assert.ok(validReikiConsent(afterLogin, flow, learner, config, now))
  for (const [proof, id, actor, time] of [
    [beforeLogin, flow, learner, now], [afterLogin, flow, null, now],
    [afterLogin, randomUUID(), learner, now], [afterLogin, flow, randomUUID(), now],
    [undefined, flow, learner, now], [afterLogin.slice(1), flow, learner, now],
    [afterLogin, flow, learner, now + 900000],
  ]) assert.equal(validReikiConsent(proof, id, actor, config, time), false)
  assert.deepEqual(reikiConsentCookieOptions(config), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/api/app', maxAge: 900,
  })
})
