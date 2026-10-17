import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '../lib/assessments/test-explorer.js'
import { layoutPortraitRayLabels } from '../lib/assessments/portrait-ray-labels.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const descendants = node => node == null || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(descendants)
    : [node, ...descendants(node.props?.children)]
const options = tree => descendants(tree).filter(node => node.type === 'label'
  && typeof node.props.className === 'string' && node.props.className.includes('portraitRayOption'))
const inputs = tree => descendants(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox')
const moreButton = tree => descendants(tree).find(node => node.type === 'button'
  && String(node.props.className).includes('portraitShowMore'))

function harness(locale) {
  const values = []
  let hook = 0
  const fakeReact = {
    useState(initial) {
      const index = hook++
      if (!(index in values)) values[index] = initial
      return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    },
    useRef: initial => ({ current: initial }),
    useId: () => 'test-portrait-rays-id',
  }
  const content = ts.transpileModule(read('components/app/test-explorer-visual.jsx'), {
    fileName: 'components/app/test-explorer-visual.jsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} }
  runInNewContext(content, {
    module: loaded, exports: loaded.exports,
    require(name) {
      if (name === 'react') return fakeReact
      if (name === 'next/link') return { __esModule: true, default: 'a' }
      if (name === 'next/image') return { __esModule: true, default: 'img' }
      if (name === '@/lib/assessments/test-explorer') return { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS }
      if (name === '@/lib/assessments/portrait-ray-labels') return { layoutPortraitRayLabels }
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
      return require(name)
    },
  })
  const measured = TEST_EXPLORER_AXES.filter(axis => axis !== 'personality').slice(0, 8)
  const portrait = { axes: Object.fromEntries(measured.map((axis, n) =>
    [axis, { percent: 40 + n, source: 'Synthetic test', change: null }])) }
  const coverage = { axes: Object.fromEntries(TEST_EXPLORER_AXES.map(axis => [axis, { coverage: 0 }])), coveredCount: 0 }
  return {
    render() { hook = 0; return loaded.exports.TestExplorerVisual({ locale, portrait, coverage }) },
    total: TEST_EXPLORER_AXES.filter(axis => axis !== 'personality').length,
  }
}

test('portrait ray options show five two-column rows before expansion in EN/RU/ES', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const app = harness(locale)
    const initial = app.render()
    assert.equal(app.total, 17)
    assert.equal(options(initial).length, 10, locale)
    assert.equal(inputs(initial).filter(input => input.props.checked).length, 8, locale)
    const button = moreButton(initial)
    assert.ok(button, locale)
    assert.equal(button.props['aria-expanded'], false)
    assert.equal(button.props['aria-controls'], 'test-portrait-rays-id')
    button.props.onClick()
    const expanded = app.render()
    assert.equal(options(expanded).length, 17, locale)
    assert.equal(inputs(expanded).filter(input => input.props.checked).length, 8)
    assert.equal(moreButton(expanded).props['aria-expanded'], true)
    moreButton(expanded).props.onClick()
    const collapsedAgain = app.render()
    assert.equal(options(collapsedAgain).length, 10, locale)
    assert.equal(inputs(collapsedAgain).filter(input => input.props.checked).length, 8)
  }
})

test('ray selection persists when its checkbox is hidden by collapsing the list', () => {
  const app = harness('en')
  moreButton(app.render()).props.onClick()
  let expanded = app.render()
  assert.equal(inputs(expanded).at(-1).props.checked, false)
  assert.equal(inputs(expanded).at(-1).props.disabled, false)
  inputs(expanded).at(-1).props.onChange()
  expanded = app.render()
  assert.equal(inputs(expanded).at(-1).props.checked, true)
  assert.equal(inputs(expanded).filter(input => input.props.checked).length, 9)
  moreButton(expanded).props.onClick()
  assert.equal(options(app.render()).length, 10)
  moreButton(app.render()).props.onClick()
  assert.equal(inputs(app.render()).at(-1).props.checked, true)
})

test('portrait ray options retain two columns even on iPhone width with legible score layout', () => {
  const css = read('components/app/test-explorer.module.css')
  assert.match(css, /\.portraitRayOptions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:440px\)\{[\s\S]*?\.portraitRayOptions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(css, /\.portraitRayOptions\{grid-template-columns:1fr\}/)
  assert.match(css, /\.portraitRayOption\{display:grid;grid-template-columns:18px minmax\(0,1fr\) auto/)
  assert.match(css, /\.portraitDelta\{grid-column:3;grid-row:2/)
  assert.match(css, /\.portraitControls \.portraitShowMore\{display:flex/)
})
