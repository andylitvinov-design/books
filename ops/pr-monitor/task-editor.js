'use strict';
/* Same-domain protected editor. Public handoff is ephemeral; owner APIs enforce auth.
 * Never call a GitHub write endpoint from the client. No phantom agent executions.
 */
(function(win,doc){
 if(!doc||!doc.getElementById('ac-editor'))return;
 const by=id=>doc.getElementById('ac-'+id);
 const UI=['title','project','priority','area','source','summary','plan','prompt','executor','mode',
  'no-cost','no-duplicate','verify-live'];
 const HANDOFF='hh.commander.handoff.v2',BACKUP='hh.commander.encrypted-backup.v1';
 const GH='https://api.github.com/repos/andylitvinov-design/books';
 let taskId=win.crypto?.randomUUID?.()||'',issueNumber=null,remoteEnabled=false;
 let prList=[],linked=new Set(),prLoaded=false,dirty=true,sourceAtPrompt='';
 let authorized=false,qualityOK=false,lastEvidence='',lastSaved='NOT_SAVED';
 const MAX_PR=15;
 const set=(id,v)=>{const el=by(id);if(el)el.textContent=String(v||'')};
 const val=id=>String(by(id)?.value||'').trim();
 const mk=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
 const json=async(response)=>{try{return await response.json()}catch{return {error:'INVALID_SERVER_RESPONSE'}}};
 const safeText=e=>String(e?.message||e||'Ошибка').slice(0,180);
 function markDirty(){dirty=true;qualityOK=false;if(by('open-task-chat'))by('open-task-chat').disabled=true;
  set('state',issueNumber?'Изменения не сохранены · задача #'+issueNumber:'Черновик · не сохранён');
 }
 function record(){
  return {taskId,title:val('title'),project:val('project'),priority:val('priority'),
   area:val('area'),source:val('source'),summary:val('summary'),plan:val('plan'),
   prompt:val('prompt'),executor:val('executor'),mode:val('mode'),
   relatedPr:[...linked].sort((a,b)=>a-b),
   restrictions:{noCost:by('no-cost').checked,noDuplicate:by('no-duplicate').checked,verifyLive:by('verify-live').checked}};
 }
 function fill(r){
  if(!r||typeof r!=='object')return;
  for(const field of ['title','project','priority','area','source','summary','plan','prompt','executor','mode']){
   if(typeof r[field]==='string'&&by(field))by(field).value=r[field].slice(0,by(field).maxLength||15000);
  }
  if(r.restrictions){for(const key of ['noCost','noDuplicate','verifyLive']){
   const id={'noCost':'no-cost','noDuplicate':'no-duplicate','verifyLive':'verify-live'}[key];
   by(id).checked=r.restrictions[key]!==false;
  }}
  linked=new Set((Array.isArray(r.relatedPr)?r.relatedPr:[]).filter(n=>Number.isSafeInteger(n)&&n>0).slice(0,MAX_PR));
  taskId=/^[0-9a-f-]{36}$/i.test(r.taskId||'')?r.taskId:(win.crypto?.randomUUID?.()||taskId);
  sourceAtPrompt=val('source');renderLinked();markDirty();quality();
 }
 function understanding(){
  const raw=val('source');if(!raw)return;
  by('summary').value='Цель: '+raw.slice(0,390)+'\nРезультат: рабочее исправление с независимой проверкой; не создавать повторную задачу, если уже есть подходящий PR.';
  markDirty();
 }
 function plan(){
  const raw=val('source');if(raw.length<8){set('prompt-note','Сначала опишите исходную задачу.');return}
  by('plan').value=[
   '1. Найти текущую реализацию в репозитории и проверить контекст задачи.',
   '2. Получить фактический полный список открытых PR, включая Draft; найти возможные предыдущие решения.',
   '3. Сопоставить кандидатов по смыслу, номеру, ветке, состоянию CI, конфликтам и активным lease.',
   '4. Продолжить подходящий PR вместо дублирования; внести изменения и выполнить точные проверки.',
   '5. Зафиксировать commit, CI, merge, Vercel deployment и отдельный функциональный LIVE-smoke; не утверждать непроверенное.'
  ].join('\n');
  markDirty();
 }
 function compose(){
  const raw=val('source'),title=val('title');if(raw.length<8){set('prompt-note','Добавьте исходный запрос.');return false}
  if(!val('plan'))plan();
  const prompt=[
   'ГОТОВЫЙ ПРОМПТ ИСПОЛНИТЕЛЮ · РЕДАКТИРУЕМЫЙ ЧЕРНОВИК','',
   'Роль: продолжай существующую работу. Не объявляй «готово» без проверенных фактов.','',
   '1. ЧТО НАДО ВЫПОЛНИТЬ',title||raw.slice(0,140),
   'Исходная задача (дословно): '+raw,
   'Конкретные шаги:',val('plan'),'',
   '2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ',
   '- Точная задача выполнена, а не просто создано новое ТЗ.',
   '- При наличии подходящего PR продолжена существующая ветка, не создан дубль.',
   '- Есть воспроизводимые проверки, текущий HEAD и итоговый отчёт с реальными ссылками.','',
   '3. ОРИЕНТИРЫ КАЧЕСТВА',
   '- Linear: конкретная постановка и проверяемые критерии. https://linear.app/method/write-issues-not-user-stories',
   '- GitHub Projects: связь задачи, PR и реальных статусов. https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects','',
   '4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА',
   '- Holistic House / Agent Commander: https://holistic-house-pr-monitor.vercel.app',
   '- Репозиторий: https://github.com/andylitvinov-design/books',
   '- Control: codex/bootstrap-books; production: codex/public-book-library; актуальные SHA проверить.',
   '- Направление: '+(val('area')||'определить по исходному проекту')+'.',
   '- Уже связанные PR: '+(linked.size?[...linked].map(n=>'#'+n).join(', '):'ещё не подтверждены')+'.',
   '- Без дополнительных платных сервисов, публичной публикации частных данных и обхода защищённых проверок.','',
   '5. ПОЛНОМОЧИЯ И КОНТРОЛЬ',
   '- Режим: '+val('mode')+'; исполнитель: '+val('executor')+'.',
   '- Проверить текущий PR/lease/CI перед записью и merge.',
   '- Различать выполнение кода, успешный CI, merge, Vercel READY и функционально проверенный LIVE.','',
   '6. ИТОГ',
   '- Указать точные номера PR, SHA, тесты, состояние публикации, нерешённые проблемы и следующий безопасный шаг.'
  ].join('\n').slice(0,15000);
  by('prompt').value=prompt;sourceAtPrompt=raw;set('prompt-note','Промпт обновлён из текущего запроса. Проверьте и при необходимости отредактируйте.');markDirty();quality();return true;
 }
 function quality(){
  const r=record(), checks=[
   [r.title.length>=5,'Задача имеет понятное название'],
   [r.source.length>=8,'Сохранён исходный запрос владельца'],
   [r.summary.length>=20,'Описана цель и ожидаемый результат'],
   [r.plan.length>=60,'Есть конкретные шаги реализации'],
   [r.prompt.length>=120&&/ЧТО НАДО ВЫПОЛНИТЬ/i.test(r.prompt),'Промпт содержит действия исполнителя'],
   [/РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ/i.test(r.prompt),'Есть критерии хорошего результата'],
   [/КОНТЕКСТ БИЗНЕСА И ПРОЕКТА/i.test(r.prompt),'Указан контекст проекта'],
   [sourceAtPrompt===r.source,'Промпт не устарел относительно исходного запроса'],
   [r.restrictions.noCost&&r.restrictions.noDuplicate&&r.restrictions.verifyLive,'Сохранены безопасные ограничения']
  ];
  const root=by('quality');root.replaceChildren();
  for(const [ok,label] of checks)root.append(mk('p',null,(ok?'✓ ':'○ ')+label));
  qualityOK=checks.every(c=>c[0]);root.prepend(mk('p',null,'Проверок выполнено: '+checks.filter(c=>c[0]).length+' / '+checks.length));
  return qualityOK;
 }
 function renderLinked(){
  set('pr-linked',linked.size?'Выбраны для проверки: '+[...linked].sort((a,b)=>a-b).map(n=>'#'+n).join(', '):'Связанных PR пока нет.');
 }
 function terms(){
  const stop=new Set(['нужно','которые','который','должны','сделать','задачу','сайт','здесь','провести','проверить','доделать','найти','the','with','from','this','and','for','всех','этой','было','есть']);
  return [...new Set((val('title')+' '+val('source')).toLowerCase().match(/[\p{L}\d]{4,}/gu)||[])]
    .filter(t=>!stop.has(t)).slice(0,16);
 }
 function renderPR(){
  const box=by('pr-results');box.replaceChildren();if(!prLoaded)return;
  const q=val('pr-filter').toLowerCase().replace('#','').trim();
  const queryWords=terms();
  const ranked=prList.map(p=>{
   const h=(p.title||'').toLowerCase(),b=String(p.body||'').toLowerCase().slice(0,1400);
   const score=queryWords.reduce((n,t)=>n+(h.includes(t)?3:0)+(b.includes(t)?1:0),0);
   return {...p,score};
  }).filter(p=>!q||String(p.number).includes(q)||p.title.toLowerCase().includes(q))
    .sort((a,b)=>b.score-a.score||b.number-a.number).slice(0,12);
  if(!ranked.length){box.append(mk('p','ac-hint','По текущему фильтру PR не найдены. Попробуйте номер или другое слово.'));return}
  for(const p of ranked){
   const card=mk('div','ac-pr-item'),main=mk('div'),title=mk('strong',null,'#'+p.number+' · '+p.title);
   const warning=(p.labels||[]).some(x=>/hold|manual|claimed|lease/i.test(x.name||''))?' · возможен HOLD/lease':'';
   main.append(title,mk('small',null,(p.draft?'Draft · ':'')+'База: '+(p.base?.ref||'неизвестно')+
    ' · совпадение '+p.score+' (предварительно)'+warning));
   const select=mk('button','ac-secondary',linked.has(p.number)?'Убрать':'Связать');
   select.type='button';select.addEventListener('click',()=>{
    if(linked.has(p.number))linked.delete(p.number);else if(linked.size<MAX_PR)linked.add(p.number);
    else{set('pr-status','Не более '+MAX_PR+' связанных PR.');return}
    renderLinked();renderPR();markDirty();
   });
   card.append(main,select);box.append(card);
  }
 }
 async function discover(){
  set('pr-status','Читаю актуальную очередь GitHub, включая Draft…');by('pr-search').disabled=true;prLoaded=false;
  try{
   const all=[];
   for(let page=1;page<=12;page++){
    const r=await fetch(GH+'/pulls?state=open&per_page=100&page='+page,{
     cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)throw Error('GitHub HTTP '+r.status+' (не удалось подтвердить полный список)');
    const batch=await r.json();
    if(!Array.isArray(batch))throw Error('Некорректный ответ GitHub');
    all.push(...batch);
    if(batch.length<100)break;
    if(page===12)throw Error('Список PR слишком велик, результаты не полные');
   }
   prList=all;prLoaded=true;set('pr-status','Проверено открытых PR: '+all.length+'. Совпадения предварительные; фактический PR/lease проверяет исполнитель.');
   renderPR();
  }catch(e){prList=[];by('pr-results').replaceChildren();set('pr-status','Поиск не выполнен: '+safeText(e));}
  finally{by('pr-search').disabled=false}
 }
 async function api(action,payload,method){
  const url='/api/commander-drafts?action='+encodeURIComponent(action.startsWith('read&id=')?'read':action)+(action.startsWith('read&id=')?'&id='+encodeURIComponent(action.slice(8)):'');
  const opts={method:method||'GET',credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})}};
  if(payload)opts.body=JSON.stringify(payload);
  const response=await fetch(url,opts),data=await json(response);
  if(!response.ok)throw Error(data.error||'HTTP_'+response.status);
  return data;
 }
 async function status(){
  try{
   const r=await api('status');remoteEnabled=r.privateStoreConfigured===true;
   set('remote-status',remoteEnabled?
    'Защищённое хранение подключено. Сохранение и передача требуют вашего подтверждения.':
    'Серверное хранение пока не подключено. Доступна зашифрованная копия на устройстве; задача не передаётся агенту.');
   by('save-remote').disabled=!remoteEnabled;
   by('queue').disabled=!remoteEnabled||!issueNumber||dirty;
   by('open-task-chat').disabled=!remoteEnabled||!issueNumber||dirty;
  }catch(e){remoteEnabled=false;by('save-remote').disabled=true;by('queue').disabled=true;
   set('remote-status','Серверная проверка недоступна: '+safeText(e));}
 }
 async function save(){
  if(!quality()){set('remote-status','Заполните обязательные пункты проверки качества перед сохранением.');return}
  by('save-remote').disabled=true;set('remote-status','Сохраняю через защищённый API…');
  try{
   const r=await api('save',{record:record(),...(issueNumber?{issueNumber}:{})},'POST');
   if(!r.saved||!Number.isSafeInteger(r.issueNumber))throw Error('Сохранение не подтверждено');
   issueNumber=r.issueNumber;dirty=false;lastSaved='PRIVATE_SAVED';set('state','Задача #'+issueNumber+' · сохранена');
   set('remote-status','Сохранено в защищённом хранилище Supabase. Исполнитель не запущен.');
   set('history','Сохранён серверный черновик #'+issueNumber+' · '+new Date(r.observedAt).toLocaleString('ru-RU')+'. Агент не запускался.');
   by('queue').disabled=false;by('save-remote').disabled=false;
   by('open-task-chat').disabled=false;
  }catch(e){set('remote-status','Не сохранено: '+safeText(e));by('save-remote').disabled=!remoteEnabled}
 }
 async function queue(){
  if(!issueNumber||dirty||!quality()){set('remote-status','Сначала сохраните актуальный проверенный черновик.');return}
  by('queue').disabled=true;set('remote-status','Фиксирую передачу в защищённой очереди…');
  try{
   const r=await api('queue',{issueNumber},'POST');
   if(r.queuedForReview!==true||r.agentStarted!==false)throw Error('Сервер не подтвердил безопасный статус');
   lastSaved='QUEUED_NOT_STARTED';set('state','Задача #'+issueNumber+' · в очереди');
   set('remote-status','Передано в очередь на рассмотрение. Реальный агент ЕЩЁ НЕ ЗАПУЩЕН — требуется настроенный исполнитель и подтверждённый запуск.');
   set('history','Задача #'+issueNumber+' переведена в очередь. Статус исполнения: NOT_STARTED. PR/CI/Merge/LIVE не подтверждены.');
  }catch(e){set('remote-status','Передача не подтверждена: '+safeText(e))}
  finally{by('queue').disabled=!remoteEnabled||dirty||!issueNumber}
 }
 async function loadList(){
  set('history','Читаю только ваши сохранённые защищённые задачи…');
  const root=by('saved');root.replaceChildren();
  try{
   const r=await api('list');const tasks=r.tasks||[];
   if(!tasks.length)root.append(mk('p','ac-hint','В приватном хранилище сохранённых задач пока нет.'));
   for(const t of tasks){
    const card=mk('div','ac-pr-item'),d=mk('div');
    d.append(mk('strong',null,'#'+t.issueNumber+' · '+t.title),mk('small',null,t.state+' · '+t.updatedAt));
    const btn=mk('button','ac-secondary','Открыть');btn.type='button';
    btn.addEventListener('click',()=>readTask(t.issueNumber));card.append(d,btn);root.append(card);
   }
   set('history','Загружены серверные записи: '+tasks.length+'. Статусы — только данные хранилища.');
  }catch(e){set('history','Не удалось получить историю: '+safeText(e))}
 }
 async function readTask(id){
  try{
   const r=await api('read&id='+id);
   if(r?.record?.schema!=='HH_COMMANDER_TASK_V1')throw Error('Неизвестный формат задачи');
   if(dirty&&!win.confirm('Заменить текущие несохранённые изменения выбранной задачей?'))return;
   fill(r.record);issueNumber=id;dirty=false;sourceAtPrompt=val('source');
   set('state','Задача #'+id+' · загружена');set('history','Открыта сохранённая задача #'+id+'. Исполнение не предполагается автоматически.');
   by('queue').disabled=!remoteEnabled;
   by('open-task-chat').disabled=!remoteEnabled;
  }catch(e){set('history','Не удалось открыть задачу: '+safeText(e))}
 }
 const toB64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)
  result+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(result)};
 const fromB64=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
 async function keyFor(password,salt){
  const base=await win.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return win.crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},base,
   {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 async function backupSave(){
  const password=val('backup-key');
  if(password.length<8){set('remote-status','Для зашифрованной копии нужен код не короче 8 символов.');return}
  if(!quality()){set('remote-status','Сначала выполните проверку качества.');return}
  try{
   const salt=win.crypto.getRandomValues(new Uint8Array(16)),iv=win.crypto.getRandomValues(new Uint8Array(12));
   const key=await keyFor(password,salt);
   const clear=new TextEncoder().encode(JSON.stringify({record:record(),issueNumber}));
   const encrypted=await win.crypto.subtle.encrypt({name:'AES-GCM',iv},key,clear);
   win.localStorage.setItem(BACKUP,JSON.stringify({version:1,salt:toB64(salt),iv:toB64(iv),data:toB64(new Uint8Array(encrypted))}));
   by('backup-key').value='';set('remote-status','Зашифрованная копия сохранена ТОЛЬКО на этом устройстве. На сервер не передавалась.');
  }catch(e){set('remote-status','Копию не удалось сохранить: '+safeText(e))}
 }
 async function backupLoad(){
  const password=val('backup-key');
  if(password.length<8){set('remote-status','Введите код шифрования сохранённой копии.');return}
  try{
   const stored=JSON.parse(win.localStorage.getItem(BACKUP)||'null');
   if(!stored||stored.version!==1)throw Error('На этом устройстве нет сохранённой копии');
   const key=await keyFor(password,fromB64(stored.salt));
   const decrypted=await win.crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(stored.iv)},key,fromB64(stored.data));
   const data=JSON.parse(new TextDecoder().decode(decrypted));
   if(data?.record?.schema&&data.record.schema!=='HH_COMMANDER_TASK_V1')throw Error('Некорректный формат');
   if(dirty&&!win.confirm('Заменить текущие изменения зашифрованной копией?'))return;
   fill(data.record);issueNumber=Number.isSafeInteger(data.issueNumber)?data.issueNumber:null;
   by('backup-key').value='';set('remote-status','Локальная копия восстановлена. Перед отправкой проверьте её и сохраните на сервере.');
   set('state','Восстановленный черновик · требует проверки');by('queue').disabled=true;
  }catch(e){set('remote-status','Не удалось открыть копию. Проверьте код и наличие копии на устройстве.');}
 }
 async function improve(){
  const raw=val('source');if(raw.length<8)return;
  const original=val('prompt');by('improve').disabled=true;set('prompt-note','Проверяю доступность бесплатной ИИ-модели владельца…');
  try{
   const r=await fetch('/api/pm-agent-chat?action=decompose',{
    method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:raw})});
   const data=await json(r);
   if(!r.ok||typeof data.reply!=='string')throw Error(data.error||'ИИ недоступен');
   if(val('prompt')!==original||val('source')!==raw){
    set('prompt-note','ИИ ответил, но исходный текст уже изменён: ваши правки не перезаписаны.');return;
   }
   const marker='8. ДОПОЛНЕНИЯ ИИ — ПРОВЕРИТЬ ПЕРЕД ПЕРЕДАЧЕЙ';
   const ix=data.reply.indexOf(marker);
   if(ix<0)throw Error('Нет отдельного блока предложений');
   by('prompt').value=(original+'\n\n'+data.reply.slice(ix)).slice(0,15000);
   set('prompt-note','Дополнения ИИ добавлены в конец; основная версия сохранена. Проверьте каждый пункт.');
   markDirty();quality();
  }catch(e){set('prompt-note','Внешний ИИ сейчас не подключён: '+safeText(e)+'. Локальный текст и правки сохранены.')}
  finally{by('improve').disabled=false}
 }
 async function refreshPR(){
  if(!linked.size){set('pr-live','Не выбраны PR для мониторинга.');return}
  const results=[];
  for(const number of [...linked].slice(0,MAX_PR)){
   try{
    const res=await fetch(GH+'/pulls/'+number,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
    if(!res.ok)throw Error('HTTP_'+res.status);
    const p=await res.json(),state=p.merged_at?'MERGED (не LIVE)':p.draft?'DRAFT':p.state?.toUpperCase()||'UNKNOWN';
    results.push('#'+number+' · '+state+' · HEAD '+String(p.head?.sha||'неизвестен').slice(0,9)+' · CI не подтверждён');
   }catch(e){results.push('#'+number+' · проверка недоступна ('+safeText(e)+')')}
  }
  lastEvidence=results.join('\n');set('pr-live',lastEvidence);
  set('evidence',lastEvidence+'\n\nVercel READY / функциональный LIVE: не проверены этим редактором.');
 }
 async function login(event){
  event.preventDefault();const password=by('owner-password').value;
  if(!password)return;
  set('login-status','Проверяю код владельца…');
  try{
   const r=await fetch('/api/seo-auth',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
   const data=await json(r);if(!r.ok)throw Error(data.message||data.error||'Доступ не подтверждён');
   by('owner-password').value='';await initializeOwner();
  }catch(e){set('login-status','Вход не выполнен: '+safeText(e));}
 }
 function consume(){
  let packet=null;try{const raw=win.sessionStorage.getItem(HANDOFF);win.sessionStorage.removeItem(HANDOFF);
   if(raw)packet=JSON.parse(raw)}catch{}
  if(!packet||packet.version!==2||Date.now()-packet.at>600000||packet.at>Date.now()+30000)return;
  const raw=String(packet.raw||'').trim().slice(0,2500);
  if(raw.length<8)return;
  by('source').value=raw;by('title').value=raw.split(/[.!?\n]/)[0].slice(0,135);
  understanding();plan();
  if(typeof packet.fullPrompt==='string'&&packet.fullPrompt.trim().length>30){
   by('prompt').value=packet.fullPrompt.slice(0,15000);sourceAtPrompt=raw;
  }else compose();
  const ids=(Array.isArray(packet.relatedPr)?packet.relatedPr:[]).filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000).slice(0,MAX_PR);
  if(ids.length){linked=new Set(ids);renderLinked();}
  set('state','Получен комментарий/черновик · не сохранён');
  return ids;
 }
 async function addPriorContext(prs){
  if(!remoteEnabled||!prs?.length)return;
  const initial=val('prompt'),source=val('source');if(!initial||issueNumber)return;
  try{
   const data=await api('list');
   const matching=(data.tasks||[]).filter(t=>(t.relatedPr||[]).some(n=>prs.includes(n))&&t.taskId!==taskId);
   const selected=matching.slice(0,8),notes=[];
   for(const item of selected){
    try{
     const response=await api('read&id='+item.issueNumber);
     const record=response.record;
     if(record?.schema==='HH_COMMANDER_TASK_V1')notes.push('Приватная задача #'+item.issueNumber+
      ' · '+String(item.state||'UNKNOWN').slice(0,40)+' · обновлена '+String(item.updatedAt||'UNKNOWN').slice(0,45)+
      '\nИсходный запрос: '+String(record.source||'').slice(0,480)+
      '\nПоследний сохранённый план: '+String(record.plan||record.summary||'').slice(0,420));
    }catch{notes.push('Приватная задача #'+item.issueNumber+' · детали недоступны.');}
   }
   if(val('prompt')!==initial||val('source')!==source||dirty===false)return;
   const attachment=notes.length?
    '\n\nПРЕДЫДУЩИЕ ПРИВАТНЫЕ ЗАДАЧИ ПО СВЯЗАННЫМ PR ('+selected.length+'/'+matching.length+'):\n'+notes.join('\n\n')+
    '\nИсполнитель должен проверить остальные связанные приватные задачи и свежие GitHub events.':
    '\n\nПРЕДЫДУЩИЕ ПРИВАТНЫЕ ЗАДАЧИ: совпадений по PR в доступной выборке не найдено; полный архив не подтверждён.';
   const room=15000-initial.length;
   if(room>180)by('prompt').value=initial+attachment.slice(0,room);
   else set('history','Промпт уже заполнен; историю приватных задач проверьте вручную.');
   set('history','Приватная история по связанным PR: '+selected.length+' / '+matching.length+' найденных в выборке; агент НЕ запущен.');
   quality();
  }catch(e){set('history','История приватных задач недоступна: '+safeText(e)+'. Проверьте её вручную.');}
 }
 async function initializeOwner(){
  authorized=true;by('login').hidden=true;by('workspace').hidden=false;
  const ids=consume();quality();await status();if(ids?.length)await addPriorContext(ids);
 }
 async function checkAuth(){
  try{
   const r=await fetch('/api/commander-session',{credentials:'same-origin',cache:'no-store'});
   const d=await json(r);
   if(r.ok&&d.authenticated===true){await initializeOwner();return}
  }catch{}
  set('login-status','Продолжите через Google — отдельный код PR Monitor не нужен.');
  win.HHGoogleOwnerSSO?.mount(by('google-owner'),s=>set('login-status',s));
 }
 function bind(){
  by('login-form').addEventListener('submit',login);
  for(const id of UI){
   const element=by(id);if(element)element.addEventListener(id==='project'||id==='priority'||id==='executor'||id==='mode'||id.startsWith('no-')||id==='verify-live'?'change':'input',()=>{
    if(id==='source'){sourceAtPrompt='';set('prompt-note','Исходное описание изменилось. Обновите промпт перед передачей.')}
    markDirty();
   });
  }
  by('understand').addEventListener('click',understanding);
  by('build-plan').addEventListener('click',plan);
  by('regenerate').addEventListener('click',()=>{if(val('prompt')&&!win.confirm('Заменить текущий промпт текстом на основе исходного запроса?'))return;compose()});
  by('quality-run').addEventListener('click',quality);
  by('pr-search').addEventListener('click',discover);
  by('pr-filter').addEventListener('input',renderPR);
  by('improve').addEventListener('click',improve);
  by('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(val('prompt'));set('prompt-note','Промпт скопирован.')}catch{by('prompt').focus();by('prompt').select();set('prompt-note','Текст выделен — скопируйте вручную.')}});
  by('save-remote').addEventListener('click',save);
  by('queue').addEventListener('click',queue);
  by('open-task-chat').addEventListener('click',()=>{
   if(!authorized||!remoteEnabled||dirty||!issueNumber||!/^[0-9a-f-]{36}$/i.test(taskId)){
    set('remote-status','Сначала сохраните задачу в защищённом хранилище.');return;
   }
   win.location.assign('/chats.html?task='+encodeURIComponent(taskId));
  });
  by('list').addEventListener('click',loadList);
  by('backup-save').addEventListener('click',backupSave);
  by('backup-load').addEventListener('click',backupLoad);
  by('refresh').addEventListener('click',refreshPR);
  win.setInterval(()=>{if(authorized&&doc.visibilityState==='visible'&&linked.size)refreshPR()},900000);
 }
 bind();checkAuth();
})(typeof window==='undefined'?null:window,typeof document==='undefined'?null:document);
