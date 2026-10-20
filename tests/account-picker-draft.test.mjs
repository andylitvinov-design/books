import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require(process.env.PICKER_TYPESCRIPT || 'typescript')
const source = readFileSync(new URL('../components/app/account-test-battery.jsx', import.meta.url), 'utf8')
const explorerSource = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
const elements = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children), ...elements(node.props?.explorer)]
test('actual easy picker clears guest scale filters by default and preserves account opt-in filters', async () => {
  const modules = {}
  const root = process.env.PICKER_LIBRARY_ROOT ? new URL('file://' + process.env.PICKER_LIBRARY_ROOT + '/') : new URL('../', import.meta.url)
  for (const [, name] of explorerSource.matchAll(/from ['"](@\/[^'"]+)['"]/g)) modules[name] = await import(new URL(name.slice(2) + '.js', root))
  for (const preserve of [false, true]) {
    let slots = [], cursor = 0, submitted
    const hooks = {
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
      useMemo(fn) { return fn() }, useEffect() {},
    }
    const exported = {}, jsx = (type, props) => ({ type, props })
    vm.runInNewContext(ts.transpileModule(explorerSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
      exports: exported, window: {}, console, URLSearchParams,
      require(name) {
        if (modules[name]) return modules[name]
        if (name === 'react') return hooks
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
        if (name === 'next/link') return { default: 'Link' }
        if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) }
        if (name === 'lucide-react') return {}
        return { SimpleTestPicker: 'SimpleTestPicker', TestExplorerVisual: 'TestExplorerVisual', TestScaleGuide: 'TestScaleGuide' }
      },
    })
    const p = {
      locale: 'en', audience: preserve ? 'account' : 'guest', simpleMode: true,
      initialPreferences: { axes: ['anxiety'] },
      ...(preserve ? { preserveScaleFilters: true } : {}),
      onStart: (_entries, preferences) => { submitted = preferences },
    }
    const render = () => { cursor = 0; return exported.TestExplorer(p) }
    let tree = render()
    await tree.props.onStart()
    assert.deepEqual(Array.from(submitted.axes), preserve ? ['anxiety'] : [], 'initial saved axes follow the opt-in')
    tree.props.onBrowseFull()
    tree = render()
    const scaleGroup = elements(tree).find(n => n.props?.['aria-label'] === 'Scales for selecting tests')
    const extraScale = elements(scaleGroup).find(n => n.type === 'button' && n.props['aria-pressed'] === false)
    assert.ok(extraScale)
    extraScale.props.onClick()
    tree = render()
    const updatedScales = elements(tree).find(n => n.props?.['aria-label'] === 'Scales for selecting tests')
    const selectedBefore = elements(updatedScales).filter(n => n.type === 'button' && n.props['aria-pressed'] === true)
    assert.equal(selectedBefore.length, preserve ? 2 : 1, 'full view accepts another scale')
    elements(tree).find(n => n.props?.className === 'simpleBack').props.onClick()
    tree = render()
    assert.equal(tree.type, 'SimpleTestPicker')
    await tree.props.onStart()
    if (preserve) {
      assert.equal(submitted.axes.length, 2)
      assert.ok(submitted.axes.includes('anxiety'))
    } else assert.deepEqual(Array.from(submitted.axes), [], 'public easy view clears full-view axes by default')
  }
})
function batteryHarness({ failSave = false, failCourse = null, failRun = false, holdSave = false, planStatus = 'active' } = {}) {
  let slots = [], cursor = 0, effects = [], query = new URLSearchParams()
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
    useRef(initial) { const [ref] = hooks.useState({ current: initial }); return ref },
    useMemo(fn) { return fn() },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v,j) => v !== slots[i][j])) { slots[i] = deps; effects.push(fn) } },
  }
  const definition = { id: 'saved-v1', key: 'saved', questions: [] }
  const lib = {
    coverageForFocus: () => ({}), buildPsychPortrait: () => ({}), getDefinitionById: () => definition,
    monitoringCatalogItem: () => ({ title: { en: 'Saved' } }), assessmentMethodology: () => ({ text: '' }),
    buildExplorerEntries: () => [{ key: 'saved', selectable: true, definition }], filterExplorerEntries: () => [], rankExplorerEntries: x => x,
    TEST_EXPLORER_AXIS_LABELS: {}, TEST_RECOMMENDATION_FOCUS: [{ key: 'stress' }], INSIGHTS_TEST_CATEGORIES: [{ key: 'stress' }],
    readTestSelectionIntent: () => null, validTestKeys: x => x,
    courseTestKeys: () => [], coursePendingKeys: () => [], groupCourseTestRows: rows => ({ course: [], other: rows }),
  }
  const exported = {}, requests = [], navigation = []
  let releaseSave = null
  const jsx = (type, props, key) => ({ type, props, key })
  const window = { requestAnimationFrame: () => 0, cancelAnimationFrame() {}, sessionStorage: { getItem: () => null, removeItem() {} } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, window, AbortController, console, crypto: { randomUUID: () => 'operation' },
    fetch: async (path, options) => {
      requests.push({ path, options })
      if (holdSave && path.endsWith('test-plans') && options.method === 'POST') {
        await new Promise(resolve => { releaseSave = resolve })
      }
      const failed = (failSave && options.method === 'POST') ||
        (failRun && path.endsWith('/runs') && options.method === 'POST') ||
        (path.endsWith('course') && failCourse === options.method)
      return {
        ok: !failed,
        json: async () => failed ? { error: 'SERVICE_UNAVAILABLE' }
          : path.endsWith('test-plans') ? { id: 'plan', status: planStatus, definitionIds: ['saved-v1'] }
          : path.endsWith('/runs') ? { id: 'run-1', definitionId: 'saved-v1', status: 'draft' }
          : path.endsWith('course') ? { course: { stage: 2, revision: 1 } } : {},
      }
    },
    require(name) {
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/navigation') return { useRouter: () => ({ replace: path => navigation.push(['replace', path]), push: path => navigation.push(['push', path]) }), useSearchParams: () => query }
      if (name === 'next/link' || name.endsWith('.css')) return { default: name.endsWith('.css') ? {} : 'Link' }
      if (name.startsWith('@/')) return lib
      if (name === 'lucide-react') return {}
      return { TestExplorer: 'TestExplorer', TestExplorerVisual: 'TestExplorerVisual', MyTestsDashboard: 'MyTestsDashboard' }
    },
  })
  return {
    requests, navigation, releaseSave() { assert.ok(releaseSave, 'save request must be pending'); releaseSave() },
    query(value) { query = new URLSearchParams(value) },
    render(props) { cursor = 0; const tree = exported.AccountTestBattery(props); const pending = effects; effects = []; pending.forEach(fn => fn()); return elements(tree) },
  }
}
const props = (owner = 'a') => ({ data: { account: { id: owner }, activeTestPlan: { id: 'plan', status: 'active', definitionIds: ['saved-v1'] }, results: [], runs: [] }, locale: 'en', reload: async () => {} })
test('outer collapse retains the same picker key without a write; reopen restores its mounted draft', () => {
  const h = batteryHarness(); const p = props(); let tree = h.render(p)
  assert.equal(tree.some(n => n.type === 'TestExplorer'), false, 'lazy mount until first open')
  tree.find(n => n.type === 'MyTestsDashboard').props.onOpenFilters()
  tree = h.render(p); const first = tree.find(n => n.type === 'TestExplorer')
  assert.equal(first.props.simpleMode, true)
  assert.equal(first.props.preserveScaleFilters, true)
  tree.find(n => n.type === 'MyTestsDashboard').props.onOpenFilters()
  tree = h.render(p)
  assert.equal(tree.find(n => n.type === 'TestExplorer').key, first.key)
  assert.equal(tree.find(n => n.props?.id === 'my-test-explorer').props.hidden, true)
  assert.equal(tree.find(n => n.props?.id === 'my-test-explorer').props.style.display, 'none')
  tree.find(n => n.type === 'MyTestsDashboard').props.onOpenFilters()
  tree = h.render(p)
  assert.equal(tree.find(n => n.type === 'TestExplorer').key, first.key)
  assert.equal(tree.find(n => n.props?.id === 'my-test-explorer').props.hidden, false)
  assert.equal(h.requests.some(r => r.options.method === 'POST'), false)
  h.query('course=1')
  assert.notEqual(h.render(p).find(n => n.type === 'TestExplorer').key, first.key, 'course entry resets implicit picks')
  h.query('course=1&courseId=course-a')
  const courseKey = h.render(p).find(n => n.type === 'TestExplorer').key
  h.query('course=1&courseId=course-b')
  assert.notEqual(h.render(p).find(n => n.type === 'TestExplorer').key, courseKey, 'different course IDs isolate draft choices')
  h.query('')
  assert.notEqual(h.render({ ...p, recommendedKey: 'saved' }).find(n => n.type === 'TestExplorer').key, first.key, 'recommendation entry gets its own selection')
  assert.notEqual(h.render(props('b')).find(n => n.type === 'TestExplorer').key, first.key, 'owner changes reset the draft')
})
test('specialized course, recommendation and Insights entries retain their full-picker contracts', () => {
  for (const [query, extra, compact, full] of [['course=1&explore=1', {}, false, true], ['explore=1', { recommendedKey: 'saved' }, false, true], ['explore=1&category=stress', {}, false, true]]) {
    const h = batteryHarness(); h.query(query); const picker = h.render({ ...props(), ...extra }).find(n => n.type === 'TestExplorer')
    assert.equal(picker.props.simpleMode, compact); assert.equal(picker.props.initialBrowseFull, full)
    assert.equal(picker.props.explicitSelectionOnly, query.includes('course=1'))
  }
})
test('successful explicit save replaces the draft even when the plan id stays the same', async () => {
  const h = batteryHarness(); h.query('explore=1'); const p = props()
  const before = h.render(p).find(n => n.type === 'TestExplorer')
  await before.props.onStart([{ key: 'saved' }], { focus: ['stress'] })
  const after = h.render(p).find(n => n.type === 'TestExplorer')
  assert.notEqual(after.key, before.key)
  assert.equal(h.requests.filter(r => r.options.method === 'POST').length, 1)
})
test('account compact/full switching retains saved scale filters; public behavior is unchanged', () => {
  assert.match(explorerSource, /simpleMode && !preserveScaleFilters \? \[\] : \(initialPreferences\?\.axes \?\? \[\]\)/)
  assert.match(explorerSource, /if \(!preserveScaleFilters\) setAxes\(\[\]\); setBrowseFull\(false\)/)
  assert.match(source, /function keepSavedSet\(\) \{[\s\S]*?setExplorerRevision\(\(revision\) => revision \+ 1\)/)
})

test('failed save leaves the same unsaved draft mounted for retry', async () => {
  const h = batteryHarness({ failSave: true }); h.query('explore=1'); const p = props()
  const before = h.render(p).find(n => n.type === 'TestExplorer')
  await before.props.onStart([{ key: 'saved' }], { focus: ['stress'] })
  const after = h.render(p).find(n => n.type === 'TestExplorer')
  assert.equal(after.key, before.key)
  assert.equal(h.requests.filter(r => r.options.method === 'POST').length, 1)
})

test('actual full Insights picker: first unchecked row selects only that test', async () => {
  const modules = {}
  const root = process.env.PICKER_LIBRARY_ROOT ? new URL('file://' + process.env.PICKER_LIBRARY_ROOT + '/') : new URL('../', import.meta.url)
  for (const [, name] of explorerSource.matchAll(/from ['"](@\/[^'"]+)['"]/g)) modules[name] = await import(new URL(name.slice(2) + '.js', root))
  let slots = [], cursor = 0
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
    useMemo(fn) { return fn() }, useEffect() {},
  }
  const exported = {}
  const jsx = (type, props, key) => ({ type, props, key })
  vm.runInNewContext(ts.transpileModule(explorerSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, window: {}, console, URLSearchParams,
    require(name) {
      if (modules[name]) return modules[name]
      if (name === 'react') return hooks
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/link') return { default: 'Link' }
      if (name.endsWith('.css')) return { default: {} }
      if (name === 'lucide-react') return {}
      return { SimpleTestPicker: 'SimpleTestPicker', TestExplorerVisual: 'TestExplorerVisual', TestScaleGuide: 'TestScaleGuide' }
    },
  })
  const h = batteryHarness(); h.query('explore=1&category=stress')
  const pickerProps = h.render(props()).find(n => n.type === 'TestExplorer').props
  const render = () => { cursor = 0; return elements(exported.TestExplorer(pickerProps)) }
  const checks = tree => tree.filter(n => n.type === 'input' && n.props.type === 'checkbox' && n.props['aria-label'])
  let tree = render(); assert.equal(checks(tree).filter(n => n.props.checked).length, 0)
  const first = checks(tree)[0]; assert.ok(first); first.props.onChange()
  tree = render(); const selected = checks(tree).filter(n => n.props.checked)
  assert.equal(selected.length, 1); assert.equal(selected[0].props['aria-label'], first.props['aria-label'])
})

test('partial save failure keeps explicit course choices for retry', async () => {
  for (const failCourse of ['GET', 'POST']) {
    const h = batteryHarness({ failCourse }); h.query('explore=1&course=1'); const p = props()
    const before = h.render(p).find(n => n.type === 'TestExplorer')
    await before.props.onStart([{ key: 'saved' }], { focus: ['stress'] })
    const tree = h.render(p); const after = tree.find(n => n.type === 'TestExplorer')
    assert.equal(after.key, before.key, failCourse + ' failure must not discard the checked choices')
    assert.equal(tree.find(n => n.props?.id === 'my-test-explorer').props.hidden, false)
    assert.equal(h.requests.filter(r => r.path.endsWith('test-plans') && r.options.method === 'POST').length, 1)
  }
})
test('reload failure after plan save keeps the draft available', async () => {
  const h = batteryHarness(); h.query('explore=1'); const p = { ...props(), reload: async () => { throw Error('reload unavailable') } }
  const before = h.render(p).find(n => n.type === 'TestExplorer')
  await before.props.onStart([{ key: 'saved' }], { focus: ['stress'] })
  const tree = h.render(p)
  assert.equal(tree.find(n => n.type === 'TestExplorer').key, before.key)
  assert.equal(tree.find(n => n.props?.id === 'my-test-explorer').props.hidden, false)
})

test('compact account copy is opt-in and leaves explicit save callbacks intact in EN/RU/ES', async () => {
  const source = readFileSync(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8')
  const modules = {}
  const root = process.env.PICKER_LIBRARY_ROOT ? new URL('file://' + process.env.PICKER_LIBRARY_ROOT + '/') : new URL('../', import.meta.url)
  for (const [, name] of source.matchAll(/from ['"](@\/[^'"]+)['"]/g)) modules[name] = await import(new URL(name.slice(2) + '.js', root))
  const exported = {}, jsx = (type, props) => ({ type, props })
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported,
    require(name) {
      if (modules[name]) return modules[name]
      if (name === 'react') return { useState: value => [value, () => {}], useEffect() {} }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/link') return { default: 'Link' }
      if (name.endsWith('.css')) return { default: {} }
      return {}
    },
  })
  for (const [locale, label, startLabel, guestLabel] of [
    ['en', 'Add selected tests', 'Start test', 'Take test'],
    ['ru', 'Добавить выбранные тесты', 'Начать тест', 'Пройти'],
    ['es', 'Añadir pruebas seleccionadas', 'Iniciar prueba', 'Realizar'],
  ]) {
    const started = []
    const p = { locale, focus: [], depth: 'balanced', maxMinutes: 0, recommendations: [{ key: 'sample', title: 'Sample', topics: [], durationMinutes: 2 }], activeBattery: [{ key: 'sample', title: 'Sample' }], matchCount: 1, onStart() {}, onStartSingle(entry) { started.push(entry.key) } }
    const publicTree = exported.SimpleTestPicker(p)
    assert.equal(JSON.stringify(publicTree), JSON.stringify(exported.SimpleTestPicker({ ...p, authenticated: false })))
    assert.equal(publicTree.props['data-public-test-picker'], 'true', 'public tests must remain accessible without signing in')
    const accountTree = exported.SimpleTestPicker({ ...p, authenticated: true })
    assert.ok(!JSON.stringify(accountTree).includes('Google'))
    assert.ok(JSON.stringify(accountTree).includes(label))
    const cardStart = elements(accountTree).find(n => n.type === 'button' && n.props?.['aria-label'] === startLabel + ': Sample')
    assert.ok(cardStart, 'signed-in per-card button must say ' + startLabel)
    cardStart.props.onClick()
    assert.equal(started.at(-1), 'sample')
    assert.ok(elements(publicTree).some(n => n.type === 'button' && n.props?.['aria-label'] === guestLabel + ': Sample'), 'guest Start test copy stays untouched')
    assert.equal(elements(accountTree).find(n => n.props?.['data-test-start-mode'] === 'tests').props.onClick, p.onStart)
  }
})


// The account explorer mounts lazily only after the user opens the top disclosure.
function openedPicker(h, accountProps = props()) {
  const dashboard = h.render(accountProps).find(n => n.type === 'MyTestsDashboard')
  assert.ok(dashboard, 'account dashboard must render')
  dashboard.props.onOpenFilters()
  const picker = h.render(accountProps).find(n => n.type === 'TestExplorer')
  assert.ok(picker, 'test picker must be mounted after opening')
  return picker
}

const target = { key: 'saved', selectable: true,
  definition: { id: 'saved-v1', key: 'saved', version: '1', instrumentLocale: 'en' } }

test('one-tap Start test adds exactly the chosen instrument and opens its runner', async () => {
  const h = batteryHarness()
  const picker = openedPicker(h)
  assert.equal(typeof picker.props.onStartSingle, 'function')
  await picker.props.onStartSingle(target, { focus: ['stress'], axes: ['anxiety'] })
  const writes = h.requests.filter(r => r.options.method === 'POST')
  assert.equal(writes.length, 2, 'plan add and run start are the only writes')
  assert.equal(writes[0].path, '/api/app/test-plans')
  const payload = JSON.parse(writes[0].options.body)
  assert.equal(payload.appendActive, true)
  assert.equal(payload.replaceActive, undefined)
  assert.equal(payload.items.length, 1)
  assert.equal(payload.items[0].definitionKey, 'saved')
  assert.equal(payload.items[0].definitionVersion, '1')
  assert.equal('selectionPreferences' in payload, false, 'individual Start test does not overwrite user filter preferences')
  assert.equal(writes[1].path, '/api/app/runs')
  const runPayload = JSON.parse(writes[1].options.body)
  assert.equal(runPayload.definitionKey, 'saved')
  assert.equal(h.navigation.length, 1)
  assert.equal(h.navigation[0][0], 'push')
  assert.equal(h.navigation[0][1], '/en/app/runs/run-1?mode=quick&plan=plan')
})

test('double taps on Start test yield one save request and one run', async () => {
  const h = batteryHarness({ holdSave: true })
  const picker = openedPicker(h)
  const first = picker.props.onStartSingle(target, {})
  const second = picker.props.onStartSingle(target, {})
  assert.equal(h.requests.filter(r => r.path.endsWith('/test-plans')).length, 1)
  h.releaseSave()
  await Promise.all([first, second])
  assert.equal(h.requests.filter(r => r.path.endsWith('/runs')).length, 1)
  assert.equal(h.navigation.filter(([action]) => action === 'push').length, 1)
})

test('failed save does not open a run, and a failed run reports that selection was saved', async () => {
  const failedSave = batteryHarness({ failSave: true })
  const fromSave = openedPicker(failedSave)
  await assert.rejects(fromSave.props.onStartSingle(target, {}), /Could not add the test/)
  assert.equal(failedSave.requests.filter(r => r.path.endsWith('/runs')).length, 0)
  assert.equal(failedSave.navigation.length, 0)

  const failedRun = batteryHarness({ failRun: true })
  const fromRun = openedPicker(failedRun)
  await assert.rejects(fromRun.props.onStartSingle(target, {}), /Test saved to My tests/)
  assert.equal(failedRun.requests.filter(r => r.path.endsWith('/test-plans')).length, 1)
  assert.equal(failedRun.requests.filter(r => r.path.endsWith('/runs')).length, 1)
  assert.equal(failedRun.navigation.length, 0)
})

test('retaking a test from a completed battery avoids advancing the historic plan', async () => {
  const h = batteryHarness({ planStatus: 'completed' })
  const picker = openedPicker(h)
  await picker.props.onStartSingle(target, {})
  assert.deepEqual(h.navigation[0], ['push', '/en/app/runs/run-1?mode=quick'])
})

test('course selection still uses the existing explicit Save flow, not auto-run', () => {
  const h = batteryHarness()
  h.query('course=1&explore=1')
  const picker = h.render(props()).find(n => n.type === 'TestExplorer')
  assert.equal(picker.props.onStartSingle, null)
  assert.equal(picker.props.explicitSelectionOnly, true)
})
