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

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const choice=classifyExactSiteVideo();
  console.log('Site Video PR browser impact',choice);
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'full='+choice.full+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    'Site Video real browser: '+(choice.full?'required':'DEFERRED TO MANUAL/PRODUCTION')+
    ' ('+choice.reason+')\n');
}
