import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { readEveryAccountScale } from '../scripts/helpers/account-scale-picker-verifier.mjs'
import { MHC_SF_DEFINITIONS } from '../data/assessments/mhc-sf-adult-dec2011.js'
import { COMPASSION_DEFINITIONS } from '../data/assessments/compassion-2026.js'
import { PERSONALITY_TYPE_DEFINITIONS } from '../data/assessments/personality-types-original-2026.js'
import { RELATIONSHIPS_INTIMACY_DEFINITIONS } from '../data/assessments/relationships-intimacy-v1.js'
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props.children)]
const plainText = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(plainText).join(' ') : plainText(node.props.children)
function scenario(keys, fault) {
  let active = 0, state, initialized = false
  const visited = [], opened = new Set()
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: initial => {
      if (!initialized) { state = typeof initial === 'function' ? initial() : initial; initialized = true }
      return [state, update => { if (fault !== 'stuck panel') state = typeof update === 'function' ? update(state) : update }]
    } },
    './free-course-banner': { FreeCourseBanner: () => null },
    './assessment-gauge': { ScoreGauge: () => null, ScoreTrend: () => null },
    '@/lib/assessments/dashboard-gauges': { gaugeModel: () => null },
    '@/lib/assessments/scale-guides': { getTestScaleGuide: () => null },
    '@/lib/assessments/result-overview': { assessmentResultOverview: () => ({}) },
    '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
    './compact-assessment-report.module.css': { default: {} },
  }
  const exports = {}
  const reportSource = process.env.HH_ACCOUNT_PICKER_SOURCE_ROOT
    ? readFileSync(resolve(process.env.HH_ACCOUNT_PICKER_SOURCE_ROOT, 'components/app/compact-assessment-report.jsx'), 'utf8')
    : read('components/app/compact-assessment-report.jsx')
  const compiled = ts.transpileModule(reportSource, { fileName: 'report.jsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  runInNewContext(compiled, { exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name] } })
  const sections = keys.map((key, index) => ({ key, construct: 'Scale ' + index, value: index, min: 0, max: 70, meaning: 'Meaning ' + index + '. Full limitation ' + index + '.', source: 'https://example.test/source/' + index }))
  const result = { id: 'synthetic-stable-result', definitionKey: 'mhc-sf', dimensions: [] }
  const reportFixture = { sections, methodology: 'Full methodology', rulesVersion: 'test' }
  const tree = () => exports.CompactAssessmentReport({ result, report: reportFixture, locale: 'en' })
  function select(selector) {
    const nodes = flatten(tree())
    active = keys.indexOf(nodes.find(node => node.type === 'article')?.props['data-active-scale'])
    let matched
    if (selector === '[data-assessment-scale-trigger]') matched = nodes.filter(node => Object.hasOwn(node.props, 'data-assessment-scale-trigger'))
    else if (selector === '[data-assessment-scale-trigger][aria-pressed="true"]') matched = nodes.filter(node => node.props['data-assessment-scale-trigger'] && node.props['aria-pressed'])
    else if (selector === 'article') matched = nodes.filter(node => node.type === 'article')
    else if (selector === 'article[data-active-scale]') matched = nodes.filter(node => node.type === 'article' && node.props['data-active-scale'])
    else if (selector === 'details') matched = nodes.filter(node => node.type === 'details').map((node, index) => ({ ...node, detailId: active + ':' + index }))
    else assert.fail('Unexpected selector: ' + selector)
    if (fault === 'missing scale' && selector === '[data-assessment-scale-trigger]') matched.pop()
    if (fault === 'wrong order' && selector === '[data-assessment-scale-trigger]') matched.reverse()
    if (fault === 'duplicate scale' && selector === '[data-assessment-scale-trigger]') matched[1] = matched[0]
    if (fault === 'two panels' && selector === 'article') matched.push(matched[0])
    if (fault === 'two selected' && selector.includes('aria-pressed')) matched.push(matched[0])
    if (fault === 'wrong panel key' && selector === 'article[data-active-scale]') matched[0].props['data-active-scale'] = 'wrong'
    if (fault === 'wrong panel id' && selector === 'article[data-active-scale]') matched[0].props.id = 'wrong'
    return matched
  }
  function wrap(resolve) {
    return { resolve, nth: index => wrap(() => [resolve()[index]]),
      all: async () => resolve().map(node => wrap(() => [node])),
      evaluateAll: async fn => fn(resolve().map(node => ({ getAttribute: name => node.props[name] }))),
      async getAttribute(name) { const node = resolve()[0]; if (name === 'open') return opened.has(node.detailId) ? '' : null; return node.props[name] == null ? null : String(node.props[name]) },
      async click() { const node = resolve()[0]; if (node.props.onClick) { node.props.onClick(); const panel = flatten(tree()).find(child => child.type === 'article'); visited.push(keys.indexOf(panel.props['data-active-scale'])) } },
      locator(selector) { assert.equal(selector, ':scope > summary'); return { async click() { if (fault !== 'closed disclosure') opened.add(resolve()[0].detailId) } } },
    }
  }
  const report = { locator: selector => wrap(() => select(selector)), async innerText() {
    // A closed detail contributes only its summary, matching browser-visible text.
    let index = 0
    function visible(node) {
      if (!node || typeof node !== 'object') return plainText(node)
      if (Array.isArray(node)) return node.map(visible).join(' ')
      if (node.type === 'details' && !opened.has(active + ':' + index++)) return plainText(flatten(node).find(child => child.type === 'summary'))
      return visible(node.props.children)
    }
    return visible(tree())
  } }
  const expect = locator => ({
    async toHaveCount(count) { assert.equal(locator.resolve().length, count) },
    async toBeVisible() { assert.equal(locator.resolve().length, 1); assert.notEqual(fault, 'hidden control') },
    async toHaveAttribute(name, value) { assert.equal(await locator.getAttribute(name), value) },
  })
  return { report, expect, visited }
}

for (const definition of [...MHC_SF_DEFINITIONS, ...COMPASSION_DEFINITIONS, ...PERSONALITY_TYPE_DEFINITIONS.filter(d=>d.instrumentLocale==='en'), ...RELATIONSHIPS_INTIMACY_DEFINITIONS.filter(d=>d.instrumentLocale==='en')]) test(definition.key + ' visits every actual JSX selected scale and reads opened limitations', async () => {
  const keys = definition.scoring.dimensions.map(dimension => dimension.key)
  const harness = scenario(keys)
  const text = await readEveryAccountScale(harness.report, harness.expect, keys)
  assert.deepEqual(harness.visited, keys.map((_, index) => index))
  keys.forEach((_, index) => assert.ok(text.includes('Full limitation ' + index + '.')))
  assert.ok(text.includes('Full methodology'))
})
for (const fault of ['missing scale', 'duplicate scale', 'wrong order', 'stuck panel', 'two panels', 'two selected', 'wrong panel key', 'wrong panel id', 'hidden control', 'closed disclosure']) {
  test('direct account verifier rejects ' + fault, async () => {
    const keys = ['total', 'first', 'second']
    const harness = scenario(keys, fault)
    await assert.rejects(readEveryAccountScale(harness.report, harness.expect, keys))
  })
}
test('four direct suites preserve every instrument-specific assertion and downstream comprehensive validation', () => {
  for (const name of ['mhc-sf', 'compassion-assessments', 'personality-types', 'relationships-assessments']) {
    const source = read('scripts/verify-' + name + '.mjs')
    assert.match(source, /readEveryAccountScale\(report,expect,d.scoring.dimensions.map\(dimension=>dimension.key\)\)/)
    assert.match(source, /assertAccountScaleReport\(/)
    assert.match(source, /assertIsolated\(\)/)
    assert.match(source, /assert\.deepEqual\(errors,\[\]\)/)
    assert.doesNotMatch(source, /report.locator\('article'\)\)\.toHaveCount/)
  }
  const mhc = read('scripts/verify-mhc-sf.mjs')
  for (const required of ['Response sum (0–70)', 'English original', 'cannot rule out mental illness', 'Corey L. M. Keyes', 'PHAC (2017)']) assert.ok(mhc.includes(required))
  const compassion = read('scripts/verify-compassion-assessments.mjs')
  for (const required of ['Response mean (1–5)', 'unreliable', 'LESS indifference']) assert.ok(compassion.includes(required))
  assert.ok(read('scripts/verify-personality-types.mjs').includes("await expect(summary.locator(':scope > h3')).toHaveCount(1)"))
  assert.ok(read('scripts/verify-personality-types.mjs').includes("await expect(summary).toBeVisible()"))
  assert.match(read('components/app/compact-assessment-report.jsx'), /<section[^>]+data-personality-type-summary>/)
  for (const required of ['not clinically validated', 'consent']) assert.ok(read('scripts/verify-relationships-assessments.mjs').includes(required))
  assert.match(read('scripts/verify-asrs6.mjs'), /report.locator\('article'\)\)\.toHaveCount\(1\)/)
})
