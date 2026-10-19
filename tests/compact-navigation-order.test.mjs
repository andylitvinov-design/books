import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeCompactNavigationId, compactNavigationIds, getCompactNavigation, getSiteNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const order = ['home', 'tests', 'services', 'academy', 'business', 'house']

test('mobile bottom bar and menu use the same six ordered destinations in EN, RU and ES', () => {
  assert.deepEqual(compactNavigationIds, order)
  for (const locale of ['en', 'ru', 'es']) {
    const items = getCompactNavigation(locale)
    assert.deepEqual(items.map(item => item.id), order)
    assert.equal(new Set(items.map(item => item.id)).size, 6)
    assert.equal(items[0].href, locale === 'en' ? '/' : `/${locale}`)
    assert.equal(items[1].href, `/${locale}/client/tests`)
    assert.equal(items[4].href, `/${locale}/explore/business`)
    assert.equal(getSiteNavigation(locale).some(item => item.id === 'business'), false, 'Do not duplicate the Business mobile shortcut in the original primary navigation list')
    assert.equal(items[5].href, `/${locale === 'es' ? 'en' : locale}/app`)
    assert.equal(items[5].label, { en: 'Cabinet', ru: 'Кабинет', es: 'Gabinete' }[locale])
    for (const item of items) {
      assert.equal(item.label, navigationCopy[locale][item.id])
      assert.equal(item.ariaLabel, item.label)
      assert.equal(item.external, false)
    }
    for (const item of items.filter(item => ['home', 'services', 'academy'].includes(item.id))) {
      assert.deepEqual(item, getSiteNavigation(locale).find(link => link.id === item.id))
    }
    assert.equal(activeCompactNavigationId(`/${locale}/client/tests`), 'tests')
    assert.equal(activeCompactNavigationId(`/${locale}/services`), 'services')
    assert.equal(activeCompactNavigationId(`/${locale}/events`), 'events')
    assert.equal(activeCompactNavigationId(`/${locale}/explore/business`), 'business')
    assert.equal(activeCompactNavigationId(`/${locale}/library`), 'library')
    assert.equal(activeCompactNavigationId(`/${locale}/about`), 'about')
  }
  for (const locale of ['en','ru']) assert.equal(activeCompactNavigationId(`/${locale}/app`), 'house')
})

test('both navigation surfaces render from the canonical six-item model', () => {
  const bottom = readFileSync(new URL('../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
  const header = readFileSync(new URL('../components/site-navigation.tsx', import.meta.url), 'utf8')
  assert.match(bottom, /const mobileItems = getCompactNavigation\(locale\)/)
  const icons = readFileSync(new URL('../components/compact-navigation-icons.ts', import.meta.url), 'utf8')
  assert.match(icons, /business: BriefcaseBusiness/)
  assert.match(icons, /house: LayoutDashboard/)
  assert.match(bottom, /compactNavigationIcons\[item.id as keyof typeof compactNavigationIcons\]/)
  assert.match(header, /compactNavigationIcons\[item.id as keyof typeof compactNavigationIcons\]/)
  assert.match(header, /<BookOpen aria-hidden="true" \/>/)
  assert.match(header, /data-nav-item="library"/)
  assert.match(header, /className="site-library-entry"/)
  assert.match(header, /const mainMenuItems = getCompactNavigation\(activeLocale\)/)
  assert.match(header, /className="site-main-menu-grid"/)
  assert.match(header, /className="site-main-menu-more"/)
  assert.match(header, /data-nav-item=\{item.id\}/)
  assert.doesNotMatch(bottom, /mobileCopy|\[\.\.\.publicItems/)
  assert.doesNotMatch(header, /getSiteNavigation\(activeLocale\)\.map\(item =>/)
})
