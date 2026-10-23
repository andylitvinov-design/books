import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { buildOporaBrowserFixture, oporaFixturePath, oporaFixtureDocument,
  oporaFixtureOrigin, oporaFixtureBundlePath, requireHostedOporaBrowser, assertFixtureCompilation } from '../scripts/opora-as56-browser-fixture.mjs'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
const expectedAssetPaths = [
  'course-start-heron.webp', 'course-focus-mountain-boy.webp', 'reiki-practitioner-sunrise.webp',
  'report-lighthouse-coast.webp', 'hero-olive-incense.webp', 'reiki-approved-sunrise-v3.webp', 'gentle-owl.svg',
].map(name => '/images/holistic-house/' + name)

// Exercise the actual runner's asset setup and interception callback, not a
// second routing implementation. Only local readFile and route doubles run;
// importing the browser runner would launch Playwright and compile the fixture.
async function interceptedAssetFixture() {
  const browser = await read('scripts/verify-opora-as56-browser.mjs')
  const assetStart = browser.indexOf('const assets = new Map(')
  const assetEnd = browser.indexOf('\nconst browser =', assetStart)
  const routeStart = browser.indexOf("await context.route('**/*', route => {")
  const routeEnd = browser.indexOf('\n    const button =', routeStart)
  assert.ok(assetStart >= 0 && assetEnd > assetStart && routeStart >= 0 && routeEnd > routeStart,
    'Runner asset setup and strict interception callback must remain identifiable')
  const moduleUrl = new URL('../scripts/verify-opora-as56-browser.mjs', import.meta.url).href
  const readUrls = [], unexpectedRequests = []
  const bodies = new Map(expectedAssetPaths.map(path => [path, Buffer.from('synthetic asset: ' + path)]))
  let handler
  const scope = {
    URL, moduleUrl, origin: oporaFixtureOrigin, locale: 'en', oporaFixturePath, oporaFixtureBundlePath,
    html: '<!doctype html><title>Synthetic fixture</title>', fixture: { bundle: Buffer.from('synthetic bundle') },
    unexpectedRequests,
    readFile: async url => {
      readUrls.push(url.href)
      const path = expectedAssetPaths.find(path => new URL('../public' + path, moduleUrl).href === url.href)
      assert.ok(path, 'Only an exact named local fixture asset may be read: ' + url.href)
      return bodies.get(path)
    },
    context: { route(pattern, callback) { assert.equal(pattern, '**/*'); handler = callback } },
  }
  const setup = browser.slice(assetStart, assetEnd).replaceAll('import.meta.url', 'moduleUrl')
  await runInNewContext('(async () => {\n' + setup + '\n' + browser.slice(routeStart, routeEnd) + '\n})()', scope,
    { timeout: 1000 })
  assert.equal(typeof handler, 'function')
  return { handler, readUrls, bodies, unexpectedRequests, scope, moduleUrl }
}

test('OPORA fixture asset map covers exact production scene paths without broadening its allowlist', async () => {
  const { readUrls, moduleUrl } = await interceptedAssetFixture()
  assert.deepEqual(readUrls.sort(), expectedAssetPaths.map(path => new URL('../public' + path, moduleUrl).href).sort())
  const css = await read('components/app/opora-experience-player.module.css')
  const scenePaths = [...css.matchAll(/url\(['"]?(\/images\/holistic-house\/[^)'"\s]+)['"]?\)/g)].map(match => match[1])
  for (const path of ['/images/holistic-house/hero-olive-incense.webp', '/images/holistic-house/reiki-approved-sunrise-v3.webp']) {
    assert.ok(scenePaths.includes(path), 'Added fixture asset must remain referenced by actual player CSS: ' + path)
  }
  for (const path of scenePaths) assert.ok(expectedAssetPaths.includes(path), 'Unreviewed player scene asset: ' + path)
})

test('OPORA fixture route fulfills only exact local GET fixtures and records every rejected request', async () => {
  const { handler, bodies, unexpectedRequests, scope } = await interceptedAssetFixture()
  const request = async (url, method = 'GET') => {
    const calls = []
    await handler({ request: () => ({ url: () => url, method: () => method }),
      fulfill: result => calls.push({ kind: 'fulfill', ...result }),
      abort: reason => calls.push({ kind: 'abort', reason }),
      continue: () => assert.fail('Never continue a fixture request'),
      fetch: () => assert.fail('Never fetch a fixture request or follow a redirect'),
    })
    assert.equal(calls.length, 1, 'Each intercepted request must have one terminal action')
    return calls[0]
  }
  for (const path of expectedAssetPaths) {
    const result = await request(oporaFixtureOrigin + path)
    assert.deepEqual(result, { kind: 'fulfill', status: 200,
      contentType: path.endsWith('.svg') ? 'image/svg+xml' : 'image/webp', body: bodies.get(path) })
  }
  for (const [path, contentType, body] of [[oporaFixturePath('en'), 'text/html', scope.html],
    [oporaFixtureBundlePath, 'text/javascript', scope.fixture.bundle]]) {
    assert.deepEqual(await request(oporaFixtureOrigin + path), { kind: 'fulfill', status: 200, contentType, body })
  }
  assert.deepEqual(unexpectedRequests, [])
  const asset = '/images/holistic-house/hero-olive-incense.webp'
  const rejected = [
    [oporaFixtureOrigin + asset, 'POST'], [oporaFixtureOrigin + asset, 'HEAD'],
    [oporaFixtureOrigin + asset + '?token=synthetic-private-marker'],
    ['https://example.invalid' + asset], ['https://127.0.0.1:3100' + asset],
    ['http://localhost:3100' + asset], ['http://127.0.0.1:3101' + asset],
    [oporaFixtureOrigin + '/images/holistic-house/unreviewed.webp'],
    [oporaFixtureOrigin + '/images/holistic-house/reiki-approved-sunrise-v4.webp'],
    [oporaFixtureOrigin + asset + '/extra'], [oporaFixtureOrigin + '/api/session'],
    [oporaFixtureOrigin + '/redirect?to=https://example.invalid'],
  ]
  for (const [url, method = 'GET'] of rejected) {
    assert.deepEqual(await request(url, method), { kind: 'abort', reason: 'blockedbyclient' })
    assert.deepEqual({ ...unexpectedRequests.at(-1) }, { method, origin: new URL(url).origin, path: new URL(url).pathname })
  }
  assert.equal(unexpectedRequests.length, rejected.length)
  assert.ok(!JSON.stringify(unexpectedRequests).includes('synthetic-private-marker'), 'Do not record query data')
})

test('OPORA browser fixture accepts only supported synthetic locales and no saved data', () => {
  for (const locale of ['ru', 'en', 'es']) assert.equal(oporaFixturePath(locale), '/__hh-test__/opora-as56/' + locale)
  for (const locale of ['fr', '', '../en', '<script>']) assert.throws(() => oporaFixturePath(locale))
  assert.throws(() => oporaFixtureDocument('en', { cycle: { day: 1 }, currentSession: null }, ''))
  assert.throws(() => oporaFixtureDocument('en', { cycle: { day: 5 }, currentSession: {} }, ''))
  const html = oporaFixtureDocument('ru', { cycle: { day: 5 }, currentSession: null, marker: '</script><script>bad' }, 'a{color:red}')
  assert.ok(html.includes(oporaFixtureBundlePath))
  assert.ok(html.includes('\\u003c/script>'))
  assert.ok(!html.includes('</script><script>bad'))
})
test('OPORA browser runner refuses local/deployed environments instead of changing auth or sandbox', () => {
  const env = { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HH_APP_TEST_RUNTIME: 'isolated' }
  requireHostedOporaBrowser(env)
  for (const key of Object.keys(env)) assert.throws(() => requireHostedOporaBrowser({ ...env, [key]: '' }))
  assert.throws(() => requireHostedOporaBrowser({ ...env, VERCEL: '1' }))
})
test('OPORA fixture fails closed without the existing repository build toolchain', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'opora-toolchain-'))
  try {
    await writeFile(join(dir, 'package.json'), '{"private":true}')
    await assert.rejects(buildOporaBrowserFixture({ projectRoot: dir }), /refusing a fallback or package installation/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('hosted verification has exact mobile coverage, fully intercepted requests and no save transport', async () => {
  const browser = await read('scripts/verify-opora-as56-browser.mjs')
  const entry = await read('scripts/fixtures/opora-as56-browser.jsx')
  const workflow = await read('.github/workflows/opora-module-ci.yml')
  assert.match(entry, /import OporaExperiencePlayer from '@\/components\/app\/opora-experience-player'/)
  assert.match(entry, /createRoot\(/)
  assert.doesNotMatch(entry, /fetch\(|\/api\/|localStorage|sessionStorage|cookie/i)
  assert.match(entry, /Object\.freeze\(value\)/)
  for (const fragment of ["['ru', 'en', 'es']", '[320, 360, 390]', '[false, true]', "serviceWorkers: 'block'",
    "route.abort('blockedbyclient')", 'assert.equal(state.saves, 0', 'assert.deepEqual(unexpectedRequests, []',
    'assert.equal(state.finalData, state.initialData', 'await click(t.previous)', 'await click(t.neutral)',
    "await page.keyboard.press('Escape')", 'assert.equal(evidence.cases.length, 18)']) assert.ok(browser.includes(fragment), fragment)
  assert.doesNotMatch(browser, /route\.continue|request\.post|\.request\.fetch|createServer|process\.env\.[A-Z_]*(?:TOKEN|SECRET|PASSWORD)/)
  assert.match(workflow, /browser: \[chromium, webkit\]/)
  assert.match(workflow, /node scripts\/verify-opora-as56-browser\.mjs/)
  assert.match(workflow, /path: artifacts\/opora-as56-mobile\//)
})
test('actual AS5.6 JSX, validators and CSS bundle unchanged with traceable source hashes', async () => {
  const fixture = await buildOporaBrowserFixture()
  assert.ok(fixture.bundle.length > 100000 && fixture.bundle.length <= 804 * 1024)
  assert.ok(fixture.css.includes('.hh-app'))
  for (const path of ['components/app/opora-experience-player.jsx', 'components/app/opora-experience-player.module.css',
    'lib/inner-growth/opora-as56-experience-guides.js', 'lib/inner-growth/anti-stress-skills-v6.js',
    'lib/inner-growth/course-slide-sequence.js', 'app/globals.css', 'app/[locale]/app/[[...path]]/workspace.css']) {
    const proof = fixture.sourceProof.find(item => item.path === path)
    assert.ok(proof, path)
    assert.equal(proof.sha256, createHash('sha256').update(await read(path)).digest('hex'))
  }
})

test('OPORA fixture compilation rejects every error or warning and retains the original budget', async () => {
  for (const [errors, warnings] of [[true, false], [false, true], [true, true]]) {
    assert.throws(() => assertFixtureCompilation({
      hasErrors: () => errors, hasWarnings: () => warnings,
      toString: () => 'synthetic compilation failure',
    }), /synthetic compilation failure/)
  }
  assert.doesNotThrow(() => assertFixtureCompilation({ hasErrors: () => false, hasWarnings: () => false }))
  const builder = await read('scripts/opora-as56-browser-fixture.mjs')
  assert.match(builder, /maxAssetSize: 804 \* 1024, maxEntrypointSize: 804 \* 1024/)
  assert.match(builder, /optimization: \{ minimize: true, minimizer: \[new MinifyPlugin\(\{\}\)\] \}/)
  assert.match(builder, /getAsset\('fixture.js'\)\?\.info.minimized, true/)
})
