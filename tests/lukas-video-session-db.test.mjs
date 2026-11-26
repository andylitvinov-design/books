import test from 'node:test'
import assert from 'node:assert/strict'
import {createLukasSessionDb} from '../lib/coaching/lukas-video-session-db.mjs'
const access={googleVerified:true,actor:{id:'11111111-1111-4111-8111-111111111111'}}
const sessionId='22222222-2222-4222-8222-222222222222'
function mock(rows=[]){const calls=[];return {calls,db:createLukasSessionDb({transaction:async(c,a,fn)=>{assert.equal(a,access.actor);return fn({query:async(sql,args)=>{calls.push({sql,args});return {rows}}})}})}}
test('mint attempt atomically transitions the owned reservation once before vendor call',async()=>{const m=mock([{session_id:sessionId}]);assert.equal(await m.db.beginMint({access,sessionId,issueDeadlineSeconds:1030}),true);assert.match(m.calls[0].sql,/pg_advisory_xact_lock/);assert.match(m.calls[1].sql,/mint_attempted_at is null/);assert.match(m.calls[1].sql,/issue_deadline>clock_timestamp/);assert.deepEqual(m.calls[1].args,[sessionId,access.actor.id,1030])})
test('expired, already attempted or nonowned reservation cannot mint',async()=>{const m=mock();assert.equal(await m.db.beginMint({access,sessionId,issueDeadlineSeconds:1030}),false)})
test('browser stop cannot clear the lease or overwrite the safety deadline',async()=>{const m=mock();await m.db.markUncertain({access,sessionId,latestPossibleEndSeconds:0});assert.match(m.calls[1].sql,/state='uncertain'/);assert.doesNotMatch(m.calls[1].sql,/latest_possible_end/);assert.deepEqual(m.calls[1].args,[sessionId,access.actor.id])})
test('guest cannot invoke server db adapter',async()=>{const m=mock();await assert.rejects(m.db.beginMint({access:{...access,googleVerified:false},sessionId,issueDeadlineSeconds:1030}),/AUTH_REQUIRED/);assert.equal(m.calls.length,0)})
