import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {DAY_ONE_SLIDES,DAY_ONE_ALLOWED,validateDayOneAnswers,dayOneAphorism} from '../lib/inner-growth/anti-stress-day-one.js'
import {courseSingleLessonOutcome} from '../lib/inner-growth/course-single-lesson-outcome.js'
import {antiStressDay} from '../lib/inner-growth/anti-stress-outcomes-v3.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('fifteen ordered day-one slides teach awareness, support and optional everyday use',()=>{
  assert.equal(DAY_ONE_SLIDES.length,15)
  assert.deepEqual(DAY_ONE_SLIDES.slice(0,5).map(s=>s.kind),
    ['welcome','baseline','checkin','recall','idea'])
  assert.deepEqual(DAY_ONE_SLIDES.slice(5).map(s=>s.kind),
    ['day1-prepare','day1-notice','day1-practice','day1-exit','day1-anchor',
      'day1-association','day1-independent','day1-experience','day1-adapt','day1-transfer'])
  assert.match(DAY_ONE_SLIDES.find(s=>s.kind==='day1-practice').intent,/personally chosen response/)
  assert.match(DAY_ONE_SLIDES.find(s=>s.kind==='day1-transfer').intent,/state → response/)
  for(const locale of ['ru','en']){
    const lesson=antiStressDay(1,locale)
    assert.match(lesson.guide,locale==='ru'?/внутренн.*состояни|своём состоянии/i:/present inner state|observation about your state/i)
    assert.match(lesson.outcome,locale==='ru'?/состояние — возможная потребность — поддержка/:/present state, possible need and chosen support/)
  }
})

test('inner choices are bounded, voluntary, and do not accept intimate text or fake outcomes',()=>{
  const answers={
    innerSignal:'rushing',innerNeed:'space',innerAction:'pause',
    practiceAttempt:'tried',experience:'clearer',independent:'guided',
    transferCue:'tension',transferAction:'pause',
  }
  assert.deepEqual(validateDayOneAnswers(answers),answers)
  for(const field of ['innerSignal','innerNeed','innerAction','experience']){
    assert.ok(DAY_ONE_ALLOWED[field].includes('skip'),field+' is voluntary')
  }
  assert.throws(()=>validateDayOneAnswers({innerSignal:'I have PTSD'}))
  assert.throws(()=>validateDayOneAnswers({privateJournal:'personal details'}))
  assert.throws(()=>validateDayOneAnswers({experience:'cured'}))
  assert.throws(()=>validateDayOneAnswers({transferCue:'no_plan',transferAction:'pause'}))
  assert.match(dayOneAphorism('ru','inner_support'),/своё состояние/)
})

test('a saved day-one result shows reported state, need and support without inventing a clinical change',()=>{
  const r=courseSingleLessonOutcome({
    locale:'ru',day:1,lesson:{antiStress:{skill:'Ориентация и выбор'}},
    dayOne:{innerSignal:'tension',innerNeed:'rest',innerAction:'pause',
      experience:'clearer',practiceAttempt:'partly',anchor:'object'},
  })
  assert.equal(r.innerObservation.signal,'Напряжение')
  assert.equal(r.innerObservation.need,'Отдых')
  assert.equal(r.innerObservation.selectedAction,'Пауза')
  assert.equal(r.innerObservation.experience,'Стало яснее, что я чувствую')
  assert.equal(r.attempt,'Попробовал(а) частично')
  assert.equal(r.state,null)
  const skipped=courseSingleLessonOutcome({locale:'en',day:1,
    dayOne:{innerSignal:'skip',innerNeed:'skip',innerAction:'skip',experience:'skip'}})
  assert.equal(skipped.innerObservation,null)
  assert.equal(skipped.state,null)
})

test('screen interaction preserves non-coercive inner and external pathways without saving private words',()=>{
  const dayOne=read('components/app/anti-stress-day-one.jsx')
  const player=read('components/app/course-slide-player.jsx')
  const report=read('components/app/course-lesson-result.jsx')
  for(const field of ['innerSignal','innerNeed','innerAction'])
    assert.ok(dayOne.includes("choice('"+field+"'"),field+' should have a real choice')
  assert.ok(dayOne.includes("data-interactive-practice-stepper"))
  assert.ok(dayOne.includes("data-personal-transfer-preview"))
  assert.ok(dayOne.includes("onStopPractice"))
  assert.ok(dayOne.includes("data-day-one-activity=\"neutral-support\""))
  assert.ok(dayOne.includes("associationWords"))
  assert.ok(!player.includes("associationWords:associationWords"))
  assert.ok(player.includes("dayOneAnswers:validateDayOneAnswers"))
  assert.ok(report.includes("data-course-inner-state-result"))
  assert.match(dayOne,/No need|do not have to|without needing/i)
  assert.match(dayOne,/не нужно|необязательно|не обязаны/i)
})

test('modified first-day JSX screens and summary parse cleanly',()=>{
  for(const file of ['components/app/anti-stress-day-one.jsx',
    'components/app/course-slide-player.jsx','components/app/course-lesson-result.jsx']){
    const source=read(file)
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    const errors=ast.parseDiagnostics.map(e=>
      ts.flattenDiagnosticMessageText(e.messageText,' ')+' at '+ast.getLineAndCharacterOfPosition(e.start||0).line)
    assert.deepEqual(errors,[],file)
  }
})
