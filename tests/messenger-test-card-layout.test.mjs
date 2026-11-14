import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/app/messenger-test-journey.jsx')
const styles = read('components/app/messenger-test-journey.module.css')
const chat = read('components/holistic-agent-chat.tsx')

test('Every eligible catalogue row has photo, real question count, description and action', () => {
  assert.match(source, /data-hh-test-card=/)
  assert.match(source, /<img src=\{testPortrait\(item, focus\)\}/)
  assert.match(source, /Number\.isFinite\(item\?\.questionCount\)/)
  assert.match(source, /<p className=\{css\.testDescription\}>\{description \|\| t\.genericDescription\}<\/p>/)
  assert.match(source, /className=\{css\.testAction\}/)
  assert.match(styles, /grid-template-columns:78px minmax\(0,1fr\)/)
  assert.match(styles, /\.testAction\{[^}]*min-height:44px/)
  assert.doesNotMatch(styles, /max-height:210px;overflow-y:auto/)
  for (const path of ['support-mock-portrait.webp','reiki-approved-sunrise-v3.webp','report-lighthouse-coast.webp','course-start-heron.webp'])
    assert.ok(source.includes(path),path)
})

test('Catalogue is immediately visible, with genuine kind facets, search and bounded pagination', () => {
  assert.match(source, /data-hh-test-kind-filters/)
  assert.match(source, /TEST_KINDS\.map\(kind => kind\.key\)/)
  assert.match(source, /testKindFor\(\{/)
  assert.match(source, /HOBBY_TEST_KEYS\.filter/)
  assert.match(source, /aria-pressed=\{testFilter===kind\}/)
  assert.match(source, /\{filtered\.slice\(0,visibleCount\)\.map/)
  assert.match(source, /const \[visibleCount, setVisibleCount\] = useState\(3\)/)
  assert.match(source, /setVisibleCount\(count=>count\+4\)/)
  assert.match(source, /data-hh-test-catalog/)
  assert.match(source, /input type="search"/)
  assert.match(source, /setTestFilter\('all'\);setSearch\(''\)/)
  assert.doesNotMatch(source, /setExpanded\(|!expanded|aria-expanded=\{expanded\}/)
  assert.match(source, /href=\{'\/' \+ locale \+ '\/tests'\}/)
  for (const word of ['Анкеты','Типологии','Check-ins','Cuestionarios','Pro'])
    assert.ok(source.includes(word),word)
})

test('Topic selection reduces only the rendered transcript to the latest two turns', () => {
  assert.match(chat, /const testReply=locale==="ru"/)
  assert.match(chat, /\{role:"assistant" as const,text:testReply\}/)
  assert.match(chat, /testChatOpen&&messengerView\?messages\.slice\(-2\):messages/)
  assert.match(chat, /firstTurn=thread\.querySelector/)
  assert.match(chat, /thread\.scrollTop=target/)
  assert.match(chat, /followTail\.current=false/)
  assert.match(chat, /!testChatOpen&&<a className=\{styles\.testLink\}/)
  assert.match(chat, /onAdvance=\{\(\)=>\{followTail\.current=true/)
  assert.match(chat, /setTestChatOpen\(false\)/)
  // Keep canonical private history and protected completion, not a parallel chat.
  assert.match(chat, /usePrivateChatHistory/)
  assert.match(chat, /<MessengerTestJourney/)
})

test('Existing consent, source language, recovery, safety and scoring remain in the real flow', () => {
  for (const marker of [
    "guest/bootstrap", "guest/session", "guest/runs", "guest/runs/' + run.id + '/save",
    "guest/runs/' + run.id + '/submit", "guest/runs/' + run.id + '/discard",
    "hasTraumaAdministration(definition)", "safetySignal(definition, run.answers || {})",
    "checked={adult}", "disabled={!adult || busy}", "definition.instrumentLocale !== locale",
    "definition.instructions", "incomingTurn", 'role="progressbar"',
  ]) assert.ok(source.includes(marker),marker)
  for (const localized of ['Незавершённый тест','Your unfinished test','Test pendiente',
    'Пройти тест','Take test','Hacer test','Вся библиотека','Full library','Biblioteca completa'])
    assert.ok(source.includes(localized),localized)
})
