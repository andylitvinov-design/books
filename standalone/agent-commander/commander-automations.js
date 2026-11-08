'use strict';
/* Owner-only cross-origin Commander editor via an authenticated popup bridge.
 * The standalone site receives no cookies, API secrets, admin tokens or public write endpoints.
 */
(function(){
 const root=document.getElementById('hh-automations');if(!root)return;
 const OWNER='https://holistichouse.vercel.app',BRIDGE='/admin/command-center/automations/bridge';
 const MESSAGE='HH_COMMANDER_AUTOMATIONS_BRIDGE_V1',DEADLINE=18000;
 const TIMES=[['10m','Каждые 10 минут'],['30m','Каждые 30 минут'],['hourly','Каждый час'],['daily_9','Каждый день в 09:00 (Торонто)'],['weekly_mon_9','Понедельник в 09:00 (Торонто)']];
 const BRAINS=[['none','Без дополнительной памяти'],['ai-projects-brain','AI Projects Brain · память проектов'],['agent-council','AI Council · пока не подключён']];
 const ROLES=[['commander','Commander'],['analyst','Аналитик'],['engineering','Инженер'],['marketing','Маркетолог'],['education','Образование']];
 let bridge=null,nonce=null,connected=false,data=null,active='mine',editing=null,draft=null,busy=false,error='',notice='',selecting=null,selectedRole='commander';
 const pending=new Map();
 const el=(tag,cls,txt)=>{const o=document.createElement(tag);if(cls)o.className=cls;if(txt!==undefined)o.textContent=String(txt);return o;};
 const clean=v=>typeof v==='string'?v:'';
 const textTitle=job=>job.title||job.skill_id;
 const roleName=id=>ROLES.find(x=>x[0]===id)?.[1]||id||'Нет агента';
 const when=s=>TIMES.find(x=>x[0]===s)?.[1]||s;
 const nowFormat=value=>{if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('ru-RU',{timeZone:'America/Toronto',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';};
 function nonceValue(){return [...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function send(operation,payload){
  return new Promise((resolve,reject)=>{
   if(!bridge||bridge.closed||!connected){reject(Error('NO_PROTECTED_BRIDGE'));return;}
   const requestId=crypto.randomUUID();
   const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('BRIDGE_TIMEOUT'));},DEADLINE);
   pending.set(requestId,{resolve,reject,timer});
   try{bridge.postMessage({type:MESSAGE,operation,payload,nonce,requestId},OWNER);}
   catch{clearTimeout(timer);pending.delete(requestId);reject(Error('BRIDGE_UNAVAILABLE'));}
  });
 }
 async function read(){
  try{
   const response=await send('read');
   if(response.status!==200||!Array.isArray(response.data?.jobs)||!Array.isArray(response.data?.catalog))throw Error('INVALID_READ');
   data=response.data;error='';render();
  }catch(e){error='Защищённые задания пока недоступны: '+String(e.message||'ошибка');render();}
 }
 async function write(body){
  if(busy)return;busy=true;error='';notice='';render();
  try{
   const response=await send('write',{...body,requestId:crypto.randomUUID()});
   const result=response.data;
   if(response.status!==200||!['created_draft','updated','agent_assigned','unchanged','queued'].includes(result?.status))
    throw Error(result?.status||result?.error||'NOT_SAVED');
   editing=null;draft=null;selecting=null;notice=result.status==='created_draft'?
    'Черновик сохранён. Нужен подключённый AI-исполнитель для автоматического запуска.':
    result.status==='agent_assigned'?'Профиль агента назначен. Подключение AI-исполнителя проверяется отдельно.':
    result.status==='unchanged'?'Агент уже назначен.':
    result.status==='queued'?'Поставлено в очередь штатного исполнителя; выполнение проверьте в истории.':'Изменения сохранены.';
   await read();
  }catch(e){error='Не удалось сохранить: '+String(e.message||'ошибка');render();}
  finally{busy=false;render();}
 }
 function start(job){
  selecting=null;editing=job?job.id:'new';
  draft=job?{title:clean(job.title||job.skill_id),instruction:clean(job.instruction),schedule:job.schedule,
   brainScope:job.brain_scope||'none',agentRole:job.agent_role||'commander',
   skillIds:Array.isArray(job.skill_ids)?[...job.skill_ids]:[],enabled:Boolean(job.enabled)}:
   {title:'',instruction:'',schedule:'daily_9',brainScope:'ai-projects-brain',
    agentRole:'commander',skillIds:[],enabled:false};
  error='';notice='';render();
 }
 function scheduleGuess(value){
  const t=clean(value).toLowerCase();
  if(/10\s*(мин|min)/.test(t))return '10m';
  if(/30\s*(мин|min)/.test(t))return '30m';
  if(/кажд.{0,12}час|hourly|every hour/.test(t))return 'hourly';
  if(/понедельник|по понедельникам|monday|weekly/.test(t))return 'weekly_mon_9';
  if(/кажд.{0,12}(день|утр)|ежеднев|daily|every day/.test(t))return 'daily_9';
  return null;
 }
 function skillsGuess(text){
  const t=clean(text).toLowerCase(),rules=[
   [/пиар|pull request|github|мерж|\bpr\b/,['pr.queue-reconcile','task.stall-watchdog']],
   [/тест|ошибк|сбой|\bci\b/,['ci.exact-head-diagnose','agents.health-lease']],
   [/бюджет|расход|лимит|budget/,['cost.budget-guard']],
   [/бриф|сводк|отчёт|report/,['report.morning-brief']],
   [/клиент|seo|продаж|маркетинг/,['seo.opportunities','marketing.advisor']]
  ];
  const all=new Set((data?.catalog||[]).map(x=>x.id));
  return [...new Set(rules.flatMap(([p,ids])=>p.test(t)?ids:[]))].filter(id=>all.has(id)).slice(0,8);
 }
 function connect(){
  if(busy)return;
  error='';notice='';nonce=nonceValue();connected=false;data=null;
  const url=OWNER+BRIDGE+'?nonce='+nonce;
  bridge=window.open(url,'hh-cron-owner-bridge','width=470,height=680,scrollbars=yes,resizable=yes');
  if(!bridge){error='Окно входа заблокировано. Разрешите всплывающее окно или откройте защищённый редактор по ссылке.';}
  render();
 }
 window.addEventListener('message',event=>{
  if(event.origin!==OWNER||event.source!==bridge)return;
  const msg=event.data;
  if(!msg||msg.type!==MESSAGE||msg.nonce!==nonce)return;
  if(msg.kind==='ready'){connected=true;error='';read();return;}
  if(msg.kind!=='response'||typeof msg.requestId!=='string')return;
  const task=pending.get(msg.requestId);if(!task)return;
  pending.delete(msg.requestId);clearTimeout(task.timer);
  task.resolve({status:msg.status,data:msg.data});
 });
 function paragraph(cls,s){return el('p',cls,s);}
 function itemButton(text,cls,onClick){const b=el('button',cls,text);b.type='button';b.addEventListener('click',onClick);return b;}
 function field(labelText,kind,value,onChange,options){
  const wrap=el('label'),name=el('span',null,labelText);wrap.append(name);
  const input=el(kind);
  if(kind==='select'){
   for(const [value,text] of options||[]){const option=el('option',null,text);option.value=value;input.append(option);}
   input.value=value;input.addEventListener('change',e=>onChange(e.target.value));
  }else{
   input.value=value||'';input.maxLength=kind==='textarea'?6000:120;
   if(kind==='textarea'){input.rows=8;input.placeholder='Опишите желаемый результат, действия, ограничения и критерии завершения.';}
   input.addEventListener('input',e=>onChange(e.target.value));
  }
  wrap.append(input);return wrap;
 }
 function drawEditor(){
  const current=(data?.jobs||[]).find(x=>x.id===editing);
  const wrap=el('section','hh-cron-editor'),head=el('div','hh-cron-editor-head');
  head.append(el('h2',null,editing==='new'?'Новая автоматизация':'Редактирование инструкции'),
   itemButton('×',null,()=>{editing=null;draft=null;render();}));wrap.append(head);
  wrap.append(field('Название задачи','input',draft.title,v=>{draft.title=v;}));
  wrap.append(field('Что делать · полный текст инструкции','textarea',draft.instruction,v=>{draft.instruction=v;}));
  const whenWrap=el('div','hh-cron-inputrow');
  const free=el('input');free.placeholder='Например: каждый день в 9 утра / каждые 30 минут';free.setAttribute('aria-label','Когда выполнять словами');
  const guess=itemButton('Определить', 'hh-cron-action alt',()=>{
   const guessed=scheduleGuess(free.value||draft.instruction);
   if(!guessed){error='Не получилось определить время. Выберите расписание вручную.';render();return;}
   draft.schedule=guessed;notice='Предложено расписание: '+when(guessed);error='';render();
  });whenWrap.append(free,guess);
  wrap.append(el('strong',null,'Когда выполнять'),whenWrap);
  wrap.append(field('Расписание','select',draft.schedule,v=>{draft.schedule=v;},TIMES));
  const skillsHead=el('div','hh-cron-inputrow');
  skillsHead.append(el('strong',null,'Навыки агента (не более 8)'),itemButton('Подобрать','hh-cron-action alt',()=>{
   draft.skillIds=skillsGuess(draft.instruction+' '+draft.title);notice='Предложены навыки по тексту; проверьте выбор.';render();
  }));wrap.append(skillsHead);
  const list=el('div','hh-cron-skillbox');
  for(const skill of data?.catalog||[]){
   const label=el('label'),box=el('input');box.type='checkbox';box.checked=draft.skillIds.includes(skill.id);
   box.addEventListener('change',()=>{
    if(box.checked&&!draft.skillIds.includes(skill.id)&&draft.skillIds.length>=8){box.checked=false;error='Максимум восемь навыков';render();return;}
    draft.skillIds=box.checked?[...new Set([...draft.skillIds,skill.id])]:draft.skillIds.filter(x=>x!==skill.id);
   });
   const caption=(skill.titleRu||skill.titleEn||skill.id)+(skill.runnable?'':' ◌');
   label.append(box,el('span',null,caption));list.append(label);
  }
  wrap.append(list);
  wrap.append(field('Мозг и память агента','select',draft.brainScope,v=>{draft.brainScope=v;},BRAINS));
  wrap.append(field('Роль исполнителя','select',draft.agentRole,v=>{draft.agentRole=v;},ROLES));
  wrap.append(paragraph('hh-cron-muted','AI Projects Brain и Совет выбираются как контекст. Фактический AI-запуск требует проверенного исполнителя и разрешений.'));
  if(current?.execution_mode==='builtin'){
   wrap.append(paragraph('hh-cron-muted','Этот SQL-навык исполняет фиксированный безопасный алгоритм. Изменение текста не заменяет его исходный код.'));
   const toggle=el('label','hh-cron-toggle'),cb=el('input');cb.type='checkbox';cb.checked=draft.enabled;
   cb.addEventListener('change',()=>{draft.enabled=cb.checked;});
   toggle.append(cb,el('span',null,'Включено'));wrap.append(toggle);
  }else{
   wrap.append(paragraph('hh-cron-muted','Созданное задание будет сохранено как черновик: без подключённого фонового AI-исполнителя автоматический запуск отключён.'));
  }
  const actions=el('div','hh-cron-actions');
  const save=itemButton(busy?'Сохраняю…':current?'Сохранить изменения':'Создать черновик','hh-cron-action',()=>{
   if(draft.title.trim().length<6||draft.instruction.trim().length<20){error='Введите название и инструкцию не короче 20 символов';render();return;}
   const body=current?{action:'update_job',jobId:current.id,expectedRevision:current.revision,
    title:draft.title,instruction:draft.instruction,schedule:draft.schedule,enabled:draft.enabled,
    skillIds:draft.skillIds,brainScope:draft.brainScope,agentRole:draft.agentRole}:
    {action:'create_custom_job',title:draft.title,instruction:draft.instruction,schedule:draft.schedule,
    skillIds:draft.skillIds,brainScope:draft.brainScope,agentRole:draft.agentRole,enabled:false};
   write(body);
  });save.disabled=busy;actions.append(save,itemButton('Отмена','hh-cron-action alt',()=>{editing=null;render();}));
  wrap.append(actions);
  return wrap;
 }
 function openAgentPicker(job){
  editing=null;draft=null;selecting=job.id;selectedRole=job.agent_role||'commander';error='';notice='';render();
 }
 function drawAgentPicker(job){
  const box=el('section','hh-cron-agent-picker');
  box.append(el('strong',null,'🤖 Выбрать агента · '+textTitle(job)));
  const choices=el('div','hh-cron-agent-choices');
  const profiles=Array.isArray(data?.agentProfiles)?data.agentProfiles:ROLES.map(([id,name])=>({id,name}));
  for(const profile of profiles){
   if(!ROLES.some(([id])=>id===profile.id))continue;
   const button=itemButton(profile.name,'hh-cron-agent-choice',()=>{selectedRole=profile.id;render();});
   button.setAttribute('aria-pressed',String(selectedRole===profile.id));choices.append(button);
  }
  box.append(choices,paragraph('hh-cron-muted',job.execution_mode==='builtin'?
   'Запуск выполняет штатный SQL-алгоритм, а не выбранная AI-модель. Вы можете назначить профиль и запросить запуск.':
   'Профиль сохраняется, но AI-исполнитель ещё не подключён. Автоматический запуск отключён.'));
  const actions=el('div','hh-cron-agent-actions');
  const save=itemButton(busy?'Сохраняю…':'Назначить агента','hh-cron-action',()=>{
   write({action:'assign_agent',jobId:job.id,expectedRevision:job.revision,agentRole:selectedRole});
  });save.disabled=busy;
  actions.append(save,itemButton('Отмена','hh-cron-action alt',()=>{selecting=null;render();}));
  box.append(actions);
  if(job.execution_mode==='builtin'){
   const queue=itemButton('▶ Запросить выполнение','hh-cron-action alt',()=>{
    write({action:'control_job',jobId:job.id,mode:'queue_now'});
   });queue.disabled=busy||!job.enabled;
   box.append(queue,paragraph('hh-cron-muted',job.enabled?
    'Задание будет поставлено в очередь существующего Cron-исполнителя, не выполняется мгновенно.':
    'Сначала включите штатное задание в редакторе, затем запросите выполнение.'));
  }
  return box;
 }
 function drawList(){
  const section=el('section'),tabs=el('div','hh-cron-tabs');
  for(const [id,label] of [['mine','Мои задания'],['system','Системные']]){
   const b=itemButton(label,null,()=>{active=id;render();});b.setAttribute('aria-selected',String(active===id));tabs.append(b);
  }section.append(tabs);
  if(active==='mine'){
   for(const job of data?.jobs||[]){
    const row=el('div','hh-cron-jobrow');
    const b=itemButton('', 'hh-cron-job',()=>start(job)),body=el('span','hh-cron-job-body');
    body.append(el('strong',null,textTitle(job)),el('small',null,when(job.schedule)+' · '+(job.last_state||'Без запусков')),
      el('small',null,(job.instruction||'').slice(0,120)));
    b.append(body,el('span','hh-cron-job-tag',job.execution_mode==='builtin'?
     (job.enabled?'Включено':'Пауза'):'Нет исполнителя'));
    const agent=itemButton('🤖 '+roleName(job.agent_role),'hh-cron-agent-btn',()=>openAgentPicker(job));
    agent.setAttribute('aria-label','Выбрать агента для '+textTitle(job));
    agent.setAttribute('aria-expanded',String(selecting===job.id));
    row.append(b,agent);section.append(row);
    if(selecting===job.id)section.append(drawAgentPicker(job));
   }
   if(!data?.jobs?.length)section.append(paragraph('hh-cron-muted','Заданий пока нет.'));
   section.append(itemButton('＋ Новая автоматизация','hh-cron-action',()=>start(null)));
  }else{
   for(const system of data?.systemJobs||[]){
    const box=el('article','hh-cron-job'),body=el('div','hh-cron-job-body');
    body.append(el('strong',null,system.title),el('small',null,'Cron: '+system.schedule),el('p',null,system.description));
    box.append(body,el('span','hh-cron-job-tag','🤖 CODE'));section.append(box);
   }
   section.append(paragraph('hh-cron-muted','Системные задания выполняются через действующий GitHub/Vercel, их нельзя редактировать как пользовательские Cron Jobs.'));
  }
  const hist=el('section','hh-cron-history');hist.append(el('h2',null,'История подтверждённых запусков'));
  const runs=(data?.runs||[]).slice(0,8);
  for(const run of runs)hist.append(paragraph(null,run.skill_id+' · '+run.state+' · '+nowFormat(run.started_at)));
  if(!runs.length)hist.append(paragraph('hh-cron-muted','Подтверждённых запусков ещё нет.'));
  section.append(hist);return section;
 }
 function render(){
  root.replaceChildren();
  const hero=el('section','hh-cron-intro');
  hero.append(paragraph(null,'HOLISTIC HOUSE · AGENT COMMANDER'),el('h1',null,'Автоматизации'),
    paragraph(null,'Cron Jobs · редактор заданий, расписаний, навыков и памяти'));
  root.append(hero);
  if(error)root.append(paragraph('hh-cron-error',error));
  if(notice)root.append(paragraph('hh-cron-good',notice));
  const connectBox=el('section','hh-cron-state');
  if(!connected){
   connectBox.append(el('strong',null,'Подключить защищённый редактор'),
    paragraph(null,'Для просмотра полных текстов и сохранения заданий нужен вход владельца Holistic House. Данные не доступны гостям.'));
   connectBox.append(itemButton(bridge&&!bridge.closed?'Ожидается вход…':'Войти и подключить','hh-cron-action',connect));
  }else{
   connectBox.append(el('strong',null,'Защищённое соединение'),
    paragraph(null,'Изменения применяются в приватном реестре Command Center. Оставьте окно авторизации открытым.'));
   connectBox.append(itemButton('Обновить задания','hh-cron-action alt',read));
  }
  const fallback=el('a','hh-cron-link','Открыть защищённый редактор Holistic House');
  fallback.href=OWNER+'/admin/command-center/automations';fallback.target='_blank';fallback.rel='noopener noreferrer';
  connectBox.append(fallback);root.append(connectBox);
  if(!connected||!data)return;
  const jobs=data.jobs||[],stats=el('div','hh-cron-summary');
  for(const [n,label] of [[jobs.length,'Всего заданий'],[jobs.filter(j=>j.enabled).length,'Активны'],[jobs.filter(j=>j.execution_mode!=='builtin').length,'Без исполнителя']]){
   const box=el('div');box.append(el('b',null,n),el('small',null,label));stats.append(box);
  }root.append(stats);
  root.append(editing!==null?drawEditor():drawList());
 }
 render();
})();
