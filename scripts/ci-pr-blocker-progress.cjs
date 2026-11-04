'use strict';
// P0 exact-HEAD blocker progress, derived exclusively from the already-read
// Watchdog deep sample and optional full PR inventory. No API, jobs or timers.
const SCHEMA='HH_P0_BLOCKER_PROGRESS_V1';
const ROOTS=new Set(['MERGE_CONFLICT','CORE_REQUIRED_CHECK_FAILED',
  'SPECIALIST_PRODUCT_FAILURE','SPECIALIST_POLICY_HOLD']);
const SHA=/^[a-f0-9]{40}$/i;
const MAX=16;
const PR_URL='https://github.com/andylitvinov-design/books/pull/';
const RUN_URL='https://github.com/andylitvinov-design/books/actions/runs/';
const PROCESS={
 MERGE_CONFLICT:':45 Conflict',
 CORE_REQUIRED_CHECK_FAILED:':05 Shared / Core',
 SPECIALIST_PRODUCT_FAILURE:':35 Product / Browser',
 SPECIALIST_POLICY_HOLD:':30 Native / CI policy'
};
function validCase(row){
 return !!(row&&Number.isSafeInteger(row.pr_number)&&row.pr_number>0&&
  SHA.test(row.head_sha||'')&&ROOTS.has(row.root_code)&&
  ['FAILURE','TIMEOUT','UNKNOWN'].includes(row.ci_result)&&
  (row.source_run_id==null||
    Number.isSafeInteger(row.source_run_id)&&row.source_run_id>0));
}
function key(row){return row.pr_number+':'+row.root_code;}
function prIndex(inventory){
 if(!Array.isArray(inventory))return null;
 const index=new Map();
 for(const pr of inventory){
  if(!Number.isSafeInteger(pr?.number)||pr.number<1)continue;
  const head=pr?.head?.sha;
  if(SHA.test(head||'')&&pr.base?.ref==='codex/public-book-library')
   index.set(pr.number,pr);
 }
 return index;
}
function owner(pr){
 // Labels, author, automatic owner lanes and unverified lease claims are not
 // an actual named assignee. Do not invent a person from them.
 const logins=new Set((Array.isArray(pr?.assignees)?pr.assignees:[])
  .map(x=>x?.login).filter(x=>typeof x==='string'&&
    /^[A-Za-z0-9-]{1,39}$/.test(x)));
 if(pr?.assignee?.login&&/^[A-Za-z0-9-]{1,39}$/.test(pr.assignee.login))
  logins.add(pr.assignee.login);
 return [...logins].sort();
}
function asPrevious(x){
 if(!x||x.schema!==SCHEMA||!Array.isArray(x.cases))return [];
 return x.cases.slice(0,MAX).filter(c=>
  Number.isSafeInteger(c?.pr_number)&&c.pr_number>0&&
  SHA.test(c?.head_sha||'')&&ROOTS.has(c.root_code));
}
function reconcileBlockerProgress({previous=null,watchdogSample=null,
 inventorySnapshot=null,observedAt}={}){
 if(!Number.isFinite(Date.parse(observedAt||'')))throw Error('INVALID_BLOCKER_PROGRESS_TIME');
 const source=watchdogSample?.blocker_cases;
 if(source!==undefined&&(!Array.isArray(source)||source.length>MAX||
    source.some(row=>!validCase(row))))throw Error('INVALID_EXACT_HEAD_BLOCKER_CASES');
 const seen=new Set(),cases=[],prior=asPrevious(previous);
 const priorByKey=new Map(prior.map(row=>[key(row),row]));
 const current=Array.isArray(source)?source:[];
 const inventory=prIndex(inventorySnapshot);
 const hasSample=Array.isArray(source);
 const observedSampleAt=hasSample?watchdogSample.checked_at:null;
 const stats={new_confirmed:0,same_head_stalled:0,head_changed_reverify:0,
  not_reinspected:0,open_inventory_missing_unverified:0};
 const put=(row)=>{
  const id=key(row);if(seen.has(id)||cases.length>=MAX)return false;
  seen.add(id);cases.push(row);return true;
 };
 for(const input of current){
  const id=key(input),old=priorByKey.get(id),pr=inventory?.get(input.pr_number);
  const changed=!!old&&old.head_sha.toLowerCase()!==input.head_sha.toLowerCase();
  const stage=!old?'NEW_CONFIRMED':changed?'HEAD_CHANGED_REVERIFY':
    'SAME_HEAD_STALLED';
  if(stage==='NEW_CONFIRMED')stats.new_confirmed++;
  else if(changed)stats.head_changed_reverify++;
  else stats.same_head_stalled++;
  const assignees=pr?owner(pr):[];
  put({id:'HH-P0-'+input.root_code+'-PR'+input.pr_number+'-HEAD'+input.head_sha.slice(0,12),
    pr_number:input.pr_number,root_code:input.root_code,
    head_sha:input.head_sha.toLowerCase(),previous_head_sha:changed?old.head_sha:null,
    source_pr:PR_URL+input.pr_number,source_run_url:input.source_run_id?
      RUN_URL+input.source_run_id:null,
    assigned_owner:assignees.length?assignees:null,
    owner_status:assignees.length?'GITHUB_ASSIGNEE':'UNVERIFIED',
    process_owner:PROCESS[input.root_code],
    applied_fix:'UNVERIFIED_NOT_CLAIMED',source_fix_sha:null,
    ci_result:input.ci_result,ci_scope:'OBSERVED_REQUIRED_OR_INDEPENDENT_FAILURE_NOT_ALL_CHECKS',
    ci_head_sha:input.head_sha.toLowerCase(),ci_freshness:'CURRENT_SAMPLE',
    protected_merge_sha:null,production_deployment:null,functional_smoke:null,
    state:stage,previous_state:old?.state||null,
    first_seen_at:changed||!old?observedAt:(old.first_seen_at||observedAt),
    last_checked_at:observedSampleAt||observedAt,
    last_verified_advance_at:old?.last_verified_advance_at||null,
    next_action:stage==='SAME_HEAD_STALLED'?
      'VERIFY_APPLIED_FIX_AND_NEW_HEAD_CI_WITH_CURRENT_LEASE':
      'VERIFY_OWNER_FIX_AND_EXACT_HEAD_REQUIRED_CHECKS'});
 }
 for(const old of prior){
  if(seen.has(key(old))||cases.length>=MAX)continue;
  const pr=inventory?.get(old.pr_number),liveHead=pr?.head?.sha;
  const knownNewHead=SHA.test(liveHead||'')&&
    liveHead.toLowerCase()!==old.head_sha.toLowerCase();
  const disappeared=inventory!==null&&!pr;
  const status=knownNewHead?'HEAD_CHANGED_NOT_REINSPECTED':
    disappeared?'NOT_IN_OPEN_INVENTORY_UNVERIFIED':'NOT_REINSPECTED';
  if(knownNewHead)stats.head_changed_reverify++;
  else if(disappeared)stats.open_inventory_missing_unverified++;
  else stats.not_reinspected++;
  const assignees=pr?owner(pr):old.assigned_owner||null;
  put({...old,
    head_sha:knownNewHead?liveHead.toLowerCase():old.head_sha,
    id:knownNewHead?'HH-P0-'+old.root_code+'-PR'+old.pr_number+
      '-HEAD'+liveHead.slice(0,12):old.id,
    previous_head_sha:knownNewHead?old.head_sha:old.previous_head_sha||null,
    assigned_owner:assignees?.length?assignees:null,
    owner_status:assignees?.length?'GITHUB_ASSIGNEE':'UNVERIFIED',
    applied_fix:'UNVERIFIED_NOT_CLAIMED',source_fix_sha:null,
    ci_result:knownNewHead?'UNKNOWN':old.ci_result,
    source_run_url:knownNewHead?null:old.source_run_url,
    ci_head_sha:knownNewHead?null:old.ci_head_sha,
    ci_freshness:knownNewHead?'HEAD_CHANGED_UNVERIFIED':'STALE_OBSERVATION',
    first_seen_at:knownNewHead?observedAt:old.first_seen_at,
    protected_merge_sha:null,production_deployment:null,functional_smoke:null,
    previous_state:old.state,state:status,
    next_action:disappeared?'VERIFY_PR_CLOSE_VS_MERGE_AND_LIVE_PROOF':
      knownNewHead?'RECHECK_REQUIRED_CI_ON_NEW_HEAD':
      'REINSPECT_EXACT_HEAD_AND_OWNER_RECEIPTS'});
 }
 return {schema:SCHEMA,observed_at:observedAt,
  coverage:'BOUNDED_VERIFIED_WATCHDOG_SAMPLE_NOT_ALL_OPEN_PRS',
  latest_sample_at:observedSampleAt,
  complete_root_inventory:false,
  actual_fix_verifications:0,ci_all_required_green_verified:0,
  protected_merges_verified:0,functional_live_verified:0,
  reason:'MISSING_INDEPENDENT_FIX_MERGE_LIVE_RECEIPTS',
  active_tracked:cases.length,
  untracked_due_to_limit:Math.max(0,new Set([...prior,...current].map(key)).size-cases.length),
  ...stats,cases};
}
module.exports={SCHEMA,reconcileBlockerProgress};
