'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const full=read('pr-monitor-full.html');
const fast=read('pr-monitor-fast.html');
test('all canonical entrypoints are byte-identical full PR monitoring',()=>{
 assert.equal(read('index.html'),full);
 assert.equal(read('pr-monitor.html'),full);
 assert.ok(full.length>7000);
 assert.notEqual(full,fast);
 assert.ok(!full.includes('id="activity-graph"'));
});
test('all original deep monitoring, repaired cohorts, CI and both charts remain referenced',()=>{
 for(const asset of ['monitor-core.js','pr-stage-dashboard.js','ci-journey-dashboard.js',
   'pr-two-screen.js','pr-merge-velocity-ui.js','pr-trends.js',
   'pr-recommendations.js','pr-error-funnel.js','pr-lifecycle-ribbon.js',
   'pr-dense-view.js','pr-compact-top.js'])
  assert.ok(full.includes('/'+asset),'missing '+asset);
 assert.ok(full.includes('id="diagnostics-mount"'));
 assert.ok(full.includes('id="quick-signal"'));
});
test('agent management has first-paint links before JS and preserved seven-tab dock',()=>{
 const nav=full.match(/<nav id="hh-project-management-nav"[\s\S]*?<\/nav>/);
 assert.ok(nav);
 for(const path of ['/briefing.html','/pr-monitor.html','/project-management-public.html',
   '/agents.html','/automations.html','/chats.html','/projects.html','/skills.html','/task-editor.html'])
  assert.ok(nav[0].includes('href="'+path+'"'),'missing first-paint link '+path);
 assert.ok(full.includes('src="/project-management-nav.js'));
 const css=read('pr-monitor-restored.css');
 assert.ok(css.includes('hh-monitor-static-nav'));
 assert.ok(css.includes('body.hh-cc-shell'));
});
test('lite graph summary stays optional and no default redirect/loader replaces full monitor',()=>{
 assert.ok(fast.includes('id="activity-graph"'));
 assert.ok(fast.includes('id="latency-graph"'));
 assert.ok(!full.includes('http-equiv="refresh"'));
 assert.ok(!full.includes('Загружаю проверенный монитор PR'));
 assert.ok(!full.includes('src="/pr-monitor-fast.js'));
});
