import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Agent Studio extends the approved single Command Center route without a duplicate PWA',()=>{
 const page=read('app/admin/command-center/page.tsx');
 const manifest=JSON.parse(read('public/command-center.webmanifest'));
 const client=read('app/admin/command-center/command-center-mobile.jsx');
 assert.match(page,/requireAdminRequest/);
 assert.equal(manifest.start_url,'/admin/command-center');
 assert.match(client,/data-hh-command-center-mobile/);
 assert.match(client,/const tabs=\[\['home',t\.home\]/);
});
test('real agent activity and read-only evidence remain provenance bound',()=>{
 const client=read('app/admin/command-center/command-center-mobile.jsx');
 assert.match(client,/const isTrustedEvidenceUrl=/);
 assert.match(client,/andylitvinov-design/);
 assert.match(client,/evidences\.slice\(0,5\)/);
 assert.match(client,/runs\.slice\(0,5\)/);
 assert.match(client,/slots\.slice\(0,4\)/);
 assert.match(client,/run\.worker_id/);
 assert.match(client,/slot\.last_error/);
 assert.match(client,/t\.noLive/);
});
test('immediate safe audit is owner-gated, existing API action, no new worker or unbounded loop',()=>{
 const client=read('app/admin/command-center/command-center-mobile.jsx');
 const api=read('app/api/admin/command-center/route.js');
 assert.match(client,/send\('run_now'\)/);
 assert.match(client,/disabled=\{!enabled\|\|busy\}/);
 assert.match(api,/run_now/);
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/CROSS_ORIGIN_DENIED/);
 assert.match(client,/snapshot\?\.brief\?\.total\?\?tasks\.length/);
 assert.doesNotMatch(client,/setInterval\([^,]+,\s*(?:1000|5000|10000)\)/);
});
test('RU EN ES parity, accessible control stack and no counterfeit LIVE',()=>{
 const client=read('app/admin/command-center/command-center-mobile.jsx');
 const css=read('app/admin/command-center/command-center-mobile.module.css');
 for(const literal of ["activity:'Журнал агентов'","activity:'Agent activity'","activity:'Actividad de agentes'"])
  assert.ok(client.includes(literal),literal);
 assert.match(css,/\.commandStack/);
 assert.match(client,/onClick=\{\(\)=>send\('run_now'\)\}/);
 assert.match(client,/t\.noLive/);
 assert.doesNotMatch(client,/markProductionLive|mockRuns/);
});
