import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { hooks, compile, renderWithEffects, assertDiscoveryIsolation, assertAfterIsolation, networkRequests } from './helpers/public-discovery-fixture.mjs'

afterEach(assertDiscoveryIsolation)

for (const dependency of ['@/lib/unreviewed-runtime', './unknown-component', './unknown.module.css']) {
  test(`discovery fixture rejects unknown dependency ${dependency}`, () => {
    assert.throws(() => compile(`export { default as unknown } from '${dependency}'`, hooks()), /Unexpected dependency/)
  })
}
test('discovery fixture rejects unreviewed icon exports', () => {
  assert.throws(() => compile("export { UnreviewedIcon } from 'lucide-react'", hooks()).UnreviewedIcon, /Unexpected icon/)
})
test('discovery fixture compiles actual research and optional-read modules, not inert placeholders', () => {
  const compiled = compile(`
    export { ResearchDirectory } from './research-directory'
    export { startTestCatalogStatsRequest } from '@/lib/assessments/test-catalog-stats-client'
  `, hooks())
  assert.equal(typeof compiled.ResearchDirectory, 'function')
  assert.equal(typeof compiled.startTestCatalogStatsRequest, 'function')
  assert.match(String(compiled.ResearchDirectory), /data-research-directory/)
  assert.match(String(compiled.startTestCatalogStatsRequest), /\/api\/test-catalog\/stats/)
})
test('discovery fixture preserves refs, memoization and IDs and runs dependency cleanup once', () => {
  const state = hooks(), events = []
  let input = 'first', memoCalls = 0, setValue
  const render = () => renderWithEffects([state], () => {
    const [value, set] = state.useState(0)
    setValue = set
    const ref = state.useRef({ marker: 'stable' })
    const id = state.useId()
    const memo = state.useMemo(() => { memoCalls++; return { input } }, [input])
    state.useEffect(() => { events.push(`mount:${input}`); const snapshot = input; return () => events.push(`cleanup:${snapshot}`) }, [input])
    return { value, ref, id, memo }
  })
  const first = render(); setValue(1); const second = render()
  assert.equal(second.value, 1)
  assert.equal(second.ref, first.ref); assert.equal(second.id, first.id); assert.equal(second.memo, first.memo)
  assert.equal(memoCalls, 1); assert.deepEqual(events, ['mount:first'])
  input = 'second'; const third = render()
  assert.equal(third.ref, first.ref); assert.notEqual(third.memo, first.memo)
  assert.equal(memoCalls, 2); assert.deepEqual(events, ['mount:first', 'cleanup:first', 'mount:second'])
  state.dispose()
  assert.deepEqual(events, ['mount:first', 'cleanup:first', 'mount:second', 'cleanup:second'])
})
test('discovery fixture runs the real optional-read lifecycle with only its exact anonymous GET', async () => {
  const { startTestCatalogStatsRequest } = compile("export { startTestCatalogStatsRequest } from '@/lib/assessments/test-catalog-stats-client'", hooks())
  let stats
  const request = startTestCatalogStatsRequest(value => { stats = value })
  await request.done
  assert.deepEqual(Array.from(stats), [])
  assert.equal(networkRequests.length, 1)
  assert.equal(networkRequests[0].url, '/api/test-catalog/stats')
  assert.equal(networkRequests[0].method, 'GET')
  request.cancel()
})
for (const expression of [
  "fetch('/api/app/runs', { method: 'POST' })",
  "fetch('/api/test-catalog/stats?q=synthetic-private-query', { credentials: 'same-origin' })",
  "fetch('/api/test-catalog/stats', { credentials: 'same-origin', body: 'synthetic-private-query' })",
  "fetch('/api/test-catalog/stats', { credentials: 'same-origin', headers: { 'x-query': 'synthetic' } })",
]) test(`discovery isolation rejects swallowed unexpected transport: ${expression}`, async () => {
  // A production catch must not conceal the forbidden attempt from teardown.
  const { start } = compile(`export async function start() { try { await ${expression} } catch {} }`, hooks())
  await start()
  await assert.rejects(assertDiscoveryIsolation(), /No transport may write or send a personal query/)
})
for (const body of [
  'onStart()',
  'Promise.resolve().then(onStart)',
  'setTimeout(onStart, 20)',
  'return () => onStart()',
]) test(`discovery isolation detects implicit Starts from effects: ${body}`, async () => {
  const state = hooks(); let starts = 0
  const { Probe } = compile(`import { useEffect } from 'react'; export function Probe({ onStart }) { useEffect(() => { ${body} }, []); return null }`, state)
  assertAfterIsolation(() => assert.equal(starts, 0, 'implicit Start is forbidden'))
  renderWithEffects([state], () => Probe({ onStart() { starts++ } }))
  await assert.rejects(assertDiscoveryIsolation(), /implicit Start is forbidden/)
})

// Reproduce async regressions in the real pinned TestExplorer, including its
// actual optional-request callback and catalog mapping. No app file is changed.
const explorerSource = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
const statsState = '  const [socialStats, setSocialStats] = useState({})'
const statsCallback = '      setSocialStats(Object.fromEntries(stats.map(item => [item.key, item])))'
function mutateExplorer({ effects, callback = statsCallback }) {
  assert.equal(explorerSource.split(statsState).length, 2, 'Mutation needs the exact current state declaration')
  assert.equal(explorerSource.split(statsCallback).length, 2, 'Mutation needs the exact real optional-stats callback')
  return explorerSource.replace(statsState, statsState + '\n' + effects).replace(statsCallback, callback)
}
const implicitStatsEffect = '  useEffect(() => { if (socialStats.__reviewReady) onStart([]) }, [socialStats])'
const readyStats = '{ __reviewReady: true, ...Object.fromEntries(stats.map(item => [item.key, item])) }'
for (const [label, callback] of [
  ['real request', `      setSocialStats(${readyStats})`],
  ['request then Promise', `      Promise.resolve().then(() => setSocialStats(${readyStats}))`],
  ['request then timer', `      setTimeout(() => setSocialStats(${readyStats}), 20)`],
]) test(`actual TestExplorer ${label} -> state -> effect cannot start implicitly`, async () => {
  const state = hooks(); let starts = 0
  const { TestExplorer } = compile(mutateExplorer({ effects: implicitStatsEffect, callback }), state)
  assertAfterIsolation(() => {
    assert.equal(networkRequests.length, 1, 'The real optional stats lifecycle actually ran')
    assert.equal(networkRequests[0].url, '/api/test-catalog/stats')
    assert.equal(starts, 0, 'async state/effect implicit Start is forbidden')
  })
  renderWithEffects([state], () => TestExplorer({ locale: 'en', audience: 'guest', simpleMode: true, onStart() { starts++ } }))
  assert.equal(starts, 0, 'Regression remains asynchronous, not an initial-render false positive')
  await assert.rejects(assertDiscoveryIsolation(), /async state\/effect implicit Start is forbidden/)
  assert.equal(starts, 1, 'Dirty roots must rerender without an explicit caller render')
})

test('actual TestExplorer async state/effect loop fails closed and releases its mounted root', async () => {
  const state = hooks(); let unmounted = 0
  const source = mutateExplorer({
    effects: `  useEffect(() => { if (socialStats.__reviewReady) Promise.resolve().then(() => setSocialStats({ ...socialStats })) }, [socialStats])
  useEffect(() => () => onResume(), [])`,
    callback: `      setSocialStats(${readyStats})`,
  })
  const { TestExplorer } = compile(source, state)
  renderWithEffects([state], () => TestExplorer({ locale: 'en', simpleMode: true, onResume() { unmounted++ } }))
  await assert.rejects(assertDiscoveryIsolation(), /Discovery scheduled work did not settle within 100 turns/)
  assert.equal(unmounted, 1, 'A failed mounted drain still unmounts every scope exactly once')
  assert.throws(() => state.reset(), /Cannot render unmounted discovery hooks/)
  await assertDiscoveryIsolation() // No recurring hooks/timers leak into the next test.
})

test('actual TestExplorer unmount ignores cleanup-triggered state without rerendering', async () => {
  const state = hooks(); let starts = 0, renders = 0, rendersAtUnmount
  const source = mutateExplorer({ effects: `  useEffect(() => { if (socialStats.__reviewUnmounted) onStart([]) }, [socialStats])
  useEffect(() => () => { onResume(); setTimeout(() => setSocialStats({ __reviewUnmounted: true }), 20) }, [])` })
  const { TestExplorer } = compile(source, state)
  assertAfterIsolation(() => {
    assert.equal(starts, 0, 'Unmounted state must not run another effect')
    assert.equal(renders, rendersAtUnmount, 'A cleanup timer cannot resurrect the unmounted root')
  })
  renderWithEffects([state], () => {
    renders++
    return TestExplorer({ locale: 'en', simpleMode: true, onStart() { starts++ }, onResume() { rendersAtUnmount = renders } })
  })
  await assertDiscoveryIsolation()
  assert.ok(rendersAtUnmount >= 2, 'The actual anonymous callback rerendered while mounted first')
})

test('actual TestExplorer cleanup failures preserve the error but run all cleanup and final checks', async () => {
  const state = hooks(), cleaned = []; let finalCheck = false
  const source = mutateExplorer({ effects: `  useEffect(() => () => { onResume('first'); throw new Error('synthetic first cleanup failure') }, [])
  useEffect(() => () => { setTimeout(() => onResume('timer'), 20); onResume('second') }, [])` })
  const { TestExplorer } = compile(source, state)
  assertAfterIsolation(() => { finalCheck = true; assert.deepEqual(cleaned, ['first', 'second', 'timer']) })
  renderWithEffects([state], () => TestExplorer({ locale: 'en', simpleMode: true, onResume(value) { cleaned.push(value) } }))
  await assert.rejects(assertDiscoveryIsolation(), /synthetic first cleanup failure/)
  assert.equal(finalCheck, true)
  assert.deepEqual(cleaned, ['first', 'second', 'timer'])
  await assertDiscoveryIsolation()
})

test('a persistent hook group replaces its render callback instead of retaining stale roots', async () => {
  const state = hooks(); let firstRenders = 0, latestRenders = 0
  const { TestExplorer } = compile(explorerSource, state)
  renderWithEffects([state], () => { firstRenders++; return TestExplorer({ locale: 'en', simpleMode: true }) })
  const firstCount = firstRenders
  renderWithEffects([state], () => { latestRenders++; return TestExplorer({ locale: 'en', simpleMode: true }) })
  await assertDiscoveryIsolation()
  assert.equal(firstRenders, firstCount, 'Async updates cannot invoke the obsolete callback')
  assert.ok(latestRenders >= 2, 'The current callback receives the real optional-stats update')
})

test('a later child effect rerenders an earlier parent scope before synchronous settlement', () => {
  const parent = hooks(), child = hooks()
  const value = renderWithEffects([parent, child], () => {
    const [value, setValue] = parent.useState(0)
    child.useEffect(() => { setValue(1) }, [])
    return value
  })
  assert.equal(value, 1, 'All scopes must commit before the root is declared clean')
})
