import test from 'node:test'
import assert from 'node:assert/strict'
import {weeklyReviewWrite,weeklyDates,resolveWeeklySources} from '../lib/app/daybook-weekly-contract.mjs'
const id=n=>'550e8400-e29b-41d4-a716-'+String(n).padStart(12,'0')
const input=(changes={})=>({id:id(1),operationId:id(2),revision:0,weekStart:'2026-11-16',timezone:'America/Toronto',sourceDays:[{id:id(10),revision:1},{id:id(11),revision:2}],sourceJournal:[{id:id(20),revision:1}],sourceActions:[{id:id(30),revision:2},{id:id(31),revision:1},{id:id(32),revision:null},{id:id(33),revision:3}],nextGoalId:id(40),wins:'A small success',learning:'What helped',obstacles:'Low energy',adjustment:'A smaller step',nextWeekFocus:'Continue gently',confirmed:true,...changes})
const sources=()=>({days:[{id:id(10),revision:1,localDay:'2026-11-16',timezone:'America/Toronto',actionIds:[id(30),id(31),id(32)]},{id:id(11),revision:2,localDay:'2026-11-17',timezone:'America/Toronto',actionIds:[id(30),id(33)]}],journal:[{id:id(20),revision:1,localDay:'2026-11-18',text:'Private source text must not be copied'}],actions:[{id:id(30),revision:2,status:'completed',completedAt:'2026-11-20T12:00:00.000Z',description:'Source wording must not be copied'},{id:id(31),revision:1,status:'active',completedAt:null},{id:id(33),revision:3,status:'deferred',completedAt:null}],goals:[{id:id(40),revision:1,status:'active'}]})
test('review accepts explicit owner reflections and bounded selected source revisions',()=>{
 assert.deepEqual(weeklyReviewWrite(input()),input())
 for(const change of [{accountId:id(1)},{confirmed:false},{weekStart:'2026-11-17'},{weekStart:'2026-02-30'},{timezone:'fake/zone'},{wins:'x'.repeat(2001)},{sourceDays:[{id:id(10),revision:0}]},{sourceActions:[{id:id(30),revision:0}]},{sourceDays:[{id:id(10),revision:1},{id:id(10),revision:1}]},{sourceJournal:Array.from({length:21},(_,n)=>({id:id(100+n),revision:1}))},{providerConsent:true}])assert.throws(()=>weeklyReviewWrite(input(change)))
})
test('calendar weeks remain seven local date keys across DST and year boundaries',()=>{
 assert.deepEqual(weeklyDates('2026-03-02'),['2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08'])
 assert.equal(weeklyDates('2026-10-26').at(-1),'2026-11-01')
 assert.equal(weeklyDates('2025-12-29').at(-1),'2026-01-04')
 assert.throws(()=>weeklyDates('2026-11-22'))
})
test('progress counts distinct planned actions once, preserving missing/other statuses honestly',()=>{
 const snapshot=resolveWeeklySources(input(),sources(),'2026-11-22T15:00:00.000Z')
 assert.deepEqual(snapshot.summary,{selectedDays:2,selectedEntries:1,plannedActions:4,completed:1,open:1,other:1,unavailable:1})
 assert.equal(snapshot.asOf,'2026-11-22T15:00:00.000Z')
 assert.deepEqual(snapshot.nextGoal,{id:id(40),revision:1,status:'active'})
 assert.equal(snapshot.actions.find(x=>x.id===id(32)).status,null)
 assert.equal(JSON.stringify(snapshot).includes('must not be copied'),false)
 assert.equal(sources().actions[0].status,'completed')
})
test('stale days, entries and current action statuses require a fresh preview before confirmation',()=>{
 for(const mutate of [s=>s.days[0].revision++,s=>s.journal[0].revision++,s=>s.actions[0].revision++,s=>s.days.splice(0,1),s=>s.journal.splice(0,1),s=>s.actions.push({id:id(32),revision:1,status:'active',completedAt:null})]){
  const state=sources();mutate(state);assert.throws(()=>resolveWeeklySources(input(),state),{code:'WEEKLY_SOURCE_CHANGED'})
 }
})
test('out-of-week sources, unrelated actions and unavailable next goals cannot enter a review',()=>{
 const cases=[()=>input({sourceActions:[...input().sourceActions,{id:id(99),revision:1}]}),()=>input({nextGoalId:id(99)})]
 for(const make of cases)assert.throws(()=>resolveWeeklySources(make(),sources()))
 for(const mutate of [s=>s.days[0].localDay='2026-11-15',s=>s.journal[0].localDay='2026-11-23',s=>s.goals[0].status='completed',s=>s.actions[0].status='unknown']){
  const state=sources();mutate(state);assert.throws(()=>resolveWeeklySources(input(),state))
 }
})
test('empty weeks and skipped reflections are valid, without invented progress or percentages',()=>{
 const empty=input({sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,wins:'',learning:'',obstacles:'',adjustment:'',nextWeekFocus:''})
 const result=resolveWeeklySources(empty,{days:[],journal:[],actions:[],goals:[]})
 assert.deepEqual(result.summary,{selectedDays:0,selectedEntries:0,plannedActions:0,completed:0,open:0,other:0,unavailable:0})
 assert.equal(Object.hasOwn(result.summary,'percentage'),false)
})
