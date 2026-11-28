// Exact tested-merge routing for the costly public Site Video + protected owner E2E.
// Only a narrow set of previously reviewed public-display files can defer the
// browser to production push/manual QA. Private, API, auth and unknown stay FULL.
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SHARED_COACH_DISPATCHER, verifiedCoachOnlySharedRouting} from '../lib/ci/coach-only-impact.mjs';

const SAFE_DISPLAY = [
  /^components\/(?:personal-testimonials|home-testimonial-more|public-site-header|site-navigation|mobile-bottom-navigation)\.(?:tsx|jsx|css)$/,
  /^components\/spanish-[\w-]+\.(?:tsx|jsx|css)$/,
  /^data\/(?:about-es|spanish-[\w-]+)\.(?:ts|js)$/,
  /^app\/(?:\[locale\]|en|ru|es)\/about\/page\.tsx$/,
  /^tests\/(?:personal-testimonials[\w.-]*|home-testimonial-lazy-disclosure|es-about|es-public-site|about-page|ru-about-video-presentation)\.test\.mjs$/,
  /^public\/images\/holistic-house\/video-posters\/[\w./-]+$/,
  /^\.github\/workflows\/site-video-browser\.yml$/,
  /^scripts\/ci-site-video-scope\.mjs$/,
  /^tests\/ci-site-video-scope\.test\.mjs$/,
];

// Exact CI policy sources with no production application import or runtime
// path. Core, actionlint and the applicable independent specialist source
// contracts still run. Do not generalize to all tests, workflows or lib files.
const CI_ROUTING_ONLY = new Set([
  'scripts/ci-site-video-scope.mjs',
  'tests/ci-site-video-scope.test.mjs',
  'lib/ci/coach-only-impact.mjs',
  'tests/ci-coach-only-impact.test.mjs',
  'tests/ci-pr-selective-workflows.test.mjs',
  'tests/pr-fast-lane.test.mjs',
  'docs/operations/CI_RELEASE_POLICY.md',
  '.github/workflows/hh-pr-core-release.yml',
  '.github/workflows/site-video-browser.yml',
  '.github/workflows/hh-profile-axis-matching.yml',
  '.github/workflows/practice-google-browser.yml',
  '.github/workflows/hh-private-audio-e2e.yml',
  '.github/workflows/hh-personal-coaching-session.yml',
]);

function onlyReviewedCiRouting(files) {
  return Array.isArray(files) && files.length > 0 && files.length <= CI_ROUTING_ONLY.size &&
    new Set(files.map(file => file?.filename)).size === files.length &&
    files.every(file => file && file.status === 'modified' && !file.previous_filename &&
      CI_ROUTING_ONLY.has(file.filename));
}

export function needsFullSiteVideoBrowser(files) {
  if (onlyReviewedCiRouting(files)) return false;
  return !Array.isArray(files) || files.length === 0 || files.length > 3000 ||
    new Set(files.map(file => file?.filename)).size !== files.length ||
    files.some(file => !file || file.status !== 'modified' || file.previous_filename ||
      typeof file.filename !== 'string' || !SAFE_DISPLAY.some(re => re.test(file.filename)) ||
      file.filename.split('/').some(part => part === '..' || part === '.'));
}

export function classifyExactSiteVideo(env = process.env, git = execFileSync) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request') return {full:true,reason:'MANUAL_OR_PRODUCTION'};
  const head = env.HH_HEAD_SHA || '';
  const merge = env.GITHUB_SHA || '';
  if (!/^[0-9a-f]{40}$/i.test(head) || !/^[0-9a-f]{40}$/i.test(merge))
    return {full:true,reason:'MISSING_EXACT_IDENTITY'};
  const opts={encoding:'utf8', maxBuffer:4*1024*1024, stdio:['ignore','pipe','pipe']};
  try {
    const rev=ref=>String(git('git',['rev-parse',ref],opts)).trim();
    if (rev('HEAD')!==merge || rev('HEAD^2')!==head) return {full:true,reason:'UNTRUSTED_MERGE'};
    const base=rev('HEAD^1');
    if(!/^[0-9a-f]{40}$/i.test(base)) return {full:true,reason:'UNTRUSTED_BASE'};
    const raw=String(git('git',['diff','--no-renames','--name-status','-z',base,'HEAD'],opts));
    const rows=raw.split('\0');
    if(rows.pop()!=='' || !rows.length || rows.length%2) return {full:true,reason:'INVALID_CHANGED_FILES'};
    const files=[];
    for(let i=0;i<rows.length;i+=2){
      if(!rows[i+1])return {full:true,reason:'EMPTY_FILE_NAME'};
      files.push({status:rows[i]==='M'?'modified':rows[i],filename:rows[i+1]});
    }
    // Coach-only additions to the shared dispatcher cannot affect the video
    // editor or owner media routes. This source proof is strict and fail closed.
    if (files.some(row => row.filename === SHARED_COACH_DISPATCHER)) {
      const before=String(git('git',['show',base+':'+SHARED_COACH_DISPATCHER],opts));
      const after=String(git('git',['show','HEAD:'+SHARED_COACH_DISPATCHER],opts));
      if (verifiedCoachOnlySharedRouting(files,before,after))
        return {full:false,reason:'EXACT_MY_COACH_ONLY_SHARED_API'};
    }
    if (onlyReviewedCiRouting(files)) return {full:false,reason:'EXACT_CI_ROUTING_POLICY_ONLY'};
    const full=needsFullSiteVideoBrowser(files);
    return {full,reason:full?'SENSITIVE_OR_UNCLASSIFIED':'REVIEWED_PUBLIC_DISPLAY_ONLY'};
  } catch {
    return {full:true,reason:'UNVERIFIED_GIT_HISTORY'};
  }
}

// Reuse a completed mandatory Core production build ONLY after independently
// reading its actual GitHub job and exact tested merge identity. This is not
// merge authority; the existing required Core/Specialist gate still runs.
// Incomplete proof, older policy, API failure or an unfinished Core => build.
const CORE_WORKFLOW = '.github/workflows/hh-pr-core-release.yml';
const CORE_BUILD_STEP = 'Exact proposed release production build and TypeScript check';
const CORE_IDENTITY = 'HH_CORE_BUILD_IDENTITY_V1';
const SHA = /^[0-9a-f]{40}$/;
const positiveId = x => Number.isSafeInteger(x) && x > 0;

export function exactCoreBuildIdentity(env = process.env, git = execFileSync) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request' ||
      env.GITHUB_BASE_REF !== 'codex/public-book-library' ||
      !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') ||
      !/^[1-9]\d*$/.test(env.HH_PR_NUMBER || '') ||
      ![env.GITHUB_SHA,env.HH_HEAD_SHA,env.HH_EVENT_BASE_SHA].every(x=>SHA.test(x||''))) return null;
  const pr=Number(env.HH_PR_NUMBER);
  if (!positiveId(pr)) return null;
  const opts={encoding:'utf8',maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe'],timeout:4000};
  try {
    const get=(...args)=>String(git('git',args,opts));
    const rev=ref=>get('rev-parse',ref).trim();
    const merge=rev('HEAD'),head=rev('HEAD^2'),base=rev('HEAD^1');
    if (merge!==env.GITHUB_SHA || head!==env.HH_HEAD_SHA || base!==env.HH_EVENT_BASE_SHA) return null;
    // A PR cannot define its own Core evidence. Require the checked-out Core
    // workflow to be byte-identical to the actual protected tested BASE.
    const trusted=get('show',base+':'+CORE_WORKFLOW);
    if (!trusted.includes(CORE_IDENTITY) || !trusted.includes(CORE_BUILD_STEP) ||
        !trusted.includes('run: npm run build -- --no-lint') ||
        trusted!==get('show','HEAD:'+CORE_WORKFLOW)) return null;
    const manifest=JSON.parse(get('show','HEAD:package.json'));
    if (manifest.scripts?.build!=='next build' ||
        typeof manifest.scripts?.prebuild!=='string' || !manifest.scripts.prebuild.trim()) return null;
    return {repo:env.GITHUB_REPOSITORY,pr,merge,head,base};
  } catch { return null; }
}

export function exactCoreIdentityLog(log, identity, run) {
  if (typeof log!=='string') return false;
  // Ignore the shell command printed by Actions; only accept the unique
  // standalone runtime marker emitted by the BASE-identical ancestry step.
  const lines=log.split(/\r?\n/).map(line=>line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z\s+/,''));
  const markers=lines.flatMap((line,index)=>line.startsWith(CORE_IDENTITY+' ')?[index]:[]);
  const wanted=[CORE_IDENTITY,identity.pr,run.id,run.run_attempt,identity.merge,identity.head,identity.base].join(' ');
  // Independently require checkout@v4's actual checked-out SHA and the
  // marker before the first candidate-controlled readiness script runs.
  const checkout=lines.findIndex(line=>line==='[command]/usr/bin/git log -1 --format=%H');
  const readiness=lines.findIndex(line=>line==='##[group]Run node scripts/ci-pr-readiness.mjs');
  return markers.length===1 && checkout>=0 && readiness>checkout+1 &&
    lines[checkout+1]?.trim()===identity.merge &&
    markers[0]>checkout+1 && markers[0]<readiness && lines[markers[0]].trim()===wanted;
}

export function verifiedCompletedCoreBuild(identity, read) {
  if (!identity || typeof read!=='function') return null;
  try {
    const prefix='/repos/'+identity.repo+'/actions';
    const result=read(prefix+'/workflows/hh-pr-core-release.yml/runs?event=pull_request&head_sha='+identity.head+'&per_page=10');
    if (!Array.isArray(result?.workflow_runs)) return null;
    // The whole Core workflow can still be waiting for this very Specialist.
    // Read the completed build JOB, not the entire workflow conclusion.
    const candidates=result.workflow_runs.filter(run=>positiveId(run.id) && positiveId(run.run_attempt) &&
      run.event==='pull_request' && run.head_sha===identity.head &&
      run.head_repository?.full_name===identity.repo &&
      String(run.path||'').split('@')[0]===CORE_WORKFLOW).slice(0,2);
    for (const run of candidates) {
      const jobs=read(prefix+'/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100');
      if (!Array.isArray(jobs?.jobs) || jobs.total_count!==jobs.jobs.length) continue;
      const core=jobs.jobs.filter(job=>job.name==='core-lint-types-build');
      if (core.length!==1) continue;
      const job=core[0];
      if (!positiveId(job.id) || job.run_id!==run.id || job.status!=='completed' ||
          job.conclusion!=='success' || !Array.isArray(job.steps)) continue;
      const builds=job.steps.filter(step=>step.name===CORE_BUILD_STEP);
      const ancestry=job.steps.filter(step=>step.name==='Verify bounded shallow scope ancestry before PR routing');
      if (builds.length!==1 || builds[0].status!=='completed' || builds[0].conclusion!=='success' ||
          ancestry.length!==1 || ancestry[0].status!=='completed' || ancestry[0].conclusion!=='success') continue;
      if (exactCoreIdentityLog(read(prefix+'/jobs/'+job.id+'/logs',true),identity,run))
        return {runId:run.id,attempt:run.run_attempt,jobId:job.id};
    }
  } catch { /* A read-only optimization can never manufacture a green build. */ }
  return null;
}

function coreBuildReader() {
  const deadline=Date.now()+10_000;
  return (endpoint,raw=false)=>{
    const remaining=deadline-Date.now();
    if (remaining<=0) throw Error('Core build proof budget exhausted');
    const out=execFileSync('gh',['api','--hostname','github.com',endpoint],{
      encoding:'utf8',maxBuffer:24*1024*1024,timeout:Math.min(remaining,4000),
      stdio:['ignore','pipe','pipe'],
    });
    return raw?out:JSON.parse(out);
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv[2]==='--core-plan'){
    console.log(exactCoreBuildIdentity()?'REUSE_CANDIDATE':'INDEPENDENT_BUILD');
  } else if(process.argv[2]==='--core-proof'){
    const proof=verifiedCompletedCoreBuild(exactCoreBuildIdentity(),coreBuildReader());
    if(proof){
      console.log('HH_SITE_VIDEO_CORE_BUILD_REUSED: '+JSON.stringify(proof));
      if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        'Exact successful Core production build reused: run '+proof.runId+', attempt '+proof.attempt+', job '+proof.jobId+'\n');
    } else {
      console.log('HH_SITE_VIDEO_CORE_BUILD_FALLBACK: exact successful Core evidence unavailable');
      process.exitCode=1;
    }
  } else {
  const choice=classifyExactSiteVideo();
  console.log('Site Video PR browser impact',choice);
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'full='+choice.full+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    'Site Video real browser: '+(choice.full?'required':'DEFERRED TO MANUAL/PRODUCTION')+
    ' ('+choice.reason+')\n');
  }
}
