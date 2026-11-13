'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('pr-monitor-yesterday.html'),css=read('pr-monitor-yesterday.css');
const scripts=[...html.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]);
const cssLinks=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]);
test('restored Nov 11 monitor renders real content without async document rewrite',()=>{
 assert.match(html,/<main class="wrap">/);
 assert.match(html,/id="quick-signal"/);
 assert.match(html,/id="diagnostics-mount"/);
 assert.doesNotMatch(html,/Загружаю проверенный монитор|document\.write|http-equiv="refresh"/);
 assert.equal(cssLinks.length,1);
 assert.ok(cssLinks[0].includes('/pr-monitor-yesterday.css'));
});
test('full PR stages, charts, repairs, recommendations and Commander persist',()=>{
 for(const asset of ['monitor-core.js','pr-stage-dashboard.js','pr-two-screen.js',
   'pr-merge-velocity-ui.js','pr-lifecycle-ribbon.js','pr-error-funnel.js',
   'pr-recommendations.js','project-management-nav.js','ci-jobs-bridge.js'])
  assert.ok(html.includes('/'+asset),'missing original '+asset);
 for(const path of ['/briefing.html','/agents.html','/automations.html','/chats.html',
   '/projects.html','/project-management-public.html','/skills.html'])
  assert.ok(html.includes('href="'+path+'"'),'missing nav '+path);
});
test('no parser-blocking JS, all 31 original JS resources retained',()=>{
 assert.equal(scripts.length,31);
 assert.ok(scripts.every(s=>/\bdefer\b/.test(s)),'all JS deferred');
 assert.match(html,/data-pr-stage-only[^>]*pr-two-screen\.js/);
});
test('CSS preserves original Nov11 waterfall in one file and Commander dock',()=>{
 const items=[...css.matchAll(/\/\* original (\/[a-z0-9-]+\.css) \*\//g)].map(m=>m[1]);
 assert.equal(items.length,25);
 assert.equal(new Set(items).size,24);
 assert.match(css,/#hh-cc-dock/);
 assert.match(css,/#hh-pr-top-graphs/);
 assert.doesNotMatch(css,/@import\s+url\(/);
});
test('root and briefing use original real Commander homepage instead of monitor stub',()=>{
 assert.equal(read('index.html'),read('briefing.html'));
 assert.match(read('index.html'),/Мой брифинг/);
 assert.match(read('index.html'),/project-management-nav\.js/);
 assert.doesNotMatch(read('index.html'),/meta http-equiv="refresh"/);
});
