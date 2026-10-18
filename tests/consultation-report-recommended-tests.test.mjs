import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getReportTestOptions, normalizeReportTestKeys, recommendedTestsForReport,
} from '../lib/assessments/report-recommended-tests.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('master report only offers real, guest-startable, rights-cleared tests by catalog key', () => {
  const options = getReportTestOptions()
  assert.ok(options.length > 0, 'At least one real questionnaire is available')
  assert.equal(new Set(options.map(item => item.key)).size, options.length)
  const eligible = new Set(['en', 'ru'].flatMap(locale =>
    buildExplorerEntries({ locale, audience: 'guest' })
      .filter(item => item.selectable && item.startable && item.guestEligible &&
        item.rightsStatus === 'cleared' && item.definition)
      .map(item => item.key)))
  for (const option of options) {
    assert.ok(eligible.has(option.key), 'Option must be an eligible public test')
    assert.equal(typeof option.title.en, 'string')
    assert.ok(option.title.en.trim())
    assert.ok(option.availableLocales.length >= 1)
    assert.ok(option.availableLocales.every(locale => locale === 'en' || locale === 'ru'))
  }
})

test('recommended test keys are pinned, unique and limited to 12', () => {
  const options = getReportTestOptions()
  const first = options[0].key
  assert.deepEqual(normalizeReportTestKeys(undefined), [])
  assert.deepEqual(normalizeReportTestKeys([first]), [first])
  assert.throws(() => normalizeReportTestKeys([first, first]), /Invalid recommended tests/)
  assert.throws(() => normalizeReportTestKeys(['unknown-id']), /Invalid recommended tests/)
  assert.throws(() => normalizeReportTestKeys(['/client?startTests=' + first]), /Invalid recommended tests/)
  assert.throws(() => normalizeReportTestKeys('hh-current-state'), /Invalid recommended tests/)
  assert.throws(() => normalizeReportTestKeys([null]), /Invalid recommended tests/)
  assert.throws(() => normalizeReportTestKeys(Array(13).fill(first)), /Invalid recommended tests/)
})

test('client links launch real guest selection without identity, results or responses in URL', () => {
  const first = getReportTestOptions()[0]
  for (const locale of ['en', 'ru']) {
    const result = recommendedTestsForReport([first.key, first.key, 'unknown'], locale)
    assert.equal(result.length, 1)
    assert.equal(result[0].key, first.key)
    assert.ok(result[0].title)
    assert.ok(first.availableLocales.includes(result[0].testLocale))
    assert.equal(result[0].href, '/' + result[0].testLocale + '/client?startTests=' + encodeURIComponent(first.key))
    assert.doesNotMatch(result[0].href, /clientId|token|answer|email|result=/i)
  }
  assert.deepEqual(recommendedTestsForReport(undefined, 'en'), [])
})

test('new and edited master reports include picker, stable key persistence and draft preview', () => {
  const form = source('components/consultation-form.jsx')
  const actions = source('app/admin/consultations/actions.js')
  const preview = source('app/admin/api/consultations/preview/route.js')
  const consultation = source('lib/consultations/service.js')
  const model = source('lib/prescriptions/service.js')
  const newPage = source('app/admin/consultations/new/page.js')
  const editPage = source('app/admin/consultations/[id]/edit/page.js')
  const picker = source('components/report-test-picker.jsx')
  const legacy = source('components/prescription-form.jsx')
  const legacyNew = source('app/admin/prescriptions/new/page.js')
  const legacyEdit = source('app/admin/prescriptions/[id]/page.js')
  const legacyAction = source('app/admin/prescriptions/actions.js')
  assert.match(form, /<ReportTestPicker options=\{testOptions\}/)
  assert.match(form, /name="recommendedTestKeysJson"/)
  assert.match(form, /consultation\?\.recommendedTestKeys/)
  assert.match(newPage, /testOptions=\{getReportTestOptions\(\)\}/)
  assert.match(editPage, /testOptions=\{getReportTestOptions\(\)\}/)
  assert.match(actions, /data\.recommendedTestKeys = JSON\.parse/)
  assert.match(preview, /input\.recommendedTestKeys = JSON\.parse/)
  assert.match(consultation, /recommendedTestKeys: input\.recommendedTestKeys/)
  assert.match(model, /normalizeReportTestKeys\(input\.recommendedTestKeys\)/)
  assert.match(model, /existing\.recommendedTestKeys/)
  assert.match(model, /recommendedTestKeys: Array\.isArray\(record\.recommendedTestKeys\)/)
  assert.match(picker, /type="search"/)
  assert.match(picker, /type="checkbox"/)
  assert.match(legacy, /<ReportTestPicker options=\{testOptions\}/)
  assert.match(legacy, /name="recommendedTestKeysJson"/)
  assert.match(legacyNew, /testOptions=\{getReportTestOptions\(\)\}/)
  assert.match(legacyEdit, /testOptions=\{getReportTestOptions\(\)\}/)
  assert.match(legacyAction, /recommendedTestKeys = JSON\.parse/)
})

test('client HTML and standard/mobile PDFs include recommended tests only when selected', () => {
  const html = source('components/prescription-document.jsx')
  const pdf = source('lib/prescriptions/pdf.js')
  const styles = source('components/consultation-report.css')
  assert.match(html, /recommendedTests\.length > 0/)
  assert.match(html, /<Link href=\{test\.href\}/)
  assert.ok(html.indexOf('recommendedTests.length > 0') < html.indexOf('<DocumentSignature'))
  assert.match(pdf, /payment \? \[\] : recommendedTestsForReport/)
  assert.match(pdf, /if \(recommendedTests\.length\)/)
  assert.match(pdf, /if\(recommendedTests\.length\)/)
  assert.match(pdf, /new URL\(test\.href, ?origin/)
  assert.match(pdf, /page\.links\.push\(\{url:link/)
  assert.match(styles, /\.consultation-report-test-picker/)
  assert.match(styles, /\.canonical-recommended-tests/)
})
