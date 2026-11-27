import {test} from 'node:test'
import assert from 'node:assert/strict'
import {coursePercent,summarizeMyPageCourses,summarizeClarityRuns,combineMyPageCourses} from '../lib/app/my-page-courses.mjs'
test('only started owned courses; completion differs from saved position',()=>{
 const rows=summarizeMyPageCourses({growth:{courses:[{id:'a',stage:4,status:'active',completedLessons:2,durationDays:14},{id:'b',stage:0},{id:'c',stage:4,status:'completed',completedLessons:14,durationDays:14}]},reiki:{enrolled:true,slideId:'b',status:'active'},sequence:['a','b','c'],business:{course:{startedAt:'2026-11-01',days:{1:{done:true},2:{done:false}}}},protocols:{protocols:[{id:'p',courseSessionId:'goal_result',completedAt:'2026-11-01',provenance:'client_reviewed_dialogue',turns:[{content:'PRIVATE'}]}]}})
 assert.deepEqual(rows.map(c=>c.percent),[14,100,33,1,null])
 assert.equal(JSON.stringify(rows).includes('PRIVATE'),false)
 assert.deepEqual(summarizeMyPageCourses({reiki:{enrolled:false}}),[])
 assert.equal(coursePercent(3,3),99)
 assert.equal(coursePercent(4,3),null)
})
test('independent coaching runs use total server time and do not show ready unstarted purchases',()=>{
 const runs=[{id:'r1',ordinal:1,status:'in_progress',days:[{},{},{}],totalElapsedMs:1800000,currentDay:2},{id:'r2',ordinal:2,status:'ready',days:[{},{},{}],totalElapsedMs:0},{id:'r3',ordinal:3,status:'completed',days:[{},{},{}],totalElapsedMs:3600000}]
 assert.deepEqual(summarizeClarityRuns(runs).map(c=>[c.id,c.percent]),[['r1',50],['r3',100]])
 assert.equal(combineMyPageCourses([{key:'x',state:'closed'}],runs).at(0).id,'r1')
})

import {summarizeAntiStressRuns} from '../lib/app/my-page-courses.mjs'
test('therapy run progress uses only exact verified 45-minute course records',()=>{
 const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),sessions=['anti_stress_ground','anti_stress_calm','anti_stress_resource']
 const run={id:id(1),programId:'anti-stress-three-session',programType:'therapy',status:'in_progress',totalElapsedMs:1350000,days:sessions.map((sessionId,i)=>({sessionId,protocolId:id(i+2),elapsedMs:[900000,450000,0][i],status:['time_limit','paused','not_started'][i]}))}
 assert.deepEqual(summarizeAntiStressRuns([run,run]).map(c=>[c.percent,c.state,c.day]),[[50,'paused',2]])
 assert.deepEqual(summarizeAntiStressRuns([{...run,totalElapsedMs:1},{...run,status:'completed'},{...run,programType:'coaching'},{...run,status:'ready'}]),[])
 const done={...run,status:'completed',totalElapsedMs:2700000,days:run.days.map(d=>({...d,elapsedMs:900000,status:'time_limit'}))}
 assert.equal(summarizeAntiStressRuns([done])[0].percent,100)
})
