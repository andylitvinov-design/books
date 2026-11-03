import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  assertHostedBachAcceptance, bachFixtureOrigin, bachFixturePath, bachFixtureScope, bachViewports,
  buildBachPersonalReportFixture, createBachFixtures, scopeBachCss,
} from '../scripts/helpers/bach-personal-report-fixture.mjs'
import { assertBachGeometry } from '../scripts/helpers/bach-report-geometry.mjs'
import { rankBachDimensions } from '../lib/assessments/bach-profile.js'

const fixtures = createBachFixtures()
const rendered = buildBachPersonalReportFixture()
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[character])

test('matrix covers both saved versions, both instrument/display languages, all requested patterns and widths', () => {
  assert.equal(fixtures.length, 24)
  assert.equal(new Set(fixtures.map(fixture => fixture.path)).size, 24)
  assert.deepEqual(bachViewports, [320, 390, 1280])
  assert.equal(fixtures.length * bachViewports.length, 72)
  assert.equal(bachFixtureOrigin, 'http://127.0.0.1:3100')
  assert.match(bachFixtureScope, /NOT_AUTHENTICATED_CABINET$/)
  for (const fixture of fixtures) {
    assert.equal(fixture.path, bachFixturePath(fixture))
    const ranked = rankBachDimensions(fixture.result.dimensions)
    assert.deepEqual(fixture.report.sections.map(section => section.key), ranked.map(dimension => dimension.key))
    assert.deepEqual(fixture.report.sections.map(({ value, min, max }) => ({ value, min, max })), ranked.map(({ value, min, max }) => ({ value, min, max })))
    assert.equal(fixture.report.highlightedCount, fixture.pattern === 'zero' ? 0 : 7)
    if (fixture.pattern === 'zero') assert.ok(ranked.every(dimension => dimension.value === 0))
    if (fixture.pattern === 'maximum') assert.ok(ranked.every(dimension => dimension.value === dimension.max))
    if (fixture.pattern === 'mixed') {
      assert.ok(new Set(ranked.map(dimension => dimension.value)).size > 7)
      assert.ok(ranked.some(dimension => !Number.isInteger(dimension.value)), 'Retain fractional weighted matches')
      assert.ok(ranked.some(dimension => dimension.value > 0 && dimension.value < dimension.max))
    }
  }
})

test('screenshot sampling stays bounded without dropping geometry cases', async () => {
  const source = await read('scripts/verify-bach-personal-report-browser.mjs')
  assert.match(source, /const screenshotSample = value\.instrumentLocale === value\.locale && \(value\.pattern === 'mixed' \|\| width === 320\)/)
  const cells = fixtures.flatMap(value => bachViewports.map(width => ({ ...value, width })))
  const selected = cells.filter(value => value.instrumentLocale === value.locale && (value.pattern === 'mixed' || value.width === 320))
  assert.equal(cells.length, 72)
  assert.equal(selected.length, 20)
  assert.doesNotMatch(source, /fullPage:\s*true/)
  assert.match(source, /closed-first-theme\.png/)
  assert.match(source, /open-longest-title\.png/)
  assert.match(source, /open-last-theme\.png/)
})

test('fixture path rejects unsupported values and path injection', () => {
  for (const field of ['version', 'instrumentLocale', 'locale', 'pattern']) {
    for (const value of [undefined, 'unknown', '../app', '<script>']) assert.throws(() => bachFixturePath({ ...fixtures[0], [field]: value }))
  }
})

for (const fixture of fixtures) test(`actual report SSR preserves every full label, value, bound, warning and source: ${fixture.path}`, async () => {
  const builder = await rendered
  const before = JSON.stringify(fixture.result)
  const html = builder.document(fixture)
  assert.equal(JSON.stringify(fixture.result), before)
  assert.match(html, new RegExp(`<html lang="${fixture.locale}">`))
  assert.match(html, /<main class="hh-app"><article class="hh-result-page"><section class="bach_fixture_report"/)
  assert.match(html, /data-personal-result-report="true" data-bach-profile="true"/)
  assert.equal((html.match(/<article class="bach_fixture_card">/g) || []).length, 38)
  assert.equal((html.match(/<details class="bach_fixture_more">/g) || []).length, 1)
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/)
  assert.doesNotMatch(html, /<script[\s>]/i)
  const detailsStart = html.indexOf('<details class="bach_fixture_more">')
  assert.equal((html.slice(0, detailsStart).match(/<article class="bach_fixture_card">/g) || []).length, fixture.report.highlightedCount)
  assert.equal((html.slice(detailsStart).match(/<article class="bach_fixture_card">/g) || []).length, 38 - fixture.report.highlightedCount)
  for (const section of fixture.report.sections) {
    assert.ok(html.includes(`<h3>${escape(section.title)}</h3>`), section.title)
    assert.ok(html.includes(`<p class="bach_fixture_construct">${escape(section.construct)}</p>`))
    const score = `${fixture.locale === 'ru' ? 'Вес совпадений' : 'Weighted match'}: ${section.value} (${fixture.locale === 'ru' ? 'диапазон' : 'range'} ${section.min}–${section.max})`
    assert.ok(html.includes(`<p class="bach_fixture_score">${escape(score)}</p>`), score)
    for (const expected of [section.meaning, ...section.steps, ...section.limitations, section.followUp].filter(Boolean)) assert.ok(html.includes(escape(expected)), expected)
  }
  assert.equal((html.match(new RegExp('href="' + escape(fixture.report.source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g')) || []).length, 39)
  for (const expected of [fixture.report.purpose, fixture.report.scaleNote, fixture.report.methodology, fixture.report.note, fixture.report.seekSupport].filter(Boolean)) assert.ok(html.includes(escape(expected)), expected)
})

test('source proof hashes actual report, guidance, both definitions and exact inherited styles', async () => {
  const builder = await rendered
  const paths = builder.sourceProof.map(item => item.path)
  for (const expected of ['components/app/personal-result-report.jsx', 'components/app/personal-result-report.module.css',
    'lib/assessments/bach-guidance.js', 'lib/assessments/bach-profile.js', 'data/assessments/bach-flower-v1.js',
    'data/assessments/bach-flower-v2.js', 'app/globals.css', 'app/[locale]/app/[[...path]]/workspace.css',
    'app/[locale]/app/[[...path]]/assessment-dashboard.css']) assert.ok(paths.includes(expected), expected)
  for (const item of builder.sourceProof) assert.equal(item.sha256, createHash('sha256').update(await read(item.path)).digest('hex'))
})

test('CSS scoping changes class selectors only; it preserves decimals, dimensions and responsive declarations', () => {
  const original = '.cardHead > div{min-width:auto;opacity:.12;background:url("./image.png")}@media(max-width:560px){.card h3{font-size:22px}}'
  const scoped = scopeBachCss(original)
  assert.equal(scoped.css, '.bach_fixture_cardHead > div{min-width:auto;opacity:.12;background:url("./image.png")}@media(max-width:560px){.bach_fixture_card h3{font-size:22px}}')
  assert.equal(scoped.styles.cardHead, 'bach_fixture_cardHead')
  assert.equal(scoped.styles.card, 'bach_fixture_card')
})

test('browser launch guard fails closed for local, self-hosted, deployed and non-isolated environments', () => {
  const approved = { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HH_APP_TEST_RUNTIME: 'isolated' }
  assert.doesNotThrow(() => assertHostedBachAcceptance(approved))
  assert.throws(() => assertHostedBachAcceptance({}))
  for (const key of Object.keys(approved)) {
    assert.throws(() => assertHostedBachAcceptance({ ...approved, [key]: undefined }))
    assert.throws(() => assertHostedBachAcceptance({ ...approved, [key]: 'false' }))
  }
  assert.throws(() => assertHostedBachAcceptance({ ...approved, RUNNER_ENVIRONMENT: 'self-hosted' }))
  assert.throws(() => assertHostedBachAcceptance({ ...approved, VERCEL: '1' }))
})

const rect = (left = 10, right = 290, top = 0, bottom = 30) => ({ left, right, top, bottom, width: right - left, height: bottom - top })
const geometry = () => ({ viewportWidth: 320, documentWidth: 320, bodyWidth: 320, report: rect(0, 320), articles: [],
  elements: [{ label: 'h3.full-title', rect: rect(), clientWidth: 280, scrollWidth: 280, clientHeight: 30, scrollHeight: 30, overflowY: 'visible' }],
  textFragments: [{ parent: 'h3.full-title', rect: rect(), parentRect: rect(), clippers: [] }] })

test('geometry rejects real document overflow, overflowing child text and clipped content', () => {
  assert.doesNotThrow(() => assertBachGeometry(geometry()))
  const document = geometry(); document.documentWidth = 322
  assert.throws(() => assertBachGeometry(document), /document horizontal overflow/)
  const child = geometry(); child.elements[0].rect = rect(10, 330)
  assert.throws(() => assertBachGeometry(child), /outside viewport/)
  const overflow = geometry(); overflow.elements[0].scrollWidth = 290
  assert.throws(() => assertBachGeometry(overflow), /content overflows width/)
  const hidden = geometry(); hidden.elements[0].overflowY = 'hidden'; hidden.elements[0].scrollHeight = 60
  assert.throws(() => assertBachGeometry(hidden), /vertically clipped/)
  const text = geometry(); text.textFragments[0].rect = rect(10, 300)
  assert.throws(() => assertBachGeometry(text), /text exceeds its own element/)
  const invisible = geometry(); invisible.articles = [{ title: 'Required title', requiredParts: [{ selector: '.bach_fixture_score', visible: false, rect: rect() }] }]
  assert.throws(() => assertBachGeometry(invisible), /required card content hidden/)
  const zeroSize = geometry(); zeroSize.articles = [{ title: 'Required title', requiredParts: [{ selector: 'h3', visible: true, rect: rect(0, 0) }] }]
  assert.throws(() => assertBachGeometry(zeroSize), /required card content hidden/)
  const tallTitle = geometry(); tallTitle.textFragments[0].constrainedBlock = true; tallTitle.textFragments[0].rect = rect(10, 290, 0, 60)
  assert.throws(() => assertBachGeometry(tallTitle), /label text exceeds its own height/)
  const overlap = geometry(); overlap.articles = [{ title: 'Wrapped title', requiredParts: [
    { selector: 'h3', visible: true, rect: rect(10, 290, 0, 60) },
    { selector: '.bach_fixture_construct', visible: true, rect: rect(10, 290, 30, 50) },
  ] }]
  assert.throws(() => assertBachGeometry(overlap), /required labels overlap/)
  const clipping = geometry(); clipping.textFragments[0].clippers = [{ rect: rect(0, 320, 0, 15), x: false, y: true }]
  assert.throws(() => assertBachGeometry(clipping), /clipped text/)
})

test('hosted verifier aborts every unrecognized request, retains evidence and checks keyboard repeatedly', async () => {
  const source = await read('scripts/verify-bach-personal-report-browser.mjs')
  assert.ok(source.indexOf('assertHostedBachAcceptance(process.env)') < source.indexOf('await engine.launch()'))
  assert.match(source, /serviceWorkers: 'block'/)
  assert.match(source, /return route\.abort\('blockedbyclient'\)/)
  assert.doesNotMatch(source, /route\.continue\(|context\.request|page\.request|\.click\(/)
  assert.match(source, /script-src 'none'; connect-src 'none'; form-action 'none'/)
  assert.match(source, /page\.evaluate\(collectBachGeometry\)/)
  assert.match(source, /assertBachGeometry\(geometry/)
  for (const key of ['Tab', 'Enter', 'Space']) assert.ok(source.includes(`page.keyboard.press('${key}')`))
  assert.match(source, /toHaveCount\(38\)/)
  assert.match(source, /evidence\.cases\.length, evidence\.expectedCases/)
  assert.match(source, /verification\.json/)
  assert.match(source, /failure\.png/)
})
