import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { ACTIVE_COURSE_PROGRAM_ID, isPublicCourseProgramAvailable, getCourseProgram } from '../lib/inner-growth/course-programs.js'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('public course enrollments focus on Anti-Stress without deleting old programme definitions', () => {
  assert.equal(ACTIVE_COURSE_PROGRAM_ID, 'stress')
  assert.equal(isPublicCourseProgramAvailable('stress'), true)
  assert.equal(isPublicCourseProgramAvailable('focus'), false)
  assert.equal(isPublicCourseProgramAvailable('confidence'), false)
  assert.ok(getCourseProgram('focus'))
  assert.ok(getCourseProgram('confidence'))
  const ui = read('components/app/my-course.jsx')
  assert.match(ui, /program.id !== ACTIVE_COURSE_PROGRAM_ID/)
  assert.match(ui, /data-coming-soon/)
  assert.match(ui, /programId !== null && programId !== ACTIVE_COURSE_PROGRAM_ID/)
  assert.match(ui, /const entryConcerns=courseConcernsFromIntent\(entry, locale\)/)
  assert.match(ui, /applyProgramIntake\(started,programme,epoch,entryConcerns\)/)
})

test('top ribbon is a personal written review; a separate course ribbon follows the test chooser', () => {
  const bar = read('components/sitewide-antistress-banner.tsx')
  const style = read('components/sitewide-antistress-banner.module.css')
  const layout = read('app/layout.tsx')
  const home = read('components/holistic-house-home.tsx')
  const picker = read('app/[locale]/client/tests/page.tsx')
  const top = bar.slice(0, bar.indexOf('export function TestSelectionCourseBanner'))
  const course = bar.slice(bar.indexOf('export function TestSelectionCourseBanner'))
  assert.match(layout, /<SitewideAntistressBanner initialLocale=\\{lang\\} \\/>/)
  assert.match(top, /data-sitewide-personal-review-banner/)
  assert.match(top, /services\\/free-situation-review/)
  assert.doesNotMatch(top, /app\\/course\\?program=stress/)
  assert.match(course, /data-tests-course-banner/)
  assert.match(course, /app\\/course\\?program=stress/)
  assert.match(course, /locale === "es" \\? "en" : locale/)
  assert.match(home, /<HomepageTopicJourneys locale=\\{locale\\} \\/>\\s*<TestSelectionCourseBanner locale=\\{locale\\} \\/>/)
  assert.match(picker, /<PublicTestExplorer[\\s\\S]*<TestSelectionCourseBanner locale=\\{locale as Locale\\} \\/>/)
  for (const route of ['admin', 'course', 'runs', 'results', 'report', 'settings']) {
    assert.ok(bar.includes(route), route + ' excludes a sensitive route')
  }
  assert.match(style, /@media print/)
  assert.match(style, /max-width:680px/)
  assert.doesNotMatch(bar, /localStorage|sessionStorage|fetch\\(/)
})

test('all public course banners and landing pages lead to the Anti-Stress option', () => {
  const academy = read('components/academy-free-course-banner.tsx')
  const report = read('components/app/free-course-banner.jsx')
  const landing = read('components/public-growth-courses.tsx')
  const cabinet = read('components/public-course-cabinet.tsx')
  assert.match(academy, /app\/course\?program=stress/)
  assert.match(report, /app\/course\?program=stress/)
  assert.match(landing, /\["stress"\] as const/)
  assert.match(landing, /app\/course\?program=stress/)
  assert.doesNotMatch(landing, /\?entry=personal/)
  assert.match(cabinet, /\?program=stress/)
})
