import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('approved mockup uses a large head with four colorful floating life-area chips', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  const css = read('components/app/profile-hub-tabs.module.css')
  assert.match(ui, /data-reports-portrait-hero/)
  assert.match(ui, /<TestExplorerVisual compact locale=\{selected\} portrait=\{portrait\}/)
  assert.match(ui, /REPORTS_SECTOR_ICONS = \[Leaf, Mountain, Heart, InfinityIcon\]/)
  assert.match(ui, /data-report-sector=\{index\}/)
  assert.match(css, /HH_MOCKUP_PORTRAIT_V2/)
  assert.match(css, /\.reportPortraitScene\{position:relative;/)
  assert.match(css, /\.reportSectorChip\[data-report-sector="3"\]/)
  assert.match(css, /@media\(max-width:430px\)/)
  assert.match(css, /@media\(max-width:349px\)/)
})
test('saved reports and chart rays use owner-scoped actual results, never a visual mock score', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  assert.match(ui, /ordered\.slice\(0, 5\)/)
  assert.match(ui, /recent\.slice\(0, 3\)/)
  assert.match(ui, /data-saved-result-count=\{ordered\.length\}/)
  assert.match(ui, /buildPsychPortrait\(ordered\.filter\(isProfessionalProfileTest\)\)/)
  assert.match(ui, /data-measured-axis-count=\{measuredCount\}/)
  assert.doesNotMatch(ui, /Math\.random|syntheticScores|mockProfileScore|localStorage/)
})
test('native current My Space nav and link destinations survive the design patch', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  for(const phrase of ['ProfileSpaceDashboard','sessions: root','space=reports','/portfolio','/history','/results/','/tests?filter=completed']) {
    assert.ok(ui.includes(phrase),phrase)
  }
  for(const locale of ['Body & energy','Relationships','Growth & meaning','Тело и энергия','Развитие и смысл','Cuerpo y energía','Crecimiento y sentido']){
    assert.ok(ui.includes(locale),locale)
  }
  assert.match(ui, /t\.private/)
})
