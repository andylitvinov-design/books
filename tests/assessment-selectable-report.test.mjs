import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { gaugeModel, gaugeChange } from '../lib/assessments/dashboard-gauges.js'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'

const compile = path => ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
  fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
const reportCode = compile('components/app/compact-assessment-report.jsx')
const gaugeCode = compile('components/app/assessment-gauge.jsx')
const jsx = (type, props, key) => ({ type, props, key })
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' }
const load = (code, imports) => {
  const compiledModule = { exports: {} }
  runInNewContext(code, { exports: compiledModule.exports, require: name => {
    if (name === 'react/jsx-runtime') return runtime
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
    assert.ok(imports[name], 'Unexpected import: ' + name)
    return imports[name]
  } })
  return compiledModule.exports
}
const gauges = load(gaugeCode, { '@/lib/assessments/dashboard-gauges': { gaugeModel, gaugeChange } })
const expand = node => node == null || typeof node !== 'object' ? node
  : Array.isArray(node) ? node.map(expand)
    : typeof node.type === 'function' ? expand(node.type(node.props))
      : { ...node, props: { ...node.props, children: expand(node.props.children) } }
const nodes = tree => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const text = tree => tree == null || typeof tree === 'boolean' ? ''
  : typeof tree !== 'object' ? String(tree)
    : Array.isArray(tree) ? tree.map(text).join(' ') : text(tree.props?.children)
const visibleText = tree => tree == null || typeof tree !== 'object' ? text(tree)
  : Array.isArray(tree) ? tree.map(visibleText).join(' ')
    : tree.type === 'details' && !tree.props.open
      ? text(nodes(tree).find(node => node.type === 'summary')) : visibleText(tree.props?.children)
const own = (node, name) => Object.hasOwn(node.props || {}, name)
const triggers = tree => nodes(tree).filter(node => own(node, 'data-assessment-scale-trigger'))
const active = tree => nodes(tree).filter(node => own(node, 'data-active-scale'))

// Stateful hook slots are driven only by the actual rendered event handlers.
// Tests cannot set the selected index directly or replace the panel contents.
function mount(props) {
  const slots = []
  let cursor = 0, tree
  const hooks = { useState(initial) {
    const index = cursor++
    if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial }
    return [slots[index].value, next => {
      slots[index].value = typeof next === 'function' ? next(slots[index].value) : next
    }]
  } }
  const { CompactAssessmentReport } = load(reportCode, {
    react: hooks, './assessment-gauge': gauges,
    './free-course-banner': { FreeCourseBanner: p => jsx('aside', { 'data-optional-course': true, ...p }) },
    '@/lib/assessments/scale-guides': { getTestScaleGuide },
    '@/lib/assessments/dashboard-gauges': { gaugeModel },
    '@/lib/assessments/result-overview': { assessmentResultOverview },
  })
  const render = () => { cursor = 0; tree = expand(CompactAssessmentReport(props)); return tree }
  render()
  return { get tree() { return tree },
    rerender(nextProps) { props = nextProps; render() },
    click(key) {
      const button = triggers(tree).find(node => node.props['data-assessment-scale-trigger'] === key)
      assert.equal(typeof button?.props.onClick, 'function', 'Every scale must have a working button')
      button.props.onClick(); render()
    },
    choose(index) {
      const select = nodes(tree).find(node => node.type === 'select')
      assert.equal(typeof select?.props.onChange, 'function', 'Long reports must have a working select')
      select.props.onChange({ target: { value: String(index) } }); render()
    },
  }
}
const scored = (definition, edge = 'min') => scoreAssessment(definition,
  Object.fromEntries(definition.questions.map(question => [question.id,
    question[edge] ?? definition.answerScale[edge]])), syntheticTraumaContext(definition))
const fixture = (key, instrumentLocale = 'en', version = 'v1') => scored(getAssessmentDefinition(key, version, instrumentLocale))

function assertSelected(h, result, report, section, locale) {
  const panels = active(h.tree)
  assert.equal(panels.length, 1, 'Exactly one active scale panel')
  const [panel] = panels
  assert.equal(panel.props['data-active-scale'], section.key)
  assert.equal(panel.props['aria-label'], section.construct || section.title)
  const pressed = triggers(h.tree).filter(node => node.props['aria-pressed'])
  assert.equal(pressed.length, 1)
  assert.equal(pressed[0].props['data-assessment-scale-trigger'], section.key)
  assert.equal(pressed[0].props['aria-controls'], panel.props.id)
  assert.ok(text(panel).includes(section.meaning), 'Full source meaning remains available')
  for (const step of section.steps || []) assert.ok(text(panel).includes(step), 'Every approved step remains available')
  for (const limit of section.limitations || []) assert.ok(visibleText(panel).includes(limit), 'Source limitations must not require expansion')
  if (section.followUp) assert.ok(text(panel).includes(section.followUp))
  if (section.source) assert.ok(nodes(panel).some(node => node.type === 'a' && node.props.href === section.source))
  assert.ok(text(h.tree).includes(report.methodology || ''))
  assert.ok(text(h.tree).includes(report.note || ''))
  const dimension = section.bandBasis === 'unavailable' ? null : result.dimensions.find(item => item.key === section.key)
  const model = gaugeModel(dimension, result, locale)
  const renderedGauges = nodes(panel).filter(node => own(node, 'data-assessment-gauge'))
  assert.equal(renderedGauges.length, model ? 1 : 0)
  if (!model) return
  const gauge = renderedGauges[0]
  assert.equal(gauge.props['data-assessment-gauge'], model.displayKind === 'screening-count' ? model.displayKind : model.orientation)
  const legend = nodes(gauge).filter(node => node.type === 'li')
  assert.equal(legend.length, model.bands.length)
  const numeral = value => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)
  model.bands.forEach((band, index) => {
    assert.ok(text(legend[index]).replace(/\s*–\s*/g, '–').includes(`${numeral(band.from)}–${numeral(band.to)}`), result.definitionKey + ': exact legend interval')
    assert.ok(text(legend[index]).includes(band.label))
    assert.equal(legend[index].props['aria-current'] === 'true', band.code === model.currentBand?.code)
  })
  assert.equal(nodes(gauge).filter(node => node.props['aria-current'] === 'true').length, model.currentBand ? 1 : 0)
  if (model.displayKind !== 'screening-count') {
    assert.ok(gauge.props['aria-label'].includes(`${numeral(dimension.min)}–${numeral(dimension.max)}`))
    assert.equal(gauge.props['data-gauge-scale'], model.continuous ? 'continuous' : 'published-bands')
    assert.deepEqual(nodes(gauge).filter(node => own(node, 'data-band-code')).map(node => node.props['data-band-code']), model.bands.map(band => band.code))
  }
}

test('actual buttons reach every saved measure with exact source content and gauge in EN/RU', () => {
  const enabled = new Set(MONITORING_CATALOG.filter(item => item.startable).map(item => item.key + ':' + item.version))
  const definitions = ASSESSMENT_DEFINITIONS.filter(definition => enabled.has(definition.key + ':' + definition.version))
  assert.ok(definitions.length >= 80)
  for (const definition of definitions) {
    const result = scored(definition)
    const saved = JSON.stringify(result)
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      const h = mount({ result, report, locale })
      assert.deepEqual(triggers(h.tree).map(node => node.props['data-assessment-scale-trigger']), report.sections.map(section => section.key))
      assert.deepEqual(new Set(report.sections.map(section => section.key)), new Set(result.dimensions.map(dimension => dimension.key)))
      for (const section of report.sections) {
        h.click(section.key)
        assertSelected(h, result, report, section, locale)
      }
      h.click(report.sections[0].key)
      h.click(report.sections[0].key)
      assertSelected(h, result, report, report.sections[0], locale)
    }
    assert.equal(JSON.stringify(result), saved, 'Selecting scales must not mutate saved results')
  }
})

test('long-report select changes the real state and retains all 38 Bach scales and disclosures', () => {
  const result = fixture('hh-bach-flower-profile', 'en', 'v2')
  for (const locale of ['en', 'ru']) {
    const report = buildAssessmentResultReport(result, locale)
    assert.equal(report.sections.length, 38)
    const h = mount({ result, report, locale })
    assert.equal(nodes(h.tree).filter(node => node.type === 'option').length, report.sections.length)
    for (let index = report.sections.length - 1; index >= 0; index--) {
      h.choose(index)
      assertSelected(h, result, report, report.sections[index], locale)
      assert.equal(nodes(h.tree).find(node => node.type === 'select').props.value, index)
    }
  }
})

test('professional-review measure starts selected and keeps its marker when another measure is chosen', () => {
  const result = fixture('ipip-big-five-50')
  for (const locale of ['en', 'ru']) {
    const base = buildAssessmentResultReport(result, locale)
    const report = { ...base, sections: base.sections.map((section, index) => ({ ...section, recommendedReview: index === 3 })) }
    const h = mount({ result, report, locale })
    assertSelected(h, result, report, report.sections[3], locale)
    const reviewButton = triggers(h.tree)[3]
    assert.ok(nodes(reviewButton).some(node => node.props['aria-label'] === (locale === 'ru'
      ? 'Рекомендовано профессиональное обсуждение' : 'Professional follow-up suggested')))
    assert.ok(visibleText(active(h.tree)[0]).includes(report.sections[3].followUp))
    h.click(report.sections[0].key)
    assertSelected(h, result, report, report.sections[0], locale)
    assert.ok(text(triggers(h.tree)[3]).includes('!'))
    h.click(report.sections[3].key)
    assertSelected(h, result, report, report.sections[3], locale)
  }
})

test('compact summaries cannot hide unvalidated-translation or mixed-polarity warnings', () => {
  for (const key of ['gad-7', 'hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation']) {
    const result = fixture(key, 'ru')
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      const h = mount({ result, report, locale })
      for (const section of report.sections) {
        h.click(section.key)
        const panel = active(h.tree)[0]
        assert.ok(section.limitations.length >= 2)
        for (const limitation of section.limitations) assert.ok(visibleText(panel).includes(limitation))
        const gauge = nodes(panel).find(node => own(node, 'data-assessment-gauge'))
        assert.equal(gauge.props['data-gauge-scale'], 'continuous')
        if (key !== 'gad-7') {
          assert.equal(gauge.props['data-assessment-gauge'], 'neutral')
          assert.match(visibleText(panel), locale === 'ru' ? /больше не означает лучше или хуже/ : /higher is not automatically better or worse/)
        }
      }
    }
  }
})

test('result navigation selects the new professional-review scale without resetting ordinary rerenders', () => {
  const definition = getAssessmentDefinition('phq-4')
  const first = { ...scored(definition), id: 'saved-phq4-first' }
  const second = { ...scored(definition, 'max'), id: 'saved-phq4-second' }
  for (const locale of ['en', 'ru']) {
    const firstReport = buildAssessmentResultReport(first, locale)
    const secondReport = buildAssessmentResultReport(second, locale)
    const h = mount({ result: first, report: firstReport, locale })
    h.click(firstReport.sections[2].key)
    h.rerender({ result: { ...first }, report: buildAssessmentResultReport(first, locale), locale })
    assertSelected(h, first, firstReport, firstReport.sections[2], locale)
    h.rerender({ result: second, report: secondReport, locale })
    const needsReview = secondReport.sections.find(section => section.recommendedReview)
    assert.ok(needsReview)
    assertSelected(h, second, secondReport, needsReview, locale)
    assert.ok(visibleText(active(h.tree)[0]).includes(needsReview.followUp))
    h.click(secondReport.sections[1].key)
    h.rerender({ result: { ...second }, report: buildAssessmentResultReport(second, locale), locale })
    assertSelected(h, second, secondReport, secondReport.sections[1], locale)
  }
})

test('tampered provenance has no gauge, scale-guide advice, or personal hypothesis', () => {
  for (const key of ['phq-9', 'ipip-big-five-50', 'hh-enneagram-36']) for (const locale of ['en', 'ru']) {
    const original = fixture(key)
    const result = { ...original, contentHash: 'unverified-result' }
    const report = buildAssessmentResultReport(result, locale)
    const guide = getTestScaleGuide(key, locale)
    const h = mount({ result, report, locale })
    assert.equal(report.personalityType, null)
    for (const section of report.sections) {
      assert.equal(section.bandBasis, 'unavailable')
      h.click(section.key)
      assertSelected(h, result, report, section, locale)
      assert.equal(nodes(active(h.tree)[0]).filter(node => node.type === 'li').length, 0)
      for (const item of guide?.scales || []) for (const field of ['watch', 'skill']) {
        if (item[field]) assert.ok(!text(active(h.tree)[0]).includes(item[field]), 'Unverified result must not inherit optional guide advice')
      }
      assert.match(text(active(h.tree)[0]), locale === 'ru' ? /Нет достоверной числовой шкалы/ : /No verified numeric scale/)
    }
  }
})

test('empty legacy reports keep the optional banner without a selector or fabricated score', () => {
  const h = mount({ result: { definitionKey: 'unknown', dimensions: [] }, report: { sections: [], rulesVersion: 'legacy' } })
  assert.equal(triggers(h.tree).length, 0)
  assert.equal(active(h.tree).length, 0)
  assert.equal(nodes(h.tree).filter(node => own(node, 'data-assessment-gauge')).length, 0)
  assert.equal(nodes(h.tree).filter(node => own(node, 'data-optional-course')).length, 1)
  assert.ok(text(h.tree).includes('legacy'))
})
