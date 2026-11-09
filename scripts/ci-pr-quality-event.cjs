'use strict';

/**
 * Exact-PR event allowlist for trusted pull_request CI workflows.
 *
 * workflow_run is a privileged event boundary. Names alone are not authority:
 * each name must match its known workflow path, the run must come from this
 * repository, and exactly one payload PR must match the live source HEAD.
 * Unrecognized workflows retain the existing full-inventory fallback.
 */
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const DEFAULT='codex/bootstrap-books';
const FAILED=new Set(['failure','timed_out','startup_failure']);
const PATHS=Object.freeze({
  'HH PR Sweep Guard tests':'.github/workflows/hh-pr-sweep-guard.yml',
  'HH workflow syntax — actionlint':'.github/workflows/hh-actionlint.yml',
  'HH PR watchdog contract':'.github/workflows/hh-pr-watchdog-contract-ci.yml',
  'Holistic Support mandala release checks':'.github/workflows/holistic-support-mandala.yml',
  'Holistic House public services production acceptance':'.github/workflows/hh-public-services-production.yml',
  'Holistic House CRM source checks':'.github/workflows/hh-crm-source-check.yml',
  'Website video browser verification':'.github/workflows/site-video-browser.yml',
  'Practice reference design — Chromium and WebKit screenshots':'.github/workflows/practice-visual-browser.yml',
  'Practitioner visual service editor':'.github/workflows/practice-visual-services.yml',
  'HH First Video LIVE · encoded file acceptance':'.github/workflows/hh-first-video-live-export.yml',
  'Holistic House nightly public URL / media crawl':'.github/workflows/hh-nightly-public-crawl.yml',
  'Native CI':'.github/workflows/native-ci.yml',
  'HH Growth Studio editorial checks':'.github/workflows/hh-growth-studio.yml',
  'HH one-shot PR backlog recovery':'.github/workflows/hh-pr-backlog-recovery-once.yml',
  'HH PR Control Tower queue dispatcher':'.github/workflows/hh-pr-queue-dispatcher.yml',
  'HH PR three-cohort evidence backfill':'.github/workflows/hh-pr-three-cohort-backfill.yml'
});
const SHA=/^[0-9a-f]{40}$/i;

function trustedQualityFailureRun(run, context) {
  if(!run||!context||context.eventName!=='workflow_run'||
     context.repo?.owner+'/'+context.repo?.repo!==REPO||
     context.ref!=='refs/heads/'+DEFAULT||
     !Object.hasOwn(PATHS,run.name)||
     String(run.path||'').split('@')[0]!==PATHS[run.name]||
     run.event!=='pull_request'||run.status!=='completed'||
     !FAILED.has(run.conclusion)||
     run.repository?.full_name!==REPO||
     run.head_repository?.full_name!==REPO||
     !Number.isSafeInteger(run.id)||run.id<1||
     !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||
     typeof run.head_branch!=='string'||!run.head_branch||
     run.head_branch.length>255||!SHA.test(run.head_sha||'')||
     !Array.isArray(run.pull_requests)||run.pull_requests.length!==1)
    return false;
  const link=run.pull_requests[0];
  return Number.isSafeInteger(link?.number)&&link.number>0&&
    link.base?.ref===PROD&&SHA.test(link.head?.sha||'');
}

function qualityEventMatchesPR(run, pr) {
  if(!trustedQualityFailureRun(run,{
    eventName:'workflow_run',
    ref:'refs/heads/'+DEFAULT,
    repo:{owner:'andylitvinov-design',repo:'books'}
  }))return false;
  const link=run.pull_requests[0];
  return link.number===pr?.number&&
    link.head?.sha?.toLowerCase()===pr?.head?.sha?.toLowerCase()&&
    link.base?.ref===pr?.base?.ref&&
    pr.base?.ref===PROD&&
    (!link.base?.sha||link.base.sha.toLowerCase()===pr.base?.sha?.toLowerCase())&&
    run.head_branch===pr?.head?.ref&&
    pr?.head?.repo?.full_name===REPO&&SHA.test(pr?.head?.sha||'');
}

function isTrustedQualityFailureEvent(context) {
  return trustedQualityFailureRun(context?.payload?.workflow_run,context);
}

module.exports={
  PATHS,FAILED,REPO,PROD,DEFAULT,
  trustedQualityFailureRun,qualityEventMatchesPR,isTrustedQualityFailureEvent
};
