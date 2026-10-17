import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { availableTestCollections, TEST_TOPIC_COLLECTIONS } from '../lib/assessments/test-collections.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, buildPublicStarterBattery } from '../lib/assessments/test-explorer.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('topic collections are localized editorial filters with real, eligible questionnaires', () => {
  assert.equal(TEST_TOPIC_COLLECTIONS.length, 12)
  assert.equal(new Set(TEST_TOPIC_COLLECTIONS.map((item) => item.id)).size, 12)
  for (const preset of TEST_TOPIC_COLLECTIONS) {
    assert.ok(preset.title.en && preset.title.ru && preset.title.es, preset.id)
    assert.ok(preset.detail.en && preset.detail.ru && preset.detail.es, preset.id)
    assert.ok(preset.focus.length > 0, preset.id)
  }
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const collections = availableTestCollections(entries)
    assert.ok(collections.length >= 8, locale)
    assert.deepEqual(collections.slice(0, 4).map((item) => item.id),
      ['stress', 'relationships', 'tantra', 'sexuality'])
    for (const item of collections) {
      const matching = filterExplorerEntries(entries, { availability: 'available', focus: item.focus })
      assert.equal(item.count, matching.filter((entry) => entry.selectable).length, item.id)
      assert.ok(item.count > 0, item.id)
      assert.ok(matching.filter((entry) => entry.selectable).every((entry) =>
        entry.rightsStatus === 'cleared' && entry.definition && entry.startable && entry.guestEligible), item.id)
    }
  }
})

test('choosing Tantra or sexuality shows actual available reflective questionnaires, never auto-enrolls them', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    for (const [focus, expectedKeys] of [
      [['tantra'], ['hh-tantra-presence', 'hh-sensual-joy']],
      [['sexuality'], ['hh-intimacy-consent', 'hh-desire-dialogue', 'hh-sexual-self-kindness']],
    ]) {
      const candidates = filterExplorerEntries(entries, { availability: 'available', focus })
      const matches = rankPublicTestMatches(candidates, { focus, depth: 'balanced' })
      for (const key of expectedKeys) {
        assert.ok(matches.some((entry) => entry.key === key), locale + ' / ' + focus + ' / ' + key)
        assert.ok(!buildPublicStarterBattery(matches).some((entry) => entry.key === key),
          key + ' requires an explicit choice, not automatic enrollment')
      }
    }
  }
})

test('two-row themed collection module is between hero and step one, expandable, and linked to the existing recommender', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const parent = read('components/app/test-explorer.jsx')
  const css = read('components/app/simple-test-picker.module.css')
  const afterHero = picker.indexOf('data-test-topic-collections')
  assert.ok(afterHero > picker.indexOf('</header>'))
  assert.ok(afterHero < picker.indexOf('aria-labelledby="hh-simple-topic-title"'))
  assert.match(picker, /data-test-collection=\{collection\.id\}/)
  assert.match(picker, /onChooseCollection\?\.\(active \? \[\] : collection\.focus\)/)
  assert.match(picker, /aria-expanded=\{collectionsOpen\}/)
  assert.match(picker, /setCollectionsOpen\(\(value\) => !value\)/)
  assert.match(picker, /hh-simple-recommendations/)
  assert.match(parent, /catalogEntries=\{entries\}/)
  assert.match(parent, /onChooseCollection=\{\(keys\) => \{/)
  assert.match(parent, /setFocus\(keys\)/)
  assert.match(css, /\.curatedCard:nth-child\(n\+9\)\s*\{\s*display:\s*none;/)
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.match(css, /\.curatedCard:nth-child\(n\+5\)\s*\{\s*display:\s*none;/)
  assert.match(css, /\.curated\[data-expanded="true"\] \.curatedCard\s*\{\s*display:\s*flex;/)
  assert.match(picker, /Подборки тестов по темам/)
  assert.match(picker, /Test collections by topic/)
})
