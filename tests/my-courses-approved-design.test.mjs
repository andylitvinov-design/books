import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const component = read('components/app/course-entry-selector.jsx')
const css = read('components/app/course-entry-selector.module.css')

test('approved My Courses dashboard has localized course plan and explanatory benefits', () => {
  assert.match(component, /motto: 'Лучшее в тебе уже здесь'/)
  assert.match(component, /benefitsTitle: 'Что вы найдёте в наших курсах'/)
  assert.match(component, /benefitsTitle: 'What you will find in your courses'/)
  assert.match(component, /<Course14DayOverview locale=\{locale\}\s+programId=\{courseProgramFromTopics/)
  assert.match(component, /aria-expanded={showPlan}/)
  assert.match(component, /data-current-course-card/)
  assert.match(component, /data-add-course/)
  assert.match(component, /className={styles\.benefits}/)
})

test('progress continues to depend on saved completed lessons', () => {
  assert.match(component, /daily\.progress\.practiceCount/)
  assert.match(component, /completed \/ 14 \* 100/)
  assert.match(component, /const nextLesson = completed === null/)
  assert.match(component, /onClick={onOpen}/)
})

test('adding a paid parallel course still uses informational gate', () => {
  assert.match(component, /dialogRef\.current\?\.showModal\(\)/)
  assert.match(component, /Subscription checkout is not available yet/)
  assert.doesNotMatch(component, /checkout\/start|stripe\.redirect/)
})

test('approved responsive layout includes compact plan button and two-column benefits on phones', () => {
  assert.match(css, /\.tiles\{grid-template-columns:minmax\(0,1fr\)/)
  assert.match(css, /\.courseActions\{display:grid/)
  assert.match(css, /\.planButton\{/)
  assert.match(css, /\.benefitGrid\{display:grid/)
  assert.match(css, /@media\(max-width:690px\)/)
  assert.match(css, /\.benefitGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})
