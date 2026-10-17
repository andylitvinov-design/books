import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('signed-in Profile is compact without changing the legacy private-link profile', () => {
  const profile = read('components/app/profile-domains.jsx')
  const css = read('components/app/profile-refresh.css')
  assert.match(profile, /<h1>\{external \? t\.title : t\.accountTitle\}<\/h1>/)
  assert.match(profile, /<small>\{external \? t\.browseHint : t\.browseAccount\}<\/small>/)
  assert.match(profile, /\{external && <span className="hh-domain-topic-pills"/)
  assert.match(profile, /<details className="hh-domain-more"/)
  assert.match(profile, /<div className="hh-domain-tabs" role="tablist"/)
  assert.match(profile, /\{external \? <p className="hh-domain-private"/)
  assert.match(profile, /<details className="hh-domain-privacy">/)
  assert.match(profile, /<p>\{t\.private\}<\/p>/)
  assert.match(css, /\.hh-profile-domains\[data-profile-mode="account"\] \.hh-personal-analysis--embedded \.hh-analysis-reports-empty/)
  assert.doesNotMatch(css, /^\s*\.hh-profile-domains\s*\{/m,
    'account refresh must not recolour the legacy private-link cabinet')
})

test('empty archive is row-sized, has one consultation request and keeps document flow intact', () => {
  const profile = read('components/app/profile-domains.jsx')
  const css = read('components/app/profile-refresh.css')
  const panel = read('components/app/personal-analysis-panel.jsx')
  assert.match(css, /grid-template-columns: 36px minmax\(0, 1fr\)/)
  assert.match(css, /grid-row: 1 \/ 3/)
  assert.match(css, /min-height: 0;/)
  assert.match(css, /\.hh-analysis-reports-empty:before \{\s*display: none;/)
  assert.match(profile, /data-profile-empty-consultation/)
  assert.match(profile, /data-consultation-kind="free-introduction"/)
  assert.match(profile, /href=\{freeIntroConsultationHref\(locale\)\}/)
  assert.match(profile, /<section id="personal-reports"/)
  assert.match(panel, /<DownloadPractitionerReport reportId=\{item\.id\}/)
  assert.match(panel, /<SavedSessionsPanel items=\{savedSessions\}/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage/)
})

test('compact profile remains keyboard-accessible and respects iPhone widths', () => {
  const profile = read('components/app/profile-domains.jsx')
  const css = read('components/app/profile-refresh.css')
  assert.match(profile, /onKeyDown=\{event => \{/)
  assert.match(profile, /aria-selected=\{active === key\}/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /@media\(max-width:760px\)/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.match(css, /@media\(max-width:350px\)/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(css, /\.hh-master-header-link \{\s*display: none;/)
  assert.match(css, /grid-template-columns: minmax\(0, 1.12fr\) minmax\(0, \.88fr\)/)
})
