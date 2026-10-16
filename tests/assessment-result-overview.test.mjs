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
  assert.deepEqual(overview.preview.map(item => item.score), [null, null, null])
  assert.equal(overview.additionalCount, 1)
  assert.equal(overview.measurementDateLabel, null)
  assert.match(overview.purpose, /compatible data/)
  assert.deepEqual(assessmentResultOverview(null, null).preview, [])
})

test('compact report preserves every measured card, details, source and approved step copy', () => {
  const jsx = readFileSync(new URL('../components/app/compact-assessment-report.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../components/app/compact-assessment-report.module.css', import.meta.url), 'utf8')
  assert.match(jsx, /assessmentResultOverview\(report, result, locale\)/)
  assert.match(jsx, /data-assessment-overview/)
  assert.match(jsx, /overview\.preview\.map/)
  assert.match(jsx, /data-assessment-scales/)
  assert.match(jsx, /report\.sections\.map\(/)
  assert.match(jsx, /section\.steps\.slice\(0, 2\)/)
  assert.match(jsx, /More about this score & sources/)
  assert.match(jsx, /section\.source/)
  assert.match(jsx, /<ScoreGauge dimension=\{dimension\}/)
  assert.match(jsx, /<FreeCourseBanner locale=\{locale\}\/>/)
  assert.match(css, /\.overview\{/)
  assert.match(css, /\.overviewLink/)
  assert.match(css, /@media\(max-width:570px\)/)
})
