import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertCabinetPortrait, openCabinetMyTests } from '../scripts/helpers/cabinet-navigation-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

for (const locale of ['en', 'ru']) {
  test(locale + ' verifier checks the exact portrait before using real My Tests navigation', async () => {
    const origin = 'http://127.0.0.1:3100', path = '/' + locale + '/app/tests'
    const events = []
    const profile = { name: 'profile', locator(selector) {
      assert.equal(selector, '[data-profile-report-archive]'); return archive
    } }
    const archive = { name: 'archive', getByRole(role, options) {
      assert.equal(role, 'heading')
      assert.deepEqual(options, { name: locale === 'ru' ? 'Мои отчёты' : 'My reports', level: 1, exact: true })
      return { name: 'heading' }
    } }
    const link = { name: 'link', first() { return this }, async click() {
      events.push('click'); page.url = origin + path
    } }
    const page = { name: 'page', url: origin + '/' + locale + '/app/portrait', locator(selector) {
      if (selector === '[data-profile-domains][data-profile-interactive="true"]') return profile
      if (selector === 'nav a[href="' + path + '"]:visible') return link
      assert.equal(selector, '[data-my-tests-dashboard]')
      return { name: 'dashboard' }
    } }
    const expect = value => ({
      async toHaveURL(url) { assert.equal(value.url, url); events.push('url:' + url) },
      async toBeVisible() { events.push('visible:' + value.name) },
      async toHaveText(text) { assert.equal(text, locale === 'ru' ? 'Тесты' : 'Tests'); events.push('label') },
      async toHaveAttribute(name, href) { if(value.name === 'profile') { assert.equal(name,'data-profile-mode');assert.equal(href,'account');events.push('account-mode');return } assert.equal(name, 'href'); assert.equal(href, path); events.push('href') },
    })
    await assertCabinetPortrait(page, expect, { origin, locale })
    await openCabinetMyTests(page, expect, { origin, locale })
    assert.deepEqual(events, [
      'url:' + origin + '/' + locale + '/app/portrait', 'visible:profile', 'account-mode', 'visible:archive', 'visible:heading',
      'visible:link', 'label', 'href', 'click', 'url:' + origin + path, 'visible:dashboard',
    ])
  })
}

test('all assessment sign-ins wait for the approved portrait and then exercise My Tests navigation', () => {
  for (const name of ['mhc-sf', 'asrs6', 'personality-types', 'compassion-assessments', 'relationships-assessments', 'account-status-filters']) {
    const source = read('scripts/verify-' + name + '.mjs')
    assert.match(source, /\.or\(page\.locator\('\[data-profile-domains\]'\)\)/, name)
    assert.match(source, /await assertCabinetPortrait\(page, expect, \{ origin \}\)\s+await openCabinetMyTests\(page, expect, \{ origin \}\)/, name)
    assert.doesNotMatch(source, /\.or\(page\.locator\('\[data-my-tests-dashboard\]'\)\)/, name)
  }
})

test('bilingual account PDF journeys retain portrait entry, visible My Tests navigation and PDF assertions', () => {
  for (const name of ['mhc-sf', 'personality-types', 'compassion-assessments', 'relationships-assessments']) {
    const source = read('scripts/verify-' + name + '.mjs')
    assert.match(source, /await navigate\(page,origin\+'\/'\+locale\+'\/app'\)\s+await assertCabinetPortrait\(page, expect, \{ origin, locale \}\)\s+await openCabinetMyTests\(page, expect, \{ origin, locale \}\)/, name)
    assert.ok(source.includes("'%PDF-1.4'"), name + ' PDF format proof')
    assert.ok(source.includes('bytes.length>12000'), name + ' PDF content proof')
  }
})

test('Spanish cabinet keeps its public root link and verifies the canonical portrait after click and reload', () => {
  const source = read('scripts/verify-es-public-site.mjs')
  assert.ok(source.includes("toHaveAttribute('href','/en/app')"))
  assert.equal(source.split("toHaveURL(origin+'/en/app/portrait')").length - 1, 2)
  assert.ok(source.includes("toHaveAttribute('lang','en')"))
  assert.ok(source.includes(".hh-app .hh-entry"))
})

// This is the actual signed-in account branch, not the separate legacy explorer.
test('portrait oracle matches current account report archive, never legacy tabs', () => {
  const runtime = read('components/app/profile-domains.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const helper = read('scripts/helpers/cabinet-navigation-verifier.mjs')
  assert.match(workspace, /<ProfileDomains locale=\{locale\} mode="account"/)
  assert.match(workspace, /reportsContent=\{<>/)
  assert.ok(runtime.includes("const external = mode === 'legacy'"))
  assert.match(runtime, /reportsContent && <section[^>]*data-profile-report-archive/)
  assert.match(runtime, /<h1 id="hh-account-report-title">\{t.archivePanelTitle\}<\/h1>/)
  assert.ok(runtime.includes("archivePanelTitle: 'My reports'"))
  assert.ok(runtime.includes("archivePanelTitle: 'Мои отчёты'"))
  assert.ok(helper.includes("toHaveAttribute('data-profile-mode', 'account')"))
  assert.ok(helper.includes("profile.locator('[data-profile-report-archive]')"))
  assert.doesNotMatch(helper.slice(helper.indexOf('export async function assertCabinetPortrait'),helper.indexOf('export async function openCabinetMyTests')), /hh-domain-more|My profile & reports/)
})
