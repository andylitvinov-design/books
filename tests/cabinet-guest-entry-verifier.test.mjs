import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const app = read('scripts/verify-app-r1.mjs')
const portal = read('components/app/cabinet-guest-overview.jsx')
const scope = '[data-cabinet-guest-overview="true"]'
const label = 'Open my Cabinet with Google'
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
const text = tree => Array.isArray(tree) ? tree.map(text).join('')
  : typeof tree === 'string' || typeof tree === 'number' ? String(tree)
    : tree && tree.props['aria-hidden'] !== 'true' ? text(tree.props.children) : ''
const plain = value => JSON.parse(JSON.stringify(value))
const denied = () => assert.fail('No authentication, transport or browser action in source fixture')
function changed(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, 'mutate exactly one current source fragment')
  return source.replace(from, to)
}

// Execute actual pinned guest JSX; framework Link/icons/styles only are inert.
// This models source/locator linkage, NOT DOM/CSS/native click or provider success.
function render({ source = portal, props = {} } = {}) {
  assert.equal(ts.createSourceFile('cabinet-guest-overview.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX).parseDiagnostics.length, 0, 'valid actual JSX fixture')
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'a' },
    'lucide-react': Object.fromEntries(['Activity', 'ArrowRight', 'BookOpenCheck', 'ChartNoAxesCombined', 'ClipboardCheck', 'FilePenLine', 'GraduationCap', 'LockKeyhole', 'ShieldCheck', 'Sparkles', 'Users'].map(name => [name, 'icon-' + name])),
    './cabinet-guest-overview.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }
  const exports = {}
  const output = ts.transpileModule(source, { fileName: 'cabinet-guest-overview.jsx', compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  runInNewContext(output, { exports, fetch: denied, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'unapproved module ' + name)
    return modules[name]
  } }, { timeout: 1000 })
  return exports.default({ locale: 'en', onSignin: denied, ...props })
}

function actions(source = app) {
  const sf = ts.createSourceFile('verify-app-r1.mjs', source, ts.ScriptTarget.Latest, true)
  assert.equal(sf.parseDiagnostics.length, 0)
  const found = []
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'getByRole' && node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1]) && node.arguments[1].properties.some(prop => prop.name?.getText(sf) === 'name' && prop.initializer && ts.isStringLiteral(prop.initializer) && [label, 'Continue with Google'].includes(prop.initializer.text))) {
      let current = node
      while (current && !ts.isAwaitExpression(current)) current = current.parent
      assert.ok(current, 'the actual action must be awaited')
      found.push(current.getText(sf))
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  assert.equal(found.length, 4, 'four portrait guest sign-in/logout selectors, no other Google flow')
  return found
}

async function exercise(fragment, options = {}) {
  const tree = render(options)
  const events = []
  const visible = node => !node.props.hidden && node.props['aria-hidden'] !== 'true' && node.props.style?.display !== 'none'
  const page = { getByRole() { assert.fail('actual guest overview scope is mandatory') }, locator(selector) {
    assert.equal(selector, scope, 'require actual guest overview scope')
    const roots = nodes(tree).filter(n => n.props['data-cabinet-guest-overview'] === 'true')
    return { getByRole(role, opts) {
      assert.equal(role, 'button')
      assert.deepEqual(plain(opts), { name: label, exact: true }, 'require exact current public label')
      const matches = roots.flatMap(nodes).filter(n => n.type === 'button' && text(n).trim() === opts.name)
      const check = () => {
        assert.equal(roots.length, 1, 'unique actual guest overview')
        assert.equal(matches.length, 1, 'unique exact current guest button')
        assert.ok(roots.every(visible) && matches.every(visible), 'visible guest button')
      }
      return { check, click(...args) { return { then(resolve, reject) {
        try {
          assert.equal(args.length, 0, 'ordinary native click without options or force')
          check(); assert.equal(matches[0].props.disabled, false, 'enabled guest button')
          assert.equal(matches[0].props.onClick, denied, 'real JSX retains supplied sign-in handler')
          events.push('click'); resolve()
        } catch (error) { reject(error) }
      } } } }
    } }
  } }
  const expect = target => ({ toBeVisible(...args) { return { then(resolve, reject) {
    try { assert.equal(args.length, 0); target.check(); events.push('visible'); resolve() }
    catch (error) { reject(error) }
  } } } })
  const run = new Function('page', 'otherPage', 'expect', 'return (async () => { ' + fragment + ' })()')
  await run(page, page, expect)
  assert.deepEqual(events, [fragment.endsWith('.click()') ? 'click' : 'visible'], 'actual source action is awaited once')
  return events[0]
}

async function contract(source = app) {
  const result = []
  for (const fragment of actions(source)) result.push(await exercise(fragment))
  assert.deepEqual(result, ['click', 'click', 'visible', 'click'])
}

test('four actual portrait entry/logout actions match real guest JSX, without invoking auth', async () => {
  await contract()
  const workspace = read('components/app/app-workspace.jsx')
  const route = read('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(route, /if \(path.length === 0\) redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /e.status === 401\s*\? 'signed-out'/)
  assert.match(workspace, /state !== 'ready' && page === 'portrait' && !stressSignup/)
  assert.match(workspace, /<CabinetGuestOverview\s+locale=\{locale\} busy=\{busy\} onSignin=\{signin\}/)
})

for (const [name, options] of [
  ['wrong locale', { props: { locale: 'ru' } }],
  ['unavailable', { props: { unavailable: true } }],
  ['busy', { props: { busy: true } }],
  ['old component label', { source: changed(portal, "signin: 'Open my Cabinet with Google'", "signin: 'Continue with Google'") }],
  ['partial component label', { source: changed(portal, "signin: 'Open my Cabinet with Google'", "signin: 'Open my Cabinet with Google now'") }],
  ['wrong role', { source: changed(portal, '<button type="button" className={styles.primaryAction}', '<a type="button" className={styles.primaryAction}').replace('{busy ? t.signingIn : t.signin}<ArrowRight aria-hidden="true" size={19} />\n            </button>', '{busy ? t.signingIn : t.signin}<ArrowRight aria-hidden="true" size={19} />\n            </a>') }],
  ['hidden button', { source: changed(portal, '<button type="button" className={styles.primaryAction}', '<button hidden type="button" className={styles.primaryAction}') }],
  ['missing scope', { source: changed(portal, 'data-cabinet-guest-overview="true"', 'data-other-overview="true"') }],
  ['hidden scope', { source: changed(portal, '<section className={styles.shell}', '<section hidden className={styles.shell}') }],
  ['duplicate action', { source: changed(portal, '<div className={styles.actions}>', '<div className={styles.actions}><button>Open my Cabinet with Google</button>') }],
]) test('actual guest entry rejects ' + name, async () => {
  for (const fragment of actions()) await assert.rejects(exercise(fragment, options), error => error.code === 'ERR_ASSERTION')
})

for (const [name, from, to] of [
  ['old label', label, 'Continue with Google'],
  ['partial matching', 'exact:true', 'exact:false'],
  ['wrong scope', scope, '[data-course-google-signin]'],
  ['unscoped locator', `.locator('${scope}')`, ''],
  ['forced click', '.click()', '.click({force:true})'],
  ['unawaited action', 'await ', ''],
]) test('actual verifier rejects ' + name, async () => {
  const fragment = actions()[0]
  assert.ok(fragment.includes(from))
  await assert.rejects(exercise(fragment.replace(from, to)), error => error.code === 'ERR_ASSERTION')
})

test('same label outside the overview cannot satisfy the actual guest locator', async () => {
  const source = portal
  // Remove the sole scoped button but add an identical public header decoy.
  const decoy = source.replace('return (\n    <section', 'return (\n    <><button>Open my Cabinet with Google</button><section')
    .replace(/<\/section>\s*\)\s*}\s*$/, '</section></>\n  )\n}\n')
  for (const fragment of actions()) await assert.rejects(exercise(fragment, { source: decoy, props: { unavailable: true } }), /unique exact current guest button/)
})

for (let index = 0; index < 4; index++) test('contract rejects restoring only old portrait selector ' + (index + 1), async () => {
  const current = `locator('${scope}').getByRole('button',{name:'${label}',exact:true})`
  const parts = app.split(current)
  assert.equal(parts.length, 5)
  let mutant = parts[0]
  for (let i = 0; i < 4; i++) mutant += (i === index
    ? `getByRole('button',{name:'Continue with Google'${i === 3 ? ',exact:true' : ''}})` : current) + parts[i + 1]
  await assert.rejects(contract(mutant), error => error.code === 'ERR_ASSERTION')
})
