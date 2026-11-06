'use strict';
// Pure fail-closed admission for Core workflow records with zero runner jobs.
// A branch name alone never identifies a PR: require exactly one current,
// ready, same-repository PR with the immutable run's exact SOURCE SHA.
const REPO='andylitvinov-design/books';
const BASE='codex/public-book-library';
const SHA=/^[0-9a-f]{40}$/;
const finiteTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))
  ?Date.parse(value):null;
function joblessStartupReference(event,candidates){
 if(event?.name!=='HH PR core release gate'||
    event.path?.split('@')[0]!=='.github/workflows/hh-pr-core-release.yml'||
    event.event!=='pull_request'||event.status!=='completed'||
    event.conclusion!=='startup_failure'||event.run_attempt!==1||
    event.repository?.full_name!==REPO||event.head_repository?.full_name!==REPO||
    !SHA.test(event.head_sha||'')||typeof event.head_branch!=='string'||
    !event.head_branch||!Array.isArray(event.pull_requests)||
    event.pull_requests.length!==0||!Array.isArray(candidates)||candidates.length!==1)
   return null;
 const pr=candidates[0],runAt=finiteTime(event.created_at);
 const created=finiteTime(pr?.created_at);
 if(runAt===null||created===null||created>runAt||
    !Number.isSafeInteger(pr?.number)||pr.number<1||pr.state!=='open'||
    pr.draft!==false||pr.base?.ref!==BASE||
    pr.head?.repo?.full_name!==REPO||pr.head.ref!==event.head_branch||
    pr.head.sha!==event.head_sha||
    !SHA.test(pr.base?.sha||''))return null;
 return {number:pr.number,base:{ref:BASE,sha:pr.base.sha},
    head:{ref:pr.head.ref,sha:pr.head.sha}};
}
function selectJoblessStartupRerun(event,jobData){
 if(event?.status!=='completed'||event?.conclusion!=='startup_failure'||
    event.run_attempt!==1||!Number.isSafeInteger(event.id)||event.id<1||
    !jobData||jobData.total_count!==0||!Array.isArray(jobData.jobs)||
    jobData.jobs.length!==0)return {action:'hold',reason:'JOBLESS_STARTUP_NOT_PROVEN'};
 return {action:'rerun_workflow',reason:'FIRST_ATTEMPT_STARTUP_NO_JOBS'};
}
module.exports={joblessStartupReference,selectJoblessStartupRerun};
