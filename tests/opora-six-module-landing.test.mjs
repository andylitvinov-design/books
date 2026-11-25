import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ANTISTRESS_MODULE_GOALS,ANTISTRESS_ACTIVE_MODULE_IDS,ANTISTRESS_ROUTER_VERSION} from '../lib/inner-growth/antistress-module-router.js'
import {moduleDayOutline} from '../lib/inner-growth/antistress-module-lessons.js'
import {OPORA_RECOVERY_STAGES} from '../lib/inner-growth/antistress-recovery-pathway.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('guest and public entries explain six distinct course phases, T0 assessment and seven recovery stages',()=>{
 const publicPage=read('components/public-antistress-landing.tsx')
 const guest=read('components/app/course-guest-landing.jsx')
 const map=read('components/public-antistress-route-map.tsx')
 const journey=read('components/antistress-module-journey.jsx')
 const styles=read('components/public-antistress-route-map.module.css')
 assert.match(publicPage,/PublicAntistressRouteMap/)
 assert.match(guest,/PublicAntistressRouteMap/)
 assert.match(map,/data-antistress-six-routes/)
 assert.match(map,/ANTISTRESS_MODULE_GOALS\.map/)
 assert.match(map,/onSelect\(route.id\)/)
 assert.match(map,/HH Weekly Pulse|Weekly Pulse/)
 assert.match(journey,/data-opora-six-modules/)
 assert.match(publicPage,/oporaRecoveryStages/)
 assert.match(guest,/Course14DayOverview/)
 assert.equal(OPORA_RECOVERY_STAGES.length,7)
 assert.match(styles,/@media\(max-width:640px\)/)
 assert.doesNotMatch(map,/localStorage|sessionStorage|fetch\(/)
})

test('exactly six course phases are published, with four active interactive self-guided previews',()=>{
 assert.deepEqual(ANTISTRESS_ACTIVE_MODULE_IDS,['AS1','AS2','AS3','AS4','AS5','AS6'])
 assert.deepEqual(ANTISTRESS_MODULE_GOALS.map(m=>m.id),ANTISTRESS_ACTIVE_MODULE_IDS)
 for(const lang of ['ru','en']){
  for(const mod of ANTISTRESS_MODULE_GOALS.filter(m=>m.id!=='AS2')){
   const outline=moduleDayOutline(mod.id,lang,ANTISTRESS_ROUTER_VERSION)
   assert.equal(outline.length,14)
   assert.deepEqual(outline.map(item=>item.day),Array.from({length:14},(_,i)=>i+1))
   assert.equal(new Set(outline.map(item=>item.title)).size,14)
   assert.ok(outline.every(item=>item.practice.length>25))
  }
 }
 assert.deepEqual(moduleDayOutline('AS2','ru',ANTISTRESS_ROUTER_VERSION),[])
 assert.deepEqual(moduleDayOutline('unknown','en'),[])
})

test('My Courses keeps the selected route without overriding legacy lesson versions',()=>{
 const selector=read('components/app/course-entry-selector.jsx')
 const daily=read('lib/app/growth-daily.js')
 const seo=read('app/[locale]/courses/antistress/page.tsx')
 assert.match(selector,/course\?\.moduleChoice\?\.id/)
 assert.match(selector,/antistressModuleTitle\(moduleId,locale,course\.moduleChoice\.version\|\|''\)/)
 assert.match(selector,/moduleId=\{course\?\.moduleChoice\?\.id\|\|null\}/)
 assert.match(selector,/routerVersion=\{course\?\.moduleChoice\?\.version\|\|null\}/)
 assert.match(daily,/oporaModuleRouter/)
 // Current public copy promises one programme with six personalized routes,
 // not six independent courses. Route selection and stored versions stay pinned.
 assert.match(seo,/14 занятий · 6 маршрутов/)
 assert.match(seo,/14 Days & 6 Learning Paths/)
 assert.match(seo,/14 días y 6 rutas/)
 assert.match(seo,/Клинический маршрут — только со специалистом/)
 assert.match(seo,/The clinical path requires a professional/)
 assert.match(seo,/La ruta clínica requiere un profesional/)
 assert.doesNotMatch(seo,/6 курсов по 14 дней|Six 14-Day Courses/)
})
