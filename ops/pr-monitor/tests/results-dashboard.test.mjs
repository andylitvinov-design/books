import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('results-metrics.json'));
test('results hub exists in the original five-tab Commander shell',()=>{
 assert.match(read('results.html'),/project-management-nav\.js/);
 assert.match(read('results.html'),/id="hh-results-root"/);
 assert.match(read('project-management-nav.js'),/\/results\.html/);
 assert.match(read('commander-ui.js'),/Результаты по направлениям/);
 assert.match(read('project-management-nav.js'),/Главная/);
 assert.match(read('project-management-nav.js'),/Создать/);
});
test('metadata-only source snapshot uses exact counts and distinguishes verification',()=>{
 assert.equal(data.schema,'HH_RESULTS_SNAPSHOT_V1');
 assert.equal(data.refreshMode,'manual_snapshot_not_live');
 assert.equal(data.observedDate,'2026-11-07');
 const vals=Object.fromEntries(data.video.metrics.map(x=>[x.id,x.value]));
 assert.equal(vals.mp4,740);assert.equal(vals.local,56);
 assert.equal(vals.motion,684);assert.equal(vals.mp4,vals.local+vals.motion);
 assert.equal(vals.topics,'29/64');assert.equal(vals.four,'17/64');assert.equal(vals.story,0);
 assert.deepEqual(data.video.coverage.map(x=>[x.count,x.total]),[[29,64],[17,64]]);
 assert.ok(data.video.gaps.some(x=>x.includes('35 из 64')));
});
test('public page never fetches private admin, vault, GitHub or schedules refresh',()=>{
 const js=read('results.js'),html=read('results.html');
 assert.match(js,/fetch\('\/results-metrics\.json'/);
 assert.match(js,/cache:'no-store'/);
 assert.doesNotMatch(js,/setInterval|setTimeout|api\/admin|supabase|service_role|api\.github\.com|fetch\(.*holistichouse/i);
 assert.doesNotMatch(js+html,/workflow_dispatch|method:'POST'|localStorage|sessionStorage/);
 assert.match(js,/aria-valuenow/);
 assert.match(js,/Источник ещё не подключён/);
 assert.match(js,/Неизвестная схема/);
});
test('all new destinations are read-only and mobile friendly',()=>{
 const css=read('results.css'),html=read('results.html');
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/no-referrer/);
 assert.equal(data.sections.find(x=>x.id==='pr').url,'/pr-monitor.html');
 assert.equal(data.sections.find(x=>x.id==='video').url,'https://holistichouse.vercel.app/admin/video-library');
 for(const x of data.sections.filter(x=>!['pr','video'].includes(x.id)))assert.equal(x.status,'not_connected');
});
