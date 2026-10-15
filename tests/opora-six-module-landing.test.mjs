import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ANTISTRESS_MODULE_GOALS} from '../lib/inner-growth/antistress-module-router.js'
import {moduleDayOutline} from '../lib/inner-growth/antistress-module-lessons.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('the two site entry points explain one programme with six modules and 8+8 assessments',()=>{
 const publicPage=read('components/public-antistress-landing.tsx')
 const guest=read('components/app/course-guest-landing.jsx')
 const journey=read('components/antistress-module-journey.jsx')
 const style=read('components/antistress-module-journey.module.css')
 assert.match(publicPage,/<AntiStressModuleJourney locale=\{locale\} sectionId="antistress-modules"/)
 assert.match(guest,/<AntiStressModuleJourney locale=\{locale\} sectionId="opora-guest-modules"/)
 assert.match(publicPage,/id: "antistress-modules", title: "6 модулей"/)
 assert.match(publicPage,/href="#antistress-modules"/)
 assert.match(guest,/href="#opora-guest-modules"/)
 assert.match(journey,/data-opora-six-modules/)
 assert.match(journey,/data-opora-module-id=\{item.id\}/)
 assert.match(journey,/ANTISTRESS_MODULE_GOALS\.map/)
 assert.match(journey,/HH Weekly Pulse/)
 assert.match(journey,/Module Finder/)
 assert.match(journey,/14/)
 assert.match(style,/@media\(max-width:520px\)/)
 assert.match(style,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.doesNotMatch(journey,/localStorage|sessionStorage|fetch\(/)
})
test('all six modules keep distinct public titles; five new modules have 14 distinct exercises',()=>{
 assert.deepEqual(ANTISTRESS_MODULE_GOALS.map(m=>m.id),['AS1','AS2','AS3','AS4','AS5','AS6'])
 for(const lang of ['ru','en']){
  for(const mod of ANTISTRESS_MODULE_GOALS.filter(m=>m.id!=='AS2')){
   const outline=moduleDayOutline(mod.id,lang)
   assert.equal(outline.length,14)
   assert.deepEqual(outline.map(item=>item.day),Array.from({length:14},(_,i)=>i+1))
   assert.equal(new Set(outline.map(item=>item.title)).size,14)
   assert.ok(outline.every(item=>item.practice.length>25))
  }
 }
 assert.deepEqual(moduleDayOutline('AS2','ru'),[])
 assert.deepEqual(moduleDayOutline('not-a-module','en'),[])
})
test('My Courses shows the confirmed module and its own outline without overwriting the AS2 canonical plan',()=>{
 const selector=read('components/app/course-entry-selector.jsx')
 assert.match(selector,/course\?\.moduleChoice\?\.id/)
 assert.match(selector,/antistressModuleTitle\(moduleId,locale\)/)
 assert.match(selector,/moduleDayOutline\(course.moduleChoice.id,locale\)/)
 assert.match(selector,/data-opora-module-day-outline/)
 assert.match(selector,/course.moduleChoice.id!=='AS2'/)
 assert.match(selector,/<Course14DayOverview/)
 const program=read('components/app/course-r3-steps.jsx')
 assert.match(program,/<AntiStressModuleFinder/)
 assert.match(program,/moduleId:moduleSelection.moduleId/)
})
