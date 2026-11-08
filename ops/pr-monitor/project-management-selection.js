'use strict';
/* Public PM task selection: preparation, not remote execution. No write tokens or hidden requests. */
(function(){
 const selected=new Map(),limit=8,github='https://github.com/andylitvinov-design/books';
 let source=null,panel=null,summary=null,mode=null,trigger=null,notes=null,result=null;
 const methods={work:'ChatGPT Work: ручная передача текста',issue:'GitHub Issue: задание, подтверждаемое в GitHub',repair:'GitHub Repair Worker: только один разрешённый RED PR',free:'OpenRouter Free · технический совет через GitHub secret'};
 const modelLoader=document.createElement('script');
 modelLoader.src='/task-model-picker.js?v=20261107-v1';modelLoader.async=true;
 document.head.appendChild(modelLoader);
 const mk=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
 const btn=(text,cb,cls='pm-btn')=>{const e=mk('button',cls,text);e.type='button';e.addEventListener('click',cb);return e};
 const link=(text,url)=>{const e=mk('a','pm-handoff-link',text);e.href=url;e.target='_blank';e.rel='noopener noreferrer';return e};
 const id=(p,t)=>p.key+':'+t.id;
 const notice=text=>{if(notes)notes.textContent=text};
 function update(){
  if(summary)summary.textContent=selected.size+' / '+limit+' выбрано';
  if(trigger)trigger.disabled=selected.size===0;
  document.querySelectorAll('.pm-task-check').forEach(c=>{
    c.checked=selected.has(c.value);c.disabled=!c.checked&&selected.size>=limit;
  });
 }
 function resetResult(){if(result)result.replaceChildren()}
 function choose(p,s,t,checked){
  const key=id(p,t);
  if(checked&&selected.size>=limit&&!selected.has(key)){notice('Максимум 8 задач в одном пакете.');update();return}
  if(checked)selected.set(key,{key,project:p,stage:s,task:t});
  else selected.delete(key);
  resetResult();update();
  notice(selected.size?'Выберите исполнителя и подготовьте передачу. Исполнение пока не запущено.':'Отметьте нужные подзадачи галочками.');
 }
 function attach(card,task,stage,project){
  if(card.querySelector('.pm-task-check'))return;
  const label=mk('label','pm-task-check-label'),input=mk('input','pm-task-check');
  input.type='checkbox';input.value=id(project,task);input.setAttribute('aria-label','Выбрать задачу '+task.id);
  input.addEventListener('change',()=>choose(project,stage,task,input.checked));
  label.append(input,mk('span',null,'Выбрать для исполнителя'));
  card.insertBefore(label,card.firstChild);update();
 }
 function packet(){
  const tasks=[...selected.values()];
  return [
   'HOLISTIC HOUSE · PROJECT MANAGEMENT · OWNER TASK HANDOFF',
   'Repository: andylitvinov-design/books',
   'Production branch: codex/public-book-library',
   'Control branch: codex/bootstrap-books',
   'Snapshot: '+(source?.asOf||'UNKNOWN'),
   'Executor selected: '+methods[mode.value],
   'Owner-selected tasks: '+tasks.length,
   ...tasks.map(x=>'- '+x.key+' · '+x.project.title+' / '+x.stage.title+' / '+x.task.title+' · '+(x.task.status||'UNKNOWN')+
    (x.task.prs?.length?' · PR '+x.task.prs.map(n=>'#'+n).join(', '):' · no linked PR')),
   ...tasks.flatMap(x=>{
    const own=window.HHPM_TASK_MODELS?.get(x.key);
    const linked=(x.task.prs||[]).map(pr=>({pr,model:window.HHPM_TASK_MODELS?.get('pr:'+pr)})).filter(v=>v.model);
    return [...(own?['Preferred OpenRouter for '+x.key+': '+own.id+' (device-only, revalidate at execution)']:[]),
      ...linked.map(v=>'Preferred OpenRouter for PR #'+v.pr+': '+v.model.id+' (device-only, revalidate at execution)')];
   }),
   '',
   'Read AGENTS.md, GLOBAL_PR_ONE_PUBLISH_V1 and docs/operations/CI_RELEASE_POLICY.md BEFORE edits.',
   'Verify current issue, PR, exact HEAD, lease, actual acceptance and duplicate root. Reuse existing PR.',
   'Do not make no-op edits or change protected branches. One coherent commit; full Core, Specialist and hh-merge-check.',
   'Separate source commit, CI green, protected merge, Vercel READY and functional LIVE proof.',
   'ZERO NEW PAID SERVICES; no extra model, runner, cron, token or bypass. Stop on unknown or manual hold.',
   'Model preference does not select or switch a running agent. Validate free catalog and record actual model/run evidence on executor side.',
   'Execution is NOT started by creating this handoff.',
   'https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md'
  ].join('\n');
 }
 function render(title,text){
  resetResult();result.append(mk('h3',null,title),mk('p','pm-handoff-caveat','Задание подготовлено. Исполнитель ещё не запущен.'));
  const field=mk('textarea','pm-handoff-text');field.value=text;field.readOnly=true;field.rows=9;
  field.setAttribute('aria-label','Текст задания исполнителю');result.append(field);
  result.append(btn('Копировать задание',()=>{
   if(!navigator.clipboard?.writeText){field.focus();field.select();notice('Выделенный текст скопируйте вручную.');return}
   navigator.clipboard.writeText(text).then(()=>notice('Скопировано. Вставьте текст исполнителю и отправьте.')).catch(()=>{field.focus();field.select();notice('Копирование заблокировано; выделите текст вручную.')});
  },'pm-btn pm-quiet'));
 }
 function doWork(){
  const text=packet();render('ChatGPT Work · передача вручную',text);
  result.append(link('Открыть ChatGPT и вставить задание','https://chatgpt.com/'));
  notice('Необходимо вставить задание в ChatGPT Work и отправить его. До этого исполнение не начато.');
 }
 function doIssue(){
  const text=packet(),tasks=[...selected.values()];
  const title=(tasks.length===1?'[HH-PM] '+tasks[0].key+' · '+tasks[0].task.title:'[HH-PM] Пакет '+tasks.length+' задач').slice(0,115);
  const params=new URLSearchParams({title,body:'<!-- HH_PM_TASK_ASSIGNMENT_V1 -->\nHH-PM-TASKS: '+tasks.map(x=>x.key).join(', ')+'\nOwner-approved creation required; this is not an AI launch.\n\n'+text,assignees:'andylitvinov-design'});
  const url=github+'/issues/new?'+params.toString();
  if(url.length>7900){notice('Пакет слишком большой для GitHub Issue. Выберите меньше задач.');return}
  render('GitHub Issue · закрепить за исполнителем',text);
  result.append(link('Продолжить создание задания в GitHub',url));
  result.append(mk('p','pm-handoff-warning','GitHub создаст Issue только после вашего подтверждения. Назначение AI-агента отдельно, автоматического платного агента здесь нет.'));
  notice('Задание подготовлено; подтвердите создание Issue на GitHub.');
 }
 async function doRepair(){
  if(selected.size!==1){notice('Repair Worker принимает только одну задачу и один PR.');return}
  const task=[...selected.values()][0].task;
  if(task.prs?.length!==1){notice('Для Repair Worker нужен ровно один PR.');return}
  const prNumber=task.prs[0];trigger.disabled=true;notice('Проверка допустимости текущего PR…');
  try{
   const response=await fetch('https://api.github.com/repos/andylitvinov-design/books/pulls/'+prNumber,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw Error('GitHub HTTP '+response.status);
   const pr=await response.json(),labels=new Set((pr.labels||[]).map(x=>x.name));
   if(pr.number!==prNumber||pr.state!=='open'||pr.draft||pr.base?.ref!=='codex/public-book-library'||pr.head?.repo?.full_name!=='andylitvinov-design/books'||!/^[0-9a-f]{40}$/i.test(pr.head?.sha||'')||
   !labels.has('hh:repair-needed')||['hh:repair-manual','hh:hold','hh:blocked','hh:worker-claimed'].some(x=>labels.has(x)))throw Error('Нет подтверждённого допуска: требуется текущий открытый PR с repair-needed без hold/manual.');
   const text=packet()+'\npm_pr_number: '+prNumber+'\npm_expected_sha: '+pr.head.sha+'\ndry_run: false\n\nPRELIMINARY only. Trusted Watchdog must verify signed failed Core, leases and quota independently.';
   render('Repair Worker · предварительная проверка',text);
   const cmd='!pm repair '+prNumber+' '+pr.head.sha;
   const publicArea=mk('textarea','pm-handoff-text');publicArea.rows=2;publicArea.readOnly=true;publicArea.value=cmd;
   publicArea.setAttribute('aria-label','Публичная команда Repair для владельца');
   result.append(mk('p','pm-handoff-warning','Альтернативный безопасный запуск: скопируйте техническую команду ниже, откройте публичный GitHub Agent Inbox #3890 и подтвердите её комментарий. Watchdog повторно проверит exact HEAD и signed Core.'),
     publicArea,link('Открыть PM Agent Inbox #3890',github+'/issues/3890#new_comment_field'));
   result.append(link('Или запустить существующий Watchdog вручную',github+'/actions/workflows/hh-pr-ten-minute-watchdog.yml'));
   result.append(mk('p','pm-handoff-warning','На GitHub выберите Run workflow и введите параметры. Эта страница НЕ отправляла workflow_dispatch, не создавала коммит и не проверяла LIVE.'));
   notice('Предварительные условия соблюдены. Подтверждение запуска — только GitHub Actions run ID.');
  }catch(e){resetResult();notice('Repair Worker заблокирован: '+String(e.message||e).slice(0,180))}
  finally{update()}
 }
 function doFree(){
  const tasks=[...selected.values()];
  const targets=tasks.map(x=>x.key+' '+x.task.title.slice(0,70)).join('; ');
  const cmd='!pm ask Составь один следующий безопасный шаг по выбранным техническим задачам: '+targets;
  if(cmd.length>1200){notice('Пакет слишком большой для публичного запроса OpenRouter Free. Выберите меньше задач.');return;}
  const text=packet();
  render('OpenRouter Free · технический совет через GitHub',text);
  const field=mk('textarea','pm-handoff-text');field.readOnly=true;field.rows=4;field.value=cmd;
  field.setAttribute('aria-label','Публичная команда OpenRouter Free');
  result.append(mk('p','pm-handoff-warning','Это ПУБЛИЧНЫЙ технический канал GitHub, не приватный чат. Скопируйте команду, отправьте её от имени владельца в Issue #3890. Подтверждение ответа появится в отчётах после действующего Watchdog; источник не является коммитом.'),
    field,link('Открыть GitHub Agent Inbox #3890',github+'/issues/3890#new_comment_field'));
  notice('Пакет подготовлен для бесплатной модели OpenRouter в GitHub. До публикации комментария исполнитель не запущен.');
 }
 function send(){if(!selected.size)return;const v=mode.value;if(v==='work')doWork();else if(v==='issue')doIssue();else if(v==='repair')doRepair();else if(v==='free')doFree()}
 function init(catalog){
  if(catalog?.schema!=='HH_PM_PUBLIC_V1')return;
  source=catalog;selected.clear();if(panel)panel.remove();
  panel=mk('section','pm-assign-panel');panel.id='pm-assign-panel';
  const head=mk('div','pm-assign-head');head.append(mk('h2',null,'Назначить исполнителя'));
  summary=mk('span','pm-assign-count');head.append(summary);panel.append(head);
  panel.append(mk('p','pm-assign-help','Отметьте одну или несколько подзадач (до 8), выберите исполнителя и передайте пакет. Никаких платных сервисов и скрытых запусков.'));
  const controls=mk('div','pm-assign-controls'),label=mk('label','pm-assign-label','Исполнитель');
  mode=mk('select','pm-assign-select');
  for(const [value,text]of Object.entries(methods)){const opt=mk('option',null,text);opt.value=value;mode.append(opt)}
  mode.addEventListener('change',()=>{resetResult();notice('Выбран способ: '+methods[mode.value]);update()});
  label.append(mode);controls.append(label);
  trigger=btn('Передать выбранные задачи',send,'pm-btn pm-assign-send');controls.append(trigger);
  controls.append(btn('Очистить выбор',()=>{selected.clear();resetResult();update();notice('Выбор сброшен.');},'pm-btn pm-quiet'));
  panel.append(controls);notes=mk('p','pm-assign-note');notes.setAttribute('role','status');notes.setAttribute('aria-live','polite');panel.append(notes);
  result=mk('div','pm-handoff-result');panel.append(result);
  document.getElementById('pm-root')?.parentNode?.insertBefore(panel,document.getElementById('pm-root'));
  notice('Отметьте галочками одну или несколько задач.');update();
 }
 window.HHPM_ASSIGN={init,attach};
})();
