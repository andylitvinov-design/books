import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = read('components/app/course-entry-selector.jsx')
const wrapper = read('components/app/my-course.jsx')
const css = read('components/app/course-entry-selector.module.css')

test('My Course first renders the selection slide and keeps the existing course wizard', () => {
  assert.match(wrapper, /<CourseEntrySelector/)
  assert.match(wrapper, /if \(!showCourse && !testReturn && !programmeEntry && !personalEntry\) return/)
  assert.match(wrapper, /personalEntry = stage === 0 &&/)
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


test('the current course has a real photo to the left and a compact mobile add tile', () => {
  const photo = entry.indexOf('className={styles.currentPhoto}')
  const title = entry.indexOf('<h2>{name}</h2>', photo)
  const progress = entry.indexOf('className={styles.progressInfo}', title)
  const action = entry.indexOf('className={styles.openButton}', progress)
  assert.ok(photo >= 0 && title > photo && progress > title && action > progress)
  assert.match(entry, /<img src="\/images\/holistic-house\/hero-olive-incense\.webp"/)
  assert.match(entry, /className=\{styles\.addTileText\}/)
  assert.match(css, /\.currentTop\{display:grid;grid-template-columns:/)
  assert.match(css, /\.currentPhoto img\{[^}]*object-fit:cover/s)
  assert.match(css, /\.addTile\{display:grid;grid-template-columns:42px/)
  assert.match(css, /@media\(max-width:340px\)/)
})

test('membership modal shows bilingual Free at €0 before paid tiers and remains scrollable', () => {
  const plans = entry.slice(entry.indexOf('const PLANS = ['), entry.indexOf('export default function'))
  assert.ok(plans.indexOf("id: 'free'") < plans.indexOf("id: 'start'"))
  assert.ok(plans.indexOf("id: 'start'") < plans.indexOf("id: 'advanced'"))
  assert.ok(plans.indexOf("id: 'advanced'") < plans.indexOf("id: 'premium'"))
  assert.match(plans, /id: 'free', price: 0, spots: 'one', items: \['ads'\]/)
  assert.match(entry, /free: 'Free'/)
  assert.match(entry, /ads: 'With ads'/)
  assert.match(entry, /ads: 'С рекламой'/)
  assert.match(entry, /data-plan=\{plan\.id\}/)
  assert.match(css, /\.planCard\[data-plan=free\]/)
  assert.match(css, /max-height:min\(80dvh,770px\)/)
  assert.match(css, /\.dialogHead\{position:sticky/)
  assert.doesNotMatch(entry, /\/api\/stripe\/holistic-course|checkout\/start/)
})
