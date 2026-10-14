import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('mobile Profile leads with four real, accessible first-party destinations', () => {
  const profile = read('components/app/profile-domains.jsx')
  const cards = read('components/app/profile-service-cards.jsx')
  const styles = read('components/app/profile-service-cards.module.css')
  assert.match(profile, /<ProfileServiceCards locale=\{locale\} results=\{results\} \/>/)
  assert.match(profile, /\{overviewContent\}/)
  assert.ok(profile.indexOf('<ProfileServiceCards') < profile.indexOf('{overviewContent}'))
  for (const service of ["id: 'tests'","id: 'blitz'","id: 'consultations'","id: 'course'"]) {
    assert.ok(cards.includes(service), service)
  }
  assert.match(cards, /\/services\/free-situation-review/)
  assert.match(cards, /const archive = '#personal-reports'/)
  assert.match(cards, /secondaryHref: root \+ '\/history'/)
  assert.match(cards, /primaryHref: root \+ '\/course'/)
  assert.match(cards, /primaryHref: root \+ '\/tests'/)
  assert.match(cards, /aria-labelledby="hh-profile-service-title"/)
  assert.match(cards, /data-profile-service=\{card.id\}/)
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(styles, /@media\(max-width:800px\)[\s\S]*?grid-template-columns:1fr/)
  assert.match(styles, /min-height:50px/)
  assert.match(styles, /:focus-visible/)
})

test('Profile remains private and does not manufacture diagnostics or mix client records', () => {
  const cards = read('components/app/profile-service-cards.jsx')
  const profile = read('components/app/profile-domains.jsx')
  assert.match(cards, /Array\.isArray\(results\)/)
  assert.doesNotMatch(cards, /Math\.random|localStorage|sessionStorage|selectedClientId|JSON\.stringify\(results/)
  assert.match(profile, /\{!external && <ProfileServiceCards/)
  assert.match(profile, /id="personal-reports"/)
  assert.match(profile, /role="tabpanel"/)
  assert.match(profile, /<ProfileServiceOffer area=\{active\} locale=\{locale\} \/>/)
})
