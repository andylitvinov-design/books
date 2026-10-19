import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('only the Business & Money topic receives a dedicated consultation banner', () => {
  const selector = read('components/topic-journey-selector.tsx')
  const intro = selector.indexOf("{journey.id === 'business' && (")
  const selection = selector.indexOf('<section className={styles.selection}')
  assert.ok(intro > 0 && intro < selection, 'Business banner should appear above self-check topics')
  const banner = selector.slice(intro, selection)
  assert.match(banner, /data-business-consultation-banner/)
  assert.match(banner, /hh-business-consultation-title/)
  assert.match(banner, /href=\{'\/' \+ language \+ '\/services\/business-consulting'\}/)
  assert.match(banner, /event="service_view"/)
  assert.match(banner, /data-topic-action': 'business-consultation-banner'/)
  assert.match(banner, /onClick=\{cancelStart\}/)
  assert.doesNotMatch(banner, /testResults|score|answers|accountId|clientId/)
  assert.match(selector, /personalServiceForJourney/)
  assert.match(selector, /data-topic-action': 'consultation'/)
})

test('business offer copy and clear format prices are localized in EN/RU/ES', () => {
  const selector = read('components/topic-journey-selector.tsx')
  const section = selector.split('const businessPromo = {')[1]?.split('} as const')[0]
  assert.ok(section, 'localized copy map')
  for (const lang of ['en', 'ru', 'es']) {
    assert.match(section, new RegExp('\\b' + lang + ': \\{'))
  }
  assert.equal((section.match(/€50/g) || []).length, 3)
  assert.equal((section.match(/€100/g) || []).length, 3)
  assert.match(selector, /const businessCallout = businessPromo\[language\]/)
})

test('compact navy-gold styling and approved portrait are consistent on homepage and Business topic', () => {
  const topicCss = read('components/topic-journey-selector.module.css')
  const homepageCss = read('components/homepage-topic-journeys.module.css')
  const topicSelector = read('components/topic-journey-selector.tsx')
  const tile = read('components/homepage-topic-journeys.tsx')
  assert.match(topicCss, /\.businessPromo\{/)
  assert.match(topicCss, /\.businessPromoLink:focus-visible/)
  assert.match(topicCss, /@media\(max-width:600px\)/)
  assert.match(homepageCss, /\.tile\[data-topic-id="business"\]/)
  const portrait = '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp'
  assert.ok(topicSelector.includes(portrait) && tile.includes(portrait))
  assert.ok(existsSync(new URL('../public' + portrait, import.meta.url)))
})


test('business discovery matches Academy hero and preserves independently chosen topic tests', () => {
  const selector = read('components/topic-journey-selector.tsx')
  const tabs = read('components/discovery-section-tabs.tsx')
  const css = read('components/topic-journey-selector.module.css')
  assert.match(selector, /<DiscoverySectionTabs locale=\{locale\} active="business"/)
  assert.match(selector, /businessSearchForm/)
  assert.match(selector, /businessQuickPaths/)
  assert.match(selector, /visibleTopics\.map/)
  assert.match(selector, /journey\.id !== 'business' \|\| !businessFilter/)
  assert.match(selector, /setBusinessFilter\(businessQuery\.trim\(\)\.toLocaleLowerCase\(\)\)/)
  assert.match(css, /#203450 0%, #283d5c 58%, #483a52 100%/)
  assert.match(tabs, /"tests", "services", "business", "courses"/)
  assert.match(tabs, /\/explore\/business/)
  assert.match(selector, /<section className=\{styles\.suggestions\}/)
  assert.match(selector, /data-business-consultation-banner/)
})
