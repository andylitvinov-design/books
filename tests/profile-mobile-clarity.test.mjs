import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('signed-in Profile restores the approved cream and turquoise report design', () => {
  const profile = source('components/app/profile-domains.jsx')
  const css = source('components/app/profile-refresh.css')

  assert.match(profile, /<h1>\{t\.title\}<\/h1>/)
  assert.match(profile, /className="hh-domain-topic-pills"/)
  assert.match(css, /background: linear-gradient\(160deg, #f4eee3 0%/)
  assert.match(css, /\.hh-domain-hero h1 \{/)
  assert.match(css, /\.hh-analysis-reports-empty:before \{/)
  assert.match(css, /\.hh-domain-appointment-button \{/)
  assert.match(css, /2026-10-17 production polish/)
  assert.doesNotMatch(profile, /accountTitle|accountSubtitle|privacySummary|hh-domain-privacy/)
  assert.doesNotMatch(css, /A purposeful, short navy introduction/)
})

test('report actions are above the category accordion for the signed-in account only', () => {
  const profile = source('components/app/profile-domains.jsx')
  const css = source('components/app/profile-refresh.css')
  const archive = profile.indexOf('<section id="personal-reports"')
  const consult = profile.indexOf('data-profile-empty-consultation')
  const archiveEnd = profile.indexOf('</section>}', archive)
  const quickActions = profile.indexOf('{!external && footerActions}')
  const reportAreas = profile.indexOf('<details className="hh-domain-more"')
  const privacy = profile.lastIndexOf('<p className="hh-domain-private">')
  const legacyActions = profile.indexOf('{external && footerActions}')

  assert.ok(archive >= 0 && consult > archive && archiveEnd > consult)
  assert.ok(quickActions > archiveEnd && reportAreas > quickActions)
  assert.ok(legacyActions > privacy && legacyActions > reportAreas)
  assert.match(profile, /const footerActions = \(/)
  assert.match(profile, /className="hh-domain-free-review-link"/)
  assert.match(profile, /className="hh-domain-services-link"/)
  assert.match(profile, /\{t\.getReview\}/)
  assert.match(profile, /\{t\.discover\}/)
  assert.match(css, /> \.hh-domain-footer-actions \{\s*margin: 0 0 12px;/)
  assert.match(css, /padding-bottom: calc\(132px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(css, /width: 42px;height: 42px; padding: 9px;/)
  assert.match(css, /\.hh-domain-footer-actions a \{\s*min-height: 46px;/)
  assert.match(css, /background: radial-gradient\(circle at 90% 35%/)
  assert.doesNotMatch(css, /A purposeful, short navy introduction/)

})

test('reports remain private, consultation remains an unconfirmed request and tabs stay accessible', () => {
  const profile = source('components/app/profile-domains.jsx')
  const panel = source('components/app/personal-analysis-panel.jsx')
  const css = source('components/app/profile-refresh.css')

  assert.match(profile, /data-consultation-kind="free-introduction"/)
  assert.match(profile, /href=\{freeIntroConsultationHref\(locale\)\}/)
  assert.match(profile, /not a confirmed booking/)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /aria-selected=\{active === key\}/)
  assert.match(profile, /onKeyDown=\{event => \{/)
  assert.match(profile, /<p className="hh-domain-private">/)
  assert.match(panel, /<DownloadPractitionerReport reportId=\{item\.id\}/)
  assert.match(panel, /<SavedSessionsPanel items=\{savedSessions\}/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage/)
})
