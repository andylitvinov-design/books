import test from 'node:test'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'
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

test('course continuation preserves ordinary guided and starter quick modes with original instruments and autosave', async () => {
  assert.match(courseSteps, /\?mode=guided&course=1/)
  // The later OPORA starter contract uses Quick; ordinary courses stay Guided.
  // Exercise the production handler, not the spelling of its dynamic URL.
  // Optional opt-out and superset mode semantics are intentionally not redefined here.
  const { getAssessmentDefinition } = await import('../lib/assessments/definitions.js')
  const { isCourseTest, coursePendingKeys, startOrResumeCourseTest } = await import('../lib/app/course-test-flow.js')
  const start = runner.indexOf('  async function continueCoursePlan(')
  const end = runner.indexOf('  async function completePlan(', start)
  assert.ok(start >= 0 && end > start, 'the actual continuation handler must exist')
  const handler = runner.slice(start, end)
  const starter = ['hh-weekly-pulse', 'gad-7', 'hh-resource-pulse']
  async function continueFixture(keys, completed, { wrongOwner = false } = {}) {
    const original = { accountId: 'owner-a', courseId: 'course-a', cycleId: null, page: 'runs', recordId: 'run-a', courseMode: '1' }
    const scope = { current: { ...original } }, lifetime = { current: { mounted: true, epoch: 1 } }
    const definitions = keys.map(key => getAssessmentDefinition(key, 'v1', 'en'))
    const course = { course: { id: 'course-a', stage: 2, testKeys: keys },
      assessments: { selectedTests: keys.map(key => ({ key, completed: completed.includes(key) })) } }
    const calls = [], navigations = [], updates = []
    const request = async (...args) => {
      calls.push(args)
      const [path] = args
      if (path === 'course?courseId=course-a') return course
      if (path === 'bootstrap') return { account: { id: wrongOwner ? 'owner-b' : 'owner-a' },
        activeTestPlan: { definitionIds: definitions.map(def => def.id) }, runs: [] }
      if (path === 'runs') return { id: 'next-run' }
      throw new Error('UNEXPECTED_REQUEST:' + path)
    }
    const fn = new Function('renderedRetestScope', 'renderedRetestEpoch', 'retestScope', 'retestLifetime',
      'appFetch', 'router', 'setData', 'setState', 'locale', 'root', 'isCourseTest', 'coursePendingKeys',
      'startOrResumeCourseTest', handler + '; return continueCoursePlan')(
      original, 1, scope, lifetime, request, { push: url => navigations.push(url) },
      value => updates.push(value), () => {}, 'en', '/en/app', isCourseTest, coursePendingKeys, startOrResumeCourseTest)
    const pending = fn({ id: 'result-a', runId: 'run-a', definitionKey: keys[0], definitionId: definitions[0].id })
    if (wrongOwner) await assert.rejects(pending, /COURSE_SELECTION_CHANGED/)
    else await pending
    assert.ok(calls.every(call => call[3]?.accountId === 'owner-a'), 'all reads and writes retain the original owner')
    return { calls, navigations, updates, definitions }
  }
  for (const scenario of [
    { keys: ['hh-weekly-pulse', 'phq-4'], completed: ['hh-weekly-pulse'], mode: 'guided', next: 'phq-4' },
    { keys: starter, completed: ['hh-weekly-pulse'], mode: 'quick', next: 'gad-7' },
    { keys: starter, completed: ['hh-weekly-pulse', 'gad-7'], mode: 'quick', next: 'hh-resource-pulse' },
    { keys: starter, completed: starter, mode: null, next: null },
  ]) {
    const f = await continueFixture(scenario.keys, scenario.completed)
    assert.deepEqual(f.navigations, [scenario.next
      ? '/en/app/runs/next-run?mode=' + scenario.mode + '&course=1&courseId=course-a'
      : '/en/app/course?tests=complete&courseId=course-a'])
    const writes = f.calls.filter(call => call[0] === 'runs')
    assert.equal(writes.length, Number(Boolean(scenario.next)), 'saved tests are skipped and terminal completion creates no run')
    if (scenario.next) {
      const def = f.definitions.find(item => item.key === scenario.next)
      assert.equal(writes[0][1].definitionKey, def.key)
      assert.equal(writes[0][1].definitionVersion, def.version)
      assert.equal(writes[0][1].instrumentLocale, def.instrumentLocale)
    }
    assert.equal(f.updates.length, 1)
  }
  const stale = await continueFixture(starter, ['hh-weekly-pulse'], { wrongOwner: true })
  assert.equal(stale.navigations.length, 0)
  assert.equal(stale.updates.length, 0)
  assert.equal(stale.calls.filter(call => call[1]).length, 0)
  // Both presentations still use the full stored instrument and identical submit path.
  assert.match(runner, /getDefinitionById\(run\.definitionId\)/)
  assert.match(runner, /def\.questions\.map\(\(item, step\) => \(/)
  assert.match(runner, /selected=\{run\.answers\[item\.id\]\}/)
  assert.match(runner, /allAnswered = def \? answeredCount === def\.questions\.length : false/)
  assert.match(runner, /appFetch\(`runs\/\$\{id\}\/submit`, \{ expectedRevision: pending\.revision \}\)/)
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

test('every lesson screen exposes Back, including the first and the saved receipt', () => {
  const regular = read('components/app/course-slide-player.jsx')
  const oporaV6 = read('components/app/opora-v6-slide-player.jsx')
  const oporaV7 = read('components/app/opora-experience-player.jsx')
  assert.match(regular, /onClick=\{index===0\?onBackToPath:goBack\}/)
  assert.match(regular, /data-course-history-review=/)
  assert.match(oporaV6, /onClick=\{afterSave\?\(\)=>setStep\(slides\.length-1\):step===0\?onBackToPath:back\}/)
  assert.match(oporaV6, /if\(reviewOnly\)\{setStep\(slides\.length\);return\}/)
  assert.match(oporaV7, /onClick=\{step===0\?onBackToPath:back\}/)
  const receiptBack = oporaV7.match(/onClick=\{(moment==='habit'[\s\S]*?)\}>/)?.[1]
  assert.ok(receiptBack, 'execute the actual saved-receipt Back callback')
  for (const variant of ['habit', 'preview', 'receipt']) {
    const calls = []
    const callback = runInNewContext('(' + receiptBack + ')', {
      moment:variant === 'habit' ? 'habit' : 'receipt', habitSetup:variant === 'habit',
      inPreview:variant === 'preview', flowScenes:{length:17}, displayScenes:{length:12},
      setHabitSetup:value=>calls.push(['habit',value]), backFromPreview:()=>calls.push(['preview']),
      setStep:value=>calls.push(['step',value]),
    })
    callback()
    assert.deepEqual(calls, variant === 'habit' ? [['habit',false]] : variant === 'preview' ? [['preview']] : [['step',16]])
  }
  assert.match(quest, /if\(step===0\)onClose\(\)/)
  assert.match(quest, /step === 5 && <>/)
})

test('previous completed days reopen a no-write lesson, not an XP-earning session', () => {
  const daily = read('lib/app/growth-daily.js')
  const route = read('app/api/app/[...path]/route.js')
  const oporaV6 = read('components/app/opora-v6-slide-player.jsx')
  const oporaV7 = read('components/app/opora-experience-player.jsx')
  const standard = read('components/app/course-slide-player.jsx')
  assert.match(quest, /data-course-previous-lesson/)
  assert.match(quest, /lastCompleted\.day/)
  assert.match(quest, /\(active \|\| complete\)/)
  assert.match(quest, /onClick=\{\(\) => onPlay\(item\.day\)\}/)
  assert.match(quest, /data-course-open-day=\{item\.day\}/)
  assert.match(today, /reviewDay:day/)
  assert.match(today, /data\.roadmap\?\.some\(item=>item\.day===day&&item\.status==='completed'\)/)
  assert.match(today, /response\.review\?\.session\?\.completedAt/)
  assert.match(today, /reviewOnly=\{Boolean\(reviewLesson\)\}/)
  assert.match(today, /onSession=\{body=>reviewLesson\?null:submit\('session'/)
  assert.match(daily, /const reviewedSession=requestedReviewDay===null\?null:sessions\.find/)
  assert.match(daily, /!reviewedSession\|\|!roadmap\.some\(item=>item\.day===requestedReviewDay&&item\.status==='completed'\)/)
  assert.match(daily, /context\(actor,reviewedSession\.id,'course\.session_note'\)/)
  assert.match(route, /new URL\(request\.url\)\.searchParams\.get\('reviewDay'\)/)
  assert.match(oporaV6, /reviewOnly\?0:hasSaved\?OPORA54_PRE_SAVE_KEYS\.length:0/)
  const initialStep = oporaV7.match(/const \[step,setStep\]=useState\(([^\n]+)\)/)?.[1]
  assert.ok(initialStep, 'execute the actual OPORA player initializer')
  for (const reviewOnly of [false,true]) for (const hasSaved of [false,true]) {
    assert.equal(runInNewContext(initialStep,{reviewOnly,hasSaved,flowScenes:{length:17},displayScenes:{length:12}}),
      reviewOnly ? 0 : hasSaved ? 17 : 0)
  }
  assert.match(standard, /reviewOnly \? 0 : alreadyDone \? slides\.length : 0/)
  assert.match(standard, /if \(reviewOnly \|\| !Number\.isInteger\(severity\)/)
  const css = read('components/app/course-quest.module.css')
  assert.match(css, /\.previousLesson\{[^}]*min-height:48px/s)
})

test('first-slide Back routes to the map separately from X, with standalone close fallback', () => {
  for (const [file, initial, previous, saved] of [
    ['course-slide-player', 'index', 'goBack', false],
    ['opora-experience-player', 'step', 'back', false],
    ['opora-v6-slide-player', 'step', 'back', true],
  ]) {
    const source = read(`components/app/${file}.jsx`)
    const fallback = source.match(/onBackToPath\s*=\s*([^,}]+)/)?.[1]
    assert.ok(fallback, `${file}: standalone fallback exists`)
    const expression = source.match(new RegExp('onClick=\\{([^\\n]*' + initial + '===0\\?onBackToPath:' + previous + ')\\}'))?.[1]
    assert.ok(expression, `${file}: execute actual first-slide Back binding`)
    for (const supplied of [false, true]) {
      for (const position of [0, 1]) {
        const calls = []
        const context = { [initial]:position, afterSave:false,
          onClose:()=>calls.push('close'), [previous]:()=>calls.push('previous') }
        context.onBackToPath = supplied ? ()=>calls.push('map') : runInNewContext(fallback, context)
        runInNewContext('(' + expression + ')', context)()
        assert.deepEqual(calls, [position ? 'previous' : supplied ? 'map' : 'close'], file)
      }
    }
    if (saved) {
      const calls = []
      runInNewContext('(' + expression + ')', {afterSave:true, step:0, slides:{length:10},
        setStep:n=>calls.push(n), onBackToPath:()=>calls.push('map'), back:()=>calls.push('back')})()
      assert.deepEqual(calls, [9], 'saved receipt Back retains prior slide')
    }
    assert.match(source, /onClick=\{onClose\}/, `${file}: X retains close-only callback`)
  }
  assert.match(today, /onOpenRetest=\{reviewLesson\?finishLessonPlayer:showFinalRetest\}/, 'review retest exit retains existing map destination')
  assert.equal((today.match(/onBackToPath=\{finishLessonPlayer\}/g)||[]).length, 3)
  assert.equal((today.match(/onClose=\{closeLessonPlayer\}/g)||[]).length, 3)
})
