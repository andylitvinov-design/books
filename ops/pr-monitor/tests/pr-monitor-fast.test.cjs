'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'pr-monitor-fast.html'),'utf8');
const css=fs.readFileSync(path.join(root,'pr-monitor-fast.css'),'utf8');
const code=fs.readFileSync(path.join(root,'pr-monitor-fast.js'),'utf8');
const context={module:{exports:{}}};new vm.Script(code).runInNewContext(context);
const {normalizeActivity,normalizeLatency}=context.module.exports;
test('fast first paint has two graph SVGs and minimal resources',()=>{
 assert.match(html,/id="activity-graph"/);assert.match(html,/id="latency-graph"/);
 assert.equal((html.match(/<script /g)||[]).length,1);
 assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
 assert.doesNotMatch(html,/meta http-equiv="refresh"|document.write|Загружаю проверенный монитор/);
 assert.match(css,/@media\(max-width:750px\)/);
});
test('no DOM mutation observers, polling or direct browser GitHub calls',()=>{
 assert.doesNotMatch(code,/new MutationObserver|setInterval|api\.github\.com|raw\.githubusercontent\.com/);
 assert.doesNotMatch(html,/<style\b|onload=|onclick=/);
 assert.match(code,/HH_CI_RUNNER_BINS_V2/);assert.match(code,/HH_PR_STAGE_TIMELINE_V2/);
});
test('CI is shown only for complete hourly coverage',()=>{
 const rows=Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',created:i,merged:i+1}));
 const d={schema:'HH_CI_RUNNER_BINS_V2',pr:{schema:'HH_PR_ACTIVITY_CONSISTENT_V1',intervals:{hour:rows},recent:{created:3,merged:4},coverage:{complete:true}},counts:{hour:[1,2,3,4,5,6]},coverage:{counts_complete:true}};
 const ok=normalizeActivity(d);assert.equal(ok.rows.length,6);assert.equal(ok.rows[5].ci,6);assert.equal(ok.created,3);
 d.coverage.counts_complete=false;const partial=normalizeActivity(d);assert.equal(partial.ci,null);assert.equal(partial.rows[5].ci,null);
});
test('latency requires exact time range and validated cohorts',()=>{
 const buckets=Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',count:i,total:{n:i,median_minutes:i?i*2:null}}));
 const raw={schema:'HH_PR_STAGE_TIMELINE_V2',period_hours:6,buckets};
 const ok=normalizeLatency(raw,6);assert.equal(ok[0].p50,null);assert.equal(ok[3].p50,6);
 assert.throws(()=>normalizeLatency(raw,24));raw.buckets[0].count=-1;assert.throws(()=>normalizeLatency(raw,6));
});
