import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function host(block=false){
 const saved=new Map(),visits=[],note={textContent:''};
 const win={crypto:{randomUUID:()=> '12345678-1234-4234-9234-123456789abc'},
  sessionStorage:{setItem:(key,value)=>{if(block)throw Error('blocked');saved.set(key,value)},
   getItem:key=>saved.get(key),removeItem:key=>saved.delete(key)},
  location:{assign:url=>visits.push(url)}};
 vm.runInNewContext(read('commander-transfer.js'),{window:win,module:{exports:{}}});
 return {win,visits,saved,note};
}
test('same-origin handoff opens protected editor in the current tab, not Holistic House',()=>{
 const h=host();
 assert.equal(h.win.HHCommanderTransfer.begin({raw:'Классифицировать существующие открытые PR и доделать прежнюю задачу',
  fullPrompt:'Полный промпт для исполнителя'},h.note),true);
 assert.deepEqual(h.visits,['/task-editor.html']);
 const packet=JSON.parse(h.saved.get('hh.commander.handoff.v2'));
 assert.equal(packet.version,2);
 assert.equal(packet.raw,'Классифицировать существующие открытые PR и доделать прежнюю задачу');
 assert.equal(packet.fullPrompt,'Полный промпт для исполнителя');
 assert.match(h.note.textContent,/ещё не сохранена/);
 assert.doesNotMatch(read('commander-transfer.js'),/holistichouse\.vercel\.app|postMessage|window\.open|workflow_dispatch|fetch\(/);
});
test('transfer rejects empty tasks and blocked ephemeral transport',()=>{
 const empty=host();assert.equal(empty.win.HHCommanderTransfer.begin({raw:'кратко'},empty.note),false);
 assert.equal(empty.visits.length,0);
 const denied=host(true);
 assert.equal(denied.win.HHCommanderTransfer.begin({raw:'Проверить реальные открытые PR и их статусы'},denied.note),false);
 assert.equal(denied.visits.length,0);
 assert.match(denied.note.textContent,/заблокировал передачу/);
});
test('keeps a compact fact-preserving summary for the editor',()=>{
 const h=host();
 const prompt=['1. ЧТО НАДО ВЫПОЛНИТЬ','Найти ранее начатую задачу',
  '2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ','Есть исходный PR',
  '3. ОРИЕНТИРЫ КАЧЕСТВА','GitHub',
  '4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА','Agent Commander'].join('\n');
 const result=h.win.HHCommanderTransfer.summarize('Проверить старые PR',prompt);
 assert.ok(result.includes('GitHub')&&result.includes('Agent Commander')&&result.length<=800);
 assert.match(read('commander-task-input.js'),/HHCommanderTransfer\.begin/);
 assert.match(read('project-management-nav.js'),/commander-transfer\.js/);
});
test('stale source edits are still blocked before transfer',()=>{
 const ui=read('commander-task-input.js');
 assert.match(ui,/area\.dataset\.sourceRaw=raw/);
 assert.match(ui,/area\.dataset\.sourceRaw!==input\.value\.trim\(\)/);
 assert.match(ui,/Описание изменилось после разбора/);
});
