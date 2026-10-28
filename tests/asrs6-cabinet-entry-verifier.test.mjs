import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
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
      assert.deepEqual(options, [], 'entry must use the native click without overrides')
      assert.equal(nodes.length, 1, 'click must identify exactly one current button')
      assert.notEqual(nodes[0].props.disabled, true, 'the real CTA must be enabled')
      assert.equal(typeof nodes[0].props.onClick, 'function')
      nodes[0].props.onClick()
    },
  })
  const page = locator([tree])
  page.goto = async path => { paths.push(path) }
  const expect = target => ({ async toBeVisible() { assert.equal(target.nodes.length, 1, 'current Cabinet entry must be visible') } })
  const navigate = async (target, path) => { assert.equal(target, page); paths.push(path) }
  return { page, expect, navigate, paths, portal, signinCalls: () => signinCalls, decoyCalls: () => decoyCalls }
}
for (const { label, path, startStatement, endStatement, consentStatement } of [
  { label: 'ASRS', path: 'scripts/verify-asrs6.mjs',
    startStatement: "  await navigate(page, origin + '/en/app')", endStatement: '  const onboarding = ',
    consentStatement: "await page.getByLabel('I agree to private processing', { exact: false }).check()" },
  { label: 'personality', path: 'scripts/verify-personality-types.mjs',
    startStatement: " await navigate(page,origin+'/en/app')", endStatement: " await expect(page.getByRole('heading'",
    consentStatement: "await page.getByLabel('I agree to private processing',{exact:false}).check()" },
  { label: 'account status', path: 'scripts/verify-account-status-filters.mjs',
    startStatement: "  await page.goto(origin + '/en/app')", endStatement: "  await expect(page.getByRole('heading'",
    consentStatement: "await page.getByLabel('I agree to private processing', { exact: false }).check()" },
]) {
const source = read(path)
const start = source.indexOf(startStatement), end = source.indexOf(endStatement, start)
assert.ok(start > 0 && end > start, 'exercise the actual initial browser-entry block: ' + label)
const enter = new Function('page', 'expect', 'navigate', 'origin',
  'return (async () => {' + source.slice(start, end) + '})()')
const run = f => enter(f.page, f.expect, f.navigate, 'http://localhost:3100')

test('actual ' + label + ' entry clicks the current rendered Cabinet CTA and its real handler, not outside decoys', { timeout: 5000 }, async () => {
  const f = fixture()
  assert.ok(walk(f.portal).some(node => node.type === 'button' && text(node) === 'Open my Cabinet with Google'))
  await run(f)
  assert.deepEqual(f.paths, ['http://localhost:3100/en/app'])
  assert.equal(f.signinCalls(), 1)
  assert.equal(f.decoyCalls(), 0)
})

for (const state of ['busy', 'unavailable', 'omitPortal']) {
  test(label + ' entry refuses ' + state + ' instead of substituting another Google button', { timeout: 5000 }, async () => {
    const f = fixture({ [state]: true })
    await assert.rejects(run(f))
    assert.equal(f.signinCalls(), 0); assert.equal(f.decoyCalls(), 0)
  })
}

test(label + ' entry repair keeps explicit consent and authenticated portrait/My Tests acceptance afterward', { timeout: 5000 }, () => {
  const onboarding = end
  const adult = source.indexOf("await page.getByLabel('I am 18 or older.').check()", onboarding)
  const consent = source.indexOf(consentStatement, adult)
  const portrait = source.indexOf('await assertCabinetPortrait(page, expect, { origin })', consent)
  const tests = source.indexOf('await openCabinetMyTests(page, expect, { origin })', portrait)
  assert.ok(onboarding > start && adult > onboarding && consent > adult && portrait > consent && tests > portrait)
  assert.ok(source.indexOf('assertIsolated()') > 0)
  assert.doesNotMatch(source.slice(start, end), /waitForTimeout|setTimeout|request\.|\.catch\(/)
})

}
