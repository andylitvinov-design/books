import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

// Render the real tabs, native expanded-menu contents and Academy finder with
// synthetic empty public data. No browser effects, storage, providers or CSS run.
function assertDiscoveryNavigation(sources) {
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const runtime = { jsx, jsxs: jsx, Fragment: 'fragment' }
  const styles = new Proxy({}, { get: (_target, name) => String(name) })
  const hooks = {
    useEffect() {}, useRef: value => ({ current: value }),
    useMemo: callback => callback(), useState: value => [typeof value === 'function' ? value() : value, () => {}],
  }
  function compile(source, fileName, dependencies = {}) {
    const result = ts.transpileModule(source, { fileName, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
    assert.equal((result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0)
    const exports = {}
    const imports = { 'react/jsx-runtime': runtime, ...dependencies }
    new vm.Script(result.outputText).runInNewContext({ exports, require(id) {
      assert.ok(Object.hasOwn(imports, id), 'Unexpected navigation dependency: ' + id)
      return imports[id]
    } }, { timeout: 1000 })
    return exports
  }
  function nodes(tree) {
    const result = []
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!node || typeof node !== 'object' || node.props.hidden || node.props['aria-hidden'] === true || node.props['aria-hidden'] === 'true') return
      if (typeof node.type === 'function') return visit(node.type(node.props))
      result.push(node)
      visit(node.props.children)
    }
    visit(tree)
    return result
  }
  const navigation = compile(sources.model, 'site-navigation-model.js')
  const tabs = compile(sources.tabs, 'discovery-section-tabs.tsx', {
    'next/link': 'a', './discovery-section-tabs.module.css': { __esModule: true, default: styles },
  })
  for (const locale of ['en', 'ru', 'es']) {
    const tabNodes = nodes(tabs.DiscoverySectionTabs({ locale, active: 'services' }))
    const links = tabNodes.filter(node => node.type === 'a')
    assert.deepEqual(links.map(node => node.props['data-discovery-tab']), ['tests', 'services', 'business', 'courses'])
    assert.deepEqual(links.map(node => node.props.href), [
      `/${locale}/client/tests`, `/${locale}/services`, `/${locale}/explore/business`, `/${locale}/academy/free-ai-courses`,
    ])
    assert.equal(links.filter(node => node.props['aria-current'] === 'page').length, 1)
    assert.equal(links.find(node => node.props['aria-current'] === 'page').props['data-discovery-tab'], 'services')
    const nav = compile(sources.menu, 'site-navigation.tsx', {
      react: hooks, 'next/link': 'a', 'next/navigation': { usePathname: () => `/${locale}/services` },
      'lucide-react': { ArrowRight: 'icon', Menu: 'icon', Sparkles: 'icon' },
      '@/components/commerce/cart-nav-link': { CartNavLink: 'cart' },
      '@/components/site-search': { SiteSearch: 'search' },
      './compact-navigation-icons': { compactNavigationIcons: new Proxy({}, { get: () => 'icon' }) },
      '@/lib/ui-locale': { localePath: (_path, next) => `/${next}/services`, saveUiLocale() {} },
      '@/lib/public-locales': { hasSpanishCounterpart: () => true, publicCounterpart: (_path, next) => `/${next}/services`, savePublicLocale() {} },
      '@/lib/site-navigation-model': navigation,
      './use-navigation-locale': { useNavigationLocale: () => locale },
      './home-personal-space': { HomePersonalSpaceNavEntry: 'personal-space' },
    })
    const menu = nodes(nav.SiteNavigation({ locale })).find(node => node.type === 'details' && node.props.className === 'site-main-menu')
    assert.ok(menu, 'Native site menu remains available: ' + locale)
    assert.ok(nodes(menu).some(node => node.type === 'summary'), 'Menu has a native disclosure trigger')
    const eventLinks = nodes(menu).filter(node => node.type === 'a' && node.props['data-nav-item'] === 'events')
    assert.equal(eventLinks.length, 1, 'Events remains in the actual expanded menu: ' + locale)
    assert.equal(eventLinks[0].props.href, `/${locale}/events`)
    assert.equal(eventLinks[0].props.children, { en: 'Events', ru: 'События', es: 'Eventos' }[locale])
    const academy = compile(sources.academy, 'academy-discovery.tsx', {
      react: hooks, 'next/link': 'a', 'next/image': 'img',
      'lucide-react': Object.fromEntries(['Archive', 'ArrowRight', 'BookOpen', 'CalendarDays', 'ChevronDown', 'GraduationCap', 'MapPin', 'Search', 'Sparkles'].map(name => [name, 'icon'])),
      '@/components/academy-course-card-list': { AcademyCourseCardList: 'course-list' },
      '@/components/academy-my-courses': { AcademyMyCourses: 'my-courses' },
      '@/components/discovery-section-tabs': tabs,
      './academy-discovery.module.css': { __esModule: true, default: styles },
    })
    const academyTree = academy.AcademyDiscovery({ locale, view: 'programs', items: [], legacyCourses: [], legacyVideos: [], events: [], label: 'Synthetic catalogue',
      coachingItem: { id: 'synthetic-course', title: 'Synthetic course', description: 'Synthetic public fixture', href: `/${locale}/academy/synthetic-course` } })
    const events = nodes(academyTree).find(node => node.type === 'section' && node.props.id === 'academy-live-events')
    assert.ok(events, 'Academy keeps the live-events section even with no scheduled events')
    const academyEvents = nodes(events).filter(node => node.type === 'a' && node.props.href === `/${locale}/events`)
    assert.equal(academyEvents.length, 1, 'Academy retains a real locale-specific Events destination')
  }
}

test('Services EN RU ES uses the Tests-style standalone hero with tabs, then filters below the search', () => {
  const ui = read('components/services-smart-discovery.tsx')
  const enRu = read('app/[locale]/services/page.tsx')
  const es = read('app/es/services/page.tsx')
  const hero = ui.indexOf('className={styles.hero}')
  const search = ui.indexOf('<form className={styles.form}', hero)
  const endSearch = ui.indexOf('</form>', search)
  const endHero = ui.indexOf('</div>\n\n      <div className={styles.categorySection}', endSearch)
  const filter = ui.indexOf('data-services-filter-below-search', endHero)
  const category = ui.indexOf('className={styles.categoryGrid}', filter)
  const free = ui.indexOf('data-free-services-only', category)
  const advanced = ui.indexOf('data-services-extra-filters', free)
  const facets = ui.indexOf('className={styles.quickFacets}', advanced)
  const chips = ui.indexOf('className={styles.examples}', facets)
  const results = ui.indexOf('ref={resultsRef} tabIndex={-1}', chips)
  assert.ok(hero > 0 && search > hero && endSearch > search && endHero > endSearch)
  assert.ok(filter > endHero && category > filter && free > category)
  assert.ok(advanced > free && facets > advanced && chips > facets && results > chips)
  assert.equal((ui.match(/<form className=\{styles\.form\}/g) || []).length, 1)
  assert.ok(ui.includes('<DiscoverySectionTabs locale={locale} active="services" />'))
  const tabs=read('components/discovery-section-tabs.tsx')
  const sources = { tabs, model: read('lib/site-navigation-model.js'), menu: read('components/site-navigation.tsx'), academy: read('components/academy-discovery.tsx') }
  assertDiscoveryNavigation(sources)
  // Business replaces the primary Events tab, not Events access elsewhere.
  // These mutations must fail through actual rendered destinations, not a copy of the route table.
  for (const [key, from, to] of [
    ['tabs', '["tests", "services", "business", "courses"]', '["tests", "services", "events", "courses"]'],
    ['tabs', '"/" + locale + "/explore/business"', '"/en/explore/business"'],
    ['tabs', 'aria-current={section === active ? "page" : undefined}', 'aria-current={undefined}'],
    ['model', "'library', 'events', 'courses'", "'library', 'courses'"],
    ['menu', "['energy', 'love', 'business', 'library', 'events']", "['energy', 'love', 'business', 'library']"],
    ['menu', 'href={item.href}', 'href={"/en/events"}'],
    ['academy', '"/" + locale + "/events"', '"/en/events"'],
    ['academy', '"/" + locale + "/events"', '"/" + locale + "/missing-events"'],
    ['academy', 'id="academy-live-events"', 'id="academy-live-events" hidden'],
  ]) {
    assert.ok(sources[key].includes(from), 'Mutation target exists: ' + from)
    const source = key === 'menu' && from === 'href={item.href}' ? sources[key].replaceAll(from, to) : sources[key].replace(from, to)
    assert.throws(() => assertDiscoveryNavigation({ ...sources, [key]: source }), undefined, 'Reject lost/mislocalized destination: ' + key + ' ' + from)
  }
  // Harmless import aliases/local-variable refactors retain the same user destinations.
  assertDiscoveryNavigation({ ...sources,
    menu: sources.menu.replace('getSiteNavigation, navigationCopy', 'getSiteNavigation as publicNavigation, navigationCopy')
      .replaceAll('getSiteNavigation(activeLocale)', 'publicNavigation(activeLocale)').replaceAll('extraMenuItems', 'secondaryLinks'),
    academy: sources.academy.replace('import Link from "next/link"', 'import PublicLink from "next/link"')
      .replaceAll('<Link ', '<PublicLink ').replaceAll('</Link>', '</PublicLink>'),
  })
  assert.ok(tabs.includes('aria-current={section === active ? "page" : undefined}'))
  assert.match(ui, /maxLength=\{350\}/)
  assert.match(ui, /onClick=\{\(\)=>chooseCategory\(area\.key\)\}/)
  assert.match(ui, /<details className=\{styles\.extraFilters\}/)
  assert.match(ui, /checked=\{budget === "free"\}/)
  assert.match(ui, /setHasSelection\(true\)/)
  for (const label of ['Additional filters', 'Дополнительные фильтры', 'Filtros adicionales'])
    assert.ok(ui.includes(label), label)
  for (const p of [enRu, es]) assert.match(p, /<ServicesStudioOffers/)
  assert.match(read("components/services-directory-page.tsx"), /<ServicesSmartDiscovery/)
})

test('Services light topic panel and 320px friendly controls mirror the Tests mobile hierarchy', () => {
  const css = read('components/services-smart-discovery.module.css')
  assert.match(css, /\/\* Services \/ Tests parity:/)
  assert.match(css, /\.topline\{display:flex/)
  assert.match(css, /\.tabs a\[aria-current="page"\]/)
  assert.match(css, /\.categorySection\{box-sizing:border-box;[^}]*#d1ebee/)
  assert.match(css, /\.stepBadge\{[^}]*#ddf5f6/)
  assert.match(css, /\.categoryActive\{[^}]*#dbf6f8/)
  assert.match(css, /\.extraFilters\{[^}]*overflow:hidden/)
  assert.match(css, /\.quickFacets\{flex-wrap:wrap;overflow:visible/)
  assert.match(css, /@media\(max-width:620px\)\{[\s\S]*?\.categoryGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:350px\)\{[^}]*\.topline/)
  assert.match(css, /\.privacy\{color:#688997/)
  assert.match(css, /\.hero \.textarea\{min-height:66px;height:66px;padding:12px;font-size:16px\}/)
})


test('Services extends to the same eight-pixel phone gutters as Tests, without widening its other panels', () => {
  const wide = read('app/public-wide-layout.css')
  const css = read('components/services-smart-discovery.module.css')
  assert.match(wide, /\.services-shell--studio > #find-your-service \{/)
  assert.match(wide, /@media screen and \(max-width: 767px\)/)
  assert.match(wide, /width: calc\(100% \+ 16px\)/)
  assert.match(wide, /margin-inline: -8px/)
  assert.doesNotMatch(wide, /\.services-shell--studio > :is\(section, details\)\s*\{[^}]*margin-inline: -8px/)
  assert.match(css, /\.hero \.submit:disabled\{opacity:1;background:#993c5f;color:#fff\}/)
  assert.match(css, /background:linear-gradient\(135deg,#fff,#f8ffff\)/)
  assert.match(css, /\.categoryActive\{[^}]*background:#dbf6f8/)
  assert.match(css, /\.category,.categoryActive\{[^}]*border:1px solid #c8e6eb/)
})
