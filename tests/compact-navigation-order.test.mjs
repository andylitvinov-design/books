import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeCompactNavigationId, compactNavigationIds, getCompactNavigation, getSiteNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const order = ['home', 'energy', 'love', 'business', 'tests', 'books']

test('mobile bottom bar and menu use the same six ordered destinations in EN, RU and ES', () => {
  assert.deepEqual(compactNavigationIds, order)
  for (const locale of ['en', 'ru', 'es']) {
    const items = getCompactNavigation(locale)
    assert.deepEqual(items.map(item => item.id), order)
    assert.equal(new Set(items.map(item => item.id)).size, 6)
    assert.equal(items[0].href, locale === 'en' ? '/' : `/${locale}`)
    assert.equal(items[1].href, `/${locale}/explore/energy`)
    assert.equal(items[2].href, `/${locale}/explore/relationships`)
    assert.equal(items[4].href, `/${locale}/client/tests`)
    assert.equal(items[3].href, `/${locale}/explore/business`)
    assert.equal(getSiteNavigation(locale).filter(item => item.id === 'business').length, 1, 'Business is one canonical public direction')
    assert.equal(items[5].href, `/${locale}/books`)
    assert.equal(items[5].label, { en: 'Ideas', ru: 'Идеи', es: 'Ideas' }[locale])
    for (const item of items) {
      assert.equal(item.label, navigationCopy[locale][item.id])
      assert.equal(item.ariaLabel, item.label)
      assert.equal(item.external, false)
    }
    for (const item of items.filter(item => ['home', 'energy', 'love', 'business'].includes(item.id))) {
      assert.deepEqual(item, getSiteNavigation(locale).find(link => link.id === item.id))
    }
    assert.equal(activeCompactNavigationId(`/${locale}/client/tests`), 'tests')
    assert.equal(activeCompactNavigationId(`/${locale}/explore/energy`), 'energy')
    assert.equal(activeCompactNavigationId(`/${locale}/explore/relationships`), 'love')
    assert.equal(activeCompactNavigationId(`/${locale}/events`), 'events')
    assert.equal(activeCompactNavigationId(`/${locale}/explore/business`), 'business')
    assert.equal(activeCompactNavigationId(`/${locale}/library`), 'books')
    assert.equal(activeCompactNavigationId(`/${locale}/about`), 'about')
  }
  for (const locale of ['en','ru']) assert.equal(activeCompactNavigationId(`/${locale}/app`), 'cabinet')
})

test('both navigation surfaces render from the canonical six-item model', () => {
  const bottom = readFileSync(new URL('../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
  const header = readFileSync(new URL('../components/site-navigation.tsx', import.meta.url), 'utf8')
  assert.match(bottom, /const mobileItems = getCompactNavigation\(locale\)/)
  const icons = readFileSync(new URL('../components/compact-navigation-icons.ts', import.meta.url), 'utf8')
  assert.match(icons, /energy: Flame/)
  assert.match(icons, /love: Heart/)
  assert.match(icons, /business: BriefcaseBusiness/)
  assert.match(icons, /books: BookOpen/)
  assert.match(bottom, /compactNavigationIcons\[item.id as keyof typeof compactNavigationIcons\]/)
  assert.match(header, /compactNavigationIcons\[item.id as keyof typeof compactNavigationIcons\]/)
  assert.match(header, /<LayoutDashboard aria-hidden="true" \/>/)
  assert.match(header, /data-nav-item="cabinet"/)
  assert.match(header, /className="site-cabinet-entry"/)
  assert.match(header, /const mainMenuItems = getCompactNavigation\(activeLocale\)/)
  assert.match(header, /className="site-main-menu-grid"/)
  assert.match(header, /className="site-main-menu-more"/)
  assert.match(header, /data-nav-item=\{item.id\}/)
  assert.doesNotMatch(bottom, /mobileCopy|\[\.\.\.publicItems/)
  assert.doesNotMatch(header, /getSiteNavigation\(activeLocale\)\.map\(item =>/)
})
