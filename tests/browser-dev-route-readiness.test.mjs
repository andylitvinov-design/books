import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const hydration = read('scripts/verify-document-hydration.mjs')
const start = hydration.indexOf(' const warmup=await browser.newContext()')
const end = hydration.indexOf(" for(const locale of ['en','ru'])", start)
assert.ok(start >= 0 && end > start)
const warmup = hydration.slice(start, end)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const runWarmup = new AsyncFunction('browser', 'origin', 'assert', warmup)
const origin = 'http://127.0.0.1:3100'
const paths = ['/api/app/bootstrap', '/api/app/guest/bootstrap', '/api/test-catalog/stats', '/en/app', '/ru/app', '/en/client', '/ru/client', '/es/client/tests', '/icon.svg']

function harness(esResponse = () => ({ status: () => 200 }), statsResponse = () => ({ status: () => 200 })) {
  const events = []
  const browser = { newContext: async () => ({
    request: { get: async url => {
      assert.equal(new URL(url).origin, origin)
      const path = new URL(url).pathname
      events.push(path)
      return path === '/api/test-catalog/stats' ? statsResponse() : path === '/es/client/tests' ? esResponse() : { status: () => path.startsWith('/api/') ? 401 : 200 }
    } },
    close: async () => { events.push('closed') },
  }) }
  return { events, browser }
}

test('dev readiness completes the exact Spanish public route before opening hydrated journey pages', async () => {
  let release, reached
  const ready = new Promise(resolve => { reached = resolve })
  const response = new Promise(resolve => { release = resolve })
  const h = harness(() => { reached(); return response })
  const running = runWarmup(h.browser, origin, assert)
  await ready
  assert.deepEqual(h.events, paths.slice(0, -1))
  assert.equal(h.events.includes('closed'), false, 'readiness cannot complete before the actual Spanish response')
  release({ status: () => 200 })
  await running
  assert.deepEqual(h.events, [...paths, 'closed'])
  assert.doesNotMatch(warmup, /catch\s*\(|waitForTimeout|setTimeout|page\.goto|waitForURL/)
  const workflow = read('.github/workflows/hh-app-browser.yml')
  assert.match(workflow, /core\) scripts="verify-document-hydration verify-app-r1 /)
  assert.ok(hydration.indexOf('await page.goto(origin+path)', end) > end)
})

test('a failed Spanish prewarm response remains a hard failure with no retry', async () => {
  const h = harness(() => ({ status: () => 500 }))
  await assert.rejects(runWarmup(h.browser, origin, assert), /isolated route must compile before browser acceptance: \/es\/client\/tests/)
  assert.deepEqual(h.events, [...paths.slice(0, -1), 'closed'])
})

test('an interrupted Spanish prewarm remains a hard failure with no navigation fallback', async () => {
  const failure = new Error('Synthetic navigation/readiness failure')
  const h = harness(() => { throw failure })
  await assert.rejects(runWarmup(h.browser, origin, assert), error => error === failure)
  assert.deepEqual(h.events, [...paths.slice(0, -1), 'closed'])
})

test('core still requires the exact Spanish route and its own rendered language contract', () => {
  const core = read('scripts/verify-app-r1.mjs')
  assert.ok(core.includes("await guestPickerPage.goto(origin+'/es/client/tests')"))
  assert.ok(core.includes("await expect(guestPickerPage).toHaveURL(origin+'/es/client/tests')"))
  assert.ok(core.includes("await expect(guestPickerPage.locator('main[lang=\"es\"]')).toBeVisible()"))
  assert.ok(core.includes("await assertPublicPickerEntrance(guestPickerPage,'es')"))
  assert.ok(core.includes("await exercisePublicCollections(guestPickerPage,expect,'es')"))
})

test('unavailable catalog statistics fail the isolated readiness gate before hydration', async () => {
  const h = harness(undefined, () => ({ status: () => 503 }))
  await assert.rejects(runWarmup(h.browser, origin, assert), /isolated route must compile before browser acceptance: \/api\/test-catalog\/stats/)
  assert.deepEqual(h.events, [...paths.slice(0, 3), 'closed'])
})
