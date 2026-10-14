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
  assert.match(ui, /setSelectedProgram\(programId === ACTIVE_COURSE_PROGRAM_ID/)
  assert.match(ui, /courseConcernsFromIntent\(courseEntry, locale\)/)
})

test('one localized, unobtrusive top ribbon shares a stress CTA and excludes sensitive work', () => {
  const bar = read('components/sitewide-antistress-banner.tsx')
  const style = read('components/sitewide-antistress-banner.module.css')
  const layout = read('app/layout.tsx')
  assert.match(layout, /<SitewideAntistressBanner initialLocale=\{lang\} \/>/)
  assert.match(bar, /data-sitewide-antistress-banner/)
  assert.match(bar, /app\/course\?program=stress/)
  assert.match(bar, /locale === "es" \? "en" : locale/)
  for (const route of ['admin', 'course', 'runs', 'results', 'report', 'settings']) {
    assert.ok(bar.includes(route), route + ' excludes a sensitive route')
  }
  assert.match(style, /@media print/)
  assert.match(style, /max-width:680px/)
  assert.doesNotMatch(bar, /localStorage|sessionStorage|fetch\(/)
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
