import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const verifier = read('scripts/verify-mhc-sf.mjs')
const overview = read('components/app/cabinet-guest-overview.jsx')
const signinName = 'Open my Cabinet with Google'
const signinCall = `await page.getByRole('button',{name:'${signinName}',exact:true}).click()`
const navigateCall = "await navigate(page,origin+'/en/app')"
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
// The current native button has text plus an aria-hidden decorative icon.
// Reject unsupported naming mechanisms instead of approximating their names.
function buttonName(button) {
  assert.equal(button.props['aria-label'], undefined, 'button name must come from visible text')
  assert.equal(button.props['aria-labelledby'], undefined, 'button name must come from visible text')
  const text = value => Array.isArray(value) ? value.map(text).join('')
    : typeof value === 'string' || typeof value === 'number' ? String(value)
      : value && typeof value === 'object' && value.props['aria-hidden'] !== 'true'
        ? text(value.props.children) : ''
  return text(button.props.children).trim()
}

function renderOverview(source, onSignin, props = {}) {
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'link' },
    'lucide-react': Object.fromEntries([
      'Activity', 'ArrowRight', 'BookOpenCheck', 'ChartNoAxesCombined', 'ClipboardCheck',
      'FilePenLine', 'GraduationCap', 'LockKeyhole', 'ShieldCheck', 'Sparkles', 'Users',
    ].map(name => [name, 'icon-' + name])),
    './cabinet-guest-overview.module.css': { default: {} },
  }
  const output = ts.transpileModule(source, {
    fileName: 'cabinet-guest-overview.jsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(output, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'unmocked component dependency: ' + name)
    return modules[name]
  } }, { timeout: 1000 })
  return nodes(exports.default({ locale: 'en', onSignin, ...props }))
}

function accountEntry(source) {
  const ast = ts.createSourceFile('verify-mhc-sf.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(ast.parseDiagnostics.length, 0, 'verifier must parse')
  const blocks = ast.statements.filter(ts.isTryStatement)
  assert.equal(blocks.length, 1, 'one top-level MHC-SF journey')
  const statements = [...blocks[0].tryBlock.statements]
  const indices = statements.flatMap((node, i) => node.getText(ast) === navigateCall ? [i] : [])
  assert.equal(indices.length, 1, 'one actual English Cabinet entry navigation')
  const start = indices[0], click = statements[start + 1]
  assert.ok(ts.isExpressionStatement(click) && ts.isAwaitExpression(click.expression), 'await the sign-in click')
  const call = click.expression.expression
  assert.ok(ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === 'click' && call.arguments.length === 0, 'execute the real sign-in click')
  return { statements, click: click.getText(ast) }
}

async function exerciseSignin(source = verifier, component = overview, props = {}) {
  const { click } = accountEntry(source)
  let calls = 0
  const onSignin = () => { calls++ }
  const rendered = renderOverview(component, onSignin, props)
  assert.equal(rendered.filter(node => node.props['data-cabinet-guest-overview'] === 'true').length, 1)
  const page = { getByRole(role, options) {
    assert.equal(role, 'button', 'sign-in must use the native button role')
    assert.equal(typeof options.name, 'string', 'sign-in name must be an exact string, not a Google regex')
    assert.equal(options.exact, true, 'partial Google matching is forbidden')
    assert.deepEqual(Object.keys(options).sort(), ['exact', 'name'])
    const matches = rendered.filter(node => node.type === 'button' && buttonName(node) === options.name)
    assert.equal(matches.length, 1, 'exactly one current Cabinet sign-in button must match')
    const button = matches[0]
    assert.equal(buttonName(button), signinName)
    assert.equal(button.props.type, 'button')
    assert.equal(button.props.disabled, false, 'sign-in must be enabled')
    assert.equal(button.props.onClick, onSignin, 'real Cabinet sign-in callback must remain wired')
    return { async click() { button.props.onClick() } }
  } }
  await runInNewContext('(async () => { ' + click + ' })()', { page }, { timeout: 1000 })
  assert.equal(calls, 1, 'the actual selector must invoke sign-in once')
}

function assertAuthenticationSequence(source) {
  const { statements } = accountEntry(source)
  const compact = text => text.replace(/\s+/g, ' ').trim()
  const expected = [
    'const account=await browser.newContext({viewport:{width:390,height:844}})',
    'page=await account.newPage()',
    "observePage(page,'account')",
    navigateCall,
    signinCall,
    "await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-profile-domains]')).first()).toBeVisible({timeout:60000})",
    `if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
      await page.getByLabel('I am 18 or older.').check()
      await page.getByLabel('I agree to private processing',{exact:false}).check()
      await page.getByRole('button',{name:'Create my private space',exact:true}).click()
    }`,
    'await assertCabinetPortrait(page, expect, { origin })',
    'await openCabinetMyTests(page, expect, { origin })',
  ]
  assert.deepEqual(statements.slice(0, expected.length).map(node => compact(node.getText())), expected.map(compact),
    'preserve isolated context, actual sign-in, consent, portrait and My Tests sequence without authentication bypass')
  assert.ok(ts.isForOfStatement(statements[expected.length]), 'assessment journey follows the authenticated navigation')
}

const changed = (source, from, to) => {
  assert.ok(source.includes(from), 'mutation must target actual source')
  const mutated = source.replace(from, to)
  assert.notEqual(mutated, source, 'mutation must change actual source')
  return mutated
}

test('MHC-SF browser sign-in executes its actual exact selector against rendered CabinetGuestOverview', async () => {
  await exerciseSignin()
  assertAuthenticationSequence(verifier)
})

for (const [name, from, to, error] of [
  ['obsolete label', signinName, 'Continue with Google', /exactly one current Cabinet sign-in button/],
  ['arbitrary Google text', signinName, 'Google', /exactly one current Cabinet sign-in button/],
  ['broad Google regex', `name:'${signinName}'`, 'name:/Google/', /exact string/],
  ['partial matching', `name:'${signinName}',exact:true`, `name:'${signinName}',exact:false`, /partial Google matching/],
  ['wrong role', `getByRole('button',{name:'${signinName}'`, `getByRole('link',{name:'${signinName}'`, /native button role/],
  ['missing click', signinCall, `await page.getByRole('button',{name:'${signinName}',exact:true})`, /real sign-in click/],
  ['missing await', signinCall, signinCall.replace('await ', ''), /await the sign-in click/],
]) test('MHC-SF browser sign-in rejects ' + name, async () => {
  await assert.rejects(exerciseSignin(changed(verifier, from, to)), error)
})

for (const [name, from, to, error] of [
  ['stale rendered label', `signin: '${signinName}'`, "signin: 'Continue with Google'", /exactly one current Cabinet sign-in button/],
  ['disconnected sign-in handler', 'onClick={onSignin}', 'onClick={() => {}}', /callback must remain wired/],
  ['duplicate sign-in button', '{!unavailable && <button', `<button type="button" disabled={busy} onClick={onSignin}>{t.signin}</button>{!unavailable && <button`, /exactly one current Cabinet sign-in button/],
]) test('MHC-SF browser sign-in rejects ' + name, async () => {
  await assert.rejects(exerciseSignin(verifier, changed(overview, from, to)), error)
})

test('MHC-SF browser sign-in cannot click unavailable or busy Cabinet entry', async () => {
  await assert.rejects(exerciseSignin(verifier, overview, { unavailable: true }), /exactly one current Cabinet sign-in button/)
  await assert.rejects(exerciseSignin(verifier, overview, { busy: true }), /exactly one current Cabinet sign-in button/)
})

for (const [name, from, to] of [
  ['injected session', signinCall, "await account.addCookies([{name:'session',value:'bypass'}])\n " + signinCall],
  ['skipped consent', "await page.getByLabel('I agree to private processing',{exact:false}).check()", ''],
  ['skipped portrait verification', 'await assertCabinetPortrait(page, expect, { origin })', ''],
  ['direct Tests navigation', 'await openCabinetMyTests(page, expect, { origin })', "await navigate(page,origin+'/en/app/tests')"],
]) test('MHC-SF browser sign-in rejects ' + name, () => {
  assert.throws(() => assertAuthenticationSequence(changed(verifier, from, to)),
    /real sign-in click|preserve isolated context/)
})
