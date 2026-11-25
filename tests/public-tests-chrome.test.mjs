import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { activeNavigationId, getSiteNavigation, isPublicTestDiscoveryPath } from '../lib/site-navigation-model.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('guest test-selection routes reuse public site chrome in EN and RU', () => {
  for (const locale of ['en', 'ru']) {
    for (const route of [`/${locale}/client`, `/${locale}/client/`, `/${locale}/client/tests`, `/${locale}/client/tests/`]) {
      assert.equal(isPublicTestDiscoveryPath(route), true, route)
      assert.equal(activeNavigationId(route), 'cabinet', route)
    }
    assert.equal(getSiteNavigation(locale).filter(item => item.id !== 'relationships').length, 7)
  }
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
  const model = source('lib/site-navigation-model.js')
  assert.ok(model.includes('/client/tests'))
  assert.ok(model.includes("selected === 'es' ? 'en' : selected"))
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
