import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const today = read('components/app/course-today.jsx')
const css = read('components/app/course-today.module.css')
const slides = read('components/app/course-slide-player.jsx')
const slideCss = read('components/app/course-slide-player.module.css')
const map = read('components/app/course-quest.jsx')
const mapCss = read('components/app/course-quest.module.css')
const theme = read('components/app/my-course-theme.css')
const shell = read('components/app/my-course.jsx')
const quizCss = read('components/app/course-quiz.module.css')
const assets = [
  'public/images/holistic-house/course-journey-landscape.svg',
  'public/images/holistic-house/course-calm-illustration.svg',
  'public/images/holistic-house/course-celebration.svg',
]

test('approved blue-turquoise design is scoped only to My Course and uses actual illustrations', () => {
  assert.match(shell, /import '\.\/my-course-theme\.css'/)
  assert.match(theme, /\.hh-app:has\(\[data-my-course\]\)/)
  assert.match(theme, /\.hh-mobile-app-nav a\[aria-current=page\]/)
  assert.match(css, /data-course-teal-hero|\.heroPhoto/)
  assert.match(css, /hero-olive-incense\.webp/)
  assert.match(css, /linear-gradient\(100deg,#087d89,#03778c\)/)
  assert.match(map, /course-focus-mountain-boy\.webp/)
  assert.match(mapCss, /\.pathLabel\{position:static!important/)
  assert.match(mapCss, /\.pathPreview\{grid-column:2/)
  assert.match(quizCss, /background:linear-gradient\(100deg,#17bcc8,#038dab\)/)
  for (const path of assets) {
    const content = read(path)
    assert.match(content, /^<svg /)
    assert.match(content, /viewBox=/)
    assert.ok(!/duolingo|owl mascot|copyright/i.test(content))
  }
})

test('one meaningful lesson unit becomes one slide; guided sections each get a separate step', () => {
  assert.match(slides, /function buildSlides\(lesson\)/)
  assert.match(slides, /idea: Leaf/)
  assert.doesNotMatch(slides, /\bFeather\b/)
  assert.match(slides, /guided\.map\(\(section, index\) => \(\{ key: 'guided-' \+ index, kind: 'guided', section \}\)\)/)
  for (const kind of ['checkin','idea','recall','phrase','guided','ritual','transfer','symbol','reflection','moment','feedback']) {
    assert.match(slides, new RegExp("kind: '" + kind + "'"))
  }
  assert.match(slides, /data-course-slide-player/)
  assert.match(slides, /aria-modal="true"/)
  assert.match(slides, /aria-valuenow=\{progress\}/)
  assert.match(slides, /data-slide-scroller/)
  assert.match(today, /<CourseSlidePlayer/)
  assert.match(today, /data-course-today-primary/)
  assert.match(today, /<CourseQuestMap/)
  assert.match(today, /<details className=\{styles\.courseInsights\} data-course-insights>/)
  assert.match(today, /<details className=\{styles\.classicPanel\}>/)
})

test('clinical questionnaire scoring and private storage are unchanged, rewards are only for server saved lessons', () => {
  assert.match(slides, /onCheckin\(\{/)
  assert.match(slides, /severity, interference: today\?\.interference \?\? null/)
  assert.match(slides, /expectedRevision:today\.revision/)
  assert.match(slides, /onSession\(\{/)
  assert.match(slides, /day:cycle\.day,lessonId:lesson\.id,operationId:sessionOp\.current/)
  assert.match(slides, /if \(response\) \{ sessionOp\.current = null; setEarned\(true\); setIndex\(slides\.length\) \}/)
  assert.match(slides, /alreadyDone = Boolean\(session\)/)
  assert.match(slides, /if \(alreadyDone\) \{ setIndex\(slides\.length\); return \}/)
  assert.match(slides, /if \(reviewOnly \|\| !Number\.isInteger\(severity\) \|\| \(today && severity === today\.severity\)\) \{ goNext\(\); return \}/)
  assert.match(slides, /preferNot: 'Prefer not to say'/)
  assert.doesNotMatch(slides, /localStorage|sessionStorage|dangerouslySetInnerHTML|sendBeacon|leaderboard|correctAnswer|wrongAnswer/)
  assert.match(slideCss, /\.error\{/)
  assert.match(slides, /role="alert"/)
})

test('mobile safe areas, touch targets, reduced-motion, focus return and EN/RU are deliberate', () => {
  assert.match(slides, /en: \{/)
  assert.match(slides, /ru: \{/)
  assert.match(slides, /event\.key === 'Escape'/)
  assert.match(slides, /event\.key !== 'Tab'/)
  assert.match(slides, /previous\?\.isConnected/)
  assert.match(slideCss, /height:100dvh/)
  assert.match(slideCss, /safe-area-inset-bottom/)
  assert.match(slideCss, /max-width:540px/)
  assert.match(slideCss, /min-height:53px/)
  assert.match(slideCss, /prefers-reduced-motion:reduce/)
  assert.match(css, /max-width:355px/)
  assert.match(mapCss, /max-width:350px/)
})
