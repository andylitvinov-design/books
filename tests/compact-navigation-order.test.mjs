import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeCompactNavigationId, compactNavigationIds, getCompactNavigation, getSiteNavigation, navigationCopy } from '../lib/site-navigation-model.js'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const order = ['home','profile','coaching','insights','support','pro']
test('six accessible public tabs lead to distinct routes in EN/RU/ES', () => {
  assert.deepEqual(compactNavigationIds, order)
  const routes = {profile:'personality-profiles',coaching:'coaching',insights:'temple-insights',support:'holistic-support',pro:'pro'}
  for (const locale of ['en','ru','es']) {
    const items = getCompactNavigation(locale)
    assert.deepEqual(items.map(x=>x.id), order)
    assert.equal(new Set(items.map(x=>x.href)).size,6)
    assert.equal(items[0].href, locale==='en'?'/':'/'+locale)
    for (const item of items.slice(1)) assert.equal(item.href, '/'+locale+'/'+routes[item.id])
    for (const item of items) {
      assert.equal(item.label, navigationCopy[locale][item.id])
      assert.equal(item.ariaLabel,item.label)
      assert.equal(item.external,false)
    }
    assert.equal(activeCompactNavigationId('/'+locale+'/personality-profiles'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/client/tests'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/tests'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/coaching'),'coaching')
    assert.equal(activeCompactNavigationId('/'+locale+'/temple-insights'),'insights')
    assert.equal(activeCompactNavigationId('/'+locale+'/holistic-support'),'support')
    assert.equal(activeCompactNavigationId('/'+locale+'/temple-support'),'insights')
    assert.equal(activeCompactNavigationId('/'+locale+'/pro'),'pro')
    assert.equal(activeCompactNavigationId('/'+locale+'/library'),undefined)
    for (const id of ['energy','love','business']) {
      assert.ok(!items.some(x=>x.id===id))
      assert.ok(getSiteNavigation(locale).some(x=>x.id===id),'legacy category remains discoverable')
    }
  }
})
test('bottom bar and hamburger share model, private menu remains separate', () => {
  const bottom=read('components/mobile-bottom-navigation.tsx')
  const header=read('components/site-navigation.tsx')
  const icons=read('components/compact-navigation-icons.ts')
  for (const key of ['profile','coaching','insights','support','pro']) assert.match(icons,new RegExp(key+': '))
  assert.ok(bottom.includes('const mobileItems = getCompactNavigation(locale)'))
  assert.ok(bottom.includes('aria-label={item.ariaLabel}'))
  assert.ok(header.includes('const mainMenuItems = getCompactNavigation(activeLocale)'))
  assert.ok(header.includes("['energy', 'love', 'business', 'library', 'courses', 'events']"))
  assert.ok(header.includes('<HomePersonalSpaceNavEntry locale={activeLocale}'))
  const css=read('app/ia-v2.css'), homeCss=read('app/holistic-house-home.css')
  assert.ok(css.includes('grid-template-columns: repeat(6,minmax(0,1fr))'))
  assert.ok(homeCss.includes('grid-template-columns: repeat(6, minmax(0,1fr))'))
  assert.ok(css.includes('min-height: 58px'))
  assert.ok(css.includes('-webkit-line-clamp: 2'))
})
test('My Profile guest tests and separate support journeys are all localized and safe', () => {
  const builder=read('components/personality-profiles-builder.tsx')
  const locales=read('lib/public-locales.ts'), sitemap=read('app/sitemap.ts')
  assert.ok(builder.includes('data-personality-profile-builder'))
  assert.ok(builder.includes('data-profile-direct-tests'))
  assert.ok(builder.includes("locale + '/tests'"))
  assert.ok(builder.includes('data-profile-start-tests'))
  assert.ok(builder.includes('/app/portfolio#hh-development-program'))
  for (const section of ['temple-insights','holistic-support']) {
    const page=read('app/[locale]/'+section+'/page.tsx')
    assert.ok(page.includes('generateMetadata'))
    // The published Holistic Support hub is intentionally dynamic for approved practitioner listings.
    if (section === 'temple-insights') assert.ok(page.includes('generateStaticParams'))
    else assert.ok(page.includes('force-dynamic'))
    assert.ok(sitemap.includes(section))
    assert.ok(locales.includes(section))
    for (const locale of ['en','ru','es']) assert.ok(page.includes(locale+': "/'+locale+'/'+section+'"'))
    assert.doesNotMatch(page,/createLead\(|checkout\(|localStorage|sessionStorage/)
  }
  assert.ok(read('app/[locale]/temple-insights/page.tsx').includes('<IdeasDiscovery locale={language} variant="temple"'))
  assert.ok(read('app/[locale]/holistic-support/page.tsx').includes('/services/remote-energy-support'))
  assert.ok(read('app/[locale]/holistic-support/page.tsx').includes('/services/alchemy-of-soul'))
})
