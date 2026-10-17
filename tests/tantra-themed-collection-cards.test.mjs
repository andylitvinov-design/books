import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { availableTantraTestPaths } from '../lib/assessments/test-collections.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Tantra section explicitly explains that cards are themed test collections in EN/RU/ES', () => {
  const source = read('components/app/simple-test-picker.jsx')
  for (const fragment of [
    "THEMED TEST COLLECTIONS · TANTRA",
    "Tantra & intimacy: thematic test collections",
    "ТЕМАТИЧЕСКИЕ ПОДБОРКИ ТЕСТОВ · ТАНТРА",
    "Тантра и близость: тематические подборки тестов",
    "COLECCIONES TEMÁTICAS DE PRUEBAS · TANTRA",
  ]) assert.ok(source.includes(fragment), fragment)
})

test('every collection card has separate Details and Take test buttons with an accessible real-test disclosure', () => {
  const picker = read('components/app/simple-test-picker.jsx')
  const parent = read('components/app/test-explorer.jsx')
  const css = read('components/app/simple-test-picker.module.css')
  const section = picker.split('data-tantra-test-paths')[1]?.split('id="hh-simple-topic-title"')[0]
  assert.ok(section, 'thematic cards section is shown by existing topic selection')
  assert.match(section, /<article key=\{path\.id\} className=\{styles\.tantraPath\}/)
  assert.match(section, /data-tantra-action="details" aria-expanded=\{expanded\} aria-controls=\{detailId\}/)
  assert.match(section, /data-tantra-action="start" disabled=\{starting \|\| !onStartTantraPath\}/)
  assert.match(section, /onStartTantraPath\?\.\(path\.keys\)/)
  assert.match(section, /includedTests\.map\(\(entry\) => <li key=\{entry\.key\}>/)
  assert.match(section, /entry\.scaleGuide\.scales\.map\(\(scale\) => scale\.label\)/)
  assert.ok(section.indexOf('data-tantra-action="details"') < section.indexOf('data-tantra-action="start"'))
  assert.match(parent, /onStartTantraPath=\{startTantraPath\}/)
  assert.match(parent, /await onStart\(batch, preferences\)/)
  assert.match(parent, /entry\.rightsStatus === 'cleared' && entry\.definition/)
  assert.match(css, /\.tantraPathDetailsBody\[hidden\]\{display:none!important\}/)
  assert.match(css, /\.tantraPathActions\{grid-column:1\/-1;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})

test('visible thematic collections enumerate only existing startable cleared instruments', () => {
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
