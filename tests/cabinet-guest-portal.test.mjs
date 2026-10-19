import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getCompactNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('bottom-right compact navigation is Cabinet while retaining the existing account routes', () => {
  const labels = { en: 'Cabinet', ru: 'Кабинет', es: 'Gabinete' }
  for (const locale of ['en', 'ru', 'es']) {
    const item = getCompactNavigation(locale).at(-1)
    assert.equal(item.id, 'house')
    assert.equal(item.label, labels[locale])
    assert.equal(item.ariaLabel, labels[locale])
    assert.equal(item.href, '/' + (locale === 'es' ? 'en' : locale) + '/app')
    assert.equal(navigationCopy[locale].house, labels[locale])
  }
  assert.match(read('components/mobile-bottom-navigation.tsx'), /house: LayoutDashboard/)
})

test('portrait-only guest welcome explains growth tools and practitioner publishing', () => {
  const page = read('components/app/app-workspace.jsx')
  const portal = read('components/app/cabinet-guest-overview.jsx')
  const styles = read('components/app/cabinet-guest-overview.module.css')

  assert.match(page, /state !== 'ready' && page === 'portrait' && !stressSignup/)
  assert.match(page, /<CabinetGuestOverview/)
  assert.match(page, /onSignin=\{signin\}/)
  assert.match(page, /unavailable=\{state === 'unavailable'\}/)
  assert.match(page, /sessionNotice=\{state === 'error'\}/)
  assert.match(page, /state === 'signed-out' && error \? message\(error, c\)/)
  assert.match(page, /appFetch\('auth\/start'/)
  assert.match(page, /if \(state !== 'ready' && page === 'course'/)
  assert.match(portal, /data-cabinet-guest-overview="true"/)
  assert.match(portal, /Explore free tests/)
  assert.match(portal, /professional questionnaires/)
  assert.match(portal, /progress charts/)
  assert.match(portal, /development programme/)
  assert.match(portal, /Save your courses/)
  assert.match(portal, /Present your services/)
  assert.match(portal, /Share articles and knowledge/)
  assert.match(portal, /ЛИЧНЫЙ КАБИНЕТ/)
  assert.match(portal, /GABINETE PERSONAL/)
  assert.match(portal, /publication review where required/)
  assert.match(portal, /role="alert"/)
  assert.match(portal, /sessionNotice && <p className=\{styles.sessionNotice\} role="status">/)
  assert.match(portal, /Couldn’t check|couldn’t check/iu)
  assert.match(portal, /onClick=\{onSignin\}/)
  assert.match(portal, /selectedLocale \+ '\/client\/tests'/)
  assert.match(styles, /@media \(max-width: 650px\)/)
  assert.match(styles, /grid-template-columns: minmax\(0,1fr\)/)
  assert.match(styles, /prefers-reduced-motion/)
})

test('signed-in Cabinet and course deep links retain private account handling', () => {
  const page = read('app/[locale]/app/[[...path]]/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(page, /redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /if \(state !== 'ready' && page === 'portrait' && !stressSignup\)/)
  assert.match(workspace, /if \(state !== 'ready'\)/)
  assert.match(workspace, /const nav = \[/)
  assert.match(workspace, /id: 'practice'/)
})
