import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import * as navigation from '../lib/site-navigation-model.js'
import { assertCabinetPrimaryNavigation } from '../scripts/helpers/cabinet-navigation-verifier.mjs'
import { assertPublicDiscoveryChrome } from '../scripts/helpers/public-discovery-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).filter(Boolean).join(' ') : node.props?.['aria-hidden'] ? '' : text(node.props?.children)
const jsx = (type, props) => ({ type, props })
const element = node => ({ getAttribute: name => node.props[name] === undefined ? null : String(node.props[name]), textContent: text(node) })
const links = root => nodes(root).filter(node => node.type === 'a')
function locator(values) {
  return {
    values,
    locator(selector) {
      if (selector === ':scope > a') return locator(values.flatMap(links))
      assert.equal(selector, 'a[aria-current="page"]')
      return locator(values.flatMap(links).filter(node => node.props['aria-current'] === 'page'))
    },
    async evaluateAll(fn) { return fn(values.map(element)) },
  }
}
const expect = value => ({
  async toHaveCount(count) { assert.equal(value.values.length, count) },
  async toBeVisible() { assert.equal(value.values.length, 1) },
  async toHaveAttribute(name, expected) { assert.equal(value.values.length, 1); assert.equal(element(value.values[0]).getAttribute(name), expected) },
})
function compile(source, dependencies) {
  const exported = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, require(name) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'next/link') return { default: 'a' }
      if (name === 'lucide-react') return new Proxy({}, { get: () => 'svg' })
      assert.ok(dependencies[name], name); return dependencies[name]
    },
  })
  return exported
}
function mobile(locale, pathname) {
  return compile(read('components/mobile-bottom-navigation.tsx'), {
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/site-navigation-model': navigation,
    './use-navigation-locale': { useNavigationLocale: () => locale },
  }).MobileBottomNavigation({ initialLocale: locale })
}
function publicPage(tree, locale) {
  return { locator(selector) {
    if (selector === '.ia222-bottom-navigation') return locator(tree ? [tree] : [])
    assert.equal(selector, '[data-sitewide-personal-review-banner]'); return locator(locale === 'es' ? [] : [jsx('aside', {})])
  } }
}
for (const locale of ['en', 'ru', 'es']) test(locale + ' actual public mobile nav has exact Tests and My House destinations and active Tests', async () => {
  for (const path of ['/client', '/client/tests']) await assertPublicDiscoveryChrome(publicPage(mobile(locale, '/' + locale + path), locale), expect, locale)
  for (const path of ['/client/session', '/client/personal-selector', '/client/tests/hidden']) assert.equal(mobile(locale, '/' + locale + path), null)
  if (locale !== 'es') assert.equal(mobile(locale, '/' + locale + '/app/portrait'), null)
  assert.equal(mobile(locale, '/admin'), null)
})
for (const fault of ['wrongName', 'wrongHref', 'wrongActive', 'missing', 'duplicate']) test('public mobile proof rejects ' + fault, async () => {
  const tree = mobile('en', '/en/client/tests'), all = links(tree), target = all.find(node => node.props['data-nav-item'] === 'tests')
  if (fault === 'wrongName') target.props.children = 'My tests'
  if (fault === 'wrongHref') target.props.href = '/en/client'
  if (fault === 'wrongActive') target.props['data-nav-item'] = 'cabinet'
  if (fault === 'missing') target.type = 'div'
  if (fault === 'duplicate') tree.props.children.push(target)
  await assert.rejects(assertPublicDiscoveryChrome(publicPage(tree, 'en'), expect, 'en'))
})
const workspace = read('components/app/app-workspace.jsx')
const model = workspace.slice(workspace.indexOf('const nav = ['), workspace.indexOf('const documentReader', workspace.indexOf('const nav = [')))
const start = workspace.indexOf('<nav className="hh-mobile-app-nav"'), end = workspace.indexOf('</nav>', start) + '</nav>'.length
const privateSource = "import Link from 'next/link'; import { UserRound, ClipboardList, BarChart3, BookOpen, Users } from 'lucide-react'; export function PrivateNav({locale,page}) { const root='/'+locale+'/app'; " + model + 'return (' + workspace.slice(start, end) + '); }'
const { PrivateNav } = compile(privateSource, {})
for (const locale of ['en', 'ru']) test(locale + ' actual shared private model preserves five exact destinations and current-page aliases', async () => {
  for (const page of ['portrait', 'tests', 'portfolio', 'course', 'practice', 'history', 'reports', 'monitoring', 'results']) {
    const tree = PrivateNav({ locale, page })
    const target = { locator(selector) { assert.equal(selector, 'nav.hh-nav:visible, nav.hh-mobile-app-nav:visible'); return locator([tree]) } }
    await assertCabinetPrimaryNavigation(target, expect, { locale, current: ['history', 'reports', 'monitoring', 'results'].includes(page) ? 'portfolio' : page })
  }
})
for (const fault of ['wrongLabel', 'wrongHref', 'wrongCurrent', 'extraLink', 'twoVisibleBars']) test('private navigation proof rejects ' + fault, async () => {
  const tree = PrivateNav({ locale: 'en', page: 'portrait' }), all = links(tree)
  if (fault === 'wrongLabel') all[1].props.children = 'My tests'
  if (fault === 'wrongHref') all[4].props.href = '/en/app/settings'
  if (fault === 'wrongCurrent') all[0].props['aria-current'] = undefined
  if (fault === 'extraLink') tree.props.children.push(jsx('a', { href: '/en/app/other', children: 'Other' }))
  const target = { locator: () => locator(fault === 'twoVisibleBars' ? [tree, tree] : [tree]) }
  await assert.rejects(assertCabinetPrimaryNavigation(target, expect, { current: 'portrait' }))
})

test('core exercises accepted private labels, responsive five-tab navigation and compact account picker', () => {
  const core = read('scripts/verify-app-r1.mjs')
  assert.ok(core.includes("toHaveText(locale==='ru'?'Отчёты':'Reports')"))
  assert.ok(core.includes("const practice=page.locator('.hh-master-header-link')"))
  assert.ok(core.includes("expect(practice).toHaveCount(1)"))
  assert.ok(core.includes("expect(practice).toHaveText('Practice')"))
  assert.ok(core.includes("expect(practice).toHaveAttribute('href','/en/app/practice')"))
  assert.ok(core.includes("await assertCabinetPrimaryNavigation(page,expect,{current:'portrait'})"))
  assert.ok(core.includes('await assertCompactAccountPicker(await openAccountTestPicker(page,expect),expect)'))
  for (const unchanged of ["practitionerOpen.status,404", "practitionerOpen.data.error,'NOT_FOUND'", "api('results/'+first.id,null,other)).status,404", 'exerciseAccountPickerDraftRetention(selectionPage,expect)', 'selectedPlan.definitionIds,[personalityDefinition.id]']) assert.ok(core.includes(unchanged), unchanged)
})
