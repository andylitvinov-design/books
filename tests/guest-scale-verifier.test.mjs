import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { assertGuestSnapshot, assertAccountReportSnapshot, assertGuestSaveIntent, guestFinishLabel, guestAnalysisLabel } from '../scripts/helpers/guest-scale-verifier.mjs'
import * as reportModule from '../lib/assessments/result-report.js'
import * as gaugeModule from '../lib/assessments/dashboard-gauges.js'
import * as guideModule from '../lib/assessments/scale-guides.js'
import * as overviewModule from '../lib/assessments/result-overview.js'
import * as evidenceModule from '../lib/assessments/assessment-evidence-status.js'
import * as changeModule from '../lib/assessments/score-change-reading.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../data/assessments/personality-types-original-2026.js'
import { MHC_SF_DEFINITIONS } from '../data/assessments/mhc-sf-adult-dec2011.js'
import { COMPASSION_DEFINITIONS } from '../data/assessments/compassion-2026.js'
import { ASRS6_DEFINITIONS } from '../data/assessments/asrs-v1-6-nyu.js'
import { TANTRIC_REFLECTION_DEFINITIONS } from '../data/assessments/tantric-reflections-v1.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
const { buildAssessmentResultReport } = reportModule
const definitions = [...PERSONALITY_TYPE_DEFINITIONS, ...MHC_SF_DEFINITIONS, ...COMPASSION_DEFINITIONS, ...ASRS6_DEFINITIONS, ...RELATIONSHIPS_INTIMACY_DEFINITIONS, ...TANTRIC_REFLECTION_DEFINITIONS,
  getAssessmentDefinition('phq-9','v1','en'), getAssessmentDefinition('brcs','v1','en'),
  getAssessmentDefinition('gad-7','v1','ru'), getAssessmentDefinition('hh-money-pressure','v1','en')]
const sourceRoot = process.env.HH_VERIFIER_SOURCE_ROOT ? pathToFileURL(resolve(process.env.HH_VERIFIER_SOURCE_ROOT) + '/') : new URL('../', import.meta.url)
const read = name => readFileSync(new URL(name, sourceRoot), 'utf8')

// Execute the actual canonical JSX with a lightweight element renderer. Only CSS
// and the unrelated free-course banner are stubbed; score, gauge and report logic
// are real. This catches markup drift without claiming browser/layout coverage.
const elements = tree => tree == null || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(elements) : [tree, ...elements(tree.props.children)]
const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join('') : textOf(tree.props.children)
const find = (tree, predicate) => elements(tree).find(predicate)
const tagged = (tree, tag) => find(tree, node => node.type === tag)
const marked = (tree, attr) => find(tree, node => Object.hasOwn(node.props, attr))
const jsx = (type, props, key) => typeof type === 'function' ? type(props || {}) : ({ type, props: props || {}, key })
// A stateful hook shim lets the tests use actual trigger handlers, rather than
// forcing an index and accidentally accepting unreachable scale panels.
let hookValues = [], hookCursor = 0
const mockReact = { useState: initial => {
  const index = hookCursor++
  if (!(index in hookValues)) hookValues[index] = typeof initial === 'function' ? initial() : initial
  return [hookValues[index], next => { hookValues[index] = typeof next === 'function' ? next(hookValues[index]) : next }]
} }
const modules = {
  react: mockReact,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@/lib/assessments/result-report': reportModule,
  '@/lib/assessments/dashboard-gauges': gaugeModule,
  '@/lib/assessments/scale-guides': guideModule,
  '@/lib/assessments/result-overview': overviewModule,
  '@/lib/assessments/assessment-evidence-status': evidenceModule,
  '@/lib/assessments/score-change-reading': changeModule,
  './free-course-banner': { FreeCourseBanner: () => null },
}
function compile(name) {
  const compiled = ts.transpileModule(read('components/app/' + name + '.jsx'), { fileName: name + '.jsx', compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const compiledModule = { exports: {} }
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
    assert.ok(modules[name], 'Unexpected component dependency: ' + name)
    return modules[name]
  } })
  modules['./' + name] = compiledModule.exports
  return compiledModule.exports
}
compile('assessment-gauge')
const { GuestScaleInterpretation } = compile('guest-scale-interpretation')
const { CompactAssessmentReport } = compile('compact-assessment-report')
const { TestFinishActions } = compile('test-finish-actions')

function scored(definition, profile = 'min') {
  return { ...scoreAssessment(definition, Object.fromEntries(definition.questions.map((q, index) => {
    const min = q.min ?? definition.answerScale.min, max = q.max ?? definition.answerScale.max
    return [q.id, profile === 'max' ? max : profile === 'mixed' ? min + index % (max - min + 1) : min]
  }))), id: 'displayed-result' }
}
function gaugeFixture(card) {
  const gauge = marked(card, 'data-assessment-gauge'), needle = tagged(gauge, 'line')
  return {
    numeric: textOf(tagged(gauge, 'strong')),
    gaugeCount: elements(card).filter(node => Object.hasOwn(node.props, 'data-assessment-gauge')).length,
    gaugeScale: gauge?.props['data-gauge-scale'],
    answerScale: gauge?.props['data-answer-anchor-scale'],
    answerSegments: elements(gauge).filter(node => node.type === 'path' && node.props['data-answer-anchor']).map(node => ({ code: node.props['data-answer-anchor'], path: node.props.d, width: String(node.props.strokeWidth) })),
    segmentCodes: elements(gauge).filter(node => node.type === 'path' && node.props['data-band-code']).map(node => node.props['data-band-code']),
    segments: elements(gauge).filter(node => node.type === 'path' && node.props['data-band-code']).map(node => ({ code: node.props['data-band-code'], path: node.props.d, width: String(node.props.strokeWidth) })),
    endpoints: textOf([].concat(gauge?.props.children).find(node => node?.type === 'div' && node.props['aria-hidden'] === 'true')),
    intervals: elements(gauge).filter(node => node.type === 'li').map(node => ({
      text: textOf(node).replace(/\s+/g, ' ').trim(), current: node.props['aria-current'] === 'true', markedCurrent: node.props['data-current-band'] === true,
    })),
    gaugeKind: gauge?.props['data-assessment-gauge'], gaugeLabel: gauge?.props['aria-label'],
    caption: textOf(tagged(gauge, 'figcaption')), caution: textOf(tagged(gauge, 'small')),
    svgCount: elements(card).filter(node => node.type === 'svg').length,
    progressCount: elements(card).filter(node => node.props.role === 'progressbar').length,
    needle: needle ? Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(needle.props[key])])) : null,
  }
}
function fixture(result, locale) {
  const tree = GuestScaleInterpretation({ result, locale })
  const scales = elements(tree).filter(node => Object.hasOwn(node.props, 'data-guest-scale')).map(card => ({
    ...gaugeFixture(card), key: card.props['data-guest-scale'], title: textOf(tagged(card, 'h5')), text: textOf(card),
    band: textOf([].concat(card.props.children).find(node => node?.type === 'p')),
  }))
  return { scales, text: textOf(tree), scoreOnly: Object.hasOwn(tree.props, 'data-score-only'), scaleCount: tree.props['data-scale-count'],
    detailsCount: elements(tree).filter(node => node.type === 'details').length,
    source: `${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`,
    accountAnalysisCount: 0, analysisCtaCount: 1, analysisLabel: guestAnalysisLabel(locale) }
}
const scaleTriggers = tree => elements(tree).filter(node => Object.hasOwn(node.props, 'data-assessment-scale-trigger'))
function accountFixture(result, locale, component = CompactAssessmentReport) {
  const report = buildAssessmentResultReport(result, locale), scales = []
  hookValues = []
  const render = () => { hookCursor = 0; return component({ result, locale, report }) }
  let tree = render()
  const scaleKeys = scaleTriggers(tree).map(node => node.props['data-assessment-scale-trigger'])
  assert.deepEqual(scaleKeys, report.sections.map(section => section.key), 'Every scored scale has its own ordered trigger')
  for (const [index, section] of report.sections.entries()) {
    const trigger = scaleTriggers(tree)[index]
    assert.equal(trigger.type, 'button')
    assert.ok(!trigger.props.disabled, 'Every scale trigger must be enabled')
    assert.equal(typeof trigger.props.onClick, 'function', 'Every scale must be reachable through its trigger')
    trigger.props.onClick()
    tree = render()
    const card = marked(tree, 'data-active-scale')
    assert.ok(card, 'Scale selector must reveal a scored card for ' + section.key)
    assert.equal(card.props['data-active-scale'], section.key, 'Clicking each trigger must select its own scale')
    scales.push({
      ...gaugeFixture(card), key: card.props['data-active-scale'], title: textOf(tagged(card, 'h3')), text: textOf(card),
      activeCount: elements(tree).filter(node => Object.hasOwn(node.props, 'data-active-scale')).length,
      pressedKeys: scaleTriggers(tree).filter(node => node.props['aria-pressed'] === true).map(node => node.props['data-assessment-scale-trigger']),
      rootGaugeCount: elements(tree).filter(node => Object.hasOwn(node.props, 'data-assessment-gauge')).length,
      rangeHeading: textOf(tagged(marked(card, 'data-assessment-range-report'), 'h4')),
      rangeNarrative: textOf(marked(card, 'data-range-characterization')),
      rangeDetails: elements(card).filter(node => Object.hasOwn(node.props, 'data-score-range-description')).map(node => ({code:node.props['data-score-range-description'],heading:textOf(tagged(node,'strong')),note:textOf(tagged(node,'p')),current:node.props['data-selected-score-description'] === true})),
      publishedBands: [].concat((marked(card, 'data-all-score-ranges') || marked(card, 'data-score-band-strip'))?.props.children || []).flat().filter(n => n?.type === 'span' || n?.type === 'li').map(node => ({
        range: textOf(tagged(node, 'b')),
        label: textOf([].concat(node.props.children).find(n => n?.type === 'span')) || [].concat(node.props.children).filter(n => typeof n === 'string').join('').replace(/ · (?:ваш|yours)$/, '').trim(),
        current: node.props['aria-current'] === 'true',
      })),
      primaryCount: elements(card).filter(node => Object.hasOwn(node.props, 'data-primary-support')).length,
      primaryText: textOf(marked(card, 'data-primary-support')),
      answerReadingCount: elements(card).filter(node => node.props['data-answer-interpretation']).length,
      answerRangesCount: elements(card).filter(node => node.props['data-answer-ranges']).length,
      answerReading: textOf(marked(card, 'data-answer-interpretation')),
      answerReadingLabel: textOf(elements(marked(card, 'data-answer-interpretation')).filter(node => node.type === 'p')[0]),
      answerReadingTitle: textOf(elements(marked(card, 'data-answer-interpretation')).filter(node => node.type === 'p')[1]),
      answerRangesHeading: textOf(tagged(marked(card, 'data-answer-ranges'), 'h4')),
      answerCaveat: textOf(tagged(marked(card, 'data-answer-ranges'), 'p')),
      answerRanges: elements(marked(card, 'data-answer-ranges')).filter(node => node.type === 'li').map(node => ({
        level: String(node.props['data-answer-level']),
        range: textOf(tagged(node, 'strong')),
        levelLabel: textOf(tagged(node, 'b')),
        label: textOf(tagged(node, 'small') || tagged(node, 'b')),
        note: textOf([].concat(find(node, item => item.type === 'span' && !item.props['aria-hidden']).props.children).filter(item => item?.type === 'span').at(-1)),
        current: node.props['aria-current'] === 'true', markedCurrent: node.props['data-active-answer-range'] === true,
        marker: textOf(tagged(node, 'em')),
      })),
      sources: elements(marked(tree, 'data-assessment-methodology')).filter(node => node.type === 'a' && node.props.href).map(node => node.props.href),
    })
  }
  hookValues = []
  return { scales, scaleKeys, text: textOf(tree), methodology: textOf(marked(tree, 'data-assessment-methodology')), guestCount: 0 }
}

for (const d of definitions) for (const locale of ['en', 'ru']) test(`${d.id}: ${locale} rendered score-only scales and full account explanations`, () => {
  for (const profile of ['min', 'mixed', 'max']) {
    const result = scored(d, profile), snapshot = fixture(result, locale), account = accountFixture(result, locale)
    assertGuestSnapshot(snapshot, result, locale)
    assertAccountReportSnapshot(account, result, locale)
    const report = buildAssessmentResultReport(result, locale)
    for (const mutate of [
      s => s.scales.pop(),
      s => { s.scales.push(structuredClone(s.scales[0])) },
      s => { s.scales[0].numeric = '999 / 999' },
      s => { s.scales[0].key = 'another-scale' },
      s => { s.scales[0].title = 'another construct' },
      s => { s.scales[0].gaugeCount = 2 },
      s => { s.scales[0].gaugeKind = 'wrong-orientation' },
      s => { s.scales[0].gaugeScale = 'wrong-category-model' },
      s => { s.scales[0].progressCount = 1 },
      s => { s.scales[0].band = 'Invented clinical band' },
      s => { s.scales[0].intervals.push({ text: 'Invented 0–33 clinical category', current: true }) },
      s => { s.scales[0].segmentCodes.push('fabricated-third') },
      s => { s.scales[0].segments.push({ code: 'fabricated-third', path: '', width: '16' }) },
      s => { s.scales[0].endpoints = '999999' },
      s => { s.scales[0].text += ' 100%' },
      s => { s.scales[0].text += ' Unexpected full analysis' },
      s => { s.source = 'another-test · v1 · EN' },
      s => { s.source = `${result.definitionKey} · wrong-version · ${result.instrumentLocale.toUpperCase()}` },
      s => { s.source = `${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale === 'en' ? 'RU' : 'EN'}` },
      s => { s.scoreOnly = false },
      s => { s.scaleCount += 1 },
      s => { s.detailsCount = 1 },
      s => { s.accountAnalysisCount = 1 },
      s => { s.analysisCtaCount = 0 },
      s => { s.analysisCtaCount = 2 },
      s => { s.analysisLabel = guestAnalysisLabel(locale === 'ru' ? 'en' : 'ru') },
    ]) { const broken = structuredClone(snapshot); mutate(broken); assert.throws(() => assertGuestSnapshot(broken, result, locale)) }
    if (snapshot.scales.length > 1) {
      const broken = structuredClone(snapshot); [broken.scales[0], broken.scales[1]] = [broken.scales[1], broken.scales[0]]
      assert.throws(() => assertGuestSnapshot(broken, result, locale))
    }
    if (snapshot.scales[0].intervals.length) {
      for (const mutate of [
        s => { s.scales[0].intervals.pop() },
        s => { s.scales[0].intervals[0].current = !s.scales[0].intervals[0].current },
        s => { s.scales[0].intervals[0].markedCurrent = !s.scales[0].intervals[0].markedCurrent },
        s => { s.scales[0].intervals[0].text = 'Invented published cutoff' },
      ]) { const broken = structuredClone(snapshot); mutate(broken); assert.throws(() => assertGuestSnapshot(broken, result, locale)) }
    }
    const brokenGauge = structuredClone(snapshot)
    if (result.definitionKey === 'asrs-6') {
      brokenGauge.scales[0].svgCount = 1
      const wrongThreshold = structuredClone(snapshot); wrongThreshold.scales[0].caption = 'Wrong screening threshold'
      assert.throws(() => assertGuestSnapshot(wrongThreshold, result, locale))
      const missingCaution = structuredClone(snapshot); missingCaution.scales[0].caution = ''
      assert.throws(() => assertGuestSnapshot(missingCaution, result, locale))
      const wrongCurrent = structuredClone(snapshot); wrongCurrent.scales[0].intervals[0].current = !wrongCurrent.scales[0].intervals[0].current
      assert.throws(() => assertGuestSnapshot(wrongCurrent, result, locale))
      const missingBand = structuredClone(snapshot); missingBand.scales[0].band = ''
      assert.throws(() => assertGuestSnapshot(missingBand, result, locale))
    } else brokenGauge.scales[0].needle.x2 += 1
    assert.throws(() => assertGuestSnapshot(brokenGauge, result, locale))
    for (const text of [report.methodology, report.note, report.sections[0].meaning, report.sections[0].followUp, report.sections[0].steps[0]].filter(Boolean))
      assert.throws(() => assertGuestSnapshot({ ...snapshot, text: snapshot.text + ' ' + text }, result, locale))
    for (const mutate of [
      s => { s.scales.pop() },
      s => { s.scales.push(structuredClone(s.scales[0])) },
      s => { s.scaleKeys.pop() },
      s => { s.scaleKeys.push(s.scaleKeys[0]) },
      s => { s.scaleKeys[0] = 'another-scale' },
      s => { s.scales[0].key = 'another-scale' },
      s => { s.scales[0].activeCount = 2 },
      s => { s.scales[0].pressedKeys = [] },
      s => { s.scales[0].pressedKeys.push('another-scale') },
      s => { s.scales[0].rootGaugeCount = 2 },
      s => { s.scales[0].title = 'another construct' },
      s => { s.scales[0].numeric = '999 / 999' },
      s => { s.scales[0].gaugeCount = 0 },
      s => { s.scales[0].gaugeCount = 2 },
      s => { s.scales[0].gaugeKind = 'wrong-orientation' },
      s => { s.scales[0].gaugeScale = 'wrong-category-model' },
      s => { s.scales[0].caption = 'Invented interpretation' },
      s => { s.scales[0].caution = 'Invented clinical certainty' },
      s => { s.scales[0].progressCount = 1 },
      s => { s.scales[0].intervals.push({ text: 'Invented 0–33 clinical category', current: true }) },
      s => { s.scales[0].segmentCodes.push('fabricated-third') },
      s => { s.scales[0].segments.push({ code: 'fabricated-third', path: '', width: '16' }) },
      s => { s.scales[0].endpoints = '999999' },
      s => { s.scales[0].sources = ['https://example.invalid/invented-source'] },
      s => { s.scales[0].primaryCount = 0 },
      s => { s.scales[0].primaryCount = 2 },
      s => { s.scales[0].primaryText = 'Unrelated advice' },
      s => { s.scales[0].text = s.scales[0].text.replaceAll(report.sections[0].meaning, '') },
      s => { s.scales[0].text = s.scales[0].text.replace(/(?:Score|Баллы): [^·]+· (?:range|шкала) [^ ]+/, 'Score: 999 · range 0–999') },
      s => { s.methodology = '' },
      s => { s.text = s.text.replace(report.note, '') },
      s => { s.guestCount = 1 },
    ]) { const broken = structuredClone(account); mutate(broken); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
    for (const original of [snapshot, account]) {
      const verify = original === snapshot ? assertGuestSnapshot : assertAccountReportSnapshot
      for (const mutate of [
        s => { s.scales[0].answerScale = 'invented-clinical-bands' },
        s => { s.scales[0].answerSegments.push({ code: 'fabricated-response', path: '', width: '16' }) },
      ]) { const broken = structuredClone(original); mutate(broken); assert.throws(() => verify(broken, result, locale)) }
    }
    if (account.scales[0].answerRanges.length) {
      for (const mutate of [
        s => { s.scales[0].answerScale = undefined },
        s => { s.scales[0].answerSegments.pop() },
        s => { s.scales[0].answerSegments[0].code = 'another-response' },
        s => { s.scales[0].answerSegments[0].path = 'M 0 0 A 78 78 0 0 1 200 0' },
        s => { s.scales[0].answerSegments[0].width = '999' },
        s => { s.scales[0].answerReadingCount = 0 },
        s => { s.scales[0].answerRangesCount = 2 },
        s => { s.scales[0].answerReading = '' },
        s => { s.scales[0].answerReadingLabel = 'Unrelated interpretation' },
        s => { s.scales[0].answerReadingTitle = 'Invented response level' },
        s => { s.scales[0].answerRangesHeading = 'All clinical categories' },
        s => { s.scales[0].answerCaveat = '' },
        s => { s.scales[0].answerRanges.pop() },
        s => { s.scales[0].answerRanges[0].level = '99' },
        s => { s.scales[0].answerRanges[0].range = '0–100' },
        s => { s.scales[0].answerRanges[0].levelLabel = 'Invented spiritual rank' },
        s => { s.scales[0].answerRanges[0].note = 'Unrelated narrative' },
        s => { s.scales[0].answerRanges[0].label = 'Invented clinical norm' },
        s => { s.scales[0].answerRanges[0].current = !s.scales[0].answerRanges[0].current },
        s => { s.scales[0].answerRanges[0].markedCurrent = !s.scales[0].answerRanges[0].markedCurrent },
        s => { s.scales[0].answerRanges[0].marker = 'Invented current response' },
      ]) { const broken = structuredClone(account); mutate(broken); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
    }
    if (account.scales.length > 1) {
      for (const field of ['scales', 'scaleKeys']) {
        const broken = structuredClone(account); [broken[field][0], broken[field][1]] = [broken[field][1], broken[field][0]]
        assert.throws(() => assertAccountReportSnapshot(broken, result, locale))
        const duplicated = structuredClone(account); duplicated[field][1] = structuredClone(duplicated[field][0])
        assert.throws(() => assertAccountReportSnapshot(duplicated, result, locale))
      }
    }
    if (account.scales[0].intervals.length) {
      for (const mutate of [
        s => { s.scales[0].intervals.pop() },
        s => { s.scales[0].intervals[0].current = !s.scales[0].intervals[0].current },
        s => { s.scales[0].intervals[0].markedCurrent = !s.scales[0].intervals[0].markedCurrent },
        s => { s.scales[0].intervals[0].text = 'Invented published cutoff' },
      ]) { const broken = structuredClone(account); mutate(broken); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
    }
    for (const original of [snapshot, account]) if (original.scales[0].segments.length) {
      const verify = original === snapshot ? assertGuestSnapshot : assertAccountReportSnapshot
      for (const mutate of [
        s => { s.scales[0].segments[0].path = 'M 0 0 A 78 78 0 0 1 200 0' },
        s => { s.scales[0].segments[0].width = '999' },
      ]) { const broken = structuredClone(original); mutate(broken); assert.throws(() => verify(broken, result, locale)) }
    }
    const brokenAccountGauge = structuredClone(account)
    if (result.definitionKey === 'asrs-6') brokenAccountGauge.scales[0].svgCount = 1
    else {
      brokenAccountGauge.scales[0].needle.x2 += 1
      const wrongLabel = structuredClone(account); wrongLabel.scales[0].gaugeLabel = 'Wrong source range'
      assert.throws(() => assertAccountReportSnapshot(wrongLabel, result, locale))
    }
    assert.throws(() => assertAccountReportSnapshot(brokenAccountGauge, result, locale))
    for (const limitation of report.sections[0].limitations || []) {
      const broken = structuredClone(account); broken.scales[0].text = broken.scales[0].text.replaceAll(limitation, '')
      assert.throws(() => assertAccountReportSnapshot(broken, result, locale))
      assert.throws(() => assertGuestSnapshot({ ...snapshot, text: snapshot.text + ' ' + limitation }, result, locale))
    }
    const step = report.sections[0].steps[0]
    if (step) { const broken = structuredClone(account); broken.scales[0].text = broken.scales[0].text.replace(step, ''); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
  }
  const result = scored(d)
  const payload = { sourceKind: 'guest_result', sourceId: result.id, operationId: '00000000-0000-4000-8000-000000000000' }
  assertGuestSaveIntent(payload, result)
  for (const broken of [{ ...payload, sourceId: 'another-result' }, { ...payload, sourceKind: 'guest_plan' }, { ...payload, operationId: 'not-a-uuid' }, { ...payload, resultIds: [result.id, 'another-result'] }])
    assert.throws(() => assertGuestSaveIntent(broken, result))
})

test('sector verification tolerates engine rounding but rejects malformed or shifted geometry', () => {
  for (const key of ['phq-9', 'brcs']) for (const locale of ['en', 'ru']) {
    const result = scored(getAssessmentDefinition(key, 'v1', 'en'), 'mixed')
    for (const [original, verify] of [[fixture(result, locale), assertGuestSnapshot], [accountFixture(result, locale), assertAccountReportSnapshot]]) {
      assert.ok(original.scales[0].segments.length)
      const rounded = structuredClone(original)
      for (const scale of rounded.scales) for (const segment of scale.segments) {
        const tokens = segment.path.split(' ')
        for (const index of [1, 2, 9, 10]) tokens[index] = Number(tokens[index]).toFixed(8)
        segment.path = tokens.join(' ')
      }
      assert.notDeepEqual(rounded.scales[0].segments, original.scales[0].segments, 'Exercise changed coordinate serialization')
      assert.doesNotThrow(() => verify(rounded, result, locale), 'Subpixel engine rounding must not invalidate exact source bands')
      for (const mutate of [
        segment => { segment.code = 'unpublished-band' },
        segment => { segment.path = segment.path.replace(/^M /, 'm ') },
        segment => { segment.path = segment.path.replace(' A ', ' L ') },
        segment => { segment.path = segment.path.replace(' A 78 78 ', ' A 77 78 ') },
        segment => { segment.path = segment.path.replace(' 0 0 1 ', ' 0 1 1 ') },
        segment => { segment.path += ' Z' },
        segment => { segment.path = segment.path.replace(/^M \S+/, 'M NaN') },
        segment => { segment.path = segment.path.replace(/^M \S+/, 'M Infinity') },
        segment => { segment.path = segment.path.replace(/^M \S+/, 'M 1e999') },
        segment => { segment.path = segment.path.split(' ').slice(0, -1).join(' ') },
        ...[1, 2, 9, 10].map(index => segment => {
          const tokens = segment.path.split(' ')
          tokens[index] = String(Number(tokens[index]) + 0.001)
          segment.path = tokens.join(' ')
        }),
      ]) {
        const broken = structuredClone(original)
        mutate(broken.scales[0].segments[0])
        assert.throws(() => verify(broken, result, locale), 'Malformed or materially shifted source arcs must fail')
      }
    }
  }
})

test('account verifier rejects unreachable, missing, reordered and duplicate scale triggers', () => {
  const result = scored(PERSONALITY_TYPE_DEFINITIONS[0], 'mixed')
  assert.ok(buildAssessmentResultReport(result, 'en').sections.length > 1)
  for (const mutate of [
    triggers => { triggers.forEach(node => { node.props.onClick = () => {} }) },
    triggers => { triggers[0].props.disabled = true },
    triggers => { delete triggers[0].props.onClick },
    triggers => { delete triggers[0].props['data-assessment-scale-trigger'] },
    triggers => { triggers[1].props['data-assessment-scale-trigger'] = triggers[0].props['data-assessment-scale-trigger'] },
    triggers => {
      const first = triggers[0].props['data-assessment-scale-trigger']
      triggers[0].props['data-assessment-scale-trigger'] = triggers[1].props['data-assessment-scale-trigger']
      triggers[1].props['data-assessment-scale-trigger'] = first
    },
  ]) {
    const broken = props => {
      const tree = CompactAssessmentReport(props)
      mutate(scaleTriggers(tree))
      return tree
    }
    assert.throws(() => accountFixture(result, 'en', broken))
  }
})

test('guest and selected account verifiers reject tampered or missing versioned provenance', () => {
  const fields = ['definitionId', 'definitionKey', 'definitionVersion', 'instrumentLocale', 'translationVersion',
    'contentHash', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe']
  for (const definition of definitions) for (const locale of ['en', 'ru']) {
    const result = scored(definition, 'mixed'), guest = fixture(result, locale), account = accountFixture(result, locale)
    for (const field of fields) for (const missing of [false, true]) {
      const broken = structuredClone(result)
      if (missing) delete broken[field]
      else broken[field] = 'tampered-provenance'
      assert.throws(() => assertGuestSnapshot(guest, broken, locale), `${definition.key}: guest must reject ${field}`)
      assert.throws(() => assertAccountReportSnapshot(account, broken, locale), `${definition.key}: account must reject ${field}`)
    }
    for (const field of ['min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct']) {
      const broken = structuredClone(result)
      broken.dimensions[0][field] = typeof broken.dimensions[0][field] === 'number' ? broken.dimensions[0][field] + 1 : 'tampered-dimension'
      assert.throws(() => assertGuestSnapshot(guest, broken, locale), `${definition.key}: guest must reject dimension ${field}`)
      assert.throws(() => assertAccountReportSnapshot(account, broken, locale), `${definition.key}: account must reject dimension ${field}`)
    }
    // A tampered result must also fail closed in the actual account component,
    // rather than rendering a plausible but unverified continuous score.
    const broken = { ...result, contentHash: 'tampered-provenance' }
    const rendered = accountFixture(broken, locale)
    for (const scale of rendered.scales) {
      assert.equal(scale.gaugeCount, 0, 'Invalid provenance must not produce a numeric gauge')
      assert.deepEqual(scale.intervals, [], 'Invalid provenance must not inherit source intervals')
      assert.deepEqual(scale.segmentCodes, [], 'Invalid provenance must not inherit source sectors')
      assert.equal(scale.needle, null)
      assert.deepEqual(scale.sources, [], 'Invalid provenance must not inherit a trusted source link')
    }
    assert.throws(() => assertAccountReportSnapshot(rendered, broken, locale))
  }
})

test('actual finish controls and canonical guest/account components bind the audience contract', () => {
  for (const locale of ['en', 'ru']) {
    const tree = TestFinishActions({ locale, temporary: true, guestScaleOnly: true })
    const buttons = elements(tree).filter(node => node.type === 'button')
    assert.equal(buttons.length, 1)
    assert.ok(textOf(buttons[0]).includes(guestFinishLabel(locale)))
  }
  assert.equal(guestFinishLabel('en'), 'See my scores and scales')
  assert.equal(guestFinishLabel('ru'), 'Посмотреть шкалы и баллы')
  const component = read('components/app/guest-scale-interpretation.jsx')
  for (const token of ['data-guest-scale-interpretation', 'data-score-only', 'data-scale-count={cards.length}', 'data-guest-scale={section.key}', '<ScoreGauge dimension={dimension}', "section.bandBasis === 'screening'"]) assert.ok(component.includes(token), token)
  assert.doesNotMatch(component, /section\.meaning|section\.steps|report\.methodology|report\.note|PersonalResultReport|personalityType/)
  const cabinet = read('components/app/cabinet-landing.jsx')
  for (const locale of ['en', 'ru']) assert.ok(cabinet.includes("save: '" + guestAnalysisLabel(locale) + "'"))
  assert.match(cabinet, /aria-hidden="true">G<\/span>/)
  assert.match(cabinet, /aria-hidden="true">→<\/span>/)
  assert.match(cabinet, /guestResult\.definitionKey\} · \{guestResult\.definitionVersion\} · \{guestResult\.instrumentLocale\?\.toUpperCase\(\)\}/)
  const account = read('components/app/compact-assessment-report.jsx')
  for (const token of ['data-personal-result-report', 'data-assessment-scale-trigger={item.key}', 'data-active-scale={section.key}', 'result={result}', 'section.limitations', '{section.meaning}', '{report.methodology}', '{report.note}']) assert.ok(account.includes(token), token)
})

test('all five audience-specific browser verifiers keep exact guest and authenticated report checks', () => {
  for (const name of ['personality-types', 'mhc-sf', 'compassion-assessments', 'asrs6', 'relationships-assessments']) {
    const script = read('scripts/verify-' + name + '.mjs')
    assert.match(script, /guest\s*\?\s*guestFinishLabel\(locale\)/)
    assert.match(script, /await assertGuestScaleResult\(page,\s*expect,\s*(result|stored),\s*locale\)/)
    assert.match(script, /await assertAccountScaleReport\(page,\s*expect,\s*(result|stored),\s*locale\)/)
    assert.ok(script.includes('[data-personal-result-report]'), 'Existing account report assertions retained')
  }
})


test('Tantric reports retain all five source-bound descriptive levels on every reachable scale', () => {
  for (const definition of TANTRIC_REFLECTION_DEFINITIONS) for (const locale of ['en', 'ru']) {
    const result = scored(definition, 'mixed'), snapshot = accountFixture(result, locale)
    assertAccountReportSnapshot(snapshot, result, locale)
    for (const [index, scale] of snapshot.scales.entries()) {
      assert.equal(scale.rangeDetails.length, 5)
      assert.equal(scale.rangeDetails.filter(range => range.current).length, 1)
      for (const field of ['code', 'heading', 'note', 'current']) for (let level = 0; level < 5; level++) {
        const broken = structuredClone(snapshot)
        broken.scales[index].rangeDetails[level][field] = 'tampered-' + field
        assert.throws(() => assertAccountReportSnapshot(broken, result, locale), definition.key + ': exact range ' + field)
      }
      for (const field of ['rangeHeading','rangeNarrative']) {
        const broken = structuredClone(snapshot); broken.scales[index][field] = 'retired reading'
        assert.throws(() => assertAccountReportSnapshot(broken, result, locale))
      }
    }
  }
})
