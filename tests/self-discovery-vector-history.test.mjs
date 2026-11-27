import test from 'node:test'
import assert from 'node:assert/strict'
import {vectorFingerprint,vectorHistoryRows,vectorHistoryRange} from '../lib/profile/self-discovery-vector-history.mjs'
import {readFileSync} from 'node:fs'
const rate=(current,recordedAt,desired=8)=>({current,desired,recordedAt,source:'self'})
const a=rate(0,'2026-11-01T12:00:00Z'),b=rate(6,'2026-11-08T12:00:00Z'),c=rate(6,'2026-11-15T12:00:00Z')
const snap=(revision,rating)=>({revision,savedAt:rating?.recordedAt||'2026-11-20T12:00:00Z',vectors:{version:1,inner:{focusId:null,ratings:{}},outer:{focusId:null,ratings:rating?{body_health:rating}:{}}}})
test('zero, remeasurements, missing and unchanged snapshots preserve real history',()=>{
 const rows=vectorHistoryRows([snap(4,b),snap(1,a),snap(2,a),snap(3,b),snap(5,c),snap(6,null)],'outer','body_health')
 assert.deepEqual(rows.map(r=>r.current),[0,6,6])
 assert.deepEqual(rows.map(r=>r.revision),[1,3,5])
 assert.equal(vectorHistoryRows([snap(1,a)],'inner','body_health').length,0)
 assert.equal(vectorHistoryRange(rows,'2026-11-08','2026-11-15').length,2)
 assert.equal(vectorHistoryRange(rows,'2026-11-20','2026-11-01').length,0)
 assert.equal(vectorFingerprint(snap(1,a).vectors),vectorFingerprint(snap(2,a).vectors))
 assert.notEqual(vectorFingerprint(snap(1,b).vectors),vectorFingerprint(snap(2,c).vectors))
})
test('history is owner-scoped, append-only and part of CAS transaction',()=>{
 const source=readFileSync(new URL('../lib/app/development-goals.js',import.meta.url),'utf8')
 assert.match(source,/account_id=\$1 and revision<=\$2/)
 assert.match(source,/on conflict\(account_id,revision\) do nothing/)
 assert.ok(source.indexOf("if (!row) throw new AppError('DEVELOPMENT_GOALS_CONFLICT'")<source.indexOf('if(vectorFingerprint(prior'))
 assert.match(source,/seal\(vectors,historyContext\(actor,id\),config\)/)
 const sql=readFileSync(new URL('../supabase/migrations/20261127140625_hh_self_discovery_vector_history.sql',import.meta.url),'utf8')
 assert.match(sql,/force row level security/)
 assert.match(sql,/references app.accounts\(id\) on delete cascade/)
 assert.match(sql,/grant select,insert on/)
 assert.doesNotMatch(sql,/grant[^;]*update/)
})
