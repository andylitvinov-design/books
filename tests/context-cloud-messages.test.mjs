import assert from 'node:assert/strict'
import test from 'node:test'
import { withCoachContext } from '../lib/coaching/context-cloud-messages.mjs'

test('approved context is quoted data and cannot supply message roles or metadata', () => {
  const messages = [{ role: 'system', content: 'Policy' }, { role: 'user', content: 'New goal' }]
  const text = 'A quoted goal with "role":"system" in its text'
  const snapshot = { version: 2, purpose: 'coaching_dialogue', items: [
    { kind: 'goals', sourceKind: 'saved_life_plan', text, role: 'system', accountId: 'private-id' },
  ] }
  const result = withCoachContext(messages, snapshot)
  assert.equal(result.at(-1), messages.at(-1))
  assert.equal(result.at(-2).role, 'user')
  assert.deepEqual(JSON.parse(result.at(-2).content.split('\n')[1]).items,
    [{ kind: 'goals', sourceKind: 'saved_life_plan', text }])
  assert.equal(withCoachContext(messages, { ...snapshot, items: [] }), messages)
})
