import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const page = read('components/public-antistress-landing.tsx')
const css = read('components/public-antistress-landing.module.css')

test('Anti-Stress promotional page follows the light Academy course design and keeps the approved scenic art', () => {
  assert.match(page, /data-course-visual-style="academy-light"/)
  assert.match(page, /course-focus-mountain-boy\.webp/)
  assert.match(css, /\.heroText\s*\{[^}]*order:\s*2/s)
  assert.match(css, /\.heroVisual\s*\{[^}]*order:\s*1/s)
  assert.match(css, /\.heroImage\s*\{[^}]*object-fit:contain/s)
  assert.doesNotMatch(css, /\.heroImage\s*\{[^}]*object-fit:\s*cover/s)
  assert.match(css, /#e8f8f9/i)
  assert.match(css, /#923753/i)
  assert.match(css, /#143d5d/i)
  assert.match(css, /@media \(max-width:\s*740px\)/)
  assert.match(css, /@media \(max-width:520px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /:focus-visible/)
})

test('photo-left course-card layout keeps all seven expandable original curriculum sections', () => {
  assert.match(page, /data-antistress-skill=\{index \+ 1\}/)
  assert.match(page, /className=\{styles\.skillArtwork\}/)
  assert.match(page, /className=\{styles\.skillNumber\}/)
  assert.match(page, /<details className=\{styles\.skill\}/)
  assert.match(page, /index \* 2 \+ 1/)
  assert.match(page, /index \* 2 \+ 2/)
  assert.match(page, /course-journey-landscape\.svg/)
  assert.match(css, /\.challengeGrid, \.outcomeGrid\s*\{\s*display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /\.skills\s*\{\s*display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /\.skillArtwork\s*\{/)
})

test('RU/EN/ES section shortcuts and safe mini-practice remain functional', () => {
  assert.match(page, /const chapterLinks = \{/)
  for(const lang of ['ru','en','es']) assert.match(page, new RegExp('\\n  ' + lang + ': \\{ label:'))
  assert.match(page, /data-course-chapter-navigation/)
  for(const id of ['for-whom','programme','how','questions']) {
    assert.match(page, new RegExp('id: "' + id + '"'))
    assert.match(page, new RegExp('id="' + id + '"'))
  }
  assert.match(page, /role="status" aria-live="polite"/)
  assert.match(page, /aria-pressed=\{chosenExample === index\}/)
  assert.match(page, /setChosenExample\(index\)/)
  assert.match(page, /app\/course\?program=stress/)
  assert.doesNotMatch(page, /localStorage|sessionStorage|fetch\(|navigator\.geolocation/)
})
