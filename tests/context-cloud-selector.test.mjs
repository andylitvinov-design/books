import test from 'node:test'
import assert from 'node:assert/strict'
import { selectCoachContext } from '../lib/coaching/context-cloud-selector.mjs'

const request = {
  accountId: 'a', sessionId: 's', role: 'coach', provider: 'groq',
  policyVersion: 'p', topicKey: 'work', now: 100,
}
const item = {
  accountId: 'a', id: 'goal', category: 'goals', topicKey: 'work',
  status: 'confirmed', sensitivity: 'coach_shareable', sourceKind: 'saved_life_plan',
  sourceRevision: '2', currentSourceRevision: '2', reviewedAt: 50,
  expiresAt: null, text: 'Practice my presentation',
}
const grant = {
  ...request, category: 'goals', purpose: 'coaching', itemId: null,
  occurredAt: 60, expiresAt: null, revision: 1, decision: 'grant',
}

test('selector projects only current, approved and topic-relevant values', () => {
  const rows = [item, { ...item, accountId: 'b' }, { ...item, topicKey: 'home' },
    { ...item, currentSourceRevision: '3' }, { ...item, status: 'candidate' }]
  assert.deepEqual(selectCoachContext(request, rows, [grant]).items, [
    { kind: 'goals', sourceKind: 'saved_life_plan', text: item.text },
  ])
  for (const flag of ['topicChanged', 'corrected', 'optOut']) {
    assert.deepEqual(selectCoachContext({ ...request, [flag]: true }, rows, [grant]).items, [])
  }
})

test('selector ranking is deterministic and keeps the JSON packet bounded', () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({
    ...item, id: String(i), text: String(i) + 'Ж'.repeat(200),
  }))
  const selected = { ...request, selectedItemId: '8' }
  const packet = selectCoachContext(selected, rows, [grant])
  assert.equal(packet.items[0].text[0], '8')
  assert.ok(Buffer.byteLength(JSON.stringify(packet)) <= 1200)
  assert.deepEqual(packet, selectCoachContext(selected, rows.reverse(), [grant]))
})

test('a valid assessment grant is insufficient without the current conversation opt-in', () => {
  const assessment = { ...item, category: 'test_results', sourceKind: 'selected_assessment',
    scaleKey: 'trait.ipip50.extraversion' }
  const approval = { ...grant, category: assessment.category, itemId: assessment.id,
    scaleKey: assessment.scaleKey, sourceRevision: assessment.sourceRevision }
  assert.deepEqual(selectCoachContext(request, [assessment], [approval]).items, [])
  assert.equal(selectCoachContext({ ...request, includeAssessments: true }, [assessment], [approval]).items.length, 1)
})
