import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { COPY } from '../components/app/copy.js'
import * as navigation from '../lib/site-navigation-model.js'
import { assertCabinetPrimaryNavigation, openCabinetHome } from '../scripts/helpers/cabinet-navigation-verifier.mjs'
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
    async getAttribute(name) { assert.equal(values.length, 1); return element(values[0]).getAttribute(name === 'class' ? 'className' : name) },
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
const privateSource = "import { COPY } from './copy'; import Link from 'next/link'; import { UserRound, ClipboardList, BarChart3, BookOpen, Users, House } from 'lucide-react'; export function PrivateNav({locale,page}) { const root='/'+locale+'/app'; const c=COPY[locale]; " + model + 'return (' + workspace.slice(start, end) + '); }'
const { PrivateNav } = compile(privateSource, { './copy': { COPY } })
const desktopStart = workspace.indexOf('<nav className="hh-nav"')
const desktopEnd = workspace.indexOf('</nav>', desktopStart) + '</nav>'.length
assert.ok(desktopStart >= 0, 'actual desktop navigation exists')
const { PrivateNav: DesktopNav } = compile(privateSource.slice(0, privateSource.indexOf('return (')) + 'return (' + workspace.slice(desktopStart, desktopEnd) + '); }', { './copy': { COPY } })
for (const locale of ['en', 'ru']) test(locale + ' actual shared private model preserves five exact destinations and current-page aliases', async () => {
  for (const Renderer of [PrivateNav, DesktopNav]) for (const page of ['portrait', 'tests', 'portfolio', 'course', 'practice', 'history', 'reports', 'monitoring', 'results']) {
    const tree = Renderer({ locale, page })
    const target = { locator(selector) { assert.equal(selector, 'nav.hh-nav:visible, nav.hh-mobile-app-nav:visible'); return locator([tree]) } }
    await assertCabinetPrimaryNavigation(target, expect, { locale, current: ['history', 'reports', 'monitoring', 'results'].includes(page) ? 'portfolio' : page })
  }
})
for (const fault of ['wrongLabel', 'wrongHref', 'wrongCurrent', 'extraLink', 'twoVisibleBars', 'missingHome', 'wrongHomeHref', 'wrongHomeLabel', 'wrongHomeAria']) test('private navigation proof rejects ' + fault, async () => {
  const tree = PrivateNav({ locale: 'en', page: 'portrait' }), all = links(tree)
  if (fault === 'wrongHomeAria') all[5].props['aria-label'] = 'Go home'
  if (fault === 'missingHome') all[5].type = 'div'
  if (fault === 'wrongHomeHref') all[5].props.href = '/en'
  if (fault === 'wrongHomeLabel') all[5].props.children = 'Homepage'
  if (fault === 'wrongLabel') all[1].props.children = 'My tests'
  if (fault === 'wrongHref') all[4].props.href = '/en/app/settings'
  if (fault === 'wrongCurrent') all[0].props['aria-current'] = undefined
  if (fault === 'extraLink') tree.props.children.push(jsx('a', { href: '/en/app/other', children: 'Other' }))
  const target = { locator: () => locator(fault === 'twoVisibleBars' ? [tree, tree] : [tree]) }
  await assert.rejects(assertCabinetPrimaryNavigation(target, expect, { current: 'portrait' }))
})

// The Courses tab selects the list, while its active ID remains "course".
for (const locale of ['en', 'ru']) for (const [surface, Renderer] of [['mobile', PrivateNav], ['desktop', DesktopNav]]) {
  for (const suffix of ['', '?view=lesson', '?view=courses&courseId=other', '?view=courses&view=lesson', '?view=courses#other']) {
    test(`${locale} ${surface} rejects non-exact Courses query ${suffix || '(missing)'}`, async () => {
      const tree = Renderer({ locale, page: 'course' })
      const courseLink = links(tree).find(node => node.props.href === `/${locale}/app/course?view=courses`)
      assert.ok(courseLink, 'actual owner Courses link exists')
      courseLink.props.href = `/${locale}/app/course${suffix}`
      const target = { locator: () => locator([tree]) }
      await assert.rejects(assertCabinetPrimaryNavigation(target, expect, { locale, current: 'course' }))
    })
  }
}

test('core exercises accepted private labels, five private destinations and mobile Home navigation and compact account picker', () => {
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

for (const locale of ['en', 'ru']) test(locale + ' mobile Home verifies its exact label and real click destination', async () => {
  const tree = PrivateNav({ locale, page: 'portrait' })
  const node = links(tree).find(node => node.props.className === 'hh-mobile-app-nav-home')
  const events = [], origin = 'http://127.0.0.1:3100'
  const home = { async click() { events.push('click'); page.url = origin + node.props.href } }
  const page = { url: origin + '/' + locale + '/app/portrait', locator(selector) { assert.equal(selector, 'nav.hh-mobile-app-nav:visible > a.hh-mobile-app-nav-home'); return home } }
  const check = value => ({
    async toHaveCount(count) { assert.ok(node); assert.equal(count, 1) },
    async toBeVisible() { assert.equal(value, home) },
    async toHaveText(expected) { assert.equal(text(node), expected) },
    async toHaveAttribute(name, expected) { assert.equal(node.props[name], expected) },
    async toHaveURL(expected) { assert.equal(value.url, expected); events.push('url') },
  })
  await openCabinetHome(page, check, { origin, locale })
  assert.deepEqual(events, ['click', 'url'])
  assert.ok(read('scripts/verify-app-r1.mjs').includes('await openCabinetHome(page,expect,{origin})'))
})
