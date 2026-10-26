import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compactNavigationIds, getCompactNavigation } from '../lib/site-navigation-model.js'
import { PROFILE_AREAS } from '../lib/profile/profile-service-offers.js'

const source = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('public tabs start with authenticated My Profile then Courses in every language', () => {
  assert.deepEqual(compactNavigationIds.slice(0, 2), ['profile', 'courses'])
  for (const locale of ['en', 'ru', 'es']) {
    const links = getCompactNavigation(locale)
    assert.equal(links.length, 7)
    assert.equal(links[0].id, 'profile')
    assert.equal(links[0].href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait')
    assert.equal(links[1].href, '/' + locale + '/academy')
  }
})

test('Cabinet keeps six fixed destinations without duplicate Reports or a wrapped Home', () => {
  const app = source('components/app/app-workspace.jsx')
  const nav = app.slice(app.indexOf('  const nav = ['), app.indexOf('  const navIsActive'))
  assert.deepEqual([...nav.matchAll(/id: '([^']+)'/g)].map(m => m[1]),
    ['portrait', 'course', 'tests', 'practice', 'messages'])
  assert.match(app, /hh-mobile-app-nav-home/)
  assert.match(app, /\['labs', 'portfolio', 'reports', 'history', 'monitoring', 'results'\]/)
  assert.match(app, /page === 'portfolio' && <PortfolioPage/)
  assert.match(app, /page === 'portrait' && \(/)
  const styles = source('app/[locale]/app/[[...path]]/workspace.css')
  assert.match(styles, /\.hh-app \.hh-mobile-app-nav\s*\{\s*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/)
})

test('My Profile reuses the existing four private areas and report archive', () => {
  assert.deepEqual(PROFILE_AREAS, ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'])
  const profile = source('components/app/profile-domains.jsx')
  assert.match(profile, /!external && profileNavigation/)
  assert.match(profile, /external && profileNavigation/)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /reportsContent && <section id="personal-reports"/)
  assert.match(profile, /fetch\('\/api\/app\/reports\//)
})

test('course entry keeps My Courses first and offers the public catalogue below', () => {
  const hub = source('components/academy-hub.tsx')
  const academy = source('components/academy-discovery.tsx')
  const myCourse = source('components/app/my-course.jsx')
  assert.match(hub, /<AcademyDiscovery locale=\{locale\} view=\{view\}/)
  assert.ok(academy.indexOf('<AcademyMyCourses') < academy.indexOf('data-academy-course-finder'))
  assert.ok(myCourse.indexOf('showDashboard && <MyCoursesDashboard') < myCourse.indexOf('showDashboard && <section className={styles.browseCourses}'))
  assert.match(myCourse, /<CabinetFreeCourseBanners locale=\{locale\}/)
  const privateCourses = source('components/app/course-entry-selector.jsx')
  assert.ok(privateCourses.indexOf('data-started-courses') < privateCourses.indexOf('<CabinetFreeCourseBanners'))
  assert.ok(privateCourses.indexOf('<CabinetFreeCourseBanners') < privateCourses.indexOf('courseCatalogBridge'))
  assert.match(privateCourses, /'\/academy'/)
})
