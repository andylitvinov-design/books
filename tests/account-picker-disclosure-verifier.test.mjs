import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { assertAccountPickerDisclosure, openAccountTestPicker, exerciseAccountPickerDraftRetention } from '../scripts/helpers/account-picker-disclosure-verifier.mjs'

const ts = createRequire(import.meta.url)('typescript')
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
const text = node => node === null || node === undefined || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).filter(Boolean).join(' ') : typeof node === 'object' ? node.props?.['aria-hidden'] ? '' : text(node.props?.children) : String(node)

function harness({ locale = 'en', expanded = false, review = false, fault = null } = {}) {
  let open = expanded, callback, removed = false, url = 'http://127.0.0.1:3100/' + locale + '/app/tests', clicks = 0
  let selected = ['Personality Baseline'], pressed = ['Anxiety & worry']
  const exported = {}, jsx = (type, props) => ({ type, props })
  vm.runInNewContext(ts.transpileModule(read('components/app/my-tests-dashboard.jsx'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: exported, require(name) {
    if (name === 'react') return { useState: initial => [initial, () => {}] }
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === '@/lib/assessments/personal-guidance') return { nextPersonalRecommendation: () => ({}) }
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
    if (name === './client-report-actions') return { ClientReportActions: 'ClientReportActions' }
    assert.equal(name, 'lucide-react'); return {}
  } })
  const render = () => exported.MyTestsDashboard({ locale, filtersOpen: open, hasNewSelection: review,
    explorer: jsx('section', { id: 'my-test-explorer', hidden: !open }),
    onOpenFilters() {
      clicks++
      if (fault !== 'noop') open = !open
      if (fault === 'lostTest') selected = []
      if (fault === 'lostFilter') pressed = []
      if (fault === 'navigation') url += '?changed=1'
      if (fault === 'write') callback?.({ url: () => 'http://127.0.0.1:3100/api/app/test-plans', method: () => 'POST' })
    },
  })
  const pick = id => nodes(render()).find(node => node.props?.id === id)
  const toggle = {
    count: () => fault === 'duplicate' ? 2 : fault === 'missing' ? 0 : 1,
    visible: () => true,
    async getAttribute(name) { return fault === 'wrongControls' && name === 'aria-controls' ? 'other-panel' : fault === 'missingState' && name === 'aria-expanded' ? null : String(pick('my-tests-picker-toggle').props[name]) },
    name: () => fault === 'wrongLabel' ? 'Old filters' : text(pick('my-tests-picker-toggle')),
    async click() { pick('my-tests-picker-toggle').props.onClick() },
  }
  const panel = { count: () => 1, visible: () => fault === 'wrongVisibility' ? !open : open,
    locator(selector) {
      assert.equal(selector, 'input[type="checkbox"]:checked, button[aria-pressed="true"]')
      return { async evaluateAll(fn) { return fn([
        ...selected.map(name => ({ tagName: 'INPUT', getAttribute: key => key === 'aria-label' ? name : null, value: 'on', textContent: '' })),
        ...pressed.map(name => ({ tagName: 'BUTTON', getAttribute: () => null, textContent: name })),
      ]) } }
    },
  }
  const dashboard = { count: () => 1, visible: () => true, locator(selector) {
    if (selector === '#my-tests-picker-toggle') return toggle
    assert.equal(selector, '#my-test-explorer'); return panel
  } }
  const page = { url: () => url, locator(selector) { assert.equal(selector, '[data-my-tests-dashboard]'); return dashboard },
    on(event, fn) { assert.equal(event, 'request'); callback = fn },
    off(event, fn) { assert.equal(event, 'request'); assert.equal(fn, callback); removed = true },
  }
  const expect = value => ({
    async toHaveCount(expected) { assert.equal(value.count(), expected) },
    async toBeVisible() { assert.equal(value.visible(), true) },
    async toBeHidden() { assert.equal(value.visible(), false) },
    async toHaveAttribute(name, expected) { assert.equal(await value.getAttribute(name), expected) },
    async toHaveAccessibleName(expected) { if (expected instanceof RegExp) assert.match(value.name(), expected); else assert.equal(value.name(), expected) },
    async toHaveURL(expected) { assert.equal(value.url(), expected) },
  })
  return { page, expect, render, panel, clicks: () => clicks, removed: () => removed }
}

for (const locale of ['en', 'ru']) for (const review of [false, true]) {
  test(locale + ' real dashboard top disclosure opens and retains the exact manual draft, review=' + review, async () => {
    const h = harness({ locale, review })
    await assertAccountPickerDisclosure(h.page, h.expect, { locale, expanded: false })
    const tree = nodes(h.render()), toggleIndex = tree.findIndex(node => node.props?.id === 'my-tests-picker-toggle')
    const panelIndex = tree.findIndex(node => node.props?.id === 'my-test-explorer')
    const titleIndex = tree.findIndex(node => node.type === 'h1')
    assert.ok(toggleIndex >= 0 && toggleIndex < panelIndex && panelIndex < titleIndex)
    assert.equal(await openAccountTestPicker(h.page, h.expect, { locale }), h.panel)
    await exerciseAccountPickerDraftRetention(h.page, h.expect, { locale })
    assert.equal(h.clicks(), 3)
    assert.equal(h.removed(), true)
  })
}
test('specialized already-expanded account entry is preserved without toggling closed', async () => {
  const h = harness({ expanded: true })
  await openAccountTestPicker(h.page, h.expect)
  assert.equal(h.clicks(), 0)
})
for (const fault of ['duplicate', 'missing', 'wrongControls', 'missingState', 'wrongLabel', 'wrongVisibility', 'noop']) {
  test('top-picker proof rejects ' + fault, async () => {
    const h = harness({ fault })
    await assert.rejects(openAccountTestPicker(h.page, h.expect))
  })
}
for (const fault of ['lostTest', 'lostFilter', 'navigation', 'write']) {
  test('collapse proof rejects ' + fault + ' and removes its request observer', async () => {
    const h = harness({ expanded: true, fault })
    await assert.rejects(exerciseAccountPickerDraftRetention(h.page, h.expect))
    assert.equal(h.removed(), true)
  })
}
test('actual core and relationship journeys use the shared disclosure and retain strict save/privacy checks', () => {
  const core = read('scripts/verify-app-r1.mjs'), relationships = read('scripts/verify-relationships-assessments.mjs')
  for (const source of [core, relationships]) {
    assert.match(source, /const explorer=await openAccountTestPicker\(target,expect\)/)
    assert.doesNotMatch(source, /Open test filters|Review test filters|Choose or change tests/)
  }
  assert.match(core, /assertAccountPickerDisclosure\(page,expect,\{expanded:false\}\)/)
  assert.match(core, /exerciseAccountPickerDraftRetention\(selectionPage,expect\)/)
  assert.ok(core.indexOf('exerciseAccountPickerDraftRetention(selectionPage,expect)') > core.indexOf("toHaveAttribute('aria-pressed','true')", core.indexOf('const accountExplorer=')))
  assert.match(core, /assert\.deepEqual\(selectedPlan\.definitionIds,\[personalityDefinition\.id\]/)
  assert.match(relationships, /saveAccountRelationshipSelection/)
})
