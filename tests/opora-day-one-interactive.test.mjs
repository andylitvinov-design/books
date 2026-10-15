import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DAY_ONE_SLIDES, DAY_ONE_ALLOWED, validateDayOneAnswers, dayOneAphorism } from '../lib/inner-growth/anti-stress-day-one.js'

test('OPORA day one preserves the original five screens and keeps fifteen meaningful steps', () => {
  assert.equal(DAY_ONE_SLIDES.length,15)
  assert.deepEqual(DAY_ONE_SLIDES.slice(0,5).map(s=>s.kind),
    ['welcome','baseline','checkin','recall','idea'])
  assert.deepEqual(DAY_ONE_SLIDES.slice(5).map(s=>s.kind),[
    'day1-prepare','day1-notice','day1-practice','day1-exit','day1-anchor',
    'day1-association','day1-independent','day1-experience','day1-adapt','day1-transfer'])
  assert.equal(new Set(DAY_ONE_SLIDES.map(s=>s.key)).size,15)
  assert.ok(DAY_ONE_SLIDES.every(s=>s.expectedResponse.length>15&&s.intent.length>8))
})
test('answers can be empty, skipped, neutral or have verified scale IDs',()=>{
  assert.deepEqual(validateDayOneAnswers(undefined),{})
  assert.deepEqual(validateDayOneAnswers({quote:'disagree',practiceAttempt:'stopped',experience:'unchanged',transferCue:'no_plan'}),{
    quote:'disagree',practiceAttempt:'stopped',experience:'unchanged',transferCue:'no_plan',
  })
  assert.deepEqual(validateDayOneAnswers({focusId:'hh-weekly-pulse::tension'},['hh-weekly-pulse::tension']),{
    focusId:'hh-weekly-pulse::tension',
  })
  assert.deepEqual(validateDayOneAnswers({focusId:'general'}),{focusId:'general'})
})
test('invalid answers, private free text and unverified scales cannot reach signals',()=>{
  assert.throws(()=>validateDayOneAnswers([]))
  assert.throws(()=>validateDayOneAnswers({focusId:'unverified-test::diagnosis'}))
  assert.throws(()=>validateDayOneAnswers({quote:'always_correct'}))
  assert.throws(()=>validateDayOneAnswers({personalNote:'confidential'}))
  assert.throws(()=>validateDayOneAnswers({preparation:42}))
  assert.ok(Object.values(DAY_ONE_ALLOWED).every(options=>options.every(item=>typeof item==='string')))
})
test('focus-dependent reflection is optional and does not change the clinical baseline',()=>{
  assert.match(dayOneAphorism('ru','calm_regulation',''),/опор|устойчив/i)
  assert.equal(dayOneAphorism('ru','unknown','Fallback'),'Fallback')
})
test('client and server wire day-one branching without disturbing older course versions',()=>{
  const player=readFileSync('components/app/course-slide-player.jsx','utf8')
  const server=readFileSync('lib/app/growth-daily.js','utf8')
  assert.match(player,/isDayOne \? DAY_ONE_SLIDES : buildSlides\(lesson\)/)
  assert.match(player,/data\.programme\?\.id === 'stress'/)
  assert.match(player,/onDiscomfort=\{\(\)=>\{setFeedback\('uncomfortable'\);setDiscomfortOpen\(true\)\}\}/)
  assert.match(player,/dayOneAnswers:validateDayOneAnswers/)
  assert.match(server,/dayOneFocusOptions/)
  assert.match(server,/dayOne:dayOneAnswers,interactiveSchema:'as-1\.8'/)
  assert.match(server,/if\(!isInteractiveFirstDay && input\.dayOneAnswers!==undefined\)/)
  assert.match(server,/notAllowed\('INVALID_DAY_ONE_ANSWERS'/)
  assert.ok(server.indexOf('const isInteractiveFirstDay=') < server.indexOf('const signals={'),
    'Validate first-day choices before constructing signals, including legacy V4 sessions')
})

test('every optional day-one response has a safe explicit decline or honest fallback', () => {
  for (const [field, values] of Object.entries(DAY_ONE_ALLOWED)) {
    if(field === 'focusId') {
      assert.deepEqual(validateDayOneAnswers({focusId:'general'}),{focusId:'general'})
      continue
    }
    if(field === 'practiceMode') {
      assert.ok(values.includes('text'), 'Default accessible text mode must exist')
      continue
    }
    assert.ok(values.includes('skip') || values.includes('unsure') ||
      values.includes('no_plan') || values.includes('none'),
      'No opt-out available for '+field)
  }
})
