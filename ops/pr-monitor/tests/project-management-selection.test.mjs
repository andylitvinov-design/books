import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const dir=new URL('../',import.meta.url),read=x=>readFileSync(new URL(x,dir),'utf8');
const app=read('project-management-selection.js'),page=read('project-management-public.js'),html=read('project-management-public.html');
test('selection controls are real and bounded',()=>{assert.match(app,/type='checkbox'/);assert.match(app,/limit=8/);assert.match(app,/window\.HHPM_ASSIGN=\{init,attach\}/);assert.match(page,/HHPM_ASSIGN\?\.attach/);});
test('supported handoffs and no anonymous GitHub write',()=>{assert.match(app,/issues\/new\?/);assert.match(app,/chatgpt\.com/);assert.match(app,/hh-pr-ten-minute-watchdog\.yml/);assert.doesNotMatch(app,/Authorization|service_role|GITHUB_TOKEN|setInterval\(/);});
test('release safeguards and honest statuses',()=>{assert.doesNotMatch(app,/task\.taskStatus/);assert.match(app,/GLOBAL_PR_ONE_PUBLISH_V1/);assert.match(app,/ZERO NEW PAID SERVICES/);assert.match(app,/NOT a dispatch|НЕ отправляла/);assert.match(html,/project-management-selection\.js/);assert.match(html,/project-management-selection\.css/);});
