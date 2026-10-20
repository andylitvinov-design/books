import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizePracticeRequests } from '../lib/practitioners/practice-requests.mjs'

test('new practice inbox returns empty state for a master with no enquiries', () => {
  assert.deepEqual(summarizePracticeRequests(null), {
    total: 0, newCount: 0, inProgressCount: 0, openCount: 0, preview: [],
  })
})

test('inbox prioritizes new enquiries then most recent contacted items', () => {
  const requests = [
    { id: 'closed', status: 'closed', createdAt: '2026-10-17T11:00:00Z' },
    { id: 'contacted-old', status: 'contacted', createdAt: '2026-10-15T11:00:00Z' },
    { id: 'new-old', status: 'requested', createdAt: '2026-10-16T11:00:00Z' },
    { id: 'contacted-new', status: 'contacted', createdAt: '2026-10-17T11:00:00Z' },
    { id: 'new-new', status: 'requested', createdAt: '2026-10-17T12:00:00Z' },
  ]
  const result = summarizePracticeRequests(requests)
  assert.equal(result.total, 5)
  assert.equal(result.newCount, 2)
  assert.equal(result.inProgressCount, 2)
  assert.equal(result.openCount, 4)
  assert.deepEqual(result.preview.map(item => item.id), ['new-new', 'new-old', 'contacted-new'])
})

test('closed requests remain in history, not attention queue', () => {
  const result = summarizePracticeRequests([{ id: '1', status: 'closed' }])
  assert.equal(result.total, 1)
  assert.equal(result.openCount, 0)
  assert.deepEqual(result.preview, [])
})

test('practice home wires authenticated requests to its first-screen module', () => {
  const source = readFileSync(new URL('../components/app/practice-workspace.jsx', import.meta.url), 'utf8')
  const moduleSource = readFileSync(new URL('../components/app/practice-requests-overview.jsx', import.meta.url), 'utf8')
  const marketplace = source.indexOf('className="hh-practice-marketplace"')
  const header = source.indexOf('    {!needsOnboarding&&<PracticeRequestsOverview requests={requests}')
  const tools = source.indexOf('className="hh-practice-tools"')
  assert.ok(marketplace > 0 && header > marketplace && tools > header, 'new services lead, requests remain before practitioner tools')
  assert.match(source, /<PracticeRequestsOverview requests=\{requests\} services=\{services\}/)
  assert.match(source, /onAddService=\{needsOnboarding/)
  assert.match(moduleSource, /summary\.total === 0/)
  assert.match(moduleSource, /onClick=\{onAddService\}/)
  assert.match(moduleSource, /onClick=\{onViewAll\}/)
})
