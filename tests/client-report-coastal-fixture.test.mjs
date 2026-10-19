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
  assert.equal(fixture.publicAssets.size, portrait.variants.length)
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
