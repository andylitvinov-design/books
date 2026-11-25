'use strict';
/* HH_PR_DASHBOARD_ISOLATED_V1: verified read-only evidence, no timers, no DOM watchers */
(function(env){
const REPO='https://github.com/andylitvinov-design/books';
const URLS=Object.freeze({flow:'/api/ci-runner-trends',speed:'/api/pr-stage-timeline?hours=24',stages:'/api/pr-stage-overview?hours=24&scope=production',ci:'/api/ci-insights',queue:'/api/control-tower-stats',repair:'/api/pr-three-kpis',ciLive:'/api/ci-queue-detail',period:'/api/pr-merge-period',cohort:'/api/pr-created-cohort',archive:'/api/ci-journey-summary?hours=72',comparison:'/api/ci-stage-weekly',funnel:'/api/ci-error-funnel?hours=24',open:'/api/pr-open-count'});
const SCHEMAS=Object.freeze({flow:'HH_CI_RUNNER_BINS_V2',speed:'HH_PR_STAGE_TIMELINE_V2',stages:'HH_PR_STAGE_OVERVIEW_V1',ci:'HH_CI_DEEP_MONITOR_V1',queue:'HH_CONTROL_DISPATCH_METRICS_V1',repair:'HH_PR_THREE_KPI_V1',ciLive:'HH_PR_CI_QUEUE_DETAIL_V1',period:'HH_PR_MERGE_PERIOD_V1',cohort:'HH_PR_CREATED_COHORT_V1',archive:'HH_CI_FIRST_LAST_ARCHIVE_V1',comparison:'HH_CI_JOURNEY_PERIOD_COMPARISON_V1',funnel:'HH_PR_REPAIR_EVIDENCE_FUNNEL_V1',open:'HH_PR_OPEN_COUNT_V1'});
const safeNum=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
const number=n=>safeInt(n)?n.toLocaleString('ru-RU'):'—';
const delay=n=>!safeNum(n)?'—':n<1?Math.round(n*60)+' сек':n<60?n.toLocaleString('ru-RU',{maximumFractionDigits:1})+' мин':(n/60).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ч';
const clampText=(v,n=120)=>String(v??'').slice(0,n);
const isTime=s=>Number.isFinite(Date.parse(s));
const stamp=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(d):'—';};
const hour=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',hour12:false}).format(d):'?';};
function activity(data){
 if(data?.schema!==SCHEMAS.flow||data.pr?.schema!=='HH_PR_ACTIVITY_CONSISTENT_V1')throw Error('ACTIVITY_SCHEMA');
 const rows=data.pr?.intervals?.hour;
 if(!Array.isArray(rows)||rows.length!==6||!rows.every(r=>isTime(r.start)&&safeInt(r.created)&&safeInt(r.merged)))throw Error('ACTIVITY_BINS');
 const ci=data.counts?.hour,validCI=data.coverage?.counts_complete===true&&Array.isArray(ci)&&ci.length===6&&ci.every(safeInt);
 return {rows:rows.map((r,i)=>({time:r.start,created:r.created,merged:r.merged,ci:validCI?ci[i]:null})),created:safeInt(data.pr.recent?.created)?data.pr.recent.created:null,merged:safeInt(data.pr.recent?.merged)?data.pr.recent.merged:null,ci:validCI?ci[5]:null,complete:validCI&&data.pr.coverage?.complete===true&&!data.pr.stale,sourceTime:data.generated_at};
}
function speed(data){
 if(data?.schema!==SCHEMAS.speed||data.period_hours!==24||!Array.isArray(data.buckets)||data.buckets.length!==6)throw Error('SPEED_SCHEMA');
 return data.buckets.map(r=>{const n=r.total?.n,m=r.total?.median_minutes;if(!isTime(r.start)||!safeInt(r.count)||!safeInt(n)||n>r.count||(n>0&&!safeNum(m)))throw Error('SPEED_BIN');return{time:r.start,count:r.count,n,median:n>0?m:null};});
}
function compactRecords(data){
 if(data?.schema!==SCHEMAS.queue)return[];
 const src=data.pr_timestamps?.records;if(typeof src!=='string'||src.length>750000)return[];
 let rows;try{rows=JSON.parse(src)}catch{return[];}if(!Array.isArray(rows))return[];
 return rows.filter(r=>Array.isArray(r)&&r.length>=16&&safeInt(r[0])&&typeof r[1]==='string'&&/^[0-9a-f]{40}$/i.test(r[1])&&safeInt(r[4]))
 .sort((a,b)=>b[4]-a[4]).slice(0,15).map(r=>({number:r[0],sha:r[1].slice(0,10),updated:r[4],prod:r[2]===1,ready:safeInt(r[7])&&r[7]>0,triage:safeInt(r[8])&&r[8]>0,claimed:safeInt(r[9])&&r[9]>0}));
}

function periodSummary(d,hours){
 if(![1,6,24].includes(hours)||d?.schema!==SCHEMAS.period||d.period_hours!==hours||d.coverage?.complete!==true||!isTime(d.observed_at)||!safeInt(d.current?.created)||!safeInt(d.current?.merged))throw Error('PERIOD_UNVERIFIED');
 return{hours,created:d.current.created,merged:d.current.merged,at:d.observed_at};
}
function activeCI(d){
 if(d?.schema!==SCHEMAS.ciLive||!isTime(d.generated_at)||!safeInt(d.counts?.workflows_running)||!safeInt(d.counts?.workflows_queued))throw Error('CI_LIVE_UNVERIFIED');
 return{running:d.counts.workflows_running,queued:d.counts.workflows_queued,at:d.generated_at};
}
function openBacklog(d){
 if(d?.schema!==SCHEMAS.queue||!isTime(d.checked_at)||!safeInt(d.counts?.discovered_open_prs))throw Error('BACKLOG_UNVERIFIED');
 return{open:d.counts.discovered_open_prs,at:d.checked_at};
}
function liveOpenCount(d){
 if(d?.schema!==SCHEMAS.open||d.complete!==true||!isTime(d.generated_at)||!safeInt(d.open))throw Error('OPEN_COUNT_UNVERIFIED');
 return {open:d.open,at:d.generated_at};
}
/* HH_STRICT_CREATED_MERGED_COHORT_V1_BEGIN */
function strictCohort(source, archive, hours) {
  const SCHEMA='HH_STRICT_CREATED_MERGED_COHORT_V1';
  const KEYS=['before_unknown','workflow_wait','runner_wait','checks',
    'ci_wave_unknown','ci_other_unknown','after_unknown','no_archive_unknown'];
  const CORE=['workflow_wait','runner_wait','checks','between_waves_unknown','other_unknown'];
  const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  const ms=x=>{const v=Date.parse(typeof x==='string'?x:'');return Number.isFinite(v)?v:null};
  const quant=(rows,q)=>{if(!rows.length)return null;const a=[...rows].sort((x,y)=>x-y),p=(a.length-1)*q,i=Math.floor(p),j=Math.ceil(p);return a[i]+(a[j]-a[i])*(p-i)};
  if(![1,6,24,48].includes(hours))throw Error('COHORT_PERIOD_NOT_COVERED');
  if(source?.schema!=='HH_PR_CREATED_COHORT_V1'||source.coverage?.complete!==true||
     !Array.isArray(source.rows))throw Error('COHORT_INCOMPLETE');
  const end=ms(source.generated_at);
  if(end===null)throw Error('COHORT_TIME_INVALID');
  const start=end-hours*3600000;
  if(source.cohort_max_hours!=null&&Number(source.cohort_max_hours)<hours)
    throw Error('COHORT_PERIOD_NOT_COVERED');
  const base='codex/public-book-library',selected=[],seen=new Set();
  for(const r of source.rows) {
    if(r?.base!==base)continue;
    const created=ms(r.created_at);
    if(created===null||created<start||created>=end)continue;
    if(!Number.isSafeInteger(r.number)||r.number<1||seen.has(r.number))
      throw Error('COHORT_DUPLICATE_OR_INVALID_PR');
    seen.add(r.number);
    selected.push({pr:r.number,created,merged:ms(r.merged_at),state:r.state});
  }
  const rows=selected.filter(p=>p.merged!==null&&p.merged>=p.created&&p.merged>=start&&p.merged<=end)
    .map(p=>({pr:p.pr,created_at:new Date(p.created).toISOString(),
      merged_at:new Date(p.merged).toISOString(),minutes:(p.merged-p.created)/60000}));
  const durations=rows.map(p=>p.minutes);
  const n=rows.length,mean=n?durations.reduce((a,b)=>a+b,0)/n:null;
  const byPr=new Map(),hasArchive=archive?.schema==='HH_CI_FIRST_LAST_ARCHIVE_V1'&&Array.isArray(archive.rows);
  if(hasArchive)for(const row of archive.rows){
    if(!Number.isSafeInteger(row?.pr)||row.pr<1)continue;
    if(byPr.has(row.pr))byPr.set(row.pr,null);
    else byPr.set(row.pr,row);
  }
  const sums=Object.fromEntries(KEYS.map(k=>[k,0]));
  const samples=Object.fromEntries(KEYS.map(k=>[k,[]]));
  let covered=0,partial=0,missing=0,invalid=0,totalWaves=0,totalRetries=0;
  const paths=[];
  for(const p of rows){
    const created=ms(p.created_at),merged=ms(p.merged_at);
    const candidate=byPr.get(p.pr),stage=candidate?.stages_ms;
    const first=ms(candidate?.first_at),last=ms(candidate?.last_at);
    const matches=hasArchive&&candidate&&first!==null&&last!==null&&
      first>=created&&last<=merged&&last>=first&&
      CORE.every(k=>valid(stage?.[k]))&&
      Math.abs(CORE.reduce((a,k)=>a+stage[k],0)-(last-first))<=10;
    const values=matches?{
      before_unknown:(first-created)/60000,
      workflow_wait:stage.workflow_wait/60000,
      runner_wait:stage.runner_wait/60000,
      checks:stage.checks/60000,
      ci_wave_unknown:stage.between_waves_unknown/60000,
      ci_other_unknown:stage.other_unknown/60000,
      after_unknown:(merged-last)/60000,
      no_archive_unknown:0
    }:Object.fromEntries(KEYS.map(k=>[k,k==='no_archive_unknown'?p.minutes:0]));
    if(matches){
      covered++;
      if(candidate.partial===true)partial++;
      totalWaves+=Number.isSafeInteger(candidate.runs)?candidate.runs:0;
      totalRetries+=Number.isSafeInteger(candidate.repeats)?candidate.repeats:0;
    } else if(hasArchive&&byPr.has(p.pr))invalid++; else missing++;
    for(const k of KEYS) {
      sums[k]+=values[k];
      if(matches&&k!=='no_archive_unknown')samples[k].push(values[k]);
      if(!matches&&k==='no_archive_unknown')samples[k].push(values[k]);
    }
    const sum=KEYS.reduce((v,k)=>v+values[k],0);
    if(Math.abs(sum-p.minutes)>.0001)throw Error('COHORT_STAGE_NON_ADDITIVE');
    paths.push({pr:p.pr,minutes:p.minutes,covered:Boolean(matches),partial:matches?candidate.partial===true:null,
      waves:matches?candidate.runs:null,retries:matches?candidate.repeats:null,
      intervals:values,created_at:p.created_at,merged_at:p.merged_at});
  }
  const grand=KEYS.reduce((v,k)=>v+sums[k],0);
  if(n&&Math.abs(grand/n-mean)>.0001)throw Error('COHORT_MEAN_NON_ADDITIVE');
  const stageStats=Object.fromEntries(KEYS.map(k=>[k,{
    contribution_mean_minutes:n?sums[k]/n:null,
    measured_prs:samples[k].length,
    p50_measured_minutes:quant(samples[k],.5),
    p90_measured_minutes:quant(samples[k],.9)
  }]));
  const buckets=Array.from({length:6},(_,i)=>{
    const left=start+(end-start)*i/6, right=start+(end-start)*(i+1)/6;
    const durations=rows.filter(p=>{
      const t=ms(p.merged_at);return t!==null&&t>=left&&(i===5?t<=right:t<right);
    }).map(p=>p.minutes);
    return {start:new Date(left).toISOString(),end:new Date(right).toISOString(),
      count:durations.length,median_minutes:quant(durations,.5),
      mean_minutes:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null};
  });
  if(buckets.reduce((v,b)=>v+b.count,0)!==n)throw Error('COHORT_BINS_NON_ADDITIVE');
  return {schema:SCHEMA,base,period_hours:hours,from:new Date(start).toISOString(),
    to:new Date(end).toISOString(),source_generated_at:source.generated_at,
    created_prs:selected.length,finished_prs:n,not_merged_in_period:selected.length-n,
    n,mean_minutes:mean,p50_minutes:quant(durations,.5),p90_minutes:quant(durations,.9),
    p95_minutes:quant(durations,.95),rows:rows.sort((a,b)=>b.minutes-a.minutes),
    buckets,stages:stageStats,stage_keys:KEYS,
    coverage:{created_history_complete:true,ci_archive_available:hasArchive,
      ci_window_prs:covered,partial_ci_history_prs:partial,missing_ci_prs:missing,
      invalid_ci_prs:invalid,history_complete:hasArchive&&archive.coverage?.history_complete===true,
      counted_ci_waves:totalWaves,counted_ci_retries:totalRetries,
      note:'CI covers saved Core runs only; gaps are unknown causes and mandatory other checks may be absent.'},
    paths:paths.sort((a,b)=>b.minutes-a.minutes)};
}
/* HH_STRICT_CREATED_MERGED_COHORT_V1_END */

/* Same observed Core CI cohort definition for both periods. Never infer missing history as zero. */
const COMPARED_CI_STAGES=[
 ['workflow_wait','Workflow → jobs · среднее / PR','stage'],
 ['runner_wait','Ожидание runner · среднее / PR','stage'],
 ['checks','Выполнение Core jobs · среднее / PR','stage'],
 ['between_waves_unknown','Между CI-волнами · причина неизвестна','stage'],
 ['other_unknown','Прочие интервалы CI · причина неизвестна','stage'],
 ['core','Core job · P50 наблюд.','clock'],
 ['specialist','Specialist job · P50 наблюд.','clock'],
 ['merge_gate','Merge Gate job · P50 наблюд.','clock'],
 ['overall','Первый → последний Core CI · P50','total']
];
function compareCIHistory(d,hours){
 if(![1,6,24].includes(hours)||d?.schema!==SCHEMAS.comparison||
   d.period_hours!==hours||d.comparison_basis!=='SAME_DURATION_WINDOW_SHIFTED_BY_7D_AND_14D'||
   !Array.isArray(d.periods))throw Error('CI_WEEKLY_SCHEMA');
 const periods={};
 for(const [id,offset] of [['current',0],['week_ago',168]]){
  const p=d.periods.find(x=>x?.id===id),w=p?.period;
  if(!p||p.offset_hours!==offset||w?.duration_hours!==hours||
    !isTime(w.from)||!isTime(w.to)||
    Math.abs(Date.parse(w.to)-Date.parse(w.from)-hours*3600000)>2000||
    p.stage_breakdown?.schema!=='HH_CI_JOURNEY_CONTRIBUTIONS_V1'||
    p.job_clock_summary?.schema!=='HH_CI_NAMED_JOB_CLOCK_V1'||
    !safeInt(p.stage_breakdown?.n)||!safeInt(p.summary?.n)||
    p.stage_breakdown.n!==p.summary.n)throw Error('CI_WEEKLY_UNVERIFIED_'+id);
  periods[id]=p;
 }
 if(Math.abs(Date.parse(periods.current.period.to)-Date.parse(periods.week_ago.period.to)-168*3600000)>2000)
  throw Error('CI_WEEKLY_PERIOD_MISMATCH');
 const rows=COMPARED_CI_STAGES.map(([key,label,kind])=>{
  const read=p=>{
   if(kind==='total')return {value:p.summary.n>0&&safeNum(p.summary.median_minutes)?p.summary.median_minutes:null,
     n:p.summary.n,denominator:p.summary.n};
   if(kind==='clock'){
    const x=p.job_clock_summary.clocks?.[key];
    return {value:x?.measured_prs>0&&safeNum(x.p50_minutes)?x.p50_minutes:null,
      n:safeInt(x?.measured_prs)?x.measured_prs:0,denominator:p.summary.n};
   }
   const v=p.stage_breakdown.mean_minutes_per_pr?.[key],n=p.stage_breakdown.prs_with_observed_span?.[key];
   return {value:safeInt(n)&&n>0&&safeNum(v)?v:null,
     n:safeInt(n)?n:0,denominator:p.summary.n};
  };
  return {key,label,kind,current:read(periods.current),week:read(periods.week_ago)};
 });
 return {hours,periods,rows};
}

const NAMED_WEEKLY_CI_JOBS=[
 ['core','Core CI job · P50'],
 ['specialist','Specialist CI job · P50'],
 ['merge_gate','Merge Gate job · P50']
];
const WEEKLY_STAGE_LABELS=[
 ['before_unknown','Created → первая сохранённая CI · причина неизвестна'],
 ['workflow_wait','Workflow → создание CI jobs'],
 ['runner_wait','Ожидание runner · по job timestamps'],
 ['checks','Выполнение сохранённых CI jobs'],
 ['ci_wave_unknown','Между CI-волнами · неизвестно'],
 ['ci_other_unknown','Прочие неизвестные паузы CI'],
 ['after_unknown','Последняя сохранённая CI → Merge · неизвестно'],
 ['no_archive_unknown','PR без сопоставимого архива CI']
];
const quantSafe=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function compareStrictWeekly(d,hours){
 if(![1,6,24].includes(hours)||d?.schema!=='HH_PR_CREATED_MERGED_WEEKLY_V1'||
   d.period_hours!==hours||d.timezone!=='America/Toronto'||
   d.base!=='codex/public-book-library'||
   d.comparison_basis!=='CREATED_AND_MERGED_WITHIN_EACH_MATCHING_WINDOW'||
   !Array.isArray(d.periods))throw Error('STRICT_WEEKLY_SCHEMA');
 const periods={};
 for(const id of ['current','week_ago']){
  const p=d.periods.find(x=>x?.id===id),from=Date.parse(p?.from),to=Date.parse(p?.to);
  if(!p||!Number.isFinite(from)||!Number.isFinite(to)||
    Math.abs(to-from-hours*3600000)>1000||p.coverage?.search_complete!==true||
    !safeInt(p.created_prs)||!safeInt(p.merged_prs)||p.merged_prs>p.created_prs||
    !safeInt(p.not_merged_in_window)||p.created_prs-p.merged_prs!==p.not_merged_in_window||
    !safeInt(p.coverage.ci_matched_prs)||!safeInt(p.coverage.ci_missing_prs)||
    !safeInt(p.coverage.ci_invalid_prs)||
    p.coverage.ci_matched_prs+p.coverage.ci_missing_prs+p.coverage.ci_invalid_prs!==p.merged_prs||
    (p.merged_prs>0&&(!quantSafe(p.mean_minutes)||!quantSafe(p.p50_minutes)))||
    !p.stages)throw Error('STRICT_WEEKLY_UNVERIFIED_'+id);
  let sum=0;
  for(const [key] of WEEKLY_STAGE_LABELS){
   const s=p.stages[key];
   if(!s||!safeInt(s.measured_prs)||s.measured_prs>p.merged_prs||
     (p.merged_prs>0&&!quantSafe(s.mean_contribution_minutes))||
     (s.measured_prs>0&&!quantSafe(s.p50_measured_minutes)))throw Error('STRICT_WEEKLY_STAGE_'+key);
   if(p.merged_prs>0)sum+=s.mean_contribution_minutes;
  }
  // Eight stages rounded to 0.01 minute each; allow their sum to differ by <= 0.06.
  if(p.merged_prs>0&&Math.abs(sum-p.mean_minutes)>0.06)throw Error('STRICT_WEEKLY_NOT_ADDITIVE');
  for(const [key] of NAMED_WEEKLY_CI_JOBS){
   const clock=p.named_ci_jobs?.[key];
   if(!clock||!safeInt(clock.measured_prs)||clock.measured_prs>p.merged_prs||
      (clock.measured_prs>0&&!quantSafe(clock.p50_minutes)))
     throw Error('STRICT_WEEKLY_JOB_'+key);
  }
  periods[id]=p;
 }
 const local=s=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})
  .formatToParts(new Date(s)).filter(p=>p.type!=='literal').reduce((a,p)=>({...a,[p.type]:+p.value}),{});
 const a=local(periods.current.to),b=local(periods.week_ago.to);
 const days=(y,m,d)=>Date.UTC(y,m-1,d)/86400000;
 if(days(a.year,a.month,a.day)-days(b.year,b.month,b.day)!==7||
   ['hour','minute','second'].some(k=>a[k]!==b[k]))throw Error('STRICT_WEEKLY_TORONTO_WINDOW');
 return {periods,rows:WEEKLY_STAGE_LABELS.map(([key,label])=>({key,label,
  now:periods.current.stages[key],week:periods.week_ago.stages[key]}))};
}


// The active isolated dashboard is same-origin only: these exact public
// repository reads are supplied by existing Vercel Project Routes. Never
// expose GitHub credentials, add polling, or infer causality from a label.
const PUBLIC_PR_LABELS=Object.freeze({
 'hh:hold':'EXPLICIT_OWNER_HOLD',
 'hh:blocked':'POLICY_BLOCKED',
 'hh:worker-claimed':'SOURCE_OWNER_CLAIMED',
 'hh:direction-override:invalid':'INVALID_DIRECTION_OVERRIDE',
 'hh:repair-manual':'SEMANTIC_SOURCE_REPAIR_PENDING',
 'hh:conflict-repair-needed':'MERGE_CONFLICT_TRIAGE',
 'hh:release-gate-review':'RELEASE_GATE_REVIEW',
 'hh:repair-needed':'SAFE_REPAIR_QUEUED',
 'hh:ci-needed':'CORE_CI_RECOVERY_PENDING'
});
function parsePublicPrContext(pr,metadata,events){
 if(!Number.isSafeInteger(pr)||pr<1||pr>999999||!metadata||
    metadata.number!==pr||!Array.isArray(events)||events.length>100||
    metadata.base?.ref!=='codex/public-book-library'||
    metadata.head?.repo?.full_name!=='andylitvinov-design/books'||
    !/^[a-f0-9]{40}$/i.test(metadata.head?.sha||'')||
    !Array.isArray(metadata.labels))return null;
 const labels=metadata.labels.map(x=>x?.name)
  .filter(name=>Object.hasOwn(PUBLIC_PR_LABELS,name));
 const chosen=metadata.state==='open'&&labels.includes('hh:hold')?'EXPLICIT_OWNER_HOLD':
   metadata.state==='open'&&labels.includes('hh:blocked')?'POLICY_BLOCKED':
   metadata.state==='open'&&labels.includes('hh:worker-claimed')?'SOURCE_OWNER_CLAIMED':
   metadata.state==='open'&&metadata.mergeable===false&&
    metadata.mergeable_state==='dirty'?'MERGE_CONFLICT_DIRTY_NOW':
   metadata.state==='open'&&labels.includes('hh:repair-manual')?'SEMANTIC_SOURCE_REPAIR_PENDING':
   metadata.state==='open'&&labels.includes('hh:release-gate-review')?'RELEASE_GATE_REVIEW':
   metadata.state==='open'&&labels.includes('hh:conflict-repair-needed')?'MERGE_CONFLICT_TRIAGE':
   metadata.state==='open'&&labels.includes('hh:repair-needed')?'SAFE_REPAIR_QUEUED':
   metadata.state==='open'&&labels.includes('hh:ci-needed')?'CORE_CI_RECOVERY_PENDING':
   metadata.state==='open'?'OPEN_NO_PROVEN_BLOCKER':'CLOSED_NOT_CURRENTLY_WAITING';
 const observed=events.filter(e=>['labeled','unlabeled'].includes(e?.event)&&
   Object.hasOwn(PUBLIC_PR_LABELS,e?.label?.name)&&isTime(e.created_at)&&
   /^[A-Za-z0-9_\[\]-]{1,80}$/.test(e?.actor?.login||''))
  .map(e=>({at:e.created_at,label:e.label.name,
   reason_code:PUBLIC_PR_LABELS[e.label.name],transition:e.event,
   actor:e.actor.login,evidence:'GITHUB_ISSUE_LABEL_EVENT',
   cause_verified:false}))
  .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-35);
 return {schema:'HH_CI_PR_BLOCKER_DISPLAY_V1',pr,
  current_status:metadata.state,current_head:metadata.head.sha,
  current_reason_code:chosen,current_labels:labels,
  history_complete:events.length<100,
  status:events.length===100?'PARTIAL':'VERIFIED',
  historical_cause_verified:false,observed_events:observed};
}
async function readPublicPrContext(pr,fetchImpl){
 if(!Number.isSafeInteger(pr)||pr<1||pr>999999||
    typeof fetchImpl!=='function')return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const read=async path=>{
   const r=await fetchImpl(path,{headers:{Accept:'application/json'},
    credentials:'omit',cache:'no-store',signal:controller.signal});
   if(!r?.ok)throw Error('PR_EVIDENCE_UNAVAILABLE');
   return r.json();
  };
  const [meta,events]=await Promise.all([
   read('/api/verified-pr-meta/'+pr),read('/api/verified-pr-events/'+pr)
  ]);
  return parsePublicPrContext(pr,meta,events);
 }catch{return null;}
 finally{clearTimeout(timer);}
}

const publicHelpers={activity,speed,compactRecords,strictCohort,compareCIHistory,compareStrictWeekly,delay,number,SCHEMAS,URLS,periodSummary,activeCI,openBacklog,liveOpenCount,parsePublicPrContext,readPublicPrContext};
if(typeof module==='object'&&module.exports)module.exports=publicHelpers;
if(!env?.document||typeof env.fetch!=='function')return;
const doc=env.document,el=id=>doc.getElementById(id);
const dom=(tag,cls,txt)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const svgNS='http://www.w3.org/2000/svg',colors=['#9bcfff','#78e3bd','#ffc681'];
const snapshots={};let refreshing=false,selectedPeriod=24,periodRequestSeq=0,stageRequestSeq=0,funnelHours=24,funnelPR=null,funnelSeq=0,funnelPage=0,funnelPages=1,strictRaw=null,strictArch=null,strictHours=24,strictUpdateError=null;
function put(id,value){const e=el(id);if(e)e.textContent=String(value);}
function anchor(num,title){const a=dom('a',null,title||('#'+num));a.href=REPO+'/pull/'+num;a.target='_blank';a.rel='noopener noreferrer';return a;}
function sv(parent,tag,attrs={},txt){const e=doc.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=String(txt);if(parent)parent.appendChild(e);return e;}
function frame(svg,max){svg.replaceChildren();for(let i=0;i<=4;i++){const y=145-i*27;sv(svg,'line',{x1:32,y1:y,x2:350,y2:y,stroke:'#38516e','stroke-dasharray':'3 6'});}sv(svg,'text',{x:8,y:28,fill:'#b8cfe4','font-size':10},number(max));}
function plot(svg,values,max,color){let d='',joined=false;values.forEach((v,i)=>{if(!safeNum(v)){joined=false;return;}const x=44+i*58,y=145-v/max*108;d+=(joined?' L':' M')+x.toFixed(1)+' '+y.toFixed(1);joined=true;});if(d)sv(svg,'path',{d,fill:'none',stroke:color,'stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'});values.forEach((v,i)=>{if(safeNum(v))sv(svg,'circle',{cx:44+i*58,cy:(145-v/max*108).toFixed(1),r:3,fill:color});});}
function clear(e){e.replaceChildren();}
function td(row,text){const x=dom('td',null,text);row.appendChild(x);return x;}
function item(root,label,value,note,url){const line=dom('div','list-item'),a=dom('div'),labelEl=dom(url?'a':'span',null,clampText(label,115));if(url){labelEl.href=url;labelEl.target='_blank';labelEl.rel='noopener noreferrer';}a.append(labelEl);if(note)a.append(dom('small','muted',clampText(note,185)));line.append(a,dom('b',null,value));root.append(line);}
function drawFlow(d){const svg=el('chart-flow');const series=[d.rows.map(r=>r.created),d.rows.map(r=>r.merged),d.rows.map(r=>r.ci)];const prMax=Math.max(1,...series[0],...series[1]),ciMax=Math.max(1,...series[2].filter(safeNum));frame(svg,prMax);plot(svg,series[0],prMax,colors[0]);plot(svg,series[1],prMax,colors[1]);plot(svg,series[2],ciMax,colors[2]);if(d.ci!==null)sv(svg,'text',{x:350,y:28,fill:'#ffc681','font-size':10,'text-anchor':'end'},'CI '+number(ciMax));d.rows.forEach((r,i)=>sv(svg,'text',{x:44+i*58,y:168,fill:'#a6bdd4','font-size':10,'text-anchor':'middle'},hour(r.time)));put('flow-info',d.complete?'Серия подтверждена PR/CI источниками.':'Покрытие CI частичное; неизвестное = —.');put('k-ci',number(d.ci));}
function drawSpeed(d){const svg=el('chart-speed'),max=Math.max(1,...d.map(r=>r.count)),maxDelay=Math.max(1,...d.map(r=>r.median).filter(safeNum));frame(svg,max);d.forEach((r,i)=>{const h=107*r.count/max;sv(svg,'rect',{x:44+i*58-10,y:(145-h).toFixed(1),width:20,height:h.toFixed(1),rx:2,fill:colors[1],opacity:'.8'});sv(svg,'text',{x:44+i*58,y:168,fill:'#a6bdd4','font-size':10,'text-anchor':'middle'},hour(r.time));});plot(svg,d.map(r=>r.median),maxDelay,colors[0]);const measured=d.reduce((n,r)=>n+r.n,0);put('speed-info','Замерено '+number(measured)+' Merge; синяя линия = P50 по отдельной шкале минут.');}

const STRICT_STAGE_NAMES=[
 ['before_unknown','До первой сохранённой Core CI · неизвестная причина'],
 ['workflow_wait','Workflow → создание jobs'],
 ['runner_wait','Ожидание runner по меткам jobs'],
 ['checks','Выполнение сохранённых Core jobs'],
 ['ci_wave_unknown','Между волнами Core CI · причина неизвестна'],
 ['ci_other_unknown','Другие неизвестные интервалы CI'],
 ['after_unknown','После последней сохранённой Core CI · неизвестно'],
 ['no_archive_unknown','PR без сопоставимой истории Core CI']
];
const strictlyClock = s=>new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
 hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s));
function drawStrictSpeed(m){
 const svg=el('chart-speed');
 if(!svg)return;
 svg.replaceChildren();
 const counts=m.buckets.map(b=>b.count),latencies=m.buckets.map(b=>b.median_minutes);
 const max=Math.max(1,...counts),latMax=Math.max(1,...latencies.filter(safeNum));
 frame(svg,max);
 m.buckets.forEach((b,i)=>{
  const h=107*b.count/max,x=44+i*58;
  sv(svg,'rect',{x:x-10,y:(145-h).toFixed(1),width:20,height:h.toFixed(1),rx:2,fill:colors[1],opacity:'.8'});
  sv(svg,'text',{x,y:168,fill:'#a6bdd4','font-size':10,'text-anchor':'middle'},strictlyClock(b.start));
 });
 plot(svg,latencies,latMax,colors[0]);
 put('speed-info','Одна production-когорта: '+number(m.n)+' PR, созданы И смержены за '+m.period_hours+
  ' ч. Столбцы = завершено PR, линия = P50 этой же когорты. Неизвестное ≠ 0.');
}
function renderStrictCohort(){
 const buttons=doc.querySelectorAll('[data-cohort-hours]');
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.cohortHours)===strictHours)));
 const root=el('strict-stage-rows');
 if(!root)return;
 const missing=note=>{
  for(const id of ['strict-mean','strict-p50','strict-p90','strict-n','k-median'])put(id,'—');
  put('k-median-note',note);put('strict-note',note);put('strict-source','Нет полного подтверждения');
  root.replaceChildren();
  const svg=el('chart-speed');if(svg)svg.replaceChildren();
  put('speed-info',note);
 };
 if(!strictRaw){missing('Источник созданных PR временно недоступен. Пропуск не равен нулю.');return;}
 let m;try{m=strictCohort(strictRaw,strictArch,strictHours);}catch(e){
  missing(strictHours>48?'Период '+strictHours+' ч недоступен: источник содержит не более 48 ч.':
    'Нет полной сопоставимой выборки: '+String(e.message||e));return;
 }
 put('strict-speed-period','Выбранный период: '+m.period_hours+' ч');
 put('strict-mean',m.n?delay(m.mean_minutes):'—');
 put('strict-p50',m.n?delay(m.p50_minutes):'—');
 put('strict-p90',m.n?delay(m.p90_minutes):'—');
 put('strict-n',number(m.n));put('k-median',m.n?delay(m.p50_minutes):'—');
 put('k-median-note','Production · '+m.period_hours+' ч · n='+number(m.n)+
   ' · среднее '+(m.n?delay(m.mean_minutes):'—'));
 const age=Date.now()-Date.parse(m.source_generated_at);
 const freshness=!Number.isFinite(age)||age>75*60000?'УСТАРЕЛ':age>15*60000?'С ЗАДЕРЖКОЙ':'СВЕЖИЙ';
 put('strict-source',(strictUpdateError?'Ошибка обновления · ':'')+freshness+' · '+stamp(m.to)+' · GitHub');
 put('strict-note','Одна когорта production: созданы '+number(m.created_prs)+
   ', смержены внутри выбранного окна '+number(m.n)+
   ', остальные '+number(m.not_merged_in_period)+' не входят в длительность. '+ 
   'Архив Core CI: '+number(m.coverage.ci_window_prs)+'/'+number(m.n)+
   ' PR; частичных историй '+number(m.coverage.partial_ci_history_prs)+
   '. Вклад этапов аддитивен; неизвестная причина не означает ожидание runner.'+
   (strictUpdateError?' Ошибка обновления: '+strictUpdateError:'')+
   (!m.coverage.ci_archive_available?' Архив Core CI недоступен: этапы не измерены.':''));
 root.replaceChildren();
 for(const [key,label] of STRICT_STAGE_NAMES){
  const s=m.stages[key],tr=dom('tr');td(tr,label);
  td(tr,m.n?delay(s.contribution_mean_minutes):'—');
  td(tr,number(s.measured_prs)+'/'+number(m.n));
  td(tr,s.measured_prs?delay(s.p50_measured_minutes):'—');
  root.append(tr);
 }
 const tr=dom('tr');td(tr,'Итого Created → Merged');td(tr,m.n?delay(m.mean_minutes):'—');
 td(tr,number(m.n)+'/'+number(m.created_prs));td(tr,m.n?delay(m.p50_minutes):'—');root.append(tr);
 drawStrictSpeed(m);
}
async function refreshStrictCohort(){
 try{
  const source=await fetchSafe(URLS.cohort,SCHEMAS.cohort,11000);
  let archive=null;
  try{archive=await fetchSafe(URLS.archive,SCHEMAS.archive,11000);}
  catch(_){/* missing history is unknown, not zero */}
  strictRaw=source;strictArch=archive;strictUpdateError=null;renderStrictCohort();
  return source;
 }catch(e){strictUpdateError=String(e.message||e).slice(0,70);renderStrictCohort();throw e;}
}


function renderStages(d,hours=selectedPeriod){
 if(selectedPeriod!==hours)return;
 if(d?.schema!==SCHEMAS.stages||d.selection?.scope!=='production'||d.selection?.hours!==hours||!d.stages||!d.population)throw Error('STAGE_PRODUCTION_SCHEMA');
 put('stages-period','Выборочная диагностика n='+number(d.coverage?.measured)+' · '+hours+' ч · '+stamp(d.generated_at));
 const labels=[['prepare','Подготовка / HEAD'],['runner','Ожидание runner'],['ci','Core / Specialist CI'],['gate','Merge Gate'],['merge','Green → Merge']];
 const tbody=el('stage-rows');clear(tbody);
 for(const [key,label]of labels){
  const s=d.stages[key],w=d.waiting?.[key],tr=dom('tr');td(tr,label);td(tr,number(s?.n));
  td(tr,s?.n>0?delay(s.median):'—');td(tr,s?.n>0?delay(s.p90):'—');
  const cell=td(tr,number(w?.n));
  if(Array.isArray(w?.examples)&&safeInt(w.examples[0])&&w.examples[0]>0){
   const n=w.examples[0];cell.append(' · ');cell.append(anchor(n));
   const inspect=dom('a',null,' · Причина');inspect.href='#error-funnel';
   inspect.addEventListener('click',()=>{
    el('error-funnel-pr').value=String(n);
    void selectFunnelPeriod(funnelHours,n);
   });
   cell.append(inspect);
  }
  tbody.append(tr);
 }
 const names=[['core_queue','Core Queue'],['specialist_queue','Specialist Queue'],['preflight','Preflight'],['core_jobs','Core Jobs'],['specialist_jobs','Specialist Jobs'],['retry_gap','Retry Gap'],['gate_queue','Gate Queue'],['gate_job','Gate Job']];
 const detail=el('stage-detail');clear(detail);
 for(const [key,name]of names){const entry=dom('article');entry.append(dom('span',null,name),dom('b',null,d.details?.[key]?.n>0?delay(d.details[key].median):'—'));detail.append(entry);}
 snapshots.stages=d;updateRecommendations();
}

const recently=at=>isTime(at)&&Math.max(0,Date.now()-Date.parse(at))<75*60000;
function overviewSources(){
 const x=[['CI',snapshots.ciLive?.generated_at],['PR',snapshots.period?.observed_at],['Открытые PR',snapshots.open?.generated_at],['Очередь',snapshots.queue?.checked_at]]
 .filter(([,at])=>isTime(at)).map(([s,at])=>s+': '+stamp(at));
 put('overview-provenance','CI — запуски workflow, не отдельные jobs. '+(x.length?x.join(' · '):'Источники ещё загружаются.'));
}

function stageMissing(note){
 const tbody=el('stage-rows');if(tbody){tbody.replaceChildren();
  const tr=dom('tr');const cell=dom('td',null,note);cell.colSpan=5;tr.append(cell);tbody.append(tr);}
 const detail=el('stage-detail');if(detail)detail.replaceChildren(dom('p','note','Нет проверенных подэтапов за выбранный период.'));
 put('stages-period',selectedPeriod+' ч · нет подтверждённых замеров');
}
function comparisonMissing(note){
 for(const id of ['stage-comparison-rows','stage-ci-diagnostic-rows']){
  const tbody=el(id);if(tbody){tbody.replaceChildren();const tr=dom('tr');
   const cell=dom('td',null,note);cell.colSpan=3;tr.append(cell);tbody.append(tr);}
 }
 put('stage-comparison-period',selectedPeriod+' ч / 7 дней назад');
 put('stage-comparison-note','Неподтверждённые интервалы не приравниваются к 0. '+note);
}
function renderComparison(d,hours){
 if(selectedPeriod!==hours)return;
 const weekly=compareStrictWeekly(d?.strict_weekly,hours);
 const tbody=el('stage-comparison-rows');if(!tbody)return;tbody.replaceChildren();
 const cur=weekly.periods.current,old=weekly.periods.week_ago;
 const cell=(tr,value,count,total,label)=>{
  const tdEl=td(tr,value);
  tdEl.append(dom('small','comparison-sample',label||('n='+number(count)+'/'+number(total))));
 };
 for(const row of weekly.rows){
  const tr=dom('tr');td(tr,row.label);
  for(const [value,period]of [[row.now,cur],[row.week,old]]){
   const exists=period.merged_prs>0&&value.measured_prs>0;
   cell(tr,exists?delay(value.mean_contribution_minutes):'—',value.measured_prs,period.merged_prs,
    'Замер '+number(value.measured_prs)+'/'+number(period.merged_prs));
  }
  tbody.append(tr);
 }
 const namedTitle=dom('tr','comparison-subtitle'),titleCell=dom('th',null,'Отдельные CI jobs · P50 по измеренным PR, НЕ дополнительные этапы');
 titleCell.colSpan=3;namedTitle.append(titleCell);tbody.append(namedTitle);
 for(const [key,label] of NAMED_WEEKLY_CI_JOBS){
  const tr=dom('tr');td(tr,label);
  for(const p of [cur,old]){
   const v=p.named_ci_jobs?.[key];
   cell(tr,v?.measured_prs>0?delay(v.p50_minutes):'—',v?.measured_prs||0,p.merged_prs,
    'Замер '+number(v?.measured_prs||0)+'/'+number(p.merged_prs));
  }
  tbody.append(tr);
 }
 const addSummary=(label,key,desc)=>{
  const tr=dom('tr','comparison-total');td(tr,label);
  for(const p of [cur,old])cell(tr,p.merged_prs>0?delay(p[key]):'—',p.merged_prs,p.created_prs,
   desc+' · '+number(p.merged_prs)+'/'+number(p.created_prs));
  tbody.append(tr);
 };
 addSummary('Итого Created → Merge · среднее','mean_minutes','Смержено');
 addSummary('Created → Merge · P50','p50_minutes','Смержено');
 addSummary('Created → Merge · P90','p90_minutes','Смержено');
 const wave=dom('tr');td(wave,'Повторные CI-волны · подтверждено в архиве');
 for(const p of [cur,old])cell(wave,number(p.ci_observed_retries),p.coverage.ci_matched_prs,p.merged_prs,
  'Архив '+number(p.coverage.ci_matched_prs)+'/'+number(p.merged_prs));
 tbody.append(wave);
 const live=dom('tr');td(live,'Merge → LIVE · нет квитанции production');
 td(live,'—');td(live,'—');tbody.append(live);
 put('stage-comparison-period',hours+' ч · Created и Merge внутри одного периода');
 put('stage-comparison-note','Сейчас: '+number(cur.merged_prs)+'/'+number(cur.created_prs)+
  ' PR созданы и смержены в окне '+stamp(cur.from)+' — '+stamp(cur.to)+
  '; неделю назад: '+number(old.merged_prs)+'/'+number(old.created_prs)+' за '+
  stamp(old.from)+' — '+stamp(old.to)+'. Архив CI: '+
  number(cur.coverage.ci_matched_prs)+'/'+number(cur.merged_prs)+' и '+
  number(old.coverage.ci_matched_prs)+'/'+number(old.merged_prs)+
  ' (частичных историй '+number(cur.coverage.ci_partial_prs)+' / '+number(old.coverage.ci_partial_prs)+
  '). Вклады этапов — среднее по одинаковой когорте; неизвестные промежутки не означают ожидание runner. Merge ≠ LIVE.');
 // Different cohort: diagnostic only. Do not mix values into the additive full PR path.
 const ciRoot=el('stage-ci-diagnostic-rows');
 if(ciRoot){
  ciRoot.replaceChildren();
  let diagnostic=null;
  try{diagnostic=compareCIHistory(d,hours);}catch(_){}
  if(!diagnostic){const tr=dom('tr');const c=dom('td',null,'Архивная диагностика не подтверждена');c.colSpan=3;tr.append(c);ciRoot.append(tr);}
  else for(const row of diagnostic.rows){
   const tr=dom('tr');td(tr,row.label);
   for(const v of [row.current,row.week]){
    const c=td(tr,v.value===null?'—':delay(v.value));
    c.append(dom('small','comparison-sample','n='+number(v.n)+'/'+number(v.denominator)));
   }
   ciRoot.append(tr);
  }
 }
}
async function refreshStageWindows(hours,seq){
 const requests=[
  ['stages',URLS.stages.replace('hours=24','hours='+hours),SCHEMAS.stages,d=>renderStages(d,hours),()=>stageMissing('Интервалы этапов не подтверждены. Нажмите «Обновить».')],
  ['comparison',URLS.comparison+'?hours='+hours+'&compare=1&strict_weekly=1',SCHEMAS.comparison,d=>renderComparison(d,hours),()=>comparisonMissing('Исторический архив CI недоступен или неполон.')]
 ];
 await Promise.allSettled(requests.map(async([key,path,schema,apply,fail])=>{
  try{const d=await fetchSafe(path,schema,24000);if(selectedPeriod===hours&&stageRequestSeq===seq)apply(d);}
  catch(_){if(selectedPeriod===hours&&stageRequestSeq===seq)fail();}
 }));
}
function renderCILive(d){
 const v=activeCI(d),ok=recently(v.at);
 put('k-ci-running',ok?number(v.running):'—');put('k-ci-queued',ok?number(v.queued):'—');
 put('k-ci-running-note',ok?'GitHub Actions · workflow':'Срез CI устарел');put('k-ci-queued-note',ok?'GitHub Actions · workflow':'Срез CI устарел');
 snapshots.ciLive=d;overviewSources();
}
function renderPeriod(d,hours){
 const v=periodSummary(d,hours);if(selectedPeriod!==hours)return;
 const ok=recently(v.at),label='За '+hours+' ч · все ветки';
 put('k-created',ok?number(v.created):'—');put('k-merged',ok?number(v.merged):'—');
 put('k-created-note',ok?label:'Источник устарел');
 put('k-merged-note',ok?label+' · не LIVE':'Источник устарел');
 snapshots.period=d;overviewSources();
}
async function selectPeriod(hours){
 if(![1,6,24].includes(hours)||hours===selectedPeriod)return;
 selectedPeriod=hours;strictHours=hours;renderStrictCohort();const seq=++periodRequestSeq;
 const stageSeq=++stageRequestSeq;stageMissing('Читаю этапы за '+hours+' ч…');comparisonMissing('Загружаю сопоставимое окно неделю назад…');
 void refreshStageWindows(hours,stageSeq);
 for(const b of doc.querySelectorAll('[data-period]'))b.setAttribute('aria-pressed',String(Number(b.dataset.period)===hours));
 put('k-created','—');put('k-merged','—');put('k-created-note','Получаю данные за '+hours+' ч');put('k-merged-note','Получаю данные за '+hours+' ч');
 try{const data=await fetchSafe(URLS.period+'?hours='+hours,SCHEMAS.period);
 if(seq===periodRequestSeq)renderPeriod(data,hours);}catch{if(seq===periodRequestSeq){put('k-created','—');put('k-merged','—');put('k-created-note','Данные недоступны');put('k-merged-note','Данные недоступны');}}
}
function renderCI(d){
 if(d?.schema!==SCHEMAS.ci)throw Error('CI_SCHEMA');
 const coverage=d.coverage||{};put('ci-coverage',coverage.complete===true?'Полная проверка':'Выборка, не все jobs');
 put('k-ci-jobs',number(coverage.measured_jobs));put('k-ci-fails',number(coverage.failed_jobs));
 const queue=[...(d.wait_checks||[]),...(d.merge_checks||[])].filter(x=>safeNum(x.queue_p50));
 put('k-runner',queue.length?delay(queue[0].queue_p50):'—');
 const errors=el('ci-errors');clear(errors);
 const hits=Array.isArray(d.errors)?d.errors.filter(x=>safeNum(x.failures)&&x.failures>0).sort((a,b)=>b.failures-a.failures).slice(0,9):[];
 if(!hits.length)errors.append(dom('p','empty','В измеренной выборке ошибок не выявлено. Это не утверждение обо всех jobs.'));
 for(const entry of hits){const n=entry.examples?.find(e=>Array.isArray(e?.pr)&&safeInt(e.pr[0]))?.pr[0];item(errors,entry.title||entry.key,number(entry.failures),'Ошибка в выборке'+(n?' · PR #'+n:''),n?REPO+'/pull/'+n:null);}
 const checks=el('ci-checks');clear(checks);const seen=new Set();let count=0;
 for(const row of [...(d.wait_checks||[]),...(d.merge_checks||[])]){
  if(!row?.name||seen.has(row.name)||count>=9)continue;seen.add(row.name);count++;
  const label=row.name.includes(' / ')?row.name.split(' / ').slice(-1)[0]:row.name;
  const info=number(row.n)+' jobs · '+number(row.failed)+' ошибок';
  const value='P50 '+(safeNum(row.run_p50)?delay(row.run_p50):'—');
  item(checks,label,value,info,row.url?.startsWith('https://github.com/')?row.url:null);
 }
 if(!count)checks.append(dom('p','empty','Недостаточно проверенных job событий.'));
 snapshots.ci=d;updateRecommendations();
}
function renderOpenCount(d){
 const v=liveOpenCount(d);
 if(!recently(v.at))throw Error('OPEN_COUNT_STALE');
 snapshots.open=d;
 put('k-open',number(v.open));put('k-open-note','GitHub · '+stamp(v.at));
 el('k-open').dataset.stale='false';overviewSources();
}
function renderOpenFallback(){
 if(snapshots.open){
  const v=liveOpenCount(snapshots.open);
  put('k-open',number(v.open));put('k-open-note','Последний GitHub · '+stamp(v.at)+' · не LIVE');
  el('k-open').dataset.stale='true';return;
 }
 try{
  const b=openBacklog(snapshots.queue);
  put('k-open',number(b.open));put('k-open-note','Срез '+stamp(b.at)+' · не LIVE');
  el('k-open').dataset.stale='true';
 }catch{
  put('k-open','—');put('k-open-note','GitHub недоступен');
  el('k-open').dataset.stale='true';
 }
}
function renderQueue(d){
 if(d?.schema!==SCHEMAS.queue)throw Error('QUEUE_SCHEMA');
 const counts=d.counts||{};put('k-actionable',number(counts.actionable_prs));put('k-blocked',number(counts.blocked_total));
 put('k-worker',number(counts.worker_dispatches));put('k-production',number(counts.production_prs));
 
 put('queue-asof',d.checked_at?'Срез: '+stamp(d.checked_at):'Время среза неизвестно');
 // Open PR count has its own GitHub source; dispatcher snapshots must not overwrite it.
 const root=el('queue-states');clear(root);
 const aliases={awaiting_core:'Ожидает Core',core_workflow_queued:'Core в очереди',core_runner_running:'Core выполняется',parent_blocked:'Блокировка базового PR',source_proof_missing:'Нет source proof',conflict_unverified:'Конфликт не проверен',manual_conflict_handoffs:'Ручная передача конфликта',already_handled:'Уже обработано',wake_undelivered:'Wake не доставлен'};
 const list=Object.entries(d.queue_states||{}).filter(([,n])=>safeInt(n)&&n>0).sort((a,b)=>b[1]-a[1]).slice(0,11);
 if(!list.length)root.append(dom('p','empty','Причины ожидания не классифицированы в текущем срезе.'));
 for(const [key,n]of list)item(root,aliases[key]||key,number(n));
 const block=el('blocked-reasons');clear(block);
 const reasons=Object.entries(d.blocked_examples||{}).filter(([,a])=>Array.isArray(a)&&a.length).sort((a,b)=>b[1].length-a[1].length).slice(0,9);
 if(!reasons.length)block.append(dom('p','empty','Нет проверенных примеров блокировок.'));
 for(const [key,rows]of reasons){const pr=rows.find(x=>safeInt(x.pr_number))?.pr_number;item(block,key.replace(/_/g,' '),number(rows.length),pr?'Пример PR #'+pr:null,pr?REPO+'/pull/'+pr:null);}
 const table=el('pr-rows');clear(table);
 const records=compactRecords(d);if(!records.length){const tr=dom('tr');td(tr,'Реестр недоступен');td(tr,'—');td(tr,'—');td(tr,'—');table.append(tr);}
 for(const r of records){
  const tr=dom('tr'),cell=td(tr,'');cell.append(anchor(r.number));td(tr,stamp(r.updated*1000));td(tr,r.sha);
  const tags=[];if(r.prod)tags.push('production');if(r.triage)tags.push('triage отметка');if(r.claimed)tags.push('worker claim');if(r.ready)tags.push('ready отметка');
  td(tr,tags.join(' · ')||'metadata');table.append(tr);
 }
 snapshots.queue=d;overviewSources();updateRecommendations();
}
const FUNNEL_KEYS=['failed','classified','task','assigned','source_assigned','dispatched','claimed','runner','responded','committed'];
// Always display the real current PR blocker separately from historical
// gap attribution; an event is not proof of why the whole interval elapsed.
const PR_REASON_TEXT=Object.freeze({
 EXPLICIT_OWNER_HOLD:'Явная блокировка владельца',
 POLICY_BLOCKED:'Блокировка политики',
 SOURCE_OWNER_CLAIMED:'Исходники заняты другим исполнителем',
 MERGE_CONFLICT_DIRTY_NOW:'Неприменимый merge: конфликт с production',
 SEMANTIC_SOURCE_REPAIR_PENDING:'Требуется семантическое исправление',
 RELEASE_GATE_REVIEW:'Требуется разбор release gate',
 MERGE_CONFLICT_TRIAGE:'Конфликт ожидает проверку',
 SAFE_REPAIR_QUEUED:'Исправление стоит в очереди',
 CORE_CI_RECOVERY_PENDING:'Ожидается восстановление Core CI',
 OPEN_NO_PROVEN_BLOCKER:'Открыт, блокировка не подтверждена',
 CLOSED_NOT_CURRENTLY_WAITING:'PR закрыт'
});
function prContextRoot(){
 let block=el('error-funnel-pr-context');
 if(!block){
  block=dom('div','note');block.id='error-funnel-pr-context';
  const after=el('error-funnel-info');
  if(after)after.insertAdjacentElement('afterend',block);
  else el('error-funnel')?.append(block);
 }
 return block;
}
function showPublicPrContext(pr,record){
 const root=prContextRoot();if(!root)return;
 root.replaceChildren();if(pr===null)return;
 const heading=dom('p','note');
 heading.append(anchor(pr,'PR #'+pr),' · ');
 if(!record){heading.append('Не удалось проверить текущую блокировку GitHub. Неизвестно ≠ нет ошибки.');root.append(heading);return;}
 const cause=PR_REASON_TEXT[record.current_reason_code]||record.current_reason_code;
 heading.append('Сейчас: '+cause+' · HEAD '+record.current_head.slice(0,12)+
  '. Это не доказательство причины всех прошлых пауз.');
 root.append(heading);
 const seen=record.observed_events.slice(-5);
 for(const e of seen){
  root.append(dom('p','note',stamp(e.at)+' · '+
   (e.transition==='labeled'?'Добавлена ':'Снята ')+e.label+
   ' · '+e.reason_code+'. Событие GitHub, не длительность работы AI.'));
 }
 if(!record.history_complete)root.append(dom('p','note',
  'История неполная — возможно, более старые блокировки не вошли в выборку.'));
}
async function refreshPrContext(pr,sequence){
 if(pr===null){showPublicPrContext(null,null);return;}
 const root=prContextRoot();
 if(root)root.replaceChildren(dom('p','note','Проверяю текущий PR #'+pr+' в GitHub…'));
 const record=await readPublicPrContext(pr,env.fetch);
 if(sequence!==funnelSeq)return;
 showPublicPrContext(pr,record);
}
function funnelMissing(message){
 for(const key of FUNNEL_KEYS){put('f-'+key,'—');put('f-t-'+key,'—');put('f-proof-'+key,'—');}
 put('error-funnel-coverage',message);
 // The API's old deployment and the newer JS can be served together while
 // the single atomic Vercel release is pending. Older HTML lacks these nodes.
 // Keep the original signed 10-stage funnel usable instead of crashing.
 const extra=el('funnel-extra-rows'),details=el('funnel-incident-list');
 const prev=el('funnel-prev'),next=el('funnel-next');
 if(extra)extra.textContent='Подтверждения не получены.';
 if(details)details.textContent='Нет подтверждённых инцидентов.';
 if(el('funnel-page'))put('funnel-page','Данные не получены');
 if(prev)prev.disabled=true;
 if(next)next.disabled=true;
 put('error-funnel-info','«—» = нет проверенного свидетельства, не ноль. Приватный CI inbox недоступен публично.');
}
function renderFunnel(d,hours=funnelHours){
 if(d?.schema!==SCHEMAS.funnel||d.period_hours!==hours||
  !Array.isArray(d.stages)||d.stages.length!==10||
  !FUNNEL_KEYS.every((key,i)=>d.stages[i]?.key===key&&safeInt(d.stages[i]?.confirmed))||
  !safeInt(d.cohort?.sampled_prs)||d.cohort?.checked_only_public_records!==true)throw Error('FUNNEL_SCHEMA');
 const c=d.cohort;
 put('error-funnel-coverage',(c.requested_pr?'PR #'+c.requested_pr+' · ':'Частичный архив: '+number(c.candidate_prs)+' PR с ошибками · ')+'проверено '+number(c.sampled_prs)+' PR, '+number(c.comments_read)+' наборов комментариев GitHub.');
 for(const s of d.stages){
  put('f-'+s.key,s.confirmed>0?'≥'+number(s.confirmed):'—');
  put('f-t-'+s.key,s.confirmed>0&&safeNum(s.median_minutes)?delay(s.median_minutes):'—');
  const root=el('f-proof-'+s.key);root.replaceChildren();
  for(const example of (Array.isArray(s.examples)?s.examples.slice(0,3):[])){
   if(!safeInt(example.pr)||example.pr<1||typeof example.url!=='string')continue;
   const prefix=REPO+'/pull/'+example.pr+'#issuecomment-';
   const goodComment=example.url.startsWith(prefix)&&/^[0-9]+$/.test(example.url.slice(prefix.length));
   const runPrefix=REPO+'/actions/runs/';
   const goodRun=example.url.startsWith(runPrefix)&&/^[0-9]+$/.test(example.url.slice(runPrefix.length));
   if(!goodComment&&!goodRun)continue;
   const a=dom('a','funnel-proof','#'+example.pr);a.href=example.url;a.target='_blank';a.rel='noopener noreferrer';root.appendChild(a);
  }
  if(!root.childNodes.length)root.textContent='—';
 }
 // If only monitor.js was uploaded, the older HTML cannot render extra
 // panels. Never throw, silently hide base stages, or equate a stale API with
 // zero model/patch activity. Production needs one complete release bundle.
 const extRoot=el('funnel-extra-rows'),detailRoot=el('funnel-incident-list');
 const prev=el('funnel-prev'),next=el('funnel-next');
 if(!extRoot||!detailRoot||!el('funnel-page')||!prev||!next){
  put('error-funnel-info','Базовые квитанции GitHub доступны. Расширенный обзор ожидает единую публикацию HTML, JS и API; сейчас он не проверен.');
  return;
 }
 clear(extRoot);
 const newApi=Array.isArray(d.extended_stages)&&Array.isArray(d.incidents);
 const ext=newApi?d.extended_stages:[];
 if(!newApi)extRoot.append(dom('p','empty','API мониторинга ещё старой версии. Модель, патч и LIVE пока не подтверждены.'));
 else if(!ext.length)extRoot.append(dom('p','empty','Данных о модели и патче пока нет.'));
 for(const stage of ext){
  if(typeof stage.label!=='string'||!safeInt(stage.confirmed))continue;
  const panel=dom('div','funnel-extra-item');
  panel.append(dom('span',null,clampText(stage.label,60)));
  panel.append(dom('strong',null,stage.confirmed>0?'≥'+number(stage.confirmed):'—'));
  panel.append(dom('small',null,'P50: '+(stage.confirmed>0&&safeNum(stage.p50_minutes)?delay(stage.p50_minutes):'—')+
   ' · P90: '+(stage.confirmed>0&&safeNum(stage.p90_minutes)?delay(stage.p90_minutes):'—')));
  extRoot.append(panel);
 }
 clear(detailRoot);
 const rows=Array.isArray(d.incidents)?d.incidents.slice(0,8):[];
 if(!newApi)detailRoot.append(dom('p','empty','Для детализации PR требуется единая публикация нового API.'));
 else if(!rows.length)detailRoot.append(dom('p','empty','В выбранном срезе инцидентов нет.'));
 for(const x of rows){
  if(!safeInt(x.pr)||x.pr<1||typeof x.head!=='string')continue;
  const block=dom('details');
  block.append(dom('summary',null,'#'+x.pr+' · '+clampText(x.category||'Диагностика',26)+
    ' · '+clampText(x.state||'Не подтверждено',42)));
  const values=[
    ['HEAD',x.head.slice(0,12)],
    ['Причина',x.blocked_reason||x.reason_code||'Не установлена'],
    ['Следующее действие',x.next_action||'Требуется диагностика'],
    ['Проверить после',isTime(x.next_check_at)?stamp(x.next_check_at):'Нет подтверждённой даты'],
    ['Исполнитель',x.executor_id||'Не назначен'],
    ['Модель',x.model_evidence||'Не подтверждено'],
    ['Патч',x.patch_ready?'Проверен':'Не подтверждён'],
    ['Новый SHA',typeof x.source_sha==='string'?x.source_sha.slice(0,12):'Не подтверждён'],
    ['Релиз',(x.ci_verified?'CI ✓':'CI —')+' / '+
      (x.merged?'Merge ✓':'Merge —')+' / '+(x.live_verified?'LIVE ✓':'LIVE —')]
  ];
  for(const [name,value]of values){
    const p=dom('p');p.append(dom('b',null,name+': '));
    p.append(doc.createTextNode(clampText(value,140)));block.append(p);
  }
  const link=dom('a',null,'PR в GitHub');
  link.href=REPO+'/pull/'+x.pr;link.rel='noopener noreferrer';link.target='_blank';
  block.append(link);
  if(typeof x.worker_run==='string'&&
    /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/[0-9]+$/.test(x.worker_run)){
    const worker=dom('a',null,'Worker run');worker.href=x.worker_run;
    worker.rel='noopener noreferrer';worker.target='_blank';block.append(worker);
  }
  detailRoot.append(block);
 }
 funnelPage=safeInt(c.page)?c.page:0;
 funnelPages=safeInt(c.pages_total)&&c.pages_total>0?c.pages_total:1;
 put('funnel-page','Страница '+(funnelPage+1)+' / '+funnelPages);
 el('funnel-prev').disabled=funnelPage===0;
 el('funnel-next').disabled=funnelPage>=funnelPages-1;
 put('error-funnel-info','Подтверждения сопоставлены по точным PR + HEAD + Core run. '+
  (Number.isSafeInteger(c.unclassified_tasks)&&c.unclassified_tasks>0?
    'Требуют дополнительной диагностики: '+number(c.unclassified_tasks)+' из проверенных PR. ':'')+
  'UNKNOWN и owner_review не считаются классификацией и запуском AI Worker; ≥ — нижняя граница выборки.');
}
function funnelUrl(hours,pr){return URLS.funnel.replace('hours=24','hours='+hours)+(pr===null?'':'&pr='+pr)+(funnelPage>0?'&page='+funnelPage:'');}
async function selectFunnelPeriod(hours,pr=funnelPR,keepPage=false){
 if(![24,168,336].includes(hours)||pr!==null&&(!safeInt(pr)||pr<1||pr>999999))return;
 if(!keepPage)funnelPage=0;
 funnelHours=hours;funnelPR=pr;const seq=++funnelSeq;
 funnelMissing('Получаю подтверждения за '+(hours===24?'24 часа':hours/24+' дней')+'…');
 void refreshPrContext(pr,seq);
 try{const url=funnelUrl(hours,pr);
  const data=await fetchSafe(url,SCHEMAS.funnel,24000);
  if(seq===funnelSeq)renderFunnel(data,hours);
 }catch(_){if(seq===funnelSeq)funnelMissing('GitHub-квитанции недоступны.');}
}
function renderRepair(d){
 if(d?.schema!==SCHEMAS.repair)throw Error('REPAIR_SCHEMA');
 const r=d.windows?.last_24h;if(!r)throw Error('REPAIR_WINDOW');
 const err=r.error_to_repair,first=r.ci_first_pass,green=r.green_to_merge;
 put('k-repair',err?.n>0?delay(err.median_min):'—');
 put('k-firstpass',safeNum(first?.percent_observed)?first.percent_observed.toLocaleString('ru-RU',{maximumFractionDigits:1})+'%':'—');
 put('k-greenmerge',green?.n>0?delay(green.median_min):'—');put('k-green-n',number(green?.n));
 put('repair-explanation','Ошибка → Repair: n='+number(err?.n)+'. Первая наблюдаемая CI: '+number(first?.measured)+' запусков, история неполная. Green → Merge: n='+number(green?.n)+' — только проверенный HEAD.');
 const root=el('repair-examples');clear(root);
 const rows=Array.isArray(green?.rows)?green.rows.slice(0,8):[];
 if(!rows.length)root.append(dom('p','empty','Недостаточно подтверждённых переходов.'));
 for(const x of rows){const n=x.pr;if(safeInt(n)&&n>0)item(root,'PR #'+n,delay(x.minutes),x.merge_proof||'Подтверждение GitHub',REPO+'/pull/'+n);}
 snapshots.repair=d;updateRecommendations();
}
function updateRecommendations(){
 const root=el('recommendations');clear(root);const list=[],stage=snapshots.stages,ci=snapshots.ci,queue=snapshots.queue,repair=snapshots.repair;
 if(stage){for(const [key,label]of [['prepare','Подготовка'],['runner','Runner'],['ci','CI'],['gate','Gate'],['merge','Merge']]){const w=stage.waiting?.[key];if(w?.n>0){const n=w.examples?.find(safeInt);list.push([label+': ожидают '+number(w.n)+' PR',n?'Пример PR #'+n:'Проверить события в GitHub',n?REPO+'/pull/'+n:null]);}}}
 if(queue?.counts?.blocked_total>0)list.push(['Есть блокировки: '+number(queue.counts.blocked_total),'Разобрать подтверждённые причины в разделе «Очередь».',queue.run_url?.startsWith('https://github.com/')?queue.run_url:null]);
 if(ci?.coverage?.complete===false)list.push(['CI мониторинг охватывает выборку','Не делать вывод обо всех PR по ограниченной выборке jobs.',REPO+'/actions']);
 if(repair?.windows?.last_24h?.error_to_repair?.history_complete===false)list.push(['Ошибка → Repair не измерена полностью','Не выдавать неизвестные границы исправления за ноль минут.',null]);
 if(!list.length)list.push(['Жду проверенных событий','Обновить данные и отдельно подтвердить production LIVE.',REPO+'/pulls']);
 for(const [title,note,url]of list.slice(0,8))item(root,title,'',note,url);
}
function fetchSafe(path,schema,timeoutMs=8500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 return env.fetch(path,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})
 .then(async response=>{if(!response.ok)throw Error('HTTP_'+response.status);const value=await response.json();if(value?.schema!==schema)throw Error('BAD_SCHEMA');return value;})
 .finally(()=>clearTimeout(timer));
}
async function refresh(){
 if(refreshing)return;refreshing=true;el('refresh').disabled=true;
 put('status','Обновляю проверенные данные PR Monitor…');el('state-dot').className='status-dot';
 let complete=0,errors=0;const sourceTimes=[];

 const atStart=selectedPeriod;
 const atStage=++stageRequestSeq;
 const funnelAtStart=funnelHours,funnelPRAtStart=funnelPR,funnelAtSeq=++funnelSeq;
 if(funnelPRAtStart!==null)void refreshPrContext(funnelPRAtStart,funnelAtSeq);
 const tasks=[['flow',d=>drawFlow(activity(d))],['cohort',renderStrictCohort],['stages',d=>{if(stageRequestSeq===atStage)renderStages(d,atStart);},URLS.stages.replace('hours=24','hours='+atStart)],['comparison',d=>{if(stageRequestSeq===atStage)renderComparison(d,atStart);},URLS.comparison+'?hours='+atStart+'&compare=1&strict_weekly=1'],['ci',renderCI],['open',renderOpenCount],['queue',renderQueue],['funnel',d=>{if(funnelAtSeq===funnelSeq)renderFunnel(d,funnelAtStart);},funnelUrl(funnelAtStart,funnelPRAtStart)],['repair',renderRepair],['ciLive',renderCILive],['period',d=>{if(selectedPeriod===atStart)renderPeriod(d,atStart);},URLS.period+'?hours='+atStart]];
 const result=await Promise.allSettled(tasks.map(async([key,fn,route])=>{
  const data=key==='cohort'?await refreshStrictCohort():await fetchSafe(route||URLS[key],SCHEMAS[key],['stages','comparison','funnel'].includes(key)?24000:key==='ci'?11000:8500);if(key!=='cohort')fn(data);
  const at=key==='queue'?(data.checked_at||data.generated_at):key==='period'?data.observed_at:data.generated_at;
  sourceTimes.push(isTime(at)?Date.parse(at):null);complete++;
 }));
 for(let i=0;i<result.length;i++){if(result[i].status==='rejected'){errors++;const key=tasks[i][0];if(key==='flow')put('flow-info','Сейчас нет ответа данных PR/CI — нажмите «Обновить».');if(key==='cohort'&&!strictRaw)renderStrictCohort();if(key==='stages'&&selectedPeriod===atStart&&stageRequestSeq===atStage)stageMissing('Источник этапов не ответил.');if(key==='comparison'&&selectedPeriod===atStart&&stageRequestSeq===atStage)comparisonMissing('Исторические данные не ответили.');if(key==='ci')put('ci-coverage','CI источник недоступен');
 if(key==='ciLive'){put('k-ci-running','—');put('k-ci-queued','—');put('k-ci-running-note','Источник недоступен');put('k-ci-queued-note','Источник недоступен');}
 if(key==='funnel'&&funnelAtSeq===funnelSeq)funnelMissing('GitHub-квитанции недоступны.');
 if(key==='open')renderOpenFallback();
 if(key==='period'&&selectedPeriod===atStart){put('k-created','—');put('k-merged','—');put('k-created-note','Источник недоступен');put('k-merged-note','Источник недоступен');}}}
 const oldest=sourceTimes.length?Math.min(...sourceTimes.map(t=>t===null?-Infinity:t)):null;
 const age=oldest===null?Infinity:oldest===-Infinity?Infinity:Math.max(0,Date.now()-oldest);
 const stale=age>75*60000,delayed=age>15*60000;
 const freshness=stale?'Есть устаревший источник':delayed?'Некоторые источники обновляются с задержкой':'Источники свежие';
 put('status',errors?'Доступно '+complete+' из '+tasks.length+' источников, '+errors+' недоступны. '+freshness+'.':freshness+' · доступно '+complete+' из '+tasks.length+' источников.');
 put('updated-at',Number.isFinite(oldest)?'Самый ранний срез · Торонто: '+stamp(oldest):'Время одного из источников неизвестно');
 el('state-dot').className='status-dot '+(complete===0?'bad':errors||delayed?'':'good');
 el('refresh').disabled=false;refreshing=false;updateRecommendations();
}
el('refresh').addEventListener('click',()=>{void refresh();});
el('error-funnel-period').addEventListener('change',e=>{void selectFunnelPeriod(Number(e.target.value));});
el('error-funnel-find').addEventListener('click',()=>{const value=el('error-funnel-pr').value.trim();if(!/^[1-9][0-9]{0,5}$/.test(value)){put('error-funnel-coverage','Введите корректный номер PR.');return;}void selectFunnelPeriod(funnelHours,Number(value));});
el('error-funnel-all').addEventListener('click',()=>{el('error-funnel-pr').value='';void selectFunnelPeriod(funnelHours,null);});
if(el('funnel-prev'))el('funnel-prev').addEventListener('click',()=>{
 if(funnelPage>0){funnelPage--;void selectFunnelPeriod(funnelHours,funnelPR,true);}
});
if(el('funnel-next'))el('funnel-next').addEventListener('click',()=>{
 if(funnelPage<funnelPages-1){funnelPage++;void selectFunnelPeriod(funnelHours,funnelPR,true);}
});
for(const b of doc.querySelectorAll('[data-period]'))b.addEventListener('click',()=>{void selectPeriod(Number(b.dataset.period));});
void refresh();
})(typeof window==='undefined'?null:window);
