import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const overview = read('components/app/cabinet-guest-overview.jsx')
const signinName = 'Open my Cabinet with Google'
const callers = [
  'verify-asrs6', 'verify-compassion-assessments', 'verify-relationships-assessments',
  'verify-personality-types', 'verify-account-status-filters',
].map(name => ({ name, source: read('scripts/' + name + '.mjs') }))
const origin = 'http://127.0.0.1:3100'
const jsx = (type, props) => ({ type, props: props || {} })
const visible = props => !props.hidden && props['aria-hidden'] !== 'true' &&
  props.style?.display !== 'none' && props.style?.visibility !== 'hidden'
const nodes = (tree, parentVisible = true) => Array.isArray(tree) ? tree.flatMap(child => nodes(child, parentVisible))
  : tree && typeof tree === 'object' ? [
    { ...tree, visible: parentVisible && visible(tree.props) },
    ...nodes(tree.props.children, parentVisible && visible(tree.props)),
  ] : []

// Reuse the actual-component technique of mhc-sf-signin-verifier.test.mjs,
// without executing a browser, provider, account API, database or full journey.
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
  runInNewContext(output, { exports, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'unmocked component dependency: ' + name)
    return modules[name]
  } }, { timeout: 1000 })
  return nodes(exports.default({ locale: 'en', onSignin, ...props }))
}

function buttonName(button) {
  assert.equal(button.props['aria-label'], undefined, 'name must come from visible text')
  assert.equal(button.props['aria-labelledby'], undefined, 'name must come from visible text')
  const text = value => Array.isArray(value) ? value.map(text).join('')
    : typeof value === 'string' || typeof value === 'number' ? String(value)
      : value && typeof value === 'object' && visible(value.props) ? text(value.props.children) : ''
  return text(button.props.children).trim()
}

const parse = source => {
  const ast = ts.createSourceFile('caller.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(ast.parseDiagnostics.length, 0, 'actual caller must parse')
  return ast
}
const printer = ts.createPrinter({ removeComments: true })
const printed = source => printer.printFile(parse(source))
const rootSelector = '[data-cabinet-guest-overview="true"]'
const signinStatements = [
  `const cabinetEntry = page.locator('${rootSelector}')`,
  'await expect(cabinetEntry).toHaveCount(1)',
  'await expect(cabinetEntry).toBeVisible()',
  `const signIn = cabinetEntry.getByRole('button', { name: '${signinName}', exact: true })`,
  'await expect(signIn).toHaveCount(1)',
  'await expect(signIn).toBeVisible()',
  'await expect(signIn).toBeEnabled()',
  'await signIn.click()',
]
const portraitCall = 'await assertCabinetPortrait(page, expect, { origin })'
const testsCall = 'await openCabinetMyTests(page, expect, { origin })'

function accountEntry({ name, source }) {
  const ast = parse(source)
  const tries = ast.statements.filter(ts.isTryStatement)
  assert.equal(tries.length, 1, 'one top-level browser journey')
  const statements = [...tries[0].tryBlock.statements]
  const navigation = name === 'verify-account-status-filters'
    ? "await page.goto(origin + '/en/app')" : "await navigate(page, origin + '/en/app')"
  const starts = statements.flatMap((node, index) => printed(node.getText(ast)) === printed(navigation) ? [index] : [])
  assert.equal(starts.length, 1, 'one actual English Cabinet entry navigation')
  const start = starts[0]
  const finishes = statements.flatMap((node, index) => index > start && printed(node.getText(ast)) === printed(testsCall) ? [index] : [])
  assert.equal(finishes.length, 1, 'one authenticated My Tests navigation')
  const end = finishes[0]
  const entry = statements.slice(start, end + 1).map(node => node.getText(ast)).join('\n')
  const heading = "page.getByRole('heading', { name: 'Create my private space', exact: true })"
  const onboarding = name === 'verify-asrs6' ? 'onboarding' : heading
  const expected = [
    navigation,
    ...signinStatements,
    ...(name === 'verify-asrs6' ? ['const onboarding = ' + heading] : []),
    `await expect(${onboarding}.or(page.locator('[data-profile-domains]')).first()).toBeVisible({ timeout: 60000 })`,
    `if (await ${onboarding}.isVisible()) {
      await page.getByLabel('I am 18 or older.').check()
      await page.getByLabel('I agree to private processing', { exact: false }).check()
      await page.getByRole('button', { name: 'Create my private space', exact: true }).click()
    }`,
    portraitCall, testsCall,
  ].join('\n')
  assert.equal(printed(entry), printed(expected),
    'preserve actual navigation, awaited exact sign-in, consent, portrait and My Tests order')
  return entry
}

// Evaluate only the extracted real entry sequence. Browser/account operations
// are inert sentinels, and no caller, provider or database module is imported.
async function exercise(caller, { component = overview, props = {}, onboard = true, duplicateRoot = false } = {}) {
  const entry = accountEntry(caller), events = []
  const onSignin = () => events.push('handler')
  const rendered = renderOverview(component, onSignin, props)
  const actualRoots = rendered.filter(node => node.props['data-cabinet-guest-overview'] === 'true')
  const roots = duplicateRoot ? [...actualRoots, ...actualRoots] : actualRoots
  let entered = false, signedIn = false, adult = false, necessary = false, ready = !onboard
  const complete = async (event, change = () => {}) => {
    await Promise.resolve()
    change()
    events.push(event)
  }
  const heading = {
    or(other) {
      assert.equal(other, '[data-profile-domains]')
      return { first: () => ({ kind: 'onboarding-or-profile' }) }
    },
    async isVisible() { assert.ok(signedIn); return onboard },
  }
  const page = {
    async goto(url) {
      assert.equal(url, origin + '/en/app')
      await complete('navigate', () => { entered = true })
    },
    locator(selector) {
      if (selector === '[data-profile-domains]') { assert.ok(signedIn); return selector }
      assert.ok(entered, 'scope the actual landing only after navigation')
      assert.equal(selector, rootSelector)
      return { kind: 'root', matches: roots, getByRole(role, options) {
        assert.equal(role, 'button', 'use the native button role')
        assert.equal(typeof options.name, 'string', 'exact name, not a broad Google regex')
        assert.equal(options.exact, true)
        assert.deepEqual(Object.keys(options).sort(), ['exact', 'name'])
        const matches = roots.flatMap(root => nodes(root, root.visible)).filter(node =>
          node.type === 'button' && buttonName(node) === options.name)
        return { kind: 'signin', matches, async click() {
          assert.equal(matches.length, 1, 'one actual scoped native button')
          const button = matches[0]
          assert.equal(button.visible, true)
          assert.equal(buttonName(button), signinName)
          assert.equal(button.props.type, 'button')
          assert.equal(button.props.disabled, false)
          assert.equal(button.props.onClick, onSignin, 'real sign-in callback must remain wired')
          assert.deepEqual(events, ['navigate', 'root-count', 'root-visible', 'signin-count', 'signin-visible', 'signin-enabled'])
          button.props.onClick()
          await complete('signin', () => { signedIn = true })
        } }
      } }
    },
    getByRole(role, options) {
      assert.equal(options.name, 'Create my private space', 'sign-in selection must be scoped, never a global fallback')
      assert.equal(options.exact, true)
      assert.ok(signedIn, 'onboarding follows completed sign-in')
      if (role === 'heading') return heading
      assert.equal(role, 'button')
      return { async click() {
        assert.ok(adult && necessary, 'both consents precede onboarding submission')
        await complete('create', () => { ready = true })
      } }
    },
    getByLabel(label, options) {
      assert.ok(onboard && signedIn)
      assert.ok(label === 'I am 18 or older.' || label === 'I agree to private processing')
      if (label === 'I agree to private processing') assert.equal(options.exact, false)
      return { async check() {
        const isAdult = label === 'I am 18 or older.'
        if (!isAdult) assert.ok(adult)
        await complete(isAdult ? 'adult' : 'necessary', () => { if (isAdult) adult = true; else necessary = true })
      } }
    },
  }
  const expect = target => ({
    async toHaveCount(count) {
      assert.equal(count, 1)
      assert.equal(target.matches.length, 1, 'exactly one matching ' + target.kind)
      await complete(target.kind + '-count')
    },
    async toBeVisible(options) {
      if (target.kind === 'onboarding-or-profile') {
        assert.equal(options.timeout, 60000); assert.ok(signedIn)
        await complete('visible')
      } else {
        assert.equal(options, undefined)
        assert.equal(target.matches.length, 1)
        assert.equal(target.matches[0].visible, true, 'visible ' + target.kind)
        await complete(target.kind + '-visible')
      }
    },
    async toBeEnabled() {
      assert.equal(target.kind, 'signin'); assert.equal(target.matches.length, 1)
      assert.equal(target.matches[0].props.disabled, false, 'enabled sign-in')
      await complete('signin-enabled')
    },
  })
  await runInNewContext('(async () => { ' + entry + ' })()', {
    page, origin, expect,
    navigate: (target, url) => { assert.equal(target, page); return page.goto(url) },
    async assertCabinetPortrait(target, expectation, options) {
      assert.equal(target, page); assert.equal(expectation, expect); assert.equal(options.origin, origin)
      assert.ok(signedIn && ready, 'portrait requires completed sign-in and consent')
      await complete('portrait')
    },
    async openCabinetMyTests(target, expectation, options) {
      assert.equal(target, page); assert.equal(expectation, expect); assert.equal(options.origin, origin)
      assert.equal(events.at(-1), 'portrait', 'await portrait before visible My Tests navigation')
      await complete('tests')
    },
  }, { timeout: 1000 })
  assert.deepEqual(events, ['navigate', 'root-count', 'root-visible', 'signin-count', 'signin-visible', 'signin-enabled',
    'handler', 'signin', 'visible', ...(onboard ? ['adult', 'necessary', 'create'] : []), 'portrait', 'tests'])
}

const changed = (source, from, to) => {
  assert.equal(source.split(from).length - 1, 1, 'mutation targets one actual source fragment')
  return source.replace(from, to)
}
for (const caller of callers) {
  for (const onboard of [true, false]) test(`${caller.name}: actual scoped Cabinet selector and ${onboard ? 'new-account consent' : 'existing-account'} sequence`, async () => {
    await exercise(caller, { onboard })
  })
  for (const [name, mutate] of [
    ['retired selector', source => changed(source, signinName, 'Continue with Google')],
    ['Google-only selector', source => changed(source, signinName, 'Google')],
    ['broad Google regex', source => changed(source, `'${signinName}'`, '/Google/')],
    ['partial matching', source => changed(source, `name: '${signinName}', exact: true`, `name: '${signinName}', exact: false`)],
    ['wrong role', source => changed(source, `getByRole('button', { name: '${signinName}'`, `getByRole('link', { name: '${signinName}'`)],
    ['unscoped selector', source => changed(source, 'const signIn = cabinetEntry.getByRole', 'const signIn = page.getByRole')],
    ['first-match fallback', source => changed(source, 'await signIn.click()', 'await signIn.first().click()')],
    ['forced click', source => changed(source, 'await signIn.click()', 'await signIn.click({force:true})')],
    ['missing sign-in await', source => changed(source, 'await signIn.click()', 'signIn.click()')],
    ['missing click', source => changed(source, 'await signIn.click()', '')],
    ['missing root count', source => changed(source, 'await expect(cabinetEntry).toHaveCount(1)', '')],
    ['missing root visibility', source => changed(source, 'await expect(cabinetEntry).toBeVisible()', '')],
    ['missing button count', source => changed(source, 'await expect(signIn).toHaveCount(1)', '')],
    ['missing button visibility', source => changed(source, 'await expect(signIn).toBeVisible()', '')],
    ['missing enabled guard', source => changed(source, 'await expect(signIn).toBeEnabled()', '')],
    ['skipped processing consent', source => source.replace(/await page\.getByLabel\('I agree to private processing',\s*\{ ?exact:\s*false\s*\}\)\.check\(\)/, '')],
    ['missing consent await', source => source.replace("await page.getByLabel('I am 18 or older.').check()", "page.getByLabel('I am 18 or older.').check()")],
    ['skipped portrait', source => changed(source, portraitCall, '')],
    ['direct Tests bypass', source => changed(source, testsCall, "await page.goto(origin + '/en/app/tests')")],
    ['injected session', source => changed(source, portraitCall, "await page.context().addCookies([{name:'session',value:'bypass'}])\n" + portraitCall)],
  ]) test(`${caller.name}: rejects ${name}`, async () => {
    const source = mutate(caller.source)
    assert.notEqual(source, caller.source)
    await assert.rejects(exercise({ ...caller, source }), /preserve actual navigation|one authenticated My Tests/)
  })
}
for (const [name, from, to] of [
  ['stale rendered label', `signin: '${signinName}'`, "signin: 'Continue with Google'"],
  ['disconnected handler', 'onClick={onSignin}', 'onClick={() => {}}'],
  ['hidden native button', '{!unavailable && <button', '{!unavailable && <button hidden'],
  ['hidden ancestor', '<div className={styles.actions}>', '<div hidden className={styles.actions}>'],
  ['disabled button', 'disabled={busy}', 'disabled={true}'],
  ['duplicate sign-in button', '{!unavailable && <button', `<button type="button" disabled={busy} onClick={onSignin}>{t.signin}</button>{!unavailable && <button`],
]) test('actual Cabinet component rejects ' + name + ' for every caller', async () => {
  const component = changed(overview, from, to)
  for (const caller of callers) await assert.rejects(exercise(caller, { component }))
})
test('every caller rejects unavailable or busy Cabinet entry', async () => {
  for (const caller of callers) for (const props of [{ unavailable: true }, { busy: true }]) {
    await assert.rejects(exercise(caller, { props }), /exactly one matching signin/)
  }
})
test('every caller rejects duplicate landing roots', async () => {
  for (const caller of callers) await assert.rejects(exercise(caller, { duplicateRoot: true }), /exactly one matching root/)
})
test('all covered callers remain active and this regression is explicit in test:app', () => {
  const workflow = read('.github/workflows/hh-app-browser.yml')
  const active = [...workflow.matchAll(/(?:core|extended)\) scripts="([^"]+)"/g)].flatMap(match => match[1].split(' '))
  for (const caller of callers) assert.equal(active.filter(name => name === caller.name).length, 1)
  const command = JSON.parse(read('package.json')).scripts['test:app']
  assert.equal(command.split(/\s+/).filter(token => token === 'tests/active-browser-signin-verifier.test.mjs').length, 1)
})

