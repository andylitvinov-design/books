import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const installed = require('next/package.json')
const locked = JSON.parse(read('package-lock.json')).packages['node_modules/next']
const map = JSON.parse(readFileSync(require.resolve('next/dist/compiled/next-devtools/index.js.map'), 'utf8'))
const vendor = suffix => {
  const indexes = map.sources.flatMap((name, index) => name.endsWith(suffix) ? [index] : [])
  assert.equal(indexes.length, 1, 'one installed Next source: ' + suffix)
  return map.sourcesContent[indexes[0]]
}
function compile(source, env = {}, modules = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, process: { env }, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected runtime import: ' + name)
    return modules[name]
  } })
  return exports
}
const isolated = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', NODE_ENV: 'development' }

test('only isolated development CI disables the idle badge using the installed supported config', () => {
  assert.equal(installed.version, locked.version)
  const config = compile(read('next.config.ts'), isolated).default
  assert.equal(config.devIndicators, false)
  assert.equal(config.reactStrictMode, true)
  assert.equal(require('next/dist/server/config-schema').configSchema.safeParse(config).success, true)
  for (const env of [{}, { ...isolated, CI: 'false' }, { ...isolated, CI: undefined },
    { ...isolated, HH_APP_TEST_RUNTIME: undefined }, { ...isolated, HH_APP_TEST_RUNTIME: 'production' },
    { ...isolated, NODE_ENV: 'production' }, { ...isolated, NODE_ENV: 'test' }, { ...isolated, VERCEL: '1' }]) {
    assert.equal(compile(read('next.config.ts'), env).default.devIndicators, undefined)
  }
})

test('the locked Next badge hides when healthy and reappears for errors even with devIndicators false', () => {
  const source = vendor('/components/devtools-indicator/next-logo.tsx')
  const parsed = ts.createSourceFile('next-logo.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(parsed) === 'display' && node.initializer.getText(parsed).includes('state.disableDevIndicator')) matches.push(node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.equal(matches.length, 1)
  const display = new Function('state', 'hasError', 'dismissed', 'return (' + matches[0].getText(parsed) + ')')
  assert.match(source, /\[dismissed, setDismissed\] = useState\(false\)/)
  assert.equal(display({ disableDevIndicator: true }, false, false), 'none')
  assert.equal(display({ disableDevIndicator: true }, true, false), 'block')
  assert.equal(display({ disableDevIndicator: false }, false, false), 'block')
  const shared = vendor('/dev-overlay/shared.ts')
  assert.match(shared, /case ACTION_DEV_INDICATOR: \{[\s\S]*?showIndicator: true,[\s\S]*?shouldDisableDevIndicator/)
  const overlay = vendor('/dev-overlay/dev-overlay.tsx')
  assert.ok(overlay.includes('<ErrorOverlay'))
  assert.doesNotMatch(overlay, /disableDevIndicator/)
})

test('actual installed Next compile and runtime error components remain rendered with the badge disabled', () => {
  const jsx = (type, props) => ({ type, props })
  const { ErrorOverlay } = compile(vendor('/components/errors/error-overlay/error-overlay.tsx'), {}, {
    '../../../shared': { ACTION_ERROR_OVERLAY_CLOSE: 'close' },
    react: { Suspense: 'Suspense' }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../../container/build-error': { BuildError: 'BuildError' },
    '../../../container/errors': { Errors: 'Errors' },
    '../../../hooks/use-delayed-render': { useDelayedRender: open => ({ mounted: open, rendered: open }) },
  })
  const state = { disableDevIndicator: true, isErrorOverlayOpen: false, buildError: 'Synthetic compile error' }
  const build = ErrorOverlay({ state, runtimeErrors: [], errorCount: 1 })
  assert.equal(build.type, 'BuildError')
  assert.equal(build.props.message, state.buildError)
  assert.equal(build.props.rendered, true)
  const runtimeErrors = [{ error: new Error('Synthetic runtime error') }]
  const runtime = ErrorOverlay({ state: { ...state, buildError: null, isErrorOverlayOpen: true }, runtimeErrors, errorCount: 1 })
  assert.equal(runtime.type, 'Errors')
  assert.equal(runtime.props.runtimeErrors, runtimeErrors)
})

test('browser acceptance keeps ordinary Profile clicks and uncaught-error checks', () => {
  const core = read('scripts/verify-app-r1.mjs')
  assert.ok(core.includes("getByRole('navigation',{name:'Quick navigation'}).getByRole('link',{name:'Profile',exact:true}).click()"))
  assert.ok(core.includes("page.on('pageerror',capturePageError(page))"))
  assert.ok(core.includes("const capturePageError=sourcePage=>error=>"))
  assert.ok(core.includes("errors.push(error.message)"))
  assert.ok(core.includes("assert.deepEqual(errors,[]);passed('no uncaught browser errors')"))
  const workflow = read('.github/workflows/hh-app-browser.yml')
  for (const value of ["CI: 'true'", 'NODE_ENV: development', 'HH_APP_TEST_RUNTIME: isolated', 'npm run dev']) assert.ok(workflow.includes(value))
})
