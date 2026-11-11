import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectProgress} from '../lib/project-management/plans.mjs';
import {buildExecutiveBrief} from '../lib/command-center/contracts.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('progress counts verified receipts, never an unsupported completed state',()=>{
 assert.deepEqual(projectProgress([]),{verified:0,total:0,ratio:null});
 assert.deepEqual(projectProgress([{state:'completed_verified',has_evidence:false},
  {state:'completed_verified',has_evidence:true},{state:'planned'}]),
  {verified:1,total:3,ratio:1/3});
 assert.equal(projectProgress([{state:'completed_verified'}]).verified,0);
 assert.equal(buildExecutiveBrief({tasks:[{state:'completed_verified',has_evidence:false}]}).verified,0);
 assert.equal(buildExecutiveBrief({tasks:[{state:'completed_verified',has_evidence:true}]}).verified,1);
});

test('Command Center snapshot proves receipts rather than taking raw user-edited status as proof',()=>{
 const store=read('lib/command-center/store.mjs');
 assert.match(store,/readCommandSnapshot\(db,\{limit=100\}/);
 assert.match(store,/FROM \$\{EVIDENCE\} e WHERE e\.task_id=t\.id AND e\.verifier='github_api'/);
 assert.match(store,/AS has_evidence/);
 assert.match(store,/AS missing_proof/);
 assert.match(store,/missingProof:counts\.rows\[0\]\.missing_proof/);
 assert.doesNotMatch(store,/GRANT\s+.*TO\s+(anon|authenticated)/i);
});

test('Project Management reads independent evidence without overwriting existing execution gateway',()=>{
 const store=read('lib/project-management/store.mjs');
 const client=read('app/admin/project-management/project-management-client.jsx');
 assert.match(store,/app_private\.cc_evidence e/);
 assert.match(store,/AS has_evidence/);
 assert.match(store,/reservePmExecution/);
 assert.match(client,/projectProgress\(tasks\)\.verified/);
 assert.match(client,/needsEvidence/);
 assert.match(client,/deliveryLabel\(/);
 assert.match(client,/prepare_execution|launch_execution/);
 assert.match(client,/t\.noLive/);
});

test('Mobile status never turns absent evidence into green agent completion',()=>{
 const ui=read('app/admin/command-center/command-center-mobile.jsx');
 const css=read('app/admin/command-center/command-center-mobile.module.css');
 for(const label of ['Нет независимого подтверждения',
  'No independent verification receipt','Sin comprobante independiente'])
  assert.ok(ui.includes(label),label);
 assert.match(ui,/stateLabel\(v\.state,t,v\.has_evidence\)/);
 assert.match(ui,/stateLabel\(selectedTask\.state,t,selectedTask\.has_evidence\)/);
 assert.match(ui,/verifiedStates\.has\(v\.state\)&&v\.has_evidence===true/);
 assert.match(ui,/snapshot\?\.brief\?\.missingProof>0/);
 assert.match(css,/\.auditGap\{/);
 assert.doesNotMatch(ui,/markProductionLive|mockRuns/);
});
