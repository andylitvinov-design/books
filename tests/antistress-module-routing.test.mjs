import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 ANTISTRESS_MODULE_GOALS, ANTISTRESS_MODULE_FINDER_ITEMS, ANTISTRESS_ACTIVE_MODULE_IDS, ANTISTRESS_MODULE_IDS,
 ANTISTRESS_ROUTER_VERSION,validateModuleFinderAnswers,
 recommendAntistressModule,weeklyAxesFromResults,
 packCourseModuleContext,unpackCourseModuleContext,
} from '../lib/inner-growth/antistress-module-router.js'
import {moduleLesson,moduleDayMeta,moduleCurriculumComplete,OPORA_MODULE_DAY_COUNT} from '../lib/inner-growth/antistress-module-lessons.js'
import {OPORA_RECOVERY_STAGES,OPORA_ENTRY_AND_EXIT} from '../lib/inner-growth/antistress-recovery-pathway.js'
import {fiveLevelContentComplete} from '../lib/inner-growth/antistress-module-lessons-v2.js'
import {lessonFor,COURSE_CONTENT_V4,COURSE_ANTISTRESS_OUTCOME_V3} from '../lib/inner-growth/lesson-library.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const goodWeekly={ 'weekly.load':8,'weekly.tension':6,'weekly.functioning':5 }
const empty=()=>Object.fromEntries(ANTISTRESS_MODULE_FINDER_ITEMS.map(({id})=>[id,null]))
const moduleDecision=(o={})=>recommendAntistressModule({weekly:goodWeekly,answers:empty(),...o})
test('one programme offers five different bilingual 14-day routes while preserving the legacy sixth',()=>{
 assert.deepEqual(ANTISTRESS_MODULE_GOALS.map(x=>x.id),['AS1','AS2','AS3','AS4','AS5'])
 assert.deepEqual(ANTISTRESS_ACTIVE_MODULE_IDS,['AS1','AS2','AS3','AS4','AS5'])
 assert.deepEqual(ANTISTRESS_MODULE_IDS,['AS1','AS2','AS3','AS4','AS5','AS6'])
 assert.deepEqual(ANTISTRESS_MODULE_GOALS.map(x=>x.range),[[9,10],[7,8],[5,6],[3,4],[0,2]])
 assert.equal(fiveLevelContentComplete(),true)
 assert.equal(ANTISTRESS_MODULE_FINDER_ITEMS.length,8)
 assert.equal(new Set(ANTISTRESS_MODULE_FINDER_ITEMS.map(x=>x.id)).size,8)
 assert.equal(OPORA_MODULE_DAY_COUNT,14)
 assert.equal(moduleCurriculumComplete(),true)
 for(const mod of ANTISTRESS_MODULE_GOALS){
   assert.ok(mod.title.en && mod.title.ru && mod.title.es)
   const a=Array.from({length:14},(_,i)=>{
    const base=lessonFor('calm_regulation',i+1,'en','standard',mod.id==='AS2'?COURSE_ANTISTRESS_OUTCOME_V3:COURSE_CONTENT_V4)
    return moduleLesson(base,mod.id,i+1,'en',ANTISTRESS_ROUTER_VERSION)
   })
   assert.equal(new Set(a.map(x=>x.id)).size,14)
   assert.equal(a.every(x=>x.title && x.sections?.length===5),true)
   if(mod.id==='AS2')assert.equal(a[0].antiStress?.skillId,'S1')
   else {
    assert.equal(a.every(x=>x.antiStress===undefined),true)
    assert.equal(new Set(a.map(x=>x.sections.find(s=>s.kind==='meditation')?.text)).size,14)
    assert.ok(a.every(x=>x.accessibility.stopAnytime))
   }
 }
})
test('finder rejects forged numbers/unknown keys and preserves unanswered as missing',()=>{
 assert.deepEqual(Object.keys(validateModuleFinderAnswers({F1:0,F3:null})).length,8)
 const f=validateModuleFinderAnswers({F1:0,F3:null})
 assert.equal(f.F1,0)
 assert.equal(f.F2,null)
 assert.equal(f.F3,null)
 for(const answers of [{F1:-1},{F2:11},{F1:3.5},{F5:'2'},{F1:NaN},{bad:3},[]]){
  assert.throws(()=>validateModuleFinderAnswers(answers),/MODULE_FINDER_INVALID/)
 }
})
test('safety and gentle start is suggested when both grounding and ability to pause are low',()=>{
 const d=moduleDecision({answers:{...empty(),F1:1,F2:3,F7:1,F8:2},goal:'AS5'})
 assert.equal(d.moduleId,'AS1')
 assert.equal(d.reason,'gentle_start')
 assert.ok(d.evidence.some(e=>e.id==='F1'&&e.value===1))
})
test('user focus is a separate voluntary choice, not a replacement for measured recommendation',()=>{
 const d=moduleDecision({answers:{...empty(),F3:2,F4:3},goal:'AS3'})
 assert.equal(d.moduleId,'AS2')
 assert.equal(d.reason,'reported_overload')
 assert.equal(d.goal,'AS3')
 assert.equal(d.alternativeId,'AS1')
})
test('explicit stress bands are educational, and low function chooses a gentler route',()=>{
 const c=(load,tension,functioning)=>moduleDecision({weekly:{'weekly.load':load,'weekly.tension':tension,'weekly.functioning':functioning}})
 assert.equal(c(10,2,7).moduleId,'AS1')
 assert.equal(c(8,3,8).moduleId,'AS2')
 assert.equal(c(5,6,8).moduleId,'AS3')
 assert.equal(c(4,3,8).moduleId,'AS4')
 assert.equal(c(1,2,9).moduleId,'AS5')
 assert.equal(c(4,3,2).moduleId,'AS3')
 assert.equal(c(6,6,2).moduleId,'AS2')
 assert.equal(moduleDecision({weekly:{'weekly.load':6,'weekly.tension':6,'weekly.functioning':8},goal:'AS4'}).moduleId,'AS3')
 assert.equal(moduleDecision({weekly:{'weekly.load':4,'weekly.tension':4,'weekly.functioning':8},goal:'AS5'}).moduleId,'AS4')
})
test('weak data are labelled provisional, are not silently filled and do not create clinical stages',()=>{
 const d=recommendAntistressModule({weekly:{},answers:{},goal:null})
 assert.equal(d.provisional,true)
 assert.equal(d.available,0)
 assert.equal(d.moduleId,'AS2')
 assert.equal(d.reason,'exploratory')
 assert.equal(Object.keys(d).includes('traumaStage'),false)
 assert.equal(typeof d.version,'string')
 assert.equal(d.version,ANTISTRESS_ROUTER_VERSION)
})
test('weekly extraction requires one recent, versioned, complete, account-side run',()=>{
 const now=Date.parse('2026-10-14T18:00:00Z')
 const makeRow=(at,version='v1',dims=goodWeekly)=>({
  id:'run-current',definitionKey:'hh-weekly-pulse',definitionVersion:version,instrumentLocale:'ru',measurementAt:at,
  dimensions:Object.entries(dims).map(([key,value])=>({key,value,min:0,max:10}))
 })
 const yes=weeklyAxesFromResults([makeRow('2026-10-13T18:00:00Z')],now)
 assert.equal(yes.ready,true)
 assert.equal(yes.values['weekly.load'],8)
 assert.equal(weeklyAxesFromResults([makeRow('2026-10-06T18:00:00Z')],now).ready,false)
 assert.equal(weeklyAxesFromResults([makeRow('2026-10-15T18:00:00Z')],now).ready,false)
 assert.equal(weeklyAxesFromResults([makeRow('2026-10-13T18:00:00Z','v2')],now).ready,false)
 assert.equal(weeklyAxesFromResults([makeRow('2026-10-13T18:00:00Z','v1',{'weekly.load':5})],now).ready,false)
})
test('encrypted envelope payload logic preserves legacy user concern and module selection',()=>{
 assert.deepEqual(unpackCourseModuleContext('I want less stress'),{concerns:'I want less stress',moduleChoice:null})
 const choice={id:'AS4',recommendedId:'AS3',goal:'AS4',answers:{...empty(),F5:2}}
 assert.deepEqual(unpackCourseModuleContext(packCourseModuleContext('Private goal',choice)),{concerns:'Private goal',moduleChoice:choice})
 assert.throws(()=>packCourseModuleContext('x',{id:'AS7'}))
 assert.equal(unpackCourseModuleContext(packCourseModuleContext('Legacy course',{id:'AS6'})).moduleChoice.id,'AS6')
})
test('connected intake screens and server enforce the owner-scoped selection',()=>{
 const ui=read('components/app/course-r3-steps.jsx')
 const modal=read('components/app/antistress-module-finder.jsx')
 const css=read('components/app/antistress-module-finder.module.css')
 const repo=read('lib/app/growth-course.js')
 const day=read('lib/app/growth-daily.js')
 assert.match(ui, /<AntiStressModuleFinder/)
 assert.match(ui, /moduleAnswers:moduleSelection.answers/)
 assert.match(ui, /\['hh-weekly-pulse'\]/)
 assert.match(modal, /data-course-module-finder/)
 assert.match(modal, /data-course-consent-module/)
 assert.match(css, /@media\(max-width:390px\)/)
 assert.match(repo, /weeklyAxesFromResults\(freshResults\)/)
 assert.match(repo, /unpackCourseModuleContext/)
 assert.match(repo, /packCourseModuleContext/)
 assert.match(repo, /row\._moduleCiphertext/)
 assert.match(day, /oporaModuleId/)
 assert.match(day, /moduleLesson\(/)
 assert.match(day, /\.\.\.cycle\.preferences/)
 assert.match(day, /COURSE_ANTISTRESS_OUTCOME_V3/)
 assert.match(repo, /ANTISTRESS_ACTIVE_MODULE_IDS\.includes\(selected\)/)
 assert.match(day, /oporaModuleRouter:ANTISTRESS_ROUTER_VERSION/)
 assert.match(day, /activePreferences\.oporaModuleRouter/)
 assert.match(day, /cycle\.preferences\?\.oporaModuleRouter/)
})

test('seven pairs of trauma-informed educational stages sit inside each of five routes',()=>{
 assert.equal(OPORA_RECOVERY_STAGES.length,7)
 assert.deepEqual(OPORA_RECOVERY_STAGES.map(x=>x.days),[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14]])
 assert.ok(OPORA_ENTRY_AND_EXIT.entry.ru.includes('Тестирование'))
 for(const route of ANTISTRESS_MODULE_GOALS){
   for(let day=1;day<=14;day++){
     if(route.id==='AS2')continue
     const lesson=moduleDayMeta(route.id,day,'ru',ANTISTRESS_ROUTER_VERSION)
     assert.ok(lesson?.title?.length>5)
     assert.ok(lesson?.exercise?.length>40)
   }
 }
 const old=moduleDayMeta('AS4',1,'ru','opora-nav-1.3-20261014')
 const current=moduleDayMeta('AS4',1,'ru',ANTISTRESS_ROUTER_VERSION)
 assert.notEqual(old.title,current.title)
 assert.notEqual(old.exercise,current.exercise)
})
test('public and personal maps show five routes and precise phase cards',()=>{
 const publicLanding=read('components/public-antistress-landing.tsx')
 const publicRoute=read('components/public-antistress-route-map.tsx')
 const personalOverview=read('components/app/course-14-day-overview.jsx')
 const personalCourse=read('components/app/course-today.jsx')
 assert.match(publicLanding, /PublicAntistressRouteMap/)
 assert.match(publicLanding, /oporaRecoveryStages/)
 assert.match(publicRoute, /ANTISTRESS_MODULE_GOALS\.map/)
 assert.match(publicRoute, /data-antistress-five-routes/)
 assert.match(personalOverview, /moduleDayMeta\(moduleId,day\.day,locale,routerVersion\)/)
 assert.match(personalOverview, /oporaRecoveryStages/)
 assert.match(personalCourse, /moduleId=\{data\.programme\?\.moduleId\}/)
 assert.match(personalCourse, /routerVersion=\{cycle\.preferences\?\.oporaModuleRouter\}/)
})
