'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const file='supabase/migrations/20261117000200_commander_ci_historical_head_readback_v5.sql';
const sql=fs.readFileSync(file,'utf8');
test('old HEAD is a read-only inbox receipt, not a retry or implicit source grant',()=>{
 a.match(sql,/HISTORICAL_HEAD_READBACK_PENDING/);
 a.match(sql,/NO_SIGNED_HISTORICAL_ROUTE/);
 a.match(sql,/t\.payload->'ciIncident'->>'head_sha' IS DISTINCT FROM e\.head_sha/);
 a.match(sql,/AND route_followup_receipt IS NULL/);
 a.match(sql,/'sourceFixVerified',false/);
 a.match(sql,/'workerStarted',false/);
 a.match(sql,/'liveVerified',false/);
 a.match(sql,/DO_NOT_DISPATCH_OLD_HEAD/);
 a.match(sql,/SOURCE|HISTORICAL/i);
});
