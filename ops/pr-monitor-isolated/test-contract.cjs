'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),css=read('monitor.css'),js=read('monitor.js'),conf=JSON.parse(read('vercel.json'));
const sandbox={module:{exports:{}}};new vm.Script(js).runInNewContext(sandbox);
const {activity,speed,compactRecords,strictCohort,delay,SCHEMAS,URLS}=sandbox.module.exports;
test('one static CSS + one deferred JS; all eight main sections exist',()=>{
 assert.equal((html.match(/<script /g)||[]).length,1);
 assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
 assert.match(html,/<script src="\/monitor\.js" defer>/);
 for(const id of ['overview','graphs','stages','ci','queue','prs','repair','issues'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/holistic-house-agents-director\.vercel\.app/);
 assert.ok(css.length>6500);assert.match(css,/@media\(max-width:750px\)/);
});
test('strict public read-only origin and 8 explicit API allowlist rewrites',()=>{
 assert.equal(conf.rewrites.length,8);
 for(const [key,url]of Object.entries(URLS)){
  const route=conf.rewrites.find(x=>x.source===url.split('?')[0]);
  assert.ok(route,key);
  assert.equal(route.destination,'https://holistic-house-pr-monitor.vercel.app'+route.source);
 }
 assert.ok(!conf.rewrites.some(x=>x.source.includes('(.*)')));
 const csp=conf.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value;
 assert.match(csp,/script-src 'self'/);assert.doesNotMatch(csp,/unsafe-inline/);
});
test('no client direct GitHub API calls, MutationObserver, infinite refresh loops or secrets',()=>{
 assert.doesNotMatch(js,/MutationObserver|setInterval\s*\(|api\.github\.com|raw\.githubusercontent\.com|process\.env|localStorage/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.match(js,/AbortController/);
});
test('PR and CI activity is evidence-backed and incomplete CI stays unknown',()=>{
 const bins=Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',created:i+1,merged:i}));
 const source={schema:SCHEMAS.flow,pr:{schema:'HH_PR_ACTIVITY_CONSISTENT_V1',intervals:{hour:bins},recent:{created:3,merged:1},coverage:{complete:true},stale:false},counts:{hour:[1,2,3,4,5,6]},coverage:{counts_complete:true}};
 const one=activity(source);assert.equal(one.rows.length,6);assert.equal(one.ci,6);
 source.coverage.counts_complete=false;
 assert.equal(activity(source).ci,null);
 assert.equal(activity(source).rows[5].ci,null);
 source.schema='WRONG';
 assert.throws(()=>activity(source));
});
test('PR → Merge latency never treats absent P50 as zero',()=>{
 const source={schema:SCHEMAS.speed,period_hours:24,buckets:Array.from({length:6},(_,i)=>({start:'2026-11-12T0'+i+':00:00Z',count:i,total:{n:i,median_minutes:i?i*2:null}}))};
 const row=speed(source);assert.equal(row[0].median,null);assert.equal(row[3].median,6);
 source.buckets[0].count=-1;assert.throws(()=>speed(source));assert.equal(delay(null),'—');
});
test('compact per-PR list bounds untrusted data and keeps actual GitHub SHAs',()=>{
 const make=(i)=>[i,'a'.repeat(40),1,1791000000,1791000000+i,0,0,0,0,0,0,0,0,0,0,0];
 const source={schema:SCHEMAS.queue,pr_timestamps:{records:JSON.stringify([make(12),make(22)])}};
 const a=compactRecords(source);assert.equal(a.length,2);assert.equal(a[0].number,22);assert.equal(a[0].sha,'aaaaaaaaaa');
 source.pr_timestamps.records='INVALID JSON';assert.equal(compactRecords(source).length,0);
});

test('PR to Merge median card is populated from verified stage cohort',()=>{
 assert.match(js,/put\('k-median'/);
 assert.match(js,/population\.full\?\.n>0/);
 assert.match(js,/put\('k-median-note'/);
});

test('production cohort and data freshness are explicit and comparable',()=>{
 assert.match(URLS.stages,/hours=24&scope=production/);
 assert.match(html,/Открыто из созданных · 24 ч/);
 assert.match(html,/Production PR → Merge · P50/);
 assert.match(js,/d\.selection\?\.scope!=='production'/);
 assert.match(js,/среднее /);
 assert.match(js,/Есть устаревший источник/);
 assert.match(js,/Самый ранний срез/);
});

test('strict cohort: identical production time window, no old merges, additive CI stages',()=>{
 const source={schema:SCHEMAS.cohort,generated_at:'2026-11-13T20:00:00Z',
  cohort_max_hours:48,coverage:{complete:true},rows:[
   {number:1,base:'codex/public-book-library',created_at:'2026-11-13T19:00:00Z',merged_at:'2026-11-13T19:10:00Z'},
   {number:2,base:'codex/public-book-library',created_at:'2026-11-13T18:00:00Z',merged_at:'2026-11-13T19:10:00Z'},
   {number:3,base:'codex/public-book-library',created_at:'2026-11-13T19:00:00Z',merged_at:null},
   {number:4,base:'codex/bootstrap-books',created_at:'2026-11-13T19:00:00Z',merged_at:'2026-11-13T19:05:00Z'}
 ]};
 const archive={schema:SCHEMAS.archive,coverage:{history_complete:false},rows:[
  {pr:1,first_at:'2026-11-13T19:01:00Z',last_at:'2026-11-13T19:09:00Z',
   stages_ms:{workflow_wait:60000,runner_wait:60000,checks:240000,between_waves_unknown:120000,other_unknown:0},
   runs:2,repeats:1,partial:true}
 ]};
 const one=strictCohort(source,archive,1);
 assert.equal(one.n,1);assert.equal(one.created_prs,2);assert.equal(one.mean_minutes,10);
 assert.equal(one.coverage.ci_window_prs,1);assert.equal(one.coverage.partial_ci_history_prs,1);
 assert.equal(one.buckets.reduce((s,b)=>s+b.count,0),1);
 assert.ok(Math.abs(one.stage_keys.reduce((s,k)=>s+one.stages[k].contribution_mean_minutes,0)-10)<1e-8);
 assert.equal(strictCohort(source,archive,6).n,2);
 assert.throws(()=>strictCohort(source,archive,72),/NOT_COVERED/);
 source.coverage.complete=false;assert.throws(()=>strictCohort(source,archive,1),/INCOMPLETE/);
});
test('one header mean and P50 share strict cohort; missing archive is not zero',()=>{
 assert.match(html,/id="strict-mean"/);
 assert.match(html,/id="strict-stage-rows"/);
 assert.match(js,/strictHours=Number\(b\.dataset\.cohortHours\)/);
 assert.match(js,/renderStrictCohort/);
 assert.match(js,/if\(key!=='cohort'\)fn\(data\)/);
 assert.match(js,/data\?\.schema!==SCHEMAS\.stages/);
});
