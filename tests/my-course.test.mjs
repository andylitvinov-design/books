import { COURSE_CONTENT_V3, V3_CORE_DAYS, V3_SUPPORT_DAYS, v3FocusChoiceIndex, v3ReturnSuggestion } from '../lib/inner-growth/course-v3.js'
import { COURSE_CONTENT_V4 } from '../lib/inner-growth/course-v4.js'
import { SYMBOLIC_LAB_V4, symbolicLabDay } from '../data/inner-growth/symbolic-lab-v4.js'
import { DEEP_PRACTICE_DAYS, deepPracticeDay } from '../data/inner-growth/deep-practice-v3.js'
import { WORKBOOK_DAYS, workbookDay } from '../data/inner-growth/workbook-days.js'
import { COURSE_JOURNEY, COURSE_PHASES } from '../data/inner-growth/course-journey.js'
import { COURSE_PRE_ENROLMENT_PHASES, coursePreEnrolmentPlan } from '../lib/inner-growth/course-pre-enrolment.js'
import { SHARED_DAYS } from '../data/inner-growth/shared-days.js'
import { TRACKS, lessonFor, isCompleteLibrary, COURSE_CONTENT_VERSION, COURSE_WORKBOOK_VERSION, COURSE_ANTISTRESS_OUTCOME_V3, COURSE_ANTISTRESS_SKILLS_V5, COURSE_ANTISTRESS_SKILLS_V6, COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/lesson-library.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  GROWTH_GOALS, COURSE_TOPICS, COURSE_STEPS,
  courseDay, courseLesson, growthSuggestions, suggestedCourseTopics,
} from '../lib/inner-growth/course-model.js'
import { courseRecommendedTests, courseMeasuredProfile, courseSuggestedFocus, goalForChosenScale, coursePracticeFocus, courseNextCycleScaleKeys } from '../lib/inner-growth/course-strategy.js'
import { getAssessmentDefinition, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'

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
    ...provenance(getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')),
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

// Unlike the lightweight marketing fixture, an automatic course priority MUST
// receive the complete immutable scorer output, including every dimension,
 // exact shape and metadata. Never weaken the source validator for synthetic tests.
function scoredWeeklyResult(values = {}) {
  const def = getAssessmentDefinition('hh-weekly-pulse','v1','en')
  const answers = Object.fromEntries(def.questions.map(question =>
    [question.id, Object.hasOwn(values,question.id) ? values[question.id] : 5]))
  return {
    ...scoreAssessment(def,answers),
    id:'36c5b778-74ba-4487-bfb9-5ed44ed95710',
    measurementAt:new Date().toISOString(),
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
  assert.match(service, /runTransaction\(config, actor/)
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

test('first-screen preset and personal choices use one deliberate click before account-owned intake', () => {
  const ui = read('components/app/my-course.jsx')
  const r3 = read('components/app/course-r3-steps.jsx')
  const css = read('components/app/my-course.module.css')
  const explorer = read('components/app/test-explorer.jsx')
  const battery = read('components/app/account-test-battery.jsx')

  const landing = ui.indexOf('stage === 0 && <header')
  const firstCta = ui.indexOf('<CoursePresetCatalog locale={locale}', landing)
  const details = ui.indexOf('id="course-details"', landing)
  const intake = ui.indexOf('stage >= 1 && stage <= 3 && <CourseR3Steps', details)
  assert.ok(landing>=0 && firstCta>landing && details>firstCta && intake>details)
  const catalog = read('components/app/course-preset-catalog.jsx')
  assert.match(catalog, /onClick=\{\(\)=>onPreset\(preset\.id\)\}/)
  assert.match(catalog, /onClick=\{onPersonal\}/)
  assert.match(ui, /function startSelectedCourse\(presetId = null, programId = null\)/)
  assert.match(ui, /if \(busy \|\| actionLock\.current/)
  assert.match(ui, /newCourse: access\?\.multiCourseEnabled === true/)
  assert.match(ui, /const values = \{ consent: true,/)
  assert.match(ui, /void act\('start', values\)/)
  assert.match(ui, /presetId \? \{ presetId \} : \{\}/)
  assert.doesNotMatch(ui, /ref=\{startDialogRef\}|showModal\(\)/)
  assert.doesNotMatch(ui, /disabled=\{!optIn \|\| busy\}/)
  assert.match(ui, /requestedCourseId=restartingClosed \? state\.course\.id : newCourseId\.current/)
  assert.match(ui, /expectedRevision: started\.course\.revision/)
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
  assert.match(battery, /router\.replace\(fromCourse \? courseHref\(\{\}, returnCourseId\)/)
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
  const history=scoredWeeklyResult({
    'weekly.tension': 8,'weekly.recovery': 2,'weekly.clarity': 3,'weekly.connection': 4,
  })
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
  const wrong=scoredWeeklyResult({'weekly.tension':8})
  wrong.dimensions=wrong.dimensions.map(d => d.key==='weekly.tension'
    ? {...d,direction:'higher-reported-wellbeing'} : d)
  assert.equal(courseMeasuredProfile({results:[wrong],testKeys:['hh-weekly-pulse']}).eligible.length,0)
})

test('previously consented relationship focus can continue without becoming an automatic new target', () => {
  const previous = ['hh-weekly-pulse::weekly.tension',
    'hh-weekly-pulse::weekly.recovery','hh-weekly-pulse::weekly.connection']
  // The single-item connection/support answer is no longer a supported *new*
  // automatic gap, but the user's saved course must remain resumable.
  assert.equal(goalForChosenScale(previous[2]), null)
  assert.deepEqual(courseNextCycleScaleKeys(previous,'connection_boundaries'),
    [previous[2],previous[0],previous[1]])
  assert.equal(courseNextCycleScaleKeys(previous,'meaning'),null)
})

test('top-three focus recommendations use only genuine eligible scales in direction-aware order', () => {
  const input = scoredWeeklyResult({
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
  assert.match(r3,/const payload=\{\s*action:'choose-goals',expectedRevision:revision,/)
  assert.match(r3,/startCourseWithRecovery\(async body=>\{\s*ensureCurrent\(\)\s*const response=body\s*\? await onCourseCommand\('choose-goals',body\)\s*: await onCourseRead\(\)\s*return ensureCourseResponse\(response\)\s*\},payload\)/)
  assert.match(r3,/ensureCourseResponse\(result\)\s*onState\(result\)/)
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
  assert.match(server, /coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,plannedDay,locale,contentVersion\)/)
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


test('skills workbook v2 includes fourteen unique, bilingual, non-clinical learning prompts',()=>{
  assert.equal(WORKBOOK_DAYS.length,14)
  assert.equal(new Set(WORKBOOK_DAYS.map(item=>item.key)).size,14)
  assert.deepEqual(WORKBOOK_DAYS.map(item=>item.day),Array.from({length:14},(_,i)=>i+1))
  for(const day of WORKBOOK_DAYS) {
    for(const locale of ['ru','en']) {
      const item=workbookDay(day.day,locale)
      assert.equal(item.day,day.day)
      for(const field of ['method','skill','question','sentenceStarter','microPractice','workingPosition','takeaway']) {
        assert.ok(item[field]?.length>=10,day.key+' lacks '+locale+' '+field)
      }
    }
  }
  assert.equal(workbookDay(0),null)
  assert.equal(workbookDay(15),null)
  assert.equal(workbookDay(2.5),null)
  assert.match(workbookDay(3,'ru').question,/правил/)
  assert.match(workbookDay(5,'en').microPractice,/believable|neutral/i)
  assert.match(workbookDay(9,'ru').sentenceStarter,/Если/)
  assert.match(workbookDay(14,'en').microPractice,/not a guarantee/i)
})

test('all 84 current lessons gain workbooks without changing legacy lesson IDs',()=>{
  for(const [domain,lessons] of Object.entries(TRACKS)) {
    assert.equal(lessons.length,14)
    for(let day=1;day<=14;day++) {
      const en=lessonFor(domain,day,'en')
      const ru=lessonFor(domain,day,'ru')
      assert.match(en.id,/hh-growth-r2-v1$/)
      assert.equal(en.id,ru.id)
      assert.equal(en.workbook.key,workbookDay(day).key)
      assert.equal(ru.workbook.question,workbookDay(day,'ru').question)
      assert.equal(en.journey.phase,COURSE_JOURNEY[day-1].phase)
      assert.ok(en.workbook.version && en.workbook.version===ru.workbook.version)
      assert.equal(en.sections.length,5)
    }
  }
})

test('workbook content appears in daily cards while private journal remains owner-scoped and sealed',()=>{
  const service=read('lib/app/growth-daily.js')
  const jsx=read('components/app/course-today.jsx')
  const css=read('components/app/course-today.module.css')
  assert.match(service,/const anchor=primary/)
  assert.match(service,/primary\.grounding\[lang\]/)
  assert.match(service,/activePreferences\.imagery==='no_imagery'/)
  assert.match(service,/effectiveLessonPreferences\(cycle\.preferences/)
  assert.match(service,/workbookSkill:preview\?\.workbook\?\.skill/)
  assert.match(service,/reflection:openSealed\(currentSession\.reflection_ciphertext/)
  assert.match(service,/where account_id=\$1 and cycle_id=\$2/)
  assert.match(jsx,/data-course-workbook/)
  assert.match(jsx,/data-course-micro-experiment/)
  assert.match(jsx,/data-course-continuation/)
  assert.match(jsx,/setReflection\(response\.currentSession\.reflection\|\|''\)/)
  assert.match(jsx,/placeholder=\{lesson\?\.workbook\?\.sentenceStarter/)
  assert.match(jsx,/readOnly=\{completed\}/)
  assert.match(jsx,/maxLength=\{500\}/)
  assert.doesNotMatch(jsx,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
  assert.match(css,/\.workbookPrompt/)
  assert.match(css,/\.workbookTask/)
  assert.match(css,/\.anchorBox/)
})


test('workbook v2 covers 14 distinct, progressive, original bilingual skills', () => {
  assert.equal(WORKBOOK_DAYS.length, 14)
  assert.deepEqual(WORKBOOK_DAYS.map(day => day.day), Array.from({length:14},(_,i)=>i+1))
  assert.equal(new Set(WORKBOOK_DAYS.map(day=>day.key)).size,14)
  assert.equal(COURSE_CONTENT_VERSION,'hh-growth-r2-v1','preserve old lesson IDs on active cycles')
  assert.match(COURSE_WORKBOOK_VERSION,/hh-workbook-v2/)
  assert.equal(workbookDay(0,'en'),null)
  assert.equal(workbookDay(15,'ru'),null)
  assert.equal(workbookDay(7.5,'en'),null)
  for (const item of WORKBOOK_DAYS){
    for(const language of ['en','ru']){
      const version=workbookDay(item.day,language)
      assert.equal(version.day,item.day)
      for(const field of ['method','skill','question','sentenceStarter','microPractice','workingPosition','takeaway']){
        assert.ok(version[field]?.trim()?.length>=16,field+' '+item.day+' '+language)
      }
      assert.ok(!/(cure|guaranteed|diagnos[eis]|change your medicine)/i.test(version.microPractice))
    }
    for(const domain of Object.keys(TRACKS)){
      const en=lessonFor(domain,item.day,'en')
      const ru=lessonFor(domain,item.day,'ru')
      assert.equal(en.workbook.key,item.key)
      assert.equal(ru.workbook.key,item.key)
      assert.equal(en.workbook.version,COURSE_WORKBOOK_VERSION)
      assert.equal(ru.workbook.version,COURSE_WORKBOOK_VERSION)
    }
  }
  assert.ok(WORKBOOK_DAYS[5].key.includes('experiment'))
  assert.ok(WORKBOOK_DAYS[8].key.includes('if-then'))
  assert.ok(WORKBOOK_DAYS[13].key.includes('maintenance'))
})

test('workbook personal notes use existing owner scoped encrypted course session with no new public save path', () => {
  const ui=read('components/app/course-today.jsx')
  const server=read('lib/app/growth-daily.js')
  const lesson=read('lib/inner-growth/lesson-library.js')
  const css=read('components/app/course-today.module.css')
  assert.match(ui,/data-course-workbook/)
  assert.match(ui,/data-course-micro-experiment/)
  assert.match(ui,/lesson\.workbook\.question/)
  assert.match(ui,/lesson\.workbook\.workingPosition/)
  assert.match(ui,/lesson\.workbook\.sentenceStarter/)
  assert.match(ui,/data-course-continuation/)
  assert.match(ui,/readOnly=\{completed\}/)
  assert.match(ui,/const hydratedDayRef=useRef\(''\)/)
  assert.match(ui,/if\(nextDay!==hydratedDayRef\.current\)/)
  assert.match(ui,/setReflection\(response\?\.currentSession\?\.reflection\|\|''\)/)
  assert.match(server,/reflection:openSealed\(currentSession\.reflection_ciphertext,context\(actor,currentSession\.id,'course\.session_note'\),config\)/)
  assert.match(server,/seal\(reflection,context\(actor,id,'course\.session_note'\),config\)/)
  assert.match(server,/where account_id=\$1 and cycle_id=\$2/)
  assert.match(server,/workbookSkill:preview\?\.workbook\?\.skill/)
  assert.match(server,/const journalHistory=sessions\.filter\(row=>row\.reflection_ciphertext\)/)
  assert.match(server,/reflection:openSealed\(row\.reflection_ciphertext,context\(actor,row\.id,'course\.session_note'\),config\)/)
  assert.match(server,/journalHistory,/)
  assert.match(ui,/data-course-journal-history/)
  assert.match(ui,/data\.journalHistory\.map/)
  assert.match(css,/\.workbookHistory/)

  assert.match(server,/const anchor=primary\?\{/)
  assert.match(lesson,/COURSE_WORKBOOK_VERSION/)
  assert.match(css,/\.workbookPrompt/)
  assert.match(css,/\.workbookTask/)
  assert.match(css,/\.workbookFinish/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
})


test('V3 has fourteen bilingual recall–action–reflection lessons while preserving 84 authored track lessons', () => {
  assert.equal(DEEP_PRACTICE_DAYS.length,14)
  const distinct=new Set()
  for(let day=1;day<=14;day++){
    const ru=deepPracticeDay(day,'ru'),en=deepPracticeDay(day,'en')
    assert.equal(ru.day,day)
    assert.equal(en.day,day)
    for(const lang of [ru,en]){
      for(const field of ['recall','microAction','review']) assert.ok(lang[field].length>40,field+' '+day)
      distinct.add(lang.recall)
    }
    for(const domain of Object.keys(TRACKS)){
      const prior=lessonFor(domain,day,'en','standard')
      const updated=lessonFor(domain,day,'en','standard',COURSE_CONTENT_V3)
      assert.equal(updated.version,COURSE_CONTENT_V3)
      assert.equal(prior.version,COURSE_CONTENT_VERSION)
      assert.notEqual(updated.id,prior.id)
      assert.equal(updated.title,prior.title)
      assert.equal(updated.ritual,prior.ritual)
      assert.deepEqual(updated.sections,prior.sections)
      assert.deepEqual(updated.workbook,prior.workbook)
      assert.deepEqual(updated.practiceV3,deepPracticeDay(day,'en'))
      assert.deepEqual(lessonFor(domain,day,'ru','quick',COURSE_CONTENT_V3).practiceV3,ru)
    }
  }
  assert.equal(distinct.size,28)
  assert.equal(deepPracticeDay(0),null)
  assert.equal(deepPracticeDay(15),null)
  assert.equal(deepPracticeDay(2.5),null)
})

test('V3 consistently gives six primary lessons and all supporting skills repeated without altering R2 rotation', () => {
  assert.deepEqual(V3_CORE_DAYS,[1,2,4,6,9,14])
  assert.equal(V3_SUPPORT_DAYS.length,8)
  for(let choiceCount=2;choiceCount<=5;choiceCount++){
    const indices=Array.from({length:14},(_,i)=>v3FocusChoiceIndex(i+1,choiceCount))
    assert.equal(indices.filter(i=>i===0).length,6)
    for(let other=1;other<choiceCount;other++) assert.ok(indices.filter(i=>i===other).length>=2)
    assert.equal(indices[13],0,'day 14 returns to the main skill')
  }
  assert.equal(v3FocusChoiceIndex(1,1),0)
  assert.equal(v3FocusChoiceIndex(1,0),null)
  assert.equal(v3FocusChoiceIndex(0,3),null)
  assert.equal(v3FocusChoiceIndex(15,3),null)
  const scales=['weekly.tension','weekly.recovery','weekly.clarity','weekly.connection','weekly.mood']
    .map(key=>'hh-weekly-pulse::'+key)
  const r2=coursePracticeFocus(scales,'calm_regulation',2,'en')
  const v3=coursePracticeFocus(scales,'calm_regulation',2,'en',COURSE_CONTENT_V3)
  assert.equal(r2.scaleId,scales[1])
  assert.equal(v3.scaleId,scales[0])
  assert.equal(v3.role,'primary')
  for(let day=1;day<=14;day++){
    const item=coursePracticeFocus(scales,'calm_regulation',day,'en',COURSE_CONTENT_V3)
    assert.equal(item.scaleId,scales[v3FocusChoiceIndex(day,5)])
    assert.ok(['primary','support'].includes(item.role))
  }
  assert.equal(coursePracticeFocus([], 'inner_support',8,'ru',COURSE_CONTENT_V3).goal,'inner_support')
})

test('V3 re-entry hints are nonclinical, optional and do not misrepresent missing days', () => {
  assert.equal(v3ReturnSuggestion({day:2,sessions:[]}),null)
  assert.equal(v3ReturnSuggestion({day:4,sessions:[]}), 'restart')
  assert.equal(v3ReturnSuggestion({day:7,sessions:[{day:3,feedback:'neutral'}]}),'restart')
  assert.equal(v3ReturnSuggestion({day:7,sessions:[{day:6,feedback:'uncomfortable'}]}),'gentle')
  assert.equal(v3ReturnSuggestion({day:7,sessions:[{day:6,feedback:'helped'}]}),null)
  assert.equal(v3ReturnSuggestion({day:17,sessions:[]}),null)
})

test('stored content versions are preserved and use the exact same lesson ID for display and authenticated save', async () => {
  const service=read('lib/app/growth-daily.js')
  const component=read('components/app/course-today.jsx')
  const css=read('components/app/course-today.module.css')
  assert.match(service,/goal,nextContentVersion,local,zone/)
  assert.match(service,/nextContentVersion=courseProgramFromTopics/)
  const {repositoryHarness}=await import('./helpers/route-pipeline-harness.mjs')
  for(const version of [COURSE_CONTENT_V3,COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3,
    COURSE_ANTISTRESS_SKILLS_V5,COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7]){
    const owner=repositoryHarness({freshPhase:true}),created=await owner.create('AS2')
    assert.equal(created.content_version,COURSE_ANTISTRESS_SKILLS_V7,'Only new AS2 selects the current V7')
    // Model an already-persisted cycle before exercising the real read resolver.
    owner.cycle.content_version=version
    owner.seedDay(2)
    const writesBefore=owner.writes.length
    const daily=await owner.read('en')
    assert.equal(daily.lesson.version,version)
    assert.equal(daily.lesson.id,lessonFor('calm_regulation',2,'en','standard',version).id)
    assert.equal(owner.cycle.content_version,version)
    assert.equal(owner.writes.length,writesBefore,'A read never migrates historical content')
  }
  assert.match(service,/const contentVersion=resolveCycleVersion\(cycle\.content_version\)/)
  assert.match(service,/coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,dayInfo\.day,locale,contentVersion\)/)
  assert.match(service,/coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,plannedDay,locale,contentVersion\)/)
  assert.match(service,/coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,today\.day,locale,version\)/)
  assert.match(service,/const lesson=lessonFor\(focus\.goal,today\.day,'en','standard',version\)/)
  assert.match(service,/input\.lessonId!==lesson\.id/)
  assert.match(service,/lesson\.id,version,before,after/)
  assert.match(service,/where account_id=\$1 and cycle_id=\$2/)
  for (const required of ['data-course-primary-skill','data-course-active-recall','data-course-skill-transfer','data-course-learning-evidence','data-course-gentle-return','data-course-reflection-transfer']) {
    assert.ok(component.includes(required), required)
  }
  assert.match(component,/hasComparableWeeks/)
  assert.match(component,/isV3&&/)
  assert.match(css,/\.recallCard/)
  assert.match(css,/\.transferCard/)
  assert.match(css,/\.learningEvidence/)
  assert.doesNotMatch(component,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
  assert.doesNotMatch(service,/select \* from app_private\.growth_sessions(?! where account_id)/)
})


test('client consciously chooses or confirms the V3 main skill before activating the cycle',()=>{
  const picker=read('components/app/course-focus-picker.jsx')
  const pickerCss=read('components/app/course-r3-steps.module.css')
  const steps=read('components/app/course-r3-steps.jsx')
  const summary=read('components/app/course-completion-review.jsx')
  const service=read('lib/app/growth-course.js')
  assert.match(picker,/data-course-primary-scale-choice/)
  assert.match(picker,/id="course-main-scale"/)
  assert.match(picker,/onSetPrimaryScale\?\.\(event\.target\.value\)/)
  assert.match(steps,/onSetPrimaryScale=\{key=>setChosenScales/)
  assert.match(steps,/mainSkillTitle:/)
  assert.match(steps,/mainSkillHelp:/)
  assert.match(summary,/index===0&&/)
  assert.match(summary,/t\.mainSkillTitle/)
  assert.match(pickerCss,/\.primaryScaleChoice/)
  assert.match(service,/scales = strictArray\(body\.scaleKeys/)
  assert.match(service,/scale_keys=\$3/)
})

test('V4 optional symbolic laboratory offers 14 distinct original EN/RU exercises without diagnosis or forced imagery', () => {
  assert.equal(SYMBOLIC_LAB_V4.length,14)
  assert.equal(new Set(SYMBOLIC_LAB_V4.map(item=>item.key)).size,14)
  for(let day=1;day<=14;day++){
    const en=symbolicLabDay(day,'en'),ru=symbolicLabDay(day,'ru')
    assert.equal(en.day,day);assert.equal(ru.day,day)
    assert.notEqual(en.symbol,ru.symbol)
    assert.ok(en.optional && ru.optional)
    for(const item of [en,ru]){
      for(const field of ['element','symbol','invitation','withoutImagery','artifact']){
        assert.ok(typeof item[field]==='string' && item[field].length > 6,field+' '+day)
      }
      assert.notEqual(item.invitation,item.withoutImagery)
      assert.ok(item.source.includes('original'))
    }
  }
  assert.equal(symbolicLabDay(0),null)
  assert.equal(symbolicLabDay(15),null)
  assert.equal(symbolicLabDay(3.2),null)
})

test('V4 pins new cycles while preserving old V2 and V3 lesson IDs, scales, scores and track content', () => {
  for(const goal of Object.keys(TRACKS))for(let day=1;day<=14;day++){
    const r2=lessonFor(goal,day,'en','standard',COURSE_CONTENT_VERSION)
    const r3=lessonFor(goal,day,'en','standard',COURSE_CONTENT_V3)
    const r4=lessonFor(goal,day,'en','standard',COURSE_CONTENT_V4)
    const ru=lessonFor(goal,day,'ru','quick',COURSE_CONTENT_V4)
    assert.equal(r4.version,COURSE_CONTENT_V4)
    assert.notEqual(r4.id,r3.id)
    assert.notEqual(r4.id,r2.id)
    assert.deepEqual(r4.sections,r3.sections)
    assert.deepEqual(r4.workbook,r3.workbook)
    assert.deepEqual(r4.practiceV3,r3.practiceV3)
    assert.equal(r3.practiceV4,undefined)
    assert.equal(r2.practiceV4,undefined)
    assert.deepEqual(r4.practiceV4,symbolicLabDay(day,'en'))
    assert.deepEqual(ru.practiceV4,symbolicLabDay(day,'ru'))
    assert.equal(r4.id,ru.id)
  }
  const keys=['hh-weekly-pulse::weekly.tension','hh-weekly-pulse::weekly.clarity']
  for(let day=1;day<=14;day++){
    const old=coursePracticeFocus(keys,'calm_regulation',day,'en',COURSE_CONTENT_V3)
    const next=coursePracticeFocus(keys,'calm_regulation',day,'en',COURSE_CONTENT_V4)
    assert.deepEqual(next,old,'V4 must inherit spaced primary-skill schedule')
  }
})

test('V4 daily layout offers one primary Today CTA, optional foldable roadmap and non-imagery symbolic practice', () => {
  const ui=read('components/app/course-today.jsx')
  const css=read('components/app/course-today.module.css')
  const server=read('lib/app/growth-daily.js')
  assert.match(ui,/data-course-today-primary/)
  assert.match(ui,/<details className=\{styles\.journeyPanel\} data-course-journey>/)
  assert.match(ui,/data-course-symbolic-lab/)
  assert.match(ui,/lesson\.practiceV4\.withoutImagery/)
  assert.match(ui,/cycle\.preferences\?\.imagery==='no_imagery'/)
  assert.match(ui,/data-course-card=\{number\}/)
  assert.match(css,/\.todayPrimary\{/)
  assert.match(css,/\.symbolLab\{/)
  assert.match(css,/\.journeyPanel>summary\.journeyHeading/)
  assert.match(server,/const version=resolveCycleVersion\(cycle\.content_version\)/)
  assert.match(server,/const lesson=lessonFor\(focus\.goal,today\.day,'en','standard',version\)/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('pre-enrolment preview covers all 14 source-of-truth days in four concise bilingual stages', () => {
  assert.equal(COURSE_PRE_ENROLMENT_PHASES.length,4)
  for(const locale of ['en','ru']){
    const groups=coursePreEnrolmentPlan(locale)
    assert.deepEqual(groups.map(group=>[group.start,group.end]),[[1,3],[4,7],[8,11],[12,14]])
    assert.equal(groups.length,4)
    assert.ok(groups.every(group=>group.title.length>5 && group.summary.length>20))
    const days=groups.flatMap(group=>group.days)
    assert.deepEqual(days.map(item=>item.day),Array.from({length:14},(_,index)=>index+1))
    assert.equal(new Set(days.map(item=>item.day)).size,14)
    for(const day of days){
      assert.equal(day.title,COURSE_JOURNEY[day.day-1].heading[locale])
      assert.ok(day.title.length>6)
    }
  }
  assert.notDeepEqual(coursePreEnrolmentPlan('en')[0].title,coursePreEnrolmentPlan('ru')[0].title)
})

test('guests get a brief Google course invitation, while signed-in clients can inspect the full plan before starting', () => {
  const landing=read('components/app/my-course.jsx')
  const app=read('components/app/app-workspace.jsx')
  const guest=read('components/app/course-guest-landing.jsx')
  const preview=read('components/app/course-14-day-overview.jsx')
  const css=read('components/app/course-14-day-overview.module.css')
  assert.match(app, /<Course14DayOverview locale=\{locale\} programId="stress" compact \/>/)
  assert.match(app, /<Course14DayOverview locale=\{locale\} compact \/>/)
  assert.match(app, /const stressSignup = page === 'course' && searchParams\.get\('program'\) === 'stress'/)
  assert.match(app, /<CourseGuestLanding locale=\{locale\} onStart=\{signin\} busy=\{busy\} stressSignup=\{stressSignup\} compact/)
  assert.match(guest, /if \(compact\) return/)
  assert.match(guest, /inviteLead/)
  assert.match(guest, /data-course-google-signin/)
  assert.match(guest, /href=\{`\/\$\{locale\}\/courses\/antistress`\}/)
  assert.match(landing, /stage === 0 && <details className=\{styles\.overviewDisclosure\}>/)
  assert.match(landing, /<Course14DayOverview locale=\{locale\} \/>/)
  const beforeConsent=landing.indexOf('stage === 0 && <details className={styles.overviewDisclosure}')
  const afterHero=landing.indexOf('stage === 0 && <header')
  assert.ok(afterHero>=0 && beforeConsent>afterHero,
    'the full programme remains available after the signed-in main CTA')
  assert.doesNotMatch(landing, /ref=\{startDialogRef\}/)
  assert.match(preview, /data-course-14-day-overview/)
  assert.match(preview, /data-course-before-signup/)
  assert.match(preview, /data-course-phase/)
  assert.match(preview, /data-course-14-day-list/)
  assert.match(preview, /data-course-day=\{day\.day\}/)
  assert.match(preview, /<details/)
  assert.match(preview, /<summary/)
  assert.match(preview, /aria-label=\{t\.title\}/)
  assert.match(css, /@media\(max-width:530px\)/)
  assert.match(css, /\.phases\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(preview, /localStorage|sessionStorage|fetch\(|dangerouslySetInnerHTML|client data/i)
})
