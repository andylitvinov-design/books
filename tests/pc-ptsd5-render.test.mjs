import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PC_PTSD5_DISABLED_V1 as pc } from '../data/assessments/pc-ptsd5-disabled-v1.js'
import * as runtime from '../lib/assessments/pc-ptsd5-runtime.js'
import * as administration from '../lib/assessments/trauma-administration.js'
import * as gauges from '../lib/assessments/dashboard-gauges.js'
import * as changes from '../lib/assessments/score-change-reading.js'
import { provenance } from '../lib/assessments/definitions.js'

// Actual JSX element execution with real pure logic; no browser/layout or account claim.
const jsx = (type, props, key) => typeof type === 'function' ? type(props || {}) : ({ type, props: props || {}, key })
const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree)
  : Array.isArray(tree) ? tree.map(textOf).join('') : textOf(tree.props.children)
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes)
  : [tree, ...nodes(tree.props.children)]
const dependencies = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '../../lib/assessments/pc-ptsd5-runtime.js': runtime,
  '../../lib/assessments/trauma-administration.js': administration,
  '@/lib/assessments/dashboard-gauges': gauges,
  '@/lib/assessments/score-change-reading': changes,
}
function compile(name) {
  const compiled = ts.transpileModule(readFileSync(new URL('../components/app/' + name + '.jsx', import.meta.url), 'utf8'),
    { fileName: name + '.jsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const compiledModule = { exports: {} }
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    if (name.endsWith('.module.css')) return { default: {} }
    assert.ok(dependencies[name], 'Unexpected dependency: ' + name)
    return dependencies[name]
  } })
  return compiledModule.exports
}
const { TraumaFrontMatter, TraumaExposureExamples, TraumaSectionInstructions } = compile('trauma-administration')
const { ScoreGauge } = compile('assessment-gauge')

test('actual front matter requires saved adult/non-diagnostic/non-monitoring acknowledgements', () => {
  const empty = TraumaFrontMatter({ definition: pc, context: {}, onChange() {}, onContinue() {}, onExit() {}, busy: false })
  const save = nodes(empty).find(node => node.type === 'button' && textOf(node).includes('Save context'))
  assert.equal(save.props.disabled, true)
  assert.match(textOf(empty), /18 or older/)
  assert.match(textOf(empty), /responses are not monitored in real time/)
  assert.match(textOf(empty), /do not arrange professional care/)
  assert.equal(nodes(empty).some(node => node.type === 'textarea'), false)
  const context = Object.fromEntries(runtime.PC_PTSD5_ADMINISTRATION_POLICY.acknowledgements.map(field => [field.id, 'Yes']))
  const ready = TraumaFrontMatter({ definition: pc, context, onChange() {}, onContinue() {}, onExit() {}, busy: false })
  assert.equal(nodes(ready).find(node => node.type === 'button' && textOf(node).includes('Save context')).props.disabled, false)
  assert.equal(runtime.PC_PTSD5_RELEASED, false, 'A completed acknowledgement does not activate the instrument')
})

test('actual example and section components reproduce every pinned source string', () => {
  const examples = TraumaExposureExamples({ definition: pc })
  assert.equal(examples.props.lang, 'en')
  assert.deepEqual(nodes(examples).filter(node => node.type === 'li').map(textOf), pc.exposureExamples)
  for (const question of pc.questions.slice(1))
    assert.equal(textOf(TraumaSectionInstructions({ question })), 'In the past month, have you...')
  assert.equal(TraumaSectionInstructions({ question: pc.questions[0] }), null)
})

test('actual PC gauge displays a neutral 0..5 count without cutoff sectors, percent or severity needle', () => {
  for (const answers of [{ exposure: 0 }, { exposure: 1, PC1: 1, PC2: 1, PC3: 1, PC4: 1, PC5: 1 }]) {
    const result = { ...provenance(pc), dimensions: runtime.scorePcPtsd5Dimensions(pc, answers) }
    for (const locale of ['en', 'ru']) {
      const tree = ScoreGauge({ dimension: result.dimensions[0], result, locale })
      assert.equal(tree.props['data-assessment-gauge'], 'response-count')
      assert.equal(nodes(tree).some(node => ['svg', 'line', 'path', 'progress'].includes(node.type)), false)
      assert.match(textOf(nodes(tree).find(node => node.type === 'strong')), /[05] \/ 5/)
      assert.doesNotMatch(textOf(tree), /%|threshold \(4\)|severe PTSD/)
    }
  }
})
