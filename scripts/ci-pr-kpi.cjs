'use strict';
// Evidence-only aggregation. Collection must explicitly mark each source as
// complete; observations from incomplete sources are samples, never totals.
const SHA=/^[a-f0-9]{40}$/i,KEY=/^[a-f0-9]{32}$/i;
const round=x=>Math.round(x*100)/100;
function quantile(values,q){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),i=(sorted.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);
 return round(sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo));
}
function ratio(numerator,denominator,complete){
 return complete&&denominator>0?{numerator,denominator,percent:round(numerator*100/denominator)}:null;
}
function summarizeWindow({events,jobs,coverage={},now=Date.now(),windowMs}){
 if(!Array.isArray(events)||!Array.isArray(jobs)||!Number.isFinite(now)||!Number.isFinite(windowMs)||windowMs<=0)
  throw Error('INVALID_KPI_INPUT');
 const start=now-windowMs;let validEvents=true,validJobs=true,validTasks=true;
 const eligible=[];
 for(const e of events){
  const at=Date.parse(e?.at||'');
  if(!Number.isFinite(at)||!Number.isSafeInteger(e?.pr)||e.pr<1||!SHA.test(e?.head||'')){validEvents=false;continue;}
  if(at>now)continue;
  eligible.push({...e,time:at});
 }
 eligible.sort((a,b)=>a.time-b.time);
 const byTask=new Map(),green=new Map(),merges=new Map(),allMerges=new Map(),closed=new Map(),live=new Map(),liveFailed=new Map();
 const observed={dispatched:0,claimed:0,source_committed:0,ci_green:0,merged:0,merged_all:0,production_live:0};
 const action=(e)=>e.pr+':'+e.head+':'+e.lane+':'+e.task;
 for(const e of eligible){
  if(['reserved','dispatched','claimed','source_committed','manual','no_action','stale'].includes(e.kind)){
   if(!KEY.test(e.task||'')||!['repair','conflict','ci'].includes(e.lane)){validEvents=false;continue;}
   if(e.kind==='source_committed'&&e.lane!=='repair'){validTasks=false;continue;}
   const key=action(e),old=byTask.get(key)||{};
   if(e.kind==='source_committed'&&!SHA.test(e.newHead||'')){validEvents=false;continue;}
   if(old[e.kind] && (e.kind==='claimed'||e.kind==='dispatched'||
      (e.kind==='source_committed'&&old[e.kind].newHead!==e.newHead)))validTasks=false;
   old[e.kind]??=e;byTask.set(key,old);continue;
  }
  if(e.kind==='ci_green'){const k=e.pr+':'+e.head;if(!green.has(k))green.set(k,e);continue;}
  if(e.kind==='closed_unmerged'){const k=e.pr+':'+e.head;if(!closed.has(k))closed.set(k,e);continue;}
  if(e.kind==='merged'&&typeof e.production==='boolean'&&SHA.test(e.mergeSha||'')){
   const k=e.pr+':'+e.mergeSha;if(!allMerges.has(k))allMerges.set(k,e);
   if(e.production&&!merges.has(k))merges.set(k,e);continue;
  }
  if(e.kind==='live_verified'&&e.production===true&&SHA.test(e.mergeSha||'')&&
     e.aliasVerified===true&&e.smokeVerified===true){const k=e.pr+':'+e.mergeSha;if(!live.has(k))live.set(k,e);continue;}
  if(e.kind==='live_failed'&&e.production===true&&SHA.test(e.mergeSha||'')){const k=e.pr+':'+e.mergeSha;if(!liveFailed.has(k))liveFailed.set(k,e);}
 }
 const tasks=[...byTask.values()],within=e=>e&&e.time>start&&e.time<=now;
 for(const t of tasks)if(['source_committed','manual','no_action'].filter(k=>t[k]).length>1)validTasks=false;
 for(const t of tasks){if(within(t.dispatched))observed.dispatched++;if(within(t.claimed))observed.claimed++;
  if(within(t.source_committed))observed.source_committed++;}
 observed.ci_green=[...green.values()].filter(within).length;
 observed.merged=[...merges.values()].filter(within).length;
 observed.merged_all=[...allMerges.values()].filter(within).length;
 const allClaims=tasks.filter(t=>within(t.claimed)),claims=allClaims.filter(t=>t.claimed.lane==='repair');
 const terminal=claims.filter(t=>['source_committed','manual','no_action'].some(k=>t[k]&&t[k].time>=t.claimed.time));
 const published=terminal.filter(t=>t.source_committed&&t.source_committed.time>=t.claimed.time);
 const wait=allClaims.filter(t=>t.reserved&&t.reserved.time<=t.claimed.time).map(t=>(t.claimed.time-t.reserved.time)/60000);
 const outcomes=new Map();
 for(const e of eligible)if(['ci_first_pass','ci_first_failure'].includes(e.kind)){
  const key=e.pr+':'+e.head;if(!outcomes.has(key))outcomes.set(key,e);
 }
 const ciCohort=tasks.filter(t=>within(t.source_committed)&&t.claimed&&t.source_committed.time>=t.claimed.time);
 const paired=ciCohort.map(t=>({task:t,outcome:outcomes.get(t.claimed.pr+':'+t.source_committed.newHead)}))
  .filter(x=>x.outcome&&x.outcome.time>=x.task.source_committed.time);
 const greens=[...green.values()].filter(within),merged=[...merges.values()];
 const greenTerminal=greens.filter(g=>merged.some(m=>m.pr===g.pr&&m.head===g.head&&m.time>=g.time)||
  (closed.has(g.pr+':'+g.head)&&closed.get(g.pr+':'+g.head).time>=g.time));
 const greenMerged=greenTerminal.filter(g=>merged.some(m=>m.pr===g.pr&&m.head===g.head&&m.time>=g.time));
 const windowMerges=merged.filter(within);
 const mergeTerminal=windowMerges.filter(m=>{const k=m.pr+':'+m.mergeSha,l=live.get(k),f=liveFailed.get(k);
  return (l&&l.time>=m.time)||(f&&f.time>=m.time);});
 const mergedLive=mergeTerminal.filter(m=>{const l=live.get(m.pr+':'+m.mergeSha);return l&&l.time>=m.time;});
 observed.production_live=mergedLive.length;
 const durations=[],queue=[],expense=new Map(),seenJobs=new Set();
 for(const j of jobs){
  const created=Date.parse(j?.created_at||''),started=Date.parse(j?.started_at||''),finished=Date.parse(j?.completed_at||'');
  if(j?.status!=='completed'||typeof j.name!=='string'||!Number.isFinite(created)||!Number.isFinite(started)||
     !Number.isFinite(finished)||created>started||started>finished){validJobs=false;continue;}
  if(finished<=start||finished>now)continue;
  if(!Number.isSafeInteger(j.id)||j.id<1){validJobs=false;continue;}
  if(seenJobs.has(j.id)){validJobs=false;continue;}
  seenJobs.add(j.id);
  const d=(finished-started)/60000;durations.push(d);queue.push((started-created)/60000);
  expense.set(j.name,(expense.get(j.name)||0)+d);
 }
 const tasksComplete=coverage.tasks===true&&validEvents&&validTasks,ciComplete=coverage.ci===true&&validEvents,
  mergesComplete=coverage.merges===true&&validEvents,liveComplete=coverage.live===true&&validEvents,
  jobsComplete=coverage.jobs===true&&validJobs;
 return {coverage:{tasks:tasksComplete,ci:ciComplete,merges:mergesComplete,live:liveComplete,jobs:jobsComplete},observed,
  kpi:{repair_conversion:ratio(published.length,terminal.length,tasksComplete),
   ci_first_pass:ratio(paired.filter(x=>x.outcome.kind==='ci_first_pass').length,paired.length,tasksComplete&&ciComplete),
   green_to_merge:ratio(greenMerged.length,greenTerminal.length,ciComplete&&mergesComplete),
   merge_to_live:ratio(mergedLive.length,mergeTerminal.length,mergesComplete&&liveComplete)},
  wait_minutes:{median:tasksComplete?quantile(wait,.5):null,p95:tasksComplete?quantile(wait,.95):null,n:tasksComplete?wait.length:null},
  job_sample:{label:'SAMPLE_NOT_TOTAL',jobs:durations.length,
   runner_minutes:round(durations.reduce((a,b)=>a+b,0)),
   expensive_checks:[...expense].map(([name,minutes])=>({name,runner_minutes:round(minutes)}))
    .sort((a,b)=>b.runner_minutes-a.runner_minutes||a.name.localeCompare(b.name)).slice(0,5)},
  runner_minutes:jobsComplete?round(durations.reduce((a,b)=>a+b,0)):null,
  queue_wait_minutes:{median:jobsComplete?quantile(queue,.5):null,p95:jobsComplete?quantile(queue,.95):null,n:jobsComplete?queue.length:null},
  expensive_checks:jobsComplete?[...expense].map(([name,minutes])=>({name,runner_minutes:round(minutes)})).sort((a,b)=>b.runner_minutes-a.runner_minutes||a.name.localeCompare(b.name)).slice(0,5):null};
}
module.exports={summarizeWindow,quantile};
