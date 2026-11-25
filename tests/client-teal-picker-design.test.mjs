import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const page = read('app/[locale]/client/page.tsx')
const picker = read('components/app/simple-test-picker.jsx')
const css = read('components/app/simple-test-picker.module.css')
const routeCss = read('app/[locale]/client/client-teal.css')

test('public test hero reuses the home palette and photo while keeping the existing picker', () => {
  assert.ok(page.includes('<CabinetLanding'))
  assert.ok(page.includes('import "./client-teal.css"'))
  assert.ok(picker.includes('data-client-tests-hero'))
  assert.ok(picker.includes("heroHeadline:'Understand yourself. Find your next step.'"))
  assert.ok(picker.includes("heroHeadline:'Лучше поймите себя. Найдите следующий шаг.'"))
  assert.ok(picker.includes("heroHeadline:'Conócete mejor. Descubre tu próximo paso.'"))
  assert.doesNotMatch(picker, /data-client-tests-benefits|data-client-tests-promo/)
  assert.ok(!picker.includes('assessment-coast.svg'))
  assert.ok(css.includes('andy-about.png'))
  assert.ok(css.includes('.shell .heroActions .heroPrimary'))
  assert.ok(routeCss.includes('Public My Tests entry echoes the approved warm homepage masthead'))
})

test('the compact public finder links to tests, courses and assistance without losing the real topic and recommendations sections', () => {
  assert.ok(picker.includes('<DiscoverySectionTabs locale={locale} active="tests" />'))
  const tabs=read('components/discovery-section-tabs.tsx')
  assert.match(tabs, /\/client\/tests/)
  assert.match(tabs, /\/academy\/free-ai-courses/)
  assert.match(tabs, /\/services/)
  assert.match(tabs, /\/events/)
  assert.match(picker, /id="hh-simple-topic-title"/)
  assert.match(picker, /id="hh-simple-recommendations"/)
  assert.match(css, /\.shell :global\(#hh-simple-topic-title\)\{scroll-margin-top:115px\}/)
  assert.match(picker, /TOPICS\.map/)
  assert.match(picker, /onToggleFocus\(key\)/)
  assert.match(picker, /problemsForTopics\(concernFocus\)/)
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
