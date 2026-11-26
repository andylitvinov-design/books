import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reserveLukasVideo,reconcileLukasVideo} from '../lib/coaching/lukas-video-quota-store.mjs'
const actor={id:'11111111-1111-4111-8111-111111111111'}
const sessionId='22222222-2222-4222-8222-222222222222'
const input={actor,googleVerified:true,sessionId,providerCycle:'cycle1',providerEvidence:{verified:true,cycle:'cycle1',observedAtSeconds:1000,cycleEndSeconds:2000,remainingSeconds:3000},flags:{enabled:true,privacyApproved:true,hardStopVerified:true,sharedLedgerVerified:true},overheadSeconds:5}
function fake({busy=false,duplicate=false,row=null}={}){
 const calls=[]
 const db={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('pg_advisory'))return {rows:[]};if(sql.includes('clock_timestamp'))return {rows:[{month_key:'2026-11',seconds_left:20000,now_seconds:'1000'}]};if(sql.includes('bool_or'))return {rows:[{personal_used:80,customer_used:84,total_used:84,busy,overrun:false}]};if(sql.startsWith('select 1'))return {rows:duplicate?[{}]:[]};if(sql.startsWith('select *'))return {rows:row?[row]:[]};return {rows:[]}}}
 return {calls,transaction:async(c,a,fn)=>{assert.equal(a,actor);return fn(db)}}
}
test('lock precedes read and reservation; only server computed balance inserted',async()=>{const f=fake();const r=await reserveLukasVideo({...input,transaction:f.transaction});assert.equal(r.videoSeconds,220);assert.equal(r.providerReserved,225);assert.match(f.calls[0].sql,/pg_advisory_xact_lock/);assert.deepEqual(f.calls.at(-1).args,[sessionId,actor.id,'2026-11','cycle1','customer',220,225])})
test('busy does not insert',async()=>{const f=fake({busy:true});assert.equal((await reserveLukasVideo({...input,transaction:f.transaction})).code,'BUSY');assert.ok(!f.calls.some(c=>c.sql.startsWith('insert')))})
test('stale or mismatched provider evidence fails before ledger allocation',async()=>{for(const evidence of [{...input.providerEvidence,observedAtSeconds:960},{...input.providerEvidence,cycle:'wrong'}]){const f=fake();assert.equal((await reserveLukasVideo({...input,providerEvidence:evidence,transaction:f.transaction})).code,'UNAVAILABLE');assert.equal(f.calls.length,2)}})
test('duplicate session ID not reissued',async()=>{const f=fake({duplicate:true});assert.equal((await reserveLukasVideo({...input,transaction:f.transaction})).code,'UNAVAILABLE');assert.ok(!f.calls.some(c=>c.sql.startsWith('insert')))})
test('guest cannot touch DB',async()=>{assert.equal((await reserveLukasVideo({...input,googleVerified:false,transaction:()=>{throw Error('unexpected')}})).code,'AUTH_REQUIRED')})
const row={session_id:sessionId,state:'reserved',video_reserved:220,provider_reserved:225}
test('unconfirmed end stays uncertain; no refund',async()=>{const f=fake({row});assert.equal((await reconcileLukasVideo({actor,sessionId,transaction:f.transaction,receipt:{ended:true}})).state,'uncertain');assert.match(f.calls.at(-1).sql,/state='uncertain'/)})
test('verified end settles under lock and binds user',async()=>{const f=fake({row});const r=await reconcileLukasVideo({actor,sessionId,transaction:f.transaction,receipt:{verified:true,ended:true,sessionId,videoSeconds:40,providerSeconds:43}});assert.deepEqual(r,{state:'settled',videoCharged:40,providerCharged:43,overrun:false});assert.deepEqual(f.calls[1].args,[sessionId,actor.id]);assert.deepEqual(f.calls.at(-1).args,[sessionId,40,43,false])})
test('cross-user or nonexistent session never updates',async()=>{const f=fake();await assert.rejects(reconcileLukasVideo({actor,sessionId,transaction:f.transaction}),/NOT_FOUND/);assert.equal(f.calls.length,2)})

test('owner reservation is classified separately and still has global cap',async()=>{const f=fake();const r=await reserveLukasVideo({...input,ownerExempt:true,transaction:f.transaction});assert.equal(r.videoSeconds,995);assert.deepEqual(f.calls.at(-1).args,[sessionId,actor.id,'2026-11','cycle1','owner',995,1000])})
test('untrusted owner flag in generic feature flags cannot bypass personal limit',async()=>{const f=fake();const r=await reserveLukasVideo({...input,flags:{...input.flags,ownerExempt:true},transaction:f.transaction});assert.equal(r.videoSeconds,220)})
