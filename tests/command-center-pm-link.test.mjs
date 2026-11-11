import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile Projects tab links to the actual owner-only Project Management, not a parallel app',()=>{
 const ui=read('app/admin/command-center/command-center-mobile.jsx');
 const css=read('app/admin/command-center/command-center-mobile.module.css');
 assert.match(ui,/import Link from 'next\/link'/);
 assert.match(ui,/<Link href="\/admin\/project-management" className=\{styles\.pmShortcut\}/);
 for(const token of ["pm:'Большие задачи и планы'","pm:'Major tasks and plans'","pm:'Grandes tareas y planes'"])
  assert.ok(ui.includes(token),token);
 for(const token of ['.pmShortcut{','.pmSymbol{','.pmCopy{','.pmArrow{'])
  assert.ok(css.includes(token),token);
 assert.doesNotMatch(ui,/<iframe|PUBLIC_GITHUB_TOKEN|NEXT_PUBLIC_ADMIN/i);
});
test('destination is private, authenticated and uses existing PM task graph',()=>{
 const page=read('app/admin/project-management/page.tsx');
 const api=read('app/api/admin/project-management/route.js');
 const store=read('lib/project-management/store.mjs');
 assert.match(page,/requireAdminRequest\(\)/);
 assert.match(page,/redirect\('\/admin\/login'\)/);
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/CROSS_ORIGIN_DENIED/);
 assert.match(store,/app_private\.cc_tasks/);
 assert.match(store,/app_private\.cc_projects/);
 assert.match(store,/inspectCommandTaskDelivery|pmTaskSource/);
});
test('Project Management remains mobile-first, uses Command Center colors and never invents LIVE',()=>{
 const css=read('app/admin/project-management/project-management.module.css');
 const client=read('app/admin/project-management/project-management-client.jsx');
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/max-width:600px/);
 assert.match(css,/#9861e6/);
 assert.match(client,/t\.noLive/);
 assert.match(client,/deliveryLabel\(/);
 assert.doesNotMatch(client,/fakePR|mockAgent|markProductionLive/);
});
