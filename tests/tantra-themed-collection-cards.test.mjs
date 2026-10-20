import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { availableTantraTestPaths, availableTestCollections } from '../lib/assessments/test-collections.js'
import { testCollectionAffinity } from '../lib/assessments/test-collection-membership.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Tantra and sexuality open the ONE standardized recommendation card list', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const parent = read('components/app/test-explorer.jsx')
  const css = read('components/app/simple-test-picker.module.css')
  assert.match(picker, /Test collections by topic/)
  assert.match(picker, /Подборки тестов по темам/)
  assert.match(picker, /Colecciones de pruebas por tema/)
  assert.match(picker, /onChooseCollection\?\.\(active \? null : collection\.id\)/)
  assert.match(picker, /getElementById\('hh-simple-recommendations'\)/)
  assert.match(picker, /data-test-match=\{entry\.key\}/)
  assert.match(picker, /data-test-collection-marker/)
  assert.match(picker, /className=\{styles\.testDetailsButton\}/)
  assert.match(picker, /className=\{styles\.takeTest\}/)
  assert.doesNotMatch(picker, /data-tantra-test-paths|TANTRA_PATH_COPY|tantraPathActions/)
  assert.match(parent, /activeCollectionId=\{activeCollectionId\}/)
  assert.match(parent, /collectionId: activeCollectionId/)
  assert.match(css, /\.collectionHighlight/)
  assert.match(css, /\.collectionMarker/)
})

test('Tantra and sexuality collections contain genuine available opt-in instruments', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const collections = availableTestCollections(entries)
    for (const [id, example] of [['tantra', 'hh-tantra-presence'],
      ['sexuality', 'hh-sexual-self-kindness'],
      ['relationships', 'hh-love-affection']]) {
      const collection = collections.find((item) => item.id === id)
      const entry = entries.find((item) => item.key === example)
      assert.ok(collection?.count > 0, id)
      assert.ok(entry?.selectable && entry?.rightsStatus === 'cleared', example)
      assert.ok(testCollectionAffinity(entry, id) > 0, example)
    }
  }
})

test('legacy named paths remain valid as catalog data, but no longer render duplicate cards', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const paths = availableTantraTestPaths(entries)
    assert.ok(paths.length >= 4, locale)
    for (const path of paths) {
      const instruments = path.keys.map((key) => entries.find((entry) => entry.key === key))
      assert.equal(instruments.length, path.testCount, path.id)
      assert.ok(instruments.every((entry) => entry?.selectable && entry.startable && entry.definition && entry.rightsStatus === 'cleared'), path.id)
      assert.equal(path.questionCount, instruments.reduce((sum, entry) => sum + (entry.questionCount || 0), 0))
    }
  }
})
