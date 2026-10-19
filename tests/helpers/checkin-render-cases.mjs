import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { componentLoader, uiRoot, modelRoot } from './checkin-render-loader.mjs'

const fromModel = path => import(pathToFileURL(resolve(modelRoot, path)))
const { HH_CORE_CHECKIN_DEFINITIONS: candidates } = await fromModel('data/assessments/hh-core-checkins-v3.js')
const { getAssessmentDefinition } = await fromModel('lib/assessments/definitions.js')
const { scoreAssessment } = await fromModel('lib/assessments/scoring.js')
const { gaugeModel } = await fromModel('lib/assessments/dashboard-gauges.js')
const { buildAssessmentResultReport } = await fromModel('lib/assessments/result-report.js')
const load = componentLoader()
const { PersonalResultReport } = load('components/app/personal-result-report.jsx')
const { ScoreGauge } = load('components/app/assessment-gauge.jsx')
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char])
const accountId = '10000000-0000-4000-8000-000000000001'
const resultId = '20000000-0000-4000-8000-000000000002'
function resultFor(definition, distribution = 'mixed') {
  const answers = Object.fromEntries(definition.questions.map((question, index) => {
    const min = question.min ?? definition.answerScale.min
    const max = question.max ?? definition.answerScale.max
    return [question.id, distribution === 'minimum' ? min : distribution === 'maximum' ? max : min + index % (max - min + 1)]
  }))
  return { ...scoreAssessment(definition, answers), accountId, id: resultId, measurementAt: '2026-10-19T12:00:00.000Z' }
}
function assertNoDiagnosticRendering(markup) {
  assert.doesNotMatch(markup, /<svg|<linearGradient|<meter|<progress|%|data-band-code|data-current-band|data-gauge-scale|data-answer-anchor-scale|data-assessment-range-report|data-compact-assessment-report|data-free-course-banner|data-gauge-trend/)
  assert.doesNotMatch(markup, /data-assessment-scale-trigger|aria-pressed|lowest|highest|primary match|leading theme|самый низк|самый высок|Основное совпадение/i)
}
function assertNoSensitiveIdentity(markup, result) {
  for (const value of [result.accountId, result.id, result.contentHash, result.definitionId]) assert.ok(!markup.includes(value), 'Identity must not be in markup: ' + value)
}

for (const definition of candidates) for (const locale of ['en', 'ru']) for (const distribution of ['minimum', 'maximum', 'mixed']) {
  test(`real report preserves ordered raw facets ${definition.key}/${definition.instrumentLocale} viewed ${locale}/${distribution}`, () => {
    const result = resultFor(definition, distribution)
    const before = JSON.stringify(result)
    const report = buildAssessmentResultReport(result, locale)
    assert.equal(report.reportKind, 'checkin-facets')
    assert.equal(report.verified, true)
    const markup = render(PersonalResultReport, { result, locale })
    assert.match(markup, /data-checkin-facet-report/)
    assert.match(markup, /data-checkin-completeness="complete"/)
    assert.ok(markup.includes(`${definition.questions.length} / ${definition.questions.length}`))
    assert.ok(markup.includes(locale === 'ru' ? 'Пропусков: 0' : 'Missing: 0'))
    assert.deepEqual([...markup.matchAll(/data-checkin-facet="([^"]+)"/g)].map(match => match[1]), definition.questions.map(question => question.id))
    assert.deepEqual([...markup.matchAll(/data-checkin-raw-answer="true">([^<]+)<\/strong>/g)].map(match => Number(match[1])), result.dimensions.map(dimension => dimension.value))
    for (const question of definition.questions) {
      assert.ok(markup.includes(escape(question.label)), 'Original label missing')
      assert.ok(markup.includes(escape(question.anchors[0])), 'Minimum anchor missing')
      assert.ok(markup.includes(escape(question.anchors[1])), 'Maximum anchor missing')
    }
    assert.equal(markup.includes('data-checkin-original-language'), definition.instrumentLocale !== locale)
    assert.match(markup, /data-checkin-recall/)
    assert.match(markup, /data-checkin-evidence/)
    assert.ok(markup.includes(escape(report.methodology)))
    assert.ok(markup.includes(escape(report.note)))
    assert.doesNotMatch(markup, /data-active-scale|data-checkin-requested-focus|id="hh-assessment-scale-panel"/)
    assertNoDiagnosticRendering(markup)
    assertNoSensitiveIdentity(markup, result)
    assert.equal(JSON.stringify(result), before)
    for (const dimension of result.dimensions) {
      const model = gaugeModel(dimension, result, locale)
      assert.equal(model.displayKind, 'checkin-observation')
      assert.equal(model.fraction, null)
      assert.deepEqual(model.bands, [])
      const gauge = render(ScoreGauge, { dimension, result, locale })
      assert.ok(gauge.includes(`data-checkin-raw-answer="true">${dimension.value}</strong>`))
      assert.ok(gauge.includes(`${dimension.min}: ${escape(model.anchors[0])}`))
      assert.ok(gauge.includes(`${dimension.max}: ${escape(model.anchors[1])}`))
      if (definition.responseAnchors) {
        assert.equal(model.responseLabel, definition.responseAnchors[dimension.value])
        assert.ok(gauge.includes(escape(model.responseLabel)))
      } else assert.doesNotMatch(gauge, /data-checkin-response-label/)
      assertNoDiagnosticRendering(gauge)
      assertNoSensitiveIdentity(gauge, result)
    }
  })
}

for (const definition of candidates) for (const locale of ['en', 'ru']) {
  test(`explicit focus alone highlights an ordered facet ${definition.key}/${definition.instrumentLocale}/${locale}`, () => {
    const result = resultFor(definition)
    const focusScaleKey = result.dimensions.at(-1).key
    const markup = render(PersonalResultReport, { result, locale, focusScaleKey })
    assert.equal([...markup.matchAll(/data-active-scale=/g)].length, 1)
    assert.equal([...markup.matchAll(/data-checkin-requested-focus=/g)].length, 1)
    assert.ok(markup.includes(`data-active-scale="${focusScaleKey}"`))
    assert.match(markup, /id="hh-assessment-scale-panel"/)
    assert.match(markup, /id="hh-assessment-scales"/)
    assert.deepEqual([...markup.matchAll(/data-checkin-facet="([^"]+)"/g)].map(match => match[1]), definition.questions.map(question => question.id))
    const unknown = render(PersonalResultReport, { result, locale, focusScaleKey: accountId })
    assert.doesNotMatch(unknown, /data-active-scale/)
    assertNoSensitiveIdentity(unknown, result)
  })
  test(`forged exact-source result fails closed ${definition.key}/${definition.instrumentLocale}/${locale}`, () => {
    const original = resultFor(definition)
    for (const result of [
      { ...original, contentHash: 'sha256:forged-source' },
      { ...original, definitionId: '30000000-0000-4000-8000-000000000003' },
      { ...original, dimensions: original.dimensions.slice(1) },
      { ...original, dimensions: [{ ...original.dimensions[0], value: 0.5 }, ...original.dimensions.slice(1)] },
    ]) {
      const markup = render(PersonalResultReport, { result, locale })
      assert.match(markup, /data-unverified-assessment-result/)
      assert.doesNotMatch(markup, /data-checkin-facet-report|data-checkin-raw-answer|data-checkin-facet=|<svg|data-compact-assessment-report/)
      const gauge = render(ScoreGauge, { dimension: result.dimensions[0], result, locale })
      assert.doesNotMatch(gauge, /data-assessment-gauge|<svg|data-checkin-raw-answer/)
      assertNoSensitiveIdentity(markup, result)
    }
  })
}

for (const definition of candidates) test(`check-in display options cannot introduce a dial or trend ${definition.key}/${definition.instrumentLocale}`, () => {
  const result = resultFor(definition)
  const previous = { ...resultFor(definition, 'maximum'), id: '40000000-0000-4000-8000-000000000004', measurementAt: '2026-10-01T12:00:00.000Z' }
  const props = { result, locale: definition.instrumentLocale }
  assert.equal(render(PersonalResultReport, props), render(PersonalResultReport, { ...props, previous }))
  for (const compact of [true, false]) for (const showAnswerAnchors of [true, false]) {
    const markup = render(ScoreGauge, { ...props, dimension: result.dimensions[0], compact, showAnswerAnchors, showLegend: true, showScaleNote: false })
    assert.equal(markup.includes('data-checkin-answer-endpoints'), showAnswerAnchors)
    assertNoDiagnosticRendering(markup)
    assertNoSensitiveIdentity(markup, result)
  }
})

const personalPath = 'components/app/personal-result-report.jsx'
const gaugePath = 'components/app/assessment-gauge.jsx'
const personalSource = readFileSync(resolve(uiRoot, personalPath), 'utf8')
const gaugeSource = readFileSync(resolve(uiRoot, gaugePath), 'utf8')
const originalPersonal = personalSource
  .replace("import { CheckinFacetReport } from './checkin-facet-report'\n", '')
  .replace("  if (report.reportKind === 'checkin-facets' && report.verified === true) return <CheckinFacetReport result={result} report={report} locale={locale} focusScaleKey={focusScaleKey} />\n", '')
const originalGauge = gaugeSource.replace(/  \/\/ Separate ordinal check-in answers have no continuous position or dial\.\n[\s\S]*?  \/\/ End of the exact-source check-in presentation\.\n/, '')
test('legacy component source outside the exact check-in gates remains byte-identical', () => {
  const digest = source => createHash('sha256').update(source).digest('hex')
  assert.equal(digest(originalPersonal), '947c5fb40e75f2459c17f018bd73e24cd68b4b92da513b1e9c2d8e7479dc9233')
  assert.equal(digest(originalGauge), 'f0c787ce9e3f0f2193dbf1ddd189ce565b4a0eb82822ac4d2d1b6d5a9e9fe408')
})
const baselineLoad = componentLoader({ [personalPath]: originalPersonal, [gaugePath]: originalGauge })
const BaselinePersonal = baselineLoad(personalPath).PersonalResultReport
const BaselineGauge = baselineLoad(gaugePath).ScoreGauge
const legacyCases = [
  ['hh-current-state', 'v1'], ['hh-current-state', 'v2'], ['hh-weekly-pulse', 'v1'],
  ['hh-resource-pulse', 'v1'], ['hh-monthly-profile', 'v1'], ['hh-screen-saturation', 'v2'],
  ['phq-4', 'v1'], ['gad-7', 'v1'], ['asrs-6', 'v1'], ['hh-socionics-32', 'v1'], ['hh-bach-flower-profile', 'v2'],
]
for (const [key, version] of legacyCases) for (const locale of ['en', 'ru']) {
  test(`legacy real report/gauge markup unchanged ${key}/${version}/${locale}`, () => {
    const definition = getAssessmentDefinition(key, version, key === 'phq-4' ? 'en' : locale)
    const result = resultFor(definition)
    assert.notEqual(buildAssessmentResultReport(result, locale).reportKind, 'checkin-facets')
    for (const focusScaleKey of [null, result.dimensions.at(-1).key]) {
      const props = { result, locale, focusScaleKey }
      assert.equal(render(PersonalResultReport, props), render(BaselinePersonal, props))
    }
    for (const dimension of result.dimensions) {
      const props = { result, dimension, locale }
      assert.equal(render(ScoreGauge, props), render(BaselineGauge, props))
    }
  })
}
