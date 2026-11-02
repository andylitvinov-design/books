import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, estimatedTestMatchPercent, buildPublicStarterBattery,
} from '../lib/assessments/test-explorer.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('pre-login recommendations are real executable, rights-cleared tests ranked by estimated match percent', () => {
  const entries = buildExplorerEntries({ locale:'en', audience:'guest' })
  const matches = filterExplorerEntries(entries, { availability:'available' })
  const ranked = rankPublicTestMatches(matches, { focus:[], depth:'balanced' })
  assert.ok(ranked.length >= 15, 'enough eligible recommendations for 5+5+5 inline paging')
  assert.equal(ranked.length, matches.filter(entry=>entry.explicitOptIn !== true).length)
  assert.equal(new Set(ranked.map((entry) => entry.key)).size, ranked.length)
  for (let i = 0; i < ranked.length; i++) {
    const entry = ranked[i]
    assert.ok(entry.selectable, entry.key)
    assert.ok(entry.definition && entry.startable, entry.key)
    assert.equal(entry.rightsStatus, 'cleared', entry.key)
    assert.ok(Number.isInteger(entry.matchPercent) && entry.matchPercent >= 0 && entry.matchPercent <= 99, entry.key)
    if (i) assert.ok(ranked[i - 1].matchPercent >= entry.matchPercent, 'recommendations must be sorted by displayed percentage')
  }
  const topFive = ranked.slice(0,5)
  assert.equal(topFive.length,5)
  const chosen = buildPublicStarterBattery(ranked)
  assert.equal(chosen.length,3)
  assert.equal(new Set(chosen.map((entry) => entry.key)).size,3)
})

test('selected topics and optional depth change the ranked fit score but do not fabricate individual health scores', () => {
  const entries = buildExplorerEntries({ locale:'en', audience:'guest' })
  const stress = filterExplorerEntries(entries, { availability:'available', focus:['stress'] })
  assert.ok(stress.length > 5)
  const rankedStress = rankPublicTestMatches(stress, { focus:['stress'], depth:'balanced' })
  assert.ok(rankedStress.length > 5)
  assert.equal(rankedStress[0].matchPercent, estimatedTestMatchPercent(rankedStress[0], {focus:['stress'], depth:'balanced'}))
  const general = rankPublicTestMatches(stress, { depth:'balanced' })
  assert.ok(rankedStress.some((entry, i) => entry.matchPercent !== general.find((candidate) => candidate.key === entry.key)?.matchPercent), 'topic selection should change displayed %')
  const quick = rankPublicTestMatches(stress, { focus:['stress'], depth:'quick' })
  assert.ok(quick.some((entry) => entry.matchPercent !== rankedStress.find((candidate) => candidate.key === entry.key)?.matchPercent), 'depth should change %')
  const selectedKey = rankedStress.at(-1).key
  const withSelected = rankPublicTestMatches(stress, { focus:['stress'], depth:'balanced', selectedKeys:[selectedKey] })
  assert.deepEqual(rankedStress.map((entry) => entry.key), withSelected.map((entry) => entry.key), 'checking boxes cannot reshuffle recommendations')
  assert.deepEqual(rankedStress.map((entry) => entry.matchPercent), withSelected.map((entry) => entry.matchPercent), 'checking boxes cannot alter fit %')
  const withLimitedTime = filterExplorerEntries(entries, { availability:'available', focus:['stress'], maxMinutes:5, styles:['professional'] })
  assert.ok(withLimitedTime.length>0)
  assert.ok(withLimitedTime.every((entry) => entry.durationMinutes <= 5 && entry.testStyle === 'professional'))
  assert.equal(estimatedTestMatchPercent({selectable:false,analysisAxes:[]},{focus:['stress']}),null)
})

test('public picker shows 5 cards, selects eligible starters and adds exactly 5 inline', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/simple-test-picker.module.css')
  assert.match(picker, /useState\(5\)/)
  assert.match(picker, /browseRecommendations\.slice\(0, visibleCount\)/)
  assert.match(picker, /Math\.min\(5, remainingCount\)/)
  assert.match(picker, /setVisibleCount\(\(current\) => Math\.min\(browseRecommendations\.length, current \+ 5\)\)/)
  assert.match(picker, /id="hh-public-recommended-tests"/)
  assert.match(picker, /data-test-match=\{entry\.key\}/)
  assert.match(picker, /data-relevance=\{entry\.matchPercent\}/)
  assert.match(picker, /styles\.matchBadge/)
  assert.match(picker, /<details className=\{styles\.advanced\} id="hh-more-test-filters">/)
  assert.match(explorer, /const simpleAuto = useMemo\(\(\) => buildPublicStarterBattery\(simpleRecommendations\)/)
  assert.match(explorer, /simpleSelectionChanged \? selected : simpleAuto/)
  assert.match(explorer, /const simpleRecommendationPool = useMemo/)
  assert.match(explorer, /availability: 'available', styles: stylesFilter, kinds, lengths/)
  assert.match(explorer, /focus: selectionFocus, problems,/)
  assert.match(explorer, /const searchRecommendations = simpleRecommendations/)
  assert.match(explorer, /setSelectedKeys\(simpleAuto\.map\(\(entry\) => entry\.key\)\)/)
  assert.match(styles, /\.showFiveMore/)
  assert.match(styles, /\.matchBadge/)
  assert.match(picker, /not a clinical probability/)
  assert.match(picker, /Start free monitoring/)
})


test('automatic public sets exclude every opt-in instrument with empty, resource and short self-support filters', () => {
  for (const locale of ['en','ru']) for (const audience of ['guest','account']) {
    const entries=buildExplorerEntries({locale,audience})
    for (const preferences of [
      {}, {focus:[]}, {focus:['resources']}, {details:['self-support'],maxMinutes:2},
      {focus:['resources'],details:['self-support'],maxMinutes:2},
      {depth:'deep'}, {styles:['professional'],maxMinutes:5},
    ]) {
      const matching=filterExplorerEntries(entries,preferences)
      const ranked=rankPublicTestMatches(matching,preferences)
      const automatic=buildPublicStarterBattery(ranked)
      assert.ok(automatic.length>0 && automatic.length<=3)
      for (const entry of automatic) {
        assert.ok(entry.selectable && entry.definition && entry.rightsStatus==='cleared')
        assert.notEqual(entry.catalog.starterEligible,false,entry.key)
        assert.ok(!entry.key.startsWith('hh-love-')&&!entry.key.startsWith('hh-trust-')&&!entry.topics.includes('intimacy')&&!entry.topics.includes('sexuality')&&!entry.topics.includes('tantra'),entry.key)
        if(preferences.maxMinutes)assert.ok(entry.durationMinutes<=preferences.maxMinutes)
        if(preferences.styles)assert.equal(entry.testStyle,'professional')
      }
    }
  }
})

test('explicit relationship topics expose opt-in forms and manual selections survive a later filter change', () => {
  for(const locale of ['en','ru']) {
    const entries=buildExplorerEntries({locale,audience:'account'})
    for(const [focus,key] of [['relationships','hh-love-affection'],['sexuality','hh-sexual-self-kindness'],['tantra','hh-tantra-presence']]) {
      const matching=filterExplorerEntries(entries,{focus:[focus]})
      const ranked=rankPublicTestMatches(matching,{focus:[focus]})
      assert.ok(ranked.some(entry=>entry.key===key&&entry.selectable),key)
      assert.ok(!buildPublicStarterBattery(ranked).some(entry=>entry.key===key),key)
      const savedKeys=Object.freeze([key])
      const filtered=filterExplorerEntries(entries,{focus:['sleep'],styles:['professional'],selectedKeys:savedKeys})
      assert.ok(filtered.some(entry=>entry.key===key&&entry.selectable))
      buildPublicStarterBattery(ranked)
      assert.deepEqual(savedKeys,[key], 'automatic suggestions never overwrite a deliberate choice')
    }
  }
})

test('public starter selection never reinstates unavailable entries or fills from an excluded-only list', () => {
  const entries=buildExplorerEntries({locale:'en',audience:'account'})
  const love=entries.find(entry=>entry.key==='hh-love-affection')
  const weekly=entries.find(entry=>entry.key==='hh-weekly-pulse')
  assert.deepEqual(buildPublicStarterBattery([love]),[])
  assert.deepEqual(buildPublicStarterBattery([{...weekly,selectable:false},love]),[])
  assert.deepEqual(buildPublicStarterBattery([love,weekly]).map(entry=>entry.key),['hh-weekly-pulse'])
})
