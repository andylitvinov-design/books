import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '../lib/assessments/test-explorer.js'
import { layoutPortraitRayLabels } from '../lib/assessments/portrait-ray-labels.js'
import { PORTRAIT_SECTORS, PORTRAIT_SECTOR_KEYS, PORTRAIT_AXIS_ORDER, portraitAngleForAxis, portraitAxesForSectors } from '../lib/assessments/portrait-sectors.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const descendants = node => node == null || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(descendants)
    : [node, ...descendants(node.props?.children)]
const options = tree => descendants(tree).filter(node => node.type === 'label'
  && typeof node.props.className === 'string' && node.props.className.includes('portraitRayOption'))
// The sector checkboxes are separate from the original individual-ray checkboxes.
const inputs = tree => options(tree).flatMap(item => descendants(item).filter(node => node.type === 'input' && node.props.type === 'checkbox'))
const sectorLabels = tree => descendants(tree).filter(node => node.type === 'label' && typeof node.props.className === 'string' && node.props.className.includes('portraitSectorChip'))
const sectorInput = (tree, key) => descendants(sectorLabels(tree).find(label => label.props['data-portrait-sector'] === key))
  .find(node => node.type === 'input')
const allSectorInput = tree => descendants(tree).find(node => node.type === 'input' && node.props['data-portrait-sector-all'])
const rayLabels = tree => descendants(tree).filter(node => node.type === 'text' && node.props.className === 'radarInlineLabel')
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
      if (name === '@/lib/assessments/portrait-sectors') return { PORTRAIT_SECTORS, PORTRAIT_SECTOR_KEYS, PORTRAIT_AXIS_ORDER, portraitAngleForAxis, portraitAxesForSectors }
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
  assert.notEqual(inputs(expanded).at(-1).props.disabled, true)
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

test('four sector checkboxes independently filter rays, all restores view without losing fine selections', () => {
  const app = harness('en')
  const initial = app.render()
  assert.equal(sectorLabels(initial).length, 4)
  assert.equal(sectorLabels(initial).filter(item => item.props['data-selected']).length, 4)
  assert.equal(allSectorInput(initial).props.checked, true)
  assert.equal(inputs(initial).filter(input => input.props.checked).length, 8)
  assert.equal(rayLabels(initial).length, 8)

  allSectorInput(initial).props.onChange()
  const empty = app.render()
  assert.equal(allSectorInput(empty).props.checked, false)
  assert.equal(options(empty).length, 0)
  assert.equal(rayLabels(empty).length, 0)

  sectorInput(empty, 'body').props.onChange()
  const body = app.render()
  assert.equal(options(body).length, 5)
  assert.equal(inputs(body).filter(input => input.props.checked).length, 4)
  assert.equal(rayLabels(body).length, 4)

  sectorInput(body, 'relationships').props.onChange()
  const bodyAndRelationships = app.render()
  assert.equal(options(bodyAndRelationships).length, 9)
  assert.equal(rayLabels(bodyAndRelationships).length, 4)

  allSectorInput(bodyAndRelationships).props.onChange()
  const restored = app.render()
  assert.equal(allSectorInput(restored).props.checked, true)
  assert.equal(inputs(restored).filter(input => input.props.checked).length, 8)
  assert.equal(rayLabels(restored).length, 8)
})

test('portrait SVG captions are plain near-dot words without pill rectangles, localized EN RU ES', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const tree = harness(locale).render()
    assert.equal(rayLabels(tree).length, 8, locale)
    assert.ok(rayLabels(tree).every(node => node.props.textAnchor === 'start'), locale)
    assert.ok(!descendants(tree).some(node => node.type === 'rect' && String(node.props.className).includes('radarLabelPill')), locale)
  }
  const css = read('components/app/test-explorer.module.css')
  assert.ok(css.includes('.radarInlineLabel{'))
  assert.ok(css.includes('.portraitSectorGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'))
  assert.ok(css.includes('.radarSectorArc[data-radar-sector=body]'))
  assert.equal(css.includes('.radarLabelPill{'), false)
})

const testItLinks = tree => descendants(tree).filter(node => node.type === 'a' &&
  String(node.props.className).includes('portraitRayTestLink'))

test('only missing portrait scales show a separate localized Test it link to matching test choices', () => {
  const missingAxes = TEST_EXPLORER_AXES.filter(axis => axis !== 'personality').slice(8)
  for (const locale of ['en', 'ru', 'es']) {
    const app = harness(locale)
    const initial = app.render()
    assert.equal(testItLinks(initial).length, 2, locale)
    assert.equal(inputs(initial).length, 10, locale)
    moreButton(initial).props.onClick()
    const expanded = app.render()
    const links = testItLinks(expanded)
    assert.equal(links.length, 9, locale)
    assert.deepEqual(
      links.map(link => link.props.href),
      missingAxes.map(axis => `/${locale}/app/tests?explore=1&axis=${axis}`),
      locale,
    )
    assert.ok(links.every(link => link.props.prefetch === false &&
      String(link.props['aria-label']).length > 10), locale)
    assert.equal(inputs(expanded).filter(input => input.props.checked).length, 8, locale)
    for (const link of links) {
      assert.ok(!descendants(options(expanded).find(option =>
        descendants(option).some(node => node === link))).includes(link),
        'the test link must not be nested in its independent checkbox label')
    }
  }
})

test('portrait ray link drives the account catalog with a safe exact measurement axis', () => {
  const visual = read('components/app/test-explorer-visual.jsx')
  const picker = read('components/app/account-test-battery.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const css = read('components/app/test-explorer.module.css')
  assert.match(visual, /!measure && <Link/)
  assert.match(picker, /TEST_EXPLORER_AXES\.includes\(rayParam\)/)
  assert.match(picker, /rayParam !== 'personality'/)
  assert.match(picker, /portraitAxis\s*\?\s*\{ axes: \[portraitAxis\], focus: \[\] \}/)
  assert.match(picker, /initialAxis=\{portraitAxis\}/)
  assert.match(picker, /portraitAxis \? 'hh-test-list' : 'hh-test-customizer'/)
  assert.match(explorer, /initialAxis = null/)
  assert.match(explorer, /data-testid="portrait-axis-test-choices"/)
  assert.match(explorer, /axes\.includes\(initialAxis\)/)
  assert.match(css, /\.portraitRayItem\[data-measured=false\]/)
  assert.match(css, /\.portraitRayTestLink:focus-visible/)
  assert.match(css, /\.portraitAxisBrowse\{/)
})
