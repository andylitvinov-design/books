'use strict';
/**
 * Evidence-constrained stage accounting for previously opaque PR wall-clock gaps.
 * A named observational window is NOT proof of a causal delay. `causal` and
 * `confidence` preserve the distinction between exact CI jobs and time between
 * publicly observed events. GitHub read-only; no network or runner creation.
 */
const REPO='andylitvinov-design/books';
const GOOD_LINK=new RegExp('^https://github\\.com/'+REPO.replace('/','\\/')+'/(?:pull/[0-9]+(?:#[^\\s]*)?|actions/runs/[0-9]+(?:/job/[0-9]+)?|commit/[0-9a-f]{40}|issues/[0-9]+)$','i');
const KINDS=new Set(['pr_ready','triage','repair_claimed','repair_started','source_published',
 'source_commit','head_changed','base_changed','review_requested','review_approved',
 'ci_queued','ci_started','ci_failed','ci_green','ci_completed','merge_gate_green',
 'conflict_started','conflict_resolved','merge_requested','merged','closed_unmerged']);
const SOURCES=new Set(['github_issue_timeline','github_actions_run','github_actions_job','authenticated_stage_receipt']);
const CAUSAL_INTERVALS=new Set(['runner_queue','ci_initial_execution','ci_repeat_execution','source_repair']);
const WINDOW_INTERVALS=new Set(['created_to_first_ci','merge_conflict','green_to_merge','after_failed_ci_unattributed']);
const GAP_CATEGORIES=Object.freeze([
 'before_first_ci_observation','after_source_change_before_ci','post_failed_ci_before_next_event',
 'after_green_ci_before_close','after_review_requested','after_conflict_event',
 'between_checks_and_next_event','after_last_observed_event','no_matching_events',
 'between_lifecycle_events']);
const LABELS=Object.freeze({
 before_first_ci_observation:'До первого подтверждённого CI',
 after_source_change_before_ci:'После изменения HEAD, до следующего события CI',
 post_failed_ci_before_next_event:'После провала CI, до следующего зафиксированного действия',
 after_green_ci_before_close:'После успешного CI, до закрытия или merge',
 after_review_requested:'После запроса review, до следующего события',
 after_conflict_event:'После события о конфликте, до следующего события',
 between_checks_and_next_event:'Между зафиксированными CI-событиями',
 after_last_observed_event:'От последнего подтверждённого события до закрытия',
 no_matching_events:'Нет доступной событийной истории',
 between_lifecycle_events:'Между подтверждёнными событиями PR'
});
const ts=s=>{const d=Date.parse(s||'');return Number.isFinite(d)?d:null;};
const iso=n=>new Date(n).toISOString();
const round=n=>Math.round(n*100)/100;
function validateObservation(o,number,created,closed){
 if(!o||o.pr!==number||!KINDS.has(o.kind)||!SOURCES.has(o.source)||!GOOD_LINK.test(o.url||''))return null;
 const at=ts(o.at);
 if(at===null||at<created||at>closed||(o.head_sha!=null&&!/^[0-9a-f]{40}$/i.test(o.head_sha)))return null;
 return {...o,t:at,at:iso(at),head_sha:o.head_sha||null};
}
function classifyGap({previous,next,firstCi,hasEvents,a,b}){
 // Names describe WHEN a gap occurred. These categories never assert idle time,
 // that a human was actively repairing, or that GitHub runners were queued.
 if(!hasEvents)return 'no_matching_events';
 const pk=previous?.kind;
 if(pk==='ci_failed')return 'post_failed_ci_before_next_event';
 if(pk==='ci_green'||pk==='merge_gate_green')return 'after_green_ci_before_close';
 if(pk==='source_commit'||pk==='head_changed'||pk==='source_published')return 'after_source_change_before_ci';
 if(pk==='review_requested')return 'after_review_requested';
 if(pk==='conflict_started'||pk==='conflict_resolved')return 'after_conflict_event';
 if(pk==='ci_queued'||pk==='ci_started'||pk==='ci_completed')return 'between_checks_and_next_event';
 if(firstCi!==null&&b<=firstCi)return 'before_first_ci_observation';
 if(!next)return 'after_last_observed_event';
 return 'between_lifecycle_events';
}
function explainPrClock({pr,segments,observations=[]}){
 const created=ts(pr?.created_at),closed=ts(pr?.closed_at),number=pr?.number||pr?.pr;
 if(created===null||closed===null||closed<created||!Number.isSafeInteger(number)||number<1||!Array.isArray(segments)||!Array.isArray(observations))throw Error('INVALID_PR_CLOCK_INPUT');
 const events=observations.map(o=>validateObservation(o,number,created,closed)).filter(Boolean);
 // Existing, authenticated interval boundaries are observable milestones too.
 // They cannot imply a green check, a red check, or a source commit by themselves.
 const inferred=[];
 const inferredKind={created_to_first_ci:['pr_ready','ci_queued'],runner_queue:['ci_queued','ci_started'],
  ci_initial_execution:['ci_started','ci_completed'],ci_repeat_execution:['ci_started','ci_completed'],
  green_to_merge:['merge_gate_green','merged'],merge_conflict:['conflict_started','conflict_resolved'],
  source_repair:['repair_started','source_published'],after_failed_ci_unattributed:['ci_failed','ci_queued']};
 for(const s of segments){const pair=inferredKind[s.phase];if(!pair||!GOOD_LINK.test(s.url||''))continue;
  // A derived marker is only as strong as the underlying verified time interval.
  const source= SOURCES.has(s.source)?s.source:'github_actions_run';
  inferred.push({pr:number,kind:pair[0],at:s.start,source,url:s.url,head_sha:s.head_sha||null,derived:true},
    {pr:number,kind:pair[1],at:s.end,source,url:s.url,head_sha:s.head_sha||null,derived:true});
 }
 const got=new Map();for(const e of inferred){const ev=validateObservation(e,number,created,closed);if(ev){const key=ev.kind+':'+ev.at+':'+ev.url;got.set(key,ev);}}
 // Explicit evidence wins over an inferred milestone at the same kind/time/link.
 for(const ev of events){const key=ev.kind+':'+ev.at+':'+ev.url;got.set(key,ev);}
 const milestones=[...got.values()].sort((a,b)=>a.t-b.t||a.kind.localeCompare(b.kind));
 const firstCi=milestones.filter(x=>x.kind==='ci_queued').map(x=>x.t).sort((a,b)=>a-b)[0]??null;
 const bounds=[...new Set([created,closed,...milestones.map(x=>x.t)])].sort((a,b)=>a-b);
 const result=[];
 let exactMs=0,gapMs=0;
 for(const sourceSegment of segments){
  const s=ts(sourceSegment.start),e=ts(sourceSegment.end);
  if(s===null||e===null||s<created||e>closed||s>e)throw Error('INVALID_EXISTING_INTERVAL');
  if(s===e)continue;
  if(CAUSAL_INTERVALS.has(sourceSegment.phase)){
   result.push({...sourceSegment,confidence:'PROVEN_EVENT_INTERVAL',causal:true,minutes:round((e-s)/60000)});
   exactMs+=e-s;continue;
  }
  if(!WINDOW_INTERVALS.has(sourceSegment.phase)&&sourceSegment.phase!=='unknown')throw Error('UNSUPPORTED_OR_UNVERIFIED_PHASE');
  const points=[s,...bounds.filter(t=>t>s&&t<e),e];
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];if(b<=a)continue;
   const preceding=milestones.filter(ev=>ev.t<=a).at(-1)||null;
   const following=milestones.find(ev=>ev.t>=b)||null;
   let cat=classifyGap({previous:preceding,next:following,firstCi,hasEvents:milestones.length>0,a,b});
   if(sourceSegment.phase==='created_to_first_ci'&&!['after_source_change_before_ci','post_failed_ci_before_next_event'].includes(cat))cat='before_first_ci_observation';
   if(sourceSegment.phase==='merge_conflict')cat='after_conflict_event';
   if(sourceSegment.phase==='green_to_merge')cat='after_green_ci_before_close';
   if(sourceSegment.phase==='after_failed_ci_unattributed')cat='post_failed_ci_before_next_event';
   // Creating the PR is observed; absence of any other event isn't evidence of idleness.
   const previousAnchor=preceding?{kind:preceding.kind,at:preceding.at,url:preceding.url}:{kind:'pr_created',at:iso(created),url:`https://github.com/${REPO}/pull/${number}`};
   const nextAnchor=following?{kind:following.kind,at:following.at,url:following.url}:{kind:'pr_closed',at:iso(closed),url:`https://github.com/${REPO}/pull/${number}`};
   result.push({phase:cat,category:'OBSERVED_GAP_NOT_CAUSAL',start:iso(a),end:iso(b),
    minutes:round((b-a)/60000),confidence:'EVENT_BOUNDARIES_ONLY',causal:false,
    source:sourceSegment.source||null,url:sourceSegment.url||previousAnchor.url,from_event:previousAnchor,to_event:nextAnchor,
    reason:`${LABELS[cat]}; причина задержки не подтверждена`});
   gapMs+=b-a;
  }
 }
 const ordered=result.sort((a,b)=>ts(a.start)-ts(b.start)||ts(a.end)-ts(b.end));
 if(ordered.length){if(ts(ordered[0].start)!==created||ts(ordered.at(-1).end)!==closed)throw Error('PR_TRACE_PARTITION_GAPS');for(let i=1;i<ordered.length;i++){const last=ts(ordered[i-1].end),next=ts(ordered[i].start);if(last>next)throw Error('PR_TRACE_PARTITION_OVERLAP');if(last<next)throw Error('PR_TRACE_PARTITION_GAPS');}}
 if(exactMs+gapMs!==closed-created)throw Error('PR_TRACE_DURATION_MISMATCH');
 const groups=Object.fromEntries(GAP_CATEGORIES.map(k=>[k,0]));for(const seg of ordered)if(seg.causal===false)groups[seg.phase]+=(ts(seg.end)-ts(seg.start));
 return {segments:ordered,observations:milestones.map(({t,...ev})=>ev),
  explanation_minutes:round((exactMs+gapMs)/60000),verified_cause_minutes:round(exactMs/60000),
  context_gap_minutes:round(gapMs/60000),known_cause_pct:closed>created?round(exactMs*100/(closed-created)):100,
  observed_gap_categories:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,round(v/60000)]))};
}
module.exports={explainPrClock,GAP_CATEGORIES,LABELS,validateObservation};