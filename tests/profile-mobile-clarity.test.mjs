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

test('four profiles lead the account screen; reports remain open and consult CTA remains inside archive', () => {
  const profile = source('components/app/profile-domains.jsx')
  const css = source('components/app/profile-refresh.css')
  const chooser = profile.indexOf('{!external && profileNavigation}')
  const archive = profile.indexOf('<section id="personal-reports"')
  const consult = profile.indexOf('data-profile-free-consultation')
  assert.ok(chooser > 0 && archive > chooser && consult > archive)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /aria-selected=\{active === key\}/)
  assert.match(profile, /data-report-archive-always-open/)
  assert.match(profile, /className="hh-domain-free-review-link"/)
  assert.match(profile, /className="hh-domain-services-link"/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.match(css, /padding-bottom: calc\(132px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
})

test('reports remain private and a consultation request is not a confirmed booking', () => {
  const profile = source('components/app/profile-domains.jsx')
  const panel = source('components/app/personal-analysis-panel.jsx')
  const css = source('components/app/profile-refresh.css')
  assert.match(profile, /data-consultation-kind="free-options"/)
  assert.match(profile, /consultationNote/)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /onKeyDown=\{event => \{/)
  assert.match(profile, /credentials: 'same-origin'/)
  assert.match(profile, /cache: 'no-store'/)
  assert.match(panel, /<DownloadPractitionerReport reportId=\{item\.id\}/)
  assert.match(panel, /<SavedSessionsPanel items=\{savedSessions\}/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage/)
})
