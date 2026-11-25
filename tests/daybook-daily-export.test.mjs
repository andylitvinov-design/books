import test from 'node:test'
import assert from 'node:assert/strict'
import {collectDailyExport} from '../lib/app/daybook-daily-export.mjs'
const id=n=>'550e8400-e29b-41d4-a716-'+String(n).padStart(12,'0'),owner=id(1)
const record=n=>({id:id(n),revision:1,localDay:'2026-11-'+String(n).padStart(2,'0'),timezone:'America/Toronto',weeklyGoalId:id(30),actionIds:[id(40),id(41)],carriedActionIds:[],carryFromDay:null,confirmed:true,createdAt:'2026-11-22T12:00:00.000Z',updatedAt:'2026-11-22T12:00:00.000Z'})
const plan={goals:[{id:id(30),title:'Current goal',privateToken:'never export'},{id:id(31),title:'Unselected private goal'}],actions:[{id:id(40),goalId:id(30),description:'Current step',privateNote:'never export'},{id:id(42),goalId:id(31),description:'Unselected private step'}]}
test('all pages and only linked current wording export with owner-scoped requests',async()=>{
 const calls=[]
 const result=await collectDailyExport(async(path,body,method,options)=>{calls.push({path,method,options});return path.startsWith('coaching-life-plan')?plan:calls.length===1?{intentions:[{...record(2),privateToken:'never export'}],nextCursor:id(2)}:{intentions:[record(3)],nextCursor:null}},owner,()=>true,'ru')
 assert.equal(result.intentions.length,2);assert.equal(result.format,'holistic-house-daybook-daily-v1')
 assert.deepEqual(result.referenceContext.goals,[{id:id(30),title:'Current goal'}]);assert.deepEqual(result.referenceContext.actions,[{id:id(40),goalId:id(30),description:'Current step'}])
 assert.deepEqual(result.referenceContext.missingActionIds,[id(41)])
 assert.equal(JSON.stringify(result).includes('never export'),false);assert.equal(JSON.stringify(result).includes('Unselected'),false)
 assert.equal(calls[1].path,'daybook-daily?export=1&limit=50&before='+id(2))
 assert.equal(calls[2].path,'coaching-life-plan?locale=ru')
 assert.ok(calls.every(call=>call.method==='GET'&&call.options.accountId===owner))
})
test('cancel or account change during any read returns no export',async()=>{
 let current=true
 await assert.rejects(collectDailyExport(async()=>{current=false;return {intentions:[record(2)],nextCursor:null}},owner,()=>current,'en'),{code:'ACCOUNT_CHANGED'})
})
test('invalid content, repeated rows, invalid and looping cursors never yield a partial export',async()=>{
 for(const page of [{intentions:[{...record(2),revision:0}],nextCursor:null},{intentions:[record(2),record(2)],nextCursor:null},{intentions:[],nextCursor:id(2)},{intentions:[record(2)],nextCursor:id(3)},{intentions:[record(2)],nextCursor:'bad'}])await assert.rejects(collectDailyExport(async()=>page,owner,()=>true,'en'))
 await assert.rejects(collectDailyExport(async()=>({intentions:[record(2)],nextCursor:id(2)}),owner,()=>true,'en'),{code:'DAYBOOK_EXPORT_CHANGED'})
})
test('failure loading later pages or reference text cannot label an incomplete file ready',async()=>{
 let count=0
 await assert.rejects(collectDailyExport(async()=>{if(count++)throw Error('network');return {intentions:[record(2)],nextCursor:id(2)}},owner,()=>true,'en'),/network/)
 await assert.rejects(collectDailyExport(async path=>path.startsWith('coaching-life-plan')?{goals:null,actions:[]}:{intentions:[record(2)],nextCursor:null},owner,()=>true,'en'),{code:'DAYBOOK_EXPORT_INVALID'})
})
test('an empty saved history needs no goal-context request or invented content',async()=>{
 let count=0
 const result=await collectDailyExport(async()=>{count++;return {intentions:[],nextCursor:null}},owner,()=>true,'en')
 assert.equal(count,1);assert.deepEqual(result.intentions,[]);assert.deepEqual(result.referenceContext.goals,[])
})
test('erased references remain opaque missing IDs and never fabricate historical wording',async()=>{
 const result=await collectDailyExport(async path=>path.startsWith('coaching-life-plan')?{goals:[],actions:[]}:{intentions:[record(2)],nextCursor:null},owner,()=>true,'en')
 assert.deepEqual(result.referenceContext.goals,[]);assert.deepEqual(result.referenceContext.actions,[])
 assert.deepEqual(result.referenceContext.missingGoalIds,[id(30)]);assert.deepEqual(result.referenceContext.missingActionIds,[id(40),id(41)])
 assert.deepEqual(result.intentions[0].actionIds,[id(40),id(41)])
})
test('account revocation while reading reference wording aborts the entire export',async()=>{
 let current=true
 await assert.rejects(collectDailyExport(async path=>{if(path.startsWith('coaching-life-plan')){current=false;return plan}return {intentions:[record(2)],nextCursor:null}},owner,()=>current,'en'),{code:'ACCOUNT_CHANGED'})
})
