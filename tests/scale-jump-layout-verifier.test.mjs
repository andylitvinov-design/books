import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectReportOverflowDiagnostics } from '../scripts/helpers/report-overflow-diagnostics.mjs'
import { runInNewContext } from 'node:vm'
import postcss from 'postcss'
import { assertAccountScaleJumpLayout, assertScaleJumpLayout, readScaleJumpLayout } from '../scripts/helpers/scale-jump-layout-verifier.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const geometry = (width = 390) => ({ viewportWidth: width, documentWidth: width, bodyWidth: width,
  label: { left: 27, right: width - 27, width: width - 54, clientWidth: width - 54, scrollWidth: width - 54, overflowX: 'visible' },
  control: { left: 27, right: width - 27, width: width - 54, clientWidth: width - 54, scrollWidth: width + 29, overflowX: 'hidden', outlineWidth: '3px', outlineStyle: 'solid', outlineColor: 'rgb(214, 142, 96)' },
  select: { left: 27, right: width - 27, width: width - 54, clientWidth: width - 56, scrollWidth: width - 56, overflowX: 'visible' },
  labelText: 'Jump to a scale', labelAssociated: true, focused: false })
const sections = locale => {
  const definition = getAssessmentDefinition('hh-enneagram-36', 'v1', locale)
  return buildAssessmentResultReport(scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, 3]))), locale).sections
}

function harness(expected, fault) {
  let viewport = { width: 390, height: 844 }, active = 8, focused = false
  let disclosureOpen = false
  const transitions = [], screenshots = [], screenshotWidths = [], keyboard = []
  const wrap = (kind, index = 0) => ({ kind, index,
    locator(selector) {
      if (kind === 'report' && selector === '[data-assessment-scale-picker] select') return wrap('select')
      if (kind === 'report' && selector === 'article[data-active-scale]') return wrap('panel')
      if (kind === 'report' && selector.includes('aria-pressed')) return wrap('pressed')
      if (kind === 'panel' && selector === 'details:has([data-scale-limitation])') return wrap('disclosure')
      if (kind === 'disclosure' && selector === 'summary') return wrap('summary')
      if (kind === 'panel' && selector === 'h3') return wrap('title')
      if (kind === 'panel' && selector === '[data-scale-limitation]') return wrap('limitations')
      if (kind === 'select' && selector === 'option') return { async evaluateAll(fn) {
        const options = expected.map((section, i) => ({ value: String(i), textContent: section.construct || section.title }))
        if (fault === 'missing option') options.pop()
        if (fault === 'reordered option') options.reverse()
        if (fault === 'duplicate option') options[1] = options[0]
        return fn(options)
      } }
      assert.fail('Unexpected locator: ' + kind + '/' + selector)
    },
    async count() { assert.equal(kind, 'disclosure'); return ['collapsed warnings','broken disclosure'].includes(fault) ? 1 : 0 },
    async evaluate(fn) { assert.equal(kind, 'disclosure'); return fn({open: disclosureOpen}) },
    async click() { assert.equal(kind, 'summary'); if(fault !== 'broken disclosure') disclosureOpen = true },
    nth: next => wrap(kind, next),
    async selectOption(value) { if (fault !== 'stuck selection') active = Number(value); transitions.push([viewport.width, active]) },
    async focus() { focused = true },
    async press(key) {
      keyboard.push(key)
      if (key === 'Tab') focused = false
      else if (fault !== 'stuck keyboard') active += key === 'ArrowUp' ? -1 : 1
    },
    async scrollIntoViewIfNeeded() {},
  })
  const page = {
    locator(selector) { assert.equal(selector, '[data-personal-result-report]'); return wrap('report') },
    viewportSize: () => viewport,
    async setViewportSize(next) { viewport = { ...next } },
    async screenshot(options) { screenshots.push(options.path); screenshotWidths.push(viewport.width) },
    async evaluate(fn) {
      if (fn === collectReportOverflowDiagnostics) return { viewport: { innerWidth: viewport.width }, selectedScales: [expected[active].key] }
      assert.equal(fn, readScaleJumpLayout)
      const layout = { ...geometry(viewport.width), focused, selectedOption: expected[active].construct || expected[active].title }
      if (fault === 'ignored wrapper') layout.control.overflowX = 'visible'
      if (fault === 'broken label') layout.labelAssociated = false
      if (fault === 'clipped label') layout.label.overflowX = 'hidden'
      if (fault === 'hidden focus') layout.control.outlineWidth = '0px'
      if (fault === 'overflow') { layout.documentWidth += 36; layout.bodyWidth += 36; layout.label.scrollWidth += 63 }
      return layout
    },
  }
  const expect = node => ({
    async toHaveCount(count) {
      const actual = node.kind === 'limitations' ? (expected[active].limitations || []).length
        : fault === 'duplicate panel' && node.kind === 'panel' ? 2 : 1
      assert.equal(actual, count)
    },
    async toHaveValue(value) { assert.equal(String(active), value) },
    async toBeFocused() { assert.equal(focused, true) },
    async toHaveAccessibleName(name) { assert.equal(name, 'Jump to a scale') },
    async toHaveAttribute(name, value) {
      assert.ok(['data-active-scale', 'data-assessment-scale-trigger'].includes(name))
      assert.equal(fault === 'wrong pressed' && node.kind === 'pressed' ? expected[0].key : expected[active].key, value)
    },
    async toHaveText(value) {
      assert.equal(node.kind === 'title' ? expected[active].construct || expected[active].title
        : fault === 'missing warning' ? '' : expected[active].limitations[node.index], value)
    },
    async toBeVisible() { assert.notEqual(fault, 'hidden warning'); if(fault === 'collapsed warnings' && node.kind === 'limitations') assert.equal(disclosureOpen,true) },
  })
  return { page, expect, transitions, screenshots, screenshotWidths, keyboard }
}

test('CSS contains only the dedicated native-control wrapper overflow and grants the mobile control its full row', () => {
  const root = postcss.parse(read('components/app/compact-assessment-report.module.css'))
  const base = [], mobile = []
  root.walkRules(rule => {
    if (rule.selector === '.jumpControl' && rule.parent.type === 'root') base.push(rule)
    if (rule.parent.type === 'atrule' && rule.parent.params === '(max-width:570px)') mobile.push(rule)
    rule.walkDecls(/^overflow(?:-x)?$/, declaration => {
      if (['hidden', 'clip'].includes(declaration.value)) assert.equal(rule.selector, '.jumpControl', 'Do not mask report, label, tab or document overflow')
    })
  })
  const values = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))
  assert.equal(base.length, 1)
  assert.equal(values(base[0]).overflow, 'hidden')
  assert.ok(root.nodes.some(rule => rule.selector?.includes('.jumpControl:focus-within') && values(rule).outline === '3px solid #d68e60'))
  assert.equal(values(mobile.find(rule => rule.selector === '.jump')).display, 'grid')
  assert.equal(values(mobile.find(rule => rule.selector === '.jump'))['grid-template-columns'], 'minmax(0,1fr)')
  assert.equal(values(mobile.find(rule => rule.selector === '.jumpControl')).width, '100%')
  assert.equal(values(mobile.find(rule => rule.selector === '.jumpControl'))['min-width'], '0')
  assert.ok(root.nodes.some(rule => rule.selector === '.scaleTabs' && values(rule)['overflow-x'] === 'auto'))
})

test('geometry rejects the real WebKit426px document and399px jump-label failure independently', () => {
  const leaked = geometry()
  leaked.documentWidth = leaked.bodyWidth = 426
  leaked.label.scrollWidth = 399
  assert.throws(() => assertScaleJumpLayout(leaked), /Document must not overflow/)
  leaked.documentWidth = leaked.bodyWidth = 390
  assert.throws(() => assertScaleJumpLayout(leaked), /Jump label must not leak/)
  for (const width of [320, 390]) assert.doesNotThrow(() => assertScaleJumpLayout(geometry(width)))
  for (const missing of ['label', 'control', 'select']) {
    const layout = geometry(); layout[missing] = null
    assert.throws(() => assertScaleJumpLayout(layout), /visible box/)
  }
  const escaped = geometry(); escaped.select.right += 15
  assert.throws(() => assertScaleJumpLayout(escaped), /fit its control boundary/)
})

test('browser snapshot measures source label leakage even when the native select border box fits', () => {
  const box = (left, right, scrollWidth, overflowX = 'visible') => ({ getBoundingClientRect: () => ({ left, right, width: right - left }), clientWidth: right - left, scrollWidth, style: { overflowX } })
  const label = { ...box(27, 293, 349), childNodes: [{ nodeType: 3, textContent: 'Быстрый выбор шкалы' }] }
  const control = box(27, 293, 349, 'hidden')
  const select = { ...box(27, 293, 265), closest: name => name === 'label' ? label : control, labels: [label], selectedOptions: [{ textContent: 'Принципиальность / совершенствование' }] }
  label.control = select
  const report = { querySelector: selector => { assert.equal(selector, '[data-assessment-scale-picker] select'); return select } }
  const document = { documentElement: { scrollWidth: 376 }, body: { scrollWidth: 376 }, activeElement: select, querySelector: selector => { assert.equal(selector, '[data-personal-result-report]'); return report } }
  const layout = runInNewContext(`(${readScaleJumpLayout})()`, { document, innerWidth: 320, getComputedStyle: node => node.style })
  assert.equal(layout.label.scrollWidth, 349)
  assert.equal(layout.select.width, 266)
  assert.equal(layout.select.overflowX, 'visible')
  assert.equal(layout.labelAssociated, true)
  assert.equal(layout.labelText, 'Быстрый выбор шкалы')
  assert.throws(() => assertScaleJumpLayout(layout), /Document must not overflow/)
})

for (const locale of ['en', 'ru']) test(locale + ' native option transitions preserve all nine titles and limitations at320/390', async () => {
  const expected = sections(locale)
  assert.equal(expected.length, 9)
  // Canonical reports may have no limitations property. Check exactly the
  // warnings supplied by each registry, without adding any to real reports.
  const h = harness(expected)
  const layouts = await assertAccountScaleJumpLayout(h.page, h.expect, expected, { screenshotPrefix: '/synthetic/picker-' + locale })
  assert.equal(layouts.length, 20)
  assert.deepEqual(h.keyboard, ['ArrowUp', 'Tab', 'ArrowDown', 'Tab', 'ArrowUp', 'Tab', 'ArrowDown', 'Tab'])
  assert.equal(layouts.filter(layout => layout.keyboardChecked && layout.focused).length, 2)
  assert.deepEqual(h.transitions, [320, 390].flatMap(width => expected.map((_, index) => [width, index])))
  assert.deepEqual(h.page.viewportSize(), { width: 390, height: 844 })
  assert.deepEqual(h.screenshots, [320, 390].map(width => '/synthetic/picker-' + locale + '-' + width + '.png'))
})

for (const fault of ['missing option', 'reordered option', 'duplicate option', 'stuck selection', 'duplicate panel', 'wrong pressed', 'missing warning', 'hidden warning', 'overflow', 'ignored wrapper', 'broken label', 'clipped label', 'stuck keyboard', 'hidden focus']) test('native jump verifier rejects ' + fault, async () => {
  // Fault coverage must remain meaningful even on the canonical registry,
  // which predates per-section limitations. These warnings are fixture-only.
  const expected = sections('ru').map(section => ({ ...section, limitations: ['Synthetic source limitation: keep this visible.'] }))
  const h = harness(expected, fault)
  await assert.rejects(() => assertAccountScaleJumpLayout(h.page, h.expect, expected))
  assert.deepEqual(h.page.viewportSize(), { width: 390, height: 844 })
})

test('hosted flow retains original strict overflow gate and screenshots before added option regression', () => {
  const source = read('scripts/verify-personality-types.mjs')
  const gate = 'assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))'
  assert.equal(source.split(gate).length, 2)
  assert.ok(source.indexOf('await page.evaluate(collectReportOverflowDiagnostics)') < source.indexOf(gate))
  assert.ok(source.indexOf(gate) < source.indexOf("await page.screenshot({path:output+'/'+(guest?'guest':'account')"))
  assert.ok(source.indexOf("await page.screenshot({path:output+'/'+(guest?'guest':'account')") < source.indexOf('await assertAccountScaleJumpLayout'))
  assert.match(source, /if\(!guest&&d.scoring.dimensions.length>6\)/)
  assert.match(source, /readEveryAccountScale\(report,expect,d.scoring.dimensions/)
  assert.match(source, /assertAccountScaleReport\(page,expect,result,locale\)/)
})


test('only native control is wrapped and implicit label/options remain unchanged', () => {
  const source = read('components/app/compact-assessment-report.jsx')
  assert.match(source, /<label className=\{styles.jump\}>[\s\S]*?<span className=\{styles.jumpControl\} data-assessment-scale-select-control>\s*<select value=\{selectedIndex\} onChange=\{event => setActiveIndex\(Number\(event.target.value\)\)\}>\s*\{sections.map\(\(item, index\) => <option key=\{item.key \+ ':' \+ index\} value=\{index\}>\{item.construct \|\| item.title\}<\/option>\)\}\s*<\/select>\s*<\/span>\s*<\/label>/)
})

test('failure evidence is written at the actual320 viewport before restoration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'native-select-failure-'))
  try {
    const expected = sections('ru'), h = harness(expected, 'overflow')
    const prefix = join(directory, 'picker')
    await assert.rejects(() => assertAccountScaleJumpLayout(h.page, h.expect, expected, { screenshotPrefix: prefix }), /Document must not overflow/)
    const evidence = JSON.parse(await readFile(prefix + '-failure-layout.json', 'utf8'))
    assert.equal(evidence.checkedWidth, 320)
    assert.equal(evidence.viewport.innerWidth, 320)
    assert.equal(evidence.checkedKey, expected[0].key)
    assert.deepEqual(h.screenshots, [prefix + '-failure-320.png', prefix + '-failure-control-320.png'])
    assert.deepEqual(h.screenshotWidths, [320, 320])
    assert.deepEqual(h.page.viewportSize(), { width: 390, height: 844 })
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('native picker opens ordinary collapsed source notes and still checks their full text', async()=>{
 const expected=sections('en').map(s=>({...s,limitations:['Synthetic source limitation.']}));const h=harness(expected,'collapsed warnings');await assertAccountScaleJumpLayout(h.page,h.expect,expected)
})
test('native picker rejects a broken source-note disclosure', async()=>{
 const expected=sections('en').map(s=>({...s,limitations:['Synthetic source limitation.']}));const h=harness(expected,'broken disclosure');await assert.rejects(()=>assertAccountScaleJumpLayout(h.page,h.expect,expected),/disclosure must open/)
})
