import { COURSE_JOURNEY, COURSE_PHASES } from '../data/inner-growth/course-journey.js'
import { SHARED_DAYS } from '../data/inner-growth/shared-days.js'
import { TRACKS, lessonFor, isCompleteLibrary } from '../lib/inner-growth/lesson-library.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  GROWTH_GOALS, COURSE_TOPICS, COURSE_STEPS,
  courseDay, courseLesson, growthSuggestions, suggestedCourseTopics,
} from '../lib/inner-growth/course-model.js'
import { courseRecommendedTests, courseMeasuredProfile, courseSuggestedFocus, goalForChosenScale } from '../lib/inner-growth/course-strategy.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Course describes exactly six EN/RU sequential steps and six optional goals', () => {
  assert.equal(COURSE_STEPS.length, 6)
  assert.equal(Object.keys(GROWTH_GOALS).length, 6)
  assert.ok(COURSE_TOPICS.every((topic) => topic.title.en && topic.title.ru))
  assert.ok(COURSE_STEPS.every((step) => step.en && step.ru && step.detail.en && step.detail.ru))
})

function weeklyResult(values = {}) {
  return {
    id: '36c5b778-74ba-4487-bfb9-5ed44ed95710',
    definitionKey: 'hh-weekly-pulse', definitionVersion: 'v1',
    scoringKey: 'raw-dimensions', scoringVersion: 'v1',
    measurementAt: new Date().toISOString(),
    dimensions: Object.entries(values).map(([key, value]) => ({
      key, value, min: 0, max: 10,
      direction: ({
        'weekly.tension': 'lower-reported-tension',
        'weekly.load': 'lower-reported-load',
        'weekly.recovery': 'higher-reported-recovery',
        'weekly.clarity': 'higher-reported-clarity',
        'weekly.connection': 'higher-reported-support',
      })[key],
    })),
  }
}

test('an original HH weekly response may suggest trainable resources with provenance, never a diagnosis', () => {
  const input = weeklyResult({ 'weekly.tension': 8, 'weekly.clarity': 2, 'weekly.connection': 3 })
  const suggestions = growthSuggestions([input], 'ru')
  assert.deepEqual(suggestions.map((s) => s.goal), [
    'calm_regulation', 'attention_clarity', 'connection_boundaries',
  ])
  assert.ok(suggestions.every((s) => s.resultId === input.id && s.measuredAt === input.measurementAt))
  assert.match(suggestions[0].reason, /не диагноз/)
})

test('do not invert healthy low symptom scores or assign deficiency to personality traits', () => {
  assert.deepEqual(growthSuggestions([weeklyResult({ 'weekly.tension': 1, 'weekly.load': 1 })]), [])
  const trait = { ...weeklyResult({ 'weekly.tension': 8 }), definitionKey: 'mini-ipip-20' }
  assert.deepEqual(growthSuggestions([trait]), [])
  const wrongDirection = weeklyResult({ 'weekly.tension': 9 })
  wrongDirection.dimensions[0].direction = 'higher-reported-wellbeing'
  assert.deepEqual(growthSuggestions([wrongDirection]), [])
})

test('personal concerns map to optional, editable topics without clinical inference', () => {
  const suggested = suggestedCourseTopics('I feel stress and cannot focus')
  assert.deepEqual(suggested, { urgent:false, topics:['stress','attention'] })
  assert.equal(suggestedCourseTopics('I want to kill myself').urgent, true)
  assert.deepEqual(suggestedCourseTopics('hello').topics, [])
})

test('outdated results do not drive current practice recommendations', () => {
  const old = weeklyResult({ 'weekly.tension': 8 })
  old.measurementAt = '2020-01-01T00:00:00Z'
  assert.deepEqual(growthSuggestions([old]), [])
})

test('daily sessions are bilingual and distinguish 14-day practice from later integration', () => {
  const ru = courseLesson('inner_support', 1, 'ru')
  const en = courseLesson('inner_support', 15, 'en')
  assert.match(ru.aphorism, /замечать/)
  assert.match(ru.meditation, /Опору|Заметьте|тело/i)
  assert.match(ru.ritual, /Запишите/)
  assert.ok(en.isIntegration)
  assert.notEqual(en.teaching, courseLesson('inner_support', 1, 'en').teaching)
  assert.equal(courseLesson('inner_support', 14, 'en').isIntegration, false)
  assert.equal(courseDay('2026-10-10T12:00:00Z', 14, Date.parse('2026-10-11T12:00:00Z')), 2)
  assert.equal(courseDay('2026-10-10T12:00:00Z', 14, Date.parse('2027-01-01T00:00:00Z')), 14)
})

test('one private six-milestone route reuses tests, insights and keeps mobile bottom navigation', () => {
  const page = read('app/[locale]/app/[[...path]]/page.jsx')
  const shell = read('components/app/app-workspace.jsx')
  const ui = read('components/app/my-course.jsx')
  const css = read('app/[locale]/app/[[...path]]/workspace.css')
  assert.match(page, /'course'/)
  assert.match(shell, /<MyCourse data=\{data\} locale=\{locale\}/)
  assert.match(shell, /root \+ '\/course'/)
  assert.match(shell, /hh-mobile-app-nav/)
  assert.match(css, /repeat\(6,minmax\(0,1fr\)\)/)
  const r3=read('components/app/course-r3-steps.jsx')
  assert.match(r3, /root\+'\/tests/)
  const completion=read('components/app/course-completion-review.jsx')
  assert.match(completion, /root\+'\/results\/'/)
  assert.match(ui, /COURSE_STEPS/)
})

test('course state is authenticated, encrypted, owner-scoped and not copied to browser storage', () => {
  const route = read('app/api/app/[...path]/route.js')
  const service = read('lib/app/growth-course.js')
  const migration = read('supabase/migrations/20261011184000_hh_my_course_r1.sql')
  assert.match(route, /const actor = await auth\.verified\(\)/)
  assert.match(route, /createGrowthCourseRepository/)
  assert.match(service, /transaction\(config, actor/)
  assert.match(service, /openSealed\(/)
  assert.match(service, /seal\(concerns/)
  assert.match(service, /where account_id=\$1/)
  assert.match(service, /COURSE_TESTS_REQUIRED/)
  assert.match(service, /COURSE_TESTS_REMAIN/)
  assert.match(service, /COURSE_SCALE_SELECTION_REQUIRED/)
  assert.match(service, /weeklyChange/)
  assert.match(service, /URGENT_SUPPORT_NEEDED/)
  assert.match(service, /REVISION_CONFLICT/)
  assert.match(migration, /references app\.accounts\(id\) on delete cascade/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /account_id=\(select auth\.uid\(\)\)/)
  const client = read('components/app/my-course.jsx')
  assert.doesNotMatch(client, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
  assert.doesNotMatch(service, /select \* from app\.assessment_runs(?! where account_id)/)
})

test('first-screen free start is separate from optional account-owned course intake', () => {
  const ui = read('components/app/my-course.jsx')
  const r3 = read('components/app/course-r3-steps.jsx')
  const css = read('components/app/my-course.module.css')
  const explorer = read('components/app/test-explorer.jsx')
  const battery = read('components/app/account-test-battery.jsx')

  const landing = ui.indexOf('stage === 0 && <header')
  const firstCta = ui.indexOf('{t.start}<ArrowRight', landing)
  const details = ui.indexOf('id="course-details"', landing)
  const intake = ui.indexOf('stage >= 1 && stage <= 3 && <CourseR3Steps', details)
  assert.ok(landing>=0 && firstCta>landing && details>firstCta && intake>details)
  assert.equal((ui.match(/\{t\.start\}<ArrowRight/g)||[]).length, 2)
  assert.match(ui, /ref=\{startDialogRef\}/)
  assert.match(ui, /startDialogRef\.current\?\.showModal\(\)/)
  assert.match(ui, /disabled=\{!optIn \|\| busy\}/)
  assert.match(ui, /void act\('start', \{ consent: true \}\)/)
  assert.match(css, /\.heroActions/)
  assert.match(css, /\.details/)

  assert.match(r3, /stage===1/)
  assert.match(r3, /onAct\('intake',\{concerns,focusTags\}\)/)
  assert.match(r3, /courseRecommendedTests/)
  assert.match(r3, /matchPercent/)
  assert.match(r3, /saveExistingAccountPlan/)
  assert.match(r3, /onCourseCommand\('confirm-tests',\{testKeys:chosenTests\}\)/)
  assert.match(r3, /stage===3/)
  assert.match(r3, /courseMeasuredProfile/)
  const review=read('components/app/course-completion-review.jsx')
  assert.match(r3, /<CourseCompletionReview/)
  assert.match(review, /className=\{styles\.briefSummary\}/)
  assert.match(review, /<meter min=\{scale\.min\} max=\{scale\.max\} value=\{scale\.score\}/)
  assert.match(r3, /chosenScales/)
  assert.match(r3, /role="alert"/)
  assert.match(battery, /const fromCourse = searchParams\.get\('course'\) === '1'/)
  assert.match(battery, /action: 'confirm-tests'/)
  assert.match(battery, /testKeys: valid/)
  assert.match(battery, /router\.replace\(fromCourse \? root \+ '\/course'/)
  assert.match(explorer, /const activeBattery = explicitSelectionOnly\s*\? selected/)
  assert.doesNotMatch(ui, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
  assert.doesNotMatch(r3, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('five auto-proposed test choices credit compatible historical results, but do not save automatically', () => {
  const history=weeklyResult({ 'weekly.tension': 8 })
  const proposed=courseRecommendedTests({focusTags:['stress','attention'],results:[history],locale:'en'})
  assert.ok(proposed.length>=5)
  assert.equal(proposed.filter(test=>test.recommended).length,5)
  assert.ok(proposed.every(test=>test.matchPercent>=0 && test.matchPercent<=99))
  assert.ok(proposed.every(test=>test.definitionVersion && test.instrumentLocale))
  assert.ok(!proposed.slice(0,5).some(test=>test.key==='hh-bach-flower-profile'),
    'Long optional Bach reflection cannot displace the five starter questionnaires')
  const existing=proposed.find(test=>test.key==='hh-weekly-pulse')
  assert.ok(existing?.completed)
  assert.equal(existing.resultId,history.id)
  assert.equal(courseRecommendedTests({focusTags:['stress'],results:[{...history,definitionVersion:'bad'}]})
    .find(test=>test.key==='hh-weekly-pulse')?.completed,false)
})

test('measured profile prioritizes high difficulties and low resources without ranking traits as deficits', () => {
  const history=weeklyResult({
    'weekly.tension': 8,'weekly.recovery': 2,'weekly.clarity': 3,'weekly.connection': 4,
  })
  const direction={
    'weekly.tension':'lower-reported-tension','weekly.recovery':'higher-reported-recovery',
    'weekly.clarity':'higher-reported-clarity','weekly.connection':'higher-reported-support',
  }
  history.dimensions.forEach(d=>{d.direction=direction[d.key]})
  const profile=courseMeasuredProfile({results:[history],testKeys:['hh-weekly-pulse']})
  const tension=profile.scales.find(item=>item.id==='hh-weekly-pulse::weekly.tension')
  const recovery=profile.scales.find(item=>item.id==='hh-weekly-pulse::weekly.recovery')
  assert.equal(tension?.priorityPercent,80)
  assert.equal(recovery?.priorityPercent,80)
  assert.equal(tension?.eligible,true)
  assert.equal(recovery?.eligible,true)
  assert.equal(profile.priority.length,profile.eligible.length)
  assert.ok(profile.priority.length<=7)
  assert.equal(goalForChosenScale(tension.id),'calm_regulation')
  const traits=courseMeasuredProfile({results:[{...history,definitionKey:'mini-ipip-20'}],testKeys:['mini-ipip-20']})
  assert.equal(traits.eligible.length,0)
  const wrong=weeklyResult({'weekly.tension':8})
  wrong.dimensions[0].direction='higher-reported-wellbeing'
  assert.equal(courseMeasuredProfile({results:[wrong],testKeys:['hh-weekly-pulse']}).eligible.length,0)
})

test('top-three focus recommendations use only genuine eligible scales in direction-aware order', () => {
  const input = weeklyResult({
    'weekly.tension': 7, 'weekly.recovery': 2, 'weekly.clarity': 4,
    'weekly.connection': 6,
  })
  const profile = courseMeasuredProfile({results:[input],testKeys:['hh-weekly-pulse']})
  const recommended = courseSuggestedFocus(profile,3)
  assert.equal(recommended.length,3)
  assert.deepEqual(recommended.map(item=>item.id),profile.eligible.slice(0,3).map(item=>item.id))
  assert.ok(recommended.every(item=>item.eligible && item.recent))
  assert.ok(recommended.every(item=>item.resultId===input.id && item.practice && item.label))
  assert.deepEqual(courseSuggestedFocus({eligible:[]}),[])
  assert.deepEqual(courseSuggestedFocus({eligible:[{id:'not-real',score:8,priorityPercent:90,eligible:false}]}),[])
  assert.deepEqual(courseSuggestedFocus(null),[])
})

test('course summary suggests three focus areas with direct stage-2 review to stage-4 start', () => {
  const r3=read('components/app/course-r3-steps.jsx')
  const review=read('components/app/course-completion-review.jsx')
  const picker=read('components/app/course-focus-picker.jsx')
  const css=read('components/app/course-r3-steps.module.css')
  const finishCss=read('components/app/test-finish-actions.module.css')
  assert.match(r3,/courseSuggestedFocus\(profile,3\)/)
  assert.match(r3,/onSuggested=\{\(\)=>submitFocusSelection\(suggestedScales\.map/)
  assert.match(r3,/const reviewed=await onCourseCommand\('review'\)/)
  assert.match(r3,/revision=reviewed\.course\.revision/)
  assert.match(r3,/action:'choose-goals',expectedRevision:revision/)
  assert.match(r3,/consent:true,durationDays:14/)
  assert.match(r3,/onAlternative=\{openManualFocus\}/)
  assert.match(r3,/setScaleView\('manual'\)/)
  assert.match(r3,/setScaleView\('recommended'\)/)
  assert.match(r3,/<CourseFocusPicker/)
  assert.match(review,/data-course-recommended-focus/)
  assert.match(review,/data-course-use-suggested/)
  assert.match(review,/data-course-choose-other-scales/)
  assert.match(review,/t\.acceptSuggested\.replace\('\{count\}'/)
  assert.match(picker,/profile\.eligible\.map/)
  assert.match(picker,/data-course-confirm-manual-scales/)
  assert.match(picker,/data-course-back-to-suggested/)
  assert.match(picker,/chosenScales\.length >= 5/)
  assert.match(css,/\.focusActions > button\.burgundyPrimary\{[\s\S]*?background:#b64b31!important/)
  assert.match(css,/\.focusActions > button\.whiteSecondary\{[\s\S]*?background:#fffdf9!important/)
  assert.match(css,/@media\(max-width:530px\)/)
  assert.match(finishCss,/:global\(\.hh-app\) \.wrap > button\.courseNext/)
  assert.match(finishCss,/grid-column:1 \/ -1/)
  assert.match(finishCss,/background:#b64b31!important/)
})

test('daily course form and lesson CTA styling match the post-test review', () => {
  const jsx=read('components/app/course-today.jsx')
  const css=read('components/app/course-today.module.css')
  assert.match(jsx,/data-course-activation/)
  assert.match(jsx,/styles\.activatePanel/)
  assert.match(jsx,/styles\.activatePrimary/)
  assert.match(css,/\.activateHeading/)
  assert.match(css,/\.activateFields/)
  assert.match(css,/\.shell \.cardTitle strong/)
  assert.match(css,/\.shell button\.nextButton/)
})


test('14-day course passport has fourteen distinct bilingual steps aligned to the approved arc', () => {
  assert.equal(COURSE_JOURNEY.length, 14)
  assert.deepEqual(COURSE_JOURNEY.map(item => item.day), Array.from({ length: 14 }, (_, i) => i + 1))
  const headings = new Set()
  for (const [index, arc] of COURSE_JOURNEY.entries()) {
    assert.equal(arc.phase, SHARED_DAYS[index].phase)
    assert.ok(COURSE_PHASES[arc.phase])
    for (const language of ['en', 'ru']) {
      assert.ok(arc.heading[language]?.length > 5)
      assert.ok(arc.purpose[language]?.length > 15)
      assert.ok(arc.outcome[language]?.length > 5)
      assert.ok(COURSE_PHASES[arc.phase][language])
      headings.add(language + ':' + arc.heading[language])
    }
  }
  assert.equal(headings.size, 28)
  assert.equal(COURSE_JOURNEY[6].phase, 'review')
  assert.equal(COURSE_JOURNEY[13].phase, 'review')
})

test('all 84 existing personal lessons retain unique texts and show the new day passport in English and Russian', () => {
  assert.equal(Object.keys(TRACKS).length, 6)
  assert.equal(Object.values(TRACKS).reduce((sum, items) => sum + items.length, 0), 84)
  assert.ok(isCompleteLibrary())
  for (const domain of Object.keys(TRACKS)) {
    for (let day = 1; day <= 14; day++) {
      const en = lessonFor(domain, day, 'en', 'standard')
      const ru = lessonFor(domain, day, 'ru', 'quick')
      assert.ok(en && ru)
      assert.equal(en.day, day)
      assert.equal(en.journey.heading, COURSE_JOURNEY[day - 1].heading.en)
      assert.equal(ru.journey.outcome, COURSE_JOURNEY[day - 1].outcome.ru)
      assert.equal(en.journey.phase, SHARED_DAYS[day - 1].phase)
      assert.equal(en.sections.length, 5)
      assert.equal(ru.sections.length, 5)
      assert.notEqual(en.title, ru.title)
      assert.ok(en.ritual.length > 10)
      assert.ok(ru.ritual.length > 10)
    }
  }
})

test('personal 14-day roadmap uses the same day-specific approved focus and real saved completion state', () => {
  const server = read('lib/app/growth-daily.js')
  const ui = read('components/app/course-today.jsx')
  const css = read('components/app/course-today.module.css')
  assert.match(server, /const roadmap=COURSE_JOURNEY\.map/)
  assert.match(server, /coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,plannedDay,locale\)/)
  assert.match(server, /Boolean\(history\.days\[plannedDay-1\]\?\.sessionCompleted\)/)
  assert.match(server, /roadmap,/)
  assert.match(ui, /data-course-journey/)
  assert.match(ui, /data-day-state=\{item\.status\}/)
  assert.match(ui, /data-course-card=\{number\}/)
  assert.match(ui, /guidedSections=\(lesson\?\.sections\|\|\[\]\)\.filter/)
  assert.match(ui, /\['arrive','meditation','finish'\]/)
  assert.doesNotMatch(ui, /seconds=\{lesson\.sections\[stage\]\.seconds\}/)
  assert.match(css, /\.journeyGrid/)
  assert.match(css, /\.journeyDay\[data-day-state='today'\]/)
  assert.match(css, /background:#b64b31/)
})
