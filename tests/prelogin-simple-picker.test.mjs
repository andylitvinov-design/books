import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { HOME_TEST_TOPICS } from '../lib/assessments/insights-categories.js'
import { buildPublicStarterBattery } from '../lib/assessments/test-explorer.js'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('the approved simple picker replaces the intimidating embedded explorer only before sign-in', () => {
  const page = read('app/[locale]/client/page.tsx')
  const cabinet = read('components/app/cabinet-landing.jsx')
  const wrapper = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')

  assert.match(page, /<CabinetLanding/)
  assert.match(cabinet, /<PublicTestExplorer locale=\{locale\} embedded onGuestStart=\{beginGuestBattery\} \/>/)
  assert.match(wrapper, /simpleMode=\{embedded\}/)
  assert.match(explorer, /if \(simpleMode && !browseFull\)/)
  assert.match(explorer, /return <SimpleTestPicker/)
  assert.match(explorer, /onBrowseFull=\{\(\) => \{/)
  assert.match(explorer, /setBrowseFull\(true\)/)
  assert.match(explorer, /simpleMode && browseFull/)
  assert.match(explorer, /className=\{styles\.simpleBack\}/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  assert.match(wrapper, /guestStartable\(entries\)/)
  assert.match(wrapper, /onGuestStart\(entries\)/)
})

test('topics immediately update the existing catalog while detailed selection stays closed', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const css = read('components/app/simple-test-picker.module.css')
  assert.match(picker, /<details className=\{styles\.advanced\} id="hh-more-test-filters">/)
  assert.doesNotMatch(picker, /open=\{true\}|open=\{advanced/)
  assert.match(picker, /focus\.includes\(key\)/)
  assert.match(picker, /onToggleFocus\(key\)/)
  assert.match(picker, /matchCount/)
  assert.match(explorer, /setFocus\(\(current\) => toggle\(current, key\)\)/)
  assert.match(explorer, /filterExplorerEntries\(entries, facets\)/)
  assert.match(explorer, /rankExplorerEntries\(filtered,/)
  assert.match(explorer, /depth=\{depth\}/)
  assert.match(explorer, /maxMinutes=\{maxMinutes\}/)
  assert.match(explorer, /testKinds=\{kinds\}/)
  assert.match(picker, /data-test-kind-checkbox/)
  assert.match(css, /\.advanced\[open\] \.chevron/)
  assert.match(picker, /TOPICS = \[\.\.\.HOME_TEST_TOPICS, \{ key: 'function', en: 'Work & daily life', ru: 'Работа и дела', es: 'Trabajo y vida' \},\s*(?:\/\/[^\n]*\n\s*)?\{ key: 'health', en: 'Health', ru: 'Здоровье', es: 'Salud' \}\]\s*\.map/)
  assert.deepEqual(HOME_TEST_TOPICS.map(({ key }) => key),
    ['stress','anxiety','mood','sleep','body','relationships','resources','attention'])
})

test('preview and selected time are derived from live executable test definitions', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  assert.match(explorer, /const autoBattery = useMemo\(\(\) => buildStarterBattery\(/)
  assert.match(explorer, /simpleSelectionChanged \? selected : simpleAuto/)
  assert.match(explorer, /const simpleRecommendations = useMemo/)
  assert.match(explorer, /buildPublicStarterBattery\(simpleRecommendations\)/)
  assert.match(explorer, /recommendations=\{simpleRecommendations\}/)
  // Explicit selections may span beyond the current topic. Verify the actual
  // recommendation declaration and its selected-aware candidate set.
  const recommendations = explorer.slice(explorer.indexOf('  const simpleRecommendations ='), explorer.indexOf('  // Only explicit duration/type options'))
  assert.match(recommendations, /\) : filtered\)\.filter\(\(entry\) => entry\.selectable\)/)
  assert.match(recommendations, /\), \[entries, filtered, activeCollection, activeCollectionId, selectionFocus, problems/)
  assert.match(explorer, /const filtered = useMemo\(\(\) => filterExplorerEntries\(entries, \{ \.\.\.facets, selectedKeys \}\)/)
  // Keeping an explicitly chosen card visible must not put opt-in, excluded
  // or unavailable cards into the automatic starter selection.
  const starter = { key: 'eligible-starter', selectable: true }
  assert.deepEqual(buildPublicStarterBattery([
    { key: 'explicit-only', selectable: true, explicitOptIn: true },
    { key: 'not-a-starter', selectable: true, starterEligible: false },
    { key: 'unavailable', selectable: false },
    starter,
  ]), [starter])
  assert.match(explorer, /onToggleTest=\{toggleSimpleSelected\}/)
  assert.match(explorer, /onResetSuggested=\{\(\) => \{ setSelectedKeys\(\[\]\); setSimpleSelectionChanged\(false\) \}\}/)
  assert.match(picker, /activeBattery\.reduce\(\(total, item\) => total \+ \(item\.durationMinutes \|\| 0\), 0\)/)
  assert.match(picker, /type="checkbox" checked=\{checked\}/)
  assert.match(picker, /<button type="button" className=\{styles\.cta\} disabled=\{!activeBattery\.length \|\| starting\} onClick=\{journeyMode === 'course' \? onStartCourse : onStart\}/)
  assert.match(picker, /data-test-start-mode=\{journeyMode\}/)
  assert.match(picker, /const journeyMode = initialMode === 'course' && onStartCourse \? 'course' : 'tests'/)
  assert.doesNotMatch(picker, /data-test-course-switch|data-guest-start-notice|startNotice:/)
  assert.match(picker, /entry\.description \|\| entry\.category/)
  assert.doesNotMatch(picker, /\b4 tests selected\b|\b30 min total\b|\b38%\b/)
})

test('localized public page starts guest tests without OAuth or premature result upload', () => {
  const page = read('app/[locale]/client/page.tsx')
  const explorer = read('components/app/test-explorer.jsx')
  const wrapper = read('components/app/public-test-explorer.jsx')
  assert.match(page, /title: "Free wellbeing monitoring \| Holistic House"/)
  assert.match(page, /title: "Бесплатный мониторинг состояния \| Holistic House"/)
  assert.match(explorer, /simpleSelectionChanged/)
  assert.match(wrapper, /client\?startTests=/)
  assert.doesNotMatch(wrapper, /auth\/start|results\/import|PENDING_TEST_SELECTION_KEY/)
})

test('topic extension contract rejects a removed or renamed Health/function facet', () => {
  const picker=read('components/app/simple-test-picker.jsx')
  const contract=/TOPICS = \[\.\.\.HOME_TEST_TOPICS, \{ key: 'function', en: 'Work & daily life', ru: 'Работа и дела', es: 'Trabajo y vida' \},\s*(?:\/\/[^\n]*\n\s*)?\{ key: 'health', en: 'Health', ru: 'Здоровье', es: 'Salud' \}\]\s*\.map/
  assert.match(picker,contract)
  for(const from of ["key: 'health'", "key: 'function'"]) {
    const mutated=picker.replace(from,"key: 'wrong-facet'")
    assert.notEqual(mutated,picker)
    assert.doesNotMatch(mutated,contract)
  }
})
