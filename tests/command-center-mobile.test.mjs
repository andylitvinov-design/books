import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('app/admin/command-center/page.tsx');
const client=read('app/admin/command-center/command-center-mobile.jsx');
const css=read('app/admin/command-center/command-center-mobile.module.css');
const manifest=JSON.parse(read('public/command-center.webmanifest'));

test('Command Center mobile stays owner-only and reads real database state',()=>{
 assert.match(page,/requireAdminRequest\(\)/);
 assert.match(page,/redirect\('\/admin\/login'\)/);
 assert.match(page,/readCommandSnapshot\(db\)/);
 assert.match(page,/initialSnapshot=\{snapshot\}/);
 assert.match(client,/fetch\('\/api\/admin\/command-center'/);
 assert.match(client,/credentials:'same-origin'/);
 assert.match(client,/router\.refresh\(\)/);
});
test('Mobile PWA contract and independent application entry',()=>{
 assert.equal(manifest.id,'/admin/command-center');
 assert.equal(manifest.start_url,'/admin/command-center');
 assert.equal(manifest.display,'standalone');
 assert.ok(manifest.scope.startsWith('/admin/'));
 assert.match(page,/manifest:'\/command-center\.webmanifest'/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/max-width:340px/);
});
test('Mobile UI has five bottom destinations with one quick task action',()=>{
 assert.match(client,/\['home',t\.home\]/);
 assert.match(client,/\['tasks',t\.tasks\]/);
 assert.match(client,/\['plus',t\.plus\]/);
 assert.match(client,/\['agents',t\.agents\]/);
 assert.match(client,/\['projects',t\.projects\]/);
 assert.match(client,/send\('create_task'/);
 assert.match(client,/send\('create_project'/);
 assert.match(client,/task_ready/);
});
test('PR, testing and LIVE progress are never inferred from a merge',()=>{
 assert.match(client,/const merged=Boolean\(observed\?\.merged\)/);
 assert.match(client,/\{label:t\.tests,ok:false/);
 assert.match(client,/\{label:t\.live,ok:selectedTask\?\.state==='completed_live'/);
 assert.match(client,/t\.noLive/);
 assert.match(client,/prMatched&&latestEvidence\?t\.prOpened:t\.prWaiting/);
 assert.doesNotMatch(client,/markProductionLive|fakeAgentComplete|mockRuns/);
});
test('English, Russian and Spanish copy share the same real data',()=>{
 assert.match(client,/const labels=\{/);
 assert.match(client,/\sru:\{/);
 assert.match(client,/\sen:\{/);
 assert.match(client,/\ses:\{/);
 assert.match(client,/const tasks=snapshot\?\.tasks\|\|\[\]/);
 assert.match(client,/const \[snapshot,setSnapshot\]=useState\(initialSnapshot\)/);
});
test('Every required mobile class name is present',()=>{
 const classes=[...new Set([...client.matchAll(/styles\.([A-Za-z][A-Za-z0-9]*)/g)].map(m=>m[1]))];
 for(const name of classes)assert.match(css,new RegExp('\\.'+name+'(?=[,{.:\\s])'),name);
});
