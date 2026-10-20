import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'

const section = (key, options = {}) => ({
  key, construct: key, band: 'Descriptive band', value: 6, min: 0, max: 10,
  meaning: 'This is a measured observation.', steps: ['Try a gentle check-in.'],
  ...options,
})

test('source-based overview previews real measures without calculating invented health percentages', () => {
  const report = { purpose: 'This measures self-reported state.', sections: [
    section('first'), section('second'), section('third'), section('fourth'),
  ] }
  const result = { measurementAt: '2026-10-15T16:00:00.000Z' }
  const overview = assessmentResultOverview(report, result, 'en')
  assert.equal(overview.purpose, report.purpose)
  assert.deepEqual(overview.preview.map(item => item.key), ['first', 'second', 'third'])
  assert.equal(overview.additionalCount, 1)
  assert.equal(overview.preview[0].score, '6 / 0–10')
  assert.equal(overview.measurementDateIso, result.measurementAt)
  assert.equal(overview.reviewNote, null)
  assert.ok(!JSON.stringify(overview).includes('health percentage'))
})

test('existing professional follow-up notice is not buried in a long report or rewritten', () => {
  const followUp = 'Discuss symptoms and their everyday impact with a qualified professional; no diagnosis.'
  const report = { sections: [
    section('neutral-trait'), section('resource'), section('sleep'),
    section('screen', { band: 'Published screening', recommendedReview: true, followUp }),
  ] }
  const overview = assessmentResultOverview(report, null, 'ru')
  assert.equal(overview.preview[0].key, 'screen')
  assert.equal(overview.preview[0].needsReview, true)
  assert.equal(overview.reviewNote, followUp)
  assert.equal(overview.additionalCount, 1)
  assert.equal(overview.measurementDateLabel, null)
})

test('missing, malformed, outside-range scores and dates do not produce fabricated values', () => {
  const overview = assessmentResultOverview({
    intro: 'No interpretation until compatible data are present.',
    sections: [
      section('bad', { value: null }),
      section('outside', { value: 12 }),
      section('non-numeric', { value: 'high' }),
      section('ok', { value: 0 }),
    ],
  }, { measurementAt: 'bad-date' })
  // Valid zero is a real measurement and ranks ahead of unavailable scores.
  const byKey = new Map(overview.preview.map(item => [item.key, item]))
  assert.equal(overview.initialIndex, 3)
  assert.equal(overview.preview[0].key, 'ok')
  assert.equal(byKey.get('ok').score, '0 / 0–10')
  for (const invalid of [section('bad', { value: null }), section('outside', { value: 12 }), section('non-numeric', { value: 'high' })]) {
    // Inspect every invalid case, including the one beyond the three-row preview.
    const single = assessmentResultOverview({ sections: [invalid] }, null).preview
    assert.equal(single[0].key, invalid.key)
    assert.equal(single[0].score, null)
    if (byKey.has(invalid.key)) assert.equal(byKey.get(invalid.key).score, null)
  }
  assert.equal(overview.additionalCount, 1)
  assert.equal(overview.measurementDateLabel, null)
  assert.match(overview.purpose, /compatible data/)
  assert.deepEqual(assessmentResultOverview(null, null).preview, [])
})

test('result page offers a real per-scale selector instead of a duplicated preview', () => {
  const jsx = readFileSync(new URL('../components/app/compact-assessment-report.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../components/app/compact-assessment-report.module.css', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const banner = readFileSync(new URL('../components/app/free-course-banner.jsx', import.meta.url), 'utf8')

  assert.match(jsx, /useState\(/)
  assert.match(jsx, /data-assessment-scales/)
  assert.match(jsx, /data-assessment-scale-picker/)
  assert.match(jsx, /sections\.map\(\(item, index\)/)
  assert.match(jsx, /aria-pressed=\{selectedIndex === index\}/)
  assert.match(jsx, /onClick=\{\(\) => setActiveIndex\(index\)\}/)
  assert.match(jsx, /data-active-scale=\{section\.key\}/)
  assert.match(jsx, /<select value=\{selectedIndex\}/)
  assert.doesNotMatch(jsx, /overview\.preview\.map|overviewGrid|See every measure/)
  assert.match(jsx, /overview\.initialIndex/)
  assert.match(jsx, /<ScoreGauge dimension=\{dimension\}/)

  // One source-derived primary suggestion; complete original guidance stays accessible.
  assert.match(jsx, /data-primary-support/)
  assert.match(jsx, /section\.recommendedReview && section\.followUp/)
  assert.match(jsx, /section\.meaning && section\.meaning !== conciseMeaning/)
  assert.match(jsx, /section\.source/)
  assert.match(jsx, /report\.instrumentText\.requiredSiteAttribution/)
  assert.match(jsx, /report\.methodology/)
  assert.match(jsx, /More about this scale/)
  assert.match(jsx, /<FreeCourseBanner locale=\{locale\} compact\/>/)

  assert.match(css, /\.scaleTabs\{/)
  assert.match(css, /\.scaleTab\[aria-pressed=true\]/)
  assert.match(css, /@media\(max-width:570px\)/)
  assert.match(page, /<PersonalResultReport result=\{result\}/)
  assert.doesNotMatch(page, /Your score and two practical next steps for this week\./)
  assert.match(banner, /compact = false/)
  assert.match(banner, /!compact && <p className=\{styles\.intro\}>/)
})
