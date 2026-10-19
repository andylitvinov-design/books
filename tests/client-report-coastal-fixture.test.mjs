import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { compileFunction, runInNewContext } from 'node:vm'
import ts from 'typescript'
import { buildCoastalFixture, syntheticCases, origin, requireHosted } from '../scripts/helpers/client-report-coastal-fixture.mjs'

const root = new URL('../', import.meta.url)
const fixture = await buildCoastalFixture()
const markup = new Map(syntheticCases().map(sample => [sample.locale + '/' + sample.mode, fixture.document(sample)]))

test('current signed report and viewer render all four synthetic cases with real progress and voice markup', () => {
  assert.equal(markup.size, 4)
  for (const [key, html] of markup) {
    const full = key.endsWith('/full')
    const body = html.slice(html.indexOf('<body>'))
    assert.match(body, /data-hh-report-theme="coastal-v2"/)
    assert.equal((body.match(/class="canonical-progress-dial"/g) || []).length, full ? 2 : 0)
    assert.equal(body.includes('canonical-report-cover'), full)
    assert.equal(body.includes('id="session-message"'), full)
    assert.equal(body.includes('coastal_voice_portraitFrame'), full)
    assert.doesNotMatch(body, /<script\b|<iframe\b|\/api\/report-narration|AI-cloned voice|coastal_narration_box/)
    if (full) {
      assert.match(body, /class="coastal_voice_voiceBody"/)
      assert.match(body, /loading="lazy" width="192" height="188"/)
      assert.match(body, /srcSet="\/images\/holistic-house\/portrait-static\/andy-96-[a-f0-9]+\.webp 96w,/)
      assert.ok(body.indexOf('data-hh-report-next-actions') < body.indexOf('id="session-recommended-tests"'))
      assert.ok(body.indexOf('id="session-recommended-tests"') < body.indexOf('id="session-download"'))
    }
  }
})

test('fixture hashes the actual imported reader graph and keeps CSS module namespaces separate', async () => {
  const proofs = new Map(fixture.sourceProof.map(proof => [proof.path, proof.sha256]))
  assert.equal(proofs.size, fixture.sourceProof.length)
  for (const path of [
    'components/prescription-document.jsx', 'components/client-session-page.jsx',
    'components/report-narration-player.jsx', 'components/report-narration-player.module.css',
    'components/dao-resource-stage.jsx', 'components/dao-resource-stage.module.css',
    'lib/consultations/dao-resource-stage.js', 'lib/consultations/dao-stage-author-content.js',
    'lib/documents/report-progress.js', 'components/static-portrait.tsx',
    'data/static-portrait.json', 'components/client-session-voice-card.module.css',
  ]) assert.ok(proofs.has(path), 'missing exact source proof: ' + path)
  for (const [path, hash] of proofs) {
    const bytes = await readFile(new URL(path, root))
    assert.equal(hash, createHash('sha256').update(bytes).digest('hex'), path)
  }
  assert.ok(!proofs.has('lib/clients/report-narration-service.js'), 'offline fixture must not load the server-only synthesis service')
  for (const selector of ['.coastal_fixture_sessionSiteShell', '.coastal_voice_voiceSection', '.coastal_dao_reportSection', '.coastal_narration_box']) {
    assert.ok(fixture.styleData.includes(selector), selector)
  }
})

test('portrait routes contain only manifest-verified same-origin static image bytes', async () => {
  const portrait = JSON.parse(await readFile(new URL('data/static-portrait.json', root), 'utf8'))
  assert.equal(fixture.publicAssets.size, portrait.variants.length + 2)
  for (const variant of portrait.variants) {
    const asset = fixture.publicAssets.get(origin + variant.path)
    assert.ok(asset)
    assert.equal(asset.contentType, 'image/webp')
    assert.equal(asset.body.length, variant.bytes)
    assert.equal(createHash('sha256').update(asset.body).digest('hex'), variant.sha256)
  }
  for (const address of [origin + '/api/report-narration', origin + '/api/client/session', 'https://example.com/image.webp', origin + '/images/holistic-house/portrait-static/unknown.webp']) {
    assert.equal(fixture.publicAssets.has(address), false)
  }
})

test('the complete generated CSS and HTML image graph uses only explicit local routes', async () => {
  const coastal = [
    ['/images/holistic-house/report-lighthouse-coast.avif', 'image/avif'],
    ['/images/holistic-house/report-lighthouse-coast.webp', 'image/webp'],
  ]
  const legacyPaths = ['/document-assets/lighthouse.png',
    '/images/holistic-house/homepage-botanical.svg', '/images/holistic-house/report-lighthouse-coast.svg']
  const cssPaths = [...new Set([...fixture.styleData.matchAll(/url\(\s*['"]?([^\s)'";]+)/g)]
    .map(match => match[1]).filter(path => !path.startsWith('data:')))]
  assert.deepEqual(cssPaths.sort(), [...legacyPaths, ...coastal.map(([path]) => path)].sort())
  for (const [path, contentType] of coastal) {
    const asset = fixture.publicAssets.get(origin + path)
    const bytes = await readFile(new URL('public' + path, root))
    assert.ok(asset)
    assert.equal(asset.contentType, contentType)
    assert.deepEqual(asset.body, bytes)
    assert.equal(fixture.sourceProof.find(proof => proof.path === 'public' + path)?.sha256,
      createHash('sha256').update(bytes).digest('hex'))
    if (contentType === 'image/avif') assert.equal(bytes.subarray(4, 12).toString(), 'ftypavif')
    else {
      assert.equal(bytes.subarray(0, 4).toString(), 'RIFF')
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP')
    }
    for (const rejected of [origin + path + '?v=1', origin + path + '/extra', 'https://example.com' + path]) {
      assert.equal(fixture.publicAssets.has(rejected), false)
    }
  }
  const portrait = JSON.parse(await readFile(new URL('data/static-portrait.json', root), 'utf8'))
  const portraitPaths = portrait.variants.map(variant => variant.path)
  assert.deepEqual([...fixture.publicAssets.keys()].sort(),
    [...portraitPaths, ...coastal.map(([path]) => path)].map(path => origin + path).sort())
  for (const [key, html] of markup) {
    const body = html.slice(html.indexOf('<body>'))
    const imagePaths = [...new Set([...body.matchAll(/(?:src|srcSet)="([^"]+)"/g)]
      .flatMap(match => match[1].split(', ').map(value => value.split(' ')[0]))
      .filter(path => !path.startsWith('data:')))]
    assert.deepEqual(imagePaths.sort(), key.endsWith('/full') ? [...portraitPaths].sort() : [])
    for (const path of imagePaths) assert.ok(fixture.publicAssets.has(origin + path))
  }
  const verifier = await readFile(new URL('scripts/verify-client-report-coastal-browser.mjs', root), 'utf8')
  assert.match(verifier, /const publicAsset=fixture\.publicAssets\.get\(address\)/)
  assert.match(verifier, /if\(publicAsset && request\.method\(\)==='GET'\)/)
  assert.match(verifier, /blocked\.push\(\{method:request\.method\(\),url:address\}\)/)
  assert.match(verifier, /return route\.abort\('blockedbyclient'\)/)
})

test('the actual browser route callback serves only exact GET assets and rejects request drift', async () => {
  const verifierUrl = new URL('scripts/verify-client-report-coastal-browser.mjs', root).href
  const verifier = await readFile(new URL(verifierUrl), 'utf8')
  const parsed = ts.createSourceFile(verifierUrl, verifier, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const callbacks = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(parsed) === 'context' && node.expression.name.text === 'route' &&
      node.arguments[0]?.text === '**/*') callbacks.push(node.arguments[1].getText(parsed))
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.equal(callbacks.length, 1)
  // Give the extracted callback its original module URL; its routing logic is unchanged.
  const callbackSource = callbacks[0].replaceAll('import.meta.url', 'verifierUrl')
  const assets = [], blocked = [], sample = syntheticCases()[0]
  const callback = compileFunction('return (' + callbackSource + ')',
    ['fixture', 'origin', 'url', 'assets', 'blocked', 'readFile', 'verifierUrl', 'sample'])(
    fixture, origin, origin + sample.path, assets, blocked, readFile, verifierUrl, sample)
  async function request(method, address) {
    const calls = []
    await callback({
      request: () => ({ method: () => method, url: () => address, isNavigationRequest: () => false }),
      fulfill: options => calls.push({ action: 'fulfill', options }),
      abort: reason => calls.push({ action: 'abort', reason }),
    })
    return calls
  }
  for (const extension of ['avif', 'webp']) {
    const address = origin + '/images/holistic-house/report-lighthouse-coast.' + extension
    assert.deepEqual(await request('GET', address), [{ action: 'fulfill',
      options: { status: 200, ...fixture.publicAssets.get(address) } }])
    assert.equal(assets.at(-1), address)
    for (const [method, rejected] of [['POST', address], ['HEAD', address],
      ['GET', address + '?v=1'], ['GET', address + '/extra'],
      ['GET', address.replace(origin, 'https://example.com')]]) {
      assert.deepEqual(await request(method, rejected), [{ action: 'abort', reason: 'blockedbyclient' }])
      assert.deepEqual(blocked.at(-1), { method, url: rejected })
    }
  }
  assert.deepEqual(await request('GET', origin + '/images/holistic-house/unknown.webp'),
    [{ action: 'abort', reason: 'blockedbyclient' }])
  assert.equal(assets.length, 2)
  assert.equal(blocked.length, 11)
})

test('transpiled fixture dependencies remain an own-property allowlist with no unknown-import fallback', async () => {
  const helper = await readFile(new URL('scripts/helpers/client-report-coastal-fixture.mjs', root), 'utf8')
  const start = helper.indexOf('function transpile(')
  const end = helper.indexOf('\nfunction copy(', start)
  assert.ok(start >= 0 && end > start)
  const transpile = compileFunction('return (' + helper.slice(start, end).trim() + ')',
    ['ts', 'assert', 'runInNewContext'])(ts, assert, runInNewContext)
  const loaded = transpile('known.js', "import { value } from 'known'; export const result = value", { known: { value: 42 } })
  assert.equal(loaded.result, 42)
  for (const dependency of ['./unexpected-import', 'constructor', 'toString']) {
    assert.throws(() => transpile('unknown.js', 'import ' + JSON.stringify(dependency), {}), /unexpected runtime import:/)
  }
})

test('browser execution remains restricted to isolated GitHub-hosted verification', () => {
  const allowed = { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HH_REPORT_QA_ISOLATED: 'true' }
  assert.doesNotThrow(() => requireHosted(allowed))
  for (const key of Object.keys(allowed)) assert.throws(() => requireHosted({ ...allowed, [key]: '' }))
  assert.throws(() => requireHosted({ ...allowed, VERCEL: '1' }))
})
