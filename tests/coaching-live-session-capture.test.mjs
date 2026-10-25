import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const component = read('components/coaching-live-session-capture.jsx')
const css = read('components/coaching-live-session-capture.module.css')
const lounge = read('components/public-coaching-discovery.jsx')

test('Coaching & Hypnotherapy has one live capture with all three localized options', () => {
  assert.match(lounge, /<CoachingLiveSessionCapture locale=\{lang\}/)
  assert.equal((lounge.match(/data-coaching-session-capture/g) || []).length, 1)
  assert.match(lounge, /data-coaching-practitioner-checklist/)
  assert.doesNotMatch(lounge, /data-coaching-paid-sessions/)
  assert.match(component, /offers = \['free', 'short', 'full'\]/)
  for (const label of [
    'Coaching & Hypnotherapy', 'Коучинг и гипнотерапия', 'Coaching e hipnoterapia',
    'Free express assessment', 'Бесплатная экспресс-диагностика', 'Evaluación exprés gratuita',
    'Short session · 30 min', 'Краткая сессия · 30 мин', 'Sesión breve · 30 min',
    'Full session · 60 min', 'Полная сессия · 60 мин', 'Sesión completa · 60 min',
    '€50', '€100',
  ]) assert.ok(component.includes(label), label)
})

test('each selected offer opens one short inline request and never creates a lead on choice', () => {
  assert.match(component, /useState\('free'\)/)
  assert.match(component, /role="radiogroup"/)
  assert.match(component, /role="radio" aria-checked=\{active\}/)
  assert.match(component, /setSelected\(key\); setOpened\(false\)/)
  assert.match(component, /aria-expanded=\{opened\}/)
  assert.match(component, /aria-controls="coaching-request-sheet"/)
  assert.match(component, /data-coaching-request-sheet=\{selected\}/)
  assert.match(component, /hidden=\{!opened\}/)
  assert.match(component, /<CompactLeadCapture key=\{selected\} locale=\{lang\} variant="coaching"/)
  assert.match(component, /<FreeDiagnosticStart locale=\{lang\} variant="coaching" \/>/)
  assert.match(component, /title=\{t\.actions\[selected\]\}/)
  assert.match(component, /time and format are confirmed personally before any payment/)
  assert.match(component, /not a live call or medical diagnosis/)
  assert.doesNotMatch(component, /whatsappEnquiryUrl|ContactChannelChooser|analyticsEvent|localStorage|sessionStorage|fetch\(|window\.open|checkout/)
})

test('capture is mobile legible and parses as JSX', () => {
  assert.match(css, /background:#fcf8f1/)
  assert.match(css, /background:#893751/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /:focus-visible/)
  const parsed = ts.createSourceFile('coaching-live-session-capture.jsx', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length, 0)
})
