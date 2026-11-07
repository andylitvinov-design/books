import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('standalone root is Commander; existing PR monitor remains available under a route',()=>{
 assert.match(src('index.html'),/data-view="home"/);
 assert.match(src('pr-monitor.html'),/pr-two-screen-boot\.js/);
 assert.doesNotMatch(src('index.html'),/pr-two-screen-boot\.js/);
});
test('one five-action dock is loaded for public Commander and PM views',()=>{
 const nav=src('project-management-nav.js'),css=src('commander-shell.css');
 for(const item of ['Главная','Задачи','Создать','Агенты','Проекты'])assert.ok(nav.includes(item),item);
 assert.match(css,/#hh-cc-dock\{position:fixed/);
 for(const [page,view]of [['index.html','home'],['agents.html','agents'],['projects.html','projects']]){
  assert.match(src(page),new RegExp('data-view="'+view+'"'));
  assert.match(src(page),/project-management-nav\.js/);
 }
 assert.match(src('project-management-public.html'),/project-management-nav\.js/);
 assert.match(src('pr-two-screen-boot.js'),/20261107-cc-v1/);
});
test('public Commander never pretends to create or launch an executor',()=>{
 const nav=src('project-management-nav.js'),ui=src('commander-ui.js');
 assert.match(nav,/holistichouse\.vercel\.app\/admin\/command-center/);
 assert.match(nav,/Публичный монитор не сохраняет и не запускает задания/);
 assert.doesNotMatch(nav+ui,/(supabase\.co|service_role|HH_PR_CRON_DISPATCH_TOKEN|POST['"]|workflow_dispatch)/i);
 assert.match(ui,/HH_PM_PUBLIC_V1/);
 assert.match(ui,/cache:'no-store'/);
 assert.doesNotMatch(ui,/setInterval|setTimeout/);
});
test('mobile safe area, PR original HTML and source snapshot remain unchanged',()=>{
 const css=src('commander-shell.css');
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(src('pr-monitor.html'),/legacy\.html/);
 assert.match(src('pr-two-screen-boot.js'),/legacy\.html/);
});
