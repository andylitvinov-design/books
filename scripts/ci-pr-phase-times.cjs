'use strict';
// Times are measured ONLY for authenticated event pairs or completed Actions
// jobs. The cohort is by phase completion, NOT by PR creation. Missing != zero.
const SHA=/^[a-f0-9]{40}$/i,TASK=/^[a-f0-9]{32}$/i;
const names=[
 'created_to_ready','ready_to_triage','triage_to_claimed',
 'reserved_to_dispatched','dispatched_to_claimed','claimed_to_source_published',
 'source_published_to_ci_queued','core_job_queued_to_runner',
 'core_runner_to_job_completed','specialist_job_queued_to_runner',
 'specialist_runner_to_job_completed','browser_job_queued_to_runner',
 'browser_runner_to_job_completed','runner_to_ci_green',
 'ci_green_to_merge','merged_to_live_verified'];
const rnd=x=>Math.round(x*100)/100;
function quant(a,p){
 if(!a.length)return null;
 const s=[...a].sort((x,y)=>x-y),n=(s.length-1)*p,l=Math.floor(n),h=Math.ceil(n);
 return rnd(s[l]+(s[h]-s[l])*(n-l));
}
function summarizePhaseMinutes({events,jobs,now,windowMs,coverage={}}){
 if(!Array.isArray(events)||!Array.isArray(jobs)||!Number.isFinite(now)||
  !Number.isFinite(windowMs)||windowMs<=0)throw Error('INVALID_PHASE_INPUT');
 const start=now-windowMs,values=Object.fromEntries(names.map(k=>[k,[]]));
 const add=(k,a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||b<a||
  b<=start||b>now)return;values[k].push((b-a)/60000);};
 const tasks=new Map(),ambiguous=new Set(),greens=[],merges=[],lives=[];
 for(const event of events){
  if(!Number.isSafeInteger(event?.pr)||event.pr<1||!SHA.test(event.head||''))continue;
  const time=Date.parse(event.at||'');if(!Number.isFinite(time)||time>now)continue;
  const e={...event,time};
  if(['reserved','dispatched','claimed','source_committed'].includes(e.kind)){
   if(!TASK.test(e.task||'')||!['repair','conflict','ci'].includes(e.lane))continue;
   const key=[e.pr,e.head,e.task,e.lane].join(':');
   const existing=tasks.get(key)||{};
   if(existing[e.kind])ambiguous.add(key);
   existing[e.kind]=e;tasks.set(key,existing);
  }else if(e.kind==='ci_green')greens.push(e);
  else if(e.kind==='merged'&&e.production===true&&SHA.test(e.mergeSha||''))merges.push(e);
  else if(e.kind==='live_verified'&&e.production===true&&SHA.test(e.mergeSha||'')&&
   e.aliasVerified===true&&e.smokeVerified===true)lives.push(e);
 }
 for(const [key,t] of tasks){
  if(ambiguous.has(key))continue;
  add('reserved_to_dispatched',t.reserved?.time,t.dispatched?.time);
  add('dispatched_to_claimed',t.dispatched?.time,t.claimed?.time);
  if(t.claimed?.lane==='repair'&&SHA.test(t.source_committed?.newHead||''))
   add('claimed_to_source_published',t.claimed.time,t.source_committed.time);
 }
 const kinds={'core-lint-types-build':['core_job_queued_to_runner','core_runner_to_job_completed'],
  'hh-specialist':['specialist_job_queued_to_runner','specialist_runner_to_job_completed'],
  browser:['browser_job_queued_to_runner','browser_runner_to_job_completed']};
 const seen=new Set();
 for(const j of jobs){
  const pair=kinds[j?.name];
  if(!pair||j.status!=='completed'||!Number.isSafeInteger(j.id)||seen.has(j.id))continue;
  seen.add(j.id);
  const a=Date.parse(j.created_at||''),b=Date.parse(j.started_at||''),
   c=Date.parse(j.completed_at||'');
  if(![a,b,c].every(Number.isFinite)||a>b||b>c)continue;
  add(pair[0],a,b);add(pair[1],b,c);
 }
 for(const m of merges){
  const g=greens.filter(e=>e.pr===m.pr&&e.head===m.head&&e.time<=m.time)
   .sort((a,b)=>b.time-a.time)[0];
  if(g)add('ci_green_to_merge',g.time,m.time);
  const l=lives.filter(e=>e.pr===m.pr&&e.mergeSha===m.mergeSha&&e.time>=m.time)
   .sort((a,b)=>a.time-b.time)[0];
  if(l)add('merged_to_live_verified',m.time,l.time);
 }
 const stages={};
 for(const name of names){
  const a=values[name],jobsBased=name.includes('job_')||name.includes('runner_to_job_');
  const complete=jobsBased?coverage.jobs===true:
   ['reserved_to_dispatched','dispatched_to_claimed','claimed_to_source_published'].includes(name)?coverage.tasks===true:
   name==='ci_green_to_merge'?coverage.ci===true&&coverage.merges===true:
   name==='merged_to_live_verified'?coverage.merges===true&&coverage.live===true:false;
  stages[name]={n:a.length,average_min:a.length?rnd(a.reduce((x,y)=>x+y,0)/a.length):null,
   median_min:quant(a,.5),p90_min:quant(a,.9),
   coverage:a.length?(complete?'COMPLETE_NON_ATOMIC':'SAMPLE_NOT_TOTAL'):'NO_MATCHED_TIMESTAMPS'};
 }
 return {cohort:'TRANSITION_ENDING_IN_WINDOW_NOT_PR_CREATED',stages};
}
module.exports={summarizePhaseMinutes};
