import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('components/holistic-house-home.tsx')
const banner = read('components/home-free-tests-banner.tsx')
const layout = read('components/home-free-tests-banner.module.css')
const academyStyles = read('components/academy-free-course-banner.module.css')
const journeys = read('components/homepage-topic-journeys.tsx')

test('photo service cards appear before the free-test banner and existing topic cards', () => {
  assert.match(home, /import \{ HomeFreeTestsBanner \}/)
  const bannerAt = home.indexOf('<HomeFreeTestsBanner locale={locale} />')
  const helpAt = home.indexOf('<ServicesSolutions locale={locale} variant="home" />')
  assert.ok(helpAt > 0 && bannerAt > helpAt)
  assert.ok(home.indexOf('<HomepageTopicJourneys locale={locale} />') > bannerAt)
  assert.doesNotMatch(home, /HomeFreePaths/)
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
  assert.match(academyStyles, /@media \(max-width: 540px\)/)
  assert.match(academyStyles, /grid-template-columns: 96px minmax\(0,1fr\)/)
  assert.match(academyStyles, /min-height: 44px/)
  assert.match(layout, /max-width: 760px/)
  assert.match(banner, /не медицинская диагностика/)
})
