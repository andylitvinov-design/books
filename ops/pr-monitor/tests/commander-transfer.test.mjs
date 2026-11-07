import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const protocol='hh.commander.task-transfer.v1';
function host(){
 let cb=null;const sent=[],note={textContent:''};
 const popup={closed:false,postMessage:(msg,origin)=>sent.push({msg,origin})};
 const win={crypto:{randomUUID:()=> '12345678-1234-4234-9234-123456789abc'},
  open:(url,target)=>{assert.equal(url,'https://holistichouse.vercel.app/admin/command-center');assert.equal(target,'_blank');return popup},
  addEventListener:(_,fn)=>{cb=fn},removeEventListener:(_,fn)=>{if(cb===fn)cb=null},
  setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>2,clearTimeout:()=>{}};
 vm.runInNewContext(read('commander-transfer.js'),{window:win,module:{exports:{}}});
 return {win,popup,note,sent,emit:(msg,origin='https://holistichouse.vercel.app')=>cb?.({origin,source:popup,data:msg})};
}
test('prepares compact four-part summary within the existing private DB limit',()=>{
 const h=host();
 const full=['1. ЧТО НАДО ВЫПОЛНИТЬ','Создать экран','2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ','Safari проверен','3. ОРИЕНТИРЫ КАЧЕСТВА','Linear','4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА','Holistic House'].join('\n');
 const summary=h.win.HHCommanderTransfer.summarize('Сделать новый экран',full);
 assert.ok(summary.includes('Linear')&&summary.includes('Holistic House')&&summary.length<=800);
});
test('no task sent until one-time ready; sending never saves or launches',()=>{
 const h=host();assert.equal(h.sent.length,0);
 assert.equal(h.win.HHCommanderTransfer.begin({raw:'Создать мобильную страницу задач',fullPrompt:'Полный промпт'},h.note),true);
 assert.equal(h.sent[0].msg.type,'HELLO');const nonce=h.sent[0].msg.nonce;
 h.emit({protocol,type:'READY',nonce:'bad'});assert.equal(h.sent.length,1);
 h.emit({protocol,type:'READY',nonce});assert.equal(h.sent.at(-1).msg.type,'DRAFT');
 assert.equal(h.sent.at(-1).msg.task.fullPrompt,'Полный промпт');
 assert.equal(h.sent.at(-1).origin,'https://holistichouse.vercel.app');
 h.emit({protocol,type:'RECEIVED_FOR_REVIEW',nonce,saved:false,agentStarted:false});
 assert.match(h.note.textContent,/Черновик передан/);
 assert.match(read('project-management-nav.js'),/commander-transfer\.js/);
 assert.match(read('commander-task-input.js'),/HHCommanderTransfer\.begin/);
 assert.doesNotMatch(read('commander-transfer.js'),/fetch\(|XMLHttpRequest|workflow_dispatch|localStorage|sessionStorage/);
});

test('source edit invalidates analyzed prompt until owner re-runs breakdown',()=>{
 const ui=read('commander-task-input.js');
 assert.match(ui,/area\.dataset\.sourceRaw=raw/);
 assert.match(ui,/area\.dataset\.sourceRaw!==input\.value\.trim\(\)/);
 assert.match(ui,/Описание изменилось после разбора/);
});
