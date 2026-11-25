import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { assessmentResultOverview, initialAssessmentSection } from '../lib/assessments/result-overview.js'
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'
import { PRIMARY_REPORT_POLARITY_CASES, primaryReportFixtureProps } from '../scripts/fixtures/assessment-primary-report.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const compile = path => ts.transpileModule(read(path), {
  fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
const load = (code, imports = {}) => {
  const compiledModule = { exports: {} }
  runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, require: name => {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected dependency: ' + name)
    return imports[name]
  } })
  return compiledModule.exports
}

test('primary fixture declares resource direction by default, with distinct A/B outcomes', () => {
  assert.deepEqual(PRIMARY_REPORT_POLARITY_CASES, [
    { name: 'resource', direction: 'resource', expectedA: 1, expectedB: 2 },
    { name: 'difficulty', direction: 'difficulty', expectedA: 0, expectedB: 1 },
    { name: 'neutral', direction: 'neutral', expectedA: 0, expectedB: 0 },
    { name: 'missing', direction: null, expectedA: 0, expectedB: 0 },
  ])
  for (const [id, values] of [['A', [8, 2, 6]], ['B', [6, 8, 1]]]) {
    const props = primaryReportFixtureProps(id)
    assert.deepEqual(props.result.dimensions.map(section => section.value), values)
    assert.ok(props.report.sections.every(section => section.presentationDirection === 'resource'))
    assert.equal(initialAssessmentSection(props.report), id === 'A' ? 1 : 2)
  }
})

for (const { name, direction, expectedA, expectedB } of PRIMARY_REPORT_POLARITY_CASES) {
  test(name + ' fixtures exercise real overview priority in both languages without changing scores', () => {
    for (const locale of ['en', 'ru']) {
      for (const [id, expected] of [['A', expectedA], ['B', expectedB]]) {
        const props = primaryReportFixtureProps(id, locale, false, false, direction)
        const before = structuredClone(props)
        const overview = assessmentResultOverview(props.report, props.result, locale)
        assert.equal(initialAssessmentSection(props.report), expected, locale + ' ' + id)
        assert.equal(overview.initialIndex, expected)
        assert.equal(overview.preview[0].key, 'scale-' + expected)
        assert.equal(overview.preview[0].score, props.report.sections[expected].value + ' / 0–10')
        if (direction === null) {
          assert.ok(props.report.sections.every(section => !Object.hasOwn(section, 'presentationDirection')))
        } else {
          assert.ok(props.report.sections.every(section => section.presentationDirection === direction))
        }
        if (direction === null || direction === 'neutral') {
          assert.deepEqual(overview.preview.map(section => section.key), ['scale-0', 'scale-1', 'scale-2'])
        }
        assert.deepEqual(props, before, 'Display priority must not rewrite source scores or content')
      }
    }
  })
}

test('opposite directions cannot regress to one universal lowest/highest or first-scale choice', () => {
  const resource = primaryReportFixtureProps('B', 'en', false, false, 'resource')
  const difficulty = primaryReportFixtureProps('B', 'en', false, false, 'difficulty')
  assert.deepEqual(resource.result, difficulty.result, 'The scored measurements are identical')
  assert.equal(initialAssessmentSection(resource.report), 2, 'Low resource is selected, not high resource')
  assert.equal(initialAssessmentSection(difficulty.report), 1, 'High difficulty is selected, not low difficulty')
  assert.notEqual(initialAssessmentSection(resource.report), 0, 'A fixed first-scale expectation is insufficient')
  assert.notEqual(initialAssessmentSection(difficulty.report), 2, 'The obsolete universal-lowest policy must fail')
  const unknown = primaryReportFixtureProps('B', 'en', false, false, null)
  unknown.report.sections.forEach(section => { section.direction = 'difficulty' })
  assert.equal(initialAssessmentSection(unknown.report), 0, 'Do not infer presentation polarity from another field')
})

test('direction uses each declared range, while existing review and bypass rules retain precedence', () => {
  for (const direction of ['resource', 'difficulty']) {
    const props = primaryReportFixtureProps('B', 'en', false, false, direction)
    props.report.sections = [
      { ...props.report.sections[0], value: 25, min: 20, max: 100 },
      { ...props.report.sections[1], value: 8, min: -10, max: 10 },
    ]
    assert.equal(initialAssessmentSection(props.report), direction === 'resource' ? 0 : 1)
    const reviewIndex = direction === 'resource' ? 1 : 0
    props.report.sections[reviewIndex].recommendedReview = true
    assert.equal(initialAssessmentSection(props.report), reviewIndex)
  }
  for (const { direction } of PRIMARY_REPORT_POLARITY_CASES) {
    const { report } = primaryReportFixtureProps('B', 'en', false, false, direction)
    report.sections[2].recommendedReview = true
    assert.equal(initialAssessmentSection(report), 2, 'Published review takes precedence over display direction')
    assert.equal(initialAssessmentSection({ ...report, verified: false }), 0)
    assert.equal(initialAssessmentSection({ ...report, reportKind: 'bach' }), 0)
  }
})

test('browser-compatible fixture module executes the same directions and source props as Node', () => {
  const bundled = load(compile('scripts/fixtures/assessment-primary-report.js'))
  const plain = value => JSON.parse(JSON.stringify(value))
  assert.deepEqual(plain(bundled.PRIMARY_REPORT_POLARITY_CASES), PRIMARY_REPORT_POLARITY_CASES)
  for (const { direction } of PRIMARY_REPORT_POLARITY_CASES) {
    for (const locale of ['en', 'ru']) for (const id of ['A', 'B']) {
      assert.deepEqual(plain(bundled.primaryReportFixtureProps(id, locale, false, false, direction)),
        primaryReportFixtureProps(id, locale, false, false, direction))
    }
  }
})

test('actual React component renders the declared default and its matching source for every fixture', () => {
  // Real React SSR checks initial component wiring, not browser interaction.
  // The separate offline browser script owns real clicks, reset and keyboard checks.
  const { CompactAssessmentReport } = load(compile('components/app/compact-assessment-report.jsx'), {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    './free-course-banner': { FreeCourseBanner: () => null },
    './assessment-gauge': { ScoreGauge: () => null, ScoreTrend: () => null },
    '@/lib/assessments/scale-guides': { getTestScaleGuide: () => ({ scales: [] }) },
    '@/lib/assessments/dashboard-gauges': { gaugeModel: () => null },
    '@/lib/assessments/result-overview': { assessmentResultOverview },
    '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
    './compact-assessment-report.module.css': { default: new Proxy({}, { get: (_, key) => key }) },
  })
  for (const { direction, expectedA, expectedB } of PRIMARY_REPORT_POLARITY_CASES) {
    for (const locale of ['en', 'ru']) {
      for (const [id, expected] of [['A', expectedA], ['B', expectedB]]) {
        const props = primaryReportFixtureProps(id, locale, false, false, direction)
        const html = renderToStaticMarkup(React.createElement(CompactAssessmentReport, props))
        assert.match(html, new RegExp('data-active-scale="scale-' + expected + '"'))
        assert.equal((html.match(/data-active-scale=/g) || []).length, 1)
        assert.equal((html.match(/data-primary-support=/g) || []).length, 1)
        assert.ok(html.includes('href="' + props.report.sections[expected].source + '"'))
      }
    }
  }
})

test('offline browser acceptance exercises directional defaults, real clicks and A/B resets', () => {
  const script = read('scripts/verify-assessment-primary-browser.mjs')
  assert.match(script, /PRIMARY_REPORT_POLARITY_CASES:polarityCases/)
  assert.match(script, /for\(const \{name,direction,expectedA,expectedB\} of acceptance\.polarityCases\)/)
  assert.match(script, /propsFor\('A',locale,false,false,direction\)/)
  assert.match(script, /propsFor\('B',locale,false,false,direction\)/)
  assert.match(script, /active\(\)==='scale-'\+expectedA/)
  assert.match(script, /active\(\)==='scale-'\+expectedB/)
  assert.match(script, /findIndex\(\(_,index\)=>index!==expectedA&&index!==expectedB\)/)
  assert.match(script, /acceptance\.click\('scale-'\+clicked\)/)
  assert.match(script, /acceptance\.render\(structuredClone\(a\)\)/)
  assert.match(script, /content\(a,expectedA,label\+' A return'\)/)
  assert.doesNotMatch(script, /initial lowest fraction/)
})
