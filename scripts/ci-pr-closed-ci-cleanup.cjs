'use strict';
// Trusted default-branch, close-event-only CI cleanup. Never execute PR code.
const REPO = 'andylitvinov-design/books';
const PROD = 'codex/public-book-library';
const SHA = /^[0-9a-f]{40}$/i;
const ACTIVE = new Set(['queued','in_progress','waiting','pending','requested']);
const STATES = ['queued','in_progress','waiting','pending','requested'];

function trustedClose(context, pr=context?.payload?.pull_request) {
  return context?.eventName === 'pull_request_target' &&
    context?.payload?.action === 'closed' &&
    context?.repo?.owner + '/' + context?.repo?.repo === REPO &&
    pr?.state === 'closed' && pr?.merged === false &&
    Number.isSafeInteger(pr.number) && pr.number > 0 &&
    pr?.base?.ref === PROD && pr?.base?.repo?.full_name === REPO &&
    pr?.head?.repo?.full_name === REPO &&
    typeof pr?.head?.ref === 'string' && pr.head.ref.length > 0 &&
    SHA.test(pr?.head?.sha || '');
}
function sameClosedPR(pr,event) {
  return pr?.number === event.number && pr?.state === 'closed' && pr?.merged === false &&
    pr.base?.ref === PROD && pr.base?.repo?.full_name === REPO &&
    pr.head?.repo?.full_name === REPO && pr.head?.ref === event.head.ref &&
    pr.head?.sha === event.head.sha;
}
function eligible(run,pr) {
  // A manually re-run PR workflow is a separate deliberate action: never cancel it.
  if (!run || !ACTIVE.has(run.status) || run.event !== 'pull_request' ||
      !Number.isSafeInteger(run.id) || run.id <= 0 ||
      run.run_attempt !== 1 || run.head_branch !== pr.head.ref ||
      run.head_repository?.full_name !== REPO ||
      run.repository?.full_name !== REPO ||
      !SHA.test(run.head_sha || '')) return false;
  // GitHub may expose [] or stale association for historical runs. Never guess.
  return Array.isArray(run.pull_requests) && run.pull_requests.length === 1 &&
    run.pull_requests[0]?.number === pr.number &&
    run.pull_requests[0]?.base?.ref === PROD;
}
async function cleanup({github,context,maxCancel=30,log=()=>{}}) {
  const summary={reason:'CLOSED_UNMERGED',scanned:0,eligible:0,
    cancelRequested:[],confirmed:[],skippedNoProof:0,errors:[],partial:false};
  const event=context?.payload?.pull_request;
  if (!trustedClose(context,event))return {...summary,reason:'NOT_TRUSTED_CLOSE'};
  const {owner,repo}=context.repo;
  const loadPR=async()=>(await github.rest.pulls.get({
    owner,repo,pull_number:event.number})).data;
  if(!sameClosedPR(await loadPR(),event))return {...summary,reason:'CLOSE_STATE_CHANGED'};
  const seen=new Set(),candidates=[];
  // Status-scoped listing avoids scanning hundreds of completed workflows.
  for(const status of STATES) {
    for(let page=1;page<=2;page++) {
      const data=(await github.rest.actions.listWorkflowRunsForRepo({
        owner,repo,event:'pull_request',branch:event.head.ref,status,per_page:100,page})).data;
      if(!Array.isArray(data?.workflow_runs) ||
          !Number.isSafeInteger(data.total_count)) throw Error('INCOMPLETE_CLOSE_RUN_INVENTORY');
      summary.scanned+=data.workflow_runs.length;
      for(const run of data.workflow_runs) {
        if(!Number.isSafeInteger(run?.id)||seen.has(run.id))continue;
        seen.add(run.id);
        if(eligible(run,event))candidates.push(run);
        else summary.skippedNoProof++;
      }
      if(data.workflow_runs.length<100)break;
      if(page===2)summary.partial=true;
    }
  }
  for(const original of candidates) {
    if(summary.cancelRequested.length>=maxCancel){summary.partial=true;break;}
    const [livePR, fresh]=(await Promise.all([
      loadPR(),
      github.rest.actions.getWorkflowRun({owner,repo,run_id:original.id})
    ]));
    const run=fresh.data;
    if(!sameClosedPR(livePR,event)){
      summary.reason='CLOSE_STATE_CHANGED';summary.partial=true;break;
    }
    if(!eligible(run,event) || run.id!==original.id ||
       run.head_sha!==original.head_sha) {summary.skippedNoProof++;continue;}
    summary.eligible++;
    try {
      await github.rest.actions.cancelWorkflowRun({owner,repo,run_id:run.id});
      summary.cancelRequested.push(run.id);
      // POST acceptance is not terminal cancellation; do not overclaim.
      const after=(await github.rest.actions.getWorkflowRun({
        owner,repo,run_id:run.id})).data;
      if(after?.status==='completed'&&after?.conclusion==='cancelled')
        summary.confirmed.push(run.id);
    } catch(error) {
      const after=await github.rest.actions.getWorkflowRun({
        owner,repo,run_id:run.id}).then(x=>x.data).catch(()=>null);
      if(after?.status==='completed'&&after.conclusion==='cancelled')
        summary.confirmed.push(run.id);
      else summary.errors.push({id:run.id,reason:String(error?.message||error).slice(0,120)});
    }
  }
  log('HH_CLOSED_PR_CI_CLEANUP '+JSON.stringify(summary));
  return summary;
}
module.exports={trustedClose,sameClosedPR,eligible,cleanup};
