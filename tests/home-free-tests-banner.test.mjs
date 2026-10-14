import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('components/holistic-house-home.tsx')
const banner = read('components/home-free-tests-banner.tsx')
const layout = read('components/home-free-tests-banner.module.css')
const academyStyles = read('components/academy-free-course-banner.module.css')
const journeys = read('components/homepage-topic-journeys.tsx')

test('free test promo comes before How I can help without replacing existing services', () => {
  assert.match(home, /import \{ HomeFreeTestsBanner \}/)
  const bannerAt = home.indexOf('<HomeFreeTestsBanner locale={locale} />')
  const helpAt = home.indexOf('<ServicesSolutions locale={locale} variant="home" />')
  assert.ok(bannerAt > 0 && helpAt > bannerAt)
  assert.ok(home.indexOf('<HomepageTopicJourneys locale={locale} />') > helpAt)
})

test('free test CTA selects a relevant topic instead of opening the obsolete unfiltered tests screen', () => {
  assert.match(banner, /href="#hh-topic-journeys"/)
  assert.match(journeys, /id="hh-topic-journeys"/)
  assert.match(journeys, /explore\/\$\{journey\.id\}/)
  assert.doesNotMatch(banner, /\/client\/tests|\/app\/tests/)
})

test('RU and EN copy, Academy look, five topic areas and mobile width are present', () => {
  assert.match(banner, /БЕСПЛАТНЫЕ ТЕСТЫ/)
  assert.match(banner, /FREE SELF-CHECK TESTS/)
  assert.match(banner, /5 направлений/)
  assert.match(banner, /5 topic areas/)
  assert.match(banner, /academy-free-course-banner\.module\.css/)
  assert.match(academyStyles, /@media \(max-width: 460px\)/)
  assert.match(layout, /max-width: 760px/)
  assert.match(banner, /не медицинская диагностика/)
})
