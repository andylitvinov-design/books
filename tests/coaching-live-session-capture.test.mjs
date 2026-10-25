import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = read('components/coaching-lounge-entry.tsx')
const css = read('components/coaching-lounge-entry.module.css')
const lounge = read('components/public-coaching-discovery.jsx')

test('Coaching Lounge has one active three-path entry, not a duplicate legacy capture', () => {
  assert.match(lounge, /<CoachingLoungeEntry locale=\{lang\} \/>/)
  assert.doesNotMatch(lounge, /<CoachingLiveSessionCapture/)
  assert.match(entry, /data-coaching-three-paths/)
  for (const label of [
    'Free situation diagnosis', 'Бесплатная диагностика ситуации', 'Diagnóstico gratuito de la situación',
    'Personal coaching session', 'Личная коучинг-сессия', 'Sesión personal de coaching',
    '30 min · €50', '60 min · €100',
  ]) assert.ok(entry.includes(label), label)
})

test('chosen offer expands one short phone-first intake; messenger handoff always remains a separately consented action', () => {
  assert.match(entry, /useState\(false\)/)
  assert.match(entry, /setRequestOpen\(true\)/)
  assert.match(entry, /hidden=\{!requestOpen\}/)
  assert.match(entry, /data-open=\{requestOpen \? "true" : "false"\}/)
  assert.match(entry, /<FreeDiagnosticStart locale=\{locale\} compact \/>/)
  assert.match(entry, /<CompactLeadCapture key=\{format\} locale=\{locale\} variant="coaching"/)
  assert.match(entry, /role="radiogroup"/)
  assert.match(entry, /aria-checked=\{format === item\.value\}/)
  assert.match(entry, /sourcePath=\{"\/" \+ locale \+ "\/coaching"\}/)
  assert.match(entry, /href="#free-diagnostic-start" onClick=\{\(\) => choose\("free"\)\}/)
  assert.match(entry, /offer\.id === "free" \? "#free-diagnostic-start" : "#coaching-intake"/)
  assert.doesNotMatch(entry, /window\.open|fetch\(|whatsappEnquiryUrl|sessionStorage|checkout/)
})

test('coaching offer picker and mini-panel are responsive and parse as TSX', () => {
  assert.match(css, /\.intake\[hidden\]/)
  assert.match(css, /\.durationChoice/)
  assert.match(css, /@media\(max-width:350px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /:focus-visible/)
  const parsed = ts.createSourceFile('coaching-lounge-entry.tsx', entry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.deepEqual(parsed.parseDiagnostics.map(e => e.messageText), [])
})
