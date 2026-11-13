'use strict';
/* HH_PR_CHECKPOINT_EVIDENCE_V1
 * Never count optional or non-applicable milestones as missing mandatory
 * Created -> Merged evidence. A complete event chain is NOT proof that the
 * cause of all waiting time is known, nor that production is LIVE.
 * No network, timers, reads or billable work.
 */
const MERGE_MILESTONES=Object.freeze([
 'created','first_ci_queued','runner_started','core_job_completed','merge_gate_green','merged'
]);
const DELIVERY_MILESTONES=Object.freeze(['deployment_ready','live_verified']);
const CONDITIONAL=Object.freeze([
 'triage','claimed','ci_failed','repair_started','source_published',
 'conflict_detected','conflict_label_cleared','repeat_ci_queued'
]);
function summarizeCheckpoints(checkpoints,context={}){
 if(!Array.isArray(checkpoints))throw Error('CHECKPOINTS_NOT_ARRAY');
 const rows=checkpoints.map(x=>({...x})),ids=new Set();
 for(const r of rows){
  if(!r||typeof r.key!=='string'||ids.has(r.key))throw Error('DUPLICATE_OR_INVALID_CHECKPOINT');
  ids.add(r.key);
 }
 const merged=context.merged===true,partial=context.historyPartial!==false;
 const noFail=!partial&&context.failures===0;
 const noRepeat=!partial&&context.repeats===0;
 const noConflict=!partial&&context.conflictSeen===false;
 const notApplicable=new Set();
 if(noFail)for(const k of ['ci_failed','repair_started','source_published'])notApplicable.add(k);
 if(noRepeat)notApplicable.add('repeat_ci_queued');
 if(noConflict)for(const k of ['conflict_detected','conflict_label_cleared'])notApplicable.add(k);
 const observed=r=>r?.evidence==='GITHUB_VERIFIED_EVENT'&&
  typeof r.at==='string'&&Number.isFinite(Date.parse(r.at));
 for(const row of rows){
  if(!observed(row)&&notApplicable.has(row.key)){
   row.evidence='NOT_APPLICABLE';
   row.at=null;row.url=null;
  }
 }
 const by=new Map(rows.map(x=>[x.key,x]));
 const required=MERGE_MILESTONES;
 const missing=required.filter(k=>!observed(by.get(k)));
 const conditional=CONDITIONAL.map(key=>by.get(key)).filter(Boolean);
 const delivery=DELIVERY_MILESTONES.map(key=>by.get(key)).filter(Boolean);
 const deliveryMissing=DELIVERY_MILESTONES.filter(k=>!observed(by.get(k)));
 const covered=required.length-missing.length;
 return {checkpoints:rows,coverage:{
  schema:'HH_PR_CHECKPOINT_EVIDENCE_V1',
  scope:'CREATED_TO_MERGED_REQUIRED_MILESTONES_NOT_ALL_OPTIONAL_STAGES',
  total:required.length,observed:covered,missing,
  all_checkpoint_opportunities:rows.length,
  conditional_observed:conditional.filter(observed).map(x=>x.key),
  conditional_not_applicable:conditional.filter(x=>x.evidence==='NOT_APPLICABLE').map(x=>x.key),
  conditional_unverified:conditional.filter(x=>!observed(x)&&x.evidence!=='NOT_APPLICABLE').map(x=>x.key),
  optional_ready_observed:observed(by.get('ready')),
  delivery:{total:DELIVERY_MILESTONES.length,
   observed:DELIVERY_MILESTONES.length-deliveryMissing.length,
   missing:deliveryMissing,
   independently_live_verified:observed(by.get('live_verified'))},
  merged,history_partial:partial,
  merge_boundary_chain_verified:merged&&missing.length===0,
  full_history_confirmed:merged&&missing.length===0&&!partial,
  caveat:'Только шесть обязательных точек Created→Merged. Ready/Triage/Worker/Repair/Conflict/повторная CI условны; отсутствие условного события не считается дефектом полной цепочки. Даже 6/6 не доказывает причин задержек, полноту истории повторов или LIVE.'
 }};
}
module.exports={MERGE_MILESTONES,DELIVERY_MILESTONES,CONDITIONAL,summarizeCheckpoints};
