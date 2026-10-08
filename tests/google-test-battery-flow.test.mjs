import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'
import { makeTestSelectionIntent, readTestSelectionIntent, validTestKeys, PENDING_TEST_SELECTION_KEY } from '../lib/app/test-selection-intent.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('selected runnable tests can survive only a short same-tab OAuth handoff', () => {
  const now = 1_789_000_000_000
  assert.deepEqual(validTestKeys(['hh-current-state', 'mini-ipip-20']), ['hh-current-state', 'mini-ipip-20'])
  assert.equal(validTestKeys(['hh-current-state', 'hh-current-state']), null)
  assert.equal(validTestKeys(['not-real']), null)
  const raw = makeTestSelectionIntent(['hh-current-state', 'mini-ipip-20'], now)
  assert.deepEqual(readTestSelectionIntent(raw, now + 15000)?.keys, ['hh-current-state', 'mini-ipip-20'])
  assert.equal(readTestSelectionIntent(raw, now + 21 * 60 * 1000), null)
  assert.equal(readTestSelectionIntent(raw, now - 61 * 1000), null)
  assert.equal(readTestSelectionIntent('malformed JSON', now), null)
  assert.match(PENDING_TEST_SELECTION_KEY, /test-selection/)
})

test('public Start button explicitly initiates Google and preserves the selected list', () => {
  const pub = read('components/app/public-test-explorer.jsx')
  const auth = read('app/api/app/[...path]/route.js')
  assert.match(pub, /makeTestSelectionIntent\(entries\.map/)
  assert.match(pub, /window\.sessionStorage\.setItem/)
  assert.match(pub, /auth\/start/)
  assert.match(pub, /continueTo: 'tests'/)
  assert.doesNotMatch(pub, /guest\/test-plans/)
  assert.match(auth, /continueTo === 'tests'/)
  assert.match(auth, /app\/tests\?selection=pending/)
  assert.match(auth, /ensureAccount\(actor\)/)
  assert.match(auth, /continueTo !== 'tests'/)
})

test('account Cabinet waits for onboarding, restores selection, keeps progress and offers retakes', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const dashboard = read('components/app/account-test-battery.jsx')
  const repo = read('lib/app/repository.js')
  assert.match(workspace, /data\.account\.onboardingState !== 'active'/)
  assert.match(workspace, /<AccountTestBattery/)
  assert.match(dashboard, /readTestSelectionIntent/)
  assert.match(dashboard, /replaceActive/)
  assert.match(dashboard, /row\.progress/)
  assert.match(dashboard, /row\.result\.measurementAt/)
  assert.match(dashboard, /row\.result \? c\.repeat/)
  assert.match(dashboard, /api\('runs'/)
  assert.match(dashboard, /<Image src=\{row\.photo\}/)
  assert.match(repo, /latestTestPlan/)
  assert.match(workspace, /Return to the complete battery after each result/)
  const paths = [...dashboard.matchAll(/'\/(?:images|academy)\/[^']+\.(?:jpg|png|webp)'/g)]
  assert.ok(paths.length >= 10)
  for (const [quoted] of paths) assert.ok(existsSync(new URL('../public' + quoted.slice(1, -1), import.meta.url)), quoted)
})

test('a personal battery counts completion in any order and ignores already recorded instruments', async () => {
  const { nextOutstandingDefinitionIndex } = await import('../lib/app/test-plans.js')
  const ids = ['first', 'second', 'third']
  assert.equal(nextOutstandingDefinitionIndex(ids, []), 0)
  assert.equal(nextOutstandingDefinitionIndex(ids, ['third']), 0)
  assert.equal(nextOutstandingDefinitionIndex(ids, ['first', 'third']), 1)
  assert.equal(nextOutstandingDefinitionIndex(ids, ['third', 'first', 'second', 'second']), 3)
  const server = read('lib/app/repository.js')
  assert.match(server, /completedDefinitionIds\.has/)
  assert.match(server, /nextOutstandingDefinitionIndex/)
  const dashboard = read('components/app/account-test-battery.jsx')
  assert.match(dashboard, /currentPlan\.definitionIds\.includes\(row\.definition\.id\)/)
})
