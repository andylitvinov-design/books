import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getTopicJourney } from '../lib/assessments/topic-journeys.js'
import { getCompactNavigation, activeCompactNavigationId } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Energy Love Business are the three named primary directions in EN RU ES', () => {
  for (const locale of ['en','ru','es']) {
    const nav = getCompactNavigation(locale)
    assert.deepEqual(nav.slice(1,4).map(item => item.id), ['energy','love','business'])
    assert.deepEqual(nav.slice(1,4).map(item => item.href), ['energy','love','business'].map(id => '/' + locale + '/explore/' + id))
    for (const id of ['energy','love','business']) assert.equal(activeCompactNavigationId('/' + locale + '/explore/' + id), id)
  }
})

test('Love route reuses original relationship questionnaire IDs, not a cloned test registry', () => {
  assert.strictEqual(getTopicJourney('love'), getTopicJourney('relationships'))
  assert.equal(getTopicJourney('love').id, 'relationships')
  assert.equal(getTopicJourney('unknown'), null)
  const route = read('app/[locale]/explore/[theme]/page.tsx')
  const locales = read('lib/public-locales.ts')
  assert.match(route, /theme:'love'/)
  assert.match(route, /theme === 'relationships' \? 'love'/)
  assert.match(locales, /relationships\|love\|business/)
})

test('all three public directions show one free test, one existing course and one personal session', () => {
  const page = read('app/[locale]/explore/[theme]/page.tsx')
  const cards = read('components/topic-path-offers.tsx')
  const style = read('components/topic-path-offers.module.css')
  assert.match(page, /<TopicPathOffers locale=\{locale as PublicLocale\} journey=\{journey\}\/>/)
  assert.match(page, /data-topic-more-offers/)
  for (const direction of ['energy','love','business']) assert.match(cards, new RegExp(direction + ': \\{'))
  for (const key of ['test','course','session']) assert.match(cards, new RegExp("key: '" + key + "'"))
  assert.match(cards, /journey\.topics\.find\(item => item\.id === filterId\)/)
  assert.match(cards, /new URLSearchParams\(/)
  assert.match(cards, /selected\?\.focus \?\? journey\.focus/)
  assert.match(cards, /\/client\/tests\?/)
  assert.match(cards, /\/academy\/reiki\/free-practitioner-course/)
  assert.match(cards, /\/courses\/antistress/)
  assert.match(cards, /\/app\/business/)
  assert.match(cards, /remote-energy-support/)
  assert.match(cards, /systemic-constellations/)
  assert.match(cards, /business-consulting/)
  assert.match(cards, /photographs\[direction\]\[index\]/)
  assert.match(cards, /<Image[^]*unoptimized loading="lazy"/)
  assert.match(cards, /data-topic-offer-action=\{key\}/)
  assert.match(cards, /data-topic-offer-filter/)
  assert.match(cards, /locale === 'es' \? 'en' : locale/)
  assert.doesNotMatch(cards, /score=|answers=|diagnosis=|clientId=|utm_source=|sendBeacon|localStorage/)
  assert.match(style, /grid-template-columns:clamp\(98px,28%,135px\) minmax\(0,1fr\)/)
  assert.match(style, /@media\(max-width:360px\)/)
  assert.match(style, /:focus-visible/)
})

test('existing Services, Academy and private flows remain available from the auxiliary navigation', () => {
  const header = read('components/site-navigation.tsx')
  const model = read('lib/site-navigation-model.js')
  assert.match(header, /item\.id === 'energy' \|\| item\.id === 'love' \|\| item\.id === 'business'/)
  assert.match(header, /item\.id === 'services' \|\| item\.id === 'academy'/)
  assert.match(model, /primaryNavigationIds = \['home', 'library', 'services', 'events', 'relationships', 'academy', 'courses', 'cabinet'\]/)
})
