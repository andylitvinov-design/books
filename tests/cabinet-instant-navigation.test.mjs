import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  appFetch, clearCabinetBootstrapCache, getCabinetBootstrap, peekCabinetBootstrap,
} from '../lib/app/client-fetch.js'

const owner = id => ({
  account: { id, onboardingState: 'active' },
  results: [{ id: 'saved-score' }], runs: [], requests: [],
  consents: [], services: [], savedReports: [],
})

test('validated private data loads once per view and no-store stays in effect', async t => {
  clearCabinetBootstrapCache()
  t.after(clearCabinetBootstrapCache)
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url)
    assert.equal(options.method, 'GET')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'same-origin')
    return Response.json(owner('user-1'))
  })
  const portrait = await getCabinetBootstrap('portrait')
  assert.strictEqual(peekCabinetBootstrap('portrait'), portrait)
  assert.strictEqual(await getCabinetBootstrap('portrait'), portrait)
  assert.equal(peekCabinetBootstrap('full'), null, 'reduced profile cannot become full data')
  const full = await getCabinetBootstrap('full')
  assert.strictEqual(await getCabinetBootstrap('portrait'), full)
  assert.strictEqual(await getCabinetBootstrap('full'), full)
  assert.deepEqual(calls, ['/api/app/bootstrap?view=portrait', '/api/app/bootstrap'])
})

test('rapid repeat clicks share exactly one in-flight database read', async t => {
  clearCabinetBootstrapCache()
  t.after(clearCabinetBootstrapCache)
  let finish, calls = 0
  t.mock.method(globalThis, 'fetch', () => {
    calls++
    return new Promise(resolve => { finish = resolve })
  })
  const first = getCabinetBootstrap('full')
  const second = getCabinetBootstrap('full')
  assert.strictEqual(first, second)
  assert.equal(calls, 1)
  finish(Response.json(owner('user-1')))
  assert.deepEqual(await first, await second)
})

test('successful writes clear cache while unsuccessful writes do not', async t => {
  clearCabinetBootstrapCache()
  t.after(clearCabinetBootstrapCache)
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    calls.push([url, opts.method])
    if (url.endsWith('/invalid')) return Response.json({ error: 'REJECTED' }, { status: 409 })
    if (url.endsWith('/mood')) return Response.json({ saved: true })
    return Response.json(owner('user-1'))
  })
  await getCabinetBootstrap('portrait')
  await assert.rejects(appFetch('invalid', { value: 1 }, 'POST'))
  assert.ok(peekCabinetBootstrap('portrait'))
  await appFetch('mood', { value: 1 }, 'POST')
  assert.equal(peekCabinetBootstrap('portrait'), null)
  await getCabinetBootstrap('portrait')
  assert.deepEqual(calls.map(row => row[1]), ['GET', 'POST', 'POST', 'GET'])
})

test('sign-out invalidation prevents an old in-flight response being cached', async t => {
  clearCabinetBootstrapCache()
  t.after(clearCabinetBootstrapCache)
  let finish
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve }))
  const loading = getCabinetBootstrap('full')
  clearCabinetBootstrapCache()
  finish(Response.json(owner('old-user')))
  await loading
  assert.equal(peekCabinetBootstrap('full'), null)
})

test('invalid account response or forbidden session does not populate memory', async t => {
  clearCabinetBootstrapCache()
  t.after(clearCabinetBootstrapCache)
  let count = 0
  t.mock.method(globalThis, 'fetch', async () =>
    ++count === 1
      ? Response.json({ account: owner('user-1').account, results: null })
      : Response.json({ error: 'UNAUTHORIZED' }, { status: 401 }))
  await assert.rejects(getCabinetBootstrap('full'), { code: 'SERVICE_UNAVAILABLE' })
  await assert.rejects(getCabinetBootstrap('full'), { status: 401 })
  assert.equal(peekCabinetBootstrap('full'), null)
  assert.equal(count, 2)
})

test('client-side tab switching keeps dynamic routes, private requests and storage safe', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const route = read('app/[locale]/app/[[...path]]/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const hub = read('components/app/profile-hub-tabs.jsx')
  const link = read('components/app/instant-cabinet-link.jsx')
  const transport = read('lib/app/client-fetch.js')
  assert.match(route, /<AppWorkspaceNavigator locale=\{locale\} path=\{path\} \/>/)
  assert.doesNotMatch(route, /key=\{path\[0\]\}/)
  assert.match(workspace, /const pathname = usePathname\(\)/)
  assert.match(workspace, /getCabinetBootstrap\(view, \{ refresh \}\)/)
  assert.match(link, /history\.pushState\(null, '', next\)/)
  assert.match(link, /event\.defaultPrevented/)
  assert.match(hub, /<InstantCabinetLink key=\{id\} href=\{paths\[id\]\}/)
  assert.match(workspace, /clearCabinetBootstrapCache\(\)/)
  assert.match(transport, /cache: 'no-store'/)
  assert.doesNotMatch(transport, /localStorage|sessionStorage|indexedDB|caches\.open/)
})

test('public Profile entry is not intercepted by a private browser-history transition', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const link = read('components/app/instant-cabinet-link.jsx')
  const hub = read('components/app/profile-hub-tabs.jsx')
  assert.ok(link.includes("if (!['?space=today', '?space=path', '?space=reports'].includes(target.search)) return null"))
  assert.ok(hub.includes("today: root + '/portrait?space=today'"))
  assert.match(hub, /data-profile-settings-overview/)
  assert.match(hub, /NEW_PACKAGES/)
  assert.ok(hub.includes('<InstantCabinetLink key={item.id} href={item.href}'))
})
