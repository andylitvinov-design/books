'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const context=require('../pr-context-comments.js');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('PR owner correction links all PRs, original task, exact head and newest action',()=>{
 const prompt=context.makePrompt({kind:'task',title:'Safari export',text:'Устранить проблему, проверить загрузку видео',
  prs:[3836,3833,3836],context:'Video Studio; в работе',evidence:[{
   number:3836,title:'Safari',body:'Original issue',status:'OPEN',base:'codex/public-book-library',
   head:'a'.repeat(40),updated:'2026-11-07',commit:'latest real commit',checks:'Core PENDING',comments:'owner asked to fix'
  }]});
 assert.match(prompt,/НОВЫЙ КОММЕНТАРИЙ ВЛАДЕЛЬЦА/);assert.match(prompt,/Original issue/);
 assert.match(prompt,/#3836/);assert.match(prompt,/#3833/);
 assert.match(prompt,/latest real commit/);assert.match(prompt,/Core PENDING/);
 assert.match(prompt,/Остальные|Не загружено подробно/);
 assert.match(prompt,/ЧТО НАДО ВЫПОЛНИТЬ/);
 assert.match(prompt,/КОНТЕКСТ БИЗНЕСА И ПРОЕКТА/);
 assert.match(prompt,/Очередь != запуск агента/);
});
test('task without PR remains commentable; PR without identity is rejected',()=>{
 assert.deepEqual(context.numbers([1,1,'2',null,{number:3}]),[1,2,3]);
 assert.match(context.makePrompt({kind:'task',title:'Design',text:'Увеличить шрифт',prs:[]}),/PR ещё не создан/);
 assert.throws(()=>context.makePrompt({kind:'pr',title:'x',text:'Добавить текст',prs:[]}),/INVALID_COMMENT_PR/);
 const result=context.makePrompt({kind:'pr',title:'x',text:'A'.repeat(3000),prs:[7]});
 assert.ok(result.length<=14900);assert.ok(result.includes('A'.repeat(1700)));
});
test('buttons on grouped tasks, individual PR and primary cards, preserve protected handoff',()=>{
 const ui=src('pr-task-tree.js'),main=src('project-management-public.js'),transfer=src('commander-transfer.js');
 assert.match(ui,/HHPRContextComments\?\.mount/);assert.match(main,/HHPRContextComments\?\.mount/);
 assert.match(transfer,/relatedPr/);assert.match(src('task-editor.js'),/addPriorContext/);
 for(const html of ['projects.html','project-management-public.html']){
  const page=src(html);assert.match(page,/pr-context-comments.js/);
  assert.ok(page.indexOf('/pr-context-comments.js')<page.indexOf('/pr-task-tree.js'));
 }
 const comments=src('pr-context-comments.js');
 assert.match(comments,/SpeechRecognition/);assert.match(comments,/HHCommanderTransfer\.begin/);
 assert.doesNotMatch(comments,/workflow_dispatch|method:\s*['"]POST['"]|HH_PM_GITHUB_WRITE_TOKEN|setInterval/);
 assert.match(src('pr-task-tree.css'),/hh-pt-comment-toggle/);
});
