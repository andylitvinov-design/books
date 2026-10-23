import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { assertCompactLeadRequest } from '../scripts/helpers/compact-lead-verifier.mjs'

function fixture(overrides = {}, pointerError = null, diagnostics = false) {
  const state = { consent: false, saved: false, email: '', routes: [], removed: 0, checkAttempts: 0, disposed: 0, screenshots: [] }
  const label = {}
  const checkbox = {
    get checked() { return state.consent }, isConnected: true,
    tagName: 'INPUT', className: 'native-consent',
    value: 'PRIVATE_CONTACT_NOT_FOR_DIAGNOSTICS',
    getBoundingClientRect: () => ({ x: 20, y: 200, width: 16, height: 16, left: 20, top: 200 }),
    closest: () => label,
  }
  const document = { elementFromPoint: () => checkbox, querySelector: () => checkbox,
    documentElement: {}, body: {} }
  checkbox.ownerDocument = document
  const browser = { node: checkbox, document,
    location: { pathname: '/en/services/dao-health-profile', hash: '#PRIVATE_HASH_PAYLOAD', search: '?contact=PRIVATE_QUERY' },
    innerWidth: 390, innerHeight: 844, scrollX: 0, scrollY: 700,
    window: { visualViewport: null }, getComputedStyle: () => ({ scrollBehavior: 'auto' }),
    matchMedia: () => ({ matches: true }),
  }
  const page = {
    url: () => 'http://127.0.0.1:3100/en/services/dao-health-profile#request-free-wu-xing',
    screenshot: async options => { state.screenshots.push(options); await writeFile(options.path, 'synthetic-screenshot') },
    route: async (pattern, handler) => state.routes.push(handler),
    unroute: async (pattern, handler) => { assert.equal(handler, state.routes[0]); state.removed++ },
  }
  const node = selector => ({
    selector,
    locator: node,
    elementHandle: async () => ({ evaluate: async fn => fn(checkbox), dispose: async () => { state.disposed++ } }),
    ...(diagnostics ? { evaluate: async fn => runInNewContext('(' + fn.toString() + ')(node)', browser) } : {}),
    fill: async value => { state.email = value },
    check: async () => { state.checkAttempts++; if (pointerError) throw pointerError; state.consent = true },
    click: async () => {
      assert.ok(state.consent)
      const body = { operationId: '6b1c1234-1234-1234-1234-123456789abc',
        serviceTitle: 'Free symbolic Wu Xing Resource Profile',
        sourcePath: '/en/services/dao-health-profile', locale: 'en',
        contact: { displayName: '', email: state.email, phone: '' }, contactConsent: true, website: '',
        ...overrides,
      }
      await state.routes[0]({
        request: () => ({ method: () => 'POST', postData: () => JSON.stringify(body) }),
        fulfill: async response => { assert.equal(JSON.parse(response.body).saved, true); state.saved = true },
      })
    },
  })
  const expect = target => ({
    toBeVisible: async () => assert.ok(target),
    toHaveCount: async count => assert.equal(target.selector.startsWith('form') ? +!state.saved : 0, count),
    toBeDisabled: async () => assert.equal(state.consent, false),
    toBeEnabled: async () => assert.equal(state.consent, true),
    toContainText: async text => { assert.equal(state.saved, true); assert.equal(text, 'HH-CA5016DE79E4') },
  })
  return { page, capture: node('capture'), expect, state }
}

test('compact verifier covers consent, synthetic commit receipt and cleanup', async () => {
  const f = fixture()
  await assertCompactLeadRequest(f.page, f.capture, f.expect, { locale: 'en', serviceTitle: 'Free symbolic Wu Xing Resource Profile' })
  assert.equal(f.state.removed, 1)
})

for (const [name, wrong] of Object.entries({
  service: { serviceTitle: 'Wrong service' },
  locale: { locale: 'ru' },
  source: { sourcePath: '/en/services/other' },
  consent: { contactConsent: false },
  extraPrivateData: { privateNote: 'Should never be transmitted' },
  operation: { operationId: 'not-an-operation-id' },
})) {
  test('compact verifier rejects wrong ' + name + ' and removes interception', async () => {
    const f = fixture(wrong)
    await assert.rejects(assertCompactLeadRequest(f.page, f.capture, f.expect, { locale: 'en', serviceTitle: 'Free symbolic Wu Xing Resource Profile' }))
    assert.equal(f.state.removed, 1)
  })
}

test('a failed normal pointer toggle stays fatal and is never retried or forced', async () => {
  const original = new Error('Synthetic checkbox click did not change state')
  const f = fixture({}, original)
  await assert.rejects(assertCompactLeadRequest(f.page, f.capture, f.expect, {
    locale: 'en', serviceTitle: 'Free symbolic Wu Xing Resource Profile',
  }), error => error === original)
  assert.equal(f.state.checkAttempts, 1)
  assert.equal(f.state.consent, false)
  assert.equal(f.state.removed, 1)
})

test('pointer failure writes bounded JSON and screenshot while preserving original error and cleanup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'compact-pointer-fixture-'))
  const previous = process.cwd()
  const original = new Error('Synthetic unchanged checkbox')
  const f = fixture({}, original, true)
  try {
    process.chdir(directory)
    await assert.rejects(assertCompactLeadRequest(f.page, f.capture, f.expect, {
      locale: 'en', serviceTitle: 'Free symbolic Wu Xing Resource Profile',
    }), error => error === original)
    const stem = 'artifacts/app-r1/compact-lead-pointer/en--en-services-dao-health-profile'
    const raw = await readFile(stem + '.json', 'utf8')
    const geometry = JSON.parse(raw)
    assert.equal(geometry.checkedBefore, false)
    assert.equal(geometry.checked, false)
    assert.deepEqual(geometry.originalNodeAfter, { checked: false, connected: true, isCurrentCheckbox: true })
    assert.equal(geometry.hit.isInput, true)
    assert.deepEqual(geometry.bounds, { x: 20, y: 200, width: 16, height: 16 })
    assert.equal(geometry.viewport.width, 390)
    assert.equal(Object.hasOwn(geometry, 'hash'), false)
    assert.doesNotMatch(raw, /qa-compact@example\.test|PRIVATE_|contact|email|value|search|hash/i)
    assert.deepEqual(f.state.screenshots, [{ path: stem + '.png', fullPage: false }])
    assert.equal(await readFile(stem + '.png', 'utf8'), 'synthetic-screenshot')
    assert.equal(f.state.checkAttempts, 1)
    assert.equal(f.state.consent, false)
    assert.equal(f.state.saved, false)
    assert.equal(f.state.removed, 1)
    assert.equal(f.state.disposed, 1)
  } finally {
    process.chdir(previous)
    await rm(directory, { recursive: true, force: true })
  }
})
