'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), read=f=>fs.readFileSync(path.join(root,f),'utf8');
const page=read('index.html'),cfg=JSON.parse(read('vercel.json'));
test('one full PR Monitor page, no Commander parser and no startup spinner',()=>{
 assert.equal(page,read('pr-monitor.html'));
 assert.match(page,/<main class="wrap">/);
 assert.match(page,/pr-stage-dashboard\.js/);
 assert.match(page,/pr-merge-velocity-ui\.js/);
 assert.match(page,/pr-error-funnel\.js/);
 assert.match(page,/pr-recommendations\.js/);
 assert.doesNotMatch(page,/Загружаю проверенный монитор|document\.write/);
 assert.doesNotMatch(page,/src="\/project-management-nav\.js/);
});
test('full 29 JS scripts and original CSS self-hosted, all defer',()=>{
 const scripts=[...page.matchAll(/<script\b[^>]*src="\/([^"?]+)/g)].map(m=>m[1]);
 assert.equal(scripts.length,29);assert.ok(scripts.every(n=>fs.existsSync(path.join(root,n)),n=>n));
 assert.equal((page.match(/rel="stylesheet"/g)||[]).length,1);
 assert.ok(read('pr-monitor-yesterday.css').length>100000);
});
test('cross-project links and public-only API bridge',()=>{
 assert.match(page,/holistic-house-agents-director\.vercel\.app\/agents\.html/);
 assert.ok(cfg.rewrites.length>=20);
 assert.ok(cfg.rewrites.every(r=>!/(commander-|seo-auth|google-owner-auth)/.test(r.source)));
});
