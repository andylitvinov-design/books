'use strict';

const REPO='andylitvinov-design/books';
const CORE_NAME='HH PR core release gate';
const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
const SHA=/^[a-f0-9]{40}$/i;
const LIVE=new Set(['queued','in_progress','waiting','pending','requested','completed']);

function isExactHeadCoreRun(run,{prNumber,branch,sha,baseRef='codex/public-book-library',publishedAt=null}={}) {
  if(!run||typeof run!=='object'||!Number.isSafeInteger(prNumber)||prNumber<1||
     typeof branch!=='string'||!branch||!SHA.test(sha||''))return false;
  if(run.name!==CORE_NAME||String(run.path||'').split('@')[0]!==CORE_PATH||
     run.event!=='pull_request'||!LIVE.has(run.status)||
     run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
     run.head_branch!==branch||!Number.isSafeInteger(run.id)||run.id<1||
     !Array.isArray(run.pull_requests))return false;
  const created=Date.parse(run.created_at||'');
  if(!Number.isFinite(created))return false;
  if(Number.isFinite(publishedAt)&&created<publishedAt-10_000)return false;
  return run.pull_requests.some(pr=>pr?.number===prNumber&&
    pr.head?.sha===sha&&pr.base?.ref===baseRef);
}

function findExactHeadCoreRun(runs,identity) {
  if(!Array.isArray(runs))return null;
  return runs.find(run=>isExactHeadCoreRun(run,identity))||null;
}

module.exports={REPO,CORE_NAME,CORE_PATH,isExactHeadCoreRun,findExactHeadCoreRun};
