'use strict';
// HH_PR_TIMESTAMP_INVENTORY_V1 — reuses Watchdog's already-fetched full PR list.
// Exact GitHub created/updated timestamps are distinct from first OBSERVED status.
// This neither claims historical stage times nor changes any PR/CI.
const VERSION='HH_PR_TIMESTAMP_INVENTORY_V1';
const PROD='codex/public-book-library',SHA=/^[a-f0-9]{40}$/i;
const FLAGS=Object.freeze({
 draft:1,ready:2,triage:4,claimed:8,repair_hint:16,ci_hint:32,
 gate_hint:64,conflict_hint:128,manual_hint:256,hold_hint:512
});
const OBSERVED=Object.freeze(['ready','triage','claimed','repair_hint','ci_hint','gate_hint',
 'conflict_hint','manual_hint','hold_hint']);
const validSec=v=>Number.isSafeInteger(v)&&v>0&&v<10000000000;
function sec(value){
 const n=Date.parse(value||'');
 return Number.isFinite(n)?Math.floor(n/1000):null;
}
function assertInput(prs,at){
 if(!Array.isArray(prs)||prs.length<1||prs.length>350||!validSec(at))throw Error('TIMESTAMP_INVENTORY_INCOMPLETE');
 const seen=new Set();
 for(const p of prs){
  if(!Number.isSafeInteger(p?.number)||p.number<1||seen.has(p.number)||
    p.state!=='open'||!SHA.test(p.head?.sha||'')||
    typeof p.base?.ref!=='string'||!p.base.ref||
    p.draft!==true&&p.draft!==false||
    !validSec(sec(p.created_at))||!validSec(sec(p.updated_at))||
    sec(p.created_at)>sec(p.updated_at)||sec(p.updated_at)>at+180||
    !Array.isArray(p.labels))throw Error('PR_METADATA_UNVERIFIED');
  seen.add(p.number);
 }
}
function rows(snap){
 if(!snap||snap.schema!==VERSION||typeof snap.records!=='string'||snap.records.length>100000||
    !validSec(sec(snap.observed_at)))return new Map();
 let list;try{list=JSON.parse(snap.records);}catch{return new Map();}
 if(!Array.isArray(list)||list.length>350||snap.total!==list.length)return new Map();
 const out=new Map();
 for(const r of list){
  if(!Array.isArray(r)||r.length!==16||!Number.isSafeInteger(r[0])||r[0]<1||
    out.has(r[0])||!SHA.test(r[1]||'')||![0,1].includes(r[2])||
    !validSec(r[3])||!validSec(r[4])||!validSec(r[5])||
    !Number.isSafeInteger(r[6])||r[6]<0||r[6]>1023||
    r.slice(7).some(x=>x!==0&&!validSec(x)))return new Map();
  out.set(r[0],r);
 }
 return out;
}
function flags(pr){
 const labels=new Set(pr.labels.map(l=>l?.name).filter(x=>typeof x==='string'));
 let mask=pr.draft?FLAGS.draft:FLAGS.ready;
 if(labels.has('hh:merge-stage:inspect'))mask|=FLAGS.triage;
 if(labels.has('hh:worker-claimed'))mask|=FLAGS.claimed;
 if(labels.has('hh:repair-needed')||labels.has('hh:specialist-repair-needed'))mask|=FLAGS.repair_hint;
 if(labels.has('hh:ci-needed'))mask|=FLAGS.ci_hint;
 if(labels.has('hh:release-gate-review')||labels.has('hh:merge-stage:armed'))mask|=FLAGS.gate_hint;
 if(labels.has('hh:conflict-repair-needed'))mask|=FLAGS.conflict_hint;
 if(labels.has('hh:repair-manual')||labels.has('hh:merge-stage:manual'))mask|=FLAGS.manual_hint;
 if(labels.has('hh:hold'))mask|=FLAGS.hold_hint;
 return mask;
}
function capture({prs,observedAt,previous=null,productionExpected=null,totalExpected=null}){
 const at=sec(observedAt);assertInput(prs,at);
 if(totalExpected!==null&&totalExpected!==prs.length)throw Error('PR_COUNT_DRIFT');
 const nprod=prs.filter(p=>p.base.ref===PROD).length;
 if(productionExpected!==null&&nprod!==productionExpected)throw Error('PRODUCTION_PR_COUNT_DRIFT');
 const prior=rows(previous),older=previous?sec(previous.observed_at):null;
 if(older!==null&&at<older)throw Error('STALE_TIMESTAMP_SNAPSHOT');
 const counts={total:prs.length,production:nprod,other_base:prs.length-nprod,
  created_exact:prs.length,updated_exact:prs.length,head_exact:prs.length,
  current_head_first_seen:prs.length,draft:0,ready:0,head_changed:0};
 for(const kind of OBSERVED){counts[kind+'_now']=0;counts[kind+'_ever_observed_on_head']=0;}
 const data=[];
 for(const p of [...prs].sort((a,b)=>a.number-b.number)){
  const old=prior.get(p.number),same=old&&old[1].toLowerCase()===p.head.sha.toLowerCase();
  const mask=flags(p),firstSeen=same?old[5]:at;
  if(old&&!same)counts.head_changed++;
  if(p.draft)counts.draft++;else counts.ready++;
  const first=[];
  OBSERVED.forEach((key,j)=>{
   const has=(mask&FLAGS[key])!==0,was=same?old[j+7]:0;
   first.push(was||(has?at:0));
   if(has)counts[key+'_now']++;
   if(was||has)counts[key+'_ever_observed_on_head']++;
  });
  data.push([p.number,p.head.sha,p.base.ref===PROD?1:0,
   sec(p.created_at),sec(p.updated_at),firstSeen,mask,...first]);
 }
 const result={schema:VERSION,scope:'ALL_OPEN_PRS',observed_at:new Date(at*1000).toISOString(),
  total:prs.length,production:nprod,counts,
  event_time_coverage:'NOT_ASSESSED_FROM_PR_LIST',
  stage_clock_kind:'FIRST_SEEN_IN_EXISTING_WATCHDOG_SCAN_NOT_ACTUAL_TRANSITION_TIME',
  exact_fields:['github_pr_created_at','github_pr_updated_at','head_sha'],
  missing_fields_need_native_events:['ready_for_review_at','triage_at','claim_at',
   'repair_started_at','source_published_at','ci_queued_at','runner_started_at',
   'ci_completed_at','gate_green_at','merged_at','live_verified_at'],
  rows_format:'[pr,head_sha,is_production,created_sec,updated_sec,current_head_first_seen_sec,current_flags,ready_first_seen_sec,triage_first_seen_sec,claimed_first_seen_sec,repair_hint_first_seen_sec,ci_hint_first_seen_sec,gate_hint_first_seen_sec,conflict_hint_first_seen_sec,manual_hint_first_seen_sec,hold_hint_first_seen_sec]',
  records:JSON.stringify(data)};
 if(rows(result).size!==data.length)throw Error('TIMESTAMP_RECORDS_NOT_RECONCILED');
 return result;
}
function decode(record){
 if(!Array.isArray(record)||record.length!==16)return null;
 const date=t=>validSec(t)?new Date(t*1000).toISOString():null;
 return {number:record[0],head_sha:record[1],production:record[2]===1,
  created_at:date(record[3]),updated_at:date(record[4]),
  current_head_first_observed_at:date(record[5]),current_state_flags:record[6],
  first_observed_at:Object.fromEntries(OBSERVED.map((k,i)=>[k,date(record[i+7])]))};
}
module.exports={VERSION,PROD,FLAGS,OBSERVED,capture,decode,rows,flags};
