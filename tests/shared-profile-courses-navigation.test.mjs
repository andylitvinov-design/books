import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCompactNavigation } from '../lib/site-navigation-model.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('EN/RU/ES public navigation opens the same private My Profile from the leftmost tab', () => {
  for (const locale of ['en', 'ru', 'es']) {
    const tabs = getCompactNavigation(locale)
    assert.equal(tabs.length, 7)
    assert.equal(tabs[0].id, 'profile')
    assert.equal(tabs[0].href, '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait')
    assert.equal(tabs[1].id, 'courses')
    assert.equal(tabs[1].href, '/' + locale + '/academy')
    assert.equal(tabs.find(tab => tab.id === 'home')?.href, locale === 'en' ? '/' : '/' + locale)
  }
})

test('My Profile presents four existing areas first; report archive and results links survive', () => {
  const profile = source('components/app/profile-domains.jsx')
  const workspace = source('components/app/app-workspace.jsx')
  const areas = source('lib/profile/profile-service-offers.js')
  assert.match(areas, /'psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'/)
  assert.match(profile, /const DOMAINS = PROFILE_AREAS/)
  assert.match(profile, /\{!external && profileNavigation\}/)
  assert.ok(profile.indexOf('{!external && profileNavigation}') < profile.indexOf('id="personal-reports"'))
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /data-report-archive-always-open/)
  assert.match(profile, /credentials: 'same-origin'/)
  assert.match(profile, /cache: 'no-store'/)
  assert.match(workspace, /page === 'portfolio' && <PortfolioPage/)
  assert.match(workspace, /id: 'portrait', label: locale === 'ru' \? 'Мой профиль' : 'My Profile'/)
  assert.ok(!workspace.slice(workspace.indexOf('  const nav = ['),workspace.indexOf('  const navIsActive')).includes("id: 'portfolio'"))
})

test('Courses uses saved learning first and the existing Academy catalogue below', () => {
  const discovery = source('components/academy-discovery.tsx')
  const academyCourses = source('components/academy-my-courses.tsx')
  const myCourse = source('components/app/my-course.jsx')
  const courseSelector = source('components/app/course-entry-selector.jsx')
  const workspace = source('components/app/app-workspace.jsx')
  assert.match(discovery, /<AcademyMyCourses locale=\{locale\} \/>/)
  assert.ok(discovery.indexOf('<AcademyMyCourses') < discovery.indexOf('data-academy-course-finder'))
  assert.match(academyCourses, /title: 'My courses'/)
  assert.match(academyCourses, /title: 'Мои курсы'/)
  assert.ok(myCourse.indexOf('showDashboard && <MyCoursesDashboard') < myCourse.indexOf('showDashboard && <section className={styles.browseCourses}'))
  assert.match(myCourse, /<CabinetFreeCourseBanners locale=\{locale\}/)
  assert.match(myCourse, /href=\{'\/' \+ locale \+ '\/academy'\}/)
  assert.ok(courseSelector.indexOf('data-started-courses') < courseSelector.indexOf('<CabinetFreeCourseBanners'))
  assert.match(workspace, /href: root \+ '\/course\?view=courses'/)
})
