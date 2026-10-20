import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildOporaBrowserFixture, oporaFixturePath, oporaFixtureDocument,
  oporaFixtureBundlePath, requireHostedOporaBrowser } from '../scripts/opora-as56-browser-fixture.mjs'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
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
