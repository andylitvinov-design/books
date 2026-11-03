import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { ASSESSMENT_DEFINITIONS, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'
import { scoreChangeReading } from '../lib/assessments/score-change-reading.js'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'
import { buildClientReport } from '../lib/profile/client-report.js'
import { generateClientPdf } from '../lib/profile/client-report-pdf.js'

const jsx = (type, props, key) => ({ type, props, key })
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' }
function load(path, imports) {
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText
  const loaded = { exports: {} }
  runInNewContext(code, { exports: loaded.exports, require: name => {
    if (name === 'react/jsx-runtime') return runtime
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
    assert.ok(imports[name], 'Unexpected import ' + name)
    return imports[name]
  } })
  return loaded.exports
}
const gauges = load('components/app/assessment-gauge.jsx', { '@/lib/assessments/dashboard-gauges': { gaugeModel, gaugeChange },
  '@/lib/assessments/score-change-reading': { scoreChangeReading } })
const compact = load('components/app/compact-assessment-report.jsx', {
  react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] },
  './assessment-gauge': gauges,
  './free-course-banner': { FreeCourseBanner: () => jsx('aside', { 'data-optional-course': true }) },
  '@/lib/assessments/scale-guides': { getTestScaleGuide },
  '@/lib/assessments/dashboard-gauges': { gaugeModel },
  '@/lib/assessments/result-overview': { assessmentResultOverview },
  '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
})
const actualRoute = load('components/app/personal-result-report.jsx', {
  'next/link': { default: 'a' }, './compact-assessment-report': compact,
  '@/lib/assessments/result-report': { buildAssessmentResultReport },
  '@/lib/assessments/scale-guides': { getTestScaleGuide },
})
const expand = tree => tree == null || typeof tree !== 'object' ? tree : Array.isArray(tree) ? tree.map(expand)
  : typeof tree.type === 'function' ? expand(tree.type(tree.props))
    : { ...tree, props: { ...tree.props, children: expand(tree.props.children) } }
const nodes = tree => tree == null || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes)
  : [tree, ...nodes(tree.props.children)]
const text = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree)
  : Array.isArray(tree) ? tree.map(text).join(' ') : text(tree.props.children)
const visible = tree => tree == null || typeof tree !== 'object' ? text(tree) : Array.isArray(tree) ? tree.map(visible).join(' ')
  : tree.type === 'details' && !tree.props.open ? text(nodes(tree).find(node => node.type === 'summary')) : visible(tree.props.children)
const score = (definition, edge = 'max') => scoreAssessment(definition,
  Object.fromEntries(definition.questions.map(question => [question.id, question[edge] ?? definition.answerScale[edge]])))
const generic = ASSESSMENT_DEFINITIONS.filter(definition => !definition.administration &&
  !['asrs-6', 'hh-bach-flower-profile'].includes(definition.key))

test('every genuine generic source remains verified with unchanged scored dimensions', () => {
  for (const definition of generic) for (const edge of ['min', 'max']) for (const locale of ['en', 'ru']) {
    const result = score(definition, edge), saved = JSON.stringify(result)
    const report = buildAssessmentResultReport(result, locale)
    assert.equal(report.verified, true, definition.id)
    assert.equal(report.sections.length, result.dimensions.length)
    assert.deepEqual(report.sections.map(section => section.value), result.dimensions.map(dimension => dimension.value))
    assert.ok(report.sections.every(section => section.bandBasis !== 'unavailable'))
    assert.equal(JSON.stringify(result), saved)
  }
})

for (const locale of ['en', 'ru']) test(`source rejection reaches the actual PersonalResultReport route with raw numbers (${locale})`, () => {
  for (const key of ['phq-4', 'gad-7', 'hh-money-pressure', 'ipip-big-five-50', 'hh-love-affection']) {
    const definition = generic.find(item => item.key === key)
    const result = score(definition)
    const mutations = Object.keys(provenance(definition)).flatMap(field => [
      { ...result, [field]: undefined }, { ...result, [field]: 'unverified-value' },
    ])
    for (const rejected of mutations) {
      const saved = JSON.stringify(rejected), report = buildAssessmentResultReport(rejected, locale)
      assert.equal(report.verified, false)
      assert.equal(report.methodology, assessmentMethodology({ locale }).text)
      assert.equal(report.purpose, report.intro)
      assert.equal(report.contextNote, null)
      assert.equal(report.personalityType, null)
      assert.ok(report.sections.every(section => section.bandBasis === 'unavailable' && !section.source && section.steps.length === 0))
      const tree = expand(actualRoute.PersonalResultReport({ result: rejected, locale }))
      const visibleText = visible(tree)
      assert.ok(visibleText.includes(report.intro), 'Whole-report warning is visible before collapsed details')
      assert.ok(visibleText.includes(String(result.dimensions[0].value)), 'Original stored number is retained')
      assert.match(visibleText, locale === 'ru' ? /непроверенный сохранённый диапазон/ : /unverified saved range/)
      assert.equal(nodes(tree).filter(node => Object.hasOwn(node.props || {}, 'data-assessment-gauge')).length, 0)
      assert.equal(nodes(tree).filter(node => node.type === 'ol').length, 0)
      assert.equal(JSON.stringify(rejected), saved)
    }
  }
})

for (const locale of ['en', 'ru']) test(`real comprehensive PDF neutralizes rejected-source metadata before raw rows (${locale})`, async () => {
  const printed = [], prior = globalThis.document
  const ctx = { beginPath() {}, rect() {}, roundRect() {}, fill() {}, measureText(value) { return { width: String(value).length * 10 } }, fillText(value) { printed.push(String(value)) } }
  globalThis.document = { createElement() { return { getContext: () => ctx, toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==' } } }
  const normalise = value => String(value).replace(/\s+/g, ' ').trim()
  try {
    for (const key of ['gad-7', 'hh-money-pressure', 'ipip-big-five-50']) {
      const definition = generic.find(item => item.key === key)
      const result = { id: 'synthetic-source-rejection', measurementAt: '2026-10-16T12:00:00Z', ...score(definition), contentHash: 'unverified-value' }
      const report = buildClientReport({ results: [result], locale, now: new Date('2026-10-16T12:00:00Z') })
      const entry = report.tests[0], interpretation = entry.interpretation
      assert.equal(entry.title, interpretation.title)
      assert.equal(entry.description, interpretation.intro)
      assert.equal(entry.conclusion, interpretation.intro)
      assert.match(entry.source, locale === 'ru' ? /не подтверждён/ : /unverified/)
      assert.deepEqual(entry.dimensions.map(dimension => dimension.value), result.dimensions.map(dimension => dimension.value))
      printed.length = 0
      assert.equal((await generateClientPdf(report)).type, 'application/pdf')
      const output = normalise(printed.join(' ')), warning = normalise(interpretation.intro)
      assert.ok(output.includes(warning))
      assert.ok(output.indexOf(warning) < output.indexOf(locale === 'ru' ? 'Диапазон шкалы:' : 'Scale range:'))
      assert.ok(output.includes(normalise(assessmentMethodology({ locale }).text)))
      assert.doesNotMatch(normalise(entry.conclusion), /personal baseline|исходная точка|повторный тест/i)
      if (definition.source.url) assert.ok(!output.includes(definition.source.url))
      for (const section of interpretation.sections) assert.deepEqual(section.steps, [])
    }
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior }
})

for (const locale of ['en', 'ru']) test(`combined mean guard and rejection flag preserve raw numbers on the actual route and PDF (${locale})`, async () => {
  const definition = generic.find(item => item.key === 'cbi-work')
  const genuine = score(definition)
  const result = { ...genuine, id: 'synthetic-off-grid-mean', measurementAt: '2026-10-16T12:00:00Z', dimensions: genuine.dimensions.map((dimension, index) =>
    index ? dimension : { ...dimension, value: 14.28 }) }
  const saved = JSON.stringify(result)
  const interpretation = buildAssessmentResultReport(result, locale)
  assert.equal(interpretation.verified, false)
  const tree = expand(actualRoute.PersonalResultReport({ result, locale }))
  assert.ok(visible(tree).includes(interpretation.intro))
  assert.ok(visible(tree).includes('14.28'))
  assert.equal(nodes(tree).filter(node => Object.hasOwn(node.props || {}, 'data-assessment-gauge')).length, 0)
  assert.equal(nodes(tree).filter(node => node.type === 'ol').length, 0)
  const report = buildClientReport({ results: [result], locale, now: new Date('2026-10-16T12:00:00Z') })
  assert.equal(report.tests[0].conclusion, interpretation.intro)
  assert.equal(report.tests[0].dimensions[0].value, 14.28)
  const printed = [], prior = globalThis.document
  const ctx = { beginPath() {}, rect() {}, roundRect() {}, fill() {}, measureText(value) { return { width: String(value).length * 10 } }, fillText(value) { printed.push(String(value)) } }
  globalThis.document = { createElement() { return { getContext: () => ctx, toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==' } } }
  try {
    assert.equal((await generateClientPdf(report)).type, 'application/pdf')
    const output = printed.join(' ').replace(/\s+/g, ' ')
    assert.ok(output.includes(interpretation.intro))
    assert.ok(output.includes('14.28'))
    assert.ok(!output.includes(definition.source.url))
    assert.equal(JSON.stringify(result), saved)
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior }
})

for (const locale of ['en', 'ru']) test(`malformed saved containers render an unavailable notice without inventing zeroes (${locale})`, () => {
  const genuine = score(generic.find(definition => definition.key === 'cbi-work'))
  for (const dimensions of [null, [], [null], new Array(1), [undefined], ['bad']]) {
    const result = { ...genuine, dimensions }, before = structuredClone(result)
    const tree = expand(actualRoute.PersonalResultReport({ result, locale }))
    assert.ok(visible(tree).includes(buildAssessmentResultReport(result, locale).intro))
    assert.equal(nodes(tree).filter(node => Object.hasOwn(node.props || {}, 'data-assessment-gauge')).length, 0)
    assert.equal(nodes(tree).filter(node => node.type === 'ol').length, 0)
    assert.deepEqual(result, before)
  }
})
