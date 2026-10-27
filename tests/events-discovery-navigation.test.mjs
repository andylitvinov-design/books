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

test('Seven compact journeys coexist with public Events and Library in the expanded menu', () => {
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
  assertExpandedDestinations(header)
  assert.match(locale, /events/)
  assert.match(sitemap, /locale \+ '\/events'/)
  assert.deepEqual(compactNavigationIds, ['profile', 'courses', 'home', 'analysis', 'alchemy', 'pro', 'temple'])
})


function assertExpandedDestinations(header, navigation = getSiteNavigation) {
  const selection = header.match(/const extraMenuItems = (getSiteNavigation\(activeLocale\)\.filter\([\s\S]*?\));/)
  assert.ok(selection, 'expanded menu derives its destinations from the public model')
  const select = new Function('getSiteNavigation', 'activeLocale', 'return ' + selection[1])
  for (const language of ['en', 'ru', 'es']) {
    const items = select(navigation, language)
    assert.deepEqual(items.map(item => item.id), ['energy', 'love', 'business', 'library', 'events'], 'expanded public destinations')
    for (const id of ['library', 'events']) assert.equal(items.find(item => item.id === id)?.href, '/' + language + '/' + id, 'localized ' + id + ' route')
  }
  const expanded = header.slice(header.indexOf('<div className="site-main-menu-more">'))
  assert.match(expanded, /extraMenuItems\.map\(item => \([\s\S]*?<Link[\s\S]*?data-nav-item=\{item.id\}[\s\S]*?href=\{item.href\}/, 'selected destinations are actually rendered in the expanded menu')
}

for (const [name, mutate] of [
  ['missing Events', value => value.replace("'library', 'events'", "'library'")],
  ['missing Library', value => value.replace("'library', 'events'", "'events'")],
  ['unrendered extra destinations', value => value.replace('extraMenuItems.map(item => (', '[].map(item => (')],
]) test('expanded navigation rejects ' + name, () => {
  const header = read('components/site-navigation.tsx')
  assertExpandedDestinations(header)
  const broken = mutate(header)
  assert.notEqual(broken, header, 'mutation applies to actual header')
  assert.throws(() => assertExpandedDestinations(broken), { code: 'ERR_ASSERTION' })
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
