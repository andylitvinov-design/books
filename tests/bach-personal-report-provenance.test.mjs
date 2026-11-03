import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { BACH_GUIDANCE, buildBachResultReport } from '../lib/assessments/bach-guidance.js'
import { rankBachDimensions } from '../lib/assessments/bach-profile.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { buildClientReport } from '../lib/profile/client-report.js'
import { generateClientPdf } from '../lib/profile/client-report-pdf.js'

// Render the actual dedicated route. A compact-report stand-in deliberately
// throws: passing tests must exercise PersonalResultReport's Bach JSX branch.
const jsx = (type, props, key) => ({ type, props, key })
const runtime = { jsx, jsxs: jsx, Fragment: 'Fragment' }
const loaded = { exports: {} }
const fileName = 'components/app/personal-result-report.jsx'
const code = ts.transpileModule(readFileSync(new URL('../' + fileName, import.meta.url), 'utf8'), {
  fileName, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
runInNewContext(code, { exports: loaded.exports, require: name => {
  const imports = {
    'react/jsx-runtime': runtime,
    'next/link': { default: 'a' },
    '@/lib/assessments/result-report': { buildAssessmentResultReport },
    '@/lib/assessments/scale-guides': { getTestScaleGuide },
    './compact-assessment-report': { CompactAssessmentReport() { throw new Error('Bach routed to compact report') } },
  }
  if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
  assert.ok(imports[name], 'Unexpected import: ' + name)
  return imports[name]
} })
const expand = node => node == null || typeof node !== 'object' ? node
  : Array.isArray(node) ? node.map(expand)
    : typeof node.type === 'function' ? expand(node.type(node.props))
      : { ...node, props: { ...node.props, children: expand(node.props.children) } }
const walk = node => node == null || typeof node === 'boolean' ? []
  : Array.isArray(node) ? node.flatMap(walk)
    : typeof node === 'object' ? [node, ...walk(node.props?.children)] : [node]
const nodes = tree => walk(tree).filter(node => typeof node === 'object')
const text = tree => walk(tree).filter(node => ['string', 'number'].includes(typeof node)).join(' ')
const visibleText = tree => tree == null || typeof tree !== 'object' ? text(tree)
  : Array.isArray(tree) ? tree.map(visibleText).join(' ')
    : tree.type === 'details' && !tree.props.open
      ? text(nodes(tree).find(node => node.type === 'summary')) : visibleText(tree.props?.children)
const render = (result, locale) => expand(loaded.exports.PersonalResultReport({ result, locale }))
const definitions = ['v1', 'v2'].flatMap(version => ['en', 'ru'].map(locale =>
  getAssessmentDefinition('hh-bach-flower-profile', version, locale)))
const answers = (definition, value) => Object.fromEntries(definition.questions.map(question => [question.id, value]))
const scored = (definition, value, changes = {}) => scoreAssessment(definition, { ...answers(definition, value), ...changes })
const withFirst = (result, patch) => ({ ...result, dimensions: [{ ...result.dimensions[0], ...patch }, ...result.dimensions.slice(1)] })

function assertUnverified(result, locale) {
  for (const build of [buildBachResultReport, buildAssessmentResultReport]) {
    const report = build(result, locale)
    assert.equal(report.verified, false)
    assert.equal(report.highlightedCount, 0)
    assert.ok(report.sections.length > 0, 'Even missing dimensions retain a visible warning')
    assert.ok(!report.source)
    if (build === buildAssessmentResultReport)
      assert.equal(report.methodology, assessmentMethodology({ locale }).text)
    for (const section of report.sections) {
      assert.equal(section.bandBasis, 'unavailable')
      assert.equal(section.group, 'unavailable')
      assert.equal(section.source, null)
      assert.deepEqual(section.steps, [])
    }
  }
  const tree = render(result, locale), output = text(tree)
  assert.equal(tree.props['data-bach-profile'], 'true')
  assert.match(visibleText(tree), locale === 'ru' ? /требуется проверка/ : /verification needed/)
  assert.ok(output.includes(assessmentMethodology({ locale }).text))
  assert.match(output, locale === 'ru' ? /непроверенный сохранённый диапазон/ : /unverified saved range/)
  assert.doesNotMatch(output, /Primary match|Supporting theme|Основное совпадение|Дополнительная тема|You endorsed|Вы отметили/)
  assert.equal(nodes(tree).filter(node => node.type === 'ol' || node.type === 'h4' || node.type === 'a').length, 0)
  assert.match(visibleText(tree), locale === 'ru' ? /не отслеживаются в реальном времени/ : /not monitored in real time/)
  assert.match(visibleText(tree), locale === 'ru' ? /не является стандартизированной/ : /not a clinical cutoff/)
  for (const guide of Object.values(BACH_GUIDANCE)) assert.ok(!output.includes(guide[locale].step))
}

for (const definition of definitions) for (const locale of ['en', 'ru']) {
  const identity = `${definition.version}/${definition.instrumentLocale}/${locale}`
  test(`actual Bach route preserves all 38 real zero/mixed/max scales, bespoke advice and visible sources (${identity})`, () => {
    const fixtures = [scored(definition, 0), scored(definition, 5),
      scored(definition, 0, { 'bach.situation.21': 4, 'bach.character.04': 3, 'bach.control.04': 5, 'bach.control.01': 2 })]
    for (const result of fixtures) {
      const before = JSON.stringify(result)
      const report = buildAssessmentResultReport(result, locale), ranked = rankBachDimensions(result.dimensions)
      const tree = render(result, locale), articles = nodes(tree).filter(node => node.type === 'article')
      assert.equal(report.verified, true)
      assert.equal(articles.length, 38)
      assert.equal(report.highlightedCount, Math.min(7, ranked.filter(d => d.value > 0).length))
      assert.deepEqual(report.sections.map(section => section.key), ranked.map(d => d.key))
      for (const [index, dimension] of ranked.entries()) {
        const section = report.sections[index], output = text(articles[index])
        assert.equal(section.min, dimension.min)
        assert.equal(section.max, dimension.max)
        assert.equal(section.value, dimension.value)
        assert.match(output, new RegExp(`${locale === 'ru' ? 'Вес совпадений' : 'Weighted match'}: ${dimension.value} \\(${locale === 'ru' ? 'диапазон' : 'range'} ${dimension.min}–${dimension.max}\\)`))
        assert.ok(output.includes(section.meaning))
        assert.ok(output.includes(BACH_GUIDANCE[dimension.sourceConstruct][locale].step))
        assert.equal(section.bandBasis, 'descriptive')
        assert.ok(!section.bands && !section.currentBand, 'No fabricated severity intervals')
        assert.equal(section.source, definition.source.url)
        assert.ok(nodes(articles[index]).some(node => node.type === 'a' && node.props.href === definition.source.url))
      }
      assert.ok(visibleText(tree).includes(report.note))
      assert.ok(visibleText(tree).includes(report.scaleNote))
      assert.ok(nodes(tree).filter(node => node.type === 'header').some(header =>
        nodes(header).some(node => node.type === 'a' && node.props.href === definition.source.url)))
      if (report.seekSupport) assert.ok(visibleText(tree).includes(report.seekSupport))
      if (ranked.every(d => d.value === 0)) {
        assert.equal(report.highlightedCount, 0)
        assert.ok(report.sections.every(section => section.group === 'not-marked'))
        assert.doesNotMatch(visibleText(tree), /Primary match|Основное совпадение/)
      }
      if (ranked.every(d => d.value === d.max)) {
        assert.equal(report.sections.filter(section => section.group === 'main').length, 3)
        assert.equal(report.sections.filter(section => section.group === 'support').length, 4)
        assert.ok(report.seekSupport)
      }
      assert.equal(JSON.stringify(result), before, 'Rendering never mutates saved results')
    }
    // Independent known weight: control 2 x 1.5 + control-presence bonus 1.5.
    const fractional = fixtures[2].dimensions.find(dimension => dimension.sourceConstruct === 'Mimulus')
    assert.equal(fractional.value, 4.5)
  })

  test(`actual Bach route fails closed for every missing or altered identity field (${identity})`, () => {
    const original = scored(definition, 5)
    for (const field of Object.keys(provenance(definition))) for (const value of [undefined, 'unknown']) {
      const result = { ...original, [field]: value }
      assertUnverified(result, locale)
      const section = buildBachResultReport(result, locale).sections[0]
      assert.equal(section.value, original.dimensions[0].value)
      assert.equal(section.min, original.dimensions[0].min)
      assert.equal(section.max, original.dimensions[0].max)
    }
    for (const definitionKey of ['phq-9', 'pcl-5', 'itq-adult', 'asrs-6'])
      assertUnverified({ ...original, definitionKey }, locale)
  })

  test(`actual Bach route rejects damaged dimensions and evidence metadata (${identity})`, () => {
    const original = scored(definition, 5)
    for (const patch of [
      { key: 'bach.unknown' }, { min: -1 }, { max: 999 }, { unit: 'percent' }, { timeframe: 'today' },
      { direction: 'higher-is-better' }, { dimensionClass: 'trait' }, { sourceConstruct: 'unknown' }, { displayKind: 'severity' },
      { value: -1 }, { value: 999 }, { value: 0.25 }, { value: NaN }, { value: Infinity }, { value: '5' }, { value: null },
      { evidenceCount: NaN }, { evidenceCount: Infinity }, { evidenceCount: -1 }, { evidenceCount: 99 }, { evidenceCount: 1.5 },
      { evidenceCount: '3' }, { evidenceCount: undefined }, { sections: undefined }, { sections: {} },
      { sections: [] }, { sections: ['unknown'] }, { sections: ['situation', 'situation', 'control'] },
    ]) assertUnverified(withFirst(original, patch), locale)
    for (const field of ['key', 'min', 'max', 'unit', 'timeframe', 'direction', 'dimensionClass', 'sourceConstruct'])
      assertUnverified(withFirst(original, { [field]: undefined }), locale)
    for (const dimensions of [undefined, null, {}, [], original.dimensions.slice(1),
      [original.dimensions[0], ...original.dimensions.slice(0, -1)], [...original.dimensions].reverse(),
      [null, ...original.dimensions.slice(1)], new Array(38)]) assertUnverified({ ...original, dimensions }, locale)
    assertUnverified(withFirst(scored(definition, 0), { evidenceCount: 1, sections: ['situation'] }), locale)
    const sparseSections = ['control', undefined]
    delete sparseSections[1]
    assertUnverified({ ...original, dimensions: original.dimensions.map(dimension => dimension.key === 'bach.aspen'
      ? { ...dimension, sections: sparseSections, evidenceCount: 2 } : dimension) }, locale)
  })
}

for (const locale of ['en', 'ru']) test(`actual Bach PDF consumer inherits verified advice, bounds, source and safety; invalid result stays neutral (${locale})`, async () => {
  const printed = []
  const context = { beginPath() {}, rect() {}, roundRect() {}, fill() {},
    measureText(value) { return { width: String(value).length * 10 } }, fillText(value) { printed.push(String(value)) } }
  const prior = globalThis.document
  globalThis.document = { createElement() { return { getContext() { return context }, toDataURL() { return 'data:image/jpeg;base64,/9j/2Q==' } } } }
  const normalise = value => value.replace(/\s+/g, ' ')
  try {
    for (const version of ['v1', 'v2']) {
      const definition = getAssessmentDefinition('hh-bach-flower-profile', version, locale)
      const result = { id: '10000000-0000-4000-8000-000000000002', accountId: '10000000-0000-4000-8000-000000000001',
        measurementAt: '2026-10-16T12:00:00.000Z', ...scored(definition, 5) }
      const clientReport = buildClientReport({ account: { displayName: 'Synthetic' }, results: [result], locale, now: new Date('2026-10-16T12:00:00Z') })
      const interpretation = clientReport.tests[0].interpretation
      printed.length = 0
      assert.equal((await generateClientPdf(clientReport)).type, 'application/pdf')
      const output = normalise(printed.join(' '))
      for (const section of interpretation.sections) {
        for (const expected of [section.meaning, ...section.steps, ...section.limitations, section.source])
          assert.ok(output.includes(normalise(expected)), `Missing verified PDF text: ${expected}`)
        assert.ok(output.includes(`${locale === 'ru' ? 'Диапазон шкалы' : 'Scale range'}: ${section.min}–${section.max}`))
      }
      assert.ok(output.includes(normalise(interpretation.seekSupport)))
      assert.ok(output.includes(normalise(interpretation.note)))
      for (const rejected of [{ contentHash: 'rejected-identity' }, { definitionKey: 'phq-9' }]) {
        const invalidClientReport = buildClientReport({ results: [{ ...result, ...rejected }], locale, now: new Date('2026-10-16T12:00:00Z') })
        const invalid = invalidClientReport.tests[0].interpretation
        assert.equal(invalidClientReport.tests[0].title, invalid.title)
        assert.equal(invalidClientReport.tests[0].description, invalid.intro)
        assert.equal(invalidClientReport.tests[0].conclusion, invalid.intro)
        assert.doesNotMatch(invalidClientReport.tests[0].source, /phq-9|hh-bach-flower-profile/)
        printed.length = 0
        await generateClientPdf(invalidClientReport)
        const invalidOutput = normalise(printed.join(' '))
        assert.ok(invalidOutput.includes(normalise(invalid.intro)))
        assert.ok(invalidOutput.indexOf(normalise(invalid.intro)) < invalidOutput.indexOf(locale === 'ru' ? 'Диапазон шкалы:' : 'Scale range:'), 'Unverified warning precedes even the first raw scale rows')
        assert.ok(invalidOutput.includes(normalise(invalid.seekSupport)), 'Generic urgent-help information survives an unknown identity')
        assert.ok(!invalidOutput.includes(definition.source.url))
        assert.ok(invalidOutput.includes(normalise(assessmentMethodology({ locale }).text)))
        assert.ok(!invalidOutput.includes(normalise(assessmentMethodology({ key: 'phq-9', locale }).text)))
        assert.doesNotMatch(invalidOutput, /PHQ-9|Mood Deep Dive|Criterion A|Критерий A/)
        for (const guide of Object.values(BACH_GUIDANCE)) assert.ok(!invalidOutput.includes(normalise(guide[locale].step)))
      }
    }
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior }
})

for (const locale of ['en', 'ru']) test(`Bach rendering reads saved dimensions only, with deterministic ties and no answer access (${locale})`, () => {
  const definition = getAssessmentDefinition('hh-bach-flower-profile', 'v2', locale)
  const result = { ...scored(definition, 0, { 'bach.control.01': 2, 'bach.control.02': 2 }) }
  for (const key of ['answers', 'responses', 'rawAnswers']) Object.defineProperty(result, key, {
    get() { throw new Error('Reports must not read original answers') },
  })
  Object.freeze(result)
  const report = buildAssessmentResultReport(result, locale)
  assert.equal(report.highlightedCount, 2)
  assert.equal(report.sections[0].value, 4.5)
  assert.equal(report.sections[1].value, 4.5)
  assert.deepEqual(report.sections.map(section => section.key), rankBachDimensions(result.dimensions).map(dimension => dimension.key))
  assert.ok(visibleText(render(result, locale)).includes(report.scaleNote))
})
