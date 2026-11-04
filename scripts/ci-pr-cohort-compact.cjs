'use strict';
/** Compact public issue drilldown; full, immutable per-PR data remain in the artifact. */
const {REPO,PHASES,renderMarkdown}=require('./ci-pr-three-cohorts.cjs');
const ISSUE='https://github.com/'+REPO+'/issues/3394';
function renderCompact(report,{runId,maxPerStage=6}={}){
 if(report?.schema!=='HH_PR_THREE_COHORTS_V1'||!Number.isSafeInteger(runId)||runId<1||
   !Number.isSafeInteger(maxPerStage)||maxPerStage<1||maxPerStage>12)throw Error('INVALID_COMPACT_COHORT_INPUT');
 const full=renderMarkdown(report),cut=full.indexOf('## Evidence drill-down');
 if(cut<0)throw Error('MISSING_COHORT_SUMMARY');
 const out=[full.slice(0,cut).trimEnd(),'','## Evidence drill-down: stage → exact PR evidence',
  'Open a stage to see the corresponding PRs, UTC timestamps, event URLs, and verified time. A stage with no source evidence is not zero minutes.',
  'The full 302-PR (142 + 74 + 86) event history is in the linked workflow artifact; this page shows the top examples without truncating all drilldowns.',''];
 const clean=v=>String(v??'').replace(/[|\r\n<>]/g,' ').slice(0,140);
 for(const window of report.windows){
  out.push('### '+clean(window.label));
  for(const phase of PHASES){
   const rows=(window.rows||[]).filter(r=>Number.isFinite(r.phases?.[phase])&&r.phases[phase]>0)
    .sort((a,b)=>b.phases[phase]-a.phases[phase]||a.pr-b.pr);
   if(phase==='unknown' && rows.length===0)continue;
   out.push('',`<details><summary>${clean(phase.replaceAll('_',' '))}: ${rows.length} PR${rows.length>maxPerStage?' (top '+maxPerStage+')':''}</summary>`);
   if(!rows.length)out.push('No attributable source event. This is missing coverage, not 0 minutes.');
   else{
    out.push('','| PR | Time (min) | UTC evidence interval | Event and reason |','|---|---:|---|---|');
    for(const row of rows.slice(0,maxPerStage)){
     // The stage total may span multiple disjoint intervals. Never print its
     // sum beside only the last interval (that makes genuine evidence seem false).
     // Preserve the full evidence in the workflow artifact; cap UI slices here.
     const segments=(row.segments||[]).filter(s=>s.phase===phase)
       .sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
     const shown=segments.slice(0,3);
     const intervals=shown.map(s=>`${clean(s.start)} → ${clean(s.end)} (≈${Math.round((Date.parse(s.end)-Date.parse(s.start))/600)/100} min)`).join(' ; ');
     const omitted=segments.length-shown.length;
     const time=segments.length?intervals+(omitted?` ; +${omitted} more in artifact`:''):'No confirmed event';
     const evidence=[...new Set(shown.map(s=>s.url?`[GitHub](${s.url})`:'[PR]('+row.url+')'))].join(' ');
     const reason=segments.length>1?`Total across ${segments.length} disjoint intervals (rounded)`:
       clean(segments[0]?.reason|| (phase==='unknown'?'No attributable event':'Verified interval'));
     out.push(`| [#${row.pr}](${row.url}) | ${row.phases[phase]} | ${time} | ${evidence||'[PR]('+row.url+')'} · ${reason} |`);
    }
   }
   out.push('','</details>');
  }
 }
 out.push('','## Longest eight — latest cohort (creation → closure)','');
 for(const row of report.windows[report.windows.length-1].rows.slice(0,8)){
  out.push(`<details><summary>#${row.pr}: ${row.full_minutes} min · ${clean(row.outcome)} · ${clean(row.base)}</summary>`,'',
   `[PR #${row.pr}](${row.url}) · Created ${clean(row.created_at)} · Closed ${clean(row.closed_at)}`);
  const evidence=(row.segments||[]).filter(s=>s.url).slice(0,10);
  if(evidence.length){out.push('','| Stage | UTC start | UTC end | SHA | Event and reason |','|---|---|---|---|---|');
   for(const s of evidence)out.push(`| ${clean(s.phase)} | ${clean(s.start)} | ${clean(s.end)} | ${clean(s.head_sha?.slice(0,12)||'—')} | [GitHub](${s.url}) · ${clean(s.reason)} |`);
  }else out.push('','No verified interval; whole life is explicitly unknown.');
  if(row.delivery_chain)out.push('',`Replacement chain: ${row.delivery_chain.prs.map(n=>'[#'+n+'](https://github.com/'+REPO+'/pull/'+n+')').join(' → ')} · ${clean(row.delivery_chain.status)}. A production merge is **not** Vercel LIVE.`);
  out.push('','</details>');
 }
 out.push('','## Open PR backlog — separate from closed cohorts',
  `Open PRs counted: ${report.open_backlog?.total ?? 'unverified'}. Historical age is measured at the end of the last window, not current API time.`);
 for(const row of (report.open_backlog?.rows||[]).slice(0,6))out.push(`- [#${row.pr}](${row.url}): ${row.age_minutes} min open at cohort end; ${clean(row.base)}`);
 const runUrl=`https://github.com/${REPO}/actions/runs/${runId}`;
 out.push('','**Complete 3-cohort PR timeline:** [GitHub Actions evidence artifact]('+runUrl+') (pr-three-cohort-evidence, 30-day retention).',
  '**Standing report:** '+ISSUE+'.','Historical CI intervals without evidence are unallocated, never silently counted as runner wait or repairs.','');
 const body=out.join('\n');if(body.length>60000)throw Error('COMPACT_COHORT_TOO_LONG');return body;
}
module.exports={renderCompact};