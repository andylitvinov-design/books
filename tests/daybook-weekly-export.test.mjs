import test from 'node:test'
import assert from 'node:assert/strict'
import {collectWeeklyExport} from '../lib/app/daybook-weekly-export.mjs'
const id=n=>'550e8400-e29b-41d4-a716-'+String(n).padStart(12,'0'),owner=id(1)
const row=(n,weekStart='2026-11-16')=>({id:id(n),revision:1,weekStart,timezone:'America/Toronto',sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,wins:'A private weekly reflection',learning:'',obstacles:'',adjustment:'',nextWeekFocus:'',confirmed:true,createdAt:'2026-11-22T12:00:00.000Z',updatedAt:'2026-11-22T12:00:00.000Z',sources:{asOf:'2026-11-22T12:00:00.000Z',days:[],journal:[],actions:[],nextGoal:null,summary:{selectedDays:0,selectedEntries:0,plannedActions:0,completed:0,open:0,other:0,unavailable:0}}})
test('weekly export reads every owner page and excludes unrelated response fields',async()=>{
 const calls=[]
 const result=await collectWeeklyExport(async(path,body,method,options)=>{calls.push({path,method,options});return calls.length===1?{reviews:[{...row(2),privateToken:'must not export'}],nextCursor:id(2)}:{reviews:[row(3,'2026-11-23')],nextCursor:null}},owner,()=>true)
 assert.equal(result.format,'holistic-house-daybook-weekly-v1');assert.equal(result.consistency,'paginated-not-atomic')
 assert.equal(result.reviews.length,2);assert.equal(JSON.stringify(result).includes('must not export'),false)
 assert.equal(calls[1].path,'daybook-weekly?export=1&limit=50&before='+id(2))
 assert.ok(calls.every(call=>call.method==='GET'&&call.options.accountId===owner))
})
test('empty weekly history is complete without any source-text request',async()=>{
 let count=0;const result=await collectWeeklyExport(async()=>{count++;return {reviews:[],nextCursor:null}},owner,()=>true)
 assert.equal(count,1);assert.deepEqual(result.reviews,[])
})
test('weekly export aborts on account change or a later page error',async()=>{
 let current=true
 await assert.rejects(collectWeeklyExport(async()=>{current=false;return {reviews:[row(2)],nextCursor:null}},owner,()=>current),{code:'ACCOUNT_CHANGED'})
 let count=0
 await assert.rejects(collectWeeklyExport(async()=>{if(count++)throw Error('network');return {reviews:[row(2)],nextCursor:id(2)}},owner,()=>true),/network/)
})
test('malformed snapshots, repeated weeks and cursor gaps cannot produce partial exports',async()=>{
 for(const page of [{reviews:[{...row(2),revision:0}],nextCursor:null},{reviews:[{...row(2),sources:{...row(2).sources,summary:{...row(2).sources.summary,completed:1}}}],nextCursor:null},{reviews:[row(2),row(3)],nextCursor:null},{reviews:[row(2)],nextCursor:id(3)},{reviews:[],nextCursor:id(2)},{reviews:[row(2)],nextCursor:'bad'}])await assert.rejects(collectWeeklyExport(async()=>page,owner,()=>true))
 await assert.rejects(collectWeeklyExport(async()=>({reviews:[row(2)],nextCursor:id(2)}),owner,()=>true),{code:'DAYBOOK_EXPORT_CHANGED'})
})
test('export size uses an encoded byte budget before returning any download',async()=>{
 const original=globalThis.TextEncoder
 try{
  globalThis.TextEncoder=class{encode(){return {byteLength:32*1024*1024+1}}}
  await assert.rejects(collectWeeklyExport(async()=>({reviews:[row(2)],nextCursor:null}),owner,()=>true),{code:'DAYBOOK_EXPORT_TOO_LARGE'})
 }finally{globalThis.TextEncoder=original}
})
