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

test('guest cabinet does not require login for public program discovery or MyVideo',()=>{
 const source=readFileSync(new URL('../components/app/my-page-client.jsx',import.meta.url),'utf8')
 assert.ok(source.includes('data-my-page-google'))
 assert.ok(source.includes('data-my-page-discover'))
 assert.ok(source.includes('data-my-page-my-video'))
 assert.ok(source.includes("status==='ready'&&data"))
})

test('My Page keeps public navigation available during private API errors without pretending the user is signed out',()=>{
 const source=readFileSync(new URL('../components/app/my-page-client.jsx',import.meta.url),'utf8')
 const fallback=source.slice(source.indexOf("status==='guest'||status==='error'"),source.indexOf("{notice?"))
 assert.ok(fallback.includes('data-my-page-public-fallback={status}'))
 assert.ok(fallback.includes("status==='error'?"))
 assert.ok(fallback.includes('onClick={()=>void load()}'))
 assert.ok(fallback.includes('data-my-page-discover'))
 assert.ok(fallback.includes('data-my-page-my-video'))
 assert.ok(fallback.includes("+'/holistic-support/mandala'"))
 assert.ok(source.includes("err?.code==='SIGN_IN_REQUIRED'?'guest':'error'"))
 assert.ok(source.includes("status==='ready'&&data"))
 const profile=readFileSync(new URL('../components/app/profile-personal-summary.jsx',import.meta.url),'utf8')
 assert.ok(profile.includes("data-my-page-my-video={href==='/'+language+'/holistic-support/mandala'?true:undefined}"))
})


test('Spanish public program discovery stays localized without changing private cabinet bookmarks',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const route=read('app/[locale]/app/portrait/page.jsx')
 assert.ok(route.includes("query.discover === 'programs' && Object.keys(query).length === 1"))
 assert.ok(route.includes('<ProfileSpaceDashboard locale="es" root="/en/app" accountId={null}/>'))
 assert.ok(route.includes("englishCabinetTarget(['portrait'], query)"))
 assert.ok(read('components/app/my-page-client.jsx').includes("locale==='es'?'/es/app/portrait?discover=programs'"))
 assert.ok(read('components/app/clarity-program.jsx').includes("lang==='es'?'/es/app/portrait?discover=programs'"))
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
