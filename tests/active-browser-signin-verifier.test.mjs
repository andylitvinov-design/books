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
const signinCall = `await page.getByRole('button', { name: '${signinName}', exact: true }).click()`
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
    signinCall,
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

async function exercise(caller, { component = overview, props = {}, onboard = true } = {}) {
  const entry = accountEntry(caller), events = []
  const onSignin = () => events.push('handler')
  const rendered = renderOverview(component, onSignin, props)
  assert.equal(rendered.filter(node => node.visible && node.props['data-cabinet-guest-overview'] === 'true').length, 1)
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
    async isVisible() {
      assert.ok(signedIn, 'onboarding follows completed sign-in')
      return onboard
    },
  }
  const page = {
    async goto(url) {
      assert.equal(url, origin + '/en/app')
      await complete('navigate', () => { entered = true })
    },
    locator(selector) {
      assert.equal(selector, '[data-profile-domains]')
      return selector
    },
    getByRole(role, options) {
      if (options.name === 'Create my private space') {
        assert.equal(options.exact, true)
        assert.ok(signedIn, 'onboarding follows completed sign-in')
        if (role === 'heading') return heading
        assert.equal(role, 'button')
        return { async click() {
          assert.ok(adult && necessary, 'both consents must be completed before onboarding submission')
          await complete('create', () => { ready = true })
        } }
      }
      assert.ok(entered, 'sign-in follows completed navigation')
      assert.equal(role, 'button', 'sign-in must use native button role')
      assert.equal(typeof options.name, 'string', 'sign-in requires an exact string')
      assert.equal(options.exact, true, 'sign-in must not use partial matching')
      assert.deepEqual(Object.keys(options).sort(), ['exact', 'name'])
      const matches = rendered.filter(node => node.visible && node.type === 'button' && buttonName(node) === options.name)
      assert.equal(matches.length, 1, 'exactly one current visible Cabinet sign-in button must match')
      const button = matches[0]
      assert.equal(buttonName(button), signinName)
      assert.equal(button.props.type, 'button')
      assert.equal(button.props.disabled, false, 'sign-in must be enabled')
      assert.equal(button.props.onClick, onSignin, 'real sign-in callback must remain wired')
      return { async click() {
        button.props.onClick()
        await complete('signin', () => { signedIn = true })
      } }
    },
    getByLabel(label, options) {
      assert.ok(onboard && signedIn, 'consent belongs to the current onboarding')
      assert.ok(label === 'I am 18 or older.' || label === 'I agree to private processing')
      if (label === 'I agree to private processing') assert.equal(options.exact, false)
      return { async check() {
        const isAdult = label === 'I am 18 or older.'
        if (!isAdult) assert.ok(adult, 'adult consent precedes processing consent')
        await complete(isAdult ? 'adult' : 'necessary', () => { if (isAdult) adult = true; else necessary = true })
      } }
    },
  }
  const expect = target => ({ async toBeVisible(options) {
    assert.equal(target.kind, 'onboarding-or-profile')
    assert.equal(options.timeout, 60000)
    assert.ok(signedIn)
    await complete('visible')
  } })
  await runInNewContext('(async () => { ' + entry + ' })()', {
    page, origin, expect,
    navigate: (target, url) => { assert.equal(target, page); return page.goto(url) },
    async assertCabinetPortrait(target, expectation, options) {
      assert.equal(target, page); assert.equal(expectation, expect); assert.equal(options.origin, origin)
      assert.ok(signedIn && ready, 'portrait requires completed auth and consent')
      await complete('portrait')
    },
    async openCabinetMyTests(target, expectation, options) {
      assert.equal(target, page); assert.equal(expectation, expect); assert.equal(options.origin, origin)
      assert.equal(events.at(-1), 'portrait', 'await portrait before visible My Tests navigation')
      await complete('tests')
    },
  }, { timeout: 1000 })
  assert.deepEqual(events, ['navigate', 'handler', 'signin', 'visible',
    ...(onboard ? ['adult', 'necessary', 'create'] : []), 'portrait', 'tests'])
}

const changed = (source, from, to) => {
  assert.equal(source.split(from).length - 1, 1, 'mutation targets one actual source fragment')
  return source.replace(from, to)
}

for (const caller of callers) {
  for (const onboard of [true, false]) test(`${caller.name}: actual Cabinet selector and ${onboard ? 'new-account consent' : 'existing-account'} sequence`, async () => {
    await exercise(caller, { onboard })
  })

  // Mutate each real caller, not copied fixtures or a separately authored helper.
  for (const [name, mutate] of [
    ['retired selector', source => changed(source, signinName, 'Continue with Google')],
    ['Google-only selector', source => changed(source, signinName, 'Google')],
    ['broad Google regex', source => changed(source, `'${signinName}'`, '/Google/')],
    ['partial name', source => source.replace(/(name:\s*'Open my Cabinet with Google',\s*exact:\s*)true/, '$1false')],
    ['wrong role', source => source.replace(/getByRole\('button',(\s*\{\s*name:\s*'Open my Cabinet with Google')/, "getByRole('link',$1")],
    ['missing sign-in await', source => source.replace(/await (page\.getByRole\('button',\s*\{ ?name:\s*'Open my Cabinet with Google')/, '$1')],
    ['missing click', source => source.replace(/(page\.getByRole\('button',\s*\{ ?name:\s*'Open my Cabinet with Google',\s*exact:\s*true\s*\}\))\.click\(\)/, '$1')],
    ['skipped processing consent', source => source.replace(/await page\.getByLabel\('I agree to private processing',\s*\{ ?exact:\s*false\s*\}\)\.check\(\)/, '')],
    ['missing consent await', source => source.replace("await page.getByLabel('I am 18 or older.').check()", "page.getByLabel('I am 18 or older.').check()")],
    ['skipped portrait', source => changed(source, portraitCall, '')],
    ['direct Tests bypass', source => changed(source, testsCall, "await page.goto(origin + '/en/app/tests')")],
    ['injected session', source => changed(source, portraitCall, "await page.context().addCookies([{name:'session',value:'bypass'}])\n" + portraitCall)],
  ]) test(`${caller.name}: rejects ${name}`, async () => {
    const source = mutate(caller.source)
    assert.notEqual(source, caller.source, 'negative control must change the actual caller')
    await assert.rejects(exercise({ ...caller, source }), /preserve actual navigation|one authenticated My Tests/)
  })
}

for (const [name, from, to, error] of [
  ['stale rendered label', `signin: '${signinName}'`, "signin: 'Continue with Google'", /exactly one current visible/],
  ['disconnected handler', 'onClick={onSignin}', 'onClick={() => {}}', /callback must remain wired/],
  ['hidden native button', '{!unavailable && <button', '{!unavailable && <button hidden', /exactly one current visible/],
  ['hidden ancestor', '<div className={styles.actions}>', '<div hidden className={styles.actions}>', /exactly one current visible/],
  ['duplicate sign-in button', '{!unavailable && <button', `<button type="button" disabled={busy} onClick={onSignin}>{t.signin}</button>{!unavailable && <button`, /exactly one current visible/],
]) test('actual Cabinet component rejects ' + name + ' for every caller', async () => {
  const component = changed(overview, from, to)
  for (const caller of callers) await assert.rejects(exercise(caller, { component }), error)
})

test('every caller rejects unavailable and busy Cabinet entry', async () => {
  for (const caller of callers) for (const props of [{ unavailable: true }, { busy: true }]) {
    await assert.rejects(exercise(caller, { props }), /exactly one current visible|sign-in must be enabled/)
  }
})

test('all covered callers remain active and this regression is explicit in test:app', () => {
  const workflow = read('.github/workflows/hh-app-browser.yml')
  const active = [...workflow.matchAll(/(?:core|extended)\) scripts="([^"]+)"/g)].flatMap(match => match[1].split(' '))
  for (const caller of callers) assert.equal(active.filter(name => name === caller.name).length, 1)
  const command = JSON.parse(read('package.json')).scripts['test:app']
  assert.equal(command.split(/\s+/).filter(token => token === 'tests/active-browser-signin-verifier.test.mjs').length, 1)
})
