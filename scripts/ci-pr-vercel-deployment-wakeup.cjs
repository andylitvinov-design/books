'use strict';
// Trusted existing Vercel production repository_dispatch -> bounded GitHub Actions
// Watchdog wakeup. No Vercel Cron, PAT, paid services, PR source writes or merge.
const {admission}=require('./ci-pr-slot-wakeup.cjs');
const REPO='andylitvinov-design/books';
const CONTROL='codex/bootstrap-books';
const PROD='codex/public-book-library';
const PROJECT_ID='prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const WATCHDOG='hh-pr-ten-minute-watchdog.yml';
const SHA=/^[a-f0-9]{40}$/i;
function trustedEvent(context){
 const event=context?.payload||{},p=event.client_payload||{};
 return context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
  context.ref==='refs/heads/'+CONTROL &&
  context.eventName==='repository_dispatch' &&
  ['vercel.deployment.success','vercel.deployment.promoted'].includes(event.action) &&
  p.environment==='production' && SHA.test(p.git?.sha||'') &&
  (!p.project?.id||p.project.id===PROJECT_ID);
}
function validInventory(r){
 return Number.isSafeInteger(r?.data?.total_count)&&r.data.total_count>=0;
}
async function run({github,core,context,now=Date.now()}){
 const report={schema:'HH_VERCEL_EVENT_WATCHDOG_WAKE_V1',
   event:context?.payload?.action||null,decision:'UNVERIFIED',
   triggered:false,run_id:null,runner_started:false,
   target_sha:context?.payload?.client_payload?.git?.sha||null,
   active:null,queued:null};
 const finish=async()=>{
  core.info('HH_VERCEL_EVENT_WATCHDOG_WAKE '+JSON.stringify(report));
  await core.summary.addHeading('Vercel event -> Watchdog runner backstop')
    .addCodeBlock(JSON.stringify(report,null,2)).write();
  return report;
 };
 if(!trustedEvent(context)){report.decision='UNTRUSTED_OR_UNRELATED_EVENT';return finish();}
 const {owner,repo}=context.repo;
 try{
  const result=await github.rest.repos.getBranch({owner,repo,branch:PROD});
  if(result?.data?.protected!==true||result?.data?.commit?.sha!==report.target_sha){
   report.decision='STALE_OR_UNPROTECTED_PRODUCTION_SHA';return finish();
  }
 }catch{report.decision='PRODUCTION_SHA_UNVERIFIED';return finish();}
 try{
  const [active,queued,scheduled,dispatched]=await Promise.all([
   github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'in_progress',per_page:1}),
   github.rest.actions.listWorkflowRunsForRepo({owner,repo,status:'queued',per_page:1}),
   github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
     {owner,repo,workflow_id:WATCHDOG,event:'schedule',per_page:5}),
   github.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
     {owner,repo,workflow_id:WATCHDOG,event:'workflow_dispatch',per_page:5})
  ]);
  if(!validInventory(active)||!validInventory(queued)||
      !validInventory(scheduled)||!validInventory(dispatched)||
      !Array.isArray(scheduled.data.workflow_runs)||
      !Array.isArray(dispatched.data.workflow_runs)||
      scheduled.data.workflow_runs.length>5||
      dispatched.data.workflow_runs.length>5){
   report.decision='HISTORY_OR_CAPACITY_UNVERIFIED';return finish();
  }
  report.active=active.data.total_count;
  report.queued=queued.data.total_count;
  report.decision=admission(report.active,report.queued,
    [...scheduled.data.workflow_runs,...dispatched.data.workflow_runs],now);
  if(!['DISPATCH','DISPATCH_STALE_CI'].includes(report.decision))return finish();
  // Refresh production SHA immediately before a privileged dispatch.
  const again=await github.rest.repos.getBranch({owner,repo,branch:PROD});
  if(again?.data?.protected!==true||again.data.commit?.sha!==report.target_sha){
   report.decision='PRODUCTION_SHA_CHANGED';return finish();
  }
  await github.rest.actions.createWorkflowDispatch({
   owner,repo,workflow_id:WATCHDOG,ref:CONTROL,inputs:{dry_run:'false'}
  });
  report.triggered=true;
  report.decision='DISPATCH_ACCEPTED_AWAIT_RUNNER';
  // HTTP 204 is not an actual workflow run ID; separate evidence is required.
 }catch(error){
  report.decision='GITHUB_WAKE_API_UNAVAILABLE';
  report.http_status=Number.isSafeInteger(error?.status)?error.status:null;
 }
 return finish();
}
module.exports={trustedEvent,validInventory,run};
