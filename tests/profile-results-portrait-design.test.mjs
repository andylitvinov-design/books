import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('approved 19 November Reports mockup has photo hero, real PDF action, compact neural chart and five measures', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  const css = read('components/app/profile-hub-tabs.module.css')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(ui, /data-reports-photo-hero/)
  assert.match(ui, /data-report-create-cta/)
  assert.match(ui, /stateBrand = current === 'today' \|\| current === 'state' \|\| current === 'reports'/)
  assert.match(ui, /data-profile-state-life/)
  assert.match(ui, /data-profile-state-work/)
  assert.match(ui, /data-reports-portrait-hero/)
  assert.match(ui, /data-profile-head/)
  assert.match(ui, /<TestExplorerVisual compact locale=\{selected\} portrait=\{portrait\}/)
  assert.match(ui, /data-report-metric=\{id\}/)
  assert.match(ui, /REPORT_METRICS\.map/)
  assert.match(ui, /data-report-card-image=\{index\}/)
  assert.match(css, /HH_REPORTS_PHOTO_DASHBOARD_V3/)
  assert.match(css, /reiki-approved-sunrise-v3\.webp/)
  assert.match(css, /profile-card-photos\.webp/)
  assert.match(css, /@media\(max-width:430px\)/)
  assert.match(css, /@media\(max-width:349px\)/)
  assert.match(workspace, /<details id="hh-insights-export" className="hh-insights-export">/)
  assert.match(ui, /\/portfolio#hh-insights-export/)
})

test('reports use owner-scoped real test results; each position is inside its own audited scale', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  assert.match(ui, /ordered\.slice\(0, 5\)/)
  assert.match(ui, /recent\.slice\(0, 3\)/)
  assert.match(ui, /data-saved-result-count=\{ordered\.length\}/)
  assert.match(ui, /buildPsychPortrait\(ordered\.filter\(isProfessionalProfileTest\)\)/)
  assert.match(ui, /data-measured-axis-count=\{measuredCount\}/)
  assert.match(ui, /Number\.isFinite\(measurement\.percent\)/)
  assert.match(ui, /position \+ '\/100'/)
  assert.match(ui, /measuredCount \/ scaleTotal/)
  assert.match(ui, /root \+ '\/results\/'/)
  assert.doesNotMatch(ui, /Math\.random|syntheticScores|mockProfileScore|localStorage/)
  assert.doesNotMatch(ui, /(?:73|78|72|65|68|83)%/)
})

test('native navigation, private reports, locale and existing actions survive the design', () => {
  const ui = read('components/app/profile-hub-tabs.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  for (const phrase of ['ProfileSpaceDashboard', 'sessions: root', 'space=reports',
    '/portfolio', '/history', '/results/', '/tests?filter=completed', 't.private',
    'Сформировать отчёт', 'Create a report', 'Crear un informe']) assert.ok(ui.includes(phrase),phrase)
  for (const locale of ['Body & energy','Relationships','Growth & meaning',
    'Тело и энергия','Развитие и смысл','Cuerpo y energía','Crecimiento y sentido']) {
    assert.ok(ui.includes(locale),locale)
  }
  assert.match(workspace, /<ProfileResultsArchive locale=\{locale\} results=\{data\.results \|\| \[\]\}/)
  assert.match(workspace, /<ProfileDomains locale=\{locale\} mode="account"/)
  assert.match(workspace, /<ClientExpressReports locale=\{locale\}/)
})
