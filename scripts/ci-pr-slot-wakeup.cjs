'use strict';
// Trusted, read-only admission + single workflow_dispatch; never executes PR code.
// Fall back to at most one real reconcile every ten minutes when cron is delayed.
const MAX_ACTIVE=12,MAX_QUEUED=6,COOLDOWN_MS=10*60_000;
// Global CI saturation must not suppress the only working watchdog backstop.
const STALE_RESCUE_MS=30*60_000;
const CORE='HH PR core release gate';
const PATH='.github/workflows/hh-pr-core-release.yml';
const REPO='andylitvinov-design/books';
function trustedEvent(context) {
  const e=context?.payload?.workflow_run;
  return context?.eventName==='workflow_run' &&
    context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
    e?.name===CORE && String(e.path||'').split('@')[0]===PATH &&
    e.event==='pull_request' && e.status==='completed' &&
    e.conclusion==='success' && e.repository?.full_name===REPO &&
    (!e.head_repository?.full_name || e.head_repository.full_name===REPO);
}
// Core success already wakes native AutoMerge. A second Watchdog run is useful
// only when it can drain an existing trusted CI/Repair queue. This is one
// read-only GraphQL request, never another PR/source mutation.
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

function admission(active,queued,runs,now=Date.now()) {
  if(!Number.isSafeInteger(active)||!Number.isSafeInteger(queued)||
     active<0||queued<0)return 'CAPACITY_UNKNOWN';
  if(!Array.isArray(runs)||runs.length>10)return 'WATCHDOG_HISTORY_UNVERIFIED';
  let latestReconcileAt=null;
  for(const r of runs){
    // Successful Core callbacks create many no-op workflow_run wrappers.
    // Only a real scheduled/manual Watchdog reconcile occupies this slot.
    if(r?.event && !['schedule','workflow_dispatch'].includes(r.event))continue;
    if(['queued','in_progress','pending','requested','waiting'].includes(r.status))return 'WATCHDOG_ALREADY_ACTIVE';
    const t=Date.parse(r.created_at||'');
    if(!Number.isFinite(t)||t>now+60_000)return 'WATCHDOG_HISTORY_UNVERIFIED';
    latestReconcileAt=latestReconcileAt===null?t:Math.max(latestReconcileAt,t);
    if(now-t>=-60_000&&now-t<COOLDOWN_MS)return 'WATCHDOG_RECENT';
  }
  if(active>=MAX_ACTIVE||queued>=MAX_QUEUED){
    // Do not wake into ordinary CI congestion. If every real scheduled/manual
    // reconciliation is at least 30 minutes old (or none ever arrived), allow
    // one rescue dispatch. Queued/running Watchdog and the cooldown above
    // still block duplicates. Actual Worker/exact-HEAD admission is unchanged.
    return latestReconcileAt===null||now-latestReconcileAt>=STALE_RESCUE_MS
      ?'DISPATCH_STALE_CI':'CI_BUSY';
  }
  return 'DISPATCH';
}
async function run({github,core,context,now=Date.now()}){
  const report={decision:'UNVERIFIED',active:null,queued:null,backlog:null,dispatched:0};
  const write=async()=>{
    core.info('HH_SLOT_WAKEUP '+JSON.stringify(report));
    await core.summary.addHeading('HH Core CI freed-slot wakeup')
      .addCodeBlock(JSON.stringify(report,null,2)).write();
    return report;
  };
  if(!trustedEvent(context)){report.decision='UNTRUSTED_OR_UNRELATED_EVENT';return write();}
  const {owner,repo}=context.repo;
  const [active,queued,scheduled,dispatched]=await Promise.all([
    github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'in_progress',per_page:1}),
    github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'queued',per_page:1}),
    github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',event:'schedule',per_page:5
    }),
    github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',event:'workflow_dispatch',per_page:5
    })
  ]);
  report.active=active?.data?.total_count??null;
  report.queued=queued?.data?.total_count??null;
  // Fail closed when either real-reconcile inventory is missing.
  const sched=scheduled?.data?.workflow_runs, manual=dispatched?.data?.workflow_runs;
  const realHistory=Array.isArray(sched)&&Array.isArray(manual)?[...sched,...manual]:null;
  report.decision=admission(report.active,report.queued,realHistory,now);
  // For ordinary successful Core events, no queue means no reason to scan
  // the entire repository a second time. Emergency stale-cron rescue remains.
  if(report.decision==='DISPATCH'){
    try{
      report.backlog=await hasDurableBacklog(github,owner,repo);
      if(!report.backlog)report.decision='NO_ACTIONABLE_BACKLOG';
    }catch(error){
      report.decision='BACKLOG_UNVERIFIED';
      core.warning('HH_SLOT_WAKEUP '+String(error?.message||error).slice(0,140));
    }
  }
  if(report.decision==='DISPATCH'||report.decision==='DISPATCH_STALE_CI'){
    // Workflow dispatch is the GITHUB_TOKEN recursion exception.
    await github.rest.actions.createWorkflowDispatch({
      owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',
      ref:'codex/bootstrap-books',inputs:{dry_run:'false'}
    });
    report.dispatched=1;
  }
  return write();
}
module.exports={admission,trustedEvent,hasDurableBacklog,run};
