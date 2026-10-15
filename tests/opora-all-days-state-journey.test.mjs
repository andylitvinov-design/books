import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {OPORA_STATE_JOURNEY_CHOICES,OPORA_STATE_JOURNEY_SCHEMA,
  validateOporaStateJourney,oporaStateJourneySummary} from '../lib/inner-growth/opora-state-journey.js'
import {courseSingleLessonOutcome} from '../lib/inner-growth/course-single-lesson-outcome.js'
import {lessonFor,COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3} from '../lib/inner-growth/lesson-library.js'
import {ANTISTRESS_ACTIVE_MODULE_IDS,ANTISTRESS_ROUTER_VERSION} from '../lib/inner-growth/antistress-module-router.js'
import {moduleLesson} from '../lib/inner-growth/antistress-module-lessons.js'
import {DAY_ONE_SLIDES} from '../lib/inner-growth/anti-stress-day-one.js'
import {buildCourseSlides} from '../lib/inner-growth/course-slide-sequence.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all 70 current Anti-Stress lessons retain authored 15-slide routes and their pinned IDs',()=>{
  assert.equal(OPORA_STATE_JOURNEY_SCHEMA,'opora-state-journey-v1')
  assert.equal(ANTISTRESS_ACTIVE_MODULE_IDS.length,5)
  let routes=0
  for(const id of ANTISTRESS_ACTIVE_MODULE_IDS){
    for(const locale of ['ru','en']){
      for(let day=1;day<=14;day++){
        const base=lessonFor('calm_regulation',day,locale,'standard',
          id==='AS2'?COURSE_ANTISTRESS_OUTCOME_V3:COURSE_CONTENT_V4)
        const enriched=moduleLesson(base,id,day,locale,ANTISTRESS_ROUTER_VERSION)
        assert.ok(enriched?.title,id+' '+day+' '+locale)
        assert.equal(enriched.sections.length,5,id+' '+day+' '+locale)
        assert.ok(enriched.sections.find(s=>s.kind==='meditation')?.text?.length>25)
        assert.ok(enriched.antiStress?.learningOutcome?.length>25)
        const slides=id==='AS2'&&day===1?DAY_ONE_SLIDES:buildCourseSlides(enriched)
        assert.equal(slides.length,15,id+' '+day+' '+locale)
        assert.equal(new Set(slides.map(s=>s.key)).size,15)
        if(id!=='AS2')assert.ok(enriched.antiStress?.routePlan?.practiceLab?.main,
          'The real method must remain available for '+id+' '+day)
        routes++
      }
    }
  }
  assert.equal(routes,140)
})

test('the state-to-need-to-support-to-experience bridge is optional and uses only bounded IDs',()=>{
  const answers={need:'space',support:'pause',experience:'more_choice'}
  assert.deepEqual(validateOporaStateJourney(answers),answers)
  assert.deepEqual(validateOporaStateJourney({}),{})
  assert.equal(validateOporaStateJourney(undefined),null)
  for(const [name,values] of Object.entries(OPORA_STATE_JOURNEY_CHOICES)){
    assert.ok(values.length>=6)
    assert.ok(values.some(v=>v.id==='skip'),name+' has an opt-out')
    assert.equal(new Set(values.map(v=>v.id)).size,values.length)
    assert.ok(values.every(v=>v.ru.length>3&&v.en.length>3))
  }
  for(const invalid of [[], 'unsafe', {need:1}, {need:'trauma diagnosis'},
    {privateMessage:'my full private history'}, {support:'must-relax'}, {experience:'cured'},
    {need:'rest',unboundedText:'private details'}]){
    assert.throws(()=>validateOporaStateJourney(invalid),/INVALID_OPORA_STATE_JOURNEY/)
  }
})

test('state reflection never invents symptom improvement or counts plans as attempts',()=>{
  const summary=oporaStateJourneySummary({need:'rest',support:'pause',experience:'unchanged'},'tense','ru')
  assert.deepEqual(summary,{
    signal:'Напряжение',need:'Отдых',support:'Небольшая пауза',
    experience:'Без заметных изменений',
  })
  assert.equal(oporaStateJourneySummary({need:'skip',support:'skip',experience:'skip'},'skip','ru'),null)
  const receipt=courseSingleLessonOutcome({locale:'ru',day:6,
    lesson:{antiStress:{skill:'Мягкая регуляция'}},
    stateJourney:{need:'rest',support:'pause',experience:'unchanged'},
    welcomeFeeling:'tense',practiceLab:{},beforeNow:null,afterNow:null})
  assert.deepEqual(receipt.stateJourney,summary)
  assert.equal(receipt.state,null,'State choices must not become numeric pre/post measurements')
  assert.equal(receipt.attempt,'Не отмечено','A chosen support must not prove an attempted exercise')
})

test('all route screens share one visible state card, compact optional feedback and a safe stop',()=>{
  const player=read('components/app/course-slide-player.jsx')
  const result=read('components/app/course-lesson-result.jsx')
  const journey=read('components/app/opora-state-journey.jsx')
  const server=read('lib/app/growth-daily.js')
  assert.match(player,/const isOporaStateJourney=/)
  assert.match(player,/data-opora-state-journey/)
  assert.match(player,/part="plan"/)
  assert.match(player,/part="preview"/)
  assert.match(player,/part="experience"/)
  assert.match(player,/data-opora-safe-stop/)
  assert.match(player,/className=\{styles\.oporaExtraDetails\}/)
  assert.match(player,/stateJourney:validateOporaStateJourney\(stateJourney\)/)
  assert.match(server,/validateOporaStateJourney\(input\.stateJourney\)/)
  assert.match(server,/stateJourneySchema:OPORA_STATE_JOURNEY_SCHEMA/)
  assert.match(server,/INVALID_OPORA_STATE_JOURNEY/)
  assert.match(result,/data-opora-state-result/)
  assert.match(journey,/data-opora-state-plan/)
  assert.match(journey,/data-opora-state-experience/)
  assert.match(journey,/data-opora-state-preview/)
  assert.doesNotMatch(journey,/localStorage|fetch\(|analytics|speechSynthesis/)
  assert.match(server,/onlyKeys\(input,\[\.\.\.rules\[action\]/)
})

test('new JSX, feedback panel and report keep parseable mobile-safe React',()=>{
  const files=['components/app/opora-state-journey.jsx','components/app/course-slide-player.jsx',
    'components/app/course-lesson-result.jsx']
  for(const file of files){
    const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],file)
  }
  assert.match(read('components/app/opora-state-journey.module.css'),/max-width:460px/)
  assert.match(read('components/app/opora-state-journey.module.css'),/#843d57/i)
  assert.match(read('components/app/course-slide-player.module.css'),/\.oporaSafeStop/)
})

test('clinician-only fourth trauma phase is not silently assigned a self-guided route interaction',()=>{
  const player=read('components/app/course-slide-player.jsx')
  const server=read('lib/app/growth-daily.js')
  const lessons=read('lib/inner-growth/antistress-module-lessons.js')
  assert.match(lessons,/moduleId==='AS4'&&routerVersion===TRAUMA_PHASE_VERSION/)
  assert.match(player,/lesson\.antiStress \|\|/)
  assert.match(server,/!coursePresetForTags\(course\.focus_tags\)/)
})
