import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildFinalCourseRetest, compareFinalCourseTests } from '../lib/inner-growth/course-final-retest.js'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const base = {
  definitionKey:'hh-weekly-pulse',definitionVersion:'v1',instrumentLocale:'en',
  scoringKey:'weekly-key',scoringVersion:'v1',
}
const dims = value => [
  {key:'weekly.tension',value,min:0,max:10,direction:'higher_is_more_difficult'},
  {key:'weekly.resource',value:10-value,min:0,max:10,direction:'higher_is_more_resource'},
]
const result = (id,at,value,over={}) => ({
  id,measurementAt:at,dimensions:dims(value),...base,...over,
})
const meta=[{key:'hh-weekly-pulse',version:'v1',title:'Weekly Pulse',startable:true,
  rightsStatus:'cleared',suggestedRepeatDays:7,scaleLabels:{'weekly.tension':'Tension'}}]
const period={testKeys:['hh-weekly-pulse'],metadata:meta,
  startedAt:'2026-10-13T12:00:00Z',completedAt:'2026-10-26T18:00:00Z'}

test('exact original selected test is re-offered after day 14, using a fixed before-cycle result',()=>{
  const results=[
    result('older','2026-10-10T10:00:00Z',9),
    result('baseline','2026-10-13T11:59:00Z',8),
    result('during','2026-10-20T10:00:00Z',5),
    result('final','2026-10-26T19:30:00Z',3),
  ]
  const out=buildFinalCourseRetest({...period,results})
  assert.equal(out.ready,true)
  assert.equal(out.completedCount,1)
  assert.equal(out.totalCount,1)
  assert.equal(out.fullyRetested,true)
  assert.equal(out.tests[0].baselineResultId,'baseline')
  assert.equal(out.tests[0].afterResultId,'final')
  assert.deepEqual(out.tests[0].comparison[0],{key:'weekly.tension',from:8,to:3,delta:-5,min:0,max:10,
    direction:'higher_is_more_difficult',label:'Tension'})
})

test('before cycle, during practice and uncompleted tests are not confused with a final retest',()=>{
 const out=buildFinalCourseRetest({...period,results:[
   result('baseline','2026-10-11T10:00:00Z',0),
   result('during','2026-10-24T18:00:00Z',9),
 ]})
 assert.equal(out.tests[0].completed,false)
 assert.equal(out.tests[0].baselineResultId,'baseline')
 assert.equal(out.tests[0].canRepeat,true)
 assert.equal(out.completedCount,0)
 assert.equal(out.tests[0].afterDate,null)
 const empty=buildFinalCourseRetest({...period,completedAt:null,results:[]})
 assert.equal(empty.ready,false)
})

test('version/scoring and min-max scale mismatches do not generate a progress claim',()=>{
 const before=result('a','2026-10-11T10:00:00Z',6)
 assert.equal(compareFinalCourseTests(before,result('b','2026-10-27T10:00:00Z',4,{scoringVersion:'v2'})),null)
 const newScale=result('c','2026-10-27T10:00:00Z',2)
 newScale.dimensions[0].max=100
 assert.deepEqual(compareFinalCourseTests(before,newScale),[
   {key:'weekly.resource',from:4,to:8,delta:4,min:0,max:10,direction:'higher_is_more_resource'},
 ])
 const out=buildFinalCourseRetest({...period,results:[before,
   result('d','2026-10-27T10:00:00Z',4,{definitionVersion:'v2'})]})
 assert.equal(out.tests[0].versionChanged,true)
 assert.equal(out.tests[0].completed,false)
 assert.equal(out.tests[0].afterResultId,null)
})

test('short retest intervals are guidance, not an invented hard contraindication',()=>{
 const m=[{...meta[0],suggestedRepeatDays:90}]
 const out=buildFinalCourseRetest({...period,metadata:m,results:[result('a','2026-10-13T11:00:00Z',5)]})
 assert.equal(out.tests[0].repeatSuggestedLater,true)
 assert.equal(out.tests[0].canRepeat,true)
 assert.equal(out.tests[0].suggestedRepeatDays,90)
})

test('private daily read, server day lock and final-test link are required',()=>{
 const source=read('lib/app/growth-daily.js')
 const today=read('components/app/course-today.jsx')
 const player=read('components/app/course-slide-player.jsx')
 const workspace=read('components/app/app-workspace.jsx')
 const flow=read('lib/app/course-test-flow.js')
 assert.match(source,/growth_sessions where account_id=\$1 and cycle_id=\$2/)
 assert.match(source,/finalSaved/)
 assert.match(source,/COURSE_NEXT_DAY_ONLY/)
 assert.match(source,/today\.date<=dateString\(finalSaved\.local_date\)/)
 assert.match(source,/if\(!Number\.isInteger\(input\.day\)\|\|input\.day!==today\.day\)/)
 assert.match(source,/on conflict\(cycle_id,day_number\) do nothing/)
 assert.match(source,/finalSession && \(dayInfo\.day===14 \|\| dayInfo\.isAfterCycle\)/)
 assert.match(source,/provenance->>'definitionKey'=any\(\$2::text\[\]\)/)
 assert.match(today,/<CourseFinalRetest/)
 assert.match(player,/data-course-post-lesson-promo/)
 assert.match(player,/finalRetestReady/)
 assert.match(player,/promotion\.show && earned/)
 assert.match(workspace,/searchParams\.get\('course'\) === 'retest'/)
 assert.match(flow,/startOrResumeCourseFinalRetest/)
 assert.match(flow,/if\(!today\?\.finalRetest\?\.ready \|\| !item\?\.canRepeat\)/)
 assert.doesNotMatch(player + today + flow,/localStorage|sessionStorage|sendBeacon|dangerouslySetInnerHTML/)
})

test('verified active ad-free membership suppresses course upsells without trusting a user-selected tier',()=>{
 const src=read('components/app/use-course-promotion.js')
 assert.match(src,/headers:\{'X-HH-Account-ID':accountId\}/)
 assert.match(src,/value\.entitlement\.active===true \|\| value\.entitlement\.adFree===true/)
 assert.match(src,/if\(!response\.ok\)throw/)
 assert.match(src,/if\(response\.status===404\)/)
 assert.match(src,/value\.enabled && !value\.sandbox/)
})
