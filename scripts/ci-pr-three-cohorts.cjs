'use strict';
/** Read-only, event-sourced PR cohort accounting. No inference of idle/runner/repair time. */
const REPO='andylitvinov-design/books';
const {explainPrClock,GAP_CATEGORIES,LABELS}=require('./ci-pr-gap-attribution.cjs');
const WINDOWS=[
  {key:'two_weeks',label:'20–21 Oct 2026',start:'2026-10-20T11:27:00.000Z',end:'2026-10-21T11:27:00.000Z'},
  {key:'one_week',label:'27–28 Oct 2026',start:'2026-10-27T11:27:00.000Z',end:'2026-10-28T11:27:00.000Z'},
  {key:'latest',label:'3–4 Nov 2026',start:'2026-11-03T12:27:00.000Z',end:'2026-11-04T12:27:00.000Z'}
];
const PHASES=['created_to_first_ci','runner_queue','ci_initial_execution','source_repair','merge_conflict','ci_repeat_execution','green_to_merge','after_failed_ci_unattributed','unknown'];
const KNOWN=new Set(PHASES.filter(x=>x!=='unknown'));
const SOURCES=new Set(['github_pr','github_actions_run','github_actions_job','github_issue_timeline','authenticated_stage_receipt']);
const RX=/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+|actions\/runs\/\d+(?:\/job\/\d+)?|commit\/[a-f0-9]{40}|issues\/\d+)(?:[#?][^\s]*)?$/i;
const instant=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:null;};
const minutes=x=>Math.round(x/600)/100;
const round=x=>Math.round(x*100)/100;
function stats(values){const a=values.filter(x=>Number.isFinite(x)).sort((x,y)=>x-y),n=a.length;if(!n)return{n:0,average_min:null,median_min:null,p90_min:null};const q=p=>round(a[Math.floor((n-1)*p)]); /* owner's established lower-order quantile */return{n,average_min:round(a.reduce((s,x)=>s+x,0)/n),median_min:q(.5),p90_min:q(.9)};}
function validatedPR(p){
 if(!Number.isSafeInteger(p?.number)||p.number<1)throw Error('INVALID_PR_NUMBER');
 const created=instant(p.created_at),closed=instant(p.closed_at),merged=p.merged_at==null?null:instant(p.merged_at);
 if(created===null||p.closed_at!=null&&closed===null||p.merged_at!=null&&merged===null||
    closed!==null&&closed<created||merged!==null&&(closed===null||merged<created||merged>closed+60000))throw Error('INVALID_PR_TIMESTAMPS_'+p.number);
 return {created,closed,merged};
}
function classify(p){
 if(p.merged_at!=null)return 'merged';
 const e=p.replacement;
 // Never infer replacement from a similar title or a label alone.
 return Number.isSafeInteger(e?.pr)&&e.pr>0&&e.pr!==p.number&&
  SOURCES.has(e.source)&&RX.test(e.url||'')&&e.url.includes('/pull/'+e.pr)
  ?'replaced':'closed_without_merge';
}
function verifiedInterval(interval,number,created,closed){
 if(interval?.pr!==number||!KNOWN.has(interval.phase)||!SOURCES.has(interval.source)||
    !RX.test(interval.url||''))return null;
 const start=instant(interval.start),end=instant(interval.end);
 if(start===null||end===null||start>end||start<created||end>closed||
    interval.head_sha!=null&&!/^[a-f0-9]{40}$/i.test(interval.head_sha))return null;
 if(interval.phase==='created_to_first_ci'&&interval.inventory_complete!==true)return null;
 if(interval.phase==='source_repair'&&interval.source!=='authenticated_stage_receipt')return null;
 if(interval.phase==='merge_conflict'&&interval.source!=='github_issue_timeline')return null;
 if(interval.phase==='green_to_merge'&&interval.green_verified!==true)return null;
 return{phase:interval.phase,start,end,url:interval.url,reason:typeof interval.reason==='string'?interval.reason.slice(0,100):null,source:interval.source,head_sha:interval.head_sha||null};
}
// One wall-clock instant has at most one owner. Running checks outrank queue,
// repair receipts outrank unknown spans, and redundant jobs never sum twice.
const PRIORITY=['source_repair','merge_conflict','ci_repeat_execution','ci_initial_execution','runner_queue','green_to_merge','created_to_first_ci','after_failed_ci_unattributed'];
function splitIntervals(p,intervals){
 const {created,closed}=validatedPR(p);
 if(closed===null)return null;
 const accepted=intervals.map(i=>verifiedInterval(i,p.number,created,closed)).filter(Boolean);
 const bounds=[...new Set([created,closed,...accepted.flatMap(i=>[i.start,i.end])])].sort((a,b)=>a-b);
 const totals=Object.fromEntries(PHASES.map(k=>[k,0]));const segments=[];
 for(let j=1;j<bounds.length;j++){
  const a=bounds[j-1],b=bounds[j];if(b===a)continue;
  const active=accepted.filter(i=>i.start<=a&&i.end>=b);
  const selected=active.sort((x,y)=>PRIORITY.indexOf(x.phase)-PRIORITY.indexOf(y.phase))[0];
  const phase=selected?.phase||'unknown';totals[phase]+=(b-a);
  const prior=segments[segments.length-1];
  if(prior?.phase===phase&&prior?.url===(selected?.url||null))prior.end=new Date(b).toISOString();
  else segments.push({phase,start:new Date(a).toISOString(),end:new Date(b).toISOString(),
    url:selected?.url||null,source:selected?.source||null,reason:selected?.reason||null,head_sha:selected?.head_sha||null});
 }
 const result=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,minutes(v)]));
 const elapsed=closed-created,partition=Object.values(totals).reduce((s,v)=>s+v,0);
 if(partition!==elapsed)throw Error('COHORT_WALL_CLOCK_NOT_RECONCILED');
 return{minutes:result,segments,known_minutes:minutes(elapsed-totals.unknown),coverage_percent:elapsed?round((elapsed-totals.unknown)*100/elapsed):100};
}
function analyze({prs,intervals=[],windows=WINDOWS,openPRs=[],observations=[],source={}}){
 if(!Array.isArray(prs)||!Array.isArray(intervals)||!Array.isArray(openPRs)||!Array.isArray(windows)||!Array.isArray(observations))throw Error('INVALID_COHORT_INPUT');
 const obsByPr=new Map();for(const observation of observations){if(Number.isSafeInteger(observation?.pr)){if(!obsByPr.has(observation.pr))obsByPr.set(observation.pr,[]);obsByPr.get(observation.pr).push(observation);}}
 const seen=new Set();for(const p of prs){validatedPR(p);if(seen.has(p.number))throw Error('DUPLICATE_PR_'+p.number);seen.add(p.number);}
 const analyses=[];
 for(const w of windows){const start=instant(w.start),end=instant(w.end);if(start===null||end===null||end-start!==86400000)throw Error('INVALID_COHORT_WINDOW');
  const members=prs.filter(p=>{const t=validatedPR(p);return t.created>=start&&t.created<end&&t.closed!==null&&t.closed>=start&&t.closed<end;});
  const rows=members.map(p=>{
   const t=validatedPR(p),part=splitIntervals(p,intervals.filter(i=>i.pr===p.number));
   // No association means unknown waves, never evidence of zero CI.
   const wave=source?.core_waves_by_pr?.[p.number];
   const coreWaves=Number.isSafeInteger(wave?.count)&&wave.count>0?wave.count:null;
   const explanation=explainPrClock({pr:p,segments:part.segments,observations:obsByPr.get(p.number)||[]});
   return{pr:p.number,url:`https://github.com/${REPO}/pull/${p.number}`,title:p.title||'',base:p.base?.ref||null,
    created_at:p.created_at,closed_at:p.closed_at,merged_at:p.merged_at||null,
    outcome:classify(p),replacement:p.replacement||null,delivery_chain:p.delivery_chain||null,full_minutes:minutes(t.closed-t.created),
    phases:part.minutes,segments:part.segments,known_pct:part.coverage_percent,
    context_segments:explanation.segments,observations:explanation.observations,
    observed_gap_minutes:explanation.context_gap_minutes,
    direct_verified_minutes:explanation.verified_cause_minutes,
    gap_categories:explanation.observed_gap_categories,root_cause_coverage_pct:explanation.known_cause_pct,
    evidence_count:part.segments.filter(s=>s.url).length,
    core_ci_waves:coreWaves,core_ci_repeats:coreWaves===null?null:coreWaves-1,
    first_core_at:coreWaves===null?null:wave.first_at,
    last_core_at:coreWaves===null?null:wave.last_at};
  }).sort((a,b)=>b.full_minutes-a.full_minutes||a.pr-b.pr);
  const totals=stats(rows.map(x=>x.full_minutes));
  const observedWaves=rows.filter(x=>x.core_ci_waves!==null);
  const ciWaves={...stats(observedWaves.map(x=>x.core_ci_waves)),
   observed_prs:observedWaves.length,cohort_prs:rows.length,
   coverage_pct:rows.length?round(100*observedWaves.length/rows.length):null,
   repeat_prs:observedWaves.filter(x=>x.core_ci_repeats>0).length,
   complete_run_inventory:source?.ci_runs_complete?.[w.key]===true};
  const outcomes=Object.fromEntries(['merged','replaced','closed_without_merge'].map(k=>[k,rows.filter(r=>r.outcome===k).length]));
  const phases={};for(const stage of PHASES){const covered=rows.filter(x=>stage==='unknown'||x.phases[stage]>0),summary=stats(covered.map(x=>x.phases[stage]));phases[stage]={...summary,covered_prs:covered.length,
    coverage_pct:rows.length?round(100*covered.length/rows.length):null,
    contribution_to_cohort_mean:rows.length&&(covered.length||stage==='unknown')?round(rows.reduce((s,x)=>s+x.phases[stage],0)/rows.length):null};}
  const gap_phases={};for(const name of GAP_CATEGORIES){const measured=rows.filter(r=>r.gap_categories[name]>0);
   const s=stats(measured.map(r=>r.gap_categories[name]));gap_phases[name]={...s,
    contribution_to_cohort_mean:rows.length?round(rows.reduce((sum,r)=>sum+r.gap_categories[name],0)/rows.length):null,
    coverage_pct:rows.length?round(measured.length*100/rows.length):null,covered_prs:measured.length};}
  analyses.push({key:w.key,label:w.label,window_start:w.start,window_end:w.end,count:rows.length,outcomes,
   gap_phases,mean_context_gap_minutes:rows.length?round(rows.reduce((sum,r)=>sum+r.observed_gap_minutes,0)/rows.length):null,
   mean_direct_verified_minutes:rows.length?round(rows.reduce((sum,r)=>sum+r.direct_verified_minutes,0)/rows.length):null,
   total:totals,phases,rows,ci_waves:ciWaves,
   chain_delivery:{replaced_chains:rows.filter(r=>r.outcome==='replaced').length,
    confirmed_production_merges:rows.filter(r=>r.delivery_chain?.status==='PRODUCTION_MERGE_CONFIRMED_NOT_LIVE').length,
    time_to_production_merge:stats(rows.map(r=>r.delivery_chain?.minutes_to_production_merge).filter(Number.isFinite))},
   known_phase_prs:rows.filter(r=>r.known_pct>0).length,
   missing_details:rows.filter(r=>r.known_pct<100).length});
 }
 const latestEnd=instant(windows[windows.length-1]?.end);
 const open=openPRs.filter(p=>{const t=validatedPR(p);return t.closed===null&&t.created<=latestEnd;}).map(p=>({
  pr:p.number,url:`https://github.com/${REPO}/pull/${p.number}`,created_at:p.created_at,
  age_minutes:minutes(latestEnd-instant(p.created_at)),base:p.base?.ref||null,
  state:Array.isArray(p.labels)?p.labels.map(l=>typeof l==='string'?l:l.name).filter(x=>typeof x==='string'&&/^hh:/.test(x)):[]
 })).sort((a,b)=>b.age_minutes-a.age_minutes);
 return{schema:'HH_PR_THREE_COHORTS_V1',timezone:'America/Toronto',definition:'created_at and closed_at both within exact local 07:27–07:27 window',quantile_method:'LOWER_ORDER_STATISTIC',
  source,windows:analyses,open_backlog:{total:open.length,rows:open},limitations:[
   'Only independently evidenced intervals are assigned to a named stage; the rest is unknown, not idle time.',
   'Intervals from concurrent Actions jobs are unioned, not summed. Runner minutes are separate from PR wall-clock.',
   'PRs created within the window but still open are excluded from closed cohorts and reported in backlog.',
   'Closed without merge is separate from merged; replacement requires an explicit same-repository link.',
   'Evidence collection may be partial when the API quota, job history, or issue timeline is incomplete.',
   'Replacement delivery chain is independently reported only to a proven production MERGE, never described as Vercel LIVE.']};
}
function renderMarkdown(result){
 if(result?.schema!=='HH_PR_THREE_COHORTS_V1')throw Error('INVALID_COHORT_REPORT');
 const line=['<!-- HH_PR_THREE_COHORTS_V1 -->','# Three 24-hour PR cohorts · Toronto 07:27 → 07:27',''];
 const w=result.windows;
 line.push('**Coverage:** '+(result.source?.coverage||'PARTIAL_UNVERIFIED')+' · Read budget: '+(result.source?.reads??'?')+' · '+(result.source?.checked_at||'not checked'),
  '**API limitation:** '+String(result.source?.reason||'none')+' · CI inventory errors: '+JSON.stringify(result.source?.ci_runs_errors||{}),
  '**Quantiles:** lower order statistic (the same method as the original cohort comparison).','',
 '| Measure | '+w.map(x=>x.label).join(' | ')+' |','|---|'+w.map(()=>'---:').join('|')+'|');
 const compare=(name,fn)=>line.push('| '+name+' | '+w.map(x=>fn(x)).join(' | ')+' |');
 const fmt=x=>x===null||x===undefined?'—':String(x);
 compare('Created & closed',x=>x.count);compare('Merged',x=>x.outcomes.merged);compare('Closed, replaced',x=>x.outcomes.replaced);
 compare('Closed without merge, other',x=>x.outcomes.closed_without_merge);
 compare('Replacement chains with verified production merge (not LIVE)',x=>x.chain_delivery.confirmed_production_merges);
   compare('Replacement chain time to production merge, min',x=>fmt(x.chain_delivery.time_to_production_merge.average_min));
   compare('Average, min',x=>fmt(x.total.average_min));compare('Median, min',x=>fmt(x.total.median_min));compare('P90, min',x=>fmt(x.total.p90_min));
 compare('Observed Core CI waves: PRs / total',x=>x.ci_waves.observed_prs+' / '+x.ci_waves.cohort_prs);
 compare('Core CI wave count: median (attributed only)',x=>fmt(x.ci_waves.median_min));
 compare('Core CI repeated: linked PRs',x=>x.ci_waves.repeat_prs);
 compare('Core run inventory verified complete',x=>x.ci_waves.complete_run_inventory?'YES':'NO / PARTIAL');
 compare('Direct job / repair measured time (mean), min',x=>fmt(x.mean_direct_verified_minutes));
 compare('Observed-context intervals, causality unverified (mean), min',x=>fmt(x.mean_context_gap_minutes));
 line.push('','**Stages:** cohort-mean contribution; then mean / median / P90 among measured PRs; then % of PRs with evidence. A dash means unmeasured (not zero). Unknown is explicit.','',
 '| Stage | '+w.map(x=>x.label).join(' | ')+' |','|---|'+w.map(()=>'---:').join('|')+'|');
 for(const phase of PHASES.filter(p=>p!=='unknown')){line.push('| '+phase.replaceAll('_',' ')+' | '+w.map(x=>{const s=x.phases[phase];return fmt(s.contribution_to_cohort_mean)+'; '+fmt(s.average_min)+' / '+fmt(s.median_min)+' / '+fmt(s.p90_min)+'; '+fmt(s.coverage_pct)+'%';}).join(' | ')+' |');}
 line.push('','## Наблюдаемые интервалы между событиями (НЕ подтверждение причины)',
  'Эти интервалы закрывают промежутки исходного `unknown`: каждая минута имеет начало, конец и ближайшее подтверждённое событие. Название сообщает, **между какими событиями** прошло время, а не чем занимался исполнитель. Отсутствие событий остаётся отдельной категорией.',
  '| Observed context | '+w.map(x=>x.label).join(' | ')+' |','|---|'+w.map(()=>'---:').join('|')+'|');
 for(const category of GAP_CATEGORIES)line.push('| '+LABELS[category]+' | '+w.map(x=>{const s=x.gap_phases[category];return fmt(s.contribution_to_cohort_mean)+' min; '+fmt(s.coverage_pct)+'% PR';}).join(' | ')+' |');
 line.push('','## Evidence drill-down');
 for(const x of w){line.push('',`<details><summary>${x.label}: ${x.count} completed PRs, ${x.known_phase_prs} with ≥1 attributed stage</summary>`,'',
 '| PR | Base | Outcome | Full, min | Core waves | Attributed % | Evidence |','|---|---|---|---:|---:|---:|---|');
  for(const row of x.rows){const known=row.segments.filter(s=>s.url);let links=known.slice(0,3).map(s=>'[event]('+s.url+')').join(' ');
   if(row.delivery_chain){links+=' · Chain '+row.delivery_chain.prs.map(n=>'[#'+n+'](https://github.com/'+REPO+'/pull/'+n+')').join(' → ');
    links+=' ('+row.delivery_chain.status+')';}
   if(!links)links='Not recovered';line.push(`| [#${row.pr}](${row.url}) | ${String(row.base||'—').replaceAll('|','/')} | ${row.outcome} | ${row.full_minutes} | ${row.core_ci_waves??'—'} | ${row.known_pct}% | ${links} |`);}
  line.push('','</details>');
 }
 line.push('','## Longest eight · latest cohort');
 for(const r of (w[w.length-1]?.rows||[]).slice(0,8)){
  line.push('',`<details><summary>#${r.pr} · ${r.full_minutes} min · ${r.outcome} · ${r.base||'unknown base'}</summary>`,'',
   `Created: ${r.created_at}; closed: ${r.closed_at}.`,'',
   '| Stage | From | To | Minutes | SHA | Evidence / reason |','|---|---|---|---:|---|---|');
  for(const s of r.context_segments||r.segments){const d=minutes(instant(s.end)-instant(s.start));const linked=s.url?'[GitHub]('+s.url+')':'';const next=s.to_event?.url?' → [Next event]('+s.to_event.url+')':'';line.push(`| ${s.phase} | ${s.start} | ${s.end} | ${d} | ${s.head_sha?s.head_sha.slice(0,12):'—'} | ${linked}${next} ${s.reason||''}${s.causal===false?' (context, cause unverified)':''} |`);}
  line.push('','</details>');
 }
 line.push('','## Open PR backlog (not in closed cohorts)',`Count observed: ${result.open_backlog.total}.`,
  'This is independent of completion-time metrics; an incomplete open inventory must not be treated as zero.','',
  '## Evidence limitations',...result.limitations.map(s=>'- '+s),'');
 return line.join('\n');
}
module.exports={REPO,WINDOWS,PHASES,GAP_CATEGORIES,stats,splitIntervals,analyze,renderMarkdown,classify};