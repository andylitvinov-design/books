'use strict';
// Zero-cron, read-only monitor. Source is a verified GitHub Actions issue archive.
const ISSUE=3419,BASE='codex/public-book-library';
const HOST='https://api.github.com/repos/andylitvinov-design/books';
const PREFIX='<!-- HH_CORE_CI_JOURNEY_SHARD_V1:';
const SCHEMA='HH_CORE_CI_JOURNEY_SHARD_V1';
const HOURS=[1,6,24,72,168,336,360],SHA=/^[a-f0-9]{40}$/i;
const t=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null;};
const rnd=x=>Math.round(x*100)/100;
const quant=(arr,p)=>{if(!arr.length)return null;const a=[...arr].sort((x,y)=>x-y);
 const x=(a.length-1)*p,lo=Math.floor(x),hi=Math.ceil(x);
 return a[lo]+(a[hi]-a[lo])*(x-lo);};
const safeRun=x=>typeof x==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(x)?x:null;
const msurl=id=>'https://github.com/andylitvinov-design/books/actions/runs/'+id;
let cache=null,last=0,pending=null;
function parse(comment){
 // One-time historical, explicitly partial readback. Owner-authored, never
 // treated as an Actions bot receipt or as a complete archive.
 const imported=comment?.user?.login==='andylitvinov-design'&&
   typeof comment.body==='string'&&
   comment.body.startsWith('<!-- HH_CORE_CI_JOURNEY_IMPORT_V1 -->\n');
 if(imported){
   let old;try{old=JSON.parse(comment.body.slice('<!-- HH_CORE_CI_JOURNEY_IMPORT_V1 -->\n'.length));}
   catch{return [];}
   if(old?.schema!=='HH_CORE_CI_JOURNEY_IMPORT_V1'||!Array.isArray(old.runs)||
      old.runs.length>25)return [];
   const bucket='2026-11-04T14-success';
   const fake={user:{login:'github-actions[bot]'},
     body:PREFIX+bucket+' -->\n'+JSON.stringify({schema:SCHEMA,bucket,runs:old.runs})};
   return parse(fake).map(r=>({...r,partial_jobs:true,source:'VERIFIED_PARTIAL_HISTORICAL_IMPORT'}));
 }
 if(comment?.user?.login!=='github-actions[bot]'||typeof comment?.body!=='string'||
   !comment.body.startsWith(PREFIX)||comment.body.length>60000)return [];
 const i=comment.body.indexOf(' -->\n');
 if(i<0)return [];
 const bucket=comment.body.slice(PREFIX.length,i);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}-(success|failure)$/.test(bucket))return [];
 let data;try{data=JSON.parse(comment.body.slice(i+5));}catch{return [];}
 if(data?.schema!==SCHEMA||data.bucket!==bucket||!Array.isArray(data.runs)||data.runs.length>160)return [];
 return data.runs.map(r=>{
   if(!Number.isSafeInteger(r.pr)||r.pr<1||!Number.isSafeInteger(r.run_id)||r.run_id<1||
     !Number.isSafeInteger(r.attempt)||r.attempt<1||r.base!==BASE||
     !SHA.test(r.source_head||'')||t(r.queued_at)===null||t(r.completed_at)===null||
     t(r.completed_at)<t(r.queued_at)||!Array.isArray(r.jobs)||r.jobs.length>30)return null;
   const jobs=r.jobs.filter(j=>Number.isSafeInteger(j.id)&&j.id>0&&
     t(j.queued_at)!==null&&t(j.started_at)!==null&&t(j.completed_at)!==null&&
     t(j.queued_at)<=t(j.started_at)&&t(j.started_at)<=t(j.completed_at)&&
     t(j.completed_at)<=t(r.completed_at)+120000);
   // A GitHub workflow may be registered but fail before creating any jobs.
   // This proves registration, never a runner start or successful Core check.
   const registrationOnly=r.registration_only===true&&
     r.empty_job_reason==='STARTUP_FAILURE_NO_JOBS'&&
     r.conclusion==='startup_failure'&&r.attempt===1&&
     r.partial_jobs===true&&r.jobs.length===0&&
     Number.isSafeInteger(r.run_id)&&r.run_id>0&&
     r.workflow_url===msurl(r.run_id)&&
     t(r.pr_created_at)!==null&&t(r.pr_created_at)<=t(r.queued_at);
   if(r.registration_only===true&&!registrationOnly)return null;
   if(!jobs.length&&!registrationOnly)return null;
   return {...r,jobs,registration_only:registrationOnly,
     partial_jobs:registrationOnly||r.partial_jobs===true||jobs.length!==r.jobs.length};
 }).filter(Boolean);
}
async function fetchArchive(force=false){
 if(cache&&Date.now()-last<(force?60000:300000))return {...cache,stale:false};
 if(pending)return pending;
 pending=(async()=>{
   // Fifteen days are required for equal 24h windows: now, -7d and -14d.
   // Read only the existing authenticated archive with bounded pagination.
   const since=new Date(Date.now()-360*3600000).toISOString();
   const headers={Accept:'application/vnd.github+json',
     'User-Agent':'HH-CI-Journey-Read-Only','X-GitHub-Api-Version':'2022-11-28'};
   const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
   if(token)headers.Authorization='Bearer '+token;
   const comments=[];
   let remaining=null,lastPageSize=0,pages=0;
   const MAX_PAGES=5;
   for(let page=1;page<=MAX_PAGES;page++){
     const url=HOST+'/issues/'+ISSUE+'/comments?per_page=100&page='+page+
       '&since='+encodeURIComponent(since);
     const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
     let response;
     try{response=await fetch(url,{headers,signal:ctrl.signal});}
     finally{clearTimeout(timer);}
     remaining=Number(response.headers.get('x-ratelimit-remaining'));
     if(!response.ok||(Number.isFinite(remaining)&&remaining<10))
       throw Error('ARCHIVE_HTTP_'+response.status+(remaining<10?'_RATE_RESERVE':''));
     const batch=await response.json();
     if(!Array.isArray(batch))throw Error('ARCHIVE_INVALID');
     pages++;lastPageSize=batch.length;comments.push(...batch);
     if(batch.length<100)break;
   }
   const byRun=new Map();
   for(const c of comments)for(const r of parse(c)){
     const id=r.run_id+':'+r.attempt;
     if(!byRun.has(id)||byRun.get(id).partial_jobs&&!r.partial_jobs)byRun.set(id,r);
   }
   cache={runs:[...byRun.values()],comments:comments.length,pages,
     pagination_partial:pages===MAX_PAGES&&lastPageSize===100,
     remaining:Number.isFinite(remaining)?remaining:null,
     fetched_at:new Date().toISOString()};
   last=Date.now();return {...cache,stale:false};
 })().catch(e=>{
   if(cache)return {...cache,stale:true,stale_reason:String(e.message||e).slice(0,100)};
   throw e;
 }).finally(()=>{pending=null;});
 return pending;
}
function summarizePR(pr,runs){
 const sorted=[...runs].sort((a,b)=>t(a.queued_at)-t(b.queued_at));
 const first=t(sorted[0].queued_at),end=Math.max(...sorted.map(x=>t(x.completed_at)));
 // Never report a fake zero-minute CI when no runner job has existed.
 if(first===null||end<=first||!sorted.some(r=>r.jobs.length))return null;
 const intervals=[];
 const add=(name,a,b)=>{if(a!==null&&b!==null&&b>a&&a<end&&b>first)
   intervals.push({name,start:Math.max(first,a),end:Math.min(end,b)});};
 // These are observed HEAD transitions, not inferred repair/queue causes.
 // Never call a new HEAD proof of a successful repair or attribute the idle
 // time to GitHub runners. Count only intervals after ALL prior jobs ended.
 const wave={new_head:{count:0,ms:0},same_head:{count:0,ms:0},
   unverified_head:{count:0,ms:0},after_failure:{count:0,ms:0},
   new_head_after_success:{count:0,ms:0}};
 const waveRows=[];
 let prev=null,lastFinished=null;
 for(const r of sorted){
   const a=t(r.queued_at),b=t(r.completed_at);
   if(prev!==null&&a>prev){
     add('between_waves_unknown',prev,a);
     const relation=SHA.test(lastFinished?.source_head||'')&&SHA.test(r.source_head||'')
       ? (lastFinished.source_head===r.source_head?'same_head':'new_head')
       : 'unverified_head';
     const duration=a-prev;
     // Observed GitHub run pair, not proof of repair, actor or cause of the delay.
     waveRows.push({kind:relation,started_at:new Date(prev).toISOString(),
       ended_at:new Date(a).toISOString(),duration_ms:duration,
       prior_conclusion:typeof lastFinished?.conclusion==='string'?lastFinished.conclusion:'unknown',
       next_run_queued_at:new Date(a).toISOString(),
       after_failure:['failure','timed_out','startup_failure'].includes(lastFinished?.conclusion),
       prior_job_conclusions:Object.fromEntries((lastFinished?.jobs||[])
         .filter(j=>typeof j?.name==='string'&&typeof j?.conclusion==='string')
         .map(j=>[j.name,j.conclusion])),
       after_core_failure:(lastFinished?.jobs||[]).some(j=>
         j?.name==='core-lint-types-build'&&
         ['failure','timed_out','startup_failure'].includes(j.conclusion)),
       after_specialist_failure:(lastFinished?.jobs||[]).some(j=>
         j?.name==='hh-specialist'&&
         ['failure','timed_out','startup_failure'].includes(j.conclusion)),
       after_merge_gate_failure:(lastFinished?.jobs||[]).some(j=>
         j?.name==='hh-merge-check'&&
         ['failure','timed_out','startup_failure'].includes(j.conclusion)),
       prior_head:SHA.test(lastFinished?.source_head||'')?lastFinished.source_head.toLowerCase():null,
       next_head:SHA.test(r.source_head||'')?r.source_head.toLowerCase():null,
       prior_url:safeRun(lastFinished?.workflow_url)||msurl(lastFinished.run_id),
       next_url:safeRun(r.workflow_url)||msurl(r.run_id),
       actor_verified:false,
       evidence:'ARCHIVED_WORKFLOW_TIMES_AND_SHA_NOT_CAUSAL_PROOF'});
     wave[relation].count++;wave[relation].ms+=duration;
     // Core-only success cannot prove Specialist, Guard or merge checks are green.
     // The following overlapping subset prompts review, never blame or a bypass.
     if(relation==='new_head'&&lastFinished?.conclusion==='success'){
       wave.new_head_after_success.count++;
       wave.new_head_after_success.ms+=duration;
     }
     if(['failure','timed_out','startup_failure'].includes(lastFinished?.conclusion)){
       wave.after_failure.count++;wave.after_failure.ms+=duration;
     }
   }
   if(prev===null||b>=prev){prev=b;lastFinished=r;}
   let firstJob=Infinity;
   for(const j of r.jobs){
     const q=t(j.queued_at),s=t(j.started_at),c=t(j.completed_at);
     firstJob=Math.min(firstJob,q);
     add('runner_wait',q,s);
     add('checks',s,c);
   }
   // In legacy imports job.created_at is unknown, so this interval is
   // unattributed. Never mistake it for measured workflow/runner queue.
   if(Number.isFinite(firstJob)&&r.source!=='VERIFIED_PARTIAL_HISTORICAL_IMPORT')
     add('workflow_wait',a,firstJob);
 }
 const marks=[first,end,...intervals.flatMap(x=>[x.start,x.end])].sort((a,b)=>a-b);
 const stages={workflow_wait:0,runner_wait:0,checks:0,between_waves_unknown:0,other_unknown:0};
 const priority=['checks','runner_wait','workflow_wait','between_waves_unknown'];
 for(let i=1;i<marks.length;i++){
   const a=marks[i-1],b=marks[i];if(b<=a)continue;
   const cat=priority.find(k=>intervals.some(x=>x.name===k&&x.start<=a&&x.end>=b))||'other_unknown';
   stages[cat]+=b-a;
 }
 if(Math.abs(Object.values(stages).reduce((a,b)=>a+b,0)-(end-first))>1)return null;
 const lastRun=[...sorted].sort((a,b)=>t(b.completed_at)-t(a.completed_at))[0];
 const firstJob=sorted.flatMap(r=>r.jobs).sort((a,b)=>
   t(a.started_at)-t(b.started_at))[0]||null;
 // Named jobs are independently observed clocks, not extra additive stages.
 const names={core:'core-lint-types-build',specialist:'hh-specialist',
   merge_gate:'hh-merge-check'};
 const jobClockMs={};
 for(const [key,name] of Object.entries(names)){
   const spans=sorted.flatMap(r=>r.jobs.filter(j=>j.name===name)
     .map(j=>[t(j.started_at),t(j.completed_at)]))
     .filter(([a,b])=>a!==null&&b!==null&&b>=a)
     .sort((a,b)=>a[0]-b[0]);
   let total=0,start=null,endOfGroup=null;
   for(const [a,b] of spans){
     if(start===null){start=a;endOfGroup=b;}
     else if(a<=endOfGroup)endOfGroup=Math.max(endOfGroup,b);
     else{total+=endOfGroup-start;start=a;endOfGroup=b;}
   }
   jobClockMs[key]=start===null?null:total+endOfGroup-start;
 }
 return {pr,first_at:new Date(first).toISOString(),last_at:new Date(end).toISOString(),
   job_clock_ms:jobClockMs,
   elapsed_ms:end-first,elapsed_minutes:rnd((end-first)/60000),stages_ms:stages,
   wave_rows:waveRows,wave_gap_samples_ms:waveRows.map(x=>x.duration_ms),
   wave_head_evidence:{
     new_head_count:wave.new_head.count,new_head_ms:wave.new_head.ms,
     same_head_count:wave.same_head.count,same_head_ms:wave.same_head.ms,
     unverified_head_count:wave.unverified_head.count,unverified_head_ms:wave.unverified_head.ms,
     previous_failed_count:wave.after_failure.count,previous_failed_ms:wave.after_failure.ms,
     new_head_after_success_count:wave.new_head_after_success.count,
     new_head_after_success_ms:wave.new_head_after_success.ms},
   runs:sorted.length,repeats:Math.max(0,sorted.length-1),
   jobless_startup_runs:sorted.filter(r=>r.registration_only===true).length,
   first_job_started_at:firstJob?.started_at||null,
   first_job_url:firstJob?.url||null,
   distinct_heads:new Set(sorted.map(x=>x.source_head)).size,
   failures:sorted.filter(x=>['failure','timed_out','startup_failure'].includes(x.conclusion)).length,
   partial:sorted.some(x=>x.partial_jobs),
   created_at:sorted.map(x=>x.pr_created_at).find(x=>t(x)!==null)||null,
   merged_at:sorted.map(x=>x.merged_at).filter(x=>t(x)!==null).sort().at(-1)||null,
   first_url:safeRun(sorted[0].workflow_url)||msurl(sorted[0].run_id),
   last_url:safeRun(lastRun.workflow_url)||msurl(lastRun.run_id),
   history_complete:false};
}
function report(store,h,now=Date.now(),offsetHours=0){
 const byPR=new Map();
 for(const run of store.runs){
   if(!byPR.has(run.pr))byPR.set(run.pr,[]);
   byPR.get(run.pr).push(run);
 }
 const periodEnd=now-offsetHours*3600000,cutoff=periodEnd-h*3600000;
 const rows=[...byPR.entries()].map(([pr,runs])=>summarizePR(pr,runs)).filter(Boolean)
   .filter(x=>t(x.last_at)>=cutoff&&t(x.last_at)<=periodEnd+60000)
   .sort((a,b)=>b.elapsed_ms-a.elapsed_ms||a.pr-b.pr);
 const nums=rows.map(x=>x.elapsed_ms),sum=nums.reduce((a,b)=>a+b,0);
 const stages=['workflow_wait','runner_wait','checks','between_waves_unknown','other_unknown'];
 const stageTotals=Object.fromEntries(stages.map(k=>[k,rows.reduce(
   (total,row)=>total+(row.stages_ms?.[k]||0),0)]));
 const stageSamples=Object.fromEntries(stages.map(k=>[k,rows.filter(
   row=>(row.stages_ms?.[k]||0)>0).length]));
 const stageSum=Object.values(stageTotals).reduce((a,b)=>a+b,0);
 const reconciled=Math.abs(stageSum-sum)<=Math.max(1,rows.length);
 const waveKinds=['new_head','same_head','unverified_head'];
 const waveCounts=Object.fromEntries(waveKinds.map(k=>
   [k,rows.reduce((n,row)=>n+(row.wave_head_evidence?.[k+'_count']||0),0)]));
 const waveMs=Object.fromEntries(waveKinds.map(k=>
   [k,rows.reduce((n,row)=>n+(row.wave_head_evidence?.[k+'_ms']||0),0)]));
 const waveTotalMs=Object.values(waveMs).reduce((n,v)=>n+v,0);
 const waveReconciled=Math.abs(waveTotalMs-stageTotals.between_waves_unknown)<=1;
 const stageMeans=Object.fromEntries(stages.map(k=>[k,rows.length?
   rnd(stageTotals[k]/rows.length/60000):null]));
 // Scope this wave summary to the selected window. The main journey rows remain
 // lifetime timelines for their PR cohort; these wave counts are period-specific.
 const cohortPRs=new Set(rows.map(row=>row.pr));
 const periodRuns=store.runs.filter(run=>cohortPRs.has(run.pr)&&
   t(run.queued_at)>=cutoff&&t(run.queued_at)<periodEnd);
 // Attribute only the part of each observed gap that overlaps this exact
 // reporting window. A gap which began before the window must not inflate its
 // 24-hour total/P95 with several days of pre-window time.
 const periodWaveRows=rows.flatMap(row=>(row.wave_rows||[]).flatMap(w=>{
   const gapStart=t(w.started_at),gapEnd=t(w.ended_at);
   if(gapStart===null||gapEnd===null||gapEnd<=cutoff||gapStart>=periodEnd)return [];
   const clippedStart=Math.max(gapStart,cutoff),clippedEnd=Math.min(gapEnd,periodEnd);
   if(clippedEnd<=clippedStart)return [];
   return [{...w,pr:row.pr,full_duration_ms:w.duration_ms,
     duration_ms:clippedEnd-clippedStart,
     started_at:new Date(clippedStart).toISOString(),
     ended_at:new Date(clippedEnd).toISOString(),
     clipped_at_window_start:gapStart<cutoff,
     clipped_at_window_end:gapEnd>periodEnd}];
 }));
 const gapSamples=periodWaveRows.map(w=>w.duration_ms)
   .filter(n=>Number.isFinite(n)&&n>0);
 const periodTransitionRows=periodWaveRows.filter(w=>{
   const queued=t(w.next_run_queued_at);return queued!==null&&queued>=cutoff&&queued<periodEnd;
 });
 const ciRuns=periodRuns.length,repeatWaves=periodTransitionRows.length;
 const periodCounts={
   new_head:periodTransitionRows.filter(w=>w.kind==='new_head').length,
   same_head:periodTransitionRows.filter(w=>w.kind==='same_head').length,
   unverified_head:periodTransitionRows.filter(w=>w.kind==='unverified_head').length
 };
 const afterFailed=periodTransitionRows.filter(w=>w.after_failure===true).length;
 const afterCoreFailed=periodTransitionRows.filter(w=>w.after_core_failure===true).length;
 const afterSpecialistFailed=periodTransitionRows.filter(w=>w.after_specialist_failure===true).length;
 const afterMergeGateFailed=periodTransitionRows.filter(w=>w.after_merge_gate_failure===true).length;
 const clippedAtWindowStart=periodWaveRows.filter(w=>w.clipped_at_window_start).length;
 const clippedAtWindowEnd=periodWaveRows.filter(w=>w.clipped_at_window_end).length;
 const afterSuccess=periodWaveRows.filter(w=>w.kind==='new_head'&&w.prior_conclusion==='success').length;
 const gapTotalMs=gapSamples.reduce((a,b)=>a+b,0);
 const waveSummary={
   observed_prs:rows.length,ci_runs:ciRuns,repeat_waves:repeatWaves,
   mean_runs_per_pr:rows.length?rnd(ciRuns/rows.length):null,
   mean_repeat_waves_per_pr:rows.length?rnd(repeatWaves/rows.length):null,
   intervals:gapSamples.length,prs_with_intervals:new Set(periodWaveRows.map(w=>w.pr)).size,
   new_head:periodCounts.new_head,same_head:periodCounts.same_head,
   unverified_head:periodCounts.unverified_head,
   // Backward-compatible field: this is a failed aggregate workflow, not
   // specifically a failed Core build. New UI uses the precise job fields.
   after_failed:afterFailed,after_workflow_failure:afterFailed,
   after_core_failure:afterCoreFailed,
   after_specialist_failure:afterSpecialistFailed,
   after_merge_gate_failure:afterMergeGateFailed,
   clipped_at_window_start:clippedAtWindowStart,
   clipped_at_window_end:clippedAtWindowEnd,
   after_success:afterSuccess,
   gap_total_minutes:rnd(gapTotalMs/60000),
   gap_mean_minutes_per_pr:rows.length?rnd(gapTotalMs/rows.length/60000):null,
   gap_mean_minutes_per_interval:gapSamples.length?rnd(gapTotalMs/gapSamples.length/60000):null,
   gap_p50_minutes:gapSamples.length?rnd(quant(gapSamples,.5)/60000):null,
   gap_p95_minutes:gapSamples.length?rnd(quant(gapSamples,.95)/60000):null,
   archive_complete:false,pagination_partial:store.pagination_partial===true
 };
 const jobClockSummary=Object.fromEntries(['core','specialist','merge_gate'].map(key=>{
   const observed=rows.map(row=>row.job_clock_ms?.[key])
     .filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0);
   return [key,{measured_prs:observed.length,cohort_prs:rows.length,
     mean_minutes:observed.length?rnd(observed.reduce((a,b)=>a+b,0)/observed.length/60000):null,
     p50_minutes:observed.length?rnd(quant(observed,.5)/60000):null,
     p95_minutes:observed.length?rnd(quant(observed,.95)/60000):null}];
 }));
 return {schema:'HH_CI_FIRST_LAST_ARCHIVE_V1',
   generated_at:new Date(now).toISOString(),
   period:{from:new Date(cutoff).toISOString(),to:new Date(periodEnd).toISOString(),offset_hours:offsetHours,duration_hours:h},
   period_hours:h,cohort:'LAST_OBSERVED_CORE_JOB_COMPLETED_IN_WINDOW',
   archive_url:'https://github.com/andylitvinov-design/books/issues/'+ISSUE,
   coverage:{label:'VERIFIED_RUN_SAMPLE_NOT_ALL_PRS',comments_seen:store.comments,
     jobless_startup_runs:store.runs.filter(r=>r.registration_only===true).length,
     jobless_startup_only_prs:[...byPR.values()].filter(rs=>
       rs.every(r=>r.registration_only===true)).length,
     archived_runs:store.runs.length,archived_prs:byPR.size,
     partial_prs:rows.filter(x=>x.partial).length,
     history_complete:false,pagination_partial:store.pagination_partial,
     rows_returned:Math.min(250,rows.length),rows_total:rows.length,
     api_remaining:store.remaining,stale:store.stale===true,
     archive_fetched_at:store.fetched_at,
     note:'Первая регистрация Core может быть startup_failure без jobs; первый реально стартовавший job показан отдельно. Draft и отсутствие прежних запусков не являются ожиданием runner.'},
   summary:{n:rows.length,median_minutes:nums.length?rnd(quant(nums,.5)/60000):null,
     average_minutes:nums.length?rnd(sum/nums.length/60000):null,
     p90_minutes:nums.length?rnd(quant(nums,.9)/60000):null,
     repeats:rows.reduce((n,x)=>n+x.repeats,0),
     jobless_startup_runs:rows.reduce((n,x)=>n+x.jobless_startup_runs,0),
     failures:rows.reduce((n,x)=>n+x.failures,0)},
   wave_summary:waveSummary,
   wave_head_evidence:{schema:'HH_CI_WAVE_HEAD_EVIDENCE_V1',
     cohort:'SAME_OBSERVED_CI_ROWS_AS_SUMMARY',
     n:rows.length,total_gap_count:Object.values(waveCounts).reduce((n,v)=>n+v,0),
     total_gap_ms:waveTotalMs,transition_counts:waveCounts,transition_total_ms:waveMs,
     after_failed_count:rows.reduce((n,row)=>n+(row.wave_head_evidence?.previous_failed_count||0),0),
     after_failed_ms:rows.reduce((n,row)=>n+(row.wave_head_evidence?.previous_failed_ms||0),0),
     new_head_after_success_count:rows.reduce((n,row)=>n+(row.wave_head_evidence?.new_head_after_success_count||0),0),
     new_head_after_success_ms:rows.reduce((n,row)=>n+(row.wave_head_evidence?.new_head_after_success_ms||0),0),
     reconciled:waveReconciled,
     top_delays:[...rows].filter(row=>(row.stages_ms?.between_waves_unknown||0)>0)
       .sort((a,b)=>b.stages_ms.between_waves_unknown-a.stages_ms.between_waves_unknown)
       .slice(0,5).map(row=>({pr:row.pr,minutes:rnd(row.stages_ms.between_waves_unknown/60000),
         new_head_count:row.wave_head_evidence.new_head_count,
         same_head_count:row.wave_head_evidence.same_head_count,
         last_url:row.last_url})),
     note:'Новый HEAD доказан сохранёнными SHA, но причина задержки публикации следующего коммита и длительность Repair остаются неизвестными. Архив неполон.'},
   job_clock_summary:{schema:'HH_CI_NAMED_JOB_CLOCK_V1',
     scope:'ARCHIVED_NAMED_JOBS_NON_ADDITIVE_UNION',
     cohort:'SAME_OBSERVED_CI_ROWS_AS_SUMMARY',n:rows.length,
     history_complete:false,clocks:jobClockSummary},
   stage_breakdown:{schema:'HH_CI_JOURNEY_CONTRIBUTIONS_V1',
     cohort:'SAME_OBSERVED_CI_ROWS_AS_SUMMARY',
     n:rows.length,mean_minutes_per_pr:stageMeans,
     prs_with_observed_span:stageSamples,
     total_mean_minutes:nums.length?rnd(sum/nums.length/60000):null,
     observed_elapsed_ms:sum,stage_total_ms:stageTotals,
     reconciled},
   // Drilldown is requested by user interaction, never on the overview load.
   rows:rows.slice(0,250).map(({wave_rows,...row})=>row)};
}
function comparePeriods(store,h,now=Date.now()){
 const specs=[
   {id:'current',label:'Последние 24 часа',offset_hours:0},
   {id:'week_ago',label:'Та же дата неделю назад',offset_hours:168},
   {id:'two_weeks_ago',label:'Та же дата две недели назад',offset_hours:336}
 ];
 return {schema:'HH_CI_JOURNEY_PERIOD_COMPARISON_V1',generated_at:new Date(now).toISOString(),
   period_hours:h,comparison_basis:'SAME_DURATION_WINDOW_SHIFTED_BY_7D_AND_14D',
   archive_url:'https://github.com/andylitvinov-design/books/issues/'+ISSUE,
   periods:specs.map(spec=>{
     const item=report(store,h,now,spec.offset_hours);
     return {id:spec.id,label:spec.label,offset_hours:spec.offset_hours,period:item.period,
       coverage:item.coverage,summary:item.summary,stage_breakdown:item.stage_breakdown,
       wave_head_evidence:item.wave_head_evidence,wave_summary:item.wave_summary,
       job_clock_summary:item.job_clock_summary,top_delays:item.wave_head_evidence.top_delays};
   }),
   note:'Сравниваются одинаковые 24-часовые окна, сдвинутые на 7 и 14 суток. Это не сумма последних 7/14 дней. Архив CI частичный; отсутствие события не равно нулю.'
 };
}
function waveDetail(store,pr,h,now=Date.now()){
 const matches=store.runs.filter(run=>run.pr===pr);
 const row=matches.length?summarizePR(pr,matches):null;
 const available=!!row&&t(row.last_at)>=now-h*3600000&&t(row.last_at)<=now+60000;
 return {schema:'HH_CI_WAVE_DETAIL_V1',pr,period_hours:h,available,
   total_waves:available?row.wave_rows.length:0,history_complete:false,
   pagination_partial:store.pagination_partial===true,
   waves:available?row.wave_rows:[],
   note:'Sequence and HEAD are observed; person, trigger and cause remain unverified. Overlapping runs are not counted as idle time.'};
}
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('X-Content-Type-Options','nosniff');
 const force=req.query?.refresh==='1';
 res.setHeader('Cache-Control',force?'private,no-store':'public,s-maxage=300,stale-while-revalidate=900');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));}
 const hours=Number(req.query?.hours||24);
 if(!HOURS.includes(hours)){res.statusCode=400;return res.end(JSON.stringify({error:'INVALID_HOURS'}));}
 const rawPr=req.query?.pr;
 const compare=req.query?.compare==='1';
 if(rawPr!==undefined&&(typeof rawPr!=='string'||!/^[1-9][0-9]{0,5}$/.test(rawPr))){
   res.statusCode=400;return res.end(JSON.stringify({error:'INVALID_PR'}));}
 try{
   const store=await fetchArchive(force);
   res.statusCode=200;
   if(compare&&rawPr!==undefined){res.statusCode=400;return res.end(JSON.stringify({error:'COMPARE_CANNOT_INCLUDE_PR'}));}
   res.end(JSON.stringify(compare?comparePeriods(store,hours):
     rawPr===undefined?report(store,hours):waveDetail(store,Number(rawPr),hours)));
 }
 catch(e){res.statusCode=503;res.end(JSON.stringify({schema:'HH_CI_FIRST_LAST_ARCHIVE_V1',
   error:String(e.message||e).slice(0,90),missing_is_not_zero:true}));}
};
module.exports._test={parse,summarizePR,report,comparePeriods,waveDetail};
