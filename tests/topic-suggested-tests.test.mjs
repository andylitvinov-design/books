import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TOPIC_JOURNEYS } from '../lib/assessments/topic-journeys.js'
import { buildTopicTestSuggestions } from '../lib/assessments/topic-test-suggestions.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { makeTestSelectionIntent, readTestSelectionIntent } from '../lib/app/test-selection-intent.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('each direction offers exactly two distinct, startable, rights-cleared assessments in EN/RU', () => {
  for (const locale of ['ru', 'en']) {
    const catalog = new Map(buildExplorerEntries({locale,audience:'account'}).map(item => [item.key,item]))
    for (const journey of TOPIC_JOURNEYS) {
      const suggestions = buildTopicTestSuggestions(journey,locale)
      for (const selected of ['',journey.topics[0].id, journey.topics[2].id]) {
        const selectedKey = selected ? selected : ''
        const two = suggestions[selectedKey]
        assert.equal(two?.length, 2, locale + '/' + journey.id + '/' + selectedKey)
        assert.equal(new Set(two.map(item=>item.key)).size, 2)
        for (const item of two) {
          const original = catalog.get(item.key)
          assert.ok(original?.selectable, item.key)
          assert.equal(original.rightsStatus, 'cleared')
          assert.notEqual(original.starterEligible, false)
          assert.ok(original.definition, 'No executable definition for ' + item.key)
          assert.equal(item.definition.key, original.definition.key)
          assert.ok(item.title)
        }
        const intent = makeTestSelectionIntent(two.map(item=>item.key), 1792000000000)
        assert.deepEqual(readTestSelectionIntent(intent,1792000001000)?.keys,two.map(item=>item.key))
      }
    }
  }
})

test('new design keeps the existing catalog and Google consent flow', () => {
  const home = read('components/homepage-topic-journeys.tsx')
  const homeStyles = read('components/homepage-topic-journeys.module.css')
  const selector = read('components/topic-journey-selector.tsx')
  const styles = read('components/topic-journey-selector.module.css')
  const page = read('app/[locale]/explore/[theme]/page.tsx')
  const explorer = read('app/[locale]/client/tests/page.tsx')
  assert.match(home, /<Image /)
  assert.match(home, /unoptimized/)
  assert.match(homeStyles, /\.photo img/)
  assert.match(homeStyles, /\.action\{/)
  assert.match(page,/buildTopicTestSuggestions\(journey, locale\)/)
  assert.match(selector, /<details className=\{styles\.test\}/)
  assert.match(selector, /data-recommended-test=\{item\.key\}/)
  assert.match(selector, /data-topic-action="tests"/)
  assert.match(selector, /data-topic-action="browse"/)
  assert.match(selector, /PENDING_TEST_SELECTION_KEY/)
  assert.match(selector, /appendActive: true/)
  assert.match(selector, /services\/free-situation-review/)
  assert.match(selector, /mode=course/)
  assert.match(explorer, /catalog === 'full'/)
  assert.match(styles, /@media\(max-width:630px\)/)
  assert.match(styles, /\.primaryAction\{/)
})
