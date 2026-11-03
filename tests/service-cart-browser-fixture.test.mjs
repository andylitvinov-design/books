import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { assertFixtureCompilation, buildServiceCartFixture, fixtureBundlePath, fixtureDocument, fixturePath, fixturePerformanceBudget } from '../scripts/service-cart-browser-fixture.mjs'

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


async function compileSyntheticBudget({ bytes, warning = false, error = false }) {
  const projectRequire = createRequire(import.meta.url)
  const bundled = projectRequire('next/dist/compiled/webpack/webpack')
  bundled.init()
  const directory = await mkdtemp(join(tmpdir(), 'hh-cart-budget-test-'))
  let compiler
  try {
    const entry = join(directory, 'synthetic.js')
    await writeFile(entry, `globalThis.__syntheticCartBudget = ${JSON.stringify('x'.repeat(bytes))};`)
    compiler = bundled.webpack({
      mode: 'production', target: 'web', context: directory, entry,
      output: { path: join(directory, 'output'), filename: 'fixture.js' },
      devtool: false, cache: false, optimization: { minimize: false },
      performance: fixturePerformanceBudget,
      plugins: [{ apply(build) {
        build.hooks.afterCompile.tap('SyntheticBudgetDiagnostic', (compilation) => {
          if (warning) compilation.warnings.push(new Error('SYNTHETIC_UNRELATED_WARNING'))
          if (error) compilation.errors.push(new Error('SYNTHETIC_COMPILATION_ERROR'))
        })
      } }],
    })
    return await new Promise((resolveBuild, reject) => compiler.run((failure, stats) => failure ? reject(failure) : resolveBuild(stats)))
  } finally {
    if (compiler) await new Promise((resolveClose, reject) => compiler.close((failure) => failure ? reject(failure) : resolveClose()))
    await rm(directory, { recursive: true, force: true })
  }
}

test('fixture-only performance budget explicitly caps both assets and entrypoints at 750 KiB', () => {
  assert.deepEqual(fixturePerformanceBudget, { hints: 'warning', maxAssetSize: 768000, maxEntrypointSize: 768000 })
  assert.match(builder, /performance: fixturePerformanceBudget/)
  assert.match(builder, /assertFixtureCompilation\(stats\)/)
  assert.doesNotMatch(builder, /ignoreWarnings|hints: false|performance: false/)
})

test('real webpack compilation accepts the 620 KiB unminified synthetic fixture', async (context) => {
  const stats = await compileSyntheticBudget({ bytes: 620 * 1024 })
  const asset = stats.toJson({ all: false, assets: true }).assets.find((item) => item.name === 'fixture.js')
  assert.ok(asset.size >= 620 * 1024 && asset.size < fixturePerformanceBudget.maxAssetSize)
  assert.doesNotThrow(() => assertFixtureCompilation(stats))
  context.diagnostic(`Synthetic fixture: ${asset.size} bytes; zero compilation warnings/errors`)
})

test('real webpack compilation above 750 KiB fails both asset and entrypoint budgets', async (context) => {
  const stats = await compileSyntheticBudget({ bytes: 751 * 1024 })
  const report = stats.toJson({ all: false, assets: true, warnings: true })
  const asset = report.assets.find((item) => item.name === 'fixture.js')
  assert.ok(asset.size > fixturePerformanceBudget.maxAssetSize)
  assert.equal(stats.hasErrors(), false, 'The rejection must be a genuine budget warning')
  assert.equal(stats.hasWarnings(), true)
  assert.ok(report.warnings.some((item) => /asset size limit/.test(item.message)))
  assert.ok(report.warnings.some((item) => /entrypoint size limit/.test(item.message)))
  assert.throws(() => assertFixtureCompilation(stats), /asset size limit[\s\S]*entrypoint size limit/)
  context.diagnostic(`Rejected synthetic fixture: ${asset.size} bytes; asset and entrypoint limits remain enforced`)
})

test('unrelated webpack warnings remain fatal below the fixture budget', async () => {
  const stats = await compileSyntheticBudget({ bytes: 16, warning: true })
  assert.equal(stats.hasErrors(), false)
  assert.equal(stats.hasWarnings(), true)
  assert.throws(() => assertFixtureCompilation(stats), /SYNTHETIC_UNRELATED_WARNING/)
})

test('webpack errors remain fatal below the fixture budget', async () => {
  const stats = await compileSyntheticBudget({ bytes: 16, error: true })
  assert.equal(stats.hasErrors(), true)
  assert.throws(() => assertFixtureCompilation(stats), /SYNTHETIC_COMPILATION_ERROR/)
})
