import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeNavigationId, getSiteNavigation, navigationCopy, compactNavigationIds } from '../lib/site-navigation-model.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Four discovery tabs share one EN/RU/ES public destination model', () => {
  const tabs = read('components/discovery-section-tabs.tsx')
  assert.match(tabs, /"tests", "services", "business", "courses"/)
  assert.match(tabs, /section === active \? "page" : undefined/)
  for (const route of ['client/tests', 'services', 'explore/business', 'academy/free-ai-courses']) assert.ok(tabs.includes(route))
  const css = read('components/discovery-section-tabs.module.css')
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media\(max-width:400px\)/)
  for (const file of ['components/services-smart-discovery.tsx', 'components/app/simple-test-picker.jsx', 'components/academy-discovery.tsx', 'components/topic-journey-selector.tsx', 'components/events-discovery.tsx']) {
    assert.match(read(file), /<DiscoverySectionTabs locale=\{locale\} active=/, file)
  }
  assert.doesNotMatch(read('components/academy-discovery.tsx'), /programTabs/)
  assert.match(read('components/academy-discovery.tsx'), /<AcademyCourseCardList/)
  assert.match(read('components/public-growth-courses.tsx'), /<DiscoverySectionTabs locale=\{locale\} active="courses"/)
})

test('Seven compact journeys keep localized Library and Events discoverable in the public menu', async () => {
  const header = read('components/site-navigation.tsx')
  const locale = read('lib/public-locales.ts')
  const page = read('app/[locale]/events/page.tsx')
  const sitemap = read('app/sitemap.ts')
  for(const language of ['en','ru','es']) {
    assert.equal(getSiteNavigation(language).find(row => row.id === 'events')?.href, '/' + language + '/events')
    assert.equal(activeNavigationId('/' + language + '/events'), 'events')
    assert.ok(navigationCopy[language].events)
    assert.match(page, /alternates/)
  }
  assert.match(header, /getCompactNavigation\(activeLocale\)/)
  assert.match(locale, /events/)
  assert.match(sitemap, /locale \+ '\/events'/)
  const model = await import('../lib/site-navigation-model.js')
  const { sourceFixture, link, icons, nodes, textContent, blocked } = await import('./helpers/current-navigation-fixture.mjs')
  const { expectedPublicNavigation } = await import('./helpers/navigation-contract-expectations.mjs')
  assert.deepEqual(compactNavigationIds, expectedPublicNavigation('en').map(item => item.id))
  const labels = { en: ['Library', 'Events'], ru: ['Библиотека', 'События'], es: ['Biblioteca', 'Eventos'] }
  for (const language of ['en', 'ru', 'es']) {
    const expected = expectedPublicNavigation(language)
    const editorial = ['library', 'events'].map((id, index) => ({ id, href: '/' + language + '/' + id, label: labels[language][index] }))
    // Real header/model declarations; child services and all external effects stay inert.
    // Omit the explicit locale prop so the persistence effect does not write storage.
    for (const current of [...editorial, ...expected]) {
      const fixture = sourceFixture()
      const { SiteNavigation } = fixture.load(header, 'site-navigation.tsx', {
        '@/data/remedies': fixture.forbiddenModule(['Locale']),
        'next/link': link,
        'next/navigation': { usePathname: () => current.href },
        'lucide-react': icons('ArrowRight Menu Sparkles'),
        '@/components/commerce/cart-nav-link': { CartNavLink: 'cart-boundary' },
        '@/components/site-search': { SiteSearch: 'search-boundary' },
        './compact-navigation-icons': { compactNavigationIcons: Object.fromEntries(expected.map(item => [item.id, 'icon-' + item.id])) },
        '@/lib/ui-locale': { localePath: blocked, saveUiLocale: blocked },
        '@/lib/public-locales': { PublicLocale: blocked, hasSpanishCounterpart: () => true, publicCounterpart: (_path, locale) => '/' + locale, savePublicLocale: blocked },
        '@/lib/site-navigation-model': model,
        './use-navigation-locale': { useNavigationLocale: () => language },
        './home-personal-space': { HomePersonalSpaceNavEntry: 'account-boundary' },
      }, { exports: ['SiteNavigation'] })
      const rendered = fixture.mount(SiteNavigation, {})
      const menu = rendered.one(node => node.type === 'details' && node.props.className === 'site-main-menu')
      const menuNodes = nodes(menu)
      const more = menuNodes.filter(node => node.props.className === 'site-main-menu-more')
      assert.equal(more.length, 1, 'one expanded editorial menu')
      for (const item of editorial) {
        const matches = menuNodes.filter(node => node.props['data-nav-item'] === item.id)
        assert.equal(matches.length, 1, language + ': exactly one ' + item.id + ' menu link')
        const entry = matches[0]
        assert.ok(nodes(more[0]).includes(entry), 'editorial link remains in the expanded menu')
        assert.equal(entry.type, 'a')
        assert.equal(entry.props.href, item.href)
        assert.equal(entry.props.prefetch, false)
        assert.equal(textContent(entry), item.label)
        assert.equal(entry.props['aria-current'], current.id === item.id ? 'page' : undefined)
        assert.equal(activeNavigationId(item.href), item.id)
        assert.equal(model.activeCompactNavigationId(item.href), undefined)
      }
      const grid = menuNodes.filter(node => node.props.className === 'site-main-menu-grid')
      assert.equal(grid.length, 1, 'one compact menu')
      const compact = nodes(grid[0]).filter(node => node.props['data-nav-item'])
      assert.deepEqual(compact.map(node => node.props['data-nav-item']), expected.map(item => item.id))
      for (const [index, entry] of compact.entries()) {
        const item = expected[index]
        assert.equal(entry.type, 'a')
        assert.equal(entry.props.href, item.href)
        assert.equal(entry.props.prefetch, false)
        assert.equal(entry.props['aria-label'], item.ariaLabel)
        assert.equal(textContent(entry), item.label)
        assert.equal(entry.props['aria-current'], current.id === item.id ? 'page' : undefined)
      }
      fixture.assertNoExternalOperations()
    }
  }
})

test('Event page never invents upcoming dates or shows private unpublished entries', () => {
  const data = read('data/public-events.ts')
  const view = read('components/events-discovery.tsx')
  assert.match(data, /PUBLIC_EVENTS: readonly PublicEvent/);
  assert.match(data, /love-magic-tarot-initiations-2026-10-25/);
  assert.match(data, /2026-10-25T19:00:00-04:00/);
  assert.match(data, /2026-10-25T22:00:00-04:00/);
  assert.ok(data.includes("America/Toronto"));
  assert.match(data, /2003517510808/);
  assert.match(data, /status: "published"/);
  assert.ok(view.includes("event.posterUrl"));
  assert.ok(view.includes("event.highlights"));
  assert.match(view, /event\.status === "published"/)
  assert.match(view, /event\.registrationHref\.trim\(\)/)
  assert.match(view, /starts < now/)
  assert.match(view, /No confirmed upcoming dates are published yet/)
  assert.match(view, /Пока нет опубликованных подтверждённых дат/)
  assert.match(view, /Todavía no hay fechas próximas confirmadas/)
})
