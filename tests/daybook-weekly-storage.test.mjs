import test from 'node:test'
import assert from 'node:assert/strict'
import {weeklyReviewWrite,resolveWeeklySources} from '../lib/app/daybook-weekly-contract.mjs'
import {weeklyReviewKey,sealWeeklyReview,readWeeklyReview} from '../lib/app/daybook-weekly-storage.mjs'
import {seal,openSealed} from '../lib/app/crypto.js'
const id=n=>'550e8400-e29b-41d4-a716-'+String(n).padStart(12,'0'),account=id(1)
const config={encryptionKey:Buffer.alloc(32,6),encryptionKeyId:'synthetic'}
const input={id:id(2),operationId:id(3),revision:0,weekStart:'2026-11-16',timezone:'America/Toronto',sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,wins:'Synthetic private win',learning:'What helped',obstacles:'Low energy',adjustment:'Try a smaller step',nextWeekFocus:'Continue gently',confirmed:true}
const snapshot=resolveWeeklySources(input,{days:[],journal:[],actions:[],goals:[]},'2026-11-22T15:00:00.000Z')
const context={accountId:account,recordId:input.id,field:'daybook.weekly'}
function row(){return {id:input.id,revision:1,week_key:weeklyReviewKey(account,input.weekStart,config),payload_ciphertext:sealWeeklyReview(account,input,snapshot,1,config)}}
test('weekly private content is encrypted and read back with only confirmed sources and no operation ID',()=>{
 const value=row(),result=readWeeklyReview(account,value,config)
 const expected=weeklyReviewWrite(input);delete expected.operationId
 assert.deepEqual(result,{...expected,revision:1,sources:snapshot})
 assert.equal(value.payload_ciphertext.includes(input.wins),false);assert.equal(value.payload_ciphertext.includes(input.weekStart),false)
 assert.notEqual(weeklyReviewKey(account,input.weekStart,config),weeklyReviewKey(id(99),input.weekStart,config))
})
test('owner, record, week and revision binding fail closed',()=>{
 const value=row()
 for(const patch of [{id:id(4)},{revision:2},{week_key:'a'.repeat(64)}])assert.throws(()=>readWeeklyReview(account,{...value,...patch},config))
 assert.throws(()=>readWeeklyReview(id(99),value,config),{code:'PRIVATE_DATA_UNAVAILABLE'})
 assert.throws(()=>sealWeeklyReview(account,input,snapshot,2,config))
})
test('authenticated but malformed payload, forged progress and unreviewed source keys cannot become trusted history',()=>{
 const value=row(),payload=openSealed(value.payload_ciphertext,context,config)
 for(const delta of [{kind:'unknown'},{sources:{...snapshot,summary:{...snapshot.summary,completed:1}}},{sources:{...snapshot,providerTranscript:'not authorized'}}]){
  const cipher=seal({...payload,...delta},context,config)
  assert.throws(()=>readWeeklyReview(account,{...value,payload_ciphertext:cipher},config))
 }
})

test('maximum valid escaped reflections and source selections fit the bounded encrypted record',()=>{
 const days=Array.from({length:7},(_,n)=>({id:id(100+n),revision:1,localDay:'2026-11-'+String(16+n),timezone:'America/Argentina/Buenos_Aires',actionIds:Array.from({length:3},(_,k)=>id(300+n*3+k))}))
 const journal=Array.from({length:20},(_,n)=>({id:id(200+n),revision:1,localDay:'2026-11-17'}))
 const actions=Array.from({length:21},(_,n)=>({id:id(300+n),revision:1,status:'completed',completedAt:'2026-11-20T12:00:00.000Z'}))
 const full={...input,sourceDays:days.map(({id,revision})=>({id,revision})),sourceJournal:journal.map(({id,revision})=>({id,revision})),sourceActions:actions.map(({id,revision})=>({id,revision})),...Object.fromEntries(['wins','learning','obstacles','adjustment','nextWeekFocus'].map(key=>[key,'\u0001'.repeat(2000)]))}
 const sources=resolveWeeklySources(full,{days,journal,actions,goals:[]})
 const cipher=sealWeeklyReview(account,full,sources,1,config)
 assert.ok(Buffer.byteLength(cipher)<=131072)
 const value=readWeeklyReview(account,{id:full.id,revision:1,week_key:weeklyReviewKey(account,full.weekStart,config),payload_ciphertext:cipher},config)
 assert.equal(value.wins,full.wins);assert.equal(value.sources.summary.completed,21)
})
