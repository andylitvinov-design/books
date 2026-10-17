import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('signed-in profile keeps its real private archive and shows a consultation only when it is empty', () => {
  const profile = source('components/app/profile-domains.jsx')
  const workspace = source('components/app/app-workspace.jsx')
  const archive = profile.indexOf('id="personal-reports"')
  const offer = profile.indexOf('data-profile-empty-consultation')
  const categories = profile.indexOf('className="hh-domain-more"')

  assert.ok(archive >= 0 && offer > archive && categories > offer)
  assert.match(profile, /!external && savedReports\.filter\(report => report\.available !== false\)\.length === 0/)
  assert.match(profile, /data-profile-mode=\{mode\}/)
  assert.match(profile, /href=\{'\/' \+ locale \+ '\/services#consultation'\}/)
  assert.match(profile, /href=\{'\/' \+ locale \+ '\/services\/free-situation-review#request-free-review'\}/)
  assert.match(profile, /href=\{'\/' \+ locale \+ '\/services'\}/)
  assert.match(profile, /30 minutes \(€50\) or 60 minutes \(€100\)/)
  assert.match(profile, /30 минут — €50, 60 минут — €100/)
  assert.match(workspace, /reportsContent=\{<PersonalAnalysisPanel key=\{data.account.id\}/)
  assert.match(workspace, /reportTimeline\(data.savedReports\)/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage|Math\.random\(/)
})

test('the mobile report refresh is account-scoped and offers accessible details', () => {
  const profile = source('components/app/profile-domains.jsx')
  const css = source('components/app/profile-refresh.css')
  assert.match(profile, /import '\.\/profile-refresh\.css'/)
  assert.match(profile, /className="hh-domain-topic-pills"/)
  assert.match(profile, /className="hh-domain-appointment-button"/)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /aria-selected=\{active === key\}/)
  assert.match(profile, /<details className="hh-domain-more"/)
  assert.match(css, /\.hh-profile-domains\[data-profile-mode="account"\]/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /:focus-visible/)
  assert.ok(!css.includes('body {'), 'profile CSS must not alter the public site')
})

test('empty-state copy does not pretend a report exists or promise an automatic medical result', () => {
  const panel = source('components/app/personal-analysis-panel.jsx')
  assert.match(panel, /empty: 'No reports yet'/)
  assert.match(panel, /empty: 'Отчётов пока нет'/)
  assert.match(panel, /save it here/)
  assert.match(panel, /сохраните его здесь/)
  assert.match(panel, /<PersonalAnalysisReportList reports=\{\[\.\.\.visibleReports, \.\.\.legacyReports\]\}/)
  assert.match(panel, /<SavedSessionsPanel items=\{savedSessions\}/)
  assert.match(panel, /credentials: 'same-origin'/)
})
