import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PRIMARY_GOAL_AREAS,orderedCoachingAreas,summarizeCoachingProgress} from '../lib/app/coaching-plan-summary.mjs'
import {isUnifiedMobileDockAppPath} from '../lib/unified-mobile-dock.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('five approved primary rows and all eight real life domains are available',()=>{
 const keys=['body_health','emotional_wellbeing','relationships','career_business','finance','personal_growth','lifestyle','meaning_purpose']
 const areas=keys.map(areaKey=>({areaKey,goals:[]}))
 assert.deepEqual(orderedCoachingAreas(areas).map(a=>a.areaKey),PRIMARY_GOAL_AREAS)
 assert.deepEqual(orderedCoachingAreas(areas,true).map(a=>a.areaKey),[...PRIMARY_GOAL_AREAS,'finance','personal_growth','lifestyle'])
})
test('progress values are derived from goals, not fabricated 72% mock-up numbers or self-ratings',()=>{
 assert.deepEqual(summarizeCoachingProgress([]),{totalGoals:0,completedGoals:0,inProgressGoals:0,completionPercent:null,areasWithGoals:0,acceptedActions:0})
 assert.deepEqual(summarizeCoachingProgress([{areaKey:'body_health',selfRating:10,goals:[
  {status:'completed',actions:[{status:'accepted'}]},{status:'in_progress',actions:[]},{status:'proposed',actions:[]}
 ]}]),{totalGoals:3,completedGoals:1,inProgressGoals:1,completionPercent:33,areasWithGoals:1,acceptedActions:1})
})
test('mobile plan keeps old secure save, reports, revoke and delete paths',()=>{
 const jsx=read('components/app/my-coaching-plan.jsx')
 const css=read('components/app/my-coaching-plan.module.css')
 for(const key of ['data-goal-progress','data-goal-areas','data-goal-expanded','summarizeCoachingProgress(domains)',
   'orderedCoachingAreas(domains,showAllAreas)','onClick={()=>saveArea(area)}',"appFetch('coaching-life-plan/areas/",
   "appFetch('personal-coaching-reports'","onClick={()=>revokeContext(permission.sessionId)}",
   "onClick={()=>deleteAction(action)}",'planConsents[record.id]===true','<MyCoachContext',"setTab('context')",
   'contextPermissions'])assert.ok(jsx.includes(key),key)
 assert.doesNotMatch(jsx,/projectCoachContextSnapshot/)
 assert.match(css,/support-first-screen-photos\.webp/)
 assert.match(css,/reiki-approved-sunrise-v3\.webp/)
 assert.match(css,/@media\(max-width:430px\)/)
 assert.doesNotMatch(jsx,/>72%/)
 assert.doesNotMatch(jsx,/MobileBottomNavigation|hh-mobile-app-nav/)
})

test('goals route gets the existing seven-item shared dock, with no duplicate five-item cabinet dock',()=>{
 const shell=read('components/app/app-workspace.jsx')
 for(const lang of ['en','ru','es'])assert.equal(isUnifiedMobileDockAppPath('/'+lang+'/app/my-coaching-plan'),true)
 assert.match(shell,/page !== 'my-coaching-plan' && <nav className="hh-mobile-app-nav"/)
 assert.match(shell,/page !== 'my-coaching-plan' && !courseLanding && \(/)
})
