import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {needsFullSiteVideoBrowser,classifyExactSiteVideo} from '../scripts/ci-site-video-scope.mjs';

const one=filename=>[{filename,status:'modified'}];
test('reviewed public-display changes can defer repeated Chromium and Redis E2E',()=>{
  for(const name of ['components/personal-testimonials.tsx',
      'components/site-navigation.tsx','app/[locale]/about/page.tsx',
      'data/about-es.ts','public/images/holistic-house/video-posters/poster.webp',
      '.github/workflows/site-video-browser.yml']){
    assert.equal(needsFullSiteVideoBrowser(one(name)),false,name);
  }
});
test('auth, owner video, API, private UI, unknown and status changes retain full real E2E',()=>{
  for(const name of ['lib/app/session.js','app/api/app/practitioner/open/route.js',
      'app/admin/videos/page.tsx','lib/site-videos/repository.js','components/site-video-manager.tsx',
      'scripts/verify-site-video-admin-browser.mjs','app/es/services/page.tsx','middleware.ts']){
    assert.equal(needsFullSiteVideoBrowser(one(name)),true,name);
  }
  assert.equal(needsFullSiteVideoBrowser(null),true);
  assert.equal(needsFullSiteVideoBrowser([]),true);
  assert.equal(needsFullSiteVideoBrowser([{filename:'components/personal-testimonials.tsx',status:'added'}]),true);
  assert.equal(needsFullSiteVideoBrowser([one('data/about-es.ts')[0],one('lib/app/session.js')[0]]),true);
});
test('manual or production and unverifiable tested merge never defer coverage',()=>{
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'workflow_dispatch'}).full,true);
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'push'}).full,true);
  assert.equal(classifyExactSiteVideo({GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:''}).full,true);
  assert.equal(classifyExactSiteVideo({
    GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:'a'.repeat(40),GITHUB_SHA:'b'.repeat(40)
  },()=>{throw Error('shallow clone');}).full,true);
});
test('exact synthetic HEAD parent determines the scoped path set, not GitHub PR metadata',()=>{
  const head='a'.repeat(40),merge='b'.repeat(40),base='c'.repeat(40);
  const z=String.fromCharCode(0),calls=[];
  const git=(_bin,args)=>{
    calls.push(args);
    if(args[0]==='rev-parse')return ({HEAD:merge,'HEAD^1':base,'HEAD^2':head})[args[1]]+'\n';
    if(args[0]==='diff')return 'M'+z+'components/personal-testimonials.tsx'+z;
    throw Error('Unknown git command');
  };
  const scoped=classifyExactSiteVideo({GITHUB_EVENT_NAME:'pull_request',HH_HEAD_SHA:head,GITHUB_SHA:merge},git);
  assert.deepEqual(scoped,{full:false,reason:'REVIEWED_PUBLIC_DISPLAY_ONLY'});
  assert.deepEqual(calls.find(x=>x[0]==='diff'),
    ['diff','--no-renames','--name-status','-z',base,'HEAD']);
});
test('same existing jobs retain protected browser QA on sensitive PR and manual events',()=>{
  const y=readFileSync(new URL('../.github/workflows/site-video-browser.yml',import.meta.url),'utf8');
  assert.match(y,/workflow_dispatch:/);
  assert.match(y,/node scripts\/ci-site-video-scope\.mjs/g);
  assert.match(y,/postgres:17-alpine/);
  assert.match(y,/redis:7-alpine/);
  assert.match(y,/node scripts\/verify-site-video-admin-browser\.mjs/);
  assert.match(y,/node scripts\/verify-site-video-browser\.mjs/);
  for(const step of ['Build actual application with locked production dependencies',
    'Install pinned Chromium and Redis client for authenticated E2E']){
    assert.ok(y.includes('- name: '+step+"\n        if: github.event_name != 'pull_request' || steps.impact.outputs.full == 'true'"),step);
  }
  assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
