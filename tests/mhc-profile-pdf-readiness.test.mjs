import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertCabinetPortrait, openCabinetMyTests } from '../scripts/helpers/cabinet-navigation-verifier.mjs'

const source = readFileSync(new URL('../scripts/verify-mhc-sf.mjs', import.meta.url), 'utf8')
const loop = source.indexOf(" for(const locale of ['en','ru']){")
const start = source.indexOf('\n', loop) + 1
const end = source.indexOf('  const download=', start)
assert.ok(loop > 0 && start > loop && end > start, 'execute the actual PDF-entry block')
const navigateStart = source.indexOf('async function navigate(page,url){')
const navigateEnd = source.indexOf('\nasync function api(', navigateStart)
assert.ok(navigateStart > 0 && navigateEnd > navigateStart)
const navigate = new Function('return (' + source.slice(navigateStart, navigateEnd) + ')')()
const enter = new Function('page', 'origin', 'locale', 'expect', 'navigate', 'assertCabinetPortrait', 'openCabinetMyTests',
  'return (async () => {' + source.slice(start, end) + '})()')

function fixture(locale = 'en', options = {}) {
  const origin = 'http://localhost:3100', events = []
  let phase = 'source', url = origin + '/ru/app/portfolio'
  const node = kind => ({ kind,
    first() { return this },
    locator(selector) {
      assert.equal(kind, 'profile'); assert.equal(selector, 'details.hh-domain-more')
      return node('chooser')
    },
    getByRole(role) { assert.equal(kind, 'chooser'); assert.equal(role, 'tab'); return node('tabs') },
    async click() {
      assert.equal(kind, 'tests-link'); events.push('click:Tests')
      phase = 'tests'; url = origin + '/' + locale + '/app/tests'
    },
  })
  const page = {
    async waitForLoadState(state) {
      assert.equal(state, 'networkidle'); events.push('idle:' + phase)
      if (phase === 'profile') throw new Error('synthetic optional dashboard traffic remains active')
      if (options.departureFailure) throw new Error('synthetic source reads did not finish')
    },
    async goto(target) {
      events.push('goto:' + target)
      if (options.navigationFailure) throw new Error('synthetic navigation failed')
      assert.equal(target, origin + '/' + locale + '/app')
      phase = 'profile'; url = target + '/portrait'
    },
    locator(selector) {
      if (selector === '[data-profile-domains][data-profile-interactive="true"]') return node('profile')
      if (selector === 'nav a[href="/' + locale + '/app/tests"]:visible') return node('tests-link')
      if (selector === '[data-my-tests-dashboard]') return node('dashboard')
      assert.fail('Unexpected readiness selector: ' + selector)
    },
  }
  const expect = target => ({
    async toHaveURL(expected) { events.push('url:' + phase); assert.equal(url, expected) },
    async toBeVisible() {
      events.push('visible:' + target.kind)
      if (target.kind === 'profile') assert.notEqual(options.interactive, false, 'Profile is not interactive')
      if (target.kind === 'dashboard') assert.notEqual(options.dashboard, false, 'My Tests is not ready')
    },
    async toHaveAttribute(name, expected) {
      events.push('attribute:' + target.kind + ':' + name)
      if (target.kind === 'chooser') { assert.equal(name, 'open'); assert.equal(expected, ''); assert.notEqual(options.open, false) }
      else { assert.equal(name, 'href'); assert.equal(expected, '/' + locale + '/app/tests') }
    },
    async toHaveCount(expected) { events.push('tabs:' + expected); assert.equal(target.kind, 'tabs'); assert.equal(options.tabs ?? 4, expected) },
    async toHaveText(expected) { assert.equal(target.kind, 'tests-link'); assert.equal(expected, locale === 'ru' ? 'Тесты' : 'Tests') },
  })
  return { page, expect, origin, locale, events }
}
const run = f => enter(f.page, f.origin, f.locale, f.expect, navigate, assertCabinetPortrait, openCabinetMyTests)

for (const locale of ['en', 'ru']) {
  test(locale + ' PDF entry requires actual Profile and My Tests readiness despite unrelated ongoing traffic', { timeout: 3000 }, async () => {
    const f = fixture(locale); await run(f)
    assert.deepEqual(f.events.slice(0, 2), ['idle:source', 'goto:http://localhost:3100/' + locale + '/app'])
    assert.ok(f.events.includes('visible:profile'))
    assert.ok(f.events.includes('tabs:4'))
    assert.ok(f.events.indexOf('tabs:4') < f.events.indexOf('click:Tests'))
    assert.equal(f.events.at(-1), 'visible:dashboard')
    assert.ok(!f.events.includes('idle:profile'), 'destination readiness is the real UI, not network silence')
  })
}

for (const options of [{ interactive: false }, { open: false }, { tabs: 3 }, { dashboard: false }]) {
  test('incomplete destination still fails: ' + JSON.stringify(options), { timeout: 3000 }, async () => {
    await assert.rejects(run(fixture('en', options)))
  })
}

for (const failure of ['departureFailure', 'navigationFailure']) {
  test(failure + ' is propagated without retry or suppression', { timeout: 3000 }, async () => {
    const f = fixture('en', { [failure]: true })
    await assert.rejects(run(f), /synthetic/)
    assert.ok(!f.events.includes('click:Tests'))
  })
}

test('all other navigations, saved report/PDF assertions and browser error gate remain in place', { timeout: 3000 }, () => {
  const generic = source.slice(navigateStart, navigateEnd)
  assert.equal((generic.match(/waitForLoadState\('networkidle'\)/g) || []).length, 2)
  const after = source.slice(end)
  assert.match(after, /bytes\.subarray\(0,8\)\.toString\(\),'%PDF-1\.4'/)
  assert.match(after, /bytes\.length>12000/)
  assert.match(after, /assert\.deepEqual\(errors,\[\]\)/)
  assert.doesNotMatch(source.slice(start, end), /waitForTimeout|setTimeout|\.catch\(/)
})
