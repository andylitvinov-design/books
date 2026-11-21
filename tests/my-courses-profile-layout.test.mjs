import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const workspace = src('components/app/app-workspace.jsx')
const hub = src('components/app/profile-hub-tabs.jsx')
const intro = src('components/app/course-space-intro.jsx')
const courses = src('components/app/my-courses-dashboard.jsx')
const css = src('components/app/my-courses-dashboard.module.css')

test('My Courses saved index uses the same compact shell as My Space without duplicate nav', () => {
  assert.match(workspace, /const courseLanding = page === 'course' && searchParams.get\('view'\) === 'courses' && !searchParams.get\('courseId'\)/)
  assert.match(workspace, /page !== 'portrait' && !courseLanding && <header/)
  assert.match(workspace, /page !== 'settings' && !courseLanding && \(/)
  assert.match(workspace, /courseLanding=\{courseLanding\}/)
  assert.match(workspace, /page === 'course' && !courseLanding && <ProfileCoursesSwitch/)
  assert.match(workspace, /id="my-courses-content"/)
  assert.match(hub, /isCourseLanding && <CourseSpaceIntro/)
  assert.match(hub, /!simplifiedSpace && <nav/)
  assert.match(hub, /!simplifiedSpace && !settingsMode && <div className=\{styles.myPageSubnav\}/)
})

test('Approved mobile hero reuses profile design assets and real navigation', () => {
  assert.match(intro, /profile-space-dashboard\.module\.css/)
  assert.match(intro, /МОИ КУРСЫ/)
  assert.match(intro, /Мой путь обучения/)
  assert.match(intro, /href="#my-courses-content"/)
  assert.match(intro, /data-profile-space-life/)
  assert.match(intro, /data-profile-space-work/)
  for (const phrase of ['My Courses', 'Mis cursos']) assert.ok(intro.includes(phrase))
})

test('The source-backed course progress and account actions remain intact', () => {
  assert.match(courses, /data-started-courses/)
  assert.match(courses, /CourseTile course=\{main\}/)
  assert.match(courses, /data-course-item=\{course.id\}/)
  assert.match(courses, /aria-valuenow=\{completed\}/)
  assert.match(courses, /onClick=\{\(\)=>onOpen\(course\)\}/)
  assert.match(courses, /data-course-options/)
  assert.match(courses, /Рекомендовано для вас/)
  assert.match(courses, /suggested\.slice\(0,2\)/)
  assert.match(courses, /onClick=\{onNew\}/)
  assert.match(courses, /CabinetFreeCourseBanners/)
  assert.match(courses, /onClick=\{\(\)=>setOpenHistory\(!openHistory\)\}/)
  assert.match(courses, /startCheckout/)
  assert.match(css, /\.recommendGrid\{/)
  assert.doesNotMatch(courses, /data-course-quick-tile/)
})
