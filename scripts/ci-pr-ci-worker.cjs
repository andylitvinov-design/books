'use strict';

/**
 * Zero-new-cost CI bootstrap worker for legacy PRs with NO Core history.
 * Executes only from trusted GitHub default branch. It never executes PR code
 * with a privileged token, marks checks green, or merges directly.
 *
 * A single source-preserving empty commit (via an existing owner token)
 * creates a genuine pull_request.synchronize event, unlike workflow_dispatch
 * of Core, which would skip PR-specific specialist validation.
 */
const PROD = 'codex/public-book-library';
const QUEUED = 'hh:ci-needed';
const ATTEMPTED = 'hh:ci-bootstrap-attempted';
const CORE = 'hh-pr-core-release.yml';
const MAX_REQUESTS = 28;
const API_RESERVE = 100;
const MAX_ACTIVE = 12;
const MAX_QUEUED = 6;
const MAX_CANDIDATES = 5;
const SHA = /^[a-f0-9]{40}$/i;

function validBranch(branch) {
  return typeof branch === 'string' && branch.length <= 160 &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) &&
    !branch.includes('..') && !branch.includes('//') && !branch.endsWith('/') &&
    !branch.includes('@{');
}

function validPR(pr, repo) {
  return Boolean(pr && pr.state === 'open' && !pr.draft &&
    pr.base?.ref === PROD && pr.head?.repo?.full_name === repo &&
    SHA.test(pr.head?.sha || '') && validBranch(pr.head?.ref) &&
    pr.mergeable === true && pr.mergeable_state === 'clean' &&
    !pr.labels?.some(label => label.name === ATTEMPTED));
}

function capacityAllows(active, queued) {
  return Number.isSafeInteger(active) && Number.isSafeInteger(queued) &&
    active >= 0 && queued >= 0 && active < MAX_ACTIVE && queued < MAX_QUEUED;
}

async function run({github,core,context,sourceGit=null,dryRun=false,now=Date.now()}) {
  const {owner,repo}=context.repo;
  const fullRepo=owner+'/'+repo;
  const log=message=>core.info('HH_CI_WORKER: '+message);
  const summary={
    checkedAt:new Date(now).toISOString(),dryRun,
    sourceTokenAvailable:Boolean(sourceGit),
    candidateIssues:0,examined:0,eligible:0,wouldStart:0,started:0,failed:0,
    activeActions:null,queuedActions:null,apiRequests:0,apiRemaining:null,
    apiPause:false,reason:null
  };
  const writeSummary=async()=>{
    await core.summary.addHeading('HH zero-cost PR CI worker')
      .addCodeBlock(Object.entries(summary).map(([key,val])=>key+': '+val).join('\n'))
      .write();
    log(Object.entries(summary).map(([key,val])=>key+'='+val).join('; '));
    return summary;
  };
  const limited=async(name,callback)=>{
    if (summary.apiPause || summary.apiRequests >= MAX_REQUESTS) {
      summary.apiPause=true; summary.reason ||= 'LOCAL_REQUEST_RESERVE';
      throw Error('HH_CI_WORKER_API_PAUSE:'+name);
    }
    summary.apiRequests++;
    try{
      const response=await callback();
      const remaining=response?.headers?.['x-ratelimit-remaining'];
      if(remaining!==undefined && Number.isFinite(Number(remaining))){
        summary.apiRemaining=Number(remaining);
        if(summary.apiRemaining < API_RESERVE){
          summary.apiPause=true; summary.reason='GITHUB_API_RESERVE';
        }
      }
      return response;
    }catch(error){
      if([403,429].includes(error?.status) &&
          /rate.limit|rate limit|abuse|secondary/i.test(String(error.message))){
        summary.apiPause=true; summary.reason='GITHUB_API_RATE_LIMIT';
      }
      throw error;
    }
  };
  let active,queued;
  try {
    const a=await limited('running-actions',()=>github.rest.actions.listWorkflowRunsForRepo({
      owner,repo,status:'in_progress',per_page:1
    }));
    if(summary.apiPause)return writeSummary();
    const q=await limited('queued-actions',()=>github.rest.actions.listWorkflowRunsForRepo({
      owner,repo,status:'queued',per_page:1
    }));
    active=a.data.total_count; queued=q.data.total_count;
    summary.activeActions=active;summary.queuedActions=queued;
  }catch(error) {
    summary.reason ||= 'CAPACITY_UNAVAILABLE';
    log('SKIP capacity lookup: '+error.message);
    return writeSummary();
  }
  if(summary.apiPause) return writeSummary();
  if(!capacityAllows(active,queued)){
    summary.reason='CI_QUEUE_BUSY';
    return writeSummary();
  }
  let candidates;
  try{
    const response=await limited('queued-issues',()=>github.rest.issues.listForRepo({
      owner,repo,state:'open',labels:QUEUED,per_page:30,sort:'created',direction:'asc'
    }));
    if(!Array.isArray(response?.data))throw Error('Incomplete PR queue');
    candidates=response.data.filter(item=>item.pull_request).slice(0,MAX_CANDIDATES);
    summary.candidateIssues=candidates.length;
  }catch(error){
    summary.reason ||= 'QUEUE_UNAVAILABLE';
    log('SKIP queue lookup: '+error.message);
    return writeSummary();
  }
  for(const issue of candidates){
    if(summary.apiPause)break;
    summary.examined++;
    try{
      let pr=(await limited('live-pr',()=>github.rest.pulls.get({
        owner,repo,pull_number:issue.number
      }))).data;
      if(!validPR(pr,fullRepo))continue;
      // Only complete absence of historical Core PR runs qualifies. Rerunning
      // stale/failed source code or creating a second bootstrap is forbidden.
      const history=(await limited('core-history',()=>github.request(
        'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
          owner,repo,workflow_id:CORE,branch:pr.head.ref,event:'pull_request',per_page:1
        }))).data;
      if(!history || history.total_count!==0 ||
          !Array.isArray(history.workflow_runs) || history.workflow_runs.length!==0)continue;
      // A stacked child depends on exact parent ancestry. Never modify its parent.
      const children=(await limited('stacked-children',()=>github.rest.pulls.list({
        owner,repo,state:'open',base:pr.head.ref,per_page:1
      }))).data;
      if(!Array.isArray(children) || children.length)continue;
      if(summary.apiPause)break;
      summary.eligible++;
      if(dryRun) {
        summary.wouldStart++;
        log('WOULD_BOOTSTRAP #' + pr.number + ' current SHA '+pr.head.sha.slice(0,12));
        break;
      }
      if(!sourceGit) {
        summary.reason='HH_AUTOMERGE_TOKEN_REQUIRED';
        log('SKIP real CI: no existing owner token for PR synchronize');
        break;
      }
      // Durable once-per-PR lease is written before mutation. If anything
      // fails, manual review may remove ATTEMPTED; no automatic retry loop.
      try{
        await limited('claim-once',()=>github.rest.issues.addLabels({
          owner,repo,issue_number:pr.number,labels:[ATTEMPTED]
        }));
      }catch(error){
        if(![404,422].includes(error?.status))throw error;
        try{
          await limited('create-claim-label',()=>github.rest.issues.createLabel({
            owner,repo,name:ATTEMPTED,color:'6f42c1',
            description:'One-shot CI bootstrap attempted; do not loop on the same PR'
          }));
        }catch(createError){
          if(createError?.status!==422)throw createError;
        }
        await limited('claim-once',()=>github.rest.issues.addLabels({
          owner,repo,issue_number:pr.number,labels:[ATTEMPTED]
        }));
      }
      if(summary.apiPause)break;
      const fresh=(await limited('fresh-pr',()=>github.rest.pulls.get({
        owner,repo,pull_number:pr.number
      }))).data;
      if(!validPR({...fresh,labels:(fresh.labels||[]).filter(l=>l.name!==ATTEMPTED)},fullRepo) ||
          fresh.head.sha!==pr.head.sha || fresh.head.ref!==pr.head.ref){
        summary.reason='PR_CHANGED_AFTER_CLAIM';
        break;
      }
      const result=await sourceGit.bootstrap({owner,repo,
        branch:pr.head.ref,sha:pr.head.sha,number:pr.number});
      if(!SHA.test(result?.sha || '') || result.sha===pr.head.sha){
        throw Error('Dedicated token did not return a new commit SHA');
      }
      summary.started++;
      log('BOOTSTRAP_ACCEPTED #'+pr.number+' old='+pr.head.sha.slice(0,12)+
        ' new='+result.sha.slice(0,12)+'; genuine PR synchronize should start CI');
      try{
        await limited('remove-queued-label',()=>github.rest.issues.removeLabel({
          owner,repo,issue_number:pr.number,name:QUEUED
        }));
      }catch(error){log('Bootstrap accepted; queued label removal unavailable: '+error.message);}
      break; // hard cap one CI-creating commit per 10-minute cycle
    }catch(error){
      summary.failed++;
      log('PR #'+issue.number+' worker blocked: '+error.message);
      if(summary.apiPause)break;
    }
  }
  if(!summary.reason && !summary.started && !summary.wouldStart)
    summary.reason='NO_SAFE_LEGACY_CORE_CANDIDATE';
  return writeSummary();
}

module.exports={run,validPR,validBranch,capacityAllows,PROD,QUEUED,ATTEMPTED};
