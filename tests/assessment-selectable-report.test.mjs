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
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'
import { scoreChangeReading } from '../lib/assessments/score-change-reading.js'
import { SITUATION_OBSERVATION } from '../lib/assessments/situational-score-context.js'
import { assessmentResultOverview, initialAssessmentSection } from '../lib/assessments/result-overview.js'
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
const gauges = load(gaugeCode, { '@/lib/assessments/dashboard-gauges': { gaugeModel, gaugeChange },
  '@/lib/assessments/score-change-reading': { scoreChangeReading } })
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
    '@/lib/assessments/situational-score-context': { SITUATION_OBSERVATION },
    '@/lib/assessments/result-overview': { assessmentResultOverview },
    '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
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
  Object.fromEntries(definition.questions.map((question, index) => {
    const choice = edge === 'mixed' ? (index % 2 ? 'max' : 'min') : edge
    return [question.id, question[choice] ?? definition.answerScale[choice]]
  })), syntheticTraumaContext(definition))
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
  const plainGuide = nodes(panel).some(node => own(node, 'data-current-score-position') ||
    own(node, 'data-answer-interpretation'))
  assert.ok(visibleText(panel).includes(section.summary || section.meaning) ||
    (plainGuide && text(panel).includes(section.summary || section.meaning)),
    'The full source interpretation remains accessible, while a clear current-level reading is visible')
  for (const step of section.steps || []) assert.ok(text(panel).includes(step), 'Every approved step remains available')
  const scoreDimension = section.bandBasis === 'unavailable' ? null : result.dimensions.find(item => item.key === section.key)
  const scoreModel = gaugeModel(scoreDimension, result, locale)
  const critical = section.limitations?.some(note =>
    /translation|unvalidated|russian form|without reversing|перевод|английск|русск|без разворота/i.test(note))
  const originalBoilerplate = result.definitionKey?.startsWith('hh-') &&
    section.bandBasis === 'descriptive' && !critical
  for (const limit of section.limitations || []) {
    if (scoreModel?.currentAnswerBand || originalBoilerplate) {
      // Only repetitive methodological notes on supported original reflections
      // may live in disclosure. Integrity and translation warnings must be visible.
      assert.ok(text(panel).includes(limit), 'Detailed caveat remains accessible')
      if (scoreModel?.currentAnswerBand) assert.match(visibleText(panel),
        locale === 'ru' ? /не медицинские нормы/ : /not clinical norms/,
        'Answer anchors cannot be mistaken for published clinical cutoffs')
    } else assert.ok(visibleText(panel).includes(limit),
      'Screening, translation, mixed-polarity or unverified warnings must remain visible')
  }
  if (section.followUp) assert.ok(text(panel).includes(section.followUp))
  if (section.source) assert.ok(nodes(h.tree).some(node => node.type === 'a' && node.props.href === section.source))
  assert.ok(text(h.tree).includes(report.methodology || ''))
  assert.ok(text(h.tree).includes(report.note || ''))
  const dimension = section.bandBasis === 'unavailable' ? null : result.dimensions.find(item => item.key === section.key)
  const model = gaugeModel(dimension, result, locale)
  const renderedGauges = nodes(panel).filter(node => own(node, 'data-assessment-gauge'))
  assert.equal(renderedGauges.length, model ? 1 : 0)
  if (!model) return
  const gauge = renderedGauges[0]
  assert.equal(gauge.props['data-assessment-gauge'], model.displayKind === 'screening-count' ? model.displayKind : model.orientation)
  // The compact dial intentionally hides its internal list; the readable
  // source-aware report must expose the exact intervals with one selection.
  assert.equal(nodes(gauge).filter(node => node.type === 'li').length, 0)
  const rangeRows = nodes(panel).filter(node => own(node, 'data-score-range'))
  assert.equal(rangeRows.length, model.rangeReading?.rows.length || 0)
  const reading = model.rangeReading
  if (reading) {
    assert.equal(rangeRows.filter(row => row.props['aria-current'] === 'true').length, 1)
    reading.rows.forEach((band, index) => {
      assert.equal(rangeRows[index].props['data-score-range'], band.code)
      assert.ok(text(rangeRows[index]).includes(band.displayRange),
        result.definitionKey + ': exact displayed source/response range')
      assert.ok(text(rangeRows[index]).includes(band.label))
      assert.equal(rangeRows[index].props['aria-current'] === 'true', band.current)
    })
  }
  const numeral = value => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }).format(value)
  if (model.displayKind !== 'screening-count') {
    assert.ok(gauge.props['aria-label'].includes(`${numeral(dimension.min)}–${numeral(dimension.max)}`))
    assert.equal(gauge.props['data-gauge-scale'], model.continuous ? 'continuous' : 'published-bands')
    assert.deepEqual(nodes(gauge).filter(node => own(node, 'data-band-code')).map(node => node.props['data-band-code']), model.bands.map(band => band.code))
  }
}

test('actual buttons expose every semantic explanation at min, max and mixed answers in EN/RU', () => {
  const enabled = new Set(MONITORING_CATALOG.filter(item => item.startable).map(item => item.key + ':' + item.version))
  const definitions = ASSESSMENT_DEFINITIONS.filter(definition => enabled.has(definition.key + ':' + definition.version))
  assert.ok(definitions.length >= 80)
  for (const definition of definitions) for (const profile of ['min', 'max', 'mixed']) {
    const result = scored(definition, profile)
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

test('one source-specific primary option is visible and the complete guidance remains accessible', () => {
  for (const key of ['cbi-personal', 'hh-money-pressure', 'ipip-big-five-50', 'asrs-6', 'pcl-5', 'itq-adult', 'hh-bach-flower-profile']) {
    const result = fixture(key, 'en', key === 'hh-bach-flower-profile' ? 'v2' : 'v1')
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      const h = mount({ result, report, locale })
      for (const section of report.sections) {
        h.click(section.key)
        const panel = active(h.tree)[0]
        const primary = nodes(panel).filter(node => own(node, 'data-primary-support'))
        assert.equal(primary.length, 1, key + ': exactly one visible option')
        const expected = section.recommendedReview && section.followUp || section.primarySupport || section.steps[0] || section.followUp
        assert.equal(text(primary[0]), expected)
        assert.ok(visibleText(panel).includes(expected))
        const details = nodes(panel).find(node => node.type === 'details')
        assert.ok(!text(details).includes(expected), 'Do not repeat the identical primary suggestion')
        for (const step of section.steps) assert.ok(text(panel).includes(step))
        if (section.primarySupport && !section.recommendedReview) {
          assert.notEqual(section.primarySupport, section.steps[0], 'Numeric observation must not replace the useful action')
          assert.ok(!visibleText(panel).includes(section.steps[0]))
        }
        assert.equal(nodes(h.tree).filter(node => own(node, 'data-assessment-methodology')).length, 1)
        if (section.source) assert.ok(nodes(h.tree).find(node => own(node, 'data-assessment-methodology')).props.children)
      }
    }
  }
})

test('review and unverified reports preserve safety precedence over ordinary primary suggestions', () => {
  for (const key of ['phq-9', 'gad-7', 'asrs-6']) for (const locale of ['en', 'ru']) {
    const result = scored(getAssessmentDefinition(key), 'max')
    const report = buildAssessmentResultReport(result, locale)
    const h = mount({ result, report, locale })
    const section = report.sections.find(item => item.recommendedReview)
    assert.ok(section)
    const panel = active(h.tree)[0]
    assert.equal(text(nodes(panel).find(node => own(node, 'data-primary-support'))), section.followUp)
    for (const step of section.steps) assert.ok(text(panel).includes(step))
    const rejected = { ...result, contentHash: 'synthetic-invalid' }
    const rejectedReport = buildAssessmentResultReport(rejected, locale)
    h.rerender({ result: rejected, report: rejectedReport, locale })
    assert.equal(nodes(h.tree).filter(node => own(node, 'data-primary-support')).length, 0)
    assert.ok(visibleText(h.tree).includes(rejectedReport.intro))
  }
})

test('initial scale uses declared score polarity, neutral source order and unchanged safety/Bach precedence', () => {
  const section = (value, min, max, extra = {}) => ({ value, min, max, bandBasis: 'descriptive', ...extra })
  const choose = sections => initialAssessmentSection({ verified: true, sections })
  // Non-normative traits and unknown domains retain source order, regardless
  // of which number is lowest. Only reliable difficulty/resource direction is
  // useful for display prioritisation, never a diagnostic severity ranking.
  assert.equal(choose([section(30, 10, 50), section(25, 20, 100)]), 0)
  assert.equal(choose([section(5, 0, 10), section(10, 0, 20)]), 0)
  assert.equal(choose([section(9, 0, 10, { presentationDirection: 'difficulty' }), section(8, 0, 10, { presentationDirection: 'resource' })]), 0)
  assert.equal(choose([section(2, 0, 10, { presentationDirection: 'difficulty' }), section(1, 0, 10, { presentationDirection: 'resource' })]), 1)
  for (const invalid of [section(null, 0, 1), section(NaN, 0, 1), section(Infinity, 0, 1), section(0, 0, 0), section(1, 2, 0), section(-1, 0, 1), section(2, 0, 1), section(0, NaN, 1), section(0, 0, Infinity), section('0', 0, 1), section(0, 0, 1, { bandBasis: 'unavailable' })]) {
    assert.equal(choose([invalid, section(8, 0, 10)]), 1)
    assert.equal(choose([invalid]), 0)
  }
  const sections = [section(9, 0, 10), section(1, 0, 10)]
  assert.equal(initialAssessmentSection({ verified: false, sections }), 0)
  assert.equal(initialAssessmentSection({ reportKind: 'bach', verified: true, sections }), 0)
  assert.equal(choose([section(0, 0, 10), section(9, 0, 10, { recommendedReview: true })]), 1)
  assert.equal(choose([]), 0)
  assert.equal(choose([null, undefined, section(1, 0, 10)]), 2)
  assert.equal(choose(Array(2)), 0)
  assert.equal(assessmentResultOverview({ sections: [null, undefined] }, null).initialIndex, 0)
})

test('initial selection reaches the rendered panel and resets on return after a result switch', () => {
  const result = fixture('ipip-big-five-50')
  const base = buildAssessmentResultReport(result)
  const report = { ...base, sections: base.sections.map((section, index) => ({ ...section, value: index === 2 ? section.min : section.max, recommendedReview: false })) }
  const first = { ...result, id: 'first-selection-fixture' }
  const second = { ...result, id: 'second-selection-fixture' }
  const h = mount({ result: first, report })
  assert.equal(active(h.tree)[0].props['data-active-scale'], report.sections[0].key)
  h.click(report.sections[3].key)
  h.rerender({ result: { ...first }, report: { ...report }, locale: 'ru' })
  assert.equal(active(h.tree)[0].props['data-active-scale'], report.sections[3].key)
  h.rerender({ result: second, report })
  assert.equal(active(h.tree)[0].props['data-active-scale'], report.sections[0].key)
  h.rerender({ result: first, report })
  assert.equal(active(h.tree)[0].props['data-active-scale'], report.sections[0].key)
  const guest = mount({ result, report })
  guest.click(report.sections[4].key)
  guest.rerender({ result: structuredClone(result), report: { ...report } })
  assert.equal(active(guest.tree)[0].props['data-active-scale'], report.sections[4].key)
})

test('identical footer support is omitted only while the selected primary visibly preserves it', () => {
  const result = fixture('phq-4')
  for (const locale of ['en', 'ru']) {
    const base = buildAssessmentResultReport(result, locale)
    const warning = locale === 'ru' ? 'Обсудите симптомы со специалистом.' : 'Discuss symptoms with a professional.'
    const distinct = locale === 'ru' ? 'Важное отдельное ограничение.' : 'An important distinct limitation.'
    const report = { ...base, seekSupport: warning, note: distinct, sections: base.sections.map((section, index) => ({
      ...section, recommendedReview: index === 0, followUp: index === 0 ? warning : section.followUp,
    })) }
    const h = mount({ result, report, locale })
    const footer = () => nodes(h.tree).find(node => own(node, 'data-assessment-methodology'))
    assert.equal(text(nodes(h.tree).find(node => own(node, 'data-primary-support'))), warning)
    assert.ok(!text(footer()).includes(warning))
    assert.ok(text(footer()).includes(distinct))
    h.click(report.sections[1].key)
    assert.ok(text(footer()).includes(warning), 'Warning returns when another scale is selected')
    h.rerender({ result, report: { ...report, verified: false }, locale })
    assert.equal(nodes(h.tree).filter(node => own(node, 'data-primary-support')).length, 0)
    assert.ok(text(footer()).includes(warning), 'No-primary paths retain footer support')
    h.click(report.sections[0].key)
    assert.ok(text(footer()).includes(warning))
  }
})
