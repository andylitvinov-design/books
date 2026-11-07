'use strict';
/* HH_CI_VERIFIED_LOAD_V1. An active GitHub workflow is NOT proof of a live job.
 * The model never counts completed jobs as load and never turns missing data into 0.
 */
const ACTIVE = new Set(['in_progress','queued','waiting','pending','requested']);
const WAIT = new Set(['queued','waiting','pending','requested']);
const STALE_AFTER_MIN = 45;
const JOB_FRESH_MIN = 90;
const CI_NAME = /(?:\bcore\b|\bci\b|\btest(?:s|ing)?\b|\blint\b|\bbrowser\b|\bguard\b|\bspecialist\b|\bsecurity\b|mandala|actionlint|typecheck|playwright|release gate|production acceptance|database verification|isolated verification|axis-to-offer matching)/i;
const NOT_CI = /(?:watchdog|auto.?merge|triage|worker|dispatcher|sweep|cron|notification|monitor|reconcile|repair|direction watcher|production coordinator|inventory)/i;
const SCHEMA = 'HH_CI_VERIFIED_LOAD_V1';
function type(name) {
  if (typeof name !== 'string') return 'other';
  return NOT_CI.test(name) ? 'other' : CI_NAME.test(name) ? 'ci' : 'other';
}
function timestamp(value) {
  if (typeof value !== 'string') return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
function minutes(value,now) {
  const n=timestamp(value);
  return n===null||n>now+60000?null:Math.max(0,Math.floor((now-n)/60000));
}
function validCount(n) {return Number.isSafeInteger(n)&&n>=0&&n<=1000000;}
function selectRuns(inventory) {
  if (!Array.isArray(inventory) || inventory.length!==5) throw Error('INVALID_STATUS_INVENTORY');
  const selected=new Map(); let complete=true;
  for(const x of inventory) {
    if(!x || !validCount(x.total_count) || !Array.isArray(x.workflow_runs) ||
       x.workflow_runs.length>100 || x.workflow_runs.length>x.total_count)
      throw Error('INVALID_STATUS_RESPONSE');
    if(x.workflow_runs.length!==x.total_count) complete=false;
    for(const r of x.workflow_runs) {
      if(!Number.isSafeInteger(r?.id)||r.id<1 || !ACTIVE.has(r.status)||
         typeof r.name!=='string') throw Error('INVALID_WORKFLOW_RUN');
      selected.set(r.id,r);
    }
  }
  return {runs:[...selected.values()].sort((a,b)=>b.id-a.id),complete};
}
function evaluateRun(run,jobPage,now) {
  if(!Number.isSafeInteger(run?.id)||run.id<=0||!ACTIVE.has(run.status))
    throw Error('INVALID_RUN');
  if(!jobPage||!validCount(jobPage.total_count)||!Array.isArray(jobPage.jobs)||
     jobPage.jobs.length>100||jobPage.jobs.length!==jobPage.total_count)
    throw Error('INCOMPLETE_JOB_PAGE');
  let running=0,waiting=0,completed=0,aged=0;
  const seen=new Set();
  for(const j of jobPage.jobs) {
    if(!Number.isSafeInteger(j?.id)||j.id<=0||seen.has(j.id)||
       !['in_progress','queued','waiting','pending','requested','completed'].includes(j.status))
      throw Error('INVALID_JOB');
    if(j.run_id!=null&&j.run_id!==run.id)throw Error('CROSS_RUN_JOB');
    seen.add(j.id);
    if(j.status==='completed'){completed++;continue;}
    const age=minutes(j.status==='in_progress'?j.started_at:j.created_at,now);
    if(age===null || age>JOB_FRESH_MIN){aged++;continue;}
    if(j.status==='in_progress')running++;
    else waiting++;
  }
  const age=minutes(run.created_at,now);
  const stalled=age!==null && age>=STALE_AFTER_MIN && running===0 && waiting===0 &&
    (completed>0 || aged>0 || run.status!=='in_progress');
  const reason=!stalled?null:
    aged>0?'JOB_STATUS_OLDER_THAN_FRESHNESS_WINDOW':
    completed>0?'WORKFLOW_ACTIVE_AFTER_ALL_JOBS_FINISHED':
    'QUEUED_WORKFLOW_WITHOUT_JOBS';
  return {id:run.id,name:run.name,kind:type(run.name),url:run.html_url,
    status:run.status,age_minutes:age,running_jobs:running,queued_jobs:waiting,
    terminal_jobs:completed,aged_jobs:aged,stale:stalled,reason,
    verified:true};
}
function series(recent,now) {
  if(!recent||!Array.isArray(recent.workflow_runs)||!validCount(recent.total_count)||
     recent.workflow_runs.length>100||recent.workflow_runs.length>recent.total_count)
    throw Error('INVALID_RECENT_RUNS');
  const end=Math.floor(now/600000)*600000+600000,begin=end-3600000;
  const bins=Array.from({length:6},(_,i)=>({at:new Date(begin+i*600000).toISOString(),ci:0,other:0}));
  for(const r of recent.workflow_runs){
    const at=timestamp(r?.created_at);
    if(at===null||at<begin||at>=end||r.conclusion==='skipped')continue;
    // Events with no created job are registered workflows, not completed CI.
    const idx=Math.floor((at-begin)/600000),kind=type(r.name);
    bins[idx][kind]++;
  }
  const oldest=recent.workflow_runs.reduce((m,r)=>{
    const t=timestamp(r.created_at);return t!==null?Math.min(m,t):m;
  },Infinity);
  return {bins,complete:recent.workflow_runs.length===recent.total_count||oldest<=begin,
    meaning:'REGISTERED_NON_SKIPPED_WORKFLOWS_NOT_JOB_EXECUTIONS'};
}
function scheduleHealth(scheduled,now) {
  if(!scheduled||!Array.isArray(scheduled.workflow_runs))return {status:'UNKNOWN',rows:[]};
  const names=['HH PR 10-minute watchdog','HH PR direction watcher','HH zero-cost PR CI worker'];
  const rows=names.map(name=>{
    const row=scheduled.workflow_runs.find(r=>r.name===name&&r.event==='schedule');
    const age=minutes(row?.created_at,now);
    return {name,last_at:row?.created_at||null,age_minutes:age,
      status:age===null?'UNKNOWN':age>35?'DELAYED':'OBSERVED',url:row?.html_url||null};
  });
  return {status:rows.some(x=>x.status==='DELAYED')?'DELAYED':
    rows.some(x=>x.status==='UNKNOWN')?'UNKNOWN':'OBSERVED',rows,
    note:'GitHub schedule is best-effort; event-driven Watchdog remains primary.'};
}
function summarize({statusPages,jobPages,recent,scheduled},now=Date.now(),cap=16) {
  const selected=selectRuns(statusPages);
  const limited=selected.runs.slice(0,cap),items=[];
  let complete=selected.complete&&selected.runs.length<=cap;
  for(const r of limited){
    const page=jobPages?.[r.id];
    try{items.push(evaluateRun(r,page,now));}
    catch{complete=false;items.push({id:r.id,name:r.name,kind:type(r.name),url:r.html_url,
      status:r.status,age_minutes:minutes(r.created_at,now),verified:false,
      stale:false,reason:'JOB_EVIDENCE_UNAVAILABLE',running_jobs:null,queued_jobs:null});}
  }
  const tally=(kind,key)=>items.filter(x=>x.verified&&x.kind===kind)
    .reduce((n,x)=>n+x[key],0);
  const result={schema:SCHEMA,observed_at:new Date(now).toISOString(),
    coverage:{complete,checked_runs:items.filter(x=>x.verified).length,
      listed_runs:selected.runs.length,limit:cap,lower_bound:!complete},
    ci:{running_jobs:tally('ci','running_jobs'),queued_jobs:tally('ci','queued_jobs'),
      active_workflows:items.filter(x=>x.verified&&x.kind==='ci'&&!x.stale).length,
      stale_workflows:items.filter(x=>x.verified&&x.kind==='ci'&&x.stale).length},
    other:{running_jobs:tally('other','running_jobs'),queued_jobs:tally('other','queued_jobs'),
      active_workflows:items.filter(x=>x.verified&&x.kind==='other'&&!x.stale).length},
    stale:items.filter(x=>x.verified&&x.stale),
    incomplete:items.filter(x=>!x.verified).map(x=>({id:x.id,name:x.name,url:x.url})),
    trend:series(recent,now),schedule:scheduleHealth(scheduled,now)};
  return result;
}
module.exports={SCHEMA,STALE_AFTER_MIN,JOB_FRESH_MIN,type,minutes,selectRuns,evaluateRun,
  series,scheduleHealth,summarize};
