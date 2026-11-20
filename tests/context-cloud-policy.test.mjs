import assert from 'node:assert/strict'
import test from 'node:test'
import { coachContextPolicy } from '../lib/coaching/context-cloud-policy.mjs'

const env = {
  HH_COACH_CONTEXT_GROQ_POLICY: 'test-v1',
  HH_COACH_CONTEXT_GROQ_NOTICE_EN: 'English fixture',
  HH_COACH_CONTEXT_GROQ_NOTICE_RU: 'Русский пример',
  HH_COACH_CONTEXT_GROQ_NOTICE_ES: 'Ejemplo español',
}

test('each recipient requires its own three localized notices', () => {
  assert.equal(coachContextPolicy('gemini_free', env), null)
  assert.equal(coachContextPolicy('groq', { ...env, HH_COACH_CONTEXT_GROQ_NOTICE_RU: ' ' }), null)
  assert.deepEqual(Object.keys(coachContextPolicy('groq', env).notices), ['en', 'ru', 'es'])
})

test('changing one translation changes the effective consent version', () => {
  const previous = coachContextPolicy('groq', env)
  const updated = coachContextPolicy('groq', { ...env, HH_COACH_CONTEXT_GROQ_NOTICE_ES: 'Texto nuevo' })
  assert.equal(updated.label, previous.label)
  assert.notEqual(updated.version, previous.version)
})
