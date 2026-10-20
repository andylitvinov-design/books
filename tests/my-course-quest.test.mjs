import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceFunction } from './helpers/source-contract-runtime.mjs'
import { coursePendingKeys, isCourseTest } from '../lib/app/course-test-flow.js'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const quest = read('components/app/course-quest.jsx')
const questCss = read('components/app/course-quest.module.css')
const today = read('components/app/course-today.jsx')
const todayCss = read('components/app/course-today.module.css')
const runner = read('components/app/app-workspace.jsx')
const runnerCss = read('components/app/course-quiz.module.css')
const courseSteps = read('components/app/course-r3-steps.jsx')

test('14-day quest map renders a complete 4-chapter personal path with accessible current/day states', () => {
  assert.match(quest, /export function CourseQuestMap/)
  assert.match(quest, /data-course-quest-map/)
  assert.match(quest, /visibleRoadmap\.map\(/)
  assert.match(quest, /const visibleRoadmap = showAllDays \? roadmap : roadmap\.filter/)
  assert.match(quest, /aria-expanded=\{showAllDays\}/)
  assert.match(quest, /View all 14 lessons/)
  assert.match(quest, /1: 'chapter1', 4: 'chapter2', 8: 'chapter3', 12: 'chapter4'/)
  assert.match(quest, /aria-current=\{active \? 'step' : undefined\}/)
  assert.match(quest, /aria-label=\{t\.lesson/)
  assert.match(quest, /data-status=\{STATES\[item\.status\]/)
  assert.match(quest, /journeyScene/)
  assert.match(quest, /item\.outcome/)
  assert.match(questCss, /\.pathRow\[data-side=left\]/)
  assert.match(questCss, /\.pathRow\[data-side=right\]/)
})

test('daily mission is a one-action-at-a-time accessible player with voluntary self-report', () => {
  assert.match(today, /<CourseQuestMap/)
  assert.match(today, /<CourseSlidePlayer/)
  assert.match(today, /data-course-today-primary/)
  assert.match(quest, /export function CourseQuestPlayer/)
  assert.match(quest, /data-course-quest-player/)
  assert.match(quest, /aria-modal="true"/)
  assert.match(quest, /setStep\(1\)/)
  assert.match(quest, /setStep\(5\)/)
  assert.match(quest, /t\.checkinOptional/)
  assert.match(quest, /t\.skipPractice/)
  assert.match(quest, /t\.noAnswer/)
  assert.match(quest, /feedback, beforeNow: before, afterNow: after, reflection/)
  assert.match(quest, /lessonId: lesson\.id/)
  assert.match(quest, /onCheckin\(/)
  assert.match(quest, /onSession\(/)
  assert.match(quest, /role="alert">\{saveError\}/)
  assert.match(quest, /else setSaveError\(t\.saveError\)/)
  assert.match(quest, /disabled=\{pending\} onClick=\{onClose\}/)
  assert.match(quest, /if \(result\) \{ sessionOperation\.current = null; setRewardEarned\(true\); setStep\(5\) \}/)
  assert.match(today, /return result/)
})

test('XP is earned for saved lessons, never for psychological severity or test score', () => {
  assert.match(quest, /const xp = 20 \* count/)
  assert.doesNotMatch(quest, /const xp = .*observations/)
  assert.doesNotMatch(quest, /const xp = .*severity/)
  assert.doesNotMatch(quest, /correctAnswer|wrongAnswer|penalty|lossOfStreak|leaderboard/)
  assert.match(quest, /replay: 'Read the lesson again'/)
  assert.match(quest, /alreadySaved = Boolean\(data\.currentSession\)/)
  assert.match(quest, /if \(alreadySaved\) \{ setStep\(5\); return \}/)
})

test('explicit guided tests retain one-question mode, original instruments and autosave', () => {
  assert.match(courseSteps, /\?mode=guided&course=1/)
  assert.match(runner, /initialMode=\{searchParams\.get\('mode'\) === 'quick' \? 'quick' : searchParams\.get\('mode'\) === 'guided' \? 'guided' : null\}/)
  // An explicit Guided URL opens the one-question runner directly, for courses and regular tests.
  assert.match(runner, /initialMode === 'guided' \? 'guided' : 'quick'/)
  assert.doesNotMatch(runner, /hh-runner-mode-picker/)
  assert.match(runner, /courseQuizStyles\.questRunner/)
  assert.match(runner, /data-course-quiz=\{courseMode \? 'true' : undefined\}/)
  assert.match(runner, /RunnerAnswerChoices/)
  assert.match(runner, /run\.answers\[question\.id\]/)
  assert.match(runner, /await appFetch\(\`runs\/\$\{id\}\/save\`, payload\)/)
  assert.match(runner, /run\.safetySignal && !safetyAcknowledged/)
  assert.match(runnerCss, /\.questRunner :global\(\.hh-runner-question\)/)
  assert.match(runnerCss, /\.questRunner :global\(\.hh-scale button\[aria-pressed=true\]\)/)
})

test('existing approved content, versions, optional guided timer and safer alternative survive new presentation', () => {
  assert.match(today, /data-course-journey/)
  assert.match(today, /data-course-symbolic-lab/)
  assert.match(today, /data-course-active-recall/)
  assert.match(today, /data-course-card=\{number\}/)
  assert.match(quest, /CourseGuidedTimer/)
  assert.match(quest, /lesson\.practiceV4\.withoutImagery/)
  assert.match(quest, /cycle\.preferences\?\.imagery === 'no_imagery'/)
  assert.match(quest, /lesson\.workbook\?\.microPractice/)
  assert.match(quest, /Eyes may stay open|Глаза можно оставить/)
  assert.match(today, /<details className=\{styles\.classicPanel\}>/)
  assert.match(todayCss, /\.classicPanel/)
})

test('EN/RU responsive touch targets, focus trap, reduced motion and safe viewport are present', () => {
  assert.match(quest, /const COPY = \{\s*en:/)
  assert.match(quest, /  ru: \{/)
  assert.match(quest, /event\.key === 'Escape'/)
  assert.match(quest, /event\.key !== 'Tab'/)
  assert.match(quest, /original\?\.isConnected/)
  assert.match(questCss, /100dvh/)
  assert.match(questCss, /env\(safe-area-inset-bottom\)/)
  assert.match(questCss, /\.numberGrid button\{[^}]*min-height:49px/s)
  assert.match(questCss, /@media\(max-width:360px\)/)
  assert.match(questCss, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(quest, /dangerouslySetInnerHTML|localStorage|sessionStorage|analytics|navigator\.sendBeacon/)
})


test('actual owner-scoped continuation uses quick only for the complete OPORA starter battery', async () => {
  const starter=['hh-weekly-pulse','gad-7','hh-resource-pulse']
  async function run({keys=starter,next='gad-7',definitionKey='hh-weekly-pulse',courseId='synthetic course/one',
    returnedCourseId=courseId,accountId='owner-a',bootstrapOwner=accountId,courseMode='1',
    resultRunId='completed-run',switchOnRefresh=false}={}) {
    const navigations=[],calls=[],starts=[]
    const scope={accountId,courseId,courseMode,recordId:'completed-run'}
    const retestScope={current:{...scope}},retestLifetime={current:{mounted:true,epoch:1}}
    let bootstraps=0
    const courseState={course:{id:returnedCourseId,stage:2,testKeys:keys},
      assessments:{selectedTests:keys.map(key=>({key,completed:key!==next}))}}
    const continuePlan=sourceFunction('components/app/app-workspace.jsx','continueCoursePlan',{
      renderedRetestScope:scope,renderedRetestEpoch:1,retestScope,retestLifetime,
      coursePendingKeys,isCourseTest,locale:'ru',root:'/ru/app',
      appFetch:async (path,body,method,options)=>{
        calls.push({path,options})
        assert.equal(options.accountId,accountId)
        if(path==='course?courseId='+encodeURIComponent(courseId)) return courseState
        assert.equal(path,'bootstrap','unexpected external request')
        bootstraps++
        if(switchOnRefresh&&bootstraps===2) retestScope.current={...scope,accountId:'owner-b'}
        return {account:{id:bootstrapOwner}}
      },
      startOrResumeCourseTest:async input=>{
        assert.equal(input.courseState,courseState)
        assert.equal(input.locale,'ru')
        starts.push(input.key)
        return {id:'synthetic run/?'}
      },
      setData:()=>{},setState:()=>{},router:{push:path=>navigations.push(path)},
    })
    await continuePlan({runId:resultRunId,definitionKey,definitionId:'synthetic-version',id:'synthetic-result'})
    return {navigations,calls,starts}
  }
  for(const next of starter) {
    const value=await run({next})
    assert.deepEqual(value.starts,[next])
    assert.deepEqual(value.navigations,['/ru/app/runs/synthetic%20run%2F%3F?mode=quick&course=1&courseId=synthetic%20course%2Fone'])
  }
  for(const keys of [['hh-weekly-pulse','gad-7'],[...starter,'extra']]) {
    const next=keys.includes('extra')?'extra':'gad-7'
    const value=await run({keys,next})
    assert.equal(new URL(value.navigations[0],'https://example.invalid').searchParams.get('mode'),'guided')
    assert.deepEqual(value.starts,[next])
  }
  assert.deepEqual((await run({next:null})).navigations,
    ['/ru/app/course?tests=complete&courseId=synthetic%20course%2Fone'])
  const nonMember=await run({definitionKey:'unselected-test'})
  assert.deepEqual(nonMember.starts,[])
  assert.deepEqual(nonMember.navigations,['/ru/app/results/synthetic-result'])
  for(const input of [{accountId:''},{courseMode:'0'},{resultRunId:'other-run'},
    {returnedCourseId:'other-course'},{switchOnRefresh:true}]) {
    const value=await run(input)
    assert.deepEqual(value.navigations,[],'stale/wrong-owner input must not navigate')
  }
  await assert.rejects(()=>run({bootstrapOwner:'owner-b'}),/COURSE_SELECTION_CHANGED/)
})
