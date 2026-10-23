import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { TOPIC_JOURNEYS, getTopicJourney, normalizeJourneyFocus, journeyFocusForTopics } from '../lib/assessments/topic-journeys.js'
import { TEST_RECOMMENDATION_FOCUS } from '../lib/assessments/test-recommendations.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

test('five bilingual directions and real, supported test focus keys', () => {
  assert.deepEqual(TOPIC_JOURNEYS.map(({id}) => id), ['relationships','business','stress','energy','effectiveness'])
  const allowed = new Set(TEST_RECOMMENDATION_FOCUS.map(({key}) => key))
  for (const journey of TOPIC_JOURNEYS) {
    assert.ok(journey.title.en && journey.title.ru && journey.introduction.en && journey.introduction.ru)
    assert.ok(['stress','confidence','focus'].includes(journey.courseProgram))
    assert.ok(journey.topics.length >= 3)
    assert.equal(getTopicJourney(journey.id)?.id, journey.id)
    for (const topic of journey.topics) {
      assert.ok(topic.title.en && topic.title.ru)
      assert.ok(topic.focus.every((key) => allowed.has(key)), topic.id)
    }
    assert.ok(journey.focus.every((key) => allowed.has(key)), journey.id)
  }
  assert.equal(getTopicJourney('__not-a-theme__'), null)
})

test('topic choices narrow to actual compatible startable questionnaires in RU and EN', () => {
  for (const locale of ['en','ru']) {
    const entries = buildExplorerEntries({locale,audience:'account'})
    for (const journey of TOPIC_JOURNEYS) {
      for (const topic of journey.topics) {
        const focus = journeyFocusForTopics(journey,[topic.id])
        assert.ok(focus.length > 0, journey.id + '/' + topic.id)
        assert.ok(focus.every((key) => normalizeJourneyFocus(key).length),journey.id)
        const found = filterExplorerEntries(entries,{focus,availability:'available'})
        assert.ok(found.some((entry) => entry.selectable), journey.id + '/' + topic.id + '/' + locale)
      }
      assert.deepEqual(journeyFocusForTopics(journey,[]),journey.focus)
    }
  }
})

test('public filter input ignores unknown / overlong keys and does not accept answers or arbitrary data', () => {
  assert.deepEqual(normalizeJourneyFocus('stress,anxiety,stress,unknown'),['stress','anxiety'])
  assert.deepEqual(normalizeJourneyFocus('st'.repeat(101)),[])
  assert.deepEqual(normalizeJourneyFocus(null),[])
  assert.deepEqual(journeyFocusForTopics(getTopicJourney('relationships'),['trust']),['relationships','intimacy'])
  assert.deepEqual(journeyFocusForTopics(getTopicJourney('business'),['productivity']),['attention','clarity'])
})

test('marketing → topic → prefiltered simple test explorer → course or free written review is wired', async () => {
  const home = await readFile('components/holistic-house-home.tsx','utf8')
  const tiles = await readFile('components/homepage-topic-journeys.tsx','utf8')
  const chooser = await readFile('components/topic-journey-selector.tsx','utf8')
  const route = await readFile('app/[locale]/client/tests/page.tsx','utf8')
  const explorer = await readFile('components/app/public-test-explorer.jsx','utf8')
  const oldRoute = await readFile('app/[locale]/relationships/page.tsx','utf8')
  const auth = await readFile('app/api/app/[...path]/route.js','utf8')
  const account = await readFile('components/app/app-workspace.jsx','utf8')
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/);
  const more = await readFile('components/home-more-disclosure.tsx', 'utf8')
  assert.match(more, /<HomepageTopicJourneys locale=\{locale\}/)
  assert.match(tiles,/explore\/\$\{journey\.id\}/)
  assert.match(chooser,/data-topic-action="tests"/)
  assert.match(chooser,/data-topic-action="course"/)
  assert.match(chooser,/data-topic-action="review"/)
  assert.match(chooser,/client\/tests\?focus=/)
  assert.match(chooser,/services\/free-situation-review/)
  assert.match(chooser,/written reply|письменный разбор/)
  assert.match(route,/normalizeJourneyFocus/)
  assert.match(route,/initialPreferences=\{initialPreferences\}/)
  assert.match(route,/locale=\{locale\} embedded initialPreferences=\{initialPreferences\}/)
  assert.match(explorer,/simpleMode=\{embedded\}/)
  assert.match(explorer,/initialPreferences=\{initialPreferences\}/)
  assert.match(oldRoute,/redirect\(\x60\/\$\{locale\}\/explore\/relationships\x60\)/)
  assert.match(auth,/continueTo === 'course'/)
  assert.match(auth,/program \? \x60\?program=/)
  assert.match(account,/continueTo: 'course'/)
})

test('mobile layouts use one-column cards, bounded widths and a responsive simple picker', async () => {
  const home = await readFile('components/homepage-topic-journeys.module.css','utf8')
  const chooser = await readFile('components/topic-journey-selector.module.css','utf8')
  const picker = await readFile('components/app/simple-test-picker.module.css','utf8')
  assert.match(home, /@media\(max-width:720px\)/)
  assert.match(home, /grid-template-columns:1fr/)
  assert.match(chooser, /@media\(max-width:630px\)/)
  assert.match(chooser, /grid-template-columns:1fr/)
  assert.match(chooser, /min-width:0/)
  assert.match(picker, /@media\(max-width:600px\)/)
  assert.match(picker, /width:calc\(100% - 18px\)/)
})
