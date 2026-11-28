'use strict';
// Successful Core is a queue-capacity signal, NOT permission to edit any PR.
// Reuse the existing serialized dispatcher in the native Core event runner.
// Watchdog remains periodic recovery; no extra Watchdog or Core dispatch here.
const CORE='HH PR core release gate';
const PATH='.github/workflows/hh-pr-core-release.yml';
const REPO='andylitvinov-design/books';
function trustedEvent(context) {
  const e=context?.payload?.workflow_run;
  return context?.eventName==='workflow_run' &&
    context?.ref==='refs/heads/codex/bootstrap-books' &&
    context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
    e?.name===CORE && String(e.path||'').split('@')[0]===PATH &&
    e.event==='pull_request' && e.status==='completed' &&
    e.conclusion==='success' && e.repository?.full_name===REPO &&
    e.head_repository?.full_name===REPO &&
    Number.isSafeInteger(e.id)&&e.id>0 &&
    Number.isSafeInteger(e.run_attempt)&&e.run_attempt>0 &&
    typeof e.head_branch==='string'&&e.head_branch.length>0 &&
    /^[a-f0-9]{40}$/i.test(e.head_sha||'');
}
async function hasDurableBacklog(github,owner,repo){
  if(typeof github?.graphql!=='function')throw Error('BACKLOG_QUERY_UNAVAILABLE');
  const names=[['ci','hh:ci-needed'],['repair','hh:repair-needed'],
    ['conflict','hh:conflict-repair-needed']];
  const exclusions=' -label:"hh:hold" -label:"hh:blocked"'+
    ' -label:"hh:repair-manual" -label:"hh:worker-claimed"';
  const fields=names.map(([key,label])=>{
    const q='repo:'+owner+'/'+repo+' is:open is:pr label:"'+label+'"'+exclusions;
    return key+': search(type: ISSUE, query: '+JSON.stringify(q)+
      ', first: 1) { nodes { ... on PullRequest { number } } }';
  });
  const result=await github.graphql('query { '+fields.join(' ')+' }');
  for(const [key] of names){
    const nodes=result?.[key]?.nodes;
    if(!Array.isArray(nodes)||nodes.some(node=>!Number.isSafeInteger(node?.number)||node.number<1))
      throw Error('BACKLOG_QUERY_INCOMPLETE_'+key);
    if(nodes.length)return true;
  }
  return false;
}


async function run({github,core,context,dispatchRun=null}){
  const e=context?.payload?.workflow_run;
  const report={schema:'HH_CORE_DIRECT_QUEUE_REFILL_V1',decision:'UNVERIFIED',
    core_run_id:null,core_run_attempt:null,event_head_sha:null,
    backlog:null,dispatched:0,receiptsConfirmed:0,reason:null,blocked:{}};
  const write=async()=>{
    core.info('HH_SLOT_WAKEUP '+JSON.stringify(report));
    await core.summary.addHeading('HH Core CI direct queue refill')
      .addCodeBlock(JSON.stringify(report,null,2)).write();
    return report;
  };
  if(!trustedEvent(context)){report.decision='UNTRUSTED_OR_UNRELATED_EVENT';return write();}
  report.core_run_id=e.id;
  report.core_run_attempt=e.run_attempt;
  report.event_head_sha=e.head_sha;
  try{
    report.backlog=await hasDurableBacklog(github,context.repo.owner,context.repo.repo);
  }catch(error){
    report.decision='BACKLOG_UNVERIFIED_WATCHDOG_FALLBACK';
    core.warning('HH_SLOT_WAKEUP '+String(error?.message||error).slice(0,140));
    return write();
  }
  if(!report.backlog){report.decision='NO_ACTIONABLE_BACKLOG';return write();}
  try{
    // Capacity and reservation decisions are made by the canonical dispatcher
    // from current GitHub evidence, not by the finished Core event.
    // Never pass an owner target, a PR snapshot, or a fabricated event.
    const dispatch=dispatchRun||require('./ci-pr-queue-dispatcher.cjs').run;
    const result=await dispatch({github,core,context,dryRun:false});
    if(result?.schema!=='HH_CONTROL_DISPATCH_V1'||
       !Number.isSafeInteger(result.dispatchAccepted)||result.dispatchAccepted<0)
      throw Error('DIRECT_DISPATCH_RESULT_UNVERIFIED');
    report.dispatched=result.dispatchAccepted;
    report.receiptsConfirmed=Number.isSafeInteger(result.dispatchReceiptsConfirmed)?
      result.dispatchReceiptsConfirmed:0;
    report.reason=typeof result.reason==='string'?result.reason:null;
    report.blocked=result.blocked||{};
    report.decision=report.dispatched?'DIRECT_DISPATCH_ACCEPTED':
      'NO_SAFE_DISPATCH_WATCHDOG_FALLBACK';
  }catch(error){
    // Ambiguous delivery is never retried here. Durable reservations and
    // periodic reconciliation decide whether any subsequent retry is safe.
    report.decision='DIRECT_HANDOFF_UNVERIFIED_WATCHDOG_FALLBACK';
    core.warning('HH_SLOT_WAKEUP '+String(error?.message||error).slice(0,140));
  }
  return write();
}
module.exports={trustedEvent,hasDurableBacklog,run};
