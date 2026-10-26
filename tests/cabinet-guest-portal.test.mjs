import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getCompactNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Space replaces Cabinet across the public header, without changing six bottom-bar routes', () => {
  const labels = { en: 'My Space', ru: 'Моё пространство', es: 'Mi espacio' }
  for (const locale of ['en', 'ru', 'es']) {
    const first = getCompactNavigation(locale)[0]
    assert.equal(first.id, 'profile')
    assert.equal(first.href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait')
    assert.equal(getCompactNavigation(locale)[1].id, 'courses')
    assert.equal(navigationCopy[locale].house, labels[locale])
    assert.equal(navigationCopy[locale].cabinet, labels[locale])
  }
  const nav = read('components/site-navigation.tsx')
  const space = read('components/home-personal-space.tsx')
  const layout = read('app/layout.tsx')
  assert.match(nav, /<HomePersonalSpaceNavEntry locale=\{activeLocale\}/)
  assert.doesNotMatch(nav, /cabinetEntryCopy|LayoutDashboard/)
  assert.match(space, /aria-haspopup="dialog"/)
  assert.match(space, /aria-expanded=\{space.open\}/)
  assert.match(space, /site-cabinet-entry__full/)
  assert.match(layout, /<HomePersonalSpaceProvider locale=\{lang\}>/)
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
  assert.match(page, /const signinAttempted = useRef\(false\)/)
  assert.match(page, /signinAttempted.current = true/)
  assert.match(page, /errorMessage=\{signinAttempted.current && error \? message\(error, c\)/)
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
