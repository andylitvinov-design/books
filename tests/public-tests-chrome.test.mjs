import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { activeNavigationId, getSiteNavigation, getCompactNavigation, isPublicTestDiscoveryPath } from '../lib/site-navigation-model.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('guest test-selection routes reuse public site chrome in EN and RU', () => {
  for (const locale of ['en', 'ru']) {
    for (const route of [`/${locale}/client`, `/${locale}/client/`, `/${locale}/client/tests`, `/${locale}/client/tests/`]) {
      assert.equal(isPublicTestDiscoveryPath(route), true, route)
      assert.equal(activeNavigationId(route), 'cabinet', route)
    }
    assertPublicNavigation(locale)
  }
})


// The expanded public catalogue and the compact seven-journey bar are distinct.
function assertPublicNavigation(locale, full = getSiteNavigation(locale), compact = getCompactNavigation(locale)) {
  const ids = ['home', 'energy', 'love', 'business', 'library', 'events', 'courses', 'pro', 'temple', 'cabinet']
  const routes = [locale === 'en' ? '/' : '/' + locale, ...['explore/energy', 'explore/love', 'explore/business', 'library', 'events', 'academy', 'pro', 'holistic-support', 'client'].map(route => '/' + locale + '/' + route)]
  assert.deepEqual(full.map(item => item.id), ids, 'all public catalogue destinations remain available')
  assert.deepEqual(full.map(item => item.href), routes, 'public catalogue routes are not compact-profile substitutes')
  assert.deepEqual(compact.map(item => item.id), ['profile', 'courses', 'home', 'analysis', 'alchemy', 'pro', 'temple'], 'exact compact journeys')
  assert.equal(compact.find(item => item.id === 'profile')?.href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait', 'compact Profile opens its own signed-in route')
}

for (const [name, mutateFull, mutateCompact] of [
  ['missing public Events destination', items => items.filter(item => item.id !== 'events'), items => items],
  ['Books alias replacing Library hub', items => items.map(item => item.id === 'library' ? { ...item, href: '/en/books' } : item), items => items],
  ['missing compact Alchemy journey', items => items, items => items.filter(item => item.id !== 'alchemy')],
  ['guest catalog replacing compact Profile', items => items, items => items.map(item => item.id === 'profile' ? { ...item, href: '/en/client/tests' } : item)],
]) test('public navigation rejects ' + name, () => {
  assertPublicNavigation('en')
  assert.throws(() => assertPublicNavigation('en', mutateFull(getSiteNavigation('en')), mutateCompact(getCompactNavigation('en'))), { code: 'ERR_ASSERTION' })
})

test('private client routes are not mistaken for public test discovery', () => {
  for (const route of [
    '/en/client/session', '/en/client/personal-selector', '/ru/client/tests/hidden',
    '/en/client/test', '/es/client', '/en/app/tests', '/en/client-private',
    '/admin', '/en/academy',
  ]) assert.equal(isPublicTestDiscoveryPath(route), false, route)
})

test('Academy and My Tests keep navigation and the restored top consultation banner', () => {
  const root = source('app/layout.tsx')
  const ribbon = source('components/sitewide-antistress-banner.tsx')
  const bottom = source('components/mobile-bottom-navigation.tsx')
  const landing = source('app/[locale]/client/page.tsx')
  const explorer = source('app/[locale]/client/tests/page.tsx')
  assert.match(root, /<SitewideAntistressBanner initialLocale=\{lang\}/)
  assert.match(root, /<MobileBottomNavigation initialLocale=\{lang\}/)
  assert.match(ribbon, /export function SitewideAntistressBanner/)
  assert.match(bottom, /!isPublicTestDiscoveryPath\(pathname\)/)
  assert.match(ribbon, /data-sitewide-personal-review-banner/)
  assert.match(bottom, /getCompactNavigation\(locale\)/)
  for (const locale of ['en', 'ru', 'es']) {
    assert.equal(getCompactNavigation(locale).find(item => item.id === 'profile')?.href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait')
  }
  assert.match(landing, /<PublicSiteHeader locale=\{typedLocale\}/)
  assert.match(explorer, /<PublicSiteHeader locale=\{locale as Locale\}/)
  assert.match(bottom, /aria-current=\{current === item.id \? 'page'/)
})

test('guest questionnaires and results hide mobile navigation without hiding the catalog', () => {
  const landing = source('components/app/cabinet-landing.jsx')
  const styles = source('app/ia-v2.css')
  assert.match(landing, /phase === 'catalog' && <div id="cabinet-tests">/)
  assert.match(landing, /phase !== 'catalog' && <section className="cabinet-guest-tests"/)
  assert.match(styles, /body:has\(\.client-entry-shell \.cabinet-guest-tests\)/)
  assert.match(styles, /\[data-sitewide-personal-review-banner\]/)
  assert.match(styles, /\.ia222-bottom-navigation/)
  assert.match(styles, /padding-bottom: 0 !important/)
})
