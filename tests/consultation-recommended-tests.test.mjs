import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getRecommendedTestOptions, MAX_REPORT_RECOMMENDED_TESTS,
  normalizeRecommendedTestKeys, resolveRecommendedTests,
  recommendedTestAbsoluteUrl,
} from '../lib/consultations/recommended-tests.js'
import {
  createPrescription, updatePrescription, getClientPrescription,
} from '../lib/prescriptions/service.js'
import { buildPrescriptionPdf, buildPrescriptionMobilePdf } from '../lib/prescriptions/pdf.js'

function fixture(recommendedTestKeys) {
  return {
    patientName: 'Synthetic Test Client',
    practitionerName: 'Synthetic Practitioner',
    languagePreference: 'en',
    recommendationType: 'bach',
    dateIssued: '2026-10-18',
    status: 'active',
    items: [{ itemType: 'bach', displayNameOverride: 'Test essence' }],
    ...(recommendedTestKeys !== undefined ? { recommendedTestKeys } : {}),
  }
}

test('recommendable tests come only from the real, launchable and licensed guest catalog', () => {
  const en = getRecommendedTestOptions('en')
  const ru = getRecommendedTestOptions('ru')
  assert.ok(en.length > 0)
  assert.equal(en.length, ru.length)
  const enKeys = en.map(test => test.key)
  assert.equal(new Set(enKeys).size, enKeys.length)
  assert.ok(en.every(item => item.title && item.key && item.href.startsWith('/')))
  for (const item of en) {
    assert.ok(['ru', 'en'].includes(item.startLocale))
    assert.equal(item.href, `/${item.startLocale}/client?startTests=${encodeURIComponent(item.key)}`)
    assert.ok(Number.isInteger(item.questionCount) && item.questionCount > 0, item.key + ': actual questions')
    assert.ok(Number.isFinite(item.durationMinutes) && item.durationMinutes > 0, item.key + ': catalogue time estimate')
    assert.ok(['professional', 'monitoring', 'hobby'].includes(item.testKind), item.key + ': catalogue kind')
  }
  for (const item of ru) {
    assert.ok(Number.isInteger(item.questionCount) && item.questionCount > 0, item.key)
    assert.ok(Number.isFinite(item.durationMinutes) && item.durationMinutes > 0, item.key)
    assert.ok(['professional', 'monitoring', 'hobby'].includes(item.testKind), item.key)
  }
})

test('server refuses nonexistent, restricted or malformed suggestions', () => {
  const first = getRecommendedTestOptions('en')[0]
  assert.deepEqual(normalizeRecommendedTestKeys([first.key, first.key]), [first.key])
  assert.throws(() => normalizeRecommendedTestKeys(['nonexistent-clinical-instrument']), /unavailable/)
  assert.throws(() => normalizeRecommendedTestKeys([{ key: first.key }]), /unavailable/)
  assert.throws(() => normalizeRecommendedTestKeys('hh-current-state'), /Invalid/)
  assert.throws(() => normalizeRecommendedTestKeys(Array(MAX_REPORT_RECOMMENDED_TESTS + 1).fill(first.key)), /Invalid/)
  assert.deepEqual(normalizeRecommendedTestKeys(), [])
})

test('selected test survives create/edit, client projection and intentional removal', () => {
  const first = getRecommendedTestOptions('en')[0]
  const saved = createPrescription(fixture([first.key]))
  assert.deepEqual(saved.recommendedTestKeys, [first.key])
  const projection = getClientPrescription(saved, 'en')
  assert.equal(projection.recommendedTests.length, 1)
  assert.equal(projection.recommendedTests[0].href, first.href)

  const reopened = updatePrescription(saved, fixture())
  assert.deepEqual(reopened.recommendedTestKeys, [first.key], 'legacy editors must preserve saved test choices')
  const removed = updatePrescription(reopened, fixture([]))
  assert.deepEqual(removed.recommendedTestKeys, [], 'explicit empty choice clears recommendations')
  assert.deepEqual(resolveRecommendedTests({}), [])
  assert.deepEqual(resolveRecommendedTests({ recommendedTestKeys: ['unavailable-key'] }), [])
})

test('both PDFs carry visible recommended-test titles and external clickable links', () => {
  const first = getRecommendedTestOptions('en')[0]
  const projected = getClientPrescription(createPrescription(fixture([first.key])), 'en')
  const url = recommendedTestAbsoluteUrl(first, 'https://holistichouse.vercel.app')
  for (const build of [buildPrescriptionPdf, buildPrescriptionMobilePdf]) {
    const bytes = build(projected, 'en', 'https://holistichouse.vercel.app')
    const binary = Buffer.from(bytes).toString('latin1')
    assert.ok(binary.includes('/Subtype /Link'))
    assert.ok(binary.includes(url), 'clickable target must use public test-launch route')
    assert.ok(binary.includes('/URI'))
  }
})

test('owner form, both save paths and HTML report are wired to the same test selection', () => {
  const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
  assert.match(read('components/consultation-form.jsx'), /name="recommendedTestsJson"/)
  assert.match(read('components/consultation-form.jsx'), /ConsultationRecommendedTests/)
  assert.match(read('app/admin/consultations/actions.js'), /data\.recommendedTestKeys = JSON\.parse\(testsJson\)/)
  assert.match(read('app/admin/api/consultations/preview/route.js'), /input\.recommendedTestKeys = JSON\.parse\(testsJson\)/)
  assert.match(read('lib/consultations/service.js'), /recommendedTestKeys: input\.recommendedTestKeys/)
  assert.match(read('components/prescription-document.jsx'), /canonical-recommended-tests/)
  assert.match(read('components/client-session-page.jsx'), /session-recommended-tests/)
})

test('client session recommended cards show real questions, minutes and type, including on phones', () => {
  const page = readFileSync(new URL('../components/client-session-page.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../components/client-session.module.css', import.meta.url), 'utf8')
  assert.match(page, /test\.questionCount/)
  assert.match(page, /test\.durationMinutes/)
  assert.match(page, /test\.testKind==='professional'\?'Pro'/)
  assert.match(page, /Опросник/)
  assert.match(css, /\.reportRecommendedTestFacts\{/)
  assert.match(css, /flex-wrap:wrap/)
  assert.match(css, /@media\(max-width:380px\)/)
})
