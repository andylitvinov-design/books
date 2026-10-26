import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeCompactNavigationId, compactNavigationIds, getCompactNavigation, getSiteNavigation, navigationCopy } from '../lib/site-navigation-model.js'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const order = ['profile','courses','home','analysis','alchemy','pro','temple']
test('seven accessible public tabs lead to distinct routes in EN/RU/ES', () => {
  assert.deepEqual(compactNavigationIds, order)
  const routes = {analysis:'services/free-situation-review',courses:'academy',alchemy:'services/alchemy-of-soul',pro:'pro',temple:'holistic-support'}
  for (const locale of ['en','ru','es']) {
    const items = getCompactNavigation(locale)
    assert.deepEqual(items.map(x=>x.id), order)
    assert.equal(new Set(items.map(x=>x.href)).size,7)
    assert.equal(items[0].href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait')
    for (const item of items.slice(1)) assert.equal(item.href,
      item.id === 'home' ? (locale === 'en' ? '/' : '/' + locale) : '/' + locale + '/' + routes[item.id])
    for (const item of items) {
      assert.equal(item.label, navigationCopy[locale][item.id])
      assert.equal(item.ariaLabel,item.label)
      assert.equal(item.external,false)
    }
    assert.equal(activeCompactNavigationId('/'+locale+'/personality-profiles'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/client/tests'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/tests'),'profile')
    assert.equal(activeCompactNavigationId('/'+locale+'/coaching'),undefined)
    assert.equal(activeCompactNavigationId('/'+locale+'/services/alchemy-of-soul'),'alchemy')
    assert.equal(activeCompactNavigationId('/'+locale+'/services/psychohomeopathy'),'alchemy')
    assert.equal(items.find(item=>item.id==='alchemy')?.label, {en:'Psychic Alchemy',ru:'Алхимия души',es:'Alquimia del Alma'}[locale])
    assert.ok(!items.some(item=>item.id==='coaching'))
    assert.equal(activeCompactNavigationId('/'+locale+'/services/free-situation-review'),'analysis')
    assert.equal(activeCompactNavigationId('/'+locale+'/academy'),'courses')
    assert.equal(activeCompactNavigationId('/'+locale+'/temple-insights'),'temple')
    assert.equal(activeCompactNavigationId('/'+locale+'/holistic-support'),'temple')
    assert.equal(activeCompactNavigationId('/'+locale+'/temple-support'),'temple')
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
  for (const key of ['analysis','courses','profile','alchemy','pro','temple']) assert.match(icons,new RegExp(key+': '))
  assert.match(icons,/alchemy: FlaskConical/)
  assert.ok(bottom.includes('const mobileItems = getCompactNavigation(locale)'))
  assert.ok(bottom.includes('aria-label={item.ariaLabel}'))
  assert.ok(header.includes('const mainMenuItems = getCompactNavigation(activeLocale)'))
  assert.ok(header.includes("['energy', 'love', 'business', 'library', 'events']"))
  assert.ok(header.includes('<HomePersonalSpaceNavEntry locale={activeLocale}'))
  const css=read('app/ia-v2.css'), homeCss=read('app/holistic-house-home.css')
  assert.ok(css.includes('grid-template-columns: repeat(7,minmax(0,1fr))'))
  assert.ok(homeCss.includes('grid-template-columns: repeat(7, minmax(0,1fr))'))
  assert.ok(css.includes('min-height: 58px'))
  assert.ok(css.includes('-webkit-line-clamp: 2'))
})
test('My Profile guest tests and separate support journeys are all localized and safe', () => {
  const builder=read('components/personality-profiles-builder.tsx')
  const locales=read('lib/public-locales.ts'), sitemap=read('app/sitemap.ts')
  assert.ok(builder.includes('data-personality-profile-builder'))
  assert.ok(builder.includes('data-profile-direct-tests'))
  assert.ok(builder.includes("locale + '/client/tests'"))
  assert.ok(builder.includes('data-profile-google-signin'))
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
