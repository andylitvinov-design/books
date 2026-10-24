import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildOporaBrowserFixture, oporaFixturePath, oporaFixtureDocument,
  oporaFixtureBundlePath, requireHostedOporaBrowser, assertFixtureCompilation } from '../scripts/opora-as56-browser-fixture.mjs'
import { OPORA_BROWSER_FRESH_EDITION, OPORA_BROWSER_DAY5_COPY } from '../scripts/fixtures/opora-as59-day5-copy.mjs'
import { oporaAs59Day, OPORA_SEVEN_SKILLS_EDITION } from '../lib/inner-growth/opora-as59-seven-skills.js'
import { oporaAs58Day } from '../lib/inner-growth/opora-as58-one-action.js'
import { oporaExperienceGuide, oporaExperienceSupport } from '../lib/inner-growth/opora-as56-experience-guides.js'
import { lessonFor } from '../lib/inner-growth/lesson-library.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { mount, nodes, textOf } from './helpers/route-pipeline-harness.mjs'
import { advanceOporaTo } from './helpers/opora-gentle-navigation.mjs'

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
  for (const fragment of ["['ru', 'en', 'es']", '[320, 360, 390, 430]', '[false, true]', "serviceWorkers: 'block'",
    "route.abort('blockedbyclient')", 'assert.equal(state.saves, 0', 'assert.deepEqual(unexpectedRequests, []',
    'assert.equal(state.finalData, state.initialData', 'await click(t.previous)', 'await click(t.neutral)',
    "await page.keyboard.press('Escape')", 'assert.equal(evidence.cases.length, 24)']) assert.ok(browser.includes(fragment), fragment)
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

test('OPORA fixture compilation still fails on every build error or warning', () => {
  for (const [errors,warnings] of [[true,false],[false,true],[true,true]]) {
    assert.throws(() => assertFixtureCompilation({hasErrors:()=>errors,hasWarnings:()=>warnings,
      toString:()=>warnings?'Asset size warning':'Compilation error'}), /warning|error/)
  }
  assert.doesNotThrow(() => assertFixtureCompilation({hasErrors:()=>false,hasWarnings:()=>false}))
})

test('fresh AS5.9 browser copy pins exact Day5 fields, not the archived exercise', async () => {
  assert.equal(OPORA_BROWSER_FRESH_EDITION, 'as-5.9-seven-skills-v1')
  assert.equal(OPORA_BROWSER_FRESH_EDITION, OPORA_SEVEN_SKILLS_EDITION)
  assert.deepEqual(Object.keys(OPORA_BROWSER_DAY5_COPY), ['ru', 'en', 'es'])
  for (const locale of ['ru', 'en', 'es']) {
    const copy = OPORA_BROWSER_DAY5_COPY[locale], day = oporaAs59Day(5, locale)
    assert.deepEqual(copy, { supportTitle: day.purposeTitle, purpose: day.purpose, practice: day.practice })
    assert.notEqual(copy.practice, oporaAs58Day(5, locale).practice)
    assert.notEqual(copy.practice, oporaExperienceGuide(5, locale))
    assert.notEqual(copy.purpose, oporaExperienceSupport(5, locale).body)
    assert.ok(copy.practice.length <= 140 && copy.practice.split(/\s+/u).length <= 20)
  }
  const browser = await read('scripts/verify-opora-as56-browser.mjs')
  for (const binding of [
    "copy = OPORA_BROWSER_DAY5_COPY[locale], brief = copy.practice",
    "assert.equal(data.currentSession, null",
    "toHaveAttribute('data-opora-practical-skills-version', OPORA_BROWSER_FRESH_EDITION)",
    "[data-opora-daily-support=\"5\"]')).toHaveText(copy.purpose)",
    "name: copy.supportTitle, exact: true",
    "[data-opora-overview-purpose] p')).toHaveText(copy.purpose)",
    "[data-opora-one-daily-practice=\"5\"]')).toBeVisible()",
    "[data-opora-one-daily-practice=\"5\"]')).toHaveText(brief)",
    String.raw`assert.ok((brief.replace(/…/gu, '').match(/[.!?]/gu) || []).length <= 1)`,
    String.raw`assert.ok(brief.length <= 140 && brief.split(/\s+/u).length <= 20)`,
  ]) assert.ok(browser.includes(binding), binding)
})

test('fresh AS5.9 Day5 renders the pinned support, overview and practice without writes', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const copy = OPORA_BROWSER_DAY5_COPY[locale]
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' }, currentSession: null,
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    const next = { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale]
    try {
      assert.ok(nodes(h.tree).some(n => n.props?.['data-opora-practical-skills-version'] === OPORA_BROWSER_FRESH_EDITION))
      await advanceOporaTo(h, 'support', next)
      assert.equal(textOf(nodes(h.tree).find(n => n.props?.['data-opora-daily-support'] === 5)), copy.purpose)
      assert.ok(nodes(h.tree).some(n => /^h[1-6]$/.test(n.type) && textOf(n) === copy.supportTitle))
      await advanceOporaTo(h, 'recapPractice', next)
      const purpose = nodes(h.tree).find(n => n.props?.['data-opora-overview-purpose'])
      assert.equal(textOf(nodes(purpose).find(n => n.type === 'p')), copy.purpose)
      await advanceOporaTo(h, 'practice', next)
      const practice = nodes(h.tree).find(n => n.props?.['data-opora-one-daily-practice'] === 5)
      assert.equal(textOf(practice.props.children[0]), copy.practice)
      assert.ok(!textOf(h.tree).includes(oporaAs58Day(5, locale).practice))
      assert.equal(saves, 0)
      assert.deepEqual(data, original)
    } finally { h.unmount() }
  }
})

test('saved AS5.8 Day5 retains its original practice and never adopts fresh browser copy', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' },
      currentSession: { signals: { opora54: { answers: { experienceEdition: 'as-5.8-one-action-v1' } } } },
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, reviewOnly: true, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    try {
      await advanceOporaTo(h, 'practice', { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale])
      const practice = nodes(h.tree).find(n => n.props?.['data-opora-one-daily-practice'] === 5)
      assert.equal(textOf(practice.props.children[0]), oporaAs58Day(5, locale).practice)
      assert.ok(!nodes(h.tree).some(n => n.props?.['data-opora-practical-skills-version']))
      assert.ok(!textOf(h.tree).includes(OPORA_BROWSER_DAY5_COPY[locale].practice))
      assert.equal(saves, 0)
      assert.deepEqual(data, original)
    } finally { h.unmount() }
  }
})
