import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-asrs6.mjs')
const parsed = ts.createSourceFile('verify-asrs6.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
assert.equal(parsed.parseDiagnostics.length, 0)
const liveTry = parsed.statements.filter(ts.isTryStatement)
assert.equal(liveTry.length, 1, 'one direct executed browser journey')
const statements = [...liveTry[0].tryBlock.statements]
const starts = statements.filter(node => node.getText(parsed) === "await navigate(page, origin + '/en/app')")
assert.equal(starts.length, 1, 'one direct initial Cabinet navigation')
const index = statements.indexOf(starts[0])
assert.ok(statements.slice(0, index).every(node => !ts.isReturnStatement(node) && !ts.isThrowStatement(node)), 'entry is not after a direct early exit')
const ends = statements.slice(index + 1).filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(item => ts.isIdentifier(item.name) && item.name.text === 'onboarding'))
assert.equal(ends.length, 1, 'one direct onboarding boundary')
const start = starts[0].getStart(parsed), end = ends[0].getStart(parsed)
assert.ok(start > 0 && end > start, 'exercise actual live initial entry statements')
const enter = new Function('page', 'expect', 'navigate', 'origin',
  'return (async () => {' + source.slice(start, end) + '})()')

// Execute the actual guest portal JSX, with only element construction, icons,
// Link and CSS substituted. No assessment definitions or scoring are imported.
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const loaded = { exports: {} }
runInNewContext(ts.transpileModule(read('components/app/cabinet-guest-overview.jsx'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: loaded.exports, require: name => {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === 'next/link') return { default: 'a' }
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null })
  if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
  assert.fail('Unexpected portal dependency: ' + name)
} }, { timeout: 1000 })
const children = node => [node?.props?.children].flat(Infinity).filter(x => x != null && x !== false)
const walk = node => typeof node !== 'object' || node == null ? [] : [node, ...children(node).flatMap(walk)]
const text = node => typeof node === 'object' && node != null ? children(node).map(text).join('') : String(node ?? '')

function fixture({ busy = false, unavailable = false, omitPortal = false } = {}) {
  let signinCalls = 0, decoyCalls = 0
  const paths = []
  const portal = loaded.exports.default({ locale: 'en', busy, unavailable, onSignin: () => { signinCalls++ } })
  const decoy = name => ({ type: 'button', props: { children: name, onClick: () => { decoyCalls++ } } })
  const tree = { type: 'main', props: { children: [
    decoy('Continue with Google'), decoy('Open my Cabinet with Google'), ...(omitPortal ? [] : [portal]),
  ] } }
  const locator = nodes => ({
    nodes,
    locator(selector) {
      assert.equal(selector, '[data-cabinet-guest-overview="true"]')
      return locator(nodes.flatMap(walk).filter(node => node.props['data-cabinet-guest-overview'] === 'true'))
    },
    getByRole(role, options) {
      assert.equal(role, 'button'); assert.equal(options.exact, true)
      return locator(nodes.flatMap(walk).filter(node => node.type === 'button' && text(node) === options.name))
    },
    async click(...options) {
      assert.deepEqual(options, [], 'native click must not use force or timeout overrides')
      assert.equal(nodes.length, 1, 'click must identify exactly one current button')
      assert.notEqual(nodes[0].props.disabled, true, 'the real CTA must be enabled')
      assert.equal(typeof nodes[0].props.onClick, 'function')
      nodes[0].props.onClick()
    },
  })
  const page = locator([tree])
  const expect = target => ({ async toBeVisible() { assert.equal(target.nodes.length, 1, 'current Cabinet entry must be visible') } })
  const navigate = async (target, path) => { assert.equal(target, page); paths.push(path) }
  return { page, expect, navigate, paths, portal, signinCalls: () => signinCalls, decoyCalls: () => decoyCalls }
}
const run = f => enter(f.page, f.expect, f.navigate, 'http://localhost:3100')

test('actual ASRS entry clicks the current rendered Cabinet CTA and its real handler, not outside decoys', { timeout: 5000 }, async () => {
  const f = fixture()
  assert.ok(walk(f.portal).some(node => node.type === 'button' && text(node) === 'Open my Cabinet with Google'))
  await run(f)
  assert.deepEqual(f.paths, ['http://localhost:3100/en/app'])
  assert.equal(f.signinCalls(), 1)
  assert.equal(f.decoyCalls(), 0)
})

for (const state of ['busy', 'unavailable', 'omitPortal']) {
  test('ASRS entry refuses ' + state + ' instead of substituting another Google button', { timeout: 5000 }, async () => {
    const f = fixture({ [state]: true })
    await assert.rejects(run(f))
    assert.equal(f.signinCalls(), 0); assert.equal(f.decoyCalls(), 0)
  })
}

test('entry repair keeps explicit consent and authenticated portrait/My Tests acceptance afterward', { timeout: 5000 }, () => {
  const onboarding = end
  const adult = source.indexOf("await page.getByLabel('I am 18 or older.').check()", onboarding)
  const consent = source.indexOf("await page.getByLabel('I agree to private processing', { exact: false }).check()", adult)
  const portrait = source.indexOf('await assertCabinetPortrait(page, expect, { origin })', consent)
  const tests = source.indexOf('await openCabinetMyTests(page, expect, { origin })', portrait)
  assert.ok(onboarding > start && adult > onboarding && consent > adult && portrait > consent && tests > portrait)
  assert.ok(source.indexOf('assertIsolated()') > 0)
  assert.doesNotMatch(source.slice(start, end), /waitForTimeout|setTimeout|request\.|\.catch\(/)
})
