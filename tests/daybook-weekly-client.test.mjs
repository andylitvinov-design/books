import test from 'node:test'
import assert from 'node:assert/strict'
import {createWeeklyReviewSaver} from '../lib/app/daybook-weekly-client.mjs'
const id='550e8400-e29b-41d4-a716-446655440000',operation='550e8400-e29b-41d4-a716-446655440001'
const draft={id,revision:0,weekStart:'2026-11-16',timezone:'America/Toronto',sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,wins:'Private win',learning:'',obstacles:'',adjustment:'',nextWeekFocus:'',confirmed:true}
const review=()=>({...draft,revision:1,sources:{asOf:'2026-11-22T12:00:00.000Z',days:[],journal:[],actions:[],nextGoal:null,summary:{selectedDays:0,selectedEntries:0,plannedActions:0,completed:0,open:0,other:0,unavailable:0}}})
test('save acknowledgement requires a separate exact private readback',async()=>{
 const calls=[],saver=createWeeklyReviewSaver(async(path,body,method,options)=>{calls.push({path,body,method,options});return method==='POST'?{saved:true,review:review()}:{review:review()}},id,()=>operation)
 assert.deepEqual(await saver.save(draft),review());assert.equal(saver.hasPending(),false)
 assert.equal(calls.length,2);assert.equal(calls[0].body.operationId,operation);assert.equal(calls[1].method,'GET');assert.equal(calls[0].options.accountId,id)
})
test('lost save response retains operation and blocks changed drafts until exact retry',async()=>{
 const calls=[];let fail=true
 const saver=createWeeklyReviewSaver(async(path,body,method)=>{calls.push(body);if(fail){fail=false;throw Error('connection lost')}return method==='POST'?{saved:true,review:review()}:{review:review()}},id,()=>operation)
 await assert.rejects(saver.save(draft));assert.equal(saver.hasPending(),true)
 await assert.rejects(saver.save({...draft,wins:'Changed'}),{code:'DAYBOOK_RETRY_PENDING'})
 await saver.save(draft);assert.deepEqual(calls[0],calls[1]);assert.equal(saver.hasPending(),false)
})
test('stale wording or source snapshots cannot be acknowledged as saved',async()=>{
 for(const mutation of [value=>({...value,wins:'Other device'}),value=>({...value,sources:{...value.sources,summary:{...value.sources.summary,completed:1}}}),value=>({...value,revision:2})]){
  const saver=createWeeklyReviewSaver(async(path,body,method)=>method==='POST'?{saved:true,review:review()}:{review:mutation(review())},id,()=>operation)
  await assert.rejects(saver.save(draft),{code:'DAYBOOK_READBACK_CONFLICT'});assert.equal(saver.hasPending(),true)
 }
})
test('discard removes pending memory and rejects late owner responses',async()=>{
 let resolve
 const saver=createWeeklyReviewSaver(()=>new Promise(done=>{resolve=done}),id,()=>operation)
 const request=saver.save(draft);saver.discard();resolve({saved:true,review:review()})
 await assert.rejects(request,{code:'ACCOUNT_CHANGED'});assert.equal(saver.hasPending(),false)
 await assert.rejects(saver.save(draft),{code:'ACCOUNT_CHANGED'})
})
