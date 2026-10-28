import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertCabinetPortrait, openCabinetMyTests } from '../scripts/helpers/cabinet-navigation-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

for (const locale of ['en', 'ru']) {
  test(locale + ' verifier checks the exact portrait before using real My Tests navigation', async () => {
    const origin = 'http://127.0.0.1:3100', path = '/' + locale + '/app/tests'
    const events = []
    const tabs = { name: 'profile-tabs' }
    const area = { name: 'profile-areas', getByRole(role) {
      assert.equal(role, 'tab')
      return tabs
    } }
    const profile = { name: 'profile', locator(selector) {
      assert.equal(selector, 'details.hh-domain-more')
      return area
    } }
    let menuOpen = false
    const summary = { name: 'account-summary', async click() { menuOpen = true; events.push('open-account') } }
    const menu = { name: 'account-menu', async getAttribute(name) { assert.equal(name, 'open'); return menuOpen ? '' : null }, locator(selector) {
      if (selector === ':scope > summary') return summary
      assert.equal(selector, ':scope > div > a[href="' + path + '"]'); return link
    } }
    const link = { name: 'link', async click() {
      events.push('click'); page.url = origin + path
    } }
    const page = { name: 'page', url: origin + '/' + locale + '/app/portrait', locator(selector) {
      if (selector === '[data-profile-domains][data-profile-interactive="true"]') return profile
      if (selector === 'details.hh-account-menu:visible') return menu
      assert.equal(selector, '[data-my-tests-dashboard]')
      return { name: 'dashboard' }
    } }
    const expect = value => ({
      async toHaveCount(n) { if (value === tabs) { assert.equal(n, 4); events.push('four-tabs') } else { assert.ok([menu, summary, link].includes(value)); assert.equal(n, 1); events.push('one:' + value.name) } },
      async toHaveURL(url) { assert.equal(value.url, url); events.push('url:' + url) },
      async toBeVisible() { events.push('visible:' + value.name) },
      async toHaveText(text) { assert.equal(text, locale === 'ru' ? 'Тесты' : 'Tests'); events.push('label') },
      async toHaveAttribute(name, value) { if(value === '') { assert.equal(name,'open'); events.push('open'); } else { assert.equal(name,'href'); assert.equal(value, path); events.push('href'); } },

    })
    await assertCabinetPortrait(page, expect, { origin, locale })
    await openCabinetMyTests(page, expect, { origin, locale })
    assert.deepEqual(events, [
      'url:' + origin + '/' + locale + '/app/portrait', 'visible:profile', 'visible:profile-areas', 'open', 'four-tabs',
      'one:account-menu', 'visible:account-menu', 'one:account-summary', 'visible:account-summary', 'open-account', 'open',
      'one:link', 'visible:link', 'label', 'href', 'click', 'url:' + origin + path, 'visible:dashboard',
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

test('bilingual account PDF journeys retain portrait entry, visible My Tests navigation and PDF assertions', async () => {
  for (const name of ['mhc-sf', 'personality-types', 'compassion-assessments', 'relationships-assessments']) {
    const source = read('scripts/verify-' + name + '.mjs')
    if (name === 'mhc-sf') await assertMhcPdfContract(source)
    else assert.match(source, /await navigate\(page,origin\+'\/'\+locale\+'\/app'\)\s+await assertCabinetPortrait\(page, expect, \{ origin, locale \}\)\s+await openCabinetMyTests\(page, expect, \{ origin, locale \}\)/, name)
    assert.ok(source.includes("'%PDF-1.4'"), name + ' PDF format proof')
    assert.ok(source.includes('bytes.length>12000'), name + ' PDF content proof')
  }
})

test('Spanish cabinet uses the explicit Profile menu gesture and checks portrait after click and reload', () => {
  assertSpanishProfileContract(read('scripts/verify-es-public-site.mjs'))
})

function assertSpanishProfileContract(source) {
  const start = source.indexOf("stage=`${engine} ${width} Spanish account navigation`;")
  const end = source.indexOf("stage=`${engine} ${width} search`;", start)
  assert.ok(start >= 0 && end > start)
  const block = source.slice(start, end)
  const steps = [
    "const accountMenu = page.locator('.site-navigation details.site-main-menu')",
    "await expect(accountMenu).toHaveCount(1)",
    "await expect(accountMenu).toHaveJSProperty('open', false)",
    "await click(page.locator('.site-main-menu-trigger'))",
    "await expect(accountMenu).toHaveJSProperty('open', true)",
    "const accountLink = accountMenu.locator('.site-main-menu-grid > a[data-nav-item=\"profile\"]')",
    "await expect(accountLink).toHaveCount(1)",
    "await expect(accountLink).toHaveAccessibleName('Mi perfil')",
    "await expect(accountLink).toBeVisible()",
    "await expect(accountLink).toHaveAttribute('href','/en/app/portrait')",
    "await click(accountLink)",
    "await expect(page).toHaveURL(origin+'/en/app/portrait')",
    "await expect(page.locator('.hh-app .hh-entry')).toBeVisible()",
    "await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0)",
    "await page.reload(); await settle()",
    "await expect(page).toHaveURL(origin+'/en/app/portrait')",
    "await expect(page.locator('html')).toHaveAttribute('lang','en')",
    "await expect(page.locator('.hh-app .hh-entry')).toBeVisible()",
  ]
  let cursor = 0
  for (const step of steps) {
    const found = block.indexOf(step, cursor)
    assert.ok(found >= cursor, 'Missing or reordered explicit account gesture: ' + step)
    cursor = found + step.length
  }
  assert.equal(block.split("toHaveURL(origin+'/en/app/portrait')").length - 1, 2)
}

test('Spanish profile contract rejects missing gesture, wrong route, absent reload and language proof', () => {
  const source = read('scripts/verify-es-public-site.mjs')
  for (const before of [
    "await click(page.locator('.site-main-menu-trigger'))",
    "await expect(accountLink).toBeVisible()",
    "await expect(accountLink).toHaveAttribute('href','/en/app/portrait')",
    "await click(accountLink)",
    "await page.reload(); await settle()",
    "await expect(page.locator('html')).toHaveAttribute('lang','en')",
  ]) {
    assert.ok(source.includes(before))
    assert.throws(() => assertSpanishProfileContract(source.replace(before, '')), {code: 'ERR_ASSERTION'})
  }
  assert.throws(() => assertSpanishProfileContract(source.replace("toHaveAttribute('href','/en/app/portrait')", "toHaveAttribute('href','/en/app')")), {code: 'ERR_ASSERTION'})
  assert.throws(() => assertSpanishProfileContract(source.replace("await expect(page).toHaveURL(origin+'/en/app/portrait')", '')), {code: 'ERR_ASSERTION'})
})

// Execute only the actual bilingual PDF block. Browser, helper and download
// boundaries are inert; no verifier module, auth, API, DB or provider is run.
async function assertMhcPdfJourney(source, invalid = {}) {
  const {start, end} = mhcPdfBounds(source)
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const execute = new AsyncFunction('page', 'origin', 'assertCabinetPortrait', 'openCabinetMyTests',
    'expect', 'readFile', 'assert', 'output', 'passed', source.slice(start, end))
  const origin = 'http://127.0.0.1:3100', output = 'synthetic-pdf'
  const events = []
  let locale, stage = 'previous-document', pending = false
  const file = {
    async path() { events.push('path'); return 'synthetic-download' },
    async saveAs(path) { assert.equal(path, output + '/report-' + locale + '.pdf'); events.push('save:' + locale) },
  }
  const page = {
    async waitForLoadState(state) { assert.equal(state, 'networkidle'); events.push('idle') },
    async goto(url) {
      locale = url === origin + '/en/app' ? 'en' : url === origin + '/ru/app' ? 'ru' : null
      assert.ok(locale, 'Navigate to the localized account root, not straight to Tests')
      stage = 'root'; events.push('goto:' + locale)
    },
    waitForEvent(event, options) {
      assert.equal(stage, 'tests'); assert.equal(event, 'download'); assert.equal(options.timeout, 60000)
      assert.equal(pending, false); pending = true; events.push('download:' + locale)
      return Promise.resolve(file)
    },
    getByRole(role, options) {
      assert.equal(stage, 'tests'); assert.equal(role, 'button')
      assert.deepEqual(options, {name: locale === 'ru' ? 'Скачать отчёт' : 'Download report', exact: true})
      return {async click(...args) { assert.deepEqual(args, []); assert.equal(pending, true); pending = false; events.push('click:' + locale) }}
    },
  }
  const expect = Object.freeze({fixture: true})
  const portrait = async (target, assertion, options) => {
    assert.equal(target, page); assert.equal(assertion, expect)
    assert.deepEqual(options, {origin, locale}); assert.equal(stage, 'root')
    stage = 'portrait'; events.push('portrait:' + locale)
  }
  const tests = async (target, assertion, options) => {
    assert.equal(target, page); assert.equal(assertion, expect)
    assert.deepEqual(options, {origin, locale}); assert.equal(stage, 'portrait')
    stage = 'tests'; events.push('tests:' + locale)
  }
  const read = async path => {
    assert.equal(path, 'synthetic-download'); assert.equal(pending, false); events.push('read:' + locale)
    const bytes = Buffer.alloc(invalid.short === locale ? 12000 : 12001)
    bytes.write(invalid.signature === locale ? 'NOT-PDF!' : '%PDF-1.4')
    return bytes
  }
  const proof = {
    equal(actual, expected) { events.push('signature:' + locale); assert.equal(actual, expected) },
    ok(condition) { events.push('size:' + locale); assert.ok(condition) },
  }
  await execute(page, origin, portrait, tests, expect, read, proof, output, message => {
    assert.equal(message, locale + ' PDF download includes persisted MHC-SF sums and interpretation model')
    events.push('passed:' + locale)
  })
  assert.deepEqual(events, ['en', 'ru'].flatMap(language => ['idle', 'goto:' + language,
    'portrait:' + language, 'tests:' + language, 'download:' + language, 'click:' + language,
    'path', 'read:' + language, 'signature:' + language, 'size:' + language, 'save:' + language, 'passed:' + language]))
}

test('MHC PDF navigation and format/size proof reject missing, reordered and weakened actions', async () => {
  const source = read('scripts/verify-mhc-sf.mjs')
  const portrait = '  await assertCabinetPortrait(page, expect, { origin, locale })'
  const tests = '  await openCabinetMyTests(page, expect, { origin, locale })'
  for (const [before, after] of [
    [portrait, ''], [tests, ''], [portrait, portrait + '\n' + portrait],
    [portrait + '\n' + tests, tests + '\n' + portrait],
    ["await page.goto(origin+'/'+locale+'/app')", "await page.goto(origin+'/'+locale+'/app/tests')"],
    ["  await page.waitForLoadState('networkidle')", ''],
    ["await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click()", ''],
    ["await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click()", "await page.getByRole('button',{name:locale==='ru'?'Скачать отчёт':'Download report',exact:true}).click({force:true})"],
    ["page.waitForEvent('download',{timeout:60000})", "page.waitForEvent('download',{timeout:1})"],
    ["assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');", ''],
    ['assert.ok(bytes.length>12000)', ''],
    ['assert.ok(bytes.length>12000)', 'assert.ok(true)'],
    ["assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4')", "assert.equal('%PDF-1.4','%PDF-1.4')"],
  ]) {
    assert.ok(source.includes(before), 'Mutation target: ' + before)
    await assert.rejects(() => assertMhcPdfContract(mutateMhcPdf(source, before, after)), {code: 'ERR_ASSERTION'})
  }
  for (const locale of ['en', 'ru']) {
    await assert.rejects(() => assertMhcPdfJourney(source, {signature: locale}), {code: 'ERR_ASSERTION'})
    await assert.rejects(() => assertMhcPdfJourney(source, {short: locale}), {code: 'ERR_ASSERTION'})
  }
})

test('MHC exact-block fixture accepts harmless equivalent native navigation syntax', async () => {
  const source = read('scripts/verify-mhc-sf.mjs')
  await assertMhcPdfContract(mutateMhcPdf(source, 'await page.goto(', "await page['goto']("))
})

function mhcPdfBounds(source) {
  const marker = source.indexOf('// The existing client-only PDF pipeline')
  const start = source.indexOf(" for(const locale of ['en','ru']){", marker)
  const end = source.indexOf(' // Both language/mode journeys', start)
  assert.ok(marker >= 0 && start > marker && end > start)
  return {start, end}
}
function mutateMhcPdf(source, before, after) {
  const {start, end} = mhcPdfBounds(source), block = source.slice(start, end)
  assert.equal(block.split(before).length, 2, 'Unique exact-block mutation target: ' + before)
  return source.slice(0, start) + block.replace(before, after) + source.slice(end)
}
async function assertMhcPdfContract(source) {
  await assertMhcPdfJourney(source)
  for (const locale of ['en', 'ru']) {
    await assert.rejects(() => assertMhcPdfJourney(source, {signature: locale}), {code: 'ERR_ASSERTION'})
    await assert.rejects(() => assertMhcPdfJourney(source, {short: locale}), {code: 'ERR_ASSERTION'})
  }
}
