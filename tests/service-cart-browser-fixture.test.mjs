import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildServiceCartFixture, fixtureBundlePath, fixtureDocument, fixturePath } from '../scripts/service-cart-browser-fixture.mjs'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const browser = read('scripts/verify-service-cart-browser.mjs')
const builder = read('scripts/service-cart-browser-fixture.mjs')
const entry = read('scripts/fixtures/service-cart-browser.jsx')
const link = read('scripts/fixtures/service-cart-browser-link.jsx')
const presentation = { stylesheets: ['/_next/static/css/production.css'] }

test('only supported locales have a reserved test-only fixture path', () => {
  for (const locale of ['en', 'ru', 'es']) assert.equal(fixturePath(locale), `/__hh-test__/service-cart/${locale}`)
  for (const locale of ['', 'fr', '../services', '<script>']) assert.throws(() => fixturePath(locale), /Unsupported/)
  assert.equal(fixtureBundlePath, '/__hh-test__/service-cart/fixture.js')
})

test('fixture requires real local production stylesheets and escapes copied attributes', () => {
  for (const stylesheets of [[], ['https://example.com/a.css'], ['//example.com/a.css'], ['/fixture.css'], ['/_next/static/css/a.css#fragment']]) {
    assert.throws(() => fixtureDocument('en', { stylesheets }))
  }
  const html = fixtureDocument('ru', { ...presentation, htmlClass: 'font"<test>', bodyClass: 'body&test' })
  assert.match(html, /lang="ru"/)
  assert.match(html, /font&quot;&lt;test&gt;/)
  assert.match(html, /body&amp;test/)
  assert.match(html, /href="\/_next\/static\/css\/production\.css"/)
  assert.match(html, /data-service-cart-browser-fixture/)
  assert.doesNotMatch(html, /<style|<base|http[s]?:\/\//)
})

test('missing repository toolchain fails closed without installing a replacement', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hh-missing-cart-toolchain-'))
  try {
    await writeFile(join(directory, 'package.json'), '{"private":true}')
    await assert.rejects(buildServiceCartFixture({ projectRoot: directory }), /refusing a fallback or package installation/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('bundle imports unchanged production cart and transport modules, with only Next Link adapted', () => {
  assert.match(entry, /import \{ ServiceCart \} from '@\/components\/commerce\/service-cart'/)
  assert.match(entry, /createElement\(ServiceCart, \{ locale \}\)/)
  for (const path of ['components/commerce/service-cart.tsx', 'components/commerce/service-cart.module.css', 'lib/commerce/catalog.js', 'lib/commerce/cart.js', 'lib/commerce/client-account.js']) assert.ok(builder.includes(path))
  assert.match(builder, /bundledFiles\.has\(path\)/)
  assert.match(builder, /sourceProof\.push/)
  assert.match(builder, /getCssModuleLocalIdent'\)\.getCssModuleLocalIdent/)
  assert.match(builder, /modules: \{ mode: 'pure', exportLocalsConvention: 'asIs', getLocalIdent \}/)
  assert.match(builder, /'next\/link\$': join\(fixtureDirectory, 'service-cart-browser-link.jsx'\)/)
  assert.doesNotMatch(builder, /esbuild|child_process|npm install|createServer/)
  assert.doesNotMatch(entry + link, /sessionStorage|\/api\/|\.fetch\(|window\.fetch|accountGuard|setSelected/)
})

function navigationHarness() {
  const events = [], pushes = []
  const window = {
    location: { href: 'http://127.0.0.1:3100/__hh-test__/service-cart/en', origin: 'http://127.0.0.1:3100' },
    history: { pushState: (...args) => pushes.push(args) },
    dispatchEvent: (event) => events.push(event.type),
  }
  // The adapter contains plain JS; execute its actual click handler with tiny
  // DOM/React boundaries. The browser suite separately proves real unmount.
  const source = link.replace(/^import[^\n]+\n/, '').replace('export default function FixtureLink', 'return function FixtureLink')
  const FixtureLink = new Function('createElement', 'window', 'PopStateEvent', source)(
    (tag, props, children) => ({ tag, props, children }), window, class { constructor(type) { this.type = type } },
  )
  const event = () => ({ button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true } })
  return { FixtureLink, event, events, pushes }
}

test('Link adapter keeps the document alive and tells React to unmount on internal navigation', () => {
  const { FixtureLink, event, events, pushes } = navigationHarness()
  const anchor = FixtureLink({ href: '/en/services/free-situation-review?test=1#free', children: 'Free assessment' })
  const click = event()
  anchor.props.onClick(click)
  assert.equal(anchor.tag, 'a')
  assert.equal(anchor.props.href, '/en/services/free-situation-review?test=1#free')
  assert.equal(click.defaultPrevented, true)
  assert.deepEqual(pushes, [[{}, '', '/en/services/free-situation-review?test=1#free']])
  assert.deepEqual(events, ['popstate'])
  assert.match(entry, /window\.addEventListener\('popstate', navigate\)/)
  assert.match(entry, /data-service-cart-fixture-destination/)
})

test('Link adapter preserves modified, prevented, external, download and new-tab clicks', () => {
  const cases = [
    [{ href: 'https://example.com/path' }, {}],
    [{ href: '/en/app', target: '_blank' }, {}],
    [{ href: '/en/app', download: '' }, {}],
    [{ href: '/en/app' }, { metaKey: true }],
    [{ href: '/en/app' }, { ctrlKey: true }],
    [{ href: '/en/app' }, { shiftKey: true }],
    [{ href: '/en/app' }, { altKey: true }],
    [{ href: '/en/app' }, { button: 1 }],
    [{ href: '/en/app' }, { defaultPrevented: true }],
    [{ href: '/en/app', onClick: (event) => event.preventDefault() }, {}],
  ]
  for (const [props, overrides] of cases) {
    const h = navigationHarness()
    h.FixtureLink(props).props.onClick(Object.assign(h.event(), overrides))
    assert.deepEqual(h.pushes, [])
    assert.deepEqual(h.events, [])
  }
})

test('browser suite checks real public cart absence before mounting the isolated component', () => {
  const publicVisit = browser.indexOf('await page.goto(`${origin}/${locale}/services`')
  const absent = browser.indexOf("page.locator('[data-service-cart], #service-cart').count(), 0")
  const isolated = browser.indexOf('const path = fixturePath(locale)')
  assert.ok(publicVisit > 0 && absent > publicVisit && isolated > absent)
  assert.match(browser, /fixtureHtml = fixtureDocument\(locale, presentation\)/)
  assert.match(browser, /if \(path === fixturePath\(locale\)\)/)
  assert.match(browser, /if \(path\.startsWith\(fixturePrefix\)\) return route\.fulfill\(\{ status: 404/)
})

test('all API, privacy, owner binding, repeat order and delayed response defenses remain asserted', () => {
  for (const guard of [
    "serviceWorkers: 'block'", "if (url.origin !== origin)", "route.abort('blockedbyclient')",
    "path === '/api/app/commerce/status'", "path === '/api/app/commerce/checkout'",
    "UNMOCKED_COMMERCE_REQUEST", "SYNTHETIC_SIGNED_OUT", "SYNTHETIC_MUTATION_BLOCKED",
    "['items', 'locale', 'operationId']", "first.expected, accountA", "repeatPurchaseRequired: true",
    "['items', 'locale', 'operationId', 'repeatOrderId']", "read.expected === accountA",
    "[accountB, null]", "h.state.checkouts.at(-1).expected, accountA",
    "h.state.checkouts.at(-1).actual, nextAccount", "read.expected === accountA && read.actual === accountB",
    "{ received: 1, settled: 1, jsonReads: 0 }", "'stale checkout must not re-read identity'",
    "'stale checkout must not start order polling'", "assert.deepEqual(unexpectedCommerce, []",
    "assert.deepEqual(externalNavigations, []", "assert.deepEqual(errors, [])",
  ]) assert.ok(browser.includes(guard), guard)
  assert.match(browser, /documentToken = await h\.page\.evaluate\(\(\) => window\.__serviceCartFixtureDocumentToken\)/)
  assert.match(browser, /documentToken, 'SPA unmount must preserve the document and pending fetch probe'/)
})
