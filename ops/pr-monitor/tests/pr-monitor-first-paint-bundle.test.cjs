'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('pr-monitor.html');
const css=read('pr-monitor-bundle.css');
const links=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(x=>x[0]);
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi)].map(x=>x[0]);
test('all canonical entrypoints keep the complete first-paint PR Monitor, not the 2-chart lite page',()=>{
 assert.equal(read('index.html'),html);
 assert.equal(read('pr-monitor-full.html'),html);
 assert.match(html,/id="hh-project-management-nav"/);
 assert.match(html,/id="diagnostics-mount"/);
 assert.match(html,/id="quick-signal"/);
 assert.doesNotMatch(html,/id="pr-monitor-fast"/);
});
test('only one render-blocking CSS request, bundled original styles plus Commander',()=>{
 assert.equal(links.length,1);
 assert.match(links[0],/\/pr-monitor-bundle\.css/);
 assert.ok(css.length>115000,css.length);
 const sources=[...css.matchAll(/HH CSS original (\/[a-z0-9-]+\.css)/g)].map(x=>x[1]);
 assert.equal(sources.length,27);
 assert.equal(new Set(sources).size,27);
 assert.doesNotMatch(css,/@import\s+url\(/);
 assert.match(css,/#hh-cc-dock/);
 assert.match(css,/#hh-pr-top-graphs/);
});
test('all original scripts are preserved, deferred and non parser-blocking',()=>{
 assert.equal(scripts.length,33);
 assert.ok(scripts.every(tag=>/\bdefer\b/.test(tag)),'no synchronous script in HTML head');
 for(const name of ['pr-two-screen-pre.js','monitor-core.js','pr-stage-dashboard.js','pr-two-screen.js',
  'pr-trends.js','pr-merge-velocity-ui.js','pr-lifecycle-ribbon.js','pr-recommendations.js',
  'pr-error-funnel.js','project-management-nav.js','pr-dense-view.js'])
  assert.ok(scripts.some(s=>s.includes('/'+name)),name);
 assert.ok(scripts.some(s=>s.includes('data-pr-stage-only')&&s.includes('pr-two-screen.js')));
});
test('all Agent Commander tabs have source first-paint fallback links',()=>{
 for(const name of ['briefing.html','agents.html','automations.html','chats.html','projects.html',
  'skills.html','project-management-public.html','task-editor.html'])
  assert.ok(html.includes('href="/'+name+'"'),name);
});
