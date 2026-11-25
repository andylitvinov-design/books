import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const journey = read('components/app/messenger-test-journey.jsx')
const css = read('components/app/messenger-test-journey.module.css')

test('finishing a test congratulates the user and offers a single prominent result CTA in all languages', () => {
  for (const copy of ['Поздравляем! 🎉', 'Congratulations! 🎉', '¡Felicidades! 🎉',
    'Посмотреть результат', 'View result', 'Ver resultado']) assert.ok(journey.includes(copy), copy)
  assert.match(journey, /data-hh-test-block="test_complete"/)
  assert.match(journey, /className=\{css\.completionTitle\} role="status"/)
  assert.match(journey, /\{state\.answeredCount\} \/ \{state\.total\} · \{t\.completionCount\}/)
  assert.match(journey, /data-hh-test-view-result disabled=\{busy \|\| !!operation\.current\} onClick=\{finish\}/)
  assert.match(css, /\.completionCta\{[^}]*width:100%;[^}]*min-height:58px/)
  assert.match(css, /\.completionCta\{[^}]*background:linear-gradient\(/)
  assert.match(css, /\.completionCard\{[^}]*min-width:0;width:100%/)
  assert.match(css, /@media\(max-width:355px\)/)
})

test('completed view replaces extra question controls and transcript without losing correction or consent safety', () => {
  assert.match(journey, /\(!state\.complete \|\| paused \|\| cancelPending\) && <div className=\{css\.controls\}/)
  assert.match(journey, /!state\.complete && transcript\.length > 0/)
  assert.match(journey, /!state\.complete && <[>]\s*<div className=\{css\.progress\}/)
  assert.match(journey, /state\.index > 0 && <button className=\{css\.completionBack\}/)
  assert.match(journey, /state\.index > 0 && !state\.complete && !paused/)
  assert.match(journey, /!paused && !cancelPending && signal && acknowledgedSafety !== signalKey/)
  assert.match(journey, /guest\/runs\/['"] \+ run\.id \+ ['"]\/submit/)
  assert.match(journey, /guest\/runs\/['"] \+ run\.id \+ ['"]\/save/)
  assert.match(journey, /<Asrs6SourceNotice/)
  assert.match(journey, /\{t\.notDiagnostic\}/)
  assert.doesNotMatch(journey, /localStorage|sessionStorage/)
})
