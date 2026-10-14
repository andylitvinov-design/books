import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  TOPIC_JOURNEYS, JOURNEY_TOPIC_PROBLEMS, getTopicJourney,
  journeyFocusForTopics, journeyProblemsForTopics, normalizeJourneyTopicIds,
} from '../lib/assessments/topic-journeys.js'
import { problemsForTopics, normalizeProblemsForTopics } from '../lib/assessments/test-problems.js'
import {
  COURSE_ENTRY_INTENT_KEY, courseTagsForExplorerFocus,
  makeCourseEntryIntent, parseCourseEntryIntent, courseConcernsFromIntent,
} from '../lib/inner-growth/course-entry-intent.js'

test('all five guided journeys synchronize each of 20 subtopics with real selectable Step 2 concerns', () => {
  assert.equal(TOPIC_JOURNEYS.length, 5)
  for (const journey of TOPIC_JOURNEYS) {
    assert.equal(journey.topics.length, 4)
    for (const topic of journey.topics) {
      const focus = journeyFocusForTopics(journey, [topic.id])
      const concerns = journeyProblemsForTopics(journey, [topic.id])
      const available = new Set(problemsForTopics(focus).map(({key}) => key))
      assert.ok(JOURNEY_TOPIC_PROBLEMS[journey.id]?.[topic.id]?.length, journey.id + '/' + topic.id)
      assert.ok(concerns.length > 0, 'No mapped concerns for ' + journey.id + '/' + topic.id)
      assert.ok(concerns.every(key => available.has(key)), 'Invalid concern for ' + journey.id + '/' + topic.id)
      assert.deepEqual(normalizeProblemsForTopics(concerns, focus), concerns)
    }
  }
})

test('tampered and repeated topic IDs are rejected; unselected themes do not fabricate concerns', () => {
  const journey = getTopicJourney('business')
  assert.deepEqual(normalizeJourneyTopicIds(journey,'productivity,productivity,unknown,work-stress'),['productivity','work-stress'])
  assert.deepEqual(normalizeJourneyTopicIds(journey,'x'.repeat(190)),[])
  assert.deepEqual(normalizeJourneyTopicIds(null,'productivity'),[])
  assert.deepEqual(journeyProblemsForTopics(journey,[]),[])
  assert.deepEqual(journeyProblemsForTopics(journey,['unknown']),[])
  assert.deepEqual(journeyProblemsForTopics(journey,['productivity','work-stress']),
    normalizeProblemsForTopics([...JOURNEY_TOPIC_PROBLEMS.business.productivity,
      ...JOURNEY_TOPIC_PROBLEMS.business['work-stress']], journeyFocusForTopics(journey,['productivity','work-stress'])))
})

test('chosen test and topic IDs survive a short-lived consent-gated course handoff', () => {
  const now=1760440000000
  const raw=makeCourseEntryIntent([
    {key:'hh-weekly-pulse'},{key:'hh-weekly-pulse'},{key:'bad key'},{key:'valid_2'},
  ],{focus:['relationships','intimacy'],problems:['intimate-conversation','unknown']},now)
  assert.equal(COURSE_ENTRY_INTENT_KEY,'hh-personal-course-entry-v1')
  const entry=parseCourseEntryIntent(raw,now+30_000)
  assert.deepEqual(entry.focus,['relationships','intimacy'])
  assert.deepEqual(entry.problems,['intimate-conversation'])
  assert.deepEqual(entry.testKeys,['hh-weekly-pulse','valid_2'])
  assert.deepEqual(courseTagsForExplorerFocus(entry.focus),['relationships'])
  assert.match(courseConcernsFromIntent(entry,'ru'),/Трудно говорить об эмоциональной близости/)
  assert.equal(parseCourseEntryIntent(raw,now+3_600_001),null)
  assert.equal(parseCourseEntryIntent(raw,now-1),null)
  assert.equal(parseCourseEntryIntent('{invalid}',now),null)
  assert.equal(parseCourseEntryIntent('x'.repeat(2600),now),null)
  assert.deepEqual(courseTagsForExplorerFocus(['__unknown','resources','function']),['resources','attention'])
})

test('responsive primary action, automatic problem fill and personal course switch remain wired', async () => {
  const chooser=await readFile('components/topic-journey-selector.tsx','utf8')
  const chooserStyle=await readFile('components/topic-journey-selector.module.css','utf8')
  const route=await readFile('app/[locale]/client/tests/page.tsx','utf8')
  const picker=await readFile('components/app/simple-test-picker.jsx','utf8')
  const pickerStyle=await readFile('components/app/simple-test-picker.module.css','utf8')
  const explorer=await readFile('components/app/test-explorer.jsx','utf8')
  const publicExplorer=await readFile('components/app/public-test-explorer.jsx','utf8')
  const myCourse=await readFile('components/app/my-course.jsx','utf8')
  const steps=await readFile('components/app/course-r3-steps.jsx','utf8')
  assert.match(chooser,/className=\{styles\.primaryAction\} data-topic-action="tests"/)
  assert.match(chooser,/className=\{styles\.secondaryLink\} data-topic-action="course"/)
  assert.match(chooser,/className=\{styles\.secondaryLink\} data-topic-action="review"/)
  assert.match(chooser,/courseHref = testHref \+ '&mode=course'/)
  assert.match(chooserStyle,/@media\(max-width:630px\)/)
  assert.match(chooserStyle,/\.secondaryActions\{grid-template-columns:1fr/)
  assert.match(route,/journeyProblemsForTopics\(journey, chosenTopics\)/)
  assert.match(route,/initialPreferences = focus.length \? \{ focus, problems \}/)
  assert.match(route,/query\.mode === 'course'/)
  assert.match(publicExplorer,/COURSE_ENTRY_INTENT_KEY/)
  assert.match(publicExplorer,/onStartCourse=\{launchCourse\}/)
  assert.match(explorer,/onStartCourse=\{\(\) => onStartCourse\?\./)
  assert.match(picker,/data-test-course-switch/)
  assert.match(picker,/journeyMode === 'course' \? onStartCourse : onStart/)
  assert.match(pickerStyle,/\.modeSwitch\{/)
  assert.match(myCourse,/consent: true/)
  assert.match(myCourse,/courseTagsForExplorerFocus/)
  assert.match(steps,/parseCourseEntryIntent/)
  assert.match(steps,/removeItem\(COURSE_ENTRY_INTENT_KEY\)/)
  assert.match(chooser,/письменный разбор; живая расстановка/)
})
