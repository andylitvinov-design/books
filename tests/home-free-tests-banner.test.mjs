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

test('free courses and tests live in the seven steps; lower topics are compact filters', () => {
  const feature = read('components/home-featured-workspace.tsx')
  const filters = read('components/home-more-disclosure.tsx')
  assert.match(feature, /"courses": \{/)
  assert.match(feature, /"personality": \{/)
  assert.match(feature, /"allTests":/)
  assert.match(feature, /"opora":/)
  assert.match(journeys, /id="hh-topic-journeys"/)
  assert.ok(journeys.includes('TOPIC_JOURNEYS.map'))
  assert.match(filters, /data-home-topic-filter="love"/)
  assert.match(filters, /data-home-topic-filter="business"/)
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/)
});
