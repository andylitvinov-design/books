'use strict';
/* HH_PR_COHORT_WALL_CLOCK_V1
 * Pure additive reconciliation of a created+merged PR cohort with the
 * *existing* read-only saved Core CI archive. No GitHub requests.
 *
 * ALL numbers are per original PR cohort (N), not conditional sample means.
 * The CI archive's history_complete=false means that the time *outside* its
 * observed window is unknown, NEVER "preparation", "repair", or "merge wait".
 * The unknown compartments remain explicit and add up to the same N-PR mean.
 */
(function(factory){
 const model=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=model;
 if(typeof window!=='undefined')window.HHPrCohortWallClock=model;
})(function(){
 const VERSION='HH_PR_COHORT_WALL_CLOCK_V1';
 const KEYS=['before_unknown','workflow_wait','runner_wait','checks',
   'ci_wave_unknown','ci_other_unknown','after_unknown','no_archive_unknown'];
 const MILLIS=60000;
 const PERCENTILE_METHOD='LINEAR_INTERPOLATION';
 function pct(values,q){
  if(!values.length)return null;
  const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);
  return a[lo]+(a[hi]-a[lo])*(i-lo);
 }
 function stamp(s){const x=Date.parse(typeof s==='string'?s:'');return Number.isFinite(x)?x:null;}
 function valid(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0;}
 function row(p){
  const start=stamp(p?.created_at),end=stamp(p?.merged_at);
  if(!Number.isSafeInteger(p?.number)||p.number<1||start===null||end===null||end<start)return null;
  return {number:p.number,start,end,elapsed:end-start};
 }
 function ordered(archive){
  const map=new Map();
  if(!Array.isArray(archive?.rows))return map;
  for(const r of archive.rows){
   if(!Number.isSafeInteger(r?.pr)||r.pr<1)continue;
   // Duplicates are not silently selected: invalidate until a unique row exists.
   if(map.has(r.pr))map.set(r.pr,null);else map.set(r.pr,r);
  }
  return map;
 }
 function observed(p,a){
  if(!a||a.pr!==p.number||!a.stages_ms||typeof a.stages_ms!=='object')return null;
  const first=stamp(a.first_at),last=stamp(a.last_at);
  if(first===null||last===null||first<p.start||last>p.end||last<first)return null;
  const core=['workflow_wait','runner_wait','checks','between_waves_unknown','other_unknown'];
  if(!core.every(k=>valid(a.stages_ms[k])))return null;
  const ci=core.reduce((n,k)=>n+a.stages_ms[k],0);
  if(Math.abs(ci-(last-first))>Math.max(2,core.length))return null;
  const values={
   before_unknown:first-p.start,
   workflow_wait:a.stages_ms.workflow_wait,
   runner_wait:a.stages_ms.runner_wait,
   checks:a.stages_ms.checks,
   ci_wave_unknown:a.stages_ms.between_waves_unknown,
   ci_other_unknown:a.stages_ms.other_unknown,
   after_unknown:p.end-last,
   no_archive_unknown:0
  };
  if(KEYS.reduce((n,k)=>n+values[k],0)!==p.elapsed)return null;
  return {values,first:a.first_at,last:a.last_at,partial:a.partial===true,
   runs:a.runs,repeats:a.repeats,first_url:a.first_url,last_url:a.last_url};
 }
 function calculate(cohort,archive){
  if(!Array.isArray(cohort?.rows)||!cohort.rows.length)return null;
  const seen=new Set(),prs=[];
  for(const candidate of cohort.rows){
   const p=row(candidate);
   if(!p||seen.has(p.number))return null;
   seen.add(p.number);prs.push(p);
  }
  if(cohort.n!==prs.length)return null;
  const N=prs.length,byPR=ordered(archive);
  const totals=Object.fromEntries(KEYS.map(k=>[k,0]));
  const counts=Object.fromEntries(KEYS.map(k=>[k,0]));
  const samples=Object.fromEntries(KEYS.map(k=>[k,[]]));
  let covered=0,missing=0,invalid=0,partial=0,overall=0;
  const paths=[];
  for(const p of prs){
   const has=byPR.has(p.number),input=has?byPR.get(p.number):undefined;
   const known=observed(p,input);
   const values=known?known.values:{
     before_unknown:0,workflow_wait:0,runner_wait:0,checks:0,
     ci_wave_unknown:0,ci_other_unknown:0,after_unknown:0,
     no_archive_unknown:p.elapsed
   };
   if(known){covered++;if(known.partial)partial++;}
   else if(has)invalid++;else missing++;
   overall+=p.elapsed;
   for(const key of KEYS){
     totals[key]+=values[key];
     if(key==='no_archive_unknown'? !known: Boolean(known)){
    counts[key]++;
    samples[key].push(values[key]/MILLIS);
   }
   }
   paths.push({pr:p.number,elapsed_ms:p.elapsed,covered:Boolean(known),
    from:new Date(p.start).toISOString(),to:new Date(p.end).toISOString(),
    first_ci_at:known?.first||null,last_ci_at:known?.last||null,
    interval_ms:values,first_ci_url:known?.first_url||null,last_ci_url:known?.last_url||null,
    partial_ci_history:known?.partial??null});
  }
  const reconciled=KEYS.reduce((n,k)=>n+totals[k],0)===overall;
  if(!reconciled)throw Error('COHORT_WALL_CLOCK_NOT_RECONCILED');
  const stage_kpis=Object.fromEntries(KEYS.map(k=>{
   const a=samples[k],n=a.length,mean=n?a.reduce((sum,v)=>sum+v,0)/n:null;
   return [k,{measured_prs:n,cohort_prs:N,coverage_pct:n*100/N,
    mean_measured_min:mean,p50_min:pct(a,.5),p95_min:pct(a,.95),
    contribution_mean_minutes:n?totals[k]/N/MILLIS:null}];
  }));
  const KNOWN=['workflow_wait','runner_wait','checks'],
   UNKNOWN=['before_unknown','ci_wave_unknown','ci_other_unknown','after_unknown','no_archive_unknown'];
  const top=KNOWN.filter(key=>stage_kpis[key].measured_prs>0)
   .map(key=>({stage:key,contribution_mean_minutes:totals[key]/N/MILLIS}))
   .sort((a,b)=>b.contribution_mean_minutes-a.contribution_mean_minutes)[0]||null;
  const unattributed=UNKNOWN.reduce((sum,key)=>sum+totals[key],0)/N/MILLIS;
  const largest_delay={largest_measured_stage:top,unattributed_mean_minutes:unattributed,
   status:top&&top.contribution_mean_minutes>unattributed?
    'LARGEST_VERIFIED_INTERVAL_BOUNDED':'UNATTRIBUTED_TIME_MAY_DOMINATE',
   note:'Самая длинная подтверждённая категория, а не доказанная первопричина.'};
  return {schema:VERSION,period:{from:cohort.from,to:cohort.to},
    N,overall_ms:overall,overall_mean_minutes:overall/N/MILLIS,
    overall_p50_minutes:pct(prs.map(p=>p.elapsed/MILLIS),.5),
    overall_p95_minutes:pct(prs.map(p=>p.elapsed/MILLIS),.95),
    percentile_method:PERCENTILE_METHOD,stage_kpis,largest_delay,
    stage_totals_ms:totals,
    stage_mean_minutes:Object.fromEntries(KEYS.map(k=>[k,
      (counts[k]>0?totals[k]/N/MILLIS:null)])),
    observed_count:counts,
    coverage:{ci_window_prs:covered,no_ci_receipt_prs:missing,
      rejected_ci_rows:invalid,partial_archive_prs:partial,
      history_complete:false,
      denominator:N,
      note:'Сохранённые Core CI timestamps; отсутствие наблюдаемой CI не означает её отсутствия.'},
    total_mean_matches_original:!valid(cohort.mean)||Math.abs(overall/N/MILLIS-cohort.mean)<0.0001,
    reconciled,paths:paths.sort((a,b)=>b.elapsed_ms-a.elapsed_ms)};
 }
 return {VERSION,KEYS,calculate,observed,stamp,valid};
});