import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('components/holistic-house-home.tsx')
const spanishHome = read('app/es/page.tsx')
const journeys = read('components/homepage-topic-journeys.tsx')

// The owner explicitly removed the obsolete blue marketing block.
// Keep this regression guard so future homepage redesigns cannot revive it.
test('broken legacy free-test promo is absent from all home locales and source', () => {
  for (const page of [home, spanishHome]) {
    assert.doesNotMatch(page, /HomeFreeTestsBanner|home-free-tests-banner|data-home-free-tests-banner/)
  }
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.tsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.module.css', import.meta.url)), false)
})

test('existing photo-led services and five topic journeys stay in the right order', () => {
  const serviceCardsAt = home.indexOf('<ServicesSolutions locale={locale} variant="home" />')
  const topicCardsAt = home.indexOf('<HomepageTopicJourneys locale={locale} />')
  assert.ok(serviceCardsAt >= 0 && topicCardsAt > serviceCardsAt)
  assert.match(journeys, /id="hh-topic-journeys"/)
  assert.ok(journeys.includes('TOPIC_JOURNEYS.map'))
  assert.ok(journeys.includes('explore/${journey.id}'))
  assert.match(home, /data-hero-cta": "free-tests"/)
  assert.match(home, /event="self_check_start"/)
  assert.ok(home.includes('<HomepageContactCta locale={locale} />'))
})
