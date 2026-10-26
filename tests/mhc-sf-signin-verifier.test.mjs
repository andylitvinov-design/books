import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const verifier = read('scripts/verify-mhc-sf.mjs')
const overview = read('components/app/cabinet-guest-overview.jsx')
const signinName = 'Open my Cabinet with Google'
const rootSelector = '[data-cabinet-guest-overview="true"]'
const navigateCall = "await navigate(page,origin+'/en/app')"
const entry = [
  `const cabinetEntry=page.locator('${rootSelector}')`,
  'await expect(cabinetEntry).toHaveCount(1)',
  'await expect(cabinetEntry).toBeVisible()',
  `const signIn=cabinetEntry.getByRole('button',{name:'${signinName}',exact:true})`,
  'await expect(signIn).toHaveCount(1)',
  'await expect(signIn).toBeVisible()',
  'await expect(signIn).toBeEnabled()',
  'await signIn.click()',
]
const parse = source => {
  const ast = ts.createSourceFile('verify-mhc-sf.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(ast.parseDiagnostics.length, 0, 'verifier must parse')
  return ast
}
const printer = ts.createPrinter({ removeComments: true })
const printed = source => printer.printFile(parse(source))
function accountEntry(source) {
  const ast = parse(source)
  const tries = ast.statements.filter(ts.isTryStatement)
  assert.equal(tries.length, 1, 'one top-level MHC-SF journey')
  const statements = [...tries[0].tryBlock.statements]
  const expected = [
    'const account=await browser.newContext({viewport:{width:390,height:844}})',
    'page=await account.newPage()',
    "observePage(page,'account')",
    navigateCall,
    ...entry,
    "await expect(page.getByRole('heading',{name:'Create my private space',exact:true}).or(page.locator('[data-profile-domains]')).first()).toBeVisible({timeout:60000})",
    `if(await page.getByRole('heading',{name:'Create my private space',exact:true}).isVisible()){
      await page.getByLabel('I am 18 or older.').check()
      await page.getByLabel('I agree to private processing',{exact:false}).check()
      await page.getByRole('button',{name:'Create my private space',exact:true}).click()
    }`,
    'await assertCabinetPortrait(page, expect, { origin })',
    'await openCabinetMyTests(page, expect, { origin })',
  ].join('\n')
  assert.equal(printed(statements.slice(0, 4 + entry.length + 4).map(n => n.getText(ast)).join('\n')), printed(expected),
    'preserve isolated context, scoped unique native sign-in, explicit consent and existing portrait/Tests sequence')
  assert.ok(ts.isForOfStatement(statements[4 + entry.length + 4]), 'assessment journey must follow account entry')
  return statements.slice(4, 4 + entry.length).map(n => n.getText(ast)).join('\n')
}

const jsx = (type, props) => ({ type, props: props || {} })
const visible = props => !props.hidden && props['aria-hidden'] !== true && props['aria-hidden'] !== 'true' &&
  props.style?.display !== 'none' && props.style?.visibility !== 'hidden'
const nodes = (tree, parentVisible = true) => Array.isArray(tree) ? tree.flatMap(child => nodes(child, parentVisible))
  : tree && typeof tree === 'object' ? [
    { ...tree, visible: parentVisible && visible(tree.props) },
    ...nodes(tree.props.children, parentVisible && visible(tree.props)),
  ] : []
function buttonName(button) {
  assert.equal(button.props['aria-label'], undefined, 'name must come from actual visible text')
  assert.equal(button.props['aria-labelledby'], undefined, 'name must come from actual visible text')
  const text = value => Array.isArray(value) ? value.map(text).join('')
    : typeof value === 'string' || typeof value === 'number' ? String(value)
      : value && typeof value === 'object' && visible(value.props) ? text(value.props.children) : ''
  return text(button.props.children).trim()
}
function renderOverview(source, onSignin, props) {
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
  const exportsValue = {}
  runInNewContext(output, { exports: exportsValue, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'unmocked component dependency: ' + name)
    return modules[name]
  } }, { timeout: 1000 })
  return exportsValue.default({ locale: 'en', onSignin, ...props })
}

// Execute only the actual selector block. Never import the verifier, app auth,
// provider or admin/DB modules; component dependencies are inert render shims.
async function exercise({ source = verifier, component = overview, props = {}, duplicateRoot = false } = {}) {
  const block = accountEntry(source), events = []
  let handlerCalls = 0
  const onSignin = () => { handlerCalls++ }
  const tree = renderOverview(component, onSignin, props)
  const all = nodes(duplicateRoot ? [tree, tree] : tree)
  const page = { locator(selector) {
    assert.equal(selector, rootSelector, 'scope must be the actual public Cabinet root')
    const roots = all.filter(node => node.props['data-cabinet-guest-overview'] === 'true')
    return { kind: 'root', matches: roots, getByRole(role, options) {
      assert.equal(role, 'button', 'use the native button role')
      assert.equal(typeof options.name, 'string', 'exact name, not a broad Google regex')
      assert.equal(options.exact, true)
      assert.deepEqual(Object.keys(options).sort(), ['exact', 'name'])
      const matches = roots.flatMap(root => nodes(root, root.visible)).filter(node =>
        node.type === 'button' && buttonName(node) === options.name)
      return { kind: 'signin', matches, async click() {
        assert.equal(matches.length, 1)
        const button = matches[0]
        assert.equal(button.visible, true)
        assert.equal(button.props.type, 'button')
        assert.equal(button.props.disabled, false)
        assert.equal(button.props.onClick, onSignin, 'actual onSignin handler must remain connected')
        assert.deepEqual(events, ['root-count', 'root-visible', 'signin-count', 'signin-visible', 'signin-enabled'])
        button.props.onClick()
        events.push('signin-click')
      } }
    } }
  } }
  const expect = target => ({
    async toHaveCount(count) { assert.equal(count, 1); assert.equal(target.matches.length, 1, 'exactly one matching ' + target.kind); events.push(target.kind + '-count') },
    async toBeVisible() { assert.equal(target.matches.length, 1); assert.equal(target.matches[0].visible, true, 'visible ' + target.kind); events.push(target.kind + '-visible') },
    async toBeEnabled() { assert.equal(target.kind, 'signin'); assert.equal(target.matches.length, 1); assert.equal(target.matches[0].props.disabled, false, 'enabled native sign-in'); events.push('signin-enabled') },
  })
  await runInNewContext('(async () => { ' + block + ' })()', { page, expect }, { timeout: 1000 })
  assert.equal(handlerCalls, 1, 'exact selector delegates once to actual component callback')
  assert.equal(events.at(-1), 'signin-click')
}
const changed = (source, from, to) => {
  assert.equal(source.split(from).length - 1, 1, 'mutation must change one actual source fragment')
  return source.replace(from, to)
}

test('MHC-SF actual scoped count-one selector calls the current native Cabinet sign-in once', async () => { await exercise() })
for (const [name, from, to] of [
  ['retired label', signinName, 'Continue with Google'],
  ['broad Google regex', `name:'${signinName}'`, 'name:/Google/'],
  ['partial match', `name:'${signinName}',exact:true`, `name:'${signinName}',exact:false`],
  ['wrong role', `getByRole('button',{name:'${signinName}'`, `getByRole('link',{name:'${signinName}'`],
  ['unscoped selector', 'const signIn=cabinetEntry.getByRole', 'const signIn=page.getByRole'],
  ['first-match fallback', 'await signIn.click()', 'await signIn.first().click()'],
  ['missing root count', 'await expect(cabinetEntry).toHaveCount(1)', ''],
  ['missing root visibility', 'await expect(cabinetEntry).toBeVisible()', ''],
  ['missing button count', 'await expect(signIn).toHaveCount(1)', ''],
  ['missing button visibility', 'await expect(signIn).toBeVisible()', ''],
  ['missing enabled guard', 'await expect(signIn).toBeEnabled()', ''],
  ['missing click', 'await signIn.click()', ''],
  ['missing click await', 'await signIn.click()', 'signIn.click()'],
  ['force click', 'await signIn.click()', 'await signIn.click({force:true})'],
  ['injected session', navigateCall, "await account.addCookies([{name:'session',value:'bypass'}])\n" + navigateCall],
  ['skipped consent', "await page.getByLabel('I agree to private processing',{exact:false}).check()", ''],
  ['direct Tests bypass', 'await openCabinetMyTests(page, expect, { origin })', "await navigate(page,origin+'/en/app/tests')"],
]) test('MHC-SF source contract rejects ' + name, async () => {
  await assert.rejects(exercise({ source: changed(verifier, from, to) }), /preserve isolated context/)
})
for (const [name, from, to] of [
  ['stale rendered label', `signin: '${signinName}'`, "signin: 'Continue with Google'"],
  ['disconnected handler', 'onClick={onSignin}', 'onClick={() => {}}'],
  ['hidden button', '{!unavailable && <button', '{!unavailable && <button hidden'],
  ['hidden ancestor', '<div className={styles.actions}>', '<div hidden className={styles.actions}>'],
  ['duplicate button', '{!unavailable && <button', `<button type="button" disabled={busy} onClick={onSignin}>{t.signin}</button>{!unavailable && <button`],
]) test('MHC-SF component contract rejects ' + name, async () => {
  await assert.rejects(exercise({ component: changed(overview, from, to) }))
})
test('MHC-SF cannot choose a duplicate public Cabinet root', async () => { await assert.rejects(exercise({ duplicateRoot: true }), /exactly one matching root/) })
for (const props of [{ busy: true }, { unavailable: true }]) test('MHC-SF does not sign in when ' + Object.keys(props)[0], async () => {
  await assert.rejects(exercise({ props }), /exactly one matching signin/)
})

test('MHC-SF entry regression is explicitly included in test:app', () => {
  const command = JSON.parse(read('package.json')).scripts['test:app']
  assert.equal(command.split(/\s+/).filter(token => token === 'tests/mhc-sf-signin-verifier.test.mjs').length, 1)
})
