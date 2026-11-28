import test from 'node:test'
import assert from 'node:assert/strict'
import {createGoalRun,advanceGoalRun} from '../lib/coaching/goal-course-runs.mjs'
import {createGoalResultDocument,validateGoalResultDocument} from '../lib/coaching/goal-result-document.mjs'
import {appendCoachCourseFieldReview} from '../lib/coaching/coach-course-protocol-schema.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
test('Goal result is independently identified, bound and reviewed-only',()=>{
 let run=createGoalRun({id:id(100),goalId:id(200),entitlementId:id(300),protocolIds:Array.from({length:8},(_,i)=>id(i+1)),createdAt:0})
 const event={courseRunId:run.id,courseSessionId:'goal_result',day:1,protocolId:id(1),segmentId:id(40),connectionId:id(20),coachId:'mira'}
 run=advanceGoalRun(run,{...event,expectedRevision:0,type:'begin',atMs:0,consent:{kind:'explicit_client_session_consent',decision:'start',protocolId:id(1),connectionId:id(20),coachId:'mira',atMs:0,turnId:'start'}})
 for(let atMs=10000;atMs<=1200000;atMs+=10000)run=advanceGoalRun(run,{...event,expectedRevision:run.clock.revision,type:'observe',atMs,evidence:'server_observed_connected'})
 const turns=[{role:'user',content:'I want a clear weekly work plan.'},{role:'assistant',content:'Private coach commentary.'},{role:'user',content:'Unrelated private observation.'},{role:'assistant',content:'Tell me more.'}]
 const protocol={id:id(1),courseSessionId:'goal_result',locale:'en',provenance:'client_reviewed_dialogue',durationSeconds:1200,savedAt:'2026-11-27T12:00:00.000Z',turns,courseFieldReview:appendCoachCourseFieldReview(null,'goal_result',turns,'goal','turn:0')}
 const options={id:id(500),sourceHash:'a'.repeat(64),createdAt:'2026-11-27T12:01:00.000Z'}
 const doc=createGoalResultDocument(run,1,protocol,options)
 assert.equal(doc.id,id(500));assert.equal(doc.protocolId,id(1));assert.equal(doc.courseRunId,run.id);assert.equal(doc.goalId,run.goalId)
 assert.equal(doc.answers.find(x=>x.fieldId==='goal').answer,turns[0].content)
 assert.equal(doc.answers.filter(x=>x.status==='confirmed').length,1)
 assert.doesNotMatch(JSON.stringify(doc),/Private coach commentary|Unrelated private observation/)
 assert.equal(Object.hasOwn(doc,'goalAchieved'),false)
 assert.throws(()=>createGoalResultDocument(run,2,protocol,options),/CONFLICT/)
 assert.throws(()=>createGoalResultDocument(run,1,{...protocol,provenance:'client_autosaved_unreviewed_draft'},options),/STILL_OPEN/)
 assert.throws(()=>createGoalResultDocument(run,1,protocol,{...options,sourceHash:'fake'}),/INVALID/)
 assert.throws(()=>validateGoalResultDocument({...doc,answers:[...doc.answers,{...doc.answers[0]}]}),/INVALID/)
})

import {readFileSync} from 'node:fs'
test('proposed Goal result storage fails closed and retains exact-owner encrypted source binding',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/goal-course-store.js'),sql=read('docs/coaching/goal-course-storage.proposal.sql')
 assert.match(store,/TRUSTED_GOAL_STORAGE_READY=false/)
 assert.match(store,/await lockCourseOwner\(db,actor\)/)
 assert.match(store,/where account_id=\$1 and protocol_id=\$2/)
 assert.match(store,/seal\(doc,resultCtx\(actor,doc.id\),config\)/)
 assert.match(store,/sourceHash:operationHash/)
 assert.match(sql,/unique\(account_id,course_run_id,course_day\)/)
 assert.match(sql,/references app_private.my_coach_protocol_records\(account_id,protocol_id\) on delete cascade/)
 assert.match(sql,/alter table app_private.goal_course_result_records force row level security/)
 assert.doesNotMatch(sql,/grant update[^;]*goal_course_result_records/)
})
