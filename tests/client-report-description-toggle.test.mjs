import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('the report keeps one native, keyboard-accessible inline remedy disclosure', () => {
  const source = read('components/prescription-document.jsx')
  const start = source.indexOf('<details className="canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure">')
  const end = source.indexOf('</details>', start)
  assert.ok(start >= 0 && end > start)
  const card = source.slice(start, end)
  assert.match(card, /<summary className="canonical-remedy-unified-summary">/)
  assert.match(card, /canonical-remedy-toggle-label-closed/)
  assert.match(card, /canonical-remedy-toggle-label-open/)
  assert.match(card, /'Описание' : 'Details'/)
  assert.match(card, /'Свернуть' : 'Close'/)
  assert.match(card, /className="canonical-remedy-unified-chevron" aria-hidden="true" \/>/)
  assert.doesNotMatch(card, /<button\b|<a\b[^>]*className="canonical-remedy-unified-toggle"/)
  assert.match(card, /canonical-remedy-profile-content/)
})

test('description action is a small pill with a CSS chevron, not a big underlined panel', () => {
  const source = read('components/consultation-report.css')
  const start = source.indexOf('Unified prescription + remedy library cards — 2026-10-19')
  assert.ok(start >= 0)
  const css = source.slice(start)
  const toggle = css.match(/\.canonical-remedy-profile-action\.canonical-remedy-unified-toggle \{([\s\S]*?)\n\}/)
  assert.ok(toggle, 'unified description action should have a dedicated style')
  assert.match(toggle[1], /min-height: 32px/)
  assert.match(toggle[1], /border-radius: 999px/)
  assert.match(toggle[1], /width: max-content/)
  assert.match(toggle[1], /text-decoration: none/)
  assert.doesNotMatch(toggle[1], /text-decoration: underline/)
  assert.match(css, /\.canonical-remedy-unified-chevron \{[\s\S]*?border-right: 1\.5px solid currentColor/)
  assert.match(css, /\[open\] \.canonical-remedy-unified-chevron \{\s*transform: rotate\(225deg\)/)
  assert.match(css, /\[open\] \.canonical-remedy-toggle-label-closed \{\s*display: none/)
  assert.match(css, /\[open\] \.canonical-remedy-toggle-label-open \{\s*display: inline/)
  assert.match(css, /\.canonical-remedy-unified-summary:focus-visible/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})

test('tiny mobile widths keep the full name readable and print does not show a fake button', () => {
  const css = read('components/consultation-report.css')
  const unified = css.slice(css.indexOf('Unified prescription + remedy library cards — 2026-10-19'))
  assert.match(unified, /@media screen and \(max-width: 360px\) \{[\s\S]*?grid-template-columns: 44px minmax\(0, 1fr\)/)
  assert.match(unified, /grid-row: 1 \/ 3/)
  assert.match(unified, /grid-row: 2/)
  assert.match(unified, /@media print \{[\s\S]*?\.canonical-remedy-profile-action\.canonical-remedy-unified-toggle \{\s*display: none/)
})
