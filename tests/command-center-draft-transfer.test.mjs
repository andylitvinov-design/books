import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachCommanderDraftReceiver,validateIncomingDraft,COMMANDER_ORIGIN,COMMANDER_PROTOCOL} from '../lib/command-center/task-transfer-receiver.mjs';
const src=()=>readFileSync(new URL('../app/admin/command-center/command-center-mobile.jsx',import.meta.url),'utf8');
const nonce='12345678-1234-4234-9234-123456789abc';
const task={title:'Исправить мобильную навигацию',summary:'Проверить пять вкладок и стабильную работу кнопок.',fullPrompt:'1. ЧТО НАДО ВЫПОЛНИТЬ: конкретная доработка'};
function mockWindow(){let handler;return {addEventListener:(_,f)=>{handler=f},removeEventListener:(_,f)=>{if(handler===f)handler=null},emit:e=>handler?.(e)}}
test('strict trusted-origin, same popup, nonce and once-only delivery',()=>{
 const win=mockWindow(),posted=[],sender={postMessage:(v,origin)=>posted.push({v,origin})},other={postMessage(){}},accepted=[];
 const cleanup=attachCommanderDraftReceiver(v=>accepted.push(v),win);
 const hello={protocol:COMMANDER_PROTOCOL,type:'HELLO',nonce},draft={protocol:COMMANDER_PROTOCOL,type:'DRAFT',nonce,task};
 win.emit({origin:'https://other.example',source:sender,data:hello});assert.equal(posted.length,0);
 win.emit({origin:COMMANDER_ORIGIN,source:sender,data:draft});assert.equal(accepted.length,0);
 win.emit({origin:COMMANDER_ORIGIN,source:sender,data:hello});assert.equal(posted.at(-1).v.type,'READY');
 win.emit({origin:COMMANDER_ORIGIN,source:other,data:draft});assert.equal(accepted.length,0);
 win.emit({origin:COMMANDER_ORIGIN,source:sender,data:draft});assert.equal(accepted.length,1);
 assert.equal(posted.at(-1).v.saved,false);assert.equal(posted.at(-1).v.agentStarted,false);
 win.emit({origin:COMMANDER_ORIGIN,source:sender,data:draft});assert.equal(accepted.length,1);
 cleanup();win.emit({origin:COMMANDER_ORIGIN,source:sender,data:hello});assert.equal(posted.length,2);
});
test('untrusted fields and lengths rejected; user review remains required',()=>{
 assert.equal(validateIncomingDraft({...task,privilege:'write'}),null);
 assert.equal(validateIncomingDraft({...task,summary:'x'.repeat(801)}),null);
 assert.equal(validateIncomingDraft({...task,fullPrompt:'x'.repeat(8501)}),null);
 assert.deepEqual(validateIncomingDraft(task),{title:task.title,description:task.summary,fullPrompt:task.fullPrompt});
 const ui=src();
 assert.match(ui,/attachCommanderDraftReceiver/);
 assert.match(ui,/setComposer\(true\)/);
 assert.match(ui,/importedPrompt&&/);
 assert.match(ui,/send\('create_task'/);
 assert.doesNotMatch(ui,/postMessage\([^)]*create_task/);
});
