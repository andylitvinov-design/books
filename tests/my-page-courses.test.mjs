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

import {readFileSync} from 'node:fs'
test('My Page is the private course hub; real goal selection and saved lesson routing survive',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const courses=read('components/app/my-page-courses.jsx'),goal=read('components/app/profile-goal-console.jsx'),dashboard=read('components/app/profile-space-dashboard.jsx'),dock=read('lib/unified-mobile-dock.mjs')
 assert.ok(courses.includes('aria-expanded={expanded} aria-controls={region}'))
 assert.ok(courses.includes('hidden={!expanded}>{expanded&&content}'))
 assert.ok(courses.includes('guideGoalProgress(goalSnapshot?.entries,id)'))
 assert.ok(courses.includes('selectedGoalId={c.id} cabinetSnapshot={snapshot}'))
 assert.ok(goal.includes('goals.find(goal => String(goal.id) === selectedGoalId)'))
 assert.ok(goal.includes('profileDaybookHref(root, goalId, next.week, next.step)'))
 assert.ok(dashboard.includes('if (accountId && !embeddedSection) return <Link'))
 assert.ok(dock.includes('case "profile": return prefix+"/my-page";'))
 assert.ok(courses.includes("data-my-page-courses"))
 assert.ok(courses.includes("accountId,signal:controller.signal"))
})
