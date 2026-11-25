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

test('Business replaces Events in mobile navigation while Events remains public via the menu', () => {
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
  assert.match(header, /item.id === 'library'/)
  assert.match(header, /className="site-library-entry"/)
  assert.match(header, /data-nav-item="library"/)
  assert.match(locale, /events/)
  assert.match(sitemap, /locale \+ '\/events'/)
  assert.deepEqual(compactNavigationIds, ['home', 'tests', 'services', 'academy', 'business', 'house'])
  assert.match(header, /item.id === 'events'/)
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
