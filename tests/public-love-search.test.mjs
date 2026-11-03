import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildExplorerEntries,
  filterExplorerEntries,
  rankPublicTestMatches,
  searchPublicTestEntries,
  buildPublicStarterBattery,
} from '../lib/assessments/test-explorer.js'

test('Love search finds real relationship assessments despite an unrelated selected topic', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const oldTopicMatches = filterExplorerEntries(entries, { availability: 'available', focus: ['sleep'] })
    assert.ok(!oldTopicMatches.some((entry) => entry.key === 'hh-love-affection'), 'previous search was limited to prefiltered topics')

    const searchable = rankPublicTestMatches(
      filterExplorerEntries(entries, { availability: 'available', kinds: [], maxMinutes: 0 }),
      { depth: 'balanced' },
    )

    for (const query of ['Love', 'love', 'ЛЮБОВЬ', 'amor']) {
      const results = searchPublicTestEntries(searchable, query)
      assert.ok(results.length >= 4, `${locale}/${query}: at least four relevant tests`)
      for (const key of ['hh-love-affection', 'hh-emotional-intimacy', 'hh-trust-dialogue']) {
        assert.ok(results.some((entry) => entry.key === key), `${locale}/${query}: ${key}`)
      }
      assert.ok(results.every((entry) => entry.selectable && entry.definition && entry.rightsStatus === 'cleared'))
      assert.ok(results.every((entry) => entry.topics.some((topic) => ['relationships', 'intimacy'].includes(topic))))
    }

    const directTitle = searchPublicTestEntries(searchable, locale === 'ru' ? 'Любовь' : 'Love')
    assert.equal(directTitle[0]?.key, 'hh-love-affection', 'a direct matching title should rank first')

    const professionalOnly = rankPublicTestMatches(
      filterExplorerEntries(entries, { availability: 'available', kinds: ['professional'] }),
      {},
    )
    assert.ok(!searchPublicTestEntries(professionalOnly, 'Love').some((entry) => entry.key === 'hh-love-affection'))

    const suggested = buildPublicStarterBattery(searchable)
    assert.ok(!suggested.some((entry) => entry.key === 'hh-love-affection'),
      'opt-in Love reflections must not silently enter the automatic starter battery')
  }
})

test('the first-screen search uses the separate available catalog without changing suggested sets', () => {
  const parent = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  const picker = readFileSync(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8')
  assert.match(parent, /filterExplorerEntries\(entries, \{[\s\S]*?availability: 'available',[\s\S]*?maxMinutes, language, tracking, freeOnly,/)
  assert.match(parent, /searchRecommendations=\{searchRecommendations\}/)
  assert.match(picker, /searchPublicTestEntries\(/)
  assert.match(picker, /groupViaRecommendations\(searchRecommendations, selectedKeys, showIndividualVia\)/)
  assert.match(picker, /\? searchPublicTestEntries\([\s\S]*?heroSearchTerm\)/)
  assert.match(picker, /onStartSingle\?\.\(entry\)/)
})
