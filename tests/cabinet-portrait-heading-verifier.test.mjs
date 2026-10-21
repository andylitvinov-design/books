import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { assertCabinetPortrait } from '../scripts/helpers/cabinet-navigation-verifier.mjs'
import * as recommendation from '../lib/documents/recommendation.js'
import * as offers from '../lib/profile/profile-service-offers.js'
import * as reports from '../lib/profile/report-summary.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const helperSource = read('scripts/helpers/cabinet-navigation-verifier.mjs')
const profileSource = read('components/app/profile-domains.jsx')
const origin = 'http://127.0.0.1:3100'
const profileSelector = '[data-profile-domains][data-profile-interactive="true"]'
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
const plain = value => JSON.parse(JSON.stringify(value))
const changed = (source, from, to) => {
  assert.equal(source.split(from).length - 1, 1, 'mutation targets one actual source fragment')
  return source.replace(from, to)
}

function evaluate(source, fileName, modules) {
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(output, {
    exports, window: { location: { hash: '' } },
    fetch() { assert.fail('profile heading regression must not fetch') },
    requestAnimationFrame() { assert.fail('profile heading regression must not scroll') },
    require(name) {
      assert.ok(Object.hasOwn(modules, name), 'unmocked dependency: ' + name)
      return modules[name]
    },
  }, { timeout: 1000 })
  return exports
}

// Execute the real component twice, before and after its actual mount effects.
// Framework-only boundaries are inert; all three local domain dependencies are real.
// This is a source contract, not a replacement for browser/CSS or authentication QA.
function renderProfile({ source = profileSource, locale = 'en', hydrated = true, props = {} } = {}) {
  const state = [], refs = [], effects = []
  let stateIndex = 0, refIndex = 0, mounting = true
  const react = {
    useState(initial) {
      const i = stateIndex++
      if (mounting) state[i] = typeof initial === 'function' ? initial() : initial
      return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }]
    },
    useRef(initial) {
      const i = refIndex++
      if (mounting) refs[i] = { current: initial }
      return refs[i]
    },
    useEffect(callback) { if (mounting) effects.push(callback) },
  }
  const { ProfileDomains } = evaluate(source, 'profile-domains.jsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, react,
    'next/link': { default: 'a' }, 'next/dynamic': { default: () => 'dynamic-component' },
    'lucide-react': Object.fromEntries([
      'ArrowRight', 'Brain', 'CalendarDays', 'ChevronDown', 'FileText', 'Flower2',
      'HeartHandshake', 'Leaf', 'LockKeyhole', 'MessageCircle', 'Sparkles',
    ].map(name => [name, 'icon-' + name])),
    '@/lib/documents/recommendation': recommendation,
    '@/lib/profile/profile-service-offers': offers,
    '@/lib/profile/report-summary': reports,
    './profile-domains.css': {}, './profile-refresh.css': {},
  })
  const parameters = { locale, reportsContent: jsx('p', { children: 'Synthetic empty report archive' }), ...props }
  const initial = ProfileDomains(parameters)
  if (!hydrated) return initial
  for (const effect of effects) effect()
  mounting = false
  stateIndex = 0
  refIndex = 0
  return ProfileDomains(parameters)
}

function accessibleText(node) {
  assert.equal(node.props['aria-label'], undefined, 'heading name must remain visible text')
  assert.equal(node.props['aria-labelledby'], undefined, 'heading name must remain visible text')
  const text = value => Array.isArray(value) ? value.map(text).join('')
    : typeof value === 'string' || typeof value === 'number' ? String(value)
      : value && typeof value === 'object' && value.props['aria-hidden'] !== 'true'
        ? text(value.props.children) : ''
  return text(node.props.children).trim()
}
const visible = node => !node.props.hidden && node.props['aria-hidden'] !== 'true' &&
  node.props.style?.display !== 'none' && node.props.style?.visibility !== 'hidden'

function compileHelper(source) {
  return evaluate(source, 'cabinet-navigation-verifier.js', { 'node:assert/strict': { default: assert } }).assertCabinetPortrait
}

async function exercise({ helper = assertCabinetPortrait, locale = 'en', renderLocale = locale,
  source = profileSource, props, hydrated = true, url = origin + '/' + locale + '/app/portrait',
  omitLocale = false } = {}) {
  const tree = renderProfile({ source, locale: renderLocale, props, hydrated })
  const events = []
  const page = { url, locator(selector) {
    assert.equal(selector, profileSelector, 'retain the hydrated profile selector')
    const roots = nodes(tree).filter(node => Object.hasOwn(node.props, 'data-profile-domains') &&
      node.props['data-profile-interactive'] === 'true')
    return { kind: 'profile', matches: roots, getByRole(role, options) {
      assert.equal(role, 'heading', 'retain the heading role')
      assert.equal(typeof options.name, 'string', 'heading name must be an exact string')
      assert.equal(options.level, 1, 'retain heading level 1')
      assert.equal(options.exact, true, 'retain exact heading matching')
      assert.deepEqual(Object.keys(options).sort(), ['exact', 'level', 'name'])
      return { kind: 'heading', matches: roots.flatMap(nodes).filter(node => node.type === 'h1' &&
        accessibleText(node) === options.name), roots }
    } }
  } }
  const expect = value => ({
    // Thenables record completion only when the actual helper awaits the assertion.
    toHaveURL(expected, options) { return { then(resolve, reject) {
      try {
        assert.equal(value, page)
        assert.deepEqual(plain(options), { timeout: 30000 })
        assert.equal(value.url, expected, 'portrait URL assertion failed')
        events.push('url'); resolve()
      } catch (error) { reject(error) }
    } } },
    toBeVisible(options) { return { then(resolve, reject) {
      try {
        assert.deepEqual(options === undefined ? options : plain(options), value.kind === 'profile' ? { timeout: 30000 } : undefined)
        assert.equal(value.matches.length, 1, value.kind + ' visibility assertion failed: require exactly one match')
        assert.ok(value.matches.every(visible) && (!value.roots || value.roots.every(visible)), value.kind + ' visibility assertion failed: hidden')
        events.push(value.kind); resolve()
      } catch (error) { reject(error) }
    } } },
  })
  await helper(page, expect, omitLocale ? { origin } : { origin, locale })
  assert.deepEqual(events, ['url', 'profile', 'heading'], 'all portrait assertions must be awaited and completed in order')
  return tree
}

const badScenarios = locale => [
  ['wrong URL', { url: origin + '/' + locale + '/app/tests' }, /portrait URL assertion failed/],
  ['wrong locale', { renderLocale: locale === 'en' ? 'ru' : 'en' }, /heading visibility assertion failed/],
  ['external-only heading', { props: { mode: 'legacy' } }, /heading visibility assertion failed/],
  ['missing archive', { props: { reportsContent: null } }, /heading visibility assertion failed/],
  ['unhydrated profile', { hydrated: false }, /profile visibility assertion failed/],
  ['hidden profile', { source: changed(profileSource, '<section className="hh-profile-domains"', '<section hidden className="hh-profile-domains"') }, /profile visibility assertion failed/],
  ['hidden heading', { source: changed(profileSource, '<h1 id="hh-account-report-title">', '<h1 hidden id="hh-account-report-title">') }, /heading visibility assertion failed/],
  ['wrong heading level', { source: changed(profileSource, '<h1 id="hh-account-report-title">{t.archivePanelTitle}</h1>', '<h2 id="hh-account-report-title">{t.archivePanelTitle}</h2>') }, /heading visibility assertion failed/],
  ['duplicate heading', { source: changed(profileSource, '<h1 id="hh-account-report-title">{t.archivePanelTitle}</h1>', '<h1>{t.archivePanelTitle}</h1><h1 id="hh-account-report-title">{t.archivePanelTitle}</h1>') }, /heading visibility assertion failed/],
]

async function assertContract(helper) {
  for (const locale of ['en', 'ru']) {
    await exercise({ helper, locale })
    for (const [, options, error] of badScenarios(locale)) await assert.rejects(exercise({ helper, locale, ...options }), error)
  }
}

for (const locale of ['en', 'ru']) {
  test(locale + ' actual Cabinet portrait helper accepts the hydrated account archive heading', async () => {
    const tree = await exercise({ locale })
    const headings = nodes(tree).filter(node => node.type === 'h1')
    assert.equal(headings.length, 1)
    assert.equal(accessibleText(headings[0]), locale === 'ru' ? 'Мои отчёты' : 'My reports')
    assert.equal(tree.props['data-profile-mode'], 'account')
  })
  test(locale + ' actual external ProfileDomains rendering retains its separate legacy h1', () => {
    const tree = renderProfile({ locale, props: { mode: 'legacy' } })
    const headings = nodes(tree).filter(node => node.type === 'h1')
    assert.equal(tree.props['data-profile-mode'], 'legacy')
    assert.equal(tree.props['data-profile-interactive'], 'true')
    assert.equal(headings.length, 1)
    assert.equal(accessibleText(headings[0]), locale === 'ru' ? 'Мой профиль и отчёты' : 'My profile & reports')
    assert.ok(!nodes(tree).some(node => node.props.id === 'hh-account-report-title'))
  })
  for (const [name, options, error] of badScenarios(locale)) test(locale + ' portrait helper rejects ' + name, async () => {
    await assert.rejects(exercise({ locale, ...options }), error)
  })
}

test('Cabinet portrait helper defaults to English without widening its locale contract', async () => {
  await exercise({ omitLocale: true })
})

test('unmutated source-compiled helper passes the same full contract as its ESM export', async () => {
  await assertContract(compileHelper(helperSource))
})

const urlAssertion = "await expect(page).toHaveURL(origin + '/' + locale + '/app/portrait', { timeout: 30000 })"
const profileAssertion = 'await expect(profile).toBeVisible({ timeout: 30000 })'
const headingAssertion = `await expect(profile.getByRole('heading', {
    name: locale === 'ru' ? 'Мои отчёты' : 'My reports', level: 1, exact: true,
  })).toBeVisible()`
for (const [name, from, to] of [
  ['obsolete external label', "'Мои отчёты' : 'My reports'", "'Мой профиль и отчёты' : 'My profile & reports'"],
  ['wrong locale mapping', "'Мои отчёты' : 'My reports'", "'My reports' : 'Мои отчёты'"],
  ['partial matching', 'level: 1, exact: true', 'level: 1, exact: false'],
  ['broad heading name', "name: locale === 'ru' ? 'Мои отчёты' : 'My reports'", 'name: /reports|отчёты/'],
  ['wrong role', "profile.getByRole('heading'", "profile.getByRole('region'"],
  ['wrong level', 'level: 1, exact: true', 'level: 2, exact: true'],
  ['missing URL assertion', urlAssertion, ''],
  ['missing profile assertion', profileAssertion, ''],
  ['missing heading assertion', headingAssertion, ''],
  ['unawaited URL assertion', urlAssertion, urlAssertion.replace('await ', '')],
  ['unawaited profile assertion', profileAssertion, profileAssertion.replace('await ', '')],
  ['unawaited heading assertion', headingAssertion, headingAssertion.replace('await ', '')],
  ['suppressed URL assertion', urlAssertion, 'try { ' + urlAssertion + ' } catch {}'],
  ['suppressed profile assertion', profileAssertion, 'try { ' + profileAssertion + ' } catch {}'],
  ['suppressed heading assertion', headingAssertion, 'try { ' + headingAssertion + ' } catch {}'],
]) test('portrait contract rejects helper mutation: ' + name, async () => {
  await assert.rejects(assertContract(compileHelper(changed(helperSource, from, to))))
})

test('Cabinet portrait source regression is explicitly included in test:app', () => {
  const command = JSON.parse(read('package.json')).scripts['test:app']
  assert.equal(command.split('tests/cabinet-portrait-heading-verifier.test.mjs').length - 1, 1)
  assert.equal(command.split('tests/mhc-sf-signin-verifier.test.mjs').length - 1, 1)
})
