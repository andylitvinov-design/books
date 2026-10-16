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
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../data/assessments/personality-types-original-2026.js'
import { MHC_SF_DEFINITIONS } from '../data/assessments/mhc-sf-adult-dec2011.js'
import { COMPASSION_DEFINITIONS } from '../data/assessments/compassion-2026.js'
import { ASRS6_DEFINITIONS } from '../data/assessments/asrs-v1-6-nyu.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
const { buildAssessmentResultReport } = reportModule
const definitions = [...PERSONALITY_TYPE_DEFINITIONS, ...MHC_SF_DEFINITIONS, ...COMPASSION_DEFINITIONS, ...ASRS6_DEFINITIONS, ...RELATIONSHIPS_INTIMACY_DEFINITIONS,
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
const modules = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@/lib/assessments/result-report': reportModule,
  '@/lib/assessments/dashboard-gauges': gaugeModule,
  '@/lib/assessments/scale-guides': guideModule,
  '@/lib/assessments/result-overview': overviewModule,
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
function fixture(result, locale) {
  const tree = GuestScaleInterpretation({ result, locale })
  const scales = elements(tree).filter(node => Object.hasOwn(node.props, 'data-guest-scale')).map(card => {
    const gauge = marked(card, 'data-assessment-gauge'), needle = tagged(gauge, 'line')
    return {
      key: card.props['data-guest-scale'], title: textOf(tagged(card, 'h5')), numeric: textOf(tagged(gauge, 'strong')), text: textOf(card),
      band: textOf([].concat(card.props.children).find(node => node?.type === 'p')),
      gaugeCount: elements(card).filter(node => Object.hasOwn(node.props, 'data-assessment-gauge')).length,
      gaugeScale: gauge?.props['data-gauge-scale'],
      segmentCodes: elements(gauge).filter(node => node.type === 'path' && node.props['data-band-code']).map(node => node.props['data-band-code']),
      endpoints: textOf([].concat(gauge?.props.children).find(node => node?.type === 'div' && node.props['aria-hidden'] === 'true')),
      intervals: elements(gauge).filter(node => node.type === 'li').map(node => ({
        text: textOf(node).replace(/\s+/g, ' ').trim(), current: node.props['aria-current'] === 'true',
      })),
      gaugeKind: gauge?.props['data-assessment-gauge'], gaugeLabel: gauge?.props['aria-label'],
      caption: textOf(tagged(gauge, 'figcaption')), caution: textOf(tagged(gauge, 'small')),
      svgCount: elements(card).filter(node => node.type === 'svg').length,
      progressCount: elements(card).filter(node => node.props.role === 'progressbar').length,
      needle: needle ? Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(needle.props[key])])) : null,
    }
  })
  return { scales, text: textOf(tree), scoreOnly: Object.hasOwn(tree.props, 'data-score-only'), scaleCount: tree.props['data-scale-count'],
    detailsCount: elements(tree).filter(node => node.type === 'details').length,
    source: `${result.definitionKey} · ${result.definitionVersion} · ${result.instrumentLocale.toUpperCase()}`,
    accountAnalysisCount: 0, analysisCtaCount: 1, analysisLabel: guestAnalysisLabel(locale) }
}
function accountFixture(result, locale) {
  const tree = CompactAssessmentReport({ result, locale, report: buildAssessmentResultReport(result, locale) })
  return { scales: elements(marked(tree, 'data-assessment-scales')).filter(node => node.type === 'article').map(card => ({ title: textOf(tagged(card, 'h3')), text: textOf(card) })),
    text: textOf(tree), methodology: textOf(marked(tree, 'data-assessment-methodology')), guestCount: 0 }
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
      s => { s.scales[0].title = 'another construct' },
      s => { s.scales[0].text = s.scales[0].text.replace(report.sections[0].meaning, '') },
      s => { s.scales[0].text = s.scales[0].text.replace(/(?:Score|Баллы): [^·]+· (?:range|шкала) [^ ]+/, 'Score: 999 · range 0–999') },
      s => { s.methodology = '' },
      s => { s.text = s.text.replace(report.note, '') },
      s => { s.guestCount = 1 },
    ]) { const broken = structuredClone(account); mutate(broken); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
    const step = report.sections[0].steps[0]
    if (step) { const broken = structuredClone(account); broken.scales[0].text = broken.scales[0].text.replace(step, ''); assert.throws(() => assertAccountReportSnapshot(broken, result, locale)) }
  }
  const result = scored(d)
  const payload = { sourceKind: 'guest_result', sourceId: result.id, operationId: '00000000-0000-4000-8000-000000000000' }
  assertGuestSaveIntent(payload, result)
  for (const broken of [{ ...payload, sourceId: 'another-result' }, { ...payload, sourceKind: 'guest_plan' }, { ...payload, operationId: 'not-a-uuid' }, { ...payload, resultIds: [result.id, 'another-result'] }])
    assert.throws(() => assertGuestSaveIntent(broken, result))
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
  for (const token of ['data-personal-result-report', '{section.meaning}', '{report.methodology}', '{report.note}']) assert.ok(account.includes(token), token)
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
