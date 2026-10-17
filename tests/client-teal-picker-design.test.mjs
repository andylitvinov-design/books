import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const page = read('app/[locale]/client/page.tsx')
const picker = read('components/app/simple-test-picker.jsx')
const css = read('components/app/simple-test-picker.module.css')
const routeCss = read('app/[locale]/client/client-teal.css')

test('the approved teal refresh belongs to the public /client test picker, not the authenticated My Tests dashboard', () => {
  assert.match(page, /<CabinetLanding/)
  assert.match(page, /import "\.\/client-teal\.css"/)
  assert.match(picker, /data-client-tests-hero/)
  assert.match(picker, /data-client-tests-benefits/)
  assert.match(picker, /data-client-tests-promo/)
  assert.match(picker, /heroHeadline:'Лучше понять себя и свою жизнь'/)
  assert.match(picker, /heroHeadline:'Understand yourself and your life better'/)
  assert.ok(picker.includes('src="/images/holistic-house/assessment-coast.svg"'))
  assert.match(routeCss, /\.client-entry-shell \.house-header/)
})

test('the new entrance leads to the functioning first step, not a fake action', () => {
  assert.match(picker, /href="#hh-simple-topic-title"/)
  assert.match(picker, /id="hh-simple-topic-title"/)
  assert.match(css, /\.shell :global\(#hh-simple-topic-title\)\{scroll-margin-top:115px\}/)
  assert.match(picker, /TOPICS\.map/)
  assert.match(picker, /onToggleFocus\(key\)/)
  assert.match(picker, /problemsForTopics\(focus\)/)
  assert.match(picker, /onToggleProblem\(problem\.key\)/)
  assert.ok(picker.includes('<details className={styles.advanced} id="hh-more-test-filters">'))
})

test('test recommendations and start action remain wired without the unwanted controls', () => {
  assert.ok(picker.includes('browseRecommendations.slice(0, visibleCount)'))
  assert.match(picker, /entry\.matchPercent/)
  assert.match(picker, /entry\.durationMinutes/)
  assert.match(picker, /<TestScaleGuide guide=\{entry\.scaleGuide\}/)
  assert.match(picker, /onToggleTest\(entry\.key\)/)
  assert.doesNotMatch(picker, /data-test-course-switch|data-guest-start-notice/)
  assert.match(picker, /onClick=\{journeyMode === 'course' \? onStartCourse : onStart\}/)
})

test('the design is scoped and protects narrow mobile widths and keyboard navigation', () => {
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /@media\(max-width:370px\)/)
  assert.match(css, /overflow-x:clip/)
  assert.match(css, /:focus-visible/)
  assert.doesNotMatch(routeCss, /\.client-cabinet\s*\{/)
})
