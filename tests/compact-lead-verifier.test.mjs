import test from 'node:test'
import assert from 'node:assert/strict'
import { assertCompactLeadRequest } from '../scripts/helpers/compact-lead-verifier.mjs'

function fixture(overrides = {}) {
  const state = { consent: false, saved: false, email: '', routes: [], removed: 0 }
  const page = {
    url: () => 'http://127.0.0.1:3100/en/services/dao-health-profile#request-free-wu-xing',
    route: async (pattern, handler) => state.routes.push(handler),
    unroute: async (pattern, handler) => { assert.equal(handler, state.routes[0]); state.removed++ },
  }
  const node = selector => ({
    selector,
    locator: node,
    fill: async value => { state.email = value },
    check: async () => { state.consent = true },
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
