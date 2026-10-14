import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = read('components/app/course-entry-selector.jsx')
const wrapper = read('components/app/my-course.jsx')
const css = read('components/app/course-entry-selector.module.css')

test('My Course first renders the selection slide and keeps the existing course wizard', () => {
  assert.match(wrapper, /<CourseEntrySelector/)
  assert.match(wrapper, /if \(!showCourse && !testReturn && !programmeEntry\) return/)
  assert.match(wrapper, /onOpen=\{\(\) => setShowCourse\(true\)\}/)
  assert.match(wrapper, /stage === 0 && <header/)
  assert.match(wrapper, /programmeEntry = stage === 0 && Boolean\(requestedProgram\)/)
  assert.match(wrapper, /stage === 4 && <CourseToday/)
  assert.match(wrapper, /searchParams\.get\('tests'\) === 'complete'/)
  assert.match(wrapper, /searchParams\.get\('retest'\) === 'updated'/)
  assert.match(wrapper, /router\.replace\(root \+ '\/course'\)/)
})

test('an active current-course tile and dotted add button are both present', () => {
  assert.match(entry, /data-current-course-card/)
  assert.match(entry, /data-add-course/)
  assert.match(entry, /onClick=\{addCourse\}/)
  assert.match(entry, /if \(!hasCourse\) \{ onOpen\(\); return \}/)
  assert.match(entry, /dialogRef\.current\?\.showModal\(\)/)
  assert.match(css, /dashed/)
  assert.match(css, /@media\(max-width:690px\)/)
})

test('daily lesson number comes from saved lessons, not elapsed dates', () => {
  assert.match(entry, /course\/progress\?locale=/)
  assert.match(entry, /daily\.progress\.practiceCount/)
  assert.match(entry, /completed \+ 1/)
  assert.doesNotMatch(entry, /course\.today/)
  assert.match(entry, /completed \/ 14 \* 100/)
})

test('Free paywall is informational until verified server billing is live', () => {
  assert.match(entry, /data-course-subscription-dialog/)
  assert.match(entry, /price: 10, spots: 'one'/)
  assert.match(entry, /price: 20, spots: 'five'/)
  assert.match(entry, /price: 100, spots: 'five'/)
  assert.match(entry, /Subscription checkout is not available yet/)
  assert.match(entry, /Оформление подписки пока недоступно/)
  assert.doesNotMatch(entry, /checkout\/start|localStorage|sessionStorage|stripe\.redirect/)
})

test('dialog is accessible and does not hide existing course navigation', () => {
  assert.match(entry, /<dialog ref=\{dialogRef\}/)
  assert.match(entry, /aria-labelledby="course-upgrade-title"/)
  assert.match(entry, /dialogRef\.current\?\.close\(\)/)
  assert.match(css, /::backdrop/)
  assert.match(wrapper, /backToCourses/)
})
