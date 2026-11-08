import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const ui=require('../task-model-picker.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('only verified zero-price exact :free models selectable',()=>{
  assert.equal(ui.freeModel({id:'vendor/model:free',pricing:{prompt:'0',completion:'0',request:'0'}}),true);
  assert.equal(ui.freeModel({id:'vendor/model',pricing:{prompt:'0',completion:'0'}}),false);
  assert.equal(ui.freeModel({id:'vendor/model:free',pricing:{prompt:'0',completion:'0.01'}}),false);
  assert.equal(ui.freeModel({id:'vendor/model:free',pricing:{prompt:'0'}}),false);
  assert.equal(ui.freeModel({id:'vendor/model:free',pricing:{prompt:'0',completion:'0',special:{usd:1}}}),false);
});
test('only bounded task keys and non-secret free model identifiers saved',()=>{
  assert.ok(ui.validKey('pr:3817'));assert.ok(ui.validKey('ci-head:A01'));
  assert.equal(ui.validKey('pr:foo'),false);assert.equal(ui.validKey('other:A01'),false);
  const saved=ui.readSaved({getItem:()=>JSON.stringify({schema:'HH_PM_PREFERRED_MODELS_V1',items:{'pr:3817':{id:'vendor/model:free',name:'Model',verifiedAt:'2026-11-07'},'pr:bad':{id:'other',verifiedAt:'2026-11-07'}}})});
  assert.deepEqual(Object.keys(saved),['pr:3817']);
});
test('public picker never dispatches jobs, uses keys or paid fallback',()=>{
  const js=read('task-model-picker.js'),css=read('task-model-picker.css'),handoff=read('project-management-selection.js');
  assert.match(js,/HHPM_TASK_MODELS/);assert.match(js,/MutationObserver/);
  assert.match(js,/\/api\/v1\/models/);assert.match(js,/NOT runtime evidence/);
  assert.doesNotMatch(js,/Authorization|workflow_dispatch|service_role|setInterval|api\/v1\/chat\/completions/);
  assert.doesNotMatch(js,/innerHTML/);assert.match(css,/safe-area-inset-bottom/);
  assert.match(handoff,/task-model-picker\.js/);assert.match(handoff,/HHPM_TASK_MODELS/);
  assert.match(handoff,/Execution is NOT started/);
});
