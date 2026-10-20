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
    if(field === 'hintUsed') {
      assert.ok(DAY_ONE_ALLOWED.independent.includes('skip'), 'Hint interaction is optional, not proof of an attempt')
      continue
    }
    if(field === 'anchorTone') {
      assert.ok(DAY_ONE_ALLOWED.anchor.includes('skip'), 'Colour is an optional dependent choice')
      continue
    }
    assert.ok(values.includes('skip') || values.includes('unsure') ||
      values.includes('no_plan') || values.includes('none'),
      'No opt-out available for '+field)
  }
})

test('a discomfort choice leads to a neutral visible alternative, never the same triggering exercise', () => {
  const player=readFileSync('components/app/course-slide-player.jsx','utf8')
  const dayOne=readFileSync('components/app/anti-stress-day-one.jsx','utf8')
  assert.match(player,/data-course-day-one-neutral-early/)
  assert.match(player,/setNeutralMode\(true\)/)
  assert.doesNotMatch(player,/if\(isDayOne\)setIndex\(current=>Math\.max\(5,current\)\)/)
  assert.match(player,/neutralMode=\{neutralMode\}/)
  assert.match(dayOne,/if\(neutralMode\)return <section/)
  assert.match(dayOne,/onReturnToPractice/)
  assert.match(dayOne,/data-day-one-activity="neutral-support"/)
})

test('first-day UX has at least eight different meaningful interaction formats',()=>{
  const modes=new Set(DAY_ONE_SLIDES.map(s=>s.mode))
  assert.ok(modes.size>=8, 'Do not use identical multiple-choice questionnaires for every screen')
  assert.deepEqual(DAY_ONE_SLIDES.slice(0,5).map(x=>x.kind),
    ['welcome','baseline','checkin','recall','idea'])
  assert.ok(DAY_ONE_SLIDES.every(x=>typeof x.expectedResponse==='string'&&
    typeof x.intent==='string'&&typeof x.methodId==='string'&&x.mode))
})
test('visual areas, optional swatches and independent selection remain honest categorical data',()=>{
  assert.deepEqual(validateDayOneAnswers({visualZone:'left',noticed:'shape',anchor:'colour',anchorTone:'green',
    independentCue:'object',independent:'guided',experience:'unchanged',
    transferCue:'before_rest',transferAction:'rest'}),{
    visualZone:'left',noticed:'shape',anchor:'colour',anchorTone:'green',
    independentCue:'object',independent:'guided',experience:'unchanged',
    transferCue:'before_rest',transferAction:'rest'})
  assert.throws(()=>validateDayOneAnswers({anchorTone:'green'}),/DEPENDENCY/)
  assert.throws(()=>validateDayOneAnswers({transferAction:'look'}),/DEPENDENCY/)
  assert.throws(()=>validateDayOneAnswers({anchor:'shape',anchorTone:'blue'}),/DEPENDENCY/)
  assert.throws(()=>validateDayOneAnswers({anchor:'colour',anchorTone:'diagnosis'}),/CHOICE/)
})
test('each redesigned day-one screen is interactive with distinct visual practice and safe fallback',()=>{
  const ui=readFileSync('components/app/anti-stress-day-one.jsx','utf8')
  const css=readFileSync('components/app/anti-stress-day-one.module.css','utf8')
  const player=readFileSync('components/app/course-slide-player.jsx','utf8')
  for(const activity of ['prepare','notice','practice','exit','anchor','association','independent',
     'experience','adapt','transfer']) assert.match(ui,new RegExp('data-day-one-activity="'+activity+'"'))
  for(const marker of ['data-interactive-practice-stepper','calmPhoto','calmMore','wordTokens',
    'swatchPanel','data-personal-transfer-preview','hintToggle','data-day-one-activity="neutral-support"'])
      assert.ok(ui.includes(marker),marker)
  assert.ok(css.includes('object-fit:contain'), 'Do not crop scenic picture')
  assert.ok(ui.includes("CoursePracticeVoice"), 'Explicit, optional voice path remains')
  assert.ok(ui.includes("associationWords"), 'Private words remain in client-side state')
  assert.ok(!player.includes("associationWords:associationWords"), 'Do not upload word associations')
  assert.match(player,/if\(field==='anchor'&&value!=='colour'\)delete next\.anchorTone/)
  assert.match(player,/if\(field==='transferCue'/)
})

test('displaying a hint cannot by itself count as independent practice',()=>{
  const ui=readFileSync('components/app/anti-stress-day-one.jsx','utf8')
  assert.ok(ui.includes("onAnswer('hintUsed','yes')"))
  assert.ok(!ui.includes("if(!hintOpen)onAnswer('independent','guided')"))
  assert.throws(()=>validateDayOneAnswers({hintUsed:'yes',independent:'independent'}),/DEPENDENCY/)
  assert.deepEqual(validateDayOneAnswers({hintUsed:'yes',independent:'guided'}),{hintUsed:'yes',independent:'guided'})
})

test('the OPORA welcome photo visibly fills the panoramic iPhone slot with a local fallback',()=>{
  const ui=readFileSync('components/app/opora-experience-player.jsx','utf8')
  const css=readFileSync('components/app/opora-experience-player.module.css','utf8')
  assert.match(ui, /<div className=\{styles\.arrivalPhoto\}/)
  assert.match(ui, /<img src="\/images\/holistic-house\/report-lighthouse-coast\.webp"/)
  const frame=css.match(/\.arrivalPhoto\{([^}]*)\}/)?.[1]
  const image=css.match(/\.arrivalPhoto img\{([^}]*)\}/)?.[1]
  assert.ok(frame && image,'Welcome image frame styles must exist')
  assert.match(frame,/position:relative/)
  assert.match(frame,/course-focus-mountain-boy\.webp/,'Local backup scene fills the frame on image failure')
  assert.match(image,/position:absolute/)
  assert.match(image,/object-fit:cover/,'Portrait photo must fill the landscape slot, not disappear as a narrow strip')
  for(const asset of ['report-lighthouse-coast.webp','course-focus-mountain-boy.webp'])
    assert.ok(readFileSync('public/images/holistic-house/'+asset).byteLength>1000,asset+' should be shipped locally')
})
