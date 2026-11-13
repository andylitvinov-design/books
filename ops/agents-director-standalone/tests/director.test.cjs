'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('director has its own root and pages, monitor is external',()=>{
 assert.equal(read('index.html'),read('briefing.html'));
 const nav=read('project-management-nav.js');
 assert.match(nav,/https:\/\/holistic-house-pr-observatory\.vercel\.app/);
 assert.doesNotMatch(nav,/monitor:'\/pr-monitor\.html'/);
 for(const file of ['agents.html','chats.html','automations.html','projects.html','skills.html','task-editor.html'])assert.ok(read(file).length>100);
});
test('old monitor routes only redirect to different project, never render a lite replica',()=>{
 const rules=JSON.parse(read('vercel.json'));
 for(const r of rules.redirects){assert.ok(r.source.startsWith('/'));assert.ok(r.destination.startsWith('https://holistic-house-pr-observatory.vercel.app/'));}
 assert.match(read('project-management-public.html'),/href="https:\/\/holistic-house-pr-observatory\.vercel\.app\/"/);
});
