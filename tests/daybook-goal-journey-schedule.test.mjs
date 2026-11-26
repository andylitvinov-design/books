import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_COURSE_SESSIONS} from '../lib/coaching/coach-course-journey.mjs'
import {GOAL_JOURNEY_TAG,goalJourneySchedule,goalJourneyText,parseGoalJourneyNote,goalJourneyNotes} from '../lib/app/goal-journey-schedule.mjs'
const note=(text,extra={})=>({id:'schedule',revision:1,kind:'note',goalId:null,tags:[GOAL_JOURNEY_TAG],text,...extra})
test('28 and 49 days retain the exact eight existing topics and canonical offsets',()=>{
 for(const locale of ['en','ru','es']){
  const a=goalJourneySchedule('2026-11-26',28,locale),b=goalJourneySchedule('2026-11-26',49,locale)
  assert.deepEqual(a.sessions.map(x=>x.id),COACH_COURSE_SESSIONS.map(x=>x.id))
  assert.deepEqual(b.sessions.map(x=>x.id),a.sessions.map(x=>x.id))
  assert.deepEqual(a.sessions.map(x=>x.day),[1,4,8,11,15,18,22,25])
  assert.deepEqual(b.sessions.map(x=>x.day),[1,8,15,22,29,36,43,49])
  assert.equal(a.endDay,'2026-12-23');assert.equal(b.endDay,'2027-01-13')
  assert.ok(a.sessions.every(x=>x.title))
 }
})
test('civil dates are independent of DST and preserve leap days',()=>{
 const a=goalJourneySchedule('2024-02-26',28)
 assert.equal(a.sessions[1].date,'2024-02-29')
 assert.equal(a.sessions[2].date,'2024-03-04')
 assert.equal(goalJourneySchedule('2026-03-07',28).sessions[1].date,'2026-03-10')
 for(const day of ['2026-02-29','2026-04-31','2026-3-01','2026-01-01T00:00:00Z','9999-01-01',null])assert.throws(()=>goalJourneySchedule(day,28))
 for(const pace of [0,7,29,'28',null])assert.throws(()=>goalJourneySchedule('2026-01-01',pace))
})
test('strict private planning note round trips; malformed and duplicate notes are never completion',()=>{
 const text=goalJourneyText('2026-11-26',28),entry=note(text)
 assert.deepEqual(parseGoalJourneyNote(entry),{pace:28,startDay:'2026-11-26'})
 for(const bad of [note(text,{revision:0}),note(text,{goalId:'other'}),note(text,{kind:'morning'}),note('paid'),note(text+' | completed'),note(text,{tags:['clarity-week-1']})])assert.equal(parseGoalJourneyNote(bad),null)
 assert.equal(goalJourneyNotes([entry,note('edited',{id:'second'}),note(text,{goalId:'other'})]).length,2)
})
test('existing account-gated Daybook mounts the planner and uses its verified saver',()=>{
 const page=readFileSync(new URL('../components/app/daybook-journal.jsx',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/app/goal-journey-planner.jsx',import.meta.url),'utf8')
 assert.match(page,/phase==='ready'&&tab==='stages'&&<GoalJourneyPlanner/)
 assert.match(ui,/createJournalSaver\(appFetch,accountId\)/)
 assert.match(ui,/await saver\.current\.save\(pending\.current\)/)
 assert.match(ui,/notes\.length>1/)
 assert.match(ui,/my-coaching-plan\?tab=reports/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|completeSession|checkout|fetch\(['"]/i)
})
