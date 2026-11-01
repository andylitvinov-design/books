'use strict';
// Trusted, read-only admission + single workflow_dispatch; never executes PR code.
const MAX_ACTIVE=12,MAX_QUEUED=6,COOLDOWN_MS=3*60_000;
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
function admission(active,queued,runs,now=Date.now()) {
  if(!Number.isSafeInteger(active)||!Number.isSafeInteger(queued)||
     active<0||queued<0)return 'CAPACITY_UNKNOWN';
  if(active>=MAX_ACTIVE||queued>=MAX_QUEUED)return 'CI_BUSY';
  if(!Array.isArray(runs)||runs.length>10)return 'WATCHDOG_HISTORY_UNVERIFIED';
  for(const r of runs){
    if(['queued','in_progress','pending','requested','waiting'].includes(r.status))return 'WATCHDOG_ALREADY_ACTIVE';
    const t=Date.parse(r.created_at||'');
    if(!Number.isFinite(t))return 'WATCHDOG_HISTORY_UNVERIFIED';
    if(now-t>=-60_000&&now-t<COOLDOWN_MS)return 'WATCHDOG_RECENT';
  }
  return 'DISPATCH';
}
async function run({github,core,context,now=Date.now()}){
  const report={decision:'UNVERIFIED',active:null,queued:null,dispatched:0};
  const write=async()=>{
    core.info('HH_SLOT_WAKEUP '+JSON.stringify(report));
    await core.summary.addHeading('HH Core CI freed-slot wakeup')
      .addCodeBlock(JSON.stringify(report,null,2)).write();
    return report;
  };
  if(!trustedEvent(context)){report.decision='UNTRUSTED_OR_UNRELATED_EVENT';return write();}
  const {owner,repo}=context.repo;
  const [active,queued,history]=await Promise.all([
    github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'in_progress',per_page:1}),
    github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'queued',per_page:1}),
    github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
      owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',per_page:10
    })
  ]);
  report.active=active?.data?.total_count??null;
  report.queued=queued?.data?.total_count??null;
  report.decision=admission(report.active,report.queued,history?.data?.workflow_runs,now);
  if(report.decision==='DISPATCH'){
    // Workflow dispatch is the GITHUB_TOKEN recursion exception.
    await github.rest.actions.createWorkflowDispatch({
      owner,repo,workflow_id:'hh-pr-ten-minute-watchdog.yml',
      ref:'codex/bootstrap-books',inputs:{dry_run:'false'}
    });
    report.dispatched=1;
  }
  return write();
}
module.exports={admission,trustedEvent,run};
