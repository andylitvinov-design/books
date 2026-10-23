import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {
  COURSE_ANTISTRESS_SKILLS_V6,OPORA54_SLIDE_MODEL,OPORA54_PRE_SAVE_KEYS,
  opora54Day,opora54SkillCards,opora54BlueprintValid,validateOpora54Signals,
} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {repositoryHarness,mount,findButton} from './helpers/route-pipeline-harness.mjs'
import {COURSE_ANTISTRESS_SKILLS_V5,OPORA_SKILL_SLIDE_MODEL} from '../lib/inner-growth/anti-stress-skills-v5.js'
import {oporaCompactDay,oporaCompactPassportValid} from '../lib/inner-growth/opora-compact-copy-v6.js'
import {oporaNoticeActivity,oporaNoticeCatalogValid} from '../lib/inner-growth/opora-v6-exercise-cards.js'
import {COURSE_ANTISTRESS_OUTCOME_V3,lessonFor} from '../lib/inner-growth/lesson-library.js'
import {buildCourseSlides,verifyCourseSlideVisitOrder} from '../lib/inner-growth/course-slide-sequence.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('fourteen bilingual V6 lessons contain the fifteen visible steps and distinct scenarios',()=>{
 assert.equal(COURSE_ANTISTRESS_SKILLS_V6,'hh-antistress-skills-v6-20261017')
 assert.equal(OPORA54_SLIDE_MODEL,'opora-fifteen-screens-v1')
 assert.equal(OPORA54_PRE_SAVE_KEYS.length,14)
 assert.equal(opora54BlueprintValid(),true)
 assert.equal(oporaCompactPassportValid(),true)
 assert.equal(oporaNoticeCatalogValid(),true)
 for(const lang of ['ru','en']){
   const cards=opora54SkillCards(lang)
   assert.deepEqual(cards.map(x=>x.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   for(let day=1;day<=14;day++){
     const v=opora54Day(day,lang)
     const lesson=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V6)
     assert.ok(v&&lesson)
     assert.equal(v.skillId,'S'+((day-1)%7+1))
     assert.equal(lesson.antiStress.slideModel,OPORA54_SLIDE_MODEL)
     assert.match(lesson.id,/hh-antistress-skills-v6-20261017/)
     assert.equal(lesson.aphorism,v.quote)
     assert.equal(lesson.opora54.scenario.choices.length,3)
     assert.equal(lesson.opora54.exercises.notice.a.length,3)
     assert.equal(lesson.opora54.exercises.notice.f.length,3)
     assert.equal(lesson.opora54.exercises.act.choices.length,3)
     assert.equal(lesson.opora54.exercises.transfer.choices.length,3)
     assert.equal(oporaNoticeActivity(day,lang)?.a.length,3)
     assert.ok(['S1','S2','S3','S4','S5','S6','S7'].includes('S'+((day-1)%7+1)))
     assert.ok(lesson.opora54.scenario.choices.every(x=>x.length>10))
     const slides=buildCourseSlides(lesson)
     assert.deepEqual(slides.map(s=>s.key),OPORA54_PRE_SAVE_KEYS)
     assert.ok(slides.every(s=>s.text.length>35))
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(s=>s.key)),true)
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.slice(0,-1).map(s=>s.key)),false)
     if(lang==='en'){
       assert.doesNotMatch(v.quote,/[А-Яа-яЁё]/)
       assert.doesNotMatch(v.scenario.prompt,/[А-Яа-яЁё]/)
     }
   }
 }
 for(const lang of ['ru','en']){
   for(let day=1;day<=14;day++){
     const copy=oporaCompactDay(day,lang)
     assert.equal(copy.choices.length,3)
     const lesson=opora54Day(day,lang)
     const maxSlide=Math.max(...lesson.screens.map(s=>s.text.length))
     assert.ok(maxSlide<245,'No long-form script on day '+day+' '+lang+': '+maxSlide)
   }
 }
 assert.notEqual(opora54Day(1,'ru').quote,opora54Day(8,'ru').quote)
 assert.notEqual(opora54Day(1,'en').scenario.prompt,opora54Day(8,'en').scenario.prompt)
})

test('old V5 seven-screen and V3 fifteen-screen histories remain immutable',()=>{
 for(const lang of ['ru','en'])for(const day of [1,7,8,14]){
   const v5=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V5)
   const v3=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_OUTCOME_V3)
   const v6=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V6)
   assert.equal(v5.antiStress.slideModel,OPORA_SKILL_SLIDE_MODEL)
   assert.equal(buildCourseSlides(v5).length,7)
   assert.equal(buildCourseSlides(v3).length,15)
   assert.equal(buildCourseSlides(v6).length,14)
   assert.notEqual(v6.id,v5.id)
   assert.notEqual(v5.id,v3.id)
 }
})

test('bounded responses never accept Skip, free-text PII, fake mastery or forged hint',()=>{
 const sample={answers:{welcome:'tense',aphorism:'disagree',noticeChoice:'two',actChoice:'one',act:'partly',rehearse:'guided',scenario:'one',
   transfer:'not_planning'},hints:['demo','rehearse'],ease:2}
 assert.deepEqual(validateOpora54Signals(sample),sample)
 assert.deepEqual(validateOpora54Signals({answers:{}}),{answers:{},hints:[],ease:null})
 for(const bad of [
   {answers:{aphorism:'skip'}},{answers:{act:'skip'}},{answers:{noticeChoice:'anything'}},{answers:{actChoice:'four'}},
   {answers:{notice:'tried'}},{answers:{act:'partly'}},{answers:{transfer:'planned'}},
   {answers:{transferChoice:'four'}},{answers:{},ease:2},
   {answers:{scenario:'correct'}},{answers:{pace:'n/a'}},
   {answers:{save:'success'}},{answers:{__proto__:'unexpected',unlisted:'test'}},
   {answers:[],hints:[]},{answers:{},hints:['gibberish']},
   {answers:{},hints:['demo','demo']},{answers:{},ease:99},
   {answers:{},extra:{sensitive:'hello'}},
 ]){
   assert.throws(()=>validateOpora54Signals(bad),/INVALID_OPORA54/)
 }
})

test('V6 and V7 retain the historical fifteen-screen save contract and private signal data',async()=>{
 const server=read('lib/app/growth-daily.js')
 assert.match(server,/\? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4/)
 assert.match(server,/value === COURSE_ANTISTRESS_SKILLS_V6/)
 assert.match(server,/validateOpora54Signals\(input\.opora54\)/)
 assert.match(server,/verifyCourseSlideVisitOrder\(requiredSlides,input\.visitedSlideKeys\)/)
 for(const version of [COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7]){
   const owner=repositoryHarness({freshPhase:true}),created=await owner.create('AS2')
   assert.equal(created.content_version,COURSE_ANTISTRESS_SKILLS_V7)
   if(version===COURSE_ANTISTRESS_SKILLS_V6)owner.cycle.content_version=version
   owner.seedDay(1)
   const data=await owner.read('en')
   await owner.command({day:1,lessonId:data.lesson.id,
     operationId:'00000000-0000-4000-8000-000000000991',feedback:'skip',practiceWindow:'practice_v15',
     visitedSlideKeys:OPORA54_PRE_SAVE_KEYS,opora54:{answers:{},hints:[],ease:null}})
   const saved=owner.sessions.at(-1)
   assert.equal(saved.content_version,version)
   assert.equal(saved.lesson_id,data.lesson.id)
   assert.equal(saved.signals.interactionSchema,version===COURSE_ANTISTRESS_SKILLS_V6
     ?'as-5.4-fifteen-screens-v1':'as-5.5-fifteen-screens-v1')
   assert.equal(owner.cycle.content_version,version)
 }
 assert.match(server,/!\[COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7\]\.includes\(version\) && input\.opora54!==undefined/)
 assert.match(server,/INVALID_OPORA54_INDEPENDENCE/)
 assert.match(server,/INVALID_OPORA54_APHORISM/)
 // A reported try is not proof of independent competence, while real hints
 // must be shown from the version-pinned owner's response.
 assert.match(server,/isAntiStressV6\|\|isAntiStressV7/)
 assert.match(server,/Array\.isArray\(row\?\.signals\?\.opora54\?\.hints\)/)
})

test('independent mobile component has safe stop, 3 aphorism answers, hints and save-before-receipt',()=>{
 const player=read('components/app/opora-v6-slide-player.jsx')
 const legacy=read('components/app/course-slide-player.jsx')
 const css=read('components/app/opora-v6-slide-player.module.css')
 const entry=read('components/app/course-today.jsx')
 assert.match(entry,/playerData\?\.lesson\?\.antiStress\?\.slideModel===OPORA54_SLIDE_MODEL/)
 assert.match(entry,/const playerData=reviewLesson\?\{/)
 assert.match(entry,/lesson:reviewLesson\.lesson/)
 assert.match(entry,/currentSession:reviewLesson\.session,currentCheckin:null/)
 assert.match(entry,/data=\{playerData\} busy=\{busy\} reviewOnly=\{Boolean\(reviewLesson\)\}/)
 assert.match(entry,/<OporaV6SlidePlayer key=/)
 assert.match(entry,/:<CourseSlidePlayer key=/)
 assert.match(legacy,/export default function CourseSlidePlayer/)
 assert.match(player,/ROLE_OPTIONS=\{/)
 assert.match(player,/choiceField=role==='notice'/)
 // Learners can report 'not attempted' or 'uncomfortable' without
 // pretending to have chosen a particular physical action.
 assert.match(player,/const noActionReport=role==='transfer'/)
 assert.match(player,/\['not_yet','not_attempted','uncomfortable'\]\.includes\(value\)/)
 assert.match(player,/if\(choiceField&&!answers\[choiceField\]&&!noActionReport\)return/)
 assert.match(player,/activityPrompt/)
 assert.match(player,/role==='act'&&picked/)
 assert.match(player,/aphorism:\['agree','unsure','disagree'\]/)
 assert.match(player,/data-opora-as54-player/)
 assert.match(player,/validateOpora54Signals/)
 assert.match(player,/visitedSlideKeys:slides\.map\(s=>s\.key\)/)
 assert.match(player,/if\(response\)\{setSaved\(true\);setStep\(slides\.length\)/)
 assert.match(player,/setSafety\(true\)/)
 assert.match(player,/if\(showHint\)/)
 assert.doesNotMatch(player,/\['skip',/)
 assert.match(css,/100dvh/)
 assert.match(css,/safe-area-inset-bottom/)
 for(const file of ['components/app/opora-v6-slide-player.jsx','components/app/course-slide-player.jsx','components/app/course-today.jsx']){
   const code=read(file),parsed=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
   assert.deepEqual(parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],file+' syntax')
 }
})


for(const version of [COURSE_ANTISTRESS_SKILLS_V6,COURSE_ANTISTRESS_SKILLS_V7]){
 test(`${version} actual player requires a chosen action for positive attempt, but permits honest non-attempt`,async()=>{
  const lesson=lessonFor('calm_regulation',1,'en','standard',version)
  let saves=0
  const h=mount('opora-v6-slide-player',{locale:'en',data:{lesson,programme:{id:'stress'},
    cycle:{id:'00000000-0000-4000-8000-000000000992',day:1,durationDays:14,preferences:{}}},
    onClose(){},onSession(){saves++;return true}})
  const click=async label=>{const button=findButton(h.tree,label);assert.ok(button,label);button.props.onClick();await h.settle()}
  try{
    for(let step=0;step<7;step++)await click('Continue')
    for(const role of ['notice','act']){
      assert.equal(findButton(h.tree,'I tried it'),undefined)
      assert.equal(findButton(h.tree,'Partly'),undefined)
      assert.ok(findButton(h.tree,'Not yet'))
      assert.ok(findButton(h.tree,'Uncomfortable'))
      await click('I did not try')
      assert.equal(saves,0)
      const exercise=lesson.opora54.exercises[role]
      await click((role==='notice'?exercise.a:exercise.choices)[0])
      assert.ok(findButton(h.tree,'I tried it'))
      assert.ok(findButton(h.tree,'Partly'))
      await click('Continue')
    }
    for(let step=9;step<11;step++)await click('Continue')
    assert.equal(findButton(h.tree,'Made a plan'),undefined)
    assert.equal(findButton(h.tree,'Imagined it'),undefined)
    await click('Not planning today')
    await click(lesson.opora54.exercises.transfer.choices[0])
    assert.ok(findButton(h.tree,'Made a plan'))
    assert.equal(saves,0)
  }finally{h.unmount()}
 })
}
