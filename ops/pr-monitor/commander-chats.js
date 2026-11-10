'use strict';
/* HH_COMMANDER_THREADS_V1: authenticated multi-chat workspace.
 * Durable storage: owner-verified Supabase private tables; fallback: AES-GCM vault
 * on this device. Assignment and AI answers are NOT agent execution.
 */
(function(win,doc){
 if(!doc.getElementById('cc-chat-root'))return;
 const el=id=>doc.getElementById('cc-'+id),SERVER='/api/commander-chats',AI='/api/pm-agent-chat';
 const KEY='hh.commander.chat-vault.v1',SCHEMA='HH_COMMANDER_LOCAL_CHATS_V1';
 const EXEC={local:'Локальный советник',openrouter:'OpenRouter Free',codex:'Codex · передача',
  'chatgpt-work':'ChatGPT Work · передача','repair-worker':'GitHub Repair Worker · передача',
  hermes:'Hermes · передача',manual:'Ручной исполнитель'};
 const STATES={planned:'Запланировано',assigned:'Назначено · не запущено',working:'В работе · по заявлению',
  review:'Проверка',blocked:'Блокировано',archived:'Архив · LIVE не подтверждён'};
 let remote=false,authorized=false,chats=[],thread=null,messages=[],key=null,salt=null,deviceMode=false,models=[],aiReady=false,busy=false;
 let reportRefreshTimer=null,reportSyncBusy=false,pendingCreateId=null;
 let executionRefreshTimer=null,executionSyncBusy=false,executionPollCount=0,executionErrorCount=0;
 const COUNCIL_ORIGIN='https://ai-council-free-super10.vercel.app';
 const COUNCIL_PROTOCOL='HH_AI_COUNCIL_BRIDGE_V1';
 let councilFrameReady=false,councilPending=null;
 const councilCompleted=new Set(),councilSaving=new Set();
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const show=(id,yes)=>{el(id).hidden=!yes};
 const info=s=>{
  const message=String(s);
  el('alert').textContent=message;
  const target=thread&&!el('thread').hidden?el('chat-feedback'):el('create-feedback');
  if(target){target.textContent=message;target.hidden=!message;}
 };
 const time=s=>{try{return new Date(s).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'})}catch{return '—'}};
 const id=()=>win.crypto.randomUUID();
 const htmlLink=(box,label,url)=>{
  if(!/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+|issues\/(?:1419|3128|3890)#issuecomment-\d+)$/.test(url))return;
  const a=make('a',null,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
 };
 async function request(url,method='GET',body){
  const controller=new AbortController(),timer=win.setTimeout(()=>controller.abort(),13000);
  let r;
  try{
   r=await win.fetch(url,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
    headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  }catch(error){
   if(error?.name==='AbortError')throw Error('Сервер не ответил за 13 секунд. Повторите проверку соединения.');
   throw error;
  }finally{win.clearTimeout(timer)}
  let j;try{j=await r.json()}catch{throw Error('Не удалось прочитать ответ сервера')}
  if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j;
 }
 const from64=s=>Uint8Array.from(win.atob(s),v=>v.charCodeAt(0));
 const to64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return win.btoa(s)};
 /* Non-extractable on-device key; all chat APIs still require verified owner session. */
 const DEVICE_DB='hh.commander.device-key.v1';
 async function deviceKey(){
  if(!win.indexedDB||!win.crypto?.subtle)throw Error('Защищённое хранилище недоступно');
  const db=await new Promise((resolve,reject)=>{
   const r=win.indexedDB.open(DEVICE_DB,1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('keys'))r.result.createObjectStore('keys')};
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('DEVICE_DB_UNAVAILABLE'));
  });
  try{
   const existing=await new Promise((resolve,reject)=>{
    const tx=db.transaction('keys','readonly'),r=tx.objectStore('keys').get('main');
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('DEVICE_KEY_UNAVAILABLE'));
   });
   if(existing)return existing;
   const k=await win.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
   await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');
    tx.objectStore('keys').put(k,'main');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('DEVICE_KEY_SAVE_FAILED'))});
   return k;
  }finally{db.close()}
 }
 async function unlockDevice(){
  if(!win.crypto?.subtle||!win.localStorage)throw Error('Недоступно шифрование устройства');
  const raw=win.localStorage.getItem(KEY),stored=raw?JSON.parse(raw):null;
  if(stored?.version===1)return false;
  if(stored&&(stored.version!==2||typeof stored.iv!=='string'||typeof stored.ciphertext!=='string'))throw Error('Некорректный архив');
  const k=await deviceKey();
  let data=null;
  if(stored){
   const clear=await win.crypto.subtle.decrypt({name:'AES-GCM',iv:from64(stored.iv)},k,from64(stored.ciphertext));
   data=JSON.parse(new TextDecoder().decode(clear));
   if(data.schema!==SCHEMA||!Array.isArray(data.chats)||data.chats.length>80)throw Error('Некорректная история');
  }
  chats=data?.chats||[];key=k;salt=null;deviceMode=true;
  if(!stored)await persist();
  return true;
 }
 async function migrateLegacy(){
  const backup=win.localStorage.getItem(KEY),prevKey=key,prevSalt=salt;
  if(!backup||JSON.parse(backup).version!==1)return;
  try{
   const k=await deviceKey();
   win.localStorage.setItem(KEY+'.legacy-encrypted-backup',backup);
   key=k;salt=null;deviceMode=true;await persist();
  }catch(e){key=prevKey;salt=prevSalt;deviceMode=false;win.localStorage.setItem(KEY,backup);throw e}
 }
 async function derive(password,s){
  const raw=await win.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return win.crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:210000,hash:'SHA-256'},
   raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 async function persist(){
  if(remote)return;
  if(!key)throw Error('Локальное хранилище закрыто');
  const json=JSON.stringify({schema:SCHEMA,chats});
  if(json.length>850000)throw Error('Лимит локального хранилища. Сохраните резервную копию.');
  const iv=win.crypto.getRandomValues(new Uint8Array(12));
  const cipher=await win.crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(json));
  win.localStorage.setItem(KEY,JSON.stringify(deviceMode?
   {version:2,iv:to64(iv),ciphertext:to64(new Uint8Array(cipher))}:
   {version:1,salt:to64(salt),iv:to64(iv),ciphertext:to64(new Uint8Array(cipher))}));
 }
 async function unlock(password){
  if(password.length<10)throw Error('Пароль должен содержать не меньше 10 символов');
  if(!win.crypto?.subtle||!win.crypto?.getRandomValues||!win.localStorage)throw Error('Недоступно защищённое хранилище браузера');
  let stored=null;const raw=win.localStorage.getItem(KEY);
  if(raw)try{stored=JSON.parse(raw)}catch{throw Error('Локальный архив повреждён')}
  if(stored&&(stored.version!==1||!stored.salt||!stored.iv||!stored.ciphertext))throw Error('Неверный формат архива');
  const s=stored?from64(stored.salt):win.crypto.getRandomValues(new Uint8Array(16));
  if(s.length!==16)throw Error('Некорректная соль шифрования');
  const k=await derive(password,s);
  if(stored){
   let value;try{value=await win.crypto.subtle.decrypt({name:'AES-GCM',iv:from64(stored.iv)},k,from64(stored.ciphertext))}
   catch{throw Error('Неверный пароль или повреждённые данные')}
   let data;try{data=JSON.parse(new TextDecoder().decode(value))}catch{throw Error('Формат истории не распознан')}
   if(data.schema!==SCHEMA||!Array.isArray(data.chats)||data.chats.length>80)throw Error('Некорректная история чатов');
   chats=data.chats;
  }else chats=[];
  key=k;salt=s;if(!stored)await persist();
 }
 async function exportBackup(){
  let raw=win.localStorage.getItem(KEY);if(!raw)return info('Нет локальной копии');
  try{
   if(deviceMode){
    const password=win.prompt('Пароль для переносимой копии чатов (от 10 символов)')||'';
    if(password.length<10)return info('Для экспорта требуется пароль от 10 символов.');
    const salt=win.crypto.getRandomValues(new Uint8Array(16)),iv=win.crypto.getRandomValues(new Uint8Array(12));
    const k=await derive(password,salt);
    const clear=new TextEncoder().encode(JSON.stringify({schema:SCHEMA,chats}));
    const cipher=await win.crypto.subtle.encrypt({name:'AES-GCM',iv},k,clear);
    raw=JSON.stringify({version:1,salt:to64(salt),iv:to64(iv),ciphertext:to64(new Uint8Array(cipher))});
   }
   const u=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=make('a');
   a.href=u;a.download='commander-encrypted-chats.json';doc.body.append(a);a.click();a.remove();
   win.setTimeout(()=>URL.revokeObjectURL(u),1500);info('Зашифрованная резервная копия сохранена.');
  }catch(e){info('Не удалось сохранить резервную копию: '+String(e.message||e))}
 }
 async function importBackup(e){
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>1000000)return info('Файл слишком большой');
  if(chats.length&&!win.confirm('Заменить существующую локальную историю импортированной?'))return;
  try{
   const raw=await f.text(),v=JSON.parse(raw);
   if(v.version!==1||typeof v.ciphertext!=='string'||from64(v.salt).length!==16||from64(v.iv).length!==12||v.ciphertext.length>950000)
    throw Error('Неверный формат шифрования');
   win.localStorage.setItem(KEY,raw);key=null;salt=null;deviceMode=false;chats=[];thread=null;messages=[];
   show('board',false);show('vault',true);info('Архив импортирован. Введите его пароль.');
  }catch(err){info('Ошибка импорта: '+String(err.message||err))}
 }
 const tasks=s=>{
  const x=String(s||'').split(',').map(v=>v.trim()).filter(Boolean);
  if(x.length>8||!x.every(v=>/^(ci-head|ai-commits):[A-Z]\d{2}$/.test(v)))throw Error('Укажите до восьми задач в формате ci-head:A01');
  return [...new Set(x)];
 };
 const prs=s=>{
  const x=String(s||'').split(',').map(v=>v.trim()).filter(Boolean);
  if(x.length>15||!x.every(v=>/^\d{1,5}$/.test(v)&&+v>0))throw Error('Укажите до 15 номеров PR');
  return [...new Set(x.map(Number))];
 };
 const picks=field=>{
  const x=[...el(field).querySelectorAll('input:checked')].map(v=>v.value);
  if(!x.length||x.length>6)throw Error('Выберите от одного до шести исполнителей');return x;
 };
 function formValues(prefix){
  const value=k=>el(prefix+k).value;
  const r={title:value('title').trim(),project:value('project'),description:value('description').trim(),
   tasks:tasks(value('tasks')),prs:prs(value('prs')),executors:prefix==='new-'?(value('mode')==='council-free'?['local']:[value('mode')]):picks('executors'),
   status:prefix==='new-'?'planned':value('status')};
  if(prefix==='new-'&&value('mode')!=='council-free'&&!EXEC[value('mode')])throw Error('Неизвестный исполнитель');
  if(r.title.length<4||r.title.length>110||r.description.length>1000)throw Error('Название: 4–110 символов; цель до 1000');
  return r;
 }
 function executorBoxes(chosen){
  const field=el('executors');field.replaceChildren();
  Object.entries(EXEC).forEach(([k,label])=>{
   const l=make('label'),c=make('input');c.type='checkbox';c.value=k;c.checked=chosen.includes(k);
   l.append(c,make('span',null,label));field.append(l);
  });
 }
 function renderList(){
  el('count').textContent=chats.length;el('active-count').textContent=chats.filter(c=>['assigned','working','review'].includes(c.status)).length;
  el('blocked-count').textContent=chats.filter(c=>c.status==='blocked').length;el('list-meta').textContent=chats.length+' всего';
  const q=el('search').value.toLowerCase(),status=el('filter').value,box=el('chat-list');box.replaceChildren();
  let count=0;
  for(const c of chats.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))){
   if(status!=='all'&&c.status!==status)continue;
   const value=[c.title,c.description,c.project,...(c.tasks||[]),...(c.prs||[])].join(' ').toLowerCase();
   if(q&&!value.includes(q))continue;count++;
   const b=make('button','cc-chat-card');b.type='button';b.setAttribute('aria-current',String(thread?.id===c.id));
   b.append(make('strong',null,c.title),
    make('span',null,time(c.updatedAt)+(c.status==='blocked'?' · Требует внимания':'')));
   b.addEventListener('click',()=>openChat(c));box.append(b);
  }
  if(!count)box.append(make('p','cc-empty',chats.length?'Нет совпадений по фильтру.':'Чатов нет. Создайте первый.'));
 }
 function renderMessages(){
  const box=el('messages');box.replaceChildren();
  if(!messages.length)box.append(make('p','cc-empty','Напишите вопрос, чтобы начать диалог.'));
  for(const msg of messages){
   const c=make('div','cc-message-item cc-from-'+msg.kind);
   const author=msg.kind==='owner'?'Вы':msg.kind==='assistant_unverified'?'Ассистент':
    msg.kind==='note'?'Заметка':msg.author||'Сообщение';
   c.append(make('div','cc-message-by',author),make('p',null,msg.text||''),
    make('small',null,time(msg.createdAt)+(msg.kind==='github_report'?' · отчёт, не доказательство LIVE':'')));
   if(msg.kind==='github_report')htmlLink(c,'Источник GitHub',msg.url);
   box.append(c);
  }
  box.scrollTop=box.scrollHeight;
 }
function updateExecutionLabel(){
  const labels={STARTING:'Hermes запускается · ожидаем подтверждение',RUNNING:'Hermes выполняет задачу',
   BLOCKED:'Запуск требует сверки receipt; повторно не запускаем',WAITING_FOR_APPROVAL:'Ожидается отдельное согласование',
   COMPLETED:'Исполнитель завершил задачу · CI, merge и LIVE проверяются отдельно',
   FAILED:'Исполнение завершилось ошибкой',CANCELLED:'Исполнение отменено'};
  const state=String(thread?.executionState||'').toUpperCase();
  el('executor-state').textContent=(thread?.taskId?'Чат привязан к защищённой задаче. ':'')+
   (labels[state]||'Назначение ≠ запуск. Ответ AI не доказывает коммит, merge или LIVE.');
 }
 function updateExecutorControls(scope='thread'){
  const mode=el(scope==='new'?'new-mode':'mode').value;
  const modelNeeded=['openrouter','hermes'].includes(mode);
  show(scope==='new'?'new-model-label':'model-label',modelNeeded);
  show(scope==='new'?'new-hermes-write-label':'hermes-write-label',mode==='hermes');
  if(mode!=='hermes')el(scope==='new'?'new-hermes-write':'hermes-write').checked=false;
 }
 function renderThread(){
  el('thread-title').textContent=thread.title;
  el('thread-updated').textContent=time(thread.updatedAt)+' · '+(remote?'приватное серверное хранилище':'зашифровано на устройстве');
  updateExecutionLabel();
  for(const field of ['title','project','description','status'])el(field).value=thread[field]||'';
  el('tasks').value=(thread.tasks||[]).join(', ');el('prs').value=(thread.prs||[]).join(', ');
  executorBoxes(thread.executors||['local']);el('thread-details').open=false;
  el('thread-advanced').open=false;el('chat-extra').open=false;el('history').open=false;
  const available=(thread.executors||[]).filter(x=>!['openrouter','hermes'].includes(x)||aiReady);
  if(el('mode').value==='council-free'||!available.includes(el('mode').value))
   el('mode').value=available.includes('openrouter')?'openrouter':available[0]||'local';
  updateExecutorControls();
  el('chat-feedback').textContent='';show('chat-feedback',false);el('verify-status').textContent='';
  el('pr-proof').replaceChildren();el('report-list').replaceChildren();show('create',false);show('thread',true);
  renderMessages();renderList();
 }
 async function verifySavedThread(){
  const current=thread,button=el('verify-chat'),status=el('verify-status');
  if(!current){status.textContent='Откройте рабочий чат.';return;}
  if(!remote){status.textContent='История зашифрована на этом устройстве. Серверная синхронизация для этого чата не включена.';return;}
  if(!authorized){status.textContent='Сессия владельца не подтверждена. Войдите через Google.';return;}
  if(button.disabled)return;
  button.disabled=true;status.textContent='Сверяю сохранение с защищённым сервером…';
  try{
   const read=await request(SERVER+'?action=read&issue='+current.issueNumber);
   if(read.chat?.id!==current.id||!Array.isArray(read.messages))
    throw Error('Сервер не подтвердил идентификатор и историю чата');
   const lastOwner=[...messages].reverse().find(m=>m.kind==='owner');
   if(!lastOwner){status.textContent='Сессия и чтение чата работают. Отправьте вопрос, чтобы проверить запись.';return;}
   const ownerIndex=read.messages.findIndex(m=>m.id===lastOwner.id&&m.kind==='owner');
   if(ownerIndex<0){status.textContent='Чат открывается, но последний вопрос не найден в серверной истории.';return;}
   const lastAnswer=[...messages].reverse().find(m=>['assistant_unverified','ai'].includes(m.kind));
   const answerIndex=lastAnswer?read.messages.findIndex(m=>m.id===lastAnswer.id&&
    ['assistant_unverified','ai'].includes(m.kind)):-1;
   status.textContent=answerIndex>ownerIndex
    ?'Подтверждено: вход владельца, чтение чата, последний вопрос и ответ сохранены в Supabase.'
    :'Подтверждено: вход владельца и последний вопрос сохранены. Ответ на этот вопрос ещё не подтверждён.';
  }catch(err){status.textContent='Сохранение не подтверждено: '+String(err.message||err)+'. Проверьте сессию и повторите.';}
  finally{button.disabled=false;}
 }
 function stopExecutionPolling(){
  if(executionRefreshTimer!==null)win.clearInterval(executionRefreshTimer);
  executionRefreshTimer=null;executionSyncBusy=false;executionPollCount=0;executionErrorCount=0;
 }
 function startExecutionPolling(){
  stopExecutionPolling();
  if(!remote||!thread||!Number.isSafeInteger(thread.issueNumber))return;
  const chatId=thread.id;
  executionRefreshTimer=win.setInterval(async()=>{
   if(!thread||thread.id!==chatId){stopExecutionPolling();return;}
   if(doc.visibilityState==='hidden'||executionSyncBusy)return;
   if(executionPollCount>=180){stopExecutionPolling();info('Автообновление остановлено через 15 минут. Нажмите «Обновить» для сверки статуса.');return;}
   executionSyncBusy=true;executionPollCount++;
   try{
    const runs=await request(SERVER+'?action=runs&issue='+thread.issueNumber);
    const latest=Array.isArray(runs.runs)?runs.runs[0]:null;
    const active=latest?.receipt?.dispatchAttempted===true&&
     !['COMPLETED','FAILED','CANCELLED','WAITING_FOR_APPROVAL'].includes(latest.status);
    if(!active){
     if(latest?.receipt?.dispatchAttempted===true){
      const final=await request(SERVER+'?action=read&issue='+thread.issueNumber);
      if(thread?.id===chatId){thread=final.chat;messages=final.messages;updateExecutionLabel();renderMessages();renderList();}
     }
     stopExecutionPolling();return;
    }
    const fresh=await request(SERVER+'?action=read&issue='+thread.issueNumber);
    if(thread?.id===chatId){thread=fresh.chat;messages=fresh.messages;updateExecutionLabel();renderMessages();renderList();}
    executionErrorCount=0;
   }catch(error){
    executionErrorCount++;
    if(executionErrorCount>=3){stopExecutionPolling();info('Не удалось обновить receipt Hermes. Повторный запуск не выполнялся. Нажмите «Обновить» для сверки.');}
   }finally{executionSyncBusy=false;}
  },5000);
 }
 function startReportPolling(){
  if(reportRefreshTimer!==null)win.clearInterval(reportRefreshTimer);
  reportRefreshTimer=null;
  if(!thread||!Array.isArray(thread.prs)||!thread.prs.length)return;
  reportRefreshTimer=win.setInterval(()=>{
   if(thread&&doc.visibilityState!=='hidden')void reportList({automatic:true,silent:true});
  },120000);
 }
 async function openChat(c){
  if(busy)return;
  try{
   if(remote){
    const v=await request(SERVER+'?action=read&issue='+c.issueNumber);
    thread=v.chat;messages=v.messages;if(v.truncated)info('Длинная история GitHub: охват ограничен пятью страницами.');
   }else{thread=chats.find(x=>x.id===c.id);messages=thread?.messages||[];}
   if(!thread)throw Error('Чат не найден');renderThread();
   startReportPolling();startExecutionPolling();
   void reportList({automatic:true,silent:true});
   el('thread').scrollIntoView({block:'start',behavior:'smooth'});
  }catch(err){info('Ошибка открытия чата: '+String(err.message||err))}
 }
 async function create(e){
  e.preventDefault();
  const button=el('create-send'),feedback=el('create-feedback');
  const fail=message=>{
   info(message);feedback.textContent=String(message);feedback.hidden=false;
   feedback.scrollIntoView({block:'nearest'});feedback.focus({preventScroll:true});
  };
  if(busy)return fail('Другая операция ещё выполняется. Повторите нажатие.');
  const question=el('new-question').value.trim(),mode=el('new-mode').value;
  const selectedModel=el('new-model').value||el('model').value;
  const writeConfirmed=mode==='hermes'&&el('new-hermes-write').checked;
  busy=true;button.disabled=true;
  const buttonLabel=button.textContent;button.textContent='Создаю…';
  feedback.hidden=true;feedback.textContent='';
  let created=false;
  try{
   if(question.length<2||question.length>1200)throw Error('Вопрос должен содержать 2–1200 символов.');
   if(['openrouter','hermes'].includes(mode)&&(!aiReady||!models.some(x=>x.id===selectedModel)))
    throw Error('Нет подтверждённой бесплатной модели OpenRouter. Выберите доступную модель или локального советника.');
   if(!el('new-title').value.trim())el('new-title').value=('Вопрос: '+question.replace(/\s+/g,' ')).slice(0,110);
   if(el('new-title').value.trim().length<4)el('new-title').value='Вопрос: '+question.slice(0,95);
   const data={...formValues('new-'),id:pendingCreateId||(pendingCreateId=id())};let c;
   if(remote){
    try{
     const v=await request(SERVER+'?action=create','POST',{chat:data});
     c=v.chat?{...v.chat,issueNumber:v.issueNumber}:null;
     if(!c){const read=await request(SERVER+'?action=read&issue='+v.issueNumber);c={...read.chat,issueNumber:v.issueNumber};}
    }catch(error){
     // A timed-out response may hide a successful insert. Resolve by the same
     // private chat UUID, never silently create a second conversation.
     try{
      const listing=await request(SERVER+'?action=list');
      const existing=listing.chats?.find(x=>x.id===data.id&&Number.isSafeInteger(x.issueNumber));
      if(!existing)throw error;
      const read=await request(SERVER+'?action=read&issue='+existing.issueNumber);
      c={...read.chat,issueNumber:existing.issueNumber};
     }catch{throw error}
    }
   }else{
    if(chats.length>=80&&!chats.some(x=>x.id===data.id))throw Error('Лимит 80 локальных чатов; сохраните копию.');
    c=chats.find(x=>x.id===data.id);
    if(!c){
     c={...data,revision:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      liveVerified:false,executionState:'UNVERIFIED_ASSIGNMENT_ONLY',messages:[]};
     chats.unshift(c);
    }
    await persist();
   }
   if(!c?.id)throw Error('Сервер не подтвердил создание чата.');
   if(remote){chats=[c,...chats.filter(x=>x.id!==c.id)];messages=[];}else messages=c.messages;
   thread=c;renderThread();startReportPolling();void reportList({automatic:true,silent:true});
   el('create-form').reset();el('new-mode').value=aiReady?'openrouter':'local';pendingCreateId=null;
   if(el('new-context').open)el('new-context').close();
   el('mode').value=mode;el('model').value=selectedModel;el('hermes-write').checked=writeConfirmed;
   updateExecutorControls();updateExecutorControls('new');
   el('message').value=question;
   created=true;
   info('Отправляю вопрос…');
  }catch(err){fail('Не удалось создать чат: '+String(err.message||err))}
  finally{busy=false;button.disabled=false;button.textContent=buttonLabel;}
  if(created){
   await send({preventDefault(){}});
   el('thread').scrollIntoView({block:'start',behavior:'smooth'});
  }
 }
async function update(e){
  e.preventDefault();if(!thread||busy)return;busy=true;
  try{
   const data={...formValues(''),id:thread.id};
   if(remote){
    const v=await request(SERVER+'?action=update','POST',{issueNumber:thread.issueNumber,expectedRevision:thread.revision,chat:data});
    thread={...v.chat,issueNumber:thread.issueNumber};
    chats=chats.map(c=>c.id===thread.id?thread:c);
   }else{
    Object.assign(thread,data,{updatedAt:new Date().toISOString(),revision:thread.revision+1,
     liveVerified:false,executionState:'UNVERIFIED_ASSIGNMENT_ONLY'});
    await persist();
   }
   renderThread();info('Назначения и статус сохранены. Исполнение и LIVE ещё требуют доказательств.');
  }catch(err){info('Изменения не сохранены: '+String(err.message||err)+'; проверьте версию чата.')}
  finally{busy=false}
 }
 async function append(c,kind,text,model,eventIdOverride){
  if(remote){
   const r=await request(SERVER+'?action=event','POST',{issueNumber:c.issueNumber,eventId:eventIdOverride||id(),kind,text,model});
   if(thread?.id===c.id&&!messages.some(item=>item.id===r.event?.id)){messages.push(r.event);renderMessages();}
  }else{
   const target=chats.find(v=>v.id===c.id);
   if(!target)throw Error('CHAT_NOT_FOUND');
   if(eventIdOverride&&(target.messages||[]).some(item=>item.id===eventIdOverride)){
    await persist();
    if(thread?.id===c.id){messages=target.messages;renderMessages();}
    return;
   }
   if((target.messages||[]).length>=400)throw Error('Слишком длинная история; сохраните копию');
   target.messages.push({schema:'HH_COMMANDER_EVENT_V1',id:eventIdOverride||id(),kind:kind==='ai'?'assistant_unverified':kind,
    author:kind==='owner'?'Владелец':kind==='ai'?'AI-ответ · не коммит':'Заметка владельца',
    text,model:model||'',createdAt:new Date().toISOString(),sourceVerified:false});
   target.updatedAt=new Date().toISOString();await persist();
   if(thread?.id===c.id){messages=target.messages;renderMessages();}
  }
  renderList();
 }
 function ensureCouncilFrame(){
  const frame=el('council-frame');
  show('council-panel',true);
  if(!frame.dataset.loaded){
   frame.dataset.loaded='yes';
   frame.addEventListener('load',()=>{councilFrameReady=true;sendCouncilPrompt()});
   frame.src=frame.dataset.src;
  }
 }
 function sendCouncilPrompt(){
  if(!councilFrameReady||!councilPending)return;
  try{
   el('council-frame').contentWindow.postMessage({protocol:COUNCIL_PROTOCOL,
    type:'HH_AI_COUNCIL_SET_PROMPT_V1',requestId:councilPending.requestId,prompt:councilPending.prompt},COUNCIL_ORIGIN);
   councilPending.sent=true;
   info('Вопрос передан в AI Council. Проверь его, выбери модели и подтверди запрос внутри Совета.');
  }catch(error){info('Не удалось передать вопрос в Совет ИИ: '+String(error.message||error))}
 }
 function councilChunkEventId(requestId,index){
  const parts=requestId.split('-');
  if(parts.length!==5||!/^[0-9a-f]{8}$/i.test(parts[0])||!/^[0-9a-f]{4}$/i.test(parts[1])||
   !/^[0-9a-f]{4}$/i.test(parts[2])||!/^[0-9a-f]{4}$/i.test(parts[3])||
   !/^[0-9a-f]{12}$/i.test(parts[4])||!Number.isSafeInteger(index)||index<0||index>11)
   throw Error('INVALID_COUNCIL_REQUEST_ID');
  const tail=parseInt(parts[4],16)+index;
  if(tail>0xffffffffffff)throw Error('COUNCIL_EVENT_ID_OVERFLOW');
  parts[4]=tail.toString(16).padStart(12,'0');
  return parts.join('-');
 }
 async function receiveCouncilMessage(event){
  if(event.origin!==COUNCIL_ORIGIN||event.source!==el('council-frame').contentWindow)return;
  const data=event.data;
  if(!data||data.protocol!==COUNCIL_PROTOCOL||typeof data.requestId!=='string')return;
  if(data.type==='HH_AI_COUNCIL_PROMPT_READY_V1'){
   if(councilPending?.requestId===data.requestId)info('Совет ИИ получил вопрос. Выбери модели, подтверди согласие и запусти анализ.');
   return;
  }
  if(data.type==='HH_AI_COUNCIL_DONE_V1'){
   if(councilPending?.requestId!==data.requestId)return;
   councilPending=null;info('Совет завершил ответ. Сохранение в приватный чат не было разрешено; отчёт остался в окне Совета.');
   return;
  }
  if(data.type!=='HH_AI_COUNCIL_RESULT_V1'||councilPending?.requestId!==data.requestId||
   typeof data.report!=='string'||data.report.length<20||data.report.length>18000||
   councilCompleted.has(data.requestId)||councilSaving.has(data.requestId))return;
  const pending=councilPending;
  councilSaving.add(data.requestId);
  try{
   const chunks=data.report.match(/[\s\S]{1,1640}/g)||[];
   if(!chunks.length||chunks.length>12)throw Error('REPORT_CHUNK_LIMIT');
   for(let index=0;index<chunks.length;index++){
    if(pending.savedChunks?.has(index))continue;
    const part='AI Council Free · часть '+(index+1)+'/'+chunks.length+'\n'+chunks[index];
    await append(pending.chat,'ai',part,'AI Council Free · бесплатные модели · согласованный отчёт',
      councilChunkEventId(data.requestId,index));
    (pending.savedChunks??=new Set()).add(index);
   }
   councilCompleted.add(data.requestId);councilPending=null;
   el('council-frame').contentWindow.postMessage({protocol:COUNCIL_PROTOCOL,type:'HH_AI_COUNCIL_SAVE_ACK_V1',requestId:data.requestId},COUNCIL_ORIGIN);
   info('Полный отчёт AI Council сохранён в приватном чате частями. Это консультация, не исполнение и не LIVE-доказательство.');
  }catch(error){
   el('council-frame').contentWindow.postMessage({protocol:COUNCIL_PROTOCOL,type:'HH_AI_COUNCIL_SAVE_FAILED_V1',requestId:data.requestId},COUNCIL_ORIGIN);
   info('Отчёт сохранён частично или не сохранён: '+String(error.message||error)+'. Повторная передача продолжит с недостающей части.');
  }finally{councilSaving.delete(data.requestId);}
 }
 async function assignSelectedExecutor(c,mode){
  if(mode==='council-free'||c.executors.includes(mode))return c;
  if(!EXEC[mode])throw Error('Неизвестный исполнитель');
  const current=c.executors||[];
  if(current.length>=6)throw Error('В чате уже назначено шесть исполнителей. Измените список в разделе «Контекст и проверки».');
  const chosen=[...current,mode];
  if(remote){
   const data={id:c.id,title:c.title,project:c.project,description:c.description||'',
    tasks:c.tasks||[],prs:c.prs||[],executors:chosen,status:c.status};
   const r=await request(SERVER+'?action=update','POST',{
    issueNumber:c.issueNumber,expectedRevision:c.revision,chat:data
   });
   const changed={...r.chat,issueNumber:c.issueNumber};
   chats=chats.map(x=>x.id===changed.id?changed:x);
   if(thread?.id===c.id)thread=changed;
   renderList();
   return changed;
  }
  c.executors=chosen;c.revision=(c.revision||0)+1;c.updatedAt=new Date().toISOString();
  await persist();renderList();
  return c;
 }
 async function send(e){
  e.preventDefault();if(!thread||busy)return;
  const text=el('message').value.trim(),mode=el('mode').value,model=el('model').value;
  if(text.length<2||text.length>1200)return info('Сообщение должно содержать 2–1200 символов.');
  if(['openrouter','hermes'].includes(mode)&&(!aiReady||!models.some(x=>x.id===model)))return info('Нет подтверждённой бесплатной модели OpenRouter.');
  let c=thread;
  if(mode!=='council-free'&&!thread.executors.includes(mode)){
   busy=true;el('send').disabled=true;
   try{c=await assignSelectedExecutor(c,mode);}
   catch(err){info('Не удалось выбрать исполнителя: '+String(err.message||err));return;}
   finally{busy=false;el('send').disabled=false;}
  }
  if(mode==='council-free'){
   if(councilPending)return info('Уже ожидается ответ Совета ИИ. Заверши текущий вопрос или переключись на него.');
   busy=true;el('send').disabled=true;
   try{
    await append(c,'owner',text,'');
    councilPending={requestId:id(),prompt:text,chat:c,sent:false};
    el('message').value='';ensureCouncilFrame();sendCouncilPrompt();
    info('Вопрос сохранён в рабочем чате. AI Council ждёт выбора моделей и отдельного согласия на отправку.');
   }catch(err){councilPending=null;info('Не удалось сохранить вопрос для AI Council: '+String(err.message||err));}
   finally{busy=false;el('send').disabled=false}
   return;
  }
  const context=messages.slice(-8).filter(x=>['owner','assistant_unverified'].includes(x.kind))
   .map(x=>({role:x.kind==='owner'?'user':'assistant',content:x.text.slice(0,800)}));
  const dispatchModes=new Set(['hermes','codex','chatgpt-work','repair-worker','manual']);
  if(dispatchModes.has(mode)){
   if(!remote)return info('Запуск доступен только для чата в защищённом серверном хранилище. Локальная копия не может запускать исполнителей.');
   busy=true;el('send').disabled=true;
   try{
    await append(c,'owner',text,'');el('message').value='';
    const runId=id(),idempotencyKey=id(),confirmGitHubWrite=mode==='hermes'&&el('hermes-write').checked;
    const result=await request(SERVER+'?action=run','POST',{
     issueNumber:c.issueNumber,runId,idempotencyKey,executor:mode,message:text,
     modelId:mode==='hermes'?model:undefined,confirmGitHubWrite
    });
    el('hermes-write').checked=false;
    try{
     const latest=await request(SERVER+'?action=read&issue='+c.issueNumber);
     if(thread?.id===c.id){thread=latest.chat;messages=latest.messages;renderThread();}
    }catch{}
    const reasons={
     HERMES_RUNTIME_NOT_CONFIGURED:'Hermes HTTPS runtime и секрет не настроены',
     HERMES_FREE_MODEL_NOT_SELECTED:'Выберите подтверждённую бесплатную модель',
     HERMES_GITHUB_WRITE_NOT_CONFIGURED:'GitHub Write не настроен на сервере; запуск остановлен безопасно',
     COMMANDER_FREE_EXECUTOR_NOT_CONFIGURED:'Бесплатный OpenRouter executor Hermes не настроен',
     OPENROUTER_IS_ADVISOR_MODE_NOT_EXECUTOR:'OpenRouter доступен как советник; для выполнения выберите Hermes',
     CODEX_LOCAL_AGENT_OFFLINE_OR_REMOTE_APPROVAL_DISABLED:'Локальный Codex agent Offline или remote approval выключен',
     REPAIR_WORKER_REQUIRES_EXACT_PR_HEAD_AND_ACTIVE_LEASE:'Нужны точный PR HEAD и активная lease',
     CHATGPT_WORK_TRANSPORT_NOT_AVAILABLE:'Нет поддерживаемого транспорта ChatGPT Work',
     MANUAL_EXECUTOR_REQUIRES_OWNER_HANDOFF:'Требуется ручная передача владельцем'
    };
    info(result.status==='BLOCKED'
     ?'Запрос и попытка сохранены. Исполнитель НЕ запущен: '+(reasons[result.reasonCode]||result.reasonCode)+'. Код: '+result.reasonCode+'.'
     :'Hermes принял запрос: '+(result.status||'STARTING')+'. Receipt будет обновляться в чате; это ещё не подтверждение коммита, CI, merge или LIVE.');
    startExecutionPolling();
   }catch(err){info('Сообщение сохранено, но запуск не подтверждён: '+String(err.message||err))}
   finally{busy=false;el('send').disabled=false}
   return;
  }
  busy=true;el('send').disabled=true;
  try{
   await append(c,'owner',text,'');el('message').value='';
   const contextText=['Тема: '+c.title,'Цель: '+(c.description||''),'PR: '+(c.prs||[]).map(n=>'#'+n).join(', ')].join('\n');
   const room=Math.max(0,1200-text.length-2);
   const contextPart=contextText.slice(0,Math.min(320,room));
   const requestMessage=contextPart?contextPart+'\n'+text:text;
   const r=await request(AI+'?action=chat','POST',{mode,message:requestMessage,model:mode==='openrouter'?model:undefined,
    tasks:c.tasks||[],history:context});
   if(typeof r.reply!=='string'||!r.reply.trim())throw Error('Пустой ответ AI');
   await append(c,'ai',r.reply.slice(0,1800),r.model||mode);
   info('Ответ сохранён. Это консультация, не коммит или LIVE.');
  }catch(err){info('Сохранение/AI неполное: '+String(err.message||err))}
  finally{busy=false;el('send').disabled=false}
 }
 async function addNote(){
  if(!thread||busy)return;const text=el('message').value.trim();
  if(!text||text.length>1800)return info('Заметка должна содержать 1–1800 символов.');
  busy=true;try{await append(thread,'note',text,'');el('message').value='';info('Заметка сохранена, результат пока не верифицирован.')}
  catch(err){info('Ошибка заметки: '+String(err.message||err))}finally{busy=false}
 }
 async function checkPRs(){
  if(!thread)return;const root=el('pr-proof');root.replaceChildren();
  if(!thread.prs?.length)return info('Добавьте связанные PR в настройки чата.');
  for(const n of thread.prs.slice(0,15)){
   const row=make('div','cc-pr-row','Проверяю PR #'+n);root.append(row);
   try{
    let v;
    if(remote)v=await request(SERVER+'?action=proof&pr='+n);
    else{
     const response=await win.fetch('https://api.github.com/repos/andylitvinov-design/books/pulls/'+n,{cache:'no-store'});
     if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();
     v={merged:!!d.merged_at,mergedAt:d.merged_at,open:d.state==='open',draft:d.draft,headSha:d.head?.sha};
    }
    row.textContent='PR #'+n+' · '+(v.merged?'MERGED '+time(v.mergedAt):v.open?(v.draft?'Draft':'Открыт'):'Закрыт без Merge')+
     ' · HEAD '+String(v.headSha||'неизвестно').slice(0,9)+' · CI и LIVE не подтверждены';
    htmlLink(row,'Открыть PR','https://github.com/andylitvinov-design/books/pull/'+n);
   }catch(err){row.textContent='PR #'+n+' · статус неизвестен: '+String(err.message||err)}
  }
  info('Статусы PR проверены отдельно; функциональный LIVE ещё не проверен.');
 }
 function reportMentionsPr(report,numbers){
  const haystack=String(report?.body||'')+' '+String(report?.url||'');
  return numbers.some(n=>new RegExp('(?:\\bPR\\s*#?'+n+'(?!\\d)|/pull/'+n+'(?:\\b|/))','i').test(haystack));
 }
 async function stableReportEventId(chatId,reportId){
  const input=new win.TextEncoder().encode('HH_COMMANDER_CI_REPORT_V1:'+chatId+':'+reportId);
  const hash=new Uint8Array(await win.crypto.subtle.digest('SHA-256',input));
  const bytes=Array.from(hash.slice(0,16));
  bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
  const hex=bytes.map(v=>v.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
 }
 async function reportList({automatic=false,silent=false}={}){
  if(!thread||reportSyncBusy)return;
  const current=thread,box=el('report-list');reportSyncBusy=true;
  if(!silent)box.replaceChildren(make('p','cc-help','Получаю свежие CI/Repair отчёты…'));
  try{
   if(!Array.isArray(current.prs)||!current.prs.length){
    box.replaceChildren(make('p','cc-help','Добавьте номер PR в настройки чата, чтобы получать связанные CI/Repair отчёты.'));
    return;
   }
   const d=await request(AI+'?action=reports');
   if(thread?.id!==current.id)return;
   const agents=['GitHub Actions','ChatGPT Triage','OpenRouter Free · GitHub Worker','GitHub Repair Gateway'];
   const reports=(d.reports||[]).filter(r=>r.sourceVerified===true&&agents.includes(r.agent)&&
    typeof r.id==='string'&&typeof r.url==='string'&&reportMentionsPr(r,current.prs))
    .sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)).slice(0,6);
   box.replaceChildren();
   if(!reports.length){
    box.append(make('p','cc-help','Для связанных PR новых подписанных отчётов пока нет. Проверка обновляется при открытии чата и каждые 2 минуты, пока он открыт.'));
    return;
   }
   for(const r of reports){
    if(thread?.id!==current.id)break;
    let eventId='';
    try{eventId=await stableReportEventId(current.id,r.id)}catch{}
    let attached=!!eventId&&messages.some(m=>m.id===eventId);
    const target=chats.find(x=>x.id===current.id);
    if(!attached&&target&&!remote)attached=(target.messages||[]).some(m=>m.id===eventId);
    if(automatic&&!attached&&eventId)attached=await attach(r,null,eventId,true);
    const item=make('div','cc-report');
    item.append(make('strong',null,r.agent+' · '+time(r.createdAt)),
     make('p',null,r.body.slice(0,480)),
     make('small','cc-help','Отчёт по PR #'+current.prs.filter(n=>reportMentionsPr(r,[n])).join(', #')+' · не доказательство source commit или LIVE'));
    htmlLink(item,'Источник GitHub',r.url);
    if(attached)item.append(make('small','cc-report-attached','✓ Добавлено в историю этого чата'));
    else{
     const b=make('button',null,'Прикрепить к чату');b.type='button';
     b.addEventListener('click',()=>attach(r,b,eventId||undefined,false));item.append(b);
    }
    box.append(item);
   }
  }catch(err){box.replaceChildren(make('p','cc-help','Источники недоступны: '+String(err.message||err)))}
  finally{reportSyncBusy=false;}
 }
 async function attach(r,b,eventIdOverride,quiet=false){
  if(!thread||busy)return false;
  const current=thread;busy=true;if(b)b.disabled=true;
  try{
   let event=null;
   if(remote){
    const d=await request(SERVER+'?action=attach','POST',{issueNumber:current.issueNumber,eventId:eventIdOverride||id(),url:r.url});
    event=d.event||null;
   }else{
    const target=chats.find(x=>x.id===current.id);if(!target)throw Error('CHAT_NOT_FOUND');
    const eventId=eventIdOverride||id();
    event=(target.messages||[]).find(x=>x.id===eventId)||{
     schema:'HH_COMMANDER_EVENT_V1',id:eventId,kind:'github_report',author:r.agent,
     text:r.body.slice(0,1600),url:r.url,createdAt:r.createdAt,sourceVerified:false,proofLevel:'REPORT_ONLY_NOT_COMMIT'
    };
    if(!(target.messages||[]).some(x=>x.id===eventId)){
     target.messages.push(event);target.updatedAt=new Date().toISOString();await persist();
    }
   }
   if(event&&thread?.id===current.id&&!messages.some(x=>x.id===event.id))messages.push(event);
   if(thread?.id===current.id){renderMessages();renderList();}
   if(!quiet)info('Отчёт прикреплён; он не доказывает код, Merge или LIVE.');
   return Boolean(event);
  }catch(err){if(!quiet)info('Не удалось прикрепить отчёт: '+String(err.message||err));return false}
  finally{busy=false;if(b)b.disabled=false}
 }
 async function handoff(){
  if(!thread)return;
  const c=thread,lines=['AGENT COMMANDER · THREAD HANDOFF','Задача: '+c.title,'Проект: '+c.project,
   'Описание: '+c.description,'Задачи: '+c.tasks.join(', '),
   'Исполнители: '+c.executors.map(x=>EXEC[x]).join(', '),'PR: '+c.prs.join(', '),
   'Текущий статус: '+STATES[c.status],'История:',
   ...messages.slice(-12).map(m=>'['+m.kind+'] '+m.text.slice(0,400)),
   '','Это передача, не запуск. Проверить PR HEAD, lease, exact CI, protected Merge, реальный LIVE.',
   'https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md'];
  try{await win.navigator.clipboard.writeText(lines.join('\n'));info('Задание скопировано. Отправьте его исполнителю для запуска.')}
  catch{info('Автоматическое копирование заблокировано браузером.')}
 }
 async function openRequestedTask(){
  const requested=new URLSearchParams(win.location.search).get('task');
  if(!requested)return;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requested))
   return info('Некорректный идентификатор задачи.');
  if(!remote)return info('Связать чат с сохранённой задачей можно только в защищённом серверном хранилище. Локальный архив — отдельная копия.');
  try{
   const result=await request(SERVER+'?action=from_task','POST',{taskId:requested});
   const chat={...result.chat,issueNumber:result.issueNumber};
   const ix=chats.findIndex(c=>c.id===chat.id);
   if(ix>=0)chats[ix]=chat;else chats.unshift(chat);
   await openChat(chat);
   win.history?.replaceState?.(null,'','/chats.html');
   info('Открыт один чат сохранённой задачи. Исполнитель ещё не запущен.');
  }catch(err){info('Не удалось связать задачу с чатом: '+String(err.message||err))}
 }
 async function listRemote(){
  const r=await request(SERVER+'?action=list');
  if(!Array.isArray(r.chats))throw Error('Сервер вернул некорректный список рабочих чатов.');
  chats=r.chats;
  renderList();if(r.incomplete)info('Индекс серверных чатов неполон: лимит GitHub API.');
  return r;
 }
 async function authenticated(){
  authorized=true;show('login',false);
  let status,statusError=null;
  try{status=await request(SERVER+'?action=status')}
  catch(error){statusError=error;status={privateStoreConfigured:false}}
  remote=!!status.privateStoreConfigured;
  if(statusError){
   show('vault',false);show('board',false);
   el('storage-label').textContent='Проверка защищённого серверного хранилища временно не завершилась.';
   info('Вход владельца подтверждён, но сервер чатов не ответил: '+String(statusError.message||statusError)+' Нажмите «Обновить», чтобы повторить проверку.');
   return;
  }
  el('storage-label').textContent=remote?'Защищённые чаты Supabase · история доступна между устройствами.':
   'Зашифровано на этом устройстве · серверная синхронизация не подключена.';
  show('vault',false);show('board',remote);show('export',!remote);show('import-label',!remote);
  try{
   const s=await request(AI+'?action=status');aiReady=s.modes?.openrouter===true;
   if(aiReady){const m=await request(AI+'?action=models');models=m.models||[];aiReady=models.length>0;}
  }catch{aiReady=false;models=[]}
  for(const select of [el('model'),el('new-model')]){
   select.replaceChildren();
   for(const m of models){const o=make('option',null,m.name+' · '+m.id);o.value=m.id;select.append(o);}
  }
  for(const select of [el('mode'),el('new-mode')]){
   select.querySelector('option[value=openrouter]').disabled=!aiReady;
   select.querySelector('option[value=hermes]').disabled=!aiReady;
  }
  el('new-mode').value=aiReady?'openrouter':'local';
  show('free-model-status',!aiReady);
  if(remote){
   show('board',true);
   try{await listRemote();info('Рабочие чаты загружены.');await openRequestedTask();}
   catch(e){
    // A transient API failure must not silently replace server chats with a local vault.
    el('storage-label').textContent='Серверное хранилище временно недоступно. Локальная копия не подменяет рабочие чаты.';
    info('Не удалось загрузить рабочие чаты: '+String(e.message||e)+' Нажмите «Обновить», чтобы повторить.');
   }
  }
  if(!remote){
   show('export',true);show('import-label',true);
   try{
    const unlocked=await unlockDevice();show('vault',!unlocked);show('board',unlocked);
    if(unlocked){renderList();info('Рабочие чаты открыты без дополнительного пароля.');}
    else info('Для переноса старой истории введите её прежний пароль один раз.');
   }catch(e){show('board',false);show('vault',true);info('Автоматическое хранилище недоступно: '+String(e.message||e))}
  }
 }
 el('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  try{
   const r=await win.fetch('/api/seo-auth',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({password:el('password').value})});
   el('password').value='';if(!r.ok)throw Error('Код владельца не принят');await authenticated();
  }catch(err){info('Вход не выполнен: '+String(err.message||err))}
 });
 el('vault-form').addEventListener('submit',async e=>{
  e.preventDefault();try{await unlock(el('vault-password').value);await migrateLegacy();el('vault-password').value='';
   show('vault',false);show('board',true);renderList();info('Чаты открыты. Повторный пароль больше не требуется.')}
  catch(err){info('Хранилище не открыто: '+String(err.message||err))}
 });
 function showNewChat(){
  if(busy)return;
  stopExecutionPolling();
  if(reportRefreshTimer!==null)win.clearInterval(reportRefreshTimer);
  reportRefreshTimer=null;thread=null;messages=[];pendingCreateId=null;el('history').open=false;
  show('thread',false);show('create',true);renderList();
  el('create-feedback').textContent='';show('create-feedback',false);
  el('create').scrollIntoView({block:'start',behavior:'smooth'});
 }
 el('new-toggle').addEventListener('click',showNewChat);
 el('context-toggle').addEventListener('click',()=>{
  const dialog=el('new-context');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 });
 el('context-close').addEventListener('click',()=>{
  const dialog=el('new-context');if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
 });
 el('create-form').addEventListener('input',()=>{pendingCreateId=null;el('create-feedback').hidden=true;});
 el('create-form').addEventListener('change',()=>{pendingCreateId=null;el('create-feedback').hidden=true;});
 el('create-form').addEventListener('submit',create);el('metadata-form').addEventListener('submit',update);
 el('chat-form').addEventListener('submit',send);el('note').addEventListener('click',addNote);
 el('check-prs').addEventListener('click',checkPRs);el('load-reports').addEventListener('click',reportList);
 el('handoff').addEventListener('click',handoff);
 el('verify-chat').addEventListener('click',verifySavedThread);
 el('search').addEventListener('input',renderList);el('filter').addEventListener('change',renderList);
 el('close-thread').addEventListener('click',showNewChat);
 el('refresh').addEventListener('click',async()=>{
  if(busy)return;
  busy=true;el('refresh').disabled=true;
  try{
   if(remote){await listRemote();info('Серверные рабочие чаты обновлены.');}
   else if(authorized){await authenticated();}
   else{
    const s=await request(AI+'?action=status');
    if(s.authenticated===true)await authenticated();
    else throw Error('Сессия владельца закончилась. Войдите через Google.');
   }
  }catch(e){info('Проверка рабочих чатов не завершена: '+String(e.message||e));}
  finally{busy=false;el('refresh').disabled=false;}
 });
 el('export').addEventListener('click',exportBackup);el('import').addEventListener('change',importBackup);
 el('mode').addEventListener('change',()=>{updateExecutorControls();if(el('mode').value!=='council-free')show('council-panel',false)});
 el('new-mode').addEventListener('change',()=>updateExecutorControls('new'));
 win.addEventListener('message',event=>{void receiveCouncilMessage(event)});
 request(AI+'?action=status').then(s=>s.authenticated?authenticated():Promise.reject()).catch(()=>{
  authorized=false;show('login',true);info('Продолжите через Google — отдельный код PR Monitor не нужен.');
   win.HHGoogleOwnerSSO?.mount(el('google-owner'),s=>info(s));
 });
})(window,document);
