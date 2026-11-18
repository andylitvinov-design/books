import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Reports reuses the existing measured head-and-axes portrait, never a synthetic score', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  assert.match(ui, /data-reports-portrait-hero/)
  assert.match(ui, /<TestExplorerVisual compact locale=\{selected\} portrait=\{portrait\}/)
  assert.match(ui, /buildPsychPortrait\(ordered\.filter\(isProfessionalProfileTest\)\)/)
  assert.match(ui, /data-measured-axis-count=\{measuredCount\}/)
  assert.match(ui, /measuredCount \? p\.intro : p\.empty/)
  assert.doesNotMatch(ui, /Math\.random|mockProfileScore|syntheticScores|localStorage|postMessage\(/)
})

test('Mobile Reports stays short and retains history, retakes and direct results links', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  const css = read('components/app/profile-hub-tabs.module.css')
  assert.match(ui, /ordered\.slice\(0, 5\)/)
  assert.match(ui, /recent\.slice\(0, 3\)/)
  assert.match(ui, /data-saved-result-count=\{ordered\.length\}/)
  assert.match(ui, /\/results\//)
  assert.match(ui, /\/history/)
  assert.match(ui, /\/tests\?filter=completed/)
  assert.match(ui, /\/portfolio/)
  assert.match(css, /grid-template-areas:"copy" "art" "caption"/)
  assert.match(css, /@media\(max-width:360px\)/)
  assert.match(css, /min-height:45px/)
})

test('Report portrait has four localized, non-normative area labels and privacy', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  for (const heading of ['Body & energy', 'Work & goals', 'Relationships', 'Growth & meaning',
    'Тело и энергия', 'Дело и цели', 'Отношения', 'Развитие и смысл',
    'Cuerpo y energía', 'Trabajo y metas', 'Relaciones', 'Crecimiento y sentido']) {
    assert.ok(ui.includes(heading), heading)
  }
  assert.match(ui, /t\.private/)
  assert.match(ui, /buildPsychPortrait\(/)
  assert.match(ui, /Date\.parse\(item\.measurementAt/)
})
