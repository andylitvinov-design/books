import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Profile no longer duplicates the dedicated Tests and Courses destinations', () => {
  const profile = read('components/app/profile-domains.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const cards = read('components/app/profile-service-cards.jsx')
  const styles = read('components/app/profile-service-cards.module.css')
  assert.doesNotMatch(profile, /<ProfileServiceCards|import \{ ProfileServiceCards \}/)
  assert.match(profile, /id="personal-reports"/)
  assert.ok(profile.indexOf('id="personal-reports"') < profile.indexOf('className="hh-domain-more"'))
  assert.match(workspace, /page === 'tests' &&/)
  assert.match(workspace, /page === 'course' &&/)
  assert.match(workspace, /data-insights-personal-portrait/)
  // Existing shared card component remains backward-compatible if reused elsewhere.
  for (const service of ["id: 'tests'","id: 'blitz'","id: 'consultations'","id: 'course'"]) {
    assert.ok(cards.includes(service), service)
  }
  assert.match(cards, /\/services\/free-situation-review/)
  assert.match(cards, /primaryHref: root \+ '\/course'/)
  assert.match(cards, /primaryHref: root \+ '\/tests'/)
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(styles, /@media\(max-width:800px\)[\s\S]*?grid-template-columns:1fr/)
})

test('Private reports stay account scoped and supplementary areas retain keyboard access', () => {
  const profile = read('components/app/profile-domains.jsx')
  const css = read('components/app/profile-domains.css')
  assert.match(profile, /role="tabpanel"/)
  assert.match(profile, /<ProfileServiceOffer area=\{active\} locale=\{locale\} \/>/)
  assert.match(profile, /credentials: 'same-origin'/)
  assert.match(profile, /cache: 'no-store'/)
  assert.match(profile, /onToggle=\{event => setExpanded/)
  assert.match(css, /\.hh-domain-more-toggle:focus-visible/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.doesNotMatch(profile, /Math\.random|localStorage|sessionStorage|selectedClientId/)
})
