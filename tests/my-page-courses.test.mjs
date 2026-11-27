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

import {summarizeDiscoveryCoverage} from '../lib/app/my-page-courses.mjs'
test('Self Discovery catalogue coverage is ongoing, private and based on actual measurements',()=>{
 assert.equal(summarizeDiscoveryCoverage({done:0,total:100,axes:0,attempts:0}),null)
 assert.deepEqual(summarizeDiscoveryCoverage({done:4,total:100,axes:8,attempts:7}),{key:'self-discovery',kind:'self-discovery',state:'active',done:4,total:100,axes:8,percent:4})
 assert.equal(summarizeDiscoveryCoverage({done:0,total:100,axes:1,attempts:0}).percent,0)
 assert.equal(summarizeDiscoveryCoverage({done:100,total:100,axes:16,attempts:110}).state,'active')
 assert.equal(summarizeDiscoveryCoverage({done:2,total:1,axes:0,attempts:2}),null)
 assert.equal(summarizeDiscoveryCoverage({done:0,total:1,axes:17,attempts:0}),null)
})
