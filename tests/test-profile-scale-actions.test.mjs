import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { LIFE_TEST_PROFILES, profileAxisSelection, selectedLifeProfileAxes } from '../lib/profile/life-test-profiles.js'

// Closed test boundary: parse component text and execute only selected local
// handlers/aria expressions with synthetic setters. Never import either app
// component, catalog definitions, server actions, data stores or providers.
const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const explorer = ts.createSourceFile('test-explorer.jsx', source('components/app/test-explorer.jsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
const picker = ts.createSourceFile('simple-test-picker.jsx', source('components/app/simple-test-picker.jsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
const findOne = (file, predicate, description) => {
  const matches = []
  const visit = (node) => { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit) }
  visit(file)
  assert.equal(matches.length, 1, description)
  return matches[0]
}
const attribute = (node, name) => node.attributes.properties.find((item) =>
  ts.isJsxAttribute(item) && item.name.getText() === name)?.initializer?.expression
const button = (file, label) => findOne(file, (node) => ts.isJsxElement(node) &&
  node.openingElement.tagName.getText(file) === 'button' &&
  node.children.map((child) => child.getText(file)).join('').includes(label), 'unique button: ' + label)
const expression = (file, node, context) => {
  assert.ok(node, 'actual JSX expression exists')
  const result = ts.transpileModule('const value = (' + node.getText(file) + ')', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  })
  assert.equal(result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0)
  return new Function(...Object.keys(context), result.outputText + '; return value')(...Object.values(context))
}
const handler = (file, node, context) => expression(file, attribute(node.openingElement, 'onClick'), context)
const simpleProps = findOne(explorer, (node) => ts.isJsxSelfClosingElement(node) &&
  node.tagName.getText(explorer) === 'SimpleTestPicker', 'actual parent picker binding')
const fullAll = button(explorer, "'Select all'")
const fullClear = button(explorer, "'Clear all'")
const simpleAll = button(picker, 'scaleCopy.all')
const simpleClear = button(picker, 'scaleCopy.clear')
const fullPdf = button(explorer, "'PDF scale guides'")
const fullScale = findOne(explorer, (node) => ts.isJsxElement(node) &&
  node.openingElement.tagName.getText(explorer) === 'button' &&
  attribute(node.openingElement, 'aria-pressed')?.getText(explorer) === 'axes.includes(key)', 'actual full scale pressed state')
const simpleScale = findOne(picker, (node) => ts.isJsxElement(node) &&
  node.openingElement.tagName.getText(picker) === 'button' &&
  attribute(node.openingElement, 'aria-pressed')?.getText(picker) === 'selectedScales.includes(key)', 'actual simple scale pressed state')

const selection = (profile) => {
  const state = { axes: [profile.axes[0]], selectedKeys: ['synthetic-previous-choice'] }
  const setAxes = (value) => { state.axes = typeof value === 'function' ? value(state.axes) : value }
  const context = { activeProfile: profile, setAxes }
  const onSetScales = expression(explorer, attribute(simpleProps, 'onSetScales'), {
    profile: profile.key, profileAxisSelection, setAxes,
  })
  return { state, context, simpleContext: { currentProfile: profile, onSetScales } }
}
const pressed = (file, node, axes, key) => expression(file, attribute(node.openingElement, 'aria-pressed'), {
  axes, selectedScales: axes, key,
})

test('full selector Select all then Clear all leaves zero pressed scales but all effective profile axes', () => {
  for (const profile of LIFE_TEST_PROFILES) {
    const { state, context } = selection(profile)
    handler(explorer, fullAll, context)()
    assert.deepEqual(state.axes, profile.axes)
    assert.notStrictEqual(state.axes, profile.axes)
    handler(explorer, fullClear, context)()
    assert.deepEqual(state.axes, [])
    assert.equal(state.axes.length, 0)
    for (const key of profile.axes) assert.equal(pressed(explorer, fullScale, state.axes, key), false)
    assert.deepEqual(selectedLifeProfileAxes(profile.key, state.axes), profile.axes)
    assert.deepEqual(state.selectedKeys, ['synthetic-previous-choice'])
  }
})

test('full and simple controls agree for zero, one and all checked scales in every profile', () => {
  for (const profile of LIFE_TEST_PROFILES) {
    const full = selection(profile), simple = selection(profile)
    for (const [fullButton, simpleButton] of [[fullClear, simpleClear], [fullAll, simpleAll], [fullClear, simpleClear]]) {
      handler(explorer, fullButton, full.context)()
      handler(picker, simpleButton, simple.simpleContext)()
      assert.deepEqual(full.state.axes, simple.state.axes)
      for (const key of profile.axes) assert.equal(
        pressed(explorer, fullScale, full.state.axes, key),
        pressed(picker, simpleScale, simple.state.axes, key),
      )
    }
    assert.deepEqual(selectedLifeProfileAxes(profile.key, [profile.axes[0]]), [profile.axes[0]])
  }
})

test('actual simple-picker callback retains the profile whitelist and deduplication', () => {
  for (const profile of LIFE_TEST_PROFILES) {
    const { state, simpleContext } = selection(profile)
    simpleContext.onSetScales([profile.axes[0], profile.axes[0], 'invented-axis'])
    assert.deepEqual(state.axes, [profile.axes[0]])
    assert.deepEqual(state.selectedKeys, ['synthetic-previous-choice'])
  }
})

const pdfSelection = (profile) => {
  const state = { profile: profile.key, availability: 'available', axes: [profile.axes[0]],
    focus: [...profile.focus], selectedKeys: ['synthetic-previous-choice'] }
  const names = ['Profile', 'Availability', 'MaxMinutes', 'FreeOnly', 'Language', 'Tracking',
    'Focus', 'Problems', 'Details', 'Axes', 'Areas', 'Kinds', 'StylesFilter', 'Lengths', 'AxisFilter', 'Query', 'BrowseFull']
  const context = Object.fromEntries(names.map((name) => ['set' + name, (value) => {
    state[name[0].toLowerCase() + name.slice(1)] = value
  }]))
  return { state, context }
}
test('both existing PDF entry points clear the profile as well as scale facets, without clearing test choices', () => {
  for (const profile of LIFE_TEST_PROFILES) {
    const full = pdfSelection(profile), simple = pdfSelection(profile)
    handler(explorer, fullPdf, full.context)()
    expression(explorer, attribute(simpleProps, 'onBrowsePdf'), simple.context)()
    for (const current of [full.state, simple.state]) {
      assert.equal(current.profile, null)
      assert.equal(current.availability, 'pdf')
      assert.deepEqual(current.axes, [])
      assert.deepEqual(current.focus, [])
      assert.deepEqual(selectedLifeProfileAxes(current.profile, current.axes), [])
      assert.deepEqual(current.selectedKeys, ['synthetic-previous-choice'])
    }
    for (const key of ['profile', 'availability', 'axes', 'focus', 'problems', 'details', 'areas',
      'kinds', 'stylesFilter', 'lengths', 'axisFilter', 'query', 'maxMinutes', 'freeOnly', 'language', 'tracking']) {
      assert.deepEqual(full.state[key], simple.state[key], key)
    }
  }
})

