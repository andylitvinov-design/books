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

const shellCss = src('app/[locale]/app/[[...path]]/workspace.css')
const hubCss = src('components/app/profile-hub-tabs.module.css')
const profileCss = src('components/app/profile-space-dashboard.module.css')

test('Saved course index is top-flush and preserves the one-row profile header at phone widths', () => {
  assert.match(workspace, /courseLanding \? 'hh-app hh-app--course-index' : 'hh-app'/)
  assert.match(shellCss, /\.hh-app\.hh-app--course-index\{padding-top:0\}/)
  assert.match(hub, /data-profile-course-index=\{isCourseLanding \? 'true' : undefined\}/)
  assert.match(hubCss, /\.hub\[data-profile-course-index="true"\] \.headingTitle\{/)
  assert.match(hubCss, /display:flex;flex:1 1 auto;align-items:center/)
  assert.match(profileCss, /\.dashboard\[data-profile-course-landing\] \.mode \.life\{color:#fff!important\}/)
  assert.match(profileCss, /\.dashboard\[data-profile-course-landing\] \.pathText strong\{color:#103f35!important\}/)
})

test('Started-course compact action retains exact saved progress and existing close-confirmation behavior', () => {
  assert.match(courses, /data-course-open-action onClick=\{\(\)=>onOpen\(course\)\}/)
  assert.match(courses, /hero \? <Play size=\{20\} fill="currentColor"/)
  assert.match(courses, /data-course-close-cross/)
  assert.match(courses, /aria-valuenow=\{completed\}/)
  assert.match(css, /\.dashboard \.mainCard \.coursePhoto\{min-height:112px\}/)
  assert.match(css, /\.dashboard \.mainCard \.tileRemoveButton\{/)
  assert.match(css, /\.dashboard \.recommendPhoto\{height:66px;min-height:0;aspect-ratio:auto\}/)
})

test('Free Reiki Practitioner bonus is visible below the recommendations and routes to the existing Academy', () => {
  assert.match(courses, /data-reiki-practitioner-bonus/)
  assert.match(courses, /\/academy\/principles-of-energywork\/learn/)
  assert.match(courses, /Практик Рейки/)
  assert.match(courses, /Reiki Practitioner/)
  assert.match(courses, /Инициация отдельно/)
  assert.match(courses, /BONUS · FREE/)
  assert.ok(courses.indexOf('data-reiki-practitioner-bonus') > courses.indexOf('data-course-options'))
  assert.ok(courses.indexOf('data-reiki-practitioner-bonus') < courses.indexOf('styles.moreFree'))
  assert.match(css, /\.bonusCard\{/)
  assert.match(courses, /CabinetFreeCourseBanners locale=\{locale\}/)
})
