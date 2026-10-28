import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as sectors from '../lib/assessments/portrait-sectors.js'
import { layoutPortraitRayLabels } from '../lib/assessments/portrait-ray-labels.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
// Extract declarations, not arbitrary imports or application bootstraps. These
// fixtures use no account, saved records, transport, browser, or provider.
function declaration(source, name) {
  const ast = ts.createSourceFile('fixture.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const found = ast.statements.flatMap(statement => {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return [statement]
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(item => item.name.getText(ast) === name)) return [statement]
    return []
  })
  assert.equal(found.length, 1, 'one active top-level declaration: ' + name)
  return found[0].getText(ast).replace(/^export\s+/, '')
}
const explorerSource = read('lib/assessments/test-explorer.js')
const explorer = runInNewContext(
  declaration(explorerSource, 'TEST_EXPLORER_AXES') + '\n' +
  declaration(explorerSource, 'TEST_EXPLORER_AXIS_LABELS') +
  '\n;({TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS})', Object.create(null))

function actualComponent(locale, source = read('components/app/test-explorer-visual.jsx')) {
  const state = []
  let index = 0
  const jsx = (type, props) => ({ type, props: props || {} })
  const react = {
    useState(initial) {
      const key = index++
      if (!(key in state)) state[key] = initial
      return [state[key], next => { state[key] = typeof next === 'function' ? next(state[key]) : next }]
    },
    useRef: current => ({ current }), useId: () => 'synthetic-rays',
  }
  const compiled = { exports: {} }
  const output = ts.transpileModule(source, {
    fileName: 'test-explorer-visual.jsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  runInNewContext(output, {
    module: compiled, exports: compiled.exports,
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }
      if (name === 'next/image') return { __esModule: true, default: 'img' }
      if (name === 'next/link') return { __esModule: true, default: 'a' }
      if (name === '@/lib/assessments/test-explorer') return explorer
      if (name === '@/lib/assessments/portrait-sectors') return sectors
      if (name === '@/lib/assessments/portrait-ray-labels') return { layoutPortraitRayLabels }
      if (name === './goal-profile-panel') return { GoalProfilePanel: 'synthetic-unused-goal' }
      if (name === './test-explorer.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
      throw Error('Unapproved fixture import: ' + name)
    },
  })
  const coverage = { axes: Object.fromEntries(explorer.TEST_EXPLORER_AXES.map(key => [key, { coverage: 0 }])), coveredCount: 0 }
  return () => {
    index = 0
    return compiled.exports.TestExplorerVisual({ locale, coverage, portrait: { axes: {}, staleAxes: {}, axisCandidates: {} } })
  }
}

function virtualPortrait(render) {
  const events = []
  const descendants = (value, parent = null) => {
    if (Array.isArray(value)) return value.flatMap(item => descendants(item, parent))
    if (!value || typeof value !== 'object') return []
    const node = { ...value, parent }
    return [node, ...descendants(value.props?.children, node)]
  }
  const text = value => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : String(value ?? '')
  const visible = node => !node.props.hidden && (!node.parent || visible(node.parent))
  const matches = (node, selector) => {
    if (selector === 'svg[role="img"] > g:has(> line[x1="180"][y1="182"])') return node.type === 'g' && node.parent?.type === 'svg' && node.parent.props.role === 'img' && descendants(node.props.children).some(child => child.type === 'line' && child.props.x1 === '180' && child.props.y1 === '182')
    if (selector === 'input[type="checkbox"]') return node.type === 'input' && node.props.type === 'checkbox'
    if (selector === 'input:checked') return node.type === 'input' && node.props.checked === true
    if (selector === 'input:disabled') return node.type === 'input' && node.props.disabled === true
    const attr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector)
    assert.ok(attr, 'supported exact locator: ' + selector)
    return Object.hasOwn(node.props, attr[1]) && (attr[2] === undefined || String(node.props[attr[1]]) === attr[2])
  }
  function locator(resolve, label) {
    return {
      resolve, label,
      locator(selector) { return locator(() => resolve().flatMap(node => descendants(node.props.children, node)).filter(node => matches(node, selector)), label + ' ' + selector) },
      nth(n) { return locator(() => resolve().slice(n, n + 1), label + '[' + n + ']') },
      async click() {
        const nodes = resolve(); assert.equal(nodes.length, 1, 'unique click ' + label)
        assert.ok(visible(nodes[0]), 'visible click ' + label)
        assert.equal(typeof nodes[0].props.onClick, 'function')
        events.push('click:' + (nodes[0].props['data-portrait-view'] || nodes[0].props['data-portrait-sector'] || 'all'))
        nodes[0].props.onClick()
      },
      async check() { await this.setChecked(true) },
      async uncheck() { await this.setChecked(false) },
      async setChecked(next) {
        const nodes = resolve(); assert.equal(nodes.length, 1, 'unique checkbox ' + label)
        assert.ok(visible(nodes[0]), 'visible checkbox ' + label)
        assert.notEqual(nodes[0].props.disabled, true)
        if (nodes[0].props.checked !== next) nodes[0].props.onChange({ target: { checked: next } })
      },
      async evaluateAll(fn) {
        return fn(resolve().map(node => ({ checked: node.props.checked,
          parentElement: { querySelector(selector) {
            assert.equal(selector, 'strong')
            const strong = descendants(node.parent.props.children).find(child => child.type === 'strong')
            return strong ? { textContent: text(strong.props.children) } : null
          } },
        })))
      },
    }
  }
  const root = locator(() => [{ type: 'fixture', props: { children: render() } }], 'portrait')
  const expect = value => ({
    async toHaveCount(n) { assert.equal(value.resolve().length, n, value.label + ' count') },
    async toHaveAttribute(key, expected) {
      const nodes = value.resolve(); assert.equal(nodes.length, 1, value.label + ' unique attribute')
      assert.equal(String(nodes[0].props[key]), expected, value.label + ' ' + key)
    },
    async toBeVisible() { const nodes = value.resolve(); assert.equal(nodes.length, 1); assert.ok(visible(nodes[0]), value.label + ' visible') },
  })
  return { root, expect, events }
}

function actualJourney(source = read('scripts/helpers/public-discovery-verifier.mjs')) {
  return runInNewContext(declaration(source, 'exercisePortraitRays') + '\n;exercisePortraitRays', { assert, PORTRAIT_SECTORS: sectors.PORTRAIT_SECTORS })
}

for (const locale of ['en', 'ru', 'es']) test('actual browser ray journey follows the actual Chart/Axes producer in ' + locale, async () => {
  const fixture = virtualPortrait(actualComponent(locale))
  await actualJourney()(fixture.root, fixture.expect, locale)
  assert.ok(fixture.events.includes('click:axes'))
  assert.equal(fixture.events.at(-1), 'click:chart', 'restore the original chart view')
  await fixture.expect(fixture.root.locator('[data-portrait-view="chart"]')).toHaveAttribute('aria-selected', 'true')
  await fixture.expect(fixture.root.locator('[data-portrait-sector-all]')).toHaveAttribute('aria-pressed', 'true')
})

test('body selection alone does not expose axes; the actual tab handler is necessary', async () => {
  const fixture = virtualPortrait(actualComponent('en'))
  await fixture.root.locator('[data-portrait-sector="body"]').click()
  await fixture.expect(fixture.root.locator('[data-portrait-ray-options]')).toHaveCount(0)
  await fixture.root.locator('[data-portrait-view="axes"]').click()
  await fixture.expect(fixture.root.locator('[data-portrait-ray-options]').locator('input[type="checkbox"]')).toHaveCount(sectors.PORTRAIT_SECTORS[0].axes.length)
})

const replaceOnce = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, 'unique mutation preimage')
  return source.replace(before, after)
}
const producerMutations = [
  ['tab switching discards chosen axes', 'else { setPortraitView(key); setChartOptionsOpen(false) }', 'else { setPortraitView(key); setChosenRays(null); setChartOptionsOpen(false) }'],
  ['Axes tab no-op', 'else { setPortraitView(key); setChartOptionsOpen(false) }', 'else { if (key !== "axes") setPortraitView(key); setChartOptionsOpen(false) }'],
  ['hidden axes panel', 'className={styles.portraitControls} data-testid="portrait-axes-panel"', 'hidden className={styles.portraitControls} data-testid="portrait-axes-panel"'],
  ['checkbox change no-op', 'onChange={() => toggleRay(axis)}', 'onChange={() => {}}'],
  ['sector switching discards chosen axes', 'onClick={() => setSelectedSector(sector.key)}', 'onClick={() => { setSelectedSector(sector.key); setChosenRays(null) }}'],
  ['body selection no-op', 'onClick={() => setSelectedSector(sector.key)}', 'onClick={() => { if (sector.key !== "body") setSelectedSector(sector.key) }}'],
  ['All selection no-op', 'onClick={() => setSelectedSector(\'all\')}', 'onClick={() => {}}'],
  ['missing detailed diagram', 'data-radar-mode={chartMode === \'axes\' ? \'axes\' : \'detail\'}', 'data-radar-mode="missing"'],
  ['missing overview diagram', 'data-radar-mode="summary"', 'data-radar-mode="missing"'],
]
for (const [name, before, after] of producerMutations) test('journey rejects producer regression: ' + name, async () => {
  const changed = replaceOnce(read('components/app/test-explorer-visual.jsx'), before, after)
  const fixture = virtualPortrait(actualComponent('en', changed))
  await assert.rejects(actualJourney()(fixture.root, fixture.expect, 'en'))
})

test('journey still rejects removing the actual Axes navigation step', async () => {
  const source = read('scripts/helpers/public-discovery-verifier.mjs')
  const changed = replaceOnce(source, '  await expect(inputs).toHaveCount(0)\n  await axesTab.click()\n', '  await expect(inputs).toHaveCount(0)\n  // Missing user navigation.\n')
  const fixture = virtualPortrait(actualComponent('en'))
  await assert.rejects(actualJourney(changed)(fixture.root, fixture.expect, 'en'))
})
