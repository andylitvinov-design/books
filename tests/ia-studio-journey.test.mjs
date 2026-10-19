import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
const start = source.indexOf('  // Client reports redirect to the studio;')
const end = source.indexOf("  await go(pa, '/en/client');", start)
assert.ok(start >= 0 && end > start)
const journey = source.slice(start, end)
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'admin', 'page', 'go', 'expect', 'origin', 'a', 'evidence', 'pass', journey)

async function scenario(fault) {
  const origin = 'https://127.0.0.1:3444'
  const a = { id: '11111111-1111-4111-8111-111111111111', fullName: 'Synthetic Studio Client' }
  const visits = [], clicks = [], passes = []
  let phase = '', selected = false, query = ''
  function locator(owner, selector) {
    return {
      owner, selector,
      filter(options) { assert.deepEqual(options, { hasText: a.fullName }); return this },
      locator(child) { assert.equal(selector, '.consultation-client-results button'); assert.equal(child, 'strong'); return locator(owner, selector + ' strong') },
      async fill(value) { assert.equal(selector, '.consultation-client-search input'); assert.equal(value, a.fullName); query = value },
      async click() {
        assert.equal(selector, '.consultation-client-results button', 'No form/action submission is allowed')
        assert.equal(query, a.fullName); clicks.push(selector); selected = fault !== 'selection-no-op'
      },
    }
  }
  const admin = { url: '', locator: selector => locator('owner', selector), async screenshot() {} }
  const page = { url: '', locator: selector => locator('public', selector), getByText(text, options) {
    assert.equal(text, a.fullName); assert.deepEqual(options, { exact: true }); return locator('public', 'client-name')
  } }
  async function go(target, path) {
    visits.push([target === admin ? 'owner' : 'public', path])
    if (target === page) { target.url = origin + (fault === 'auth-bypass' ? '/admin/consultations/new' : '/admin/login'); return }
    query = ''; selected = false
    if (path.includes('kind=research_result')) {
      phase = 'legacy'; selected = true
      target.url = origin + (fault === 'legacy-redirect' ? path : `/admin/consultations/new?clientId=${a.id}`)
    } else if (path.includes('not-a-valid-uuid')) {
      phase = 'invalid'; target.url = origin + (fault === 'invalid-forwarded' ? '/admin/consultations/new?clientId=not-a-valid-uuid' : '/admin/consultations/new')
      selected = fault === 'invalid-selected'
    } else if (path.includes('clientId=')) {
      phase = 'valid'; selected = fault !== 'valid-unselected'; target.url = origin + `/admin/consultations/new?clientId=${a.id}`
    } else {
      phase = 'picker'; target.url = origin + (fault === 'old-picker' ? '/admin/reports/new' : '/admin/consultations/new')
    }
  }
  function expect(target) {
    return {
      async toHaveURL(value) { assert.equal(target.url, value) },
      async toHaveCount(value) {
        const s = target.selector
        let actual
        if (s === '.consultation-client-selected-row') actual = selected ? 1 : 0
        else if (s === '.consultation-client-results button') actual = fault === 'duplicate-choice' ? 2 : fault === 'missing-choice' ? 0 : 1
        else if (s === 'select[name="kind"]') actual = fault === 'retired-kind' ? 1 : 0
        else if (s === '.consultation-client-selector') actual = fault === 'auth-selector-leak' ? 1 : 0
        else if (s === 'client-name') actual = fault === 'auth-name-leak' ? 1 : 0
        else assert.fail('Unexpected count selector: ' + s)
        assert.equal(actual, value)
      },
      async toHaveValue(value) {
        const s = target.selector
        let actual
        if (s.endsWith('[name="clientId"]')) actual = selected ? (fault === 'wrong-id' || fault === 'legacy-identity' && phase === 'legacy' ? 'other-client' : a.id) : ''
        else if (s.endsWith('[name="clientMode"]')) actual = fault === 'creating-client' ? 'new' : 'existing'
        else if (s.endsWith('[name="patientName"]')) actual = fault === 'wrong-hidden-name' ? 'Other client' : a.fullName
        else assert.fail('Unexpected value selector: ' + s)
        assert.equal(actual, value)
      },
      async toHaveText(value) { assert.ok(target.selector.endsWith('strong')); assert.equal(fault === 'wrong-name' ? 'Other client' : a.fullName, value) },
      async toHaveAttribute(name, value) { assert.equal(target.selector, '.consultation-client-results button'); assert.equal(name, 'type'); assert.equal(fault === 'submit-choice' ? 'submit' : 'button', value) },
      async toBeVisible() {
        assert.ok(['textarea[name="analysis"]', 'textarea[name="additionalNotes"]'].includes(target.selector))
        assert.ok(!(fault === 'missing-analysis' && target.selector.includes('analysis')))
        assert.ok(!(fault === 'missing-notes' && target.selector.includes('additionalNotes')))
      },
      async toBeChecked() { assert.equal(target.selector, 'input[name="includeRecommendation"]'); assert.notEqual(fault, 'recommendation-off') },
      not: { async toBeChecked() { assert.equal(target.selector, 'input[name="includeInvoice"]'); assert.notEqual(fault, 'invoice-on') } },
    }
  }
  await run(admin, page, go, expect, origin, a, '/tmp/synthetic-only', message => passes.push(message))
  assert.deepEqual(visits, [
    ['owner', '/admin/reports/new'], ['owner', `/admin/reports/new?clientId=${a.id}`],
    ['owner', '/admin/reports/new?clientId=not-a-valid-uuid'], ['owner', `/admin/clients/${a.id}/assessments/new?kind=research_result`],
    ['public', `/admin/reports/new?clientId=${a.id}`], ['public', `/admin/consultations/new?clientId=${a.id}`],
    ['public', `/admin/clients/${a.id}/assessments/new?kind=research_result`],
  ])
  assert.equal(clicks.length, 1); assert.equal(passes.length, 1)
}

test('actual IA journey selects a synthetic studio client, validates bookmarks and denies unauthenticated access without submission', () => scenario())
for (const fault of ['old-picker', 'missing-choice', 'duplicate-choice', 'selection-no-op', 'wrong-id', 'wrong-name', 'wrong-hidden-name',
  'creating-client', 'submit-choice', 'missing-analysis', 'missing-notes', 'recommendation-off', 'invoice-on', 'retired-kind',
  'valid-unselected', 'invalid-forwarded', 'invalid-selected', 'legacy-redirect', 'legacy-identity', 'auth-bypass', 'auth-selector-leak', 'auth-name-leak']) {
  test(`studio journey rejects ${fault}`, () => assert.rejects(scenario(fault)))
}
