import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { availableTestCollections, TEST_TOPIC_COLLECTIONS } from '../lib/assessments/test-collections.js'
import { testCollectionAffinity, testCollectionIds } from '../lib/assessments/test-collection-membership.js'
import { problemsForTopics, relevanceForSelectedProblems } from '../lib/assessments/test-problems.js'
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
      const matching = filterExplorerEntries(entries, { availability: 'available' })
        .filter((entry) => testCollectionAffinity(entry, item.id) > 0)
      assert.equal(item.count, matching.length, item.id)
      assert.ok(item.count > 0, item.id)
      assert.ok(matching.every((entry) =>
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

test('collection suggestions appear after detailed filters and before test recommendations', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const parent = read('components/app/test-explorer.jsx')
  const css = read('components/app/simple-test-picker.module.css')
  const afterHero = picker.indexOf('data-test-topic-collections')
  assert.ok(afterHero > picker.indexOf('</header>'))
  const afterTopics = picker.indexOf('id="hh-simple-topic-title"')
  const afterConcerns = picker.indexOf('id="hh-simple-problems-title"')
  const afterDetails = picker.indexOf('<details className={styles.advanced} id="hh-more-test-filters">')
  const recommendations = picker.indexOf('id="hh-simple-recommendations-title"')
  assert.ok(afterTopics < afterConcerns && afterConcerns < afterDetails)
  assert.ok(afterHero > afterDetails && afterHero < recommendations)
  assert.doesNotMatch(picker, /data-tantra-test-paths/, 'legacy Tantra panel must not intercept the standard list')
  assert.match(picker, /availableTestCollections\(catalogEntries, \{ focus, problems, kinds: testKinds, maxMinutes, depth \}\)/)
  assert.match(picker, /data-test-collection=\{collection\.id\}/)
  assert.match(picker, /onChooseCollection\?\.\(active \? null : collection\.id\)/)
  assert.match(picker, /aria-expanded=\{collectionsOpen\}/)
  assert.match(picker, /setCollectionsOpen\(\(value\) => !value\)/)
  assert.match(picker, /hh-simple-recommendations/)
  assert.match(parent, /catalogEntries=\{entries\}/)
  assert.match(parent, /onChooseCollection=\{\(id\) => \{/)
  assert.match(parent, /setActiveCollectionId\(id\)/)
  const collectionHandler = parent.split('onChooseCollection={(id) => {')[1]?.split('viaProfileEntry=')[0]
  assert.ok(collectionHandler)
  assert.doesNotMatch(collectionHandler, /setKinds\(\[\]\)|setMaxMinutes\(0\)|setDepth\('balanced'\)|setFocus\(/)
  assert.match(parent, /const simpleRecommendationPool = useMemo/)
  assert.match(parent, /availability: 'available', styles: stylesFilter, kinds, lengths, areas, details,/)
  assert.match(parent, /focus: selectionFocus, problems,/)
  assert.match(parent, /normalizeProblemsForTopics\(\[key\], selectionFocus\)/)
  assert.match(parent, /const searchRecommendations = simpleRecommendations/)
  assert.doesNotMatch(parent, /onToggleFocus=\{\(key\) => \{ setActiveCollectionId\(null\)/)
  assert.match(picker, /const concernFocus = activeCollection/)
  assert.match(picker, /orderedCollections\.map\(\(collection\) =>/)
  assert.match(picker, /collections\.length > 2/)
  assert.match(picker, /data-test-collection-marker/)
  assert.match(css, /\.collectionMarker/)
  assert.match(css, /\.curatedCard:nth-child\(n\+3\)\s*\{\s*display:\s*none;/)
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.doesNotMatch(css, /\.curatedCard:nth-child\(n\+5\)\s*\{\s*display:\s*none;/)
  assert.match(css, /\.curated\[data-expanded="true"\] \.curatedCard\s*\{\s*display:\s*flex;/)
  assert.match(picker, /Подборки тестов по темам/)
  assert.match(picker, /Test collections by topic \(optional\)/)
  assert.match(picker, /Подборки тестов по темам \(необязательно\)/)
  assert.match(picker, /Colecciones de pruebas por tema \(opcional\)/)
})

test('collection counts and ordering reflect prior topic, concern, time and type choices', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  assert.equal(availableTestCollections(entries, { focus: ['sleep'] })[0].id, 'sleep')
  assert.equal(availableTestCollections(entries, { focus: ['relationships'] })[0].id, 'relationships')
  const selections = { focus: ['stress'], problems: ['work-overload'], kinds: ['monitoring'], maxMinutes: 5, depth: 'quick' }
  const refined = availableTestCollections(entries, selections)
  assert.ok(refined.length > 0 && refined.every((item) => item.count > 0))
  for (const collection of refined) {
    const expected = filterExplorerEntries(entries, { availability: 'available',
      kinds: selections.kinds, maxMinutes: selections.maxMinutes })
      .filter((entry) => testCollectionAffinity(entry, collection.id) > 0)
    assert.equal(collection.count, expected.length, collection.id)
    assert.ok(expected.every((entry) => entry.durationMinutes <= 5 && entry.testKind === 'monitoring'))
  }
  const fullCounts = new Map(availableTestCollections(entries).map((item) => [item.id, item.count]))
  assert.ok(refined.some((item) => item.count < fullCounts.get(item.id)))
})


test('collection membership and boosted ranking use real test topics, without excluding other tests', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const eligible = filterExplorerEntries(entries, { availability: 'available' })
  const love = eligible.find((entry) => entry.key === 'hh-love-affection')
  assert.ok(love?.selectable)
  assert.ok(testCollectionIds(love).includes('relationships'))
  assert.ok(testCollectionAffinity(love, 'relationships') > 0)
  const baseline = rankPublicTestMatches(eligible, { focus: ['relationships'] })
  const boosted = rankPublicTestMatches(eligible, {
    focus: ['relationships'], collectionId: 'relationships',
    collectionFocus: ['relationships', 'intimacy'],
  })
  const inBaseline = baseline.find((entry) => entry.key === love.key)
  const inBoosted = boosted.find((entry) => entry.key === love.key)
  assert.ok(inBaseline && inBoosted)
  assert.ok(inBoosted.matchPercent >= inBaseline.matchPercent,
    'collection selection cannot reduce matching test relevance')
  assert.ok(baseline.some((entry) => testCollectionAffinity(entry, 'relationships') > 0 &&
    entry.matchPercent < 99 &&
    boosted.find((candidate) => candidate.key === entry.key)?.matchPercent > entry.matchPercent),
    'explicit collection selection increases relevant scores when they are not capped')
  assert.ok(boosted.some((entry) => testCollectionAffinity(entry, 'relationships') === 0),
    'unrelated tests remain in the standard list')
  assert.ok(boosted.every((entry, i) =>
    i === 0 || boosted[i - 1].matchPercent >= entry.matchPercent),
    'order matches the visible percentage')
  const nonMember = boosted.find((entry) => testCollectionAffinity(entry, 'relationships') === 0)
  assert.ok(nonMember)
  assert.equal(nonMember.matchPercent,
    baseline.find((entry) => entry.key === nonMember.key)?.matchPercent,
    'collection boosts do not alter unrelated results')
})

test('the combined preference model keeps hard type/time filters and rewards real concern overlap', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const eligible = filterExplorerEntries(entries, { availability: 'available' })
  const chosenTopics = ['stress', 'anxiety']
  const concernAndTest = problemsForTopics(chosenTopics).flatMap((concern) =>
    eligible.filter((entry) => entry.scaleGuide && relevanceForSelectedProblems(entry, [concern.key]) > 0)
      .map((entry) => ({ concern: concern.key, entry }))).find(({ entry }) =>
        rankPublicTestMatches([entry], { focus: chosenTopics })[0]?.matchPercent < 99)
  assert.ok(concernAndTest, 'at least one actionable stress concern has a measurable, runnable test')
  const { concern, entry } = concernAndTest
  const baseline = rankPublicTestMatches([entry], { focus: chosenTopics })[0]
  const withConcern = rankPublicTestMatches([entry], { focus: chosenTopics, problems: [concern] })[0]
  assert.ok(withConcern.matchPercent > baseline.matchPercent,
    'a user-selected relevant concern must materially affect test fit')

  const restricted = filterExplorerEntries(entries, {
    availability: 'available', kinds: ['professional'], maxMinutes: 5,
  })
  assert.ok(restricted.length > 0)
  const recommendations = rankPublicTestMatches(restricted, {
    focus: chosenTopics, problems: [concern], collectionId: 'stress',
    collectionFocus: ['stress', 'anxiety'],
  })
  assert.ok(recommendations.length > 0)
  assert.ok(recommendations.every((item) => item.testKind === 'professional' && item.durationMinutes <= 5))
  assert.deepEqual(new Set(recommendations.map((item) => item.key)).size, recommendations.length)
})
