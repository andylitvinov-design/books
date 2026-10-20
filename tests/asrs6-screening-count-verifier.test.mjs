import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { ASRS6_DEFINITIONS } from '../data/assessments/asrs-v1-6-nyu.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import * as gaugeModule from '../lib/assessments/dashboard-gauges.js'
import * as guideModule from '../lib/assessments/scale-guides.js'
import * as overviewModule from '../lib/assessments/result-overview.js'
import * as evidenceModule from '../lib/assessments/assessment-evidence-status.js'
import * as scoreChangeModule from '../lib/assessments/score-change-reading.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-asrs6.mjs')
const start = source.indexOf('  const count = report.locator(')
const end = source.indexOf('  for (const detail of await report.locator(', start)
assert.ok(start > 0 && end > start, 'Execute the actual browser verifier screening block')
const verify = new Function('report', 'expect', 'assert', 'locale', 'expected',
  'return (async () => {' + source.slice(start, end) + '})()')

// Render the real JSX and score model; only CSS and React element construction
// are substituted. Locator cardinality and direct-child semantics are explicit.
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const loaded = { exports: {} }
runInNewContext(ts.transpileModule(read('components/app/assessment-gauge.jsx'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: loaded.exports, require: name => {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === '@/lib/assessments/dashboard-gauges') return gaugeModule
  if (name === '@/lib/assessments/score-change-reading') return scoreChangeModule
  if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
  assert.fail('Unexpected gauge dependency: ' + name)
} })
const compact = { exports: {} }
runInNewContext(ts.transpileModule(read('components/app/compact-assessment-report.jsx'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: compact.exports, require: name => {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === 'react') return { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] }
  if (name === './assessment-gauge') return loaded.exports
  if (name === './free-course-banner') return { FreeCourseBanner: () => null }
  if (name === '@/lib/assessments/dashboard-gauges') return gaugeModule
  if (name === '@/lib/assessments/scale-guides') return guideModule
  if (name === '@/lib/assessments/result-overview') return overviewModule
  if (name === '@/lib/assessments/assessment-evidence-status') return evidenceModule
  if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
  assert.fail('Unexpected compact report dependency: ' + name)
} })
const children = node => [node?.props?.children].flat(Infinity).filter(value => value != null && value !== false)
const walk = node => typeof node !== 'object' || node == null ? [] : [node, ...children(node).flatMap(walk)]
const text = node => typeof node === 'object' && node != null ? children(node).map(text).join('') : String(node ?? '')
const normalize = value => value.replace(/\s+/g, ' ').trim()
function matches(node, selector) {
  const match = /^(\w+)?(?:\[([\w-]+)(?:="([^"]+)")?\])?$/.exec(selector)
  assert.ok(match, 'Unsupported synthetic selector: ' + selector)
  return (!match[1] || node.type === match[1]) && (!match[2] ||
    (match[3] === undefined ? node.props[match[2]] != null : node.props[match[2]] === match[3]))
}
function locator(nodes) {
  return { nodes,
    locator(selector) {
      if (selector.startsWith(':scope > ')) {
        let selected = nodes
        for (const part of selector.slice(9).split(' > ')) selected = selected.flatMap(children)
          .filter(node => typeof node === 'object' && matches(node, part))
        return locator(selected)
      }
      if (selector.includes(' > ')) {
        const [parent, ...parts] = selector.split(' > ')
        let selected = this.locator(parent).nodes
        for (const part of parts) selected = selected.flatMap(children).filter(node => typeof node === 'object' && matches(node, part))
        return locator(selected)
      }
      return locator(nodes.flatMap(node => children(node).flatMap(walk)).filter(node =>
        selector.split(', ').some(part => matches(node, part))))
    },
    async all() { return nodes.map(node => locator([node])) },
    async evaluateAll(fn) { return fn(nodes.map(domNode)) },
    async innerText() { assert.equal(nodes.length, 1); return normalize(text(nodes[0])) },
  }
}
function domNode(node) {
  return {
    nodeType: typeof node === 'object' ? 1 : 3,
    get textContent() { return text(node) },
    get childNodes() { return children(node).map(domNode) },
    getAttribute(name) { return node.props?.[name] ?? null },
    querySelector(selector) { const found = walk(node).slice(1).find(n => matches(n, selector)); return found ? domNode(found) : null },
  }
}
const expect = actual => ({
  async toBeVisible() { assert.equal(actual.nodes.length, 1); assert.notEqual(actual.nodes[0].props.hidden, true) },
  async toHaveCount(count) { assert.equal(actual.nodes.length, count) },
  async toHaveText(expected) {
    if (Array.isArray(expected)) assert.deepEqual(actual.nodes.map(node => normalize(text(node))), expected)
    else { assert.equal(actual.nodes.length, 1, 'A scalar text assertion must select exactly one element'); assert.equal(normalize(text(actual.nodes[0])), expected) }
  },
  async toContainText(expected) { assert.equal(actual.nodes.length, 1); assert.ok(normalize(text(actual.nodes[0])).includes(expected)) },
  async toHaveAttribute(name, expected) { assert.equal(actual.nodes.length, 1); assert.equal(actual.nodes[0].props[name], expected) },
})
function fixture(locale, value) {
  const definition = ASRS6_DEFINITIONS.find(item => item.instrumentLocale === locale)
  assert.ok(definition)
  const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map((question, index) =>
    [question.id, index < value ? question.shadedFrom : 0])))
  assert.equal(result.dimensions[0].value, value)
  const tree = compact.exports.CompactAssessmentReport({ result, report: buildAssessmentResultReport(result, locale), locale })
  const gauge = walk(tree).find(node => node.props['data-assessment-gauge'] === 'screening-count')
  const strip = walk(tree).find(node => Object.hasOwn(node.props, 'data-all-score-ranges'))
  return { gauge, strip, report: locator([tree]) }
}
for (const locale of ['en', 'ru']) for (const value of [0, 3, 4, 6]) {
  test(`ASRS ${locale} count ${value} stays distinct from both published legend endpoints`, async () => {
    const { gauge, report } = fixture(locale, value)
    assert.equal(walk(gauge).filter(node => node.type === 'strong').length, 1)
    await verify(report, expect, assert, locale, value)
  })
}
for (const locale of ['en', 'ru']) for (const value of [3, 4]) {
  for (const mutation of ['wrong count', 'wrong caption', 'wrong current band', 'missing legend', 'wrong interval', 'duplicate current band']) {
    test(`ASRS ${locale} count ${value} rejects ${mutation} despite the full legend`, async () => {
      const { gauge, strip, report } = fixture(locale, value)
      const all = walk(gauge), bands = children(strip)
      if (mutation === 'wrong count') children(gauge).find(node => node.type === 'strong').props.children = '6 / 6'
      if (mutation === 'wrong caption') all.find(node => node.type === 'figcaption').props.children =
        walk(fixture(locale, value < 4 ? 4 : 3).gauge).find(node => node.type === 'figcaption').props.children
      if (mutation === 'wrong current band') for (const band of bands) {
        band.props['aria-current'] = band.props['aria-current'] === 'true' ? undefined : 'true'
      }
      if (mutation === 'missing legend') strip.props.children = []
      if (mutation === 'wrong interval') walk(bands[0]).find(node => node.type === 'b').props.children = '0–4'
      if (mutation === 'duplicate current band') for (const band of bands) {
        band.props['aria-current'] = 'true'
      }
      await assert.rejects(verify(report, expect, assert, locale, value))
    })
  }
}
