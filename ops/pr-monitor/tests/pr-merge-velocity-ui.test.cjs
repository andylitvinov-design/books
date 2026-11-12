'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {normalize,duration}=require('../pr-merge-velocity-ui.js');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'pr-merge-velocity-ui.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'pr-two-screen-boot.js'),'utf8');
function sample(hours=6){return {schema:'HH_PR_STAGE_TIMELINE_V2',period_hours:hours,buckets:Array.from({length:6},(_,i)=>({start:new Date(Date.UTC(2026,10,11,i)).toISOString(),end:new Date(Date.UTC(2026,10,11,i+1)).toISOString(),count:i,total:{n:i,median_minutes:i?i*3:null}}))};}
test('six aligned bins, zero-coverage treated as unknown, no fake 0 minutes',()=>{const rows=normalize(sample(),6);assert.equal(rows.length,6);assert.equal(rows[0].p50,null);assert.equal(rows[5].p50,15);assert.equal(duration(null),'—');assert.equal(rows[5].perHour,5);});
test('reject mismatched period, missing intervals and non-proven median',()=>{assert.throws(()=>normalize(sample(24),6));assert.throws(()=>normalize({...sample(),buckets:[]},6));const invalid=sample();invalid.buckets[4].total.n=7;assert.throws(()=>normalize(invalid,6));});
test('renderer is first-party, mounted visibly, read-only and range-switchable',()=>{assert.match(src,/getElementById\('hh-merge-velocity'\)/);assert.match(src,/hhv-graph/);assert.match(src,/hhv-buckets/);assert.match(src,/aria-pressed/);assert.match(src,/pr-stage-timeline\?hours=/);assert.doesNotMatch(src,/setInterval\(|workflow_dispatch|holistic-house-pr-monitor-bh2iww787/);assert.match(boot,/pr-merge-velocity-ui\.js\?v=20261111-direct-source-v3/);});
