import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { gaugeModel, gaugeChange, periodComparison } from '../lib/assessments/dashboard-gauges.js'
import { scoreChangeReading } from '../lib/assessments/score-change-reading.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const load = (path, imports) => {
  const code = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} }
  runInNewContext(code, {
    exports: loaded.exports,
    require: name => imports[name] || (name.endsWith('.module.css')
      ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) } : require(name)),
  })
  return loaded.exports
}
const gauges = load('components/app/assessment-gauge.jsx', {
  '@/lib/assessments/dashboard-gauges': { gaugeModel, gaugeChange },
  '@/lib/assessments/score-change-reading': { scoreChangeReading },
})
const { GuestScaleInterpretation } = load('components/app/guest-scale-interpretation.jsx', {
  '@/lib/assessments/result-report': { buildAssessmentResultReport }, './assessment-gauge': gauges,
})
const expand = node => node == null || typeof node !== 'object' ? node
  : Array.isArray(node) ? node.map(expand)
    : typeof node.type === 'function' ? expand(node.type(node.props))
      : { ...node, props: { ...node.props, children: expand(node.props.children) } }
const walk = node => node == null || typeof node === 'boolean' ? []
  : Array.isArray(node) ? node.flatMap(walk)
    : typeof node === 'object' ? [node, ...walk(node.props?.children)] : [node]
const nodes = tree => walk(expand(tree)).filter(node => typeof node === 'object')
const text = tree => walk(expand(tree)).filter(node => ['string', 'number'].includes(typeof node)).join(' ')
const scored = (key, instrumentLocale = 'en') => {
  const definition = getAssessmentDefinition(key, 'v1', instrumentLocale)
  assert.ok(definition, key)
  return scoreAssessment(definition, Object.fromEntries(definition.questions.map(question =>
    [question.id, question.min ?? definition.answerScale.min])))
}
const valueAt = (result, value, index = 0) => ({ ...result, dimensions: result.dimensions.map((dimension, i) =>
  i === index ? { ...dimension, value } : dimension) })

test('published PHQ-9 sectors use source intervals and select exact cutoff scores in EN/RU', () => {
  const original = scored('phq-9')
  for (const locale of ['en', 'ru']) for (const [value, code] of [
    [0, 'minimal'], [4, 'minimal'], [5, 'mild'], [9, 'mild'], [10, 'moderate'],
    [14, 'moderate'], [15, 'moderately_severe'], [19, 'moderately_severe'], [20, 'severe'], [27, 'severe'],
  ]) {
    const result = valueAt(original, value)
    const dimension = result.dimensions[0]
    const model = gaugeModel(dimension, result, locale)
    assert.equal(model.currentBand.code, code)
    assert.equal(model.continuous, false)
    assert.deepEqual(model.bands.map(band => [band.from, band.to]), [[0,4], [5,9], [10,14], [15,19], [20,27]])
    assert.ok(Math.abs(model.bands.reduce((sum, band) => sum + band.endFraction - band.startFraction, 0) - 1) < 1e-12)
    const tree = gauges.ScoreGauge({ dimension, result, locale })
    const rendered = nodes(tree)
    assert.equal(rendered.filter(node => node.type === 'path' && node.props['data-band-code']).length, 5)
    assert.equal(rendered.filter(node => node.props['aria-current'] === 'true').length, 1)
    assert.ok(text(tree).includes(model.currentBand.label))
    assert.match(text(tree), locale === 'ru' ? /Ваш диапазон/ : /Your range/)
  }
})

test('compact EN/RU band legends retain readable type, wrapping and a current marker', () => {
  const css = read('components/app/assessment-gauge.module.css')
  const legend = css.match(/\.legend\{([^}]+)\}/)?.[1]
  assert.ok(legend, 'Legend rule must exist')
  const font = legend.match(/font:(\d+(?:\.\d+)?)px\/(\d+(?:\.\d+)?)/)
  assert.ok(font && Number(font[1]) >= 13, 'Legend text must be at least 13 CSS pixels')
  assert.ok(Number(font[2]) >= 1.5, 'Legend text keeps comfortable line spacing')
  assert.match(css, /\.legend li\{[^}]*overflow-wrap:anywhere/)
  assert.match(css, /\.legend li\[data-current-band\]\{[^}]*border-color:/)
  assert.match(css, /\.compact\{width:133px\}/)
  assert.match(css, /@media\(max-width:500px\)\{[^\n]*\.compact\{width:113px\}/)
  const result = valueAt(scored('phq-9'), 10)
  for (const locale of ['en', 'ru']) {
    const tree = gauges.ScoreGauge({ dimension: result.dimensions[0], result, locale, compact: true })
    assert.equal(nodes(tree).filter(node => node.type === 'li').length, 5)
    assert.equal(nodes(tree).filter(node => node.props['aria-current'] === 'true').length, 1)
    assert.match(text(tree), locale === 'ru' ? /Ваш диапазон/ : /Your range/)
  }
})

test('continuous, neutral and unverified versions never render decorative clinical sectors', () => {
  const original = scored('phq-9')
  for (const result of [
    scored('cbi-personal'), scored('ipip-big-five-50'), scored('k10'), scored('gad-7', 'ru'),
  ]) {
    const dimension = result.dimensions[0]
    const model = gaugeModel(dimension, result)
    assert.ok(model)
    assert.deepEqual(model.bands, [])
    assert.equal(model.currentBand, null)
    assert.equal(model.continuous, true)
    const tree = gauges.ScoreGauge({ dimension, result })
    assert.equal(nodes(tree).filter(node => node.type === 'path').length, 1)
    assert.match(text(tree), /Continuous scale.*No validated category cutoffs/)
    assert.equal(nodes(tree).filter(node => node.props['aria-current']).length, 0)
  }
  for (const result of [{ ...original, contentHash: 'not-the-reviewed-form' }, { ...original, definitionVersion: 'unknown' }])
    assert.equal(gaugeModel(result.dimensions[0], result), null)
  assert.equal(gaugeModel(original.dimensions[0]).verified, false)
  assert.equal(gaugeModel({ ...original.dimensions[0], value: NaN }, original), null)
})


test('Insights mini-dials keep the colored scale but omit the narrow inline legend', () => {
  const result = valueAt(scored('gad-7'), 12)
  const full = gauges.ScoreGauge({ dimension: result.dimensions[0], result, locale: 'en' })
  const mini = gauges.ScoreGauge({
    dimension: result.dimensions[0], result, locale: 'en', compact: true,
    showLegend: false, showScaleNote: false,
  })
  const fullPaths = nodes(full).filter(node => node.type === 'path' && node.props['data-band-code'])
  const miniPaths = nodes(mini).filter(node => node.type === 'path' && node.props['data-band-code'])
  assert.ok(fullPaths.length >= 3, 'published screening intervals remain visible in the dial')
  assert.ok(new Set(fullPaths.map(node => node.props.stroke)).size >= 3, 'sectors have multiple colors')
  assert.equal(miniPaths.length, fullPaths.length, 'mini dial keeps all verified sectors')
  assert.equal(nodes(mini).filter(node => node.type === 'li').length, 0, 'no legend crammed into 90px')
  assert.equal(nodes(mini).filter(node => node.type === 'small').length, 0)
  assert.ok(nodes(full).some(node => node.props?.['aria-current'] === 'true'), 'full view retains band information')
})

test('continuous difficulty gauges use one illustrative gradient and neutral traits stay monochrome', () => {
  const cbi = scored('cbi-personal')
  const gradient = nodes(gauges.ScoreGauge({ dimension: cbi.dimensions[0], result: cbi }))
  assert.equal(gradient.filter(node => node.type === 'path').length, 1, 'no fabricated clinical sectors')
  assert.equal(gradient.filter(node => node.type === 'linearGradient').length, 1)
  assert.match(gradient.find(node => node.type === 'path').props.stroke, /^url\(#hh-assessment-gradient-/)
  const trait = scored('ipip-big-five-50')
  const neutral = nodes(gauges.ScoreGauge({ dimension: trait.dimensions[0], result: trait }))
  assert.equal(neutral.filter(node => node.type === 'linearGradient').length, 0)
  assert.equal(neutral.find(node => node.type === 'path').props.stroke, '#728881')
})

test('reference bands preserve nonzero raw ranges and ASRS remains a count without a dial', () => {
  const result = valueAt(scored('brcs'), 14)
  const model = gaugeModel(result.dimensions[0], result)
  assert.equal(model.bandBasis, 'published-reference')
  assert.deepEqual(model.bands.map(band => [band.from, band.to]), [[4,13], [14,16], [17,20]])
  assert.equal(model.currentBand.code, 'mid_coping')
  for (const count of [0,3,4,6]) {
    const asrs = valueAt(scored('asrs-6'), count)
    const tree = gauges.ScoreGauge({ dimension: asrs.dimensions[0], result: asrs })
    assert.equal(nodes(tree).filter(node => node.type === 'svg').length, 0)
    assert.equal(nodes(tree).filter(node => node.props['aria-current'] === 'true').length, 1)
    assert.match(text(tree), /not a diagnosis or severity scale/)
  }
})

test('account recommendations retain source-aware score actions before neutral trait guides', () => {
  for (const key of ['phq-9', 'k10', 'erq', 'cbi-personal', 'ipip-big-five-50', 'hh-disc-style-20']) {
    const original = scored(key)
    for (const locale of ['en', 'ru']) {
      const snapshots = [original.dimensions[0].min, original.dimensions[0].max].map(value => {
        const result = valueAt(original, value)
        const interpretation = interpretationBandModel(result, result.dimensions[0], locale)
        const section = buildAssessmentResultReport(result, locale).sections[0]
        assert.ok(interpretation.actions.length >= 2, key)
        assert.deepEqual(section.steps.slice(0, 2), interpretation.actions.slice(0, 2), key)
        assert.ok(section.meaning.includes(interpretation.meaning), key)
        if (key === 'k10') assert.doesNotMatch(section.steps.join(' '), /personal style|личностн|личности/)
        return section
      })
      assert.notDeepEqual(snapshots[0].steps.slice(0,2), snapshots[1].steps.slice(0,2), key + ' ' + locale)
    }
  }
})

test('guest actual render contains score bands only and cannot expose full account advice', () => {
  for (const key of ['phq-9', 'cbi-personal', 'ipip-big-five-50', 'asrs-6']) {
    const result = scored(key)
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      const tree = GuestScaleInterpretation({ result, locale })
      const visible = text(tree)
      assert.ok(Object.hasOwn(tree.props, 'data-score-only'))
      for (const section of report.sections) {
        assert.equal(visible.includes(section.meaning), false)
        for (const action of section.steps) assert.equal(visible.includes(action), false)
      }
      assert.equal(nodes(tree).some(node => node.type === 'a' || node.type === 'button'), false)
    }
  }
})

test('every gauge surface passes result provenance without changing guest consent controls', () => {
  for (const path of ['compact-assessment-report.jsx', 'guest-scale-interpretation.jsx', 'test-dynamics.jsx'])
    assert.match(read('components/app/' + path), /<ScoreGauge[^>]*result=\{result\}/)
  assert.match(read('components/app/app-workspace.jsx'), /<ScoreGauge[^>]*result=\{latest\}/)
  assert.match(read('components/app/test-dynamics.jsx'), /<ScaleRow[^>]*result=\{group.latest\}/)
  assert.doesNotMatch(read('components/app/assessment-gauge.jsx'), /length: 24|const favorable|const neutral/)
  assert.doesNotMatch(read('lib/assessments/result-report.js'), /BAND_ACTIONS|position < 1 \/ 3|position > 2 \/ 3/)
})


test('mixed-polarity source totals have neutral dials and changes without a health direction', () => {
  for (const key of ['hh-money-pressure', 'hh-screen-saturation', 'hh-overthinking-loop']) {
    const original = scored(key)
    const before = { ...valueAt(original, original.dimensions[0].min), accountId: 'synthetic', id: 'before', measurementAt: '2026-10-01T12:00:00Z' }
    const after = { ...valueAt(original, original.dimensions[0].max), accountId: 'synthetic', id: 'after', measurementAt: '2026-10-02T12:00:00Z' }
    assert.equal(gaugeModel(after.dimensions[0], after).orientation, 'neutral', key)
    assert.equal(gaugeChange(after, before, after.dimensions[0].key).state, 'changed', key)
    assert.match(buildAssessmentResultReport(after).sections[0].limitations.join(' '), /mixed|opposite|difficult|coping/i)
  }
})


test('invalid provenance on either side never yields a trend or a paired baseline', () => {
  for (const key of ['hh-money-pressure', 'hh-screen-saturation', 'hh-overthinking-loop', 'phq-9', 'ipip-big-five-50']) {
    const original = scored(key)
    const previous = { ...valueAt(original, original.dimensions[0].min), accountId: 'synthetic', id: 'before', measurementAt: '2026-10-01T12:00:00Z' }
    const current = { ...valueAt(original, original.dimensions[0].max), accountId: 'synthetic', id: 'after', measurementAt: '2026-10-02T12:00:00Z' }
    const dimensionKey = current.dimensions[0].key
    assert.notEqual(gaugeChange(current, previous, dimensionKey).state, 'baseline', key)
    assert.equal(periodComparison([previous, current]).previous.id, 'before')
    for (const field of ['definitionId', 'definitionKey', 'definitionVersion', 'contentHash', 'instrumentLocale', 'translationVersion', 'scoringKey', 'scoringVersion', 'resultVersion', 'timeframe']) for (const badValue of [undefined, 'unverified']) {
      const badCurrent = { ...current, [field]: badValue }
      const badPrevious = { ...previous, [field]: badValue }
      assert.equal(gaugeModel(badCurrent.dimensions[0], badCurrent), null, key + '/' + field)
      for (const [after, before] of [[badCurrent, previous], [current, badPrevious], [badCurrent, badPrevious]]) {
        assert.deepEqual(gaugeChange(after, before, dimensionKey), { state: 'baseline', delta: null }, key + '/' + field)
        assert.equal(periodComparison([before, after]).previous, null, key + '/' + field)
      }
    }
    const badShape = { ...current, dimensions: current.dimensions.map((dimension, index) => index === 0 ? { ...dimension, sourceConstruct: 'unverified construct' } : dimension) }
    assert.deepEqual(gaugeChange(badShape, previous, dimensionKey), { state: 'baseline', delta: null })
    assert.equal(periodComparison([previous, badShape]).previous, null)
    for (const dimensions of [null, {}, 'invalid']) {
      const invalid = { ...current, dimensions }
      assert.deepEqual(gaugeChange(invalid, previous, dimensionKey), { state: 'baseline', delta: null })
      assert.equal(periodComparison([previous, invalid]).previous, null)
    }
  }
})

test('rejected trait results cannot retain optional personal meanings or type hypotheses', () => {
  for (const key of ['ipip-big-five-50', 'hh-socionics-32', 'hh-enneagram-36', 'hh-disc-style-20', 'hh-temperaments-16']) {
    const original = scored(key)
    for (const locale of ['en', 'ru']) for (const field of ['contentHash', 'translationVersion']) {
      const result = { ...original, [field]: 'unverified' }
      const report = buildAssessmentResultReport(result, locale)
      assert.equal(report.personalityType, null, key)
      report.sections.forEach((section, index) => {
        assert.equal(section.bandBasis, 'unavailable')
        assert.deepEqual(section.steps, [])
        assert.equal(section.meaning, interpretationBandModel(result, result.dimensions[index], locale).meaning)
      })
    }
  }
})
