import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/app/messenger-test-journey.jsx')
const styles = read('components/app/messenger-test-journey.module.css')

test('AI chat shows only one photographic test offer or saved draft by default', () => {
  assert.match(source, /!expanded && \(restorable \?/)
  assert.match(source, /restorableEntry\?\.item/)
  assert.match(source, /featured\.item/)
  assert.match(source, /data-hh-test-card=/)
  assert.match(source, /<img src=\{testPortrait\(item, focus\)\}/)
  assert.match(source, /className=\{css\.testAction\}/)
  for (const path of ['support-mock-portrait.webp','reiki-approved-sunrise-v3.webp','report-lighthouse-coast.webp','course-start-heron.webp'])
    assert.ok(source.includes(path),path)
  assert.match(styles, /grid-template-columns:78px minmax\(0,1fr\)/)
  assert.match(styles, /\.testAction\{[^}]*min-height:44px/)
  assert.doesNotMatch(styles, /max-height:210px;overflow-y:auto/)
})

test('Full test catalogue only opens on explicit action, in bounded pages', () => {
  assert.match(source, /aria-expanded=\{expanded\} aria-controls="hh-messenger-test-catalog"/)
  assert.match(source, /\{expanded && <div id="hh-messenger-test-catalog"/)
  assert.match(source, /filtered\.slice\(0,visibleCount\)/)
  assert.match(source, /setVisibleCount\(count=>count\+4\)/)
  assert.match(source, /setExpanded\(false\);setSearch\(''\);setVisibleCount\(4\)/)
  assert.match(styles, /\.tests\{max-height:none;overflow:visible\}/)
})

test('Real guest-run, consent, safety and original-language contract stay intact', () => {
  for (const marker of [
    "guest/bootstrap", "guest/session", "guest/runs", "guest/runs/' + run.id + '/save",
    "guest/runs/' + run.id + '/submit", "guest/runs/' + run.id + '/discard",
    "hasTraumaAdministration(definition)", "safetySignal(definition, run.answers || {})",
    "checked={adult}", "disabled={!adult || busy}", "definition.instrumentLocale !== locale",
    "definition.instructions", "incomingTurn", "role=\"progressbar\"",
  ]) assert.ok(source.includes(marker),marker)
  for (const localized of ['Незавершённый тест','Your unfinished test','Test pendiente',
    'Пройти тест','Take test','Hacer test','Другие тесты','Explore other tests','Explorar otros tests'])
    assert.ok(source.includes(localized),localized)
})
