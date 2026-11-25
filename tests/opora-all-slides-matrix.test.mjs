import {traumaPhaseLesson} from '../lib/inner-growth/trauma-phase-catalog.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {lessonFor,COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3} from '../lib/inner-growth/lesson-library.js'
import {ANTISTRESS_ACTIVE_MODULE_IDS,ANTISTRESS_ROUTER_VERSION} from '../lib/inner-growth/antistress-module-router.js'
import {moduleLesson,moduleDayMeta} from '../lib/inner-growth/antistress-module-lessons.js'
import {DAY_ONE_SLIDES} from '../lib/inner-growth/anti-stress-day-one.js'
import {buildCourseSlides,OPORA_EXPECTED_SLIDES} from '../lib/inner-growth/course-slide-sequence.js'
import {antiStressLabFor} from '../lib/inner-growth/anti-stress-practice-lab.js'
import {antiStressMethodActivity} from '../lib/inner-growth/anti-stress-method-activities.js'
import {oporaModuleActivity,validateOporaModuleActivityChoice,oporaModuleActivityComplete,OPORA_MODULE_ACTIVITY_PLAN} from '../lib/inner-growth/opora-module-exercise.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const version=id=>id==='AS2'?COURSE_ANTISTRESS_OUTCOME_V3:COURSE_CONTENT_V4
const lesson=(id,day,locale='en',router=ANTISTRESS_ROUTER_VERSION)=>
  moduleLesson(lessonFor('calm_regulation',day,locale,'standard',version(id)),id,day,locale,router)
const hasNoBloat=value=>typeof value==='string'&&value.trim().length>12
const moduleIds=ANTISTRESS_ACTIVE_MODULE_IDS.filter(id=>id!=='AS2'&&id!=='AS4')

test('five self-guided routes × 14 days × 15 screens and a gated sixth have complete authored sequences in both languages',()=>{
  assert.equal(ANTISTRESS_ACTIVE_MODULE_IDS.length,6)
  assert.equal(DAY_ONE_SLIDES.length,15)
  assert.equal(new Set(DAY_ONE_SLIDES.map(row=>row.key)).size,15)
  assert.deepEqual(DAY_ONE_SLIDES.slice(0,5).map(row=>row.kind),
    ['welcome','baseline','checkin','recall','idea'])
  let lessonCount=0,screenCount=0
  for(const id of ANTISTRESS_ACTIVE_MODULE_IDS.filter(id=>id!=='AS4')){
    const seen=new Set()
    for(const locale of ['ru','en']){
      for(let day=1;day<=14;day++){
        const plan=lesson(id,day,locale)
        assert.ok(plan,'missing '+id+' '+day+' '+locale)
        assert.ok(!seen.has(locale+':'+plan.id),'duplicate id '+id+':'+day)
        seen.add(locale+':'+plan.id)
        assert.ok(typeof plan.title==='string'&&plan.title.trim().length>=5,'title '+id+':'+day)
        assert.equal(plan.sections.length,5)
        assert.equal(plan.sections.map(x=>x.kind).join(','),'arrive,learn,meditation,ritual,finish')
        assert.ok(plan.sections.every(x=>hasNoBloat(x.text)))
        assert.ok(hasNoBloat(plan.aphorism))
        assert.ok(hasNoBloat(plan.reflection))
        assert.ok(hasNoBloat(plan.workbook.question))
        assert.ok(hasNoBloat(plan.workbook.microPractice))
        const slides=id==='AS2'&&day===1?DAY_ONE_SLIDES:buildCourseSlides(plan)
        assert.equal(slides.length,15,'slide count '+id+':'+day+':'+locale)
        assert.equal(new Set(slides.map(x=>x.key)).size,15,'duplicate screen key')
        assert.deepEqual(slides.map(x=>x.kind),
          id==='AS2'&&day===1?DAY_ONE_SLIDES.map(x=>x.kind):OPORA_EXPECTED_SLIDES,
          'slide sequence '+id+':'+day+':'+locale)
        lessonCount++; screenCount+=slides.length
      }
    }
  }
  assert.equal(lessonCount,5*14*2)
  assert.equal(screenCount,5*14*2*15)
})

test('all 56 phase-specific days align the title, main exercise, arrival, quote, reflection and optional transfer',()=>{
  for(const id of moduleIds){
    for(const locale of ['ru','en']){
      for(let day=1;day<=14;day++){
        const plan=lesson(id,day,locale)
        const meta=moduleDayMeta(id,day,locale,ANTISTRESS_ROUTER_VERSION)
        assert.equal(plan.title,meta.title)
        assert.ok(plan.oporaModule)
        assert.equal(plan.oporaModule.day,day)
        assert.equal(plan.oporaModule.version,ANTISTRESS_ROUTER_VERSION)
        assert.equal(plan.oporaModule.id,id)
        assert.equal(plan.oporaModule.practice,meta.exercise)
        assert.equal(plan.sections[2].text,meta.exercise)
        assert.ok(plan.sections[0].text.includes(meta.title),'arrival day '+day)
        assert.ok(plan.sections[1].text.includes(meta.title),'learning day '+day)
        assert.ok(plan.aphorism.includes(meta.title),'idea day '+day)
        assert.equal(plan.reflection,traumaPhaseLesson(id,day,locale).reflection,'source-mapped reflection day '+day)
        assert.equal(plan.workbook.microPractice,traumaPhaseLesson(id,day,locale).transfer,'source-mapped transfer day '+day)
        assert.ok(plan.workbook.workingPosition.includes(meta.title),'phrase day '+day)
        assert.ok(plan.journey.purpose===meta.exercise)
        assert.ok(plan.accessibility?.stopAnytime)
        if(day>1){
          const previous=moduleDayMeta(id,day-1,locale,ANTISTRESS_ROUTER_VERSION)
          assert.ok(plan.practiceV3.recall.includes(previous.title))
        }
      }
    }
  }
})

test('approved AS2 stays version-pinned with all 14 unique titles and days 2–14 interactive practice labs',()=>{
  for(const locale of ['ru','en']){
    const titles=new Set()
    for(let day=1;day<=14;day++){
      const plan=lesson('AS2',day,locale)
      assert.equal(plan.version,COURSE_ANTISTRESS_OUTCOME_V3)
      assert.equal(plan.oporaModule,undefined)
      assert.ok(plan.antiStress?.skillId)
      assert.ok(plan.antiStress.neutralText)
      titles.add(plan.title)
      if(day>1){
        const lab=antiStressLabFor(day,locale)
        assert.ok(lab?.main?.options?.length>=3,'main lab day '+day)
        assert.ok(lab?.reflect?.options?.length>=3,'reflect lab day '+day)
        const method=antiStressMethodActivity(day,locale)
        assert.ok(method?.choices?.length>=3,'interactivity day '+day)
      }
    }
    assert.equal(titles.size,14)
  }
})

test('legacy NAV-1.3 courses do not receive changed lesson ids or newly authored NAV-2.0 slides',()=>{
  const original=lesson('AS3',4,'en','opora-nav-1.3-20261014')
  const current=lesson('AS3',4,'en')
  assert.equal(original.oporaModule,undefined)
  assert.notEqual(original.id,current.id)
  assert.notEqual(original.aphorism,current.aphorism)
  assert.ok(!original.sections[0].text.includes(current.title))
})

test('client and API permit only voluntary bounded NAV-2.0 learning choices',()=>{
  const client=read('components/app/course-slide-player.jsx')
  const server=read('lib/app/growth-daily.js')
  assert.match(client,/isOporaModule/)
  assert.match(client,/lesson\.antiStress\|\|isOporaModule \? goNext/)
  assert.match(client,/\(lesson\.antiStress\|\|isOporaModule\).*data-course-practice-attempt/)
  assert.match(client,/isDayOne \? DAY_ONE_SLIDES : buildSlides\(lesson\)/)
  assert.match(client,/function buildSlides\(lesson\)/)
  assert.match(server,/isOporaModule=Boolean\(!coursePresetForTags\(course\.focus_tags\).*selectedLesson\?\.oporaModule/)
  assert.match(server,/interactionSchema:'opora-level-2'/)
  assert.match(server,/optionalChoice\(input\.practiceAttempt,practiceAttemptOptions\)/)
  assert.match(server,/if\(!supportsStressInteraction&&/)
  assert.match(server,/supportsStressInteraction=\[COURSE_ANTISTRESS_OUTCOME_V3,COURSE_ANTISTRESS_SKILLS_V5,COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7\]\.includes\(version\)\|\|Boolean\(routePlan\)/)
  assert.match(server,/routePlan=!coursePresetForTags\(course\.focus_tags\)/)
})

test('all 56 level days have distinct, translated hands-on practice interactions',()=>{
  assert.equal(oporaModuleActivityComplete(),true)
  assert.equal(new Set(OPORA_MODULE_ACTIVITY_PLAN.map(x=>x.kind)).size,14)
  for(const id of moduleIds){
    for(const locale of ['ru','en']){
      for(let day=1;day<=14;day++){
        const a=oporaModuleActivity(id,day,locale,ANTISTRESS_ROUTER_VERSION)
        assert.equal(a.day,day)
        assert.equal(a.moduleId,id)
        assert.equal(a.title,lesson(id,day,locale).title)
        assert.equal(a.practice,lesson(id,day,locale).oporaModule.practice)
        assert.ok(a.prompt.length>15)
        assert.equal(a.options.length,4)
        assert.equal(new Set(a.options.map(x=>x.id)).size,4)
        assert.ok(a.options.every(x=>x.label.length>3))
        for(const option of a.options){
          assert.equal(validateOporaModuleActivityChoice(id,day,option.id,ANTISTRESS_ROUTER_VERSION),option.id)
        }
        assert.equal(validateOporaModuleActivityChoice(id,day,null,ANTISTRESS_ROUTER_VERSION),null)
      }
    }
  }
  assert.throws(()=>validateOporaModuleActivityChoice('AS2',1,'object',ANTISTRESS_ROUTER_VERSION),/INVALID_OPORA_MODULE_ACTIVITY/)
  assert.throws(()=>validateOporaModuleActivityChoice('AS1',1,'invented',ANTISTRESS_ROUTER_VERSION),/INVALID_OPORA_MODULE_ACTIVITY/)
  assert.throws(()=>validateOporaModuleActivityChoice('AS1',1,'object','opora-nav-1.3-20261014'),/INVALID_OPORA_MODULE_ACTIVITY/)
  assert.throws(()=>validateOporaModuleActivityChoice('AS1',1,'x'.repeat(30),ANTISTRESS_ROUTER_VERSION),/INVALID_OPORA_MODULE_ACTIVITY/)
})

test('activity uses an uncropped neutral visual and only voluntary private free-text saving',()=>{
  const ui=read('components/app/opora-module-activity.jsx')
  const style=read('components/app/opora-module-activity.module.css')
  const player=read('components/app/course-slide-player.jsx')
  const server=read('lib/app/growth-daily.js')
  assert.match(ui,/course-journey-landscape\.svg/)
  assert.match(style,/object-fit:contain/)
  assert.match(ui,/onSaveReflection|onAddReflection/)
  assert.match(player,/data-opora-module/)
  assert.match(player,/routePlan=lesson\.antiStress\?\.routePlan/)
  assert.match(player,/<OporaModuleActivity \{\.\.\.props\} routePlan=\{\{practiceLab:plan\}\}/)
  assert.match(player,/moduleActivityChoice:alreadyDone&&session\?\.signals\?\.interactionSchema==='opora-level-2'/)
  assert.match(server,/validateOporaModuleActivityChoice\(/)
  assert.match(server,/moduleActivityChoice:|moduleActivityChoice,/)
})
