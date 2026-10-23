import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { getTopicJourney } from '../lib/assessments/topic-journeys.js'
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from '../lib/site-navigation-model.js'

test('Energy / Love / Business is the one public navigation taxonomy in EN/RU/ES', () => {
  assert.equal(getTopicJourney('love').id, 'relationships', 'No second questionnaire or course catalog')
  for (const locale of ['en', 'ru', 'es']) {
    const primary = getSiteNavigation(locale)
    const bottom = getCompactNavigation(locale)
    assert.deepEqual(bottom.map(item => item.id), ['home','energy','love','business','tests','books'])
    for (const [id, slug] of [['energy','energy'],['love','love'],['business','business']]) {
      assert.equal(primary.find(item => item.id === id).href, '/' + locale + '/explore/' + slug)
      assert.equal(bottom.find(item => item.id === id).href, '/' + locale + '/explore/' + slug)
      assert.equal(activeCompactNavigationId('/' + locale + '/explore/' + slug), id)
    }
    assert.equal(activeCompactNavigationId('/' + locale + '/explore/relationships'), 'love')
  }
})

test('Public discovery reuses photo assets and verified catalog paths', async () => {
  const card = await readFile('components/direction-offers.tsx','utf8')
  const styles = await readFile('components/direction-offers.module.css','utf8')
  const route = await readFile('app/[locale]/explore/[theme]/page.tsx','utf8')
  const home = await readFile('components/homepage-topic-journeys.tsx','utf8')
  const more = await readFile('components/home-more-disclosure.tsx','utf8')
  const site = await readFile('components/site-navigation.tsx','utf8')
  const spanish = await readFile('app/es/page.tsx','utf8')
  for (const offer of ['test','course','session']) assert.ok(card.includes('data-offer-action'), offer)
  assert.match(card, /data-direction-filter/)
  assert.match(card, /journeyFocusForTopics/)
  assert.match(card, /client\\/tests\\?focus=/)
  assert.match(card, /courses\\/antistress/)
  assert.match(card, /services\\/business-consulting/)
  assert.match(card, /systemic-constellations/)
  assert.match(card, /no-store|prefetch=\\{false\\}/)
  assert.match(card, /direction === 'relationships' \\? 'love'/)
  assert.match(styles, /@media\\(max-width:430px\\)/)
  assert.match(styles, /@media\\(max-width:350px\\)/)
  assert.match(styles, /grid-template-columns:92px minmax\\(0,1fr\\)/)
  assert.match(route, /theme === 'relationships'\\) redirect/)
  assert.match(route, /data-direction-more/)
  assert.match(route, /<TopicJourneySelector/)
  assert.match(home, /direction\\.id === 'relationships' \\? 'love'/)
  assert.match(spanish, /<HomepageTopicJourneys locale="es" \\/>/)
  assert.doesNotMatch(more, /<HomepageTopicJourneys locale=/)
  assert.match(site, /id: 'services'/)
  assert.match(site, /id: 'academy'/)
})
