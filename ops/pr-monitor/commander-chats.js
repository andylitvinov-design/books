'use strict';
/* HH_COMMANDER_THREADS_V1: authenticated multi-chat workspace.
 * Durable storage: owner-verified Supabase private tables; fallback: AES-GCM vault
 * on this device. Assignment and AI answers are NOT agent execution.
 */
(function(win,doc){
 if(!doc.getElementById('cc-chat-root'))return;
 const el=id=>doc.getElementById('cc-'+id),SERVER='/api/commander-chats',AI='/api/pm-agent-chat';
 const MAIN='https://holistichouse.vercel.app';
 const KEY='hh.commander.chat-vault.v1',SCHEMA='HH_COMMANDER_LOCAL_CHATS_V1';
 const EXEC={local:'Локальный советник',director:'Agents Director · OpenRouter Free',openrouter:'OpenRouter Free',codex:'Codex · передача',
  'chatgpt-work':'ChatGPT Work · передача','repair-worker':'GitHub Repair Worker · передача',
  hermes:'Hermes · OpenRouter Free',manual:'Ручной исполнитель'};
 const STATES={planned:'Запланировано',assigned:'Назначено · не запущено',working:'В работе · по заявлению',
  review:'Проверка',blocked:'Блокировано',archived:'Архив · LIVE не подтверждён'};
 let remote=false,authorized=false,chats=[],thread=null,messages=[],key=null,salt=null,deviceMode=false,models=[],aiReady=false,busy=false,ownedDirectorAvailable=false;
 let reportRefreshTimer=null,reportSyncBusy=false,pendingCreateId=null,ciInboxTimer=null,ciInboxBusy=false;
 let executorModels=null,executorModelsPromise=null,executionRefreshTimer=null,executionPollCount=0,executionPollBusy=false;
 let runSnapshot=null;
 let freeQuota=null,freeQuotaPending=null,freeQuotaCheckedAt=0,lastQuotaTerminalRunId=null;
 const FREE_MODEL_MODE='free:';
 const selectedFreeModel=mode=>typeof mode==='string'&&mode.startsWith(FREE_MODEL_MODE)?mode.slice(FREE_MODEL_MODE.length):'';
 const isVerifiedFreeChoice=mode=>Boolean(selectedFreeModel(mode)&&(executorModels||[]).some(m=>m.id===selectedFreeModel(mode)));
 // The native model picker shares one currently verified OpenRouter quota per
 // account; individual :free models do not have their own invented allowance.
 function refreshFreeChoices(){
  for(const id of ['new-mode','mode']){
   const selector=el(id),previous=selector.value;
   const current=selector.querySelector('optgroup[data-director-free]');
   // Browsers support Element.remove(); minimalist DOM adapters may only
   // expose parentNode.removeChild. Never allow a missing convenience method
   // to break the entire owner chat / quota-picker initialization.
   if(current&&typeof current.remove==='function')current.remove();
   else if(current?.parentNode&&typeof current.parentNode.removeChild==='function')
    current.parentNode.removeChild(current);
   if(!remote||!authorized||!ownedDirectorAvailable||!executorModels?.length)continue;
   const group=make('optgroup');
   group.label='OpenRouter · бесплатные модели';
   group.setAttribute('data-director-free','');
   const preferred=/nemotron|gemma|qwen|deepseek|llama|mistral|phi|cohere/i;
   const modelsList=executorModels.slice().sort((a,b)=>
    Number(preferred.test(b.name+' '+b.id))-Number(preferred.test(a.name+' '+a.id))||
    a.name.localeCompare(b.name,'ru'));
   for(const model of modelsList.slice(0,15)){
    const label=model.name.replace(/\s*\(free\)\s*/ig,'').slice(0,39);
    const option=make('option',null,label+' — '+remainingLabel('director'));
    option.value=FREE_MODEL_MODE+model.id;
    option.title=model.id+' · $0 · общий лимит OpenRouter (Agents Director)';
    group.append(option);
   }
   const executors=selector.querySelector('optgroup[label^="Исполнители"]');
   if(executors&&typeof selector.insertBefore==='function')selector.insertBefore(group,executors);else selector.append(group);
   if(isVerifiedFreeChoice(previous))selector.value=previous;
   else if(selectedFreeModel(previous))selector.value='director';
  }
 }
 const QUOTA_OPTION_LABELS={
  local:"Локальный советник",director:"Agents Director · OpenRouter Free (анализ)",
  openrouter:"OpenRouter Free","council-free":"Совет ИИ · ответ в чате",
  codex:"Codex","chatgpt-work":"ChatGPT Work","repair-worker":"GitHub Repair Worker",
  hermes:"Hermes Cloud",manual:"Ручной исполнитель"
 };
 function remainingLabel(mode){
  if(mode==="local")return "без лимита";
  if(mode==="hermes")return "отключён";
  if(mode==="manual")return "ручная передача";
  if(!["director","council-free","openrouter"].includes(mode))return "лимит неизвестен";
  const quota=mode==="openrouter"?freeQuota?.monitor:freeQuota?.worker;
  return quota?.status==="VERIFIED"&&Number.isSafeInteger(quota.remaining)&&quota.remaining>=0?
   quota.remaining+" осталось":"нет данных";
 }
 function updateQuotaMenuLabels(){
  for(const scope of ["new-mode","mode"]){
   for(const option of el(scope).querySelectorAll("option")){
    const base=QUOTA_OPTION_LABELS[option.value];
    if(base)option.textContent=base+" — "+remainingLabel(option.value);
   }
  }
  refreshFreeChoices();
 }
 async function refreshFreeQuota(force=false){
  if(!remote||!authorized){updateQuotaMenuLabels();return;}
  if(freeQuotaPending)return freeQuotaPending;
  if(!force&&freeQuotaCheckedAt&&Date.now()-freeQuotaCheckedAt<45000)return;
  freeQuotaPending=request(SERVER+"?action=free_quota").then(result=>{
   if(result?.schema!=="HH_COMMANDER_QUOTA_MENU_V1"||
      result.worker?.schema!=="HH_COMMANDER_FREE_QUOTA_V1"||
      result.monitor?.schema!=="HH_COMMANDER_FREE_QUOTA_V1")
    throw Error("QUOTA_RESPONSE_INVALID");
   freeQuota={worker:result.worker,monitor:result.monitor};
  }).catch(()=>{freeQuota=null;}).finally(()=>{
   freeQuotaCheckedAt=Date.now();freeQuotaPending=null;
   updateQuotaMenuLabels();configureModels("new");configureModels("thread");
  });
  return freeQuotaPending;
 }
 // One-tap Council via same-origin, owner-verified server.
 let councilPending=null,councilChatIds=new Set();
 const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const show=(id,yes)=>{el(id).hidden=!yes};
 const info=s=>{
  const message=String(s);
  el('alert').textContent=message;
  const target=thread&&!el('thread').hidden?el('chat-feedback'):el('create-feedback');
  // Do not turn successful background loading into a giant banner under the composer.
  const routine=/^(?:Рабочие чаты загружены\.|Рабочие чаты открыты без дополнительного пароля\.|Серверные рабочие чаты обновлены\.)$/.test(message);
  if(target){target.textContent=routine?'':message;target.hidden=routine||!message;}
 };
 const time=s=>{try{return new Date(s).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'})}catch{return '—'}};
 const id=()=>win.crypto.randomUUID();
 const htmlLink=(box,label,url)=>{
  if(!/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+|issues\/(?:1419|3128|3890)#issuecomment-\d+)$/.test(url))return;
  const a=make('a',null,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
 };
 let ownerRefreshPromise=null;
 async function refreshOwnerSession(){
  if(ownerRefreshPromise)return ownerRefreshPromise;
  ownerRefreshPromise=(async()=>{
   const controller=new AbortController(),timer=win.setTimeout(()=>controller.abort(),10000);
   try{
    const response=await win.fetch('/api/commander-session',{credentials:'same-origin',cache:'no-store',
     headers:{Accept:'application/json'},signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.authenticated!==true||data.owner!==true)
     throw Error(data.error||'Сессия владельца истекла. Войдите через Google повторно.');
    return data;
   }catch(error){
    if(error?.name==='AbortError')throw Error('Не удалось продлить сессию владельца. Повторите проверку.');
    throw error;
   }finally{win.clearTimeout(timer)}
  })();
  try{return await ownerRefreshPromise}finally{ownerRefreshPromise=null}
 }
 async function request(url,method='GET',body,retried=false){
  const timeoutMs=url===AI+'?action=council'?45000:13000;
  const controller=new AbortController(),timer=win.setTimeout(()=>controller.abort(),timeoutMs);
  let r;
  try{
   r=await win.fetch(url,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
    headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  }catch(error){
   if(error?.name==='AbortError')throw Error('Сервер не ответил за 13 секунд. Повторите проверку соединения.');
   throw error;
  }finally{win.clearTimeout(timer)}
  if(r.status===401&&!retried&&url!=='/api/commander-session'){
   await refreshOwnerSession();
   return request(url,method,body,true);
  }
  let j;try{j=await r.json()}catch{throw Error('Не удалось прочитать ответ сервера')}
  if(!r.ok){const error=Error(j.error||'HTTP '+r.status);error.status=r.status;throw error;}return j;
 }
 async function loadExecutorModels(){
  if(!remote)return;
  try{await ensureExecutorModels();configureModels('new');configureModels('thread');}
  catch(error){info('Каталог бесплатных моделей OpenRouter недоступен: '+String(error.message||error));}
 }

 function lastQuestion(){
  for(let i=messages.length-1;i>=0;i--){
   if(messages[i]?.kind!=='owner')continue;
   return messages.slice(i+1).some(m=>['assistant_unverified','agent_final','ai'].includes(m.kind))?null:messages[i];
  }
  return null;
 }
 function showRunState(run){
  const panel=el('run-status'),label=el('run-status-label'),detail=el('run-status-detail'),button=el('retry-run');
  if(!panel||!thread)return;
  const unanswered=lastQuestion();
  const sec=run?.created_at?Math.max(0,Math.floor((Date.now()-Date.parse(run.created_at))/1000)):0;
  const elapsed=Number.isFinite(sec)?(sec<60?sec+' с':Math.floor(sec/60)+' мин'):'';
  let headline='',subtitle='',tone='neutral',retry=false;
  if(!run){
   if(remote&&unanswered){headline='Вопрос сохранён · не отправлен';subtitle='Запуск OpenRouter не найден';retry=true;tone='warning';}
  }else if(run.status==='QUEUED'||run.status==='STARTING'){
   headline='OpenRouter · в очереди';subtitle='Ожидает Worker · '+elapsed;tone='pending';
  }else if(run.status==='RUNNING'){
   headline='OpenRouter · обрабатывает';subtitle=(run.worker_attempt_count>1?'Попытка '+run.worker_attempt_count+' · ':'')+
    (run.actual_model_id||'Бесплатная модель')+' · '+elapsed;tone='pending';
  }else if(run.status==='COMPLETED'){
   const delivered=messages.some(m=>m.kind==='agent_final'&&m.runId===run.run_id);
   headline=delivered?'Готово · ответ в чате':'Ответ готов · сохраняю в чат';
   subtitle=(run.actual_model_id||'OpenRouter Free')+(run.cost_usd!=null&&Number(run.cost_usd)===0?' · $0.00':'');
   tone=delivered?'done':'pending';
  }else if(run.status==='FAILED'||run.status==='BLOCKED'){
   headline='OpenRouter · ошибка';subtitle=String(run.worker_last_error_code||run.reason_code||'Ошибка').slice(0,80);
   tone='error';retry=!!unanswered;
  }else{
   headline='Исполнитель · '+String(run.status||'UNKNOWN').slice(0,25);
   subtitle=String(run.reason_code||'Проверяю').slice(0,80);tone='warning';
  }
  panel.hidden=!headline;panel.dataset.state=tone;
  label.textContent=headline;detail.textContent=subtitle;
  button.hidden=!retry||!remote||!authorized;button.disabled=busy;
 }

 async function refreshExecutionRuns(){
  if(!remote||!thread||!authorized||executionPollBusy)return null;
  executionPollBusy=true;
  try{
   const result=await request(SERVER+'?action=runs&issue='+thread.issueNumber);
   const run=Array.isArray(result.runs)?result.runs[0]:null;
   runSnapshot={chatId:thread.id,run};showRunState(run);
   if(!run)return null;
   const labels={QUEUED:'В очереди OpenRouter.',STARTING:'Исполнитель запускается…',RUNNING:'Исполнитель работает…',WAITING_FOR_APPROVAL:'Ожидается подтверждение владельца.',COMPLETED:'Исполнение завершено. Ответ добавлен в чат.',FAILED:'Исполнение завершилось ошибкой.',CANCELLED:'Исполнение отменено.',BLOCKED:'Исполнитель не запущен или выполнение заблокировано.'};
   el('executor-state').textContent=(labels[run.status]||run.status||'Статус неизвестен')+(run.reason_code?' Причина: '+run.reason_code+'.':'')+(run.hermes_job_id?' · Job '+run.hermes_job_id:'');
   if(['COMPLETED','FAILED','BLOCKED'].includes(run.status)){
    if(run.run_id&&run.run_id!==lastQuotaTerminalRunId){
     lastQuotaTerminalRunId=run.run_id;void refreshFreeQuota(true);
    }
    const latest=await request(SERVER+'?action=read&issue='+thread.issueNumber);
    if(thread?.id===latest.chat?.id){thread=latest.chat;messages=latest.messages;renderMessages();
     if(run.status==='COMPLETED'&&!messages.some(m=>m.kind==='agent_final'&&m.runId===run.run_id))run.awaitingFinal=true;
     showRunState(run);
    }
   }
   return run;
  }catch{return null;}finally{executionPollBusy=false;}
 }
 function startExecutionPolling(){
  if(executionRefreshTimer!==null)win.clearInterval(executionRefreshTimer);
  executionRefreshTimer=null;executionPollCount=0;if(!thread||!remote||!authorized)return;
  executionRefreshTimer=win.setInterval(async()=>{
   if(!thread||doc.visibilityState==='hidden'||executionPollBusy)return;
   if(executionPollCount++>=90){win.clearInterval(executionRefreshTimer);executionRefreshTimer=null;return;}
   const run=await refreshExecutionRuns();
   if(!run||(!['QUEUED','STARTING','RUNNING'].includes(run.status)&&run.awaitingFinal!==true)){
    win.clearInterval(executionRefreshTimer);executionRefreshTimer=null;
   }
  },10000);
 }
   async function loadCIInbox({silent=false}={}){
   if(!remote||!authorized||ciInboxBusy)return;
   ciInboxBusy=true;const box=el('ci-list'),meta=el('ci-meta');
   if(!silent){box.replaceChildren(make('p','cc-help','Получаю подтверждённые CI-события…'));show('ci-inbox',true);}
   try{
    const data=await request(SERVER+'?action=ci_events&limit=30');
    if(!Array.isArray(data.events))throw Error('Некорректный ответ CI Inbox');
    const events=data.events.slice(0,30);show('ci-inbox',true);meta.textContent=events.length+' · последние события';box.replaceChildren();
    if(!events.length){box.append(make('p','cc-help','Подтверждённых CI-событий пока нет.'));return;}
    for(const event of events){
     const item=make('article','cc-report'),state=String(event.association_status||'UNMATCHED');
     const label=state==='MATCHED_CHAT_EVENT_RECORDED'?'Прикреплено к чату':
      state==='MATCHED_TASK_NO_CHAT'?'Задача найдена · чат не создан':
      state.startsWith('AMBIGUOUS')?'Неоднозначная привязка · требуется проверка':'Не привязано к чату';
     item.append(make('strong',null,'PR #'+event.pr_number+' · '+String(event.category||'UNKNOWN')),
      make('p','cc-help','HEAD '+String(event.head_sha||'').slice(0,12)+' · '+time(event.created_at)),
      make('p',null,'Упавшие задачи: '+(Array.isArray(event.failed_jobs)?event.failed_jobs.join(', '):'—')),
      make('p',null,'Упавшие этапы: '+(Array.isArray(event.failed_steps)?event.failed_steps.join('; '):'—')),
      make('small','cc-help',label+' · '+String(event.conclusion||'failure')));
     if(typeof event.run_url==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(event.run_url)){
      const a=make('a',null,'Открыть CI run ↗');a.href=event.run_url;a.target='_blank';a.rel='noopener noreferrer';item.append(a);
     }
     const classification=event.classification&&typeof event.classification==='object'?event.classification:null;
     const recommendation=classification?.recommended_action;
     if(classification){
      const role=String(classification.responsible_role||'ci-diagnostic-triage');
      const status=String(classification.recommended_status||'UNCLASSIFIED');
      const retry=classification.retry&&typeof classification.retry==='object'?classification.retry:null;
      item.append(make('p','cc-ci-classification-label','Общая классификация · '+String(classification.ruleset_version||'ruleset')+
       ' · '+String(classification.confidence??'—')+' confidence'),
       make('p','cc-help','Решение: '+String(classification.reason_code||'UNCLASSIFIED')+
        ' · статус: '+status+' · роль: '+role));
      if(typeof recommendation==='string'&&recommendation.length)
       item.append(make('p','cc-ci-classification-action','Рекомендация: '+recommendation.slice(0,700)));
      if(retry)item.append(make('small','cc-help','Повтор: '+(retry.allowed===true?'разрешён':'не разрешён')+
       ' · максимум: '+String(Number.isSafeInteger(retry.max_attempts)?retry.max_attempts:0)+
       ' · требуется человек: '+(classification.requires_human===true?'да':'нет')));
     }else item.append(make('p','cc-help','Классификация не получена; событие остаётся диагностическим.'));
     item.append(make('small','cc-help','Классификатор не разрешает запись в GitHub, retry, merge или deploy автоматически.'));
     box.append(item);
    }
   }catch(error){if(!silent||!box.childElementCount){show('ci-inbox',true);box.replaceChildren(make('p','cc-help','Inbox временно недоступен: '+String(error.message||error)));}}
   finally{ciInboxBusy=false;}
  }
  function startCIInboxPolling(){
   if(ciInboxTimer!==null)win.clearInterval(ciInboxTimer);ciInboxTimer=null;
   if(!remote||!authorized)return;
   void loadCIInbox({silent:true});
   ciInboxTimer=win.setInterval(()=>{if(doc.visibilityState!=='hidden')void loadCIInbox({silent:true});},120000);
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
   tasks:tasks(value('tasks')),prs:prs(value('prs')),executors:prefix==='new-'?(['council-free','director'].includes(value('mode'))||isVerifiedFreeChoice(value('mode'))?['local']:[value('mode')]):picks('executors'),
   status:prefix==='new-'?'planned':value('status')};
  if(prefix==='new-'&&value('mode')!=='council-free'&&!EXEC[value('mode')]&&!isVerifiedFreeChoice(value('mode')))throw Error('Неизвестный исполнитель');
  if(r.title.length<4||r.title.length>110||r.description.length>1000)throw Error('Название: 4–110 символов; цель до 1000');
  if(prefix==='new-'){
   const rawCriteria=value('acceptance').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   if(rawCriteria.length>5||rawCriteria.some(x=>x.length>500)||rawCriteria.reduce((n,x)=>n+x.length,0)>2500)
    throw Error('Укажите до 5 критериев, не более 500 символов каждый.');
   const rawSkills=value('skill-ids').split(',').map(x=>x.trim()).filter(Boolean);
   if(rawSkills.length>10||rawSkills.some(x=>!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(x))||new Set(rawSkills).size!==rawSkills.length)
    throw Error('Проверьте Skill IDs: до 10 уникальных идентификаторов.');
   r.goal=r.description||r.title;
   r.acceptanceCriteria=rawCriteria;
   r.skillIds=rawSkills;
  }
  return r;
 }
 function executorBoxes(chosen){
  const field=el('executors');field.replaceChildren();
  Object.entries(EXEC).filter(([k])=>k!=='director').forEach(([k,label])=>{
   const l=make('label'),c=make('input');c.type='checkbox';c.value=k;c.checked=chosen.includes(k);
   l.append(c,make('span',null,label));field.append(l);
  });
 }
 function renderList(){
  el('count').textContent=chats.length;
  el('active-count').textContent=chats.filter(c=>['assigned','working','review'].includes(c.status)).length;
  el('blocked-count').textContent=chats.filter(c=>c.status==='blocked').length;
  el('list-meta').textContent=chats.length?'· '+chats.length:'';
  const q=el('search').value.trim().toLowerCase(),status=el('filter').value,box=el('chat-list');
  box.replaceChildren();
  const filtered=chats.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))
   .filter(c=>{
    if(status!=='all'&&c.status!==status)return false;
    const hay=[c.title,c.description,c.project,...(c.tasks||[]),...(c.prs||[])].join(' ').toLowerCase();
    return !q||hay.includes(q);
   });
  const expanded=el('history-all').open;
  for(const c of (expanded?filtered:filtered.slice(0,5))){
   const b=make('button','cc-chat-card');
   b.type='button';b.setAttribute('aria-current',String(thread?.id===c.id));
   const mark=make('span','cc-chat-symbol','◌');
   const body=make('span','cc-chat-card-body');
   body.append(make('strong',null,c.title),make('span',null,time(c.updatedAt)+(c.status==='blocked'?' · Требует внимания':'')));
   b.append(mark,body);
   b.addEventListener('click',()=>openChat(c));box.append(b);
  }
  if(!filtered.length)box.append(make('p','cc-empty',chats.length?'Чаты не найдены.':'Начните диалог — он появится здесь.'));
 } 
 // HH_COMMANDER_RICH_MARKDOWN_V1: DOM only; no model HTML.
 function richMessage(text){
 const root=make('div','cc-message-markdown');
 let source=String(text||'').replace(/\r\n?/g,'\n');
 if(source.split('\n').length<4){
  source=source.replace(/[ \t]+(?=#{1,6}[ \t]+\d+[.)][ \t]+)/g,'\n\n')
   .replace(/[ \t]+(?=-[ \t]+\*\*[^*\n]{1,75}\*\*)/g,'\n');
 }
 const lines=source.split('\n');
 const heading=/^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/;
 const bullet=/^ {0,3}[-*+][ \t]+(.+)$/;
 const number=/^ {0,3}\d{1,3}[.)][ \t]+(.+)$/;
 const quote=/^ {0,3}>[ \t]?(.*)$/;
 const fence=/^ {0,3}(`{3,}|~{3,})/;
 const inline=/\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
 function addInline(parent,value){
  const line=String(value),matcher=new RegExp(inline.source,'g');
  let match,from=0;
  while((match=matcher.exec(line))){
   if(match.index>from)parent.append(make('span',null,line.slice(from,match.index)));
   if(match[1]){const link=make('a',null,match[1]);link.href=match[2];link.target='_blank';link.rel='noopener noreferrer';parent.append(link);}
   else if(match[3])parent.append(make('code',null,match[3]));
   else if(match[4]||match[5])parent.append(make('strong',null,match[4]||match[5]));
   else parent.append(make('em',null,match[6]||match[7]));
   from=matcher.lastIndex;
  }
  if(from<line.length)parent.append(make('span',null,line.slice(from)));
 }
 function addLines(parent,paragraphLines){paragraphLines.forEach((line,index)=>{if(index)parent.append(make('br'));addInline(parent,line.trim());});}
 function block(line){
  if(!line.trim())return 'blank';
  if(fence.test(line))return 'fence';
  if(heading.test(line))return 'heading';
  if(bullet.test(line))return 'ul';
  if(number.test(line))return 'ol';
  if(quote.test(line))return 'quote';
  if(/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line))return 'rule';
  return 'paragraph';
 }
 for(let i=0;i<lines.length;){
  const kind=block(lines[i]);
  if(kind==='blank'){i++;continue;}
  if(kind==='fence'){
   const marker=fence.exec(lines[i])[1],content=[];i++;
   while(i<lines.length&&!new RegExp('^ {0,3}'+marker[0]+'{'+marker.length+',}\\s*$').test(lines[i]))content.push(lines[i++]);
   if(i<lines.length)i++;
   const pre=make('pre'),code=make('code',null,content.join('\n'));pre.append(code);root.append(pre);continue;
  }
  if(kind==='heading'){const match=heading.exec(lines[i++]);const element=make('h'+Math.min(4,Math.max(2,match[1].length+1)));addInline(element,match[2]);root.append(element);continue;}
  if(kind==='rule'){root.append(make('hr'));i++;continue;}
  if(kind==='ul'||kind==='ol'){
   const list=make(kind),pattern=kind==='ul'?bullet:number;
   while(i<lines.length&&block(lines[i])===kind){const item=make('li');addInline(item,pattern.exec(lines[i++])[1]);list.append(item);}
   root.append(list);continue;
  }
  if(kind==='quote'){
   const quoted=[],blockquote=make('blockquote');while(i<lines.length&&block(lines[i])==='quote')quoted.push(quote.exec(lines[i++])[1]);
   const p=make('p');addLines(p,quoted);blockquote.append(p);root.append(blockquote);continue;
  }
  const paragraph=[];while(i<lines.length&&block(lines[i])==='paragraph')paragraph.push(lines[i++]);
  const p=make('p');addLines(p,paragraph);root.append(p);
 }
 return root;
}
 function renderMessages(){
  const box=el('messages');box.replaceChildren();
  if(!messages.length)box.append(make('p','cc-empty','Напишите вопрос, чтобы начать диалог.'));
  for(const msg of messages){
   const c=make('div','cc-message-item cc-from-'+msg.kind);
   const author=msg.kind==='owner'?'Вы':msg.kind==='assistant_unverified'?(String(msg.model||'').startsWith('Совет ИИ')?'Совет ИИ':'Ассистент'):
    msg.kind==='note'?'Заметка':msg.author||'Сообщение';
   c.append(make('div','cc-message-by',author),
    msg.kind==='owner'?make('p',null,msg.text||''):richMessage(msg.text||''),
    make('small',null,time(msg.createdAt)+(msg.kind==='github_report'?' · отчёт, не доказательство LIVE':'')));
   if(msg.kind==='github_report')htmlLink(c,'Источник GitHub',msg.url);
   if(msg.kind==='agent_final'&&msg.sourceWrite?.verified===true)htmlLink(c,'Проверенный Draft PR #'+msg.sourceWrite.prNumber,msg.sourceWrite.prUrl);
   box.append(c);
  }
  if(councilPending?.chatId===thread?.id){
   const p=make('div','cc-message-item cc-council-thinking');
   p.setAttribute('role','status');
   p.append(make('div','cc-message-by','Совет ИИ'),make('p',null,'Совет ИИ думает…'));
   box.append(p);
  }
  box.scrollTop=box.scrollHeight;
  if(runSnapshot?.chatId===thread?.id)showRunState(runSnapshot.run);
 }
function renderThread(){
  el('thread-title').textContent=thread.title;
  el('thread-updated').textContent=time(thread.updatedAt)+' · '+(remote?'приватное серверное хранилище':'зашифровано на устройстве');
  el('executor-state').textContent=(thread.taskId?'Чат привязан к защищённой задаче. ':'')+
   'Ожидается подтверждённый ответ исполнителя; назначение и консультация AI не запускают код и не доказывают LIVE.';
  for(const field of ['title','project','description','status'])el(field).value=thread[field]||'';
  el('tasks').value=(thread.tasks||[]).join(', ');el('prs').value=(thread.prs||[]).join(', ');
  executorBoxes(thread.executors||['local']);el('thread-details').open=false;
  el('thread-advanced').open=false;el('chat-extra').open=false;el('verify-status').textContent='';
  const available=(thread.executors||[]).filter(x=>x!=='openrouter'||aiReady);
  if(el('mode').value==='hermes')el('mode').value='local'; // legacy external executor is retired
  if(councilChatIds.has(thread.id))el('mode').value='council-free';
  else if(el('mode').value==='council-free'||!(isVerifiedFreeChoice(el('mode').value)&&available.includes('local'))&&!(el('mode').value==='director'&&available.includes('local'))&&!available.includes(el('mode').value))
   el('mode').value=available.includes('openrouter')?'openrouter':available[0]||'local';
  configureModels('thread');
  el('chat-feedback').textContent='';show('chat-feedback',false);
  el('pr-proof').replaceChildren();el('report-list').replaceChildren();
  show('create',false);show('chat-form',true);show('thread',true);
  renderMessages();renderList();
 }

 async function verifySavedThread(){
  const current=thread,button=el('verify-chat'),status=el('verify-status');
  if(!current){status.textContent='Откройте чат.';return}
  if(!remote){status.textContent='История зашифрована на устройстве; серверная проверка здесь недоступна.';return}
  if(!authorized){status.textContent='Войдите через Google для проверки сохранения.';return}
  if(button.disabled)return;
  button.disabled=true;status.textContent='Проверяю сохранение на защищённом сервере…';
  try{
   const read=await request(SERVER+'?action=read&issue='+current.issueNumber);
   if(read.chat?.id!==current.id||!Array.isArray(read.messages))
    throw Error('Сервер не подтвердил идентификатор и историю чата');
   const lastOwner=[...messages].reverse().find(m=>m.kind==='owner');
   if(!lastOwner){status.textContent='Чтение чата работает. Отправьте вопрос для проверки записи.';return}
   const ownerIndex=read.messages.findIndex(m=>m.id===lastOwner.id&&m.kind==='owner');
   if(ownerIndex<0){status.textContent='Последний вопрос не найден в серверной истории.';return}
   const lastAnswer=[...messages].reverse().find(m=>['assistant_unverified','agent_final','ai'].includes(m.kind));
   const answerIndex=lastAnswer?read.messages.findIndex(m=>m.id===lastAnswer.id&&
    ['assistant_unverified','agent_final','ai'].includes(m.kind)):-1;
   status.textContent=answerIndex>ownerIndex
    ?'Подтверждено: вопрос и ответ сохранены в Supabase.'
    :'Подтверждено: вопрос сохранён. Ответ на этот вопрос ещё не подтверждён.';
  }catch(error){status.textContent='Сохранение не подтверждено: '+String(error.message||error)}
  finally{button.disabled=false}
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
   if(!thread)throw Error('Чат не найден');
   if(messages.some(m=>(m.kind==='assistant_unverified'&&String(m.model||'').startsWith('Совет ИИ'))||(m.kind==='execution_requested'&&m.executor==='openrouter')))councilChatIds.add(thread.id);
   stopVoice();
   el('message').value='';
   renderThread();
   startReportPolling();
   if(remote){void refreshExecutionRuns().then(run=>{if(run&&(['QUEUED','STARTING','RUNNING'].includes(run.status)||run.awaitingFinal))startExecutionPolling();});}
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
  let selectedModel=mode==='hermes'?el('new-model').value:'',selectedWrite=mode==='hermes'&&el('new-github-write').checked===true;
  stopVoice();
  busy=true;button.disabled=true;
  const buttonLabel=button.textContent;button.textContent='⋯';button.setAttribute('aria-label','Создаю чат…');
  feedback.hidden=true;feedback.textContent='';
  let created=false;
  try{
   if(question.length<2||question.length>1200)throw Error('Вопрос должен содержать 2–1200 символов.');
   if(mode==='openrouter'&&!aiReady)throw Error('Бесплатная модель OpenRouter сейчас недоступна. Выберите локального советника.');
   if(mode==='director'&&(!remote||!ownedDirectorAvailable))throw Error('Agents Director пока не подключён к защищённому серверу.');
   if(selectedFreeModel(mode)&&(!remote||!ownedDirectorAvailable||!isVerifiedFreeChoice(mode)))
    throw Error('Выбранная бесплатная модель не подтверждена текущим каталогом OpenRouter.');
   if(mode==='hermes'){
    const free=await ensureExecutorModels();
    if(!free.length)throw Error('Каталог не подтвердил бесплатные текстовые модели Hermes.');
    if(!free.some(x=>x.id===selectedModel))selectedModel=free[0].id;
   }
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
   el('create-form').reset();el('new-mode').value=ownedDirectorAvailable?'director':(aiReady?'openrouter':'local');pendingCreateId=null;
   if(el('new-context').open)el('new-context').close();
   el('mode').value=mode;configureModels('thread');
   if(mode==='hermes'){el('model').value=selectedModel;el('github-write').checked=selectedWrite;}
   el('message').value=question;
   created=true;
   info('Отправляю вопрос…');
  }catch(err){fail('Не удалось создать чат: '+String(err.message||err))}
  finally{busy=false;button.disabled=false;button.textContent=buttonLabel;button.setAttribute('aria-label','Отправить вопрос');}
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
 function councilFailure(error){
  const code=String(error?.message||error);
  if(['OPENROUTER_NOT_CONNECTED','OPENROUTER_KEY_NOT_CONFIGURED'].includes(code))
   return 'Бесплатные модели на сервере пока не подключены. Вопрос сохранён, ответа модели нет.';
  if(code==='OPENROUTER_FREE_RATE_LIMIT')return 'Лимит бесплатных моделей достигнут. Ответ не получен.';
  return 'Совет ИИ не ответил: '+code;
 }
 async function assignSelectedExecutor(c,mode){
  const storedMode=mode==='director'?'local':mode;
  if(mode==='council-free'||c.executors.includes(storedMode))return c;
  if(!EXEC[mode])throw Error('Неизвестный исполнитель');
  const current=c.executors||[];
  if(current.length>=6)throw Error('В чате уже назначено шесть исполнителей. Измените список в разделе «Контекст и проверки».');
  const chosen=[...current,storedMode];
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
 async function ensureExecutorModels(){
  if(executorModels!==null)return executorModels;
  if(executorModelsPromise)return executorModelsPromise;
  executorModelsPromise=request(SERVER+'?action=executor_models').then(result=>{
   if(result.schema!=='HH_COMMANDER_EXECUTOR_FREE_MODELS_V1'||!Array.isArray(result.models))
    throw Error('Не удалось проверить каталог бесплатных моделей.');
   const free=result.models.filter(m=>typeof m?.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/.test(m.id)&&
    typeof m.name==='string'&&m.name.length>0&&m.name.length<=120);
   executorModels=free;
   refreshFreeChoices();
   configureModels('new');configureModels('thread');
   return free;
  }).finally(()=>{executorModelsPromise=null;});
  return executorModelsPromise;
 }
 function configureModels(scope){
  const isNew=scope==='new',mode=el(isNew?'new-mode':'mode').value;
  const selection=el(isNew?'new-model':'model'),current=selection.value;
  const options=mode==='hermes'?(executorModels||[]):selectedFreeModel(mode)?[]:models;
  selection.replaceChildren();
  if(mode==='hermes'&&!executorModels){
   const placeholder=make('option',null,'Проверка бесплатных моделей…');placeholder.value='';
   selection.append(placeholder);
  }else for(const model of options){
   const item=make('option',null,model.name+' · '+model.id+' — '+(mode==='openrouter'?remainingLabel('openrouter'):'не подключён'));item.value=model.id;selection.append(item);
  }
  if(options.some(item=>item.id===current))selection.value=current;
  show(isNew?'new-model-label':'model-label',mode==='hermes'||(!isNew&&mode==='openrouter'));
  show(isNew?'new-github-write-wrap':'github-write-wrap',mode==='hermes');
  if(mode!=='hermes')el(isNew?'new-github-write':'github-write').checked=false;
 }
 async function send(e){
  e.preventDefault();if(!thread||busy)return;
  const text=el('message').value.trim(),mode=el('mode').value,model=el('model').value;
  stopVoice();
  if(text.length<2||text.length>1200)return info('Сообщение должно содержать 2–1200 символов.');
  if(mode==='openrouter'&&(!aiReady||!models.some(x=>x.id===model)))return info('Нет подтверждённой бесплатной модели OpenRouter.');
  if(mode==='hermes'&&!(executorModels||[]).some(x=>x.id===model))return info('Выберите проверенную бесплатную модель для Hermes.');
  if(mode==='director'&&(!remote||!ownedDirectorAvailable))return info('Собственный Agents Director ещё не доступен в защищённом сервисе.');
  const chosenFreeModel=selectedFreeModel(mode);
  if(chosenFreeModel&&(!remote||!ownedDirectorAvailable||!isVerifiedFreeChoice(mode)))
   return info('Выбранная бесплатная модель сейчас не подтверждена OpenRouter. Обновите каталог.');
  let c=thread;
  if(mode!=='council-free'&&!thread.executors.includes(mode==='director'||chosenFreeModel?'local':mode)){
   busy=true;el('send').disabled=true;
   try{c=await assignSelectedExecutor(c,chosenFreeModel?'local':mode);}
   catch(err){info('Не удалось выбрать исполнителя: '+String(err.message||err));return;}
   finally{busy=false;el('send').disabled=false;}
  }
  if(mode==='council-free'){
    if(councilPending)return info('Совет ИИ уже думает над вопросом.');
    busy=true;el('send').disabled=true;
    let saved=false;
    try{
     await append(c,'owner',text,'');saved=true;councilChatIds.add(c.id);
     el('message').value='';
     councilPending={chatId:c.id};renderMessages();
     // Send transfers only this explicit question. Never hidden chat history.
     // Existing authenticated Supabase OpenRouter Worker, no Vercel key required.
      if(!remote)throw Error('Защищённая очередь OpenRouter недоступна.');
      const result=await request(SERVER+'?action=run','POST',{
       issueNumber:c.issueNumber,runId:id(),idempotencyKey:id(),
       executor:'openrouter',modelId:'openrouter/free',message:text,confirmGitHubWrite:false
      });
      runSnapshot={chatId:c.id,run:result.run||{status:result.status,created_at:new Date().toISOString()}};
      showRunState(runSnapshot.run);
      await refreshExecutionRuns();
      if(['QUEUED','STARTING','RUNNING'].includes(result.status))startExecutionPolling();
      info(result.status==='QUEUED'?'Запрос принят в очередь OpenRouter. Статус обновляется автоматически.':
       'Статус запуска: '+String(result.status||'UNKNOWN'));
    }catch(error){info((saved?'Вопрос сохранён. ':'')+councilFailure(error));}
    finally{councilPending=null;renderMessages();busy=false;el('send').disabled=false;}
    return;
   }
   const context=messages.slice(-8).filter(x=>['owner','assistant_unverified'].includes(x.kind))
   .map(x=>({role:x.kind==='owner'?'user':'assistant',content:x.text.slice(0,800)}));
  const dispatchModes=new Set(['director','hermes','codex','chatgpt-work','repair-worker','manual']);
  if(dispatchModes.has(mode)||chosenFreeModel){
   if(!remote)return info('Запуск доступен только для чата в защищённом серверном хранилище. Локальная копия не может запускать исполнителей.');
   busy=true;el('send').disabled=true;
   try{
    await append(c,'owner',text,'');el('message').value='';
    const runId=id(),idempotencyKey=id();
    const writeApproved=mode==='hermes'&&el('github-write').checked===true;
    if(mode==='hermes')el('github-write').checked=false; // one-shot consent, even if transport fails
    const result=await request(SERVER+'?action=run','POST',{
     issueNumber:c.issueNumber,runId,idempotencyKey,executor:mode==='director'||chosenFreeModel?'local':mode,message:text,
     ...(mode==='hermes'?{modelId:model,confirmGitHubWrite:writeApproved}:chosenFreeModel?{modelId:chosenFreeModel,confirmGitHubWrite:false}:mode==='director'?{modelId:'owned-default',confirmGitHubWrite:false}:{})
    });
    try{
     const latest=await request(SERVER+'?action=read&issue='+c.issueNumber);
     if(thread?.id===c.id){thread=latest.chat;messages=latest.messages;renderThread();}
    }catch{}
    const reasons={
     HERMES_RUNTIME_NOT_CONFIGURED:'Hermes HTTPS runtime и секрет не настроены',
     OWNED_MODEL_RUNTIME_NOT_CONFIGURED:'OpenRouter Free не настроен: нужен серверный ключ в Vercel Holistic House',
      OWNED_MODEL_FREE_CATALOG_UNAVAILABLE:'Каталог бесплатных моделей OpenRouter временно недоступен',
      OWNED_MODEL_FREE_CATALOG_INVALID:'Каталог моделей OpenRouter вернул некорректный формат',
      OWNED_MODEL_NO_VERIFIED_FREE_MODELS:'Не найдена подтверждённая бесплатная текстовая модель, платные заблокированы',
      OWNED_MODEL_NOT_FREE_IN_CATALOG:'Указанная модель не подтверждена как бесплатная в актуальном каталоге',
      OWNED_MODEL_FREE_RATE_LIMIT:'Достигнут лимит запросов бесплатного OpenRouter',
      OWNED_MODEL_OPENROUTER_KEY_REJECTED:'OpenRouter отклонил серверный ключ',
      OWNED_MODEL_COST_UNVERIFIED:'Стоимость ответа не подтверждена; результат не засчитан',
      OWNED_MODEL_BILLABLE_RESPONSE_HOLD:'OpenRouter сообщил ненулевую стоимость; результат заблокирован',
      OWNED_MODEL_UNEXPECTED_MODEL:'Ответ получен от неподтверждённой модели',
      OWNED_MODEL_SENSITIVE_CONTENT_REJECTED:'В сообщении возможный секрет. Уберите его перед отправкой',
      OWNED_MODEL_PROVIDER_UNAVAILABLE:'OpenRouter не ответил; повторный платный вызов не выполнялся',
      OWNED_MODEL_RESPONSE_NOT_ACCEPTED:'Ответ модели не прошёл проверку безопасности',
      OWNED_MODEL_ID_MISMATCH:'Модель изменена неавторизованным способом',
     AGENT_DIRECTOR_DISPATCH_UNCONFIRMED:'Запуск собственного исполнителя не подтверждён',
     EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY:'Выберите Agents Director · OpenRouter Free вместо старого Hermes',
     HERMES_FREE_MODEL_NOT_SELECTED:'Нет проверенной бесплатной модели для исполнителя',
     HERMES_DISPATCH_UNCONFIRMED_RECONCILE:'Запуск не подтверждён; состояние следует сверить с Hermes, не отправлять повторно',
     HERMES_EXECUTOR_DISPATCH_CONTRACT_NOT_VERIFIED:'Нет проверенного Hermes executor endpoint',
     CODEX_LOCAL_AGENT_OFFLINE_OR_REMOTE_APPROVAL_DISABLED:'Локальный Codex agent Offline или remote approval выключен',
     REPAIR_WORKER_REQUIRES_EXACT_PR_HEAD_AND_ACTIVE_LEASE:'Нужны точный PR HEAD и активная lease',
     CHATGPT_WORK_TRANSPORT_NOT_AVAILABLE:'Нет поддерживаемого транспорта ChatGPT Work',
     MANUAL_EXECUTOR_REQUIRES_OWNER_HANDOFF:'Требуется ручная передача владельцем'
    };
    if(result.status==='BLOCKED'){
     info('Запрос и попытка сохранены. Запуск НЕ подтверждён: '+(reasons[result.reasonCode]||result.reasonCode)+'. Код: '+result.reasonCode+'.');
     await refreshExecutionRuns();
    }else{
     info(result.agentStarted===true?'Исполнитель действительно начал работу. Ожидаю результат.':'Задача принята; фактический запуск ещё не подтверждён.');
     await refreshExecutionRuns();if(['STARTING','RUNNING'].includes(result.status))startExecutionPolling();
    }
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
  finally{busy=false;el('send').disabled=false;if(mode==='openrouter')void refreshFreeQuota(true);}
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
  renderList();void loadCIInbox({silent:true});if(r.incomplete)info('Индекс серверных чатов неполон: лимит GitHub API.');
  return r;
 }
 async function authenticated(){
  authorized=true;show('login',false);
  let status,statusError=null;
  try{status=await request(SERVER+'?action=status')}
  catch(error){statusError=error;status={privateStoreConfigured:false}}
  remote=!!status.privateStoreConfigured;
  ownedDirectorAvailable=remote&&status.dispatchAvailable===true&&status.dispatchMode==='FIRST_PARTY_AGENT_DIRECTOR';
  for(const select of [el('mode'),el('new-mode')]){
   const director=select.querySelector('option[value=director]');
   if(director)director.disabled=!ownedDirectorAvailable;
   const legacy=select.querySelector('option[value=hermes]');
   if(legacy)legacy.disabled=true;
   if(select.value==='hermes')select.value='local';
  }
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
  el('model').replaceChildren();
  for(const m of models){const o=make('option',null,m.name+' · '+m.id);o.value=m.id;el('model').append(o)}
  for(const select of [el('mode'),el('new-mode')])
   select.querySelector('option[value=openrouter]').disabled=!aiReady;
  el('new-mode').value=ownedDirectorAvailable?'director':(aiReady?'openrouter':'local');
  show('free-model-status',!aiReady);
  updateQuotaMenuLabels();
  if(remote){
   void refreshFreeQuota(true);
   await loadExecutorModels();
   show('board',true);startCIInboxPolling();
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
  stopVoice();
  if(reportRefreshTimer!==null)win.clearInterval(reportRefreshTimer);
  reportRefreshTimer=null;thread=null;messages=[];pendingCreateId=null;
  show('thread',false);show('chat-form',false);show('create',true);renderList();
  el('create-feedback').textContent='';show('create-feedback',false);
  el('new-question').value='';
  el('create').scrollIntoView({block:'nearest',behavior:'smooth'});
  void refreshFreeQuota();
 }
 
 // Resume a saved question only on an explicit click; never duplicate its owner event.
 el('retry-run').addEventListener('click',async()=>{
  if(!thread||!remote||!authorized||busy)return;
  const c=thread,q=lastQuestion(),prior=runSnapshot?.chatId===c.id?runSnapshot.run:null;
  if(!q||!q.text||prior&&['QUEUED','STARTING','RUNNING','COMPLETED'].includes(prior.status))return;
  busy=true;el('retry-run').disabled=true;
  try{
   const result=await request(SERVER+'?action=run','POST',{
    issueNumber:c.issueNumber,runId:id(),idempotencyKey:id(),
    executor:'openrouter',modelId:'openrouter/free',message:q.text,confirmGitHubWrite:false
   });
   if(thread?.id!==c.id)return;
   runSnapshot={chatId:c.id,run:result.run||{status:result.status,created_at:new Date().toISOString()}};
   showRunState(runSnapshot.run);
   await refreshExecutionRuns();
   if(['QUEUED','STARTING','RUNNING'].includes(result.status))startExecutionPolling();
   info(result.status==='QUEUED'?'Запрос снова в очереди OpenRouter.':'Статус запуска: '+String(result.status||'UNKNOWN'));
  }catch(error){
   const known=await refreshExecutionRuns().catch(()=>null);
   info(known?'Статус проверен в очереди.':'Запуск не подтверждён: '+String(error.message||error));
  }finally{busy=false;el('retry-run').disabled=false;}
 });

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
 el('ci-refresh').addEventListener('click',()=>void loadCIInbox());
 el('handoff').addEventListener('click',handoff);
 el('verify-chat').addEventListener('click',verifySavedThread);
 el('search').addEventListener('input',renderList);el('filter').addEventListener('change',renderList);
 el('close-thread').addEventListener('click',showNewChat);
 el('thread-context-toggle').addEventListener('click',()=>{
  el('thread-advanced').open=!el('thread-advanced').open;
  if(el('thread-advanced').open)el('thread-advanced').scrollIntoView({block:'nearest'});
 });
 el('history-all').addEventListener('toggle',renderList);
 for(const field of ['search','filter'])el(field).addEventListener('input',renderList);
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
 el('mode').addEventListener('change',()=>{
  const mode=el('mode').value;configureModels('thread');void refreshFreeQuota();
  if(mode==='hermes')void ensureExecutorModels().catch(err=>info('Каталог Hermes недоступен: '+String(err.message||err)));
 });
 el('new-mode').addEventListener('change',()=>{
  configureModels('new');void refreshFreeQuota();
  if(el('new-mode').value==='hermes')void ensureExecutorModels().catch(err=>info('Каталог Hermes недоступен: '+String(err.message||err)));
 });
 
 for(const name of ["mode","new-mode"]){
  const select=el(name);
  select.addEventListener("focus",()=>void refreshFreeQuota());
  select.addEventListener("pointerdown",()=>void refreshFreeQuota());
 }
 doc.addEventListener("visibilitychange",()=>{
  if(doc.visibilityState!=="hidden")void refreshFreeQuota();
 });
 updateQuotaMenuLabels();

 // Speech recognition is user-initiated and stays on device/browser voice services.
 // Never send raw audio. Only the edited transcript joins the chat on Send.
 let activeVoice=null,voiceSerial=0;
 function voiceStatus(message,visible=true){
  el('voice-status').textContent=message||'';
  el('voice-status').hidden=!message||!visible;
 }
 function stopVoice(){
  const session=activeVoice;if(!session)return;
  activeVoice=null;voiceSerial++;
  session.button.setAttribute('aria-pressed','false');
  session.button.classList.remove('cc-voice-listening');
  try{session.engine.abort()}catch{}
  voiceStatus('');
 }
 function currentSpeechText(session,result){
  if(!activeVoice||activeVoice!==session)return;
  let speech='';
  for(let index=0;index<result.results.length;index++){
   const segment=result.results[index];
   if(!segment?.[0]?.transcript)continue;
   speech+=segment[0].transcript+' ';
  }
  speech=speech.trim();
  const prefix=session.original.trimEnd();
  const text=[prefix,speech].filter(Boolean).join(prefix&&speech?' ':'').slice(0,1200);
  session.target.value=text;
  session.target.dispatchEvent(new Event('input',{bubbles:true}));
  voiceStatus(speech?'Диктовка: '+speech.slice(-90):'Слушаю…');
 }
 function toggleVoice(button,target){
  if(activeVoice){stopVoice();return;}
  const Speech=win.SpeechRecognition||win.webkitSpeechRecognition;
  if(typeof Speech!=='function'){
   voiceStatus('Нажмите микрофон на клавиатуре iPhone для голосового ввода.');
   target.focus();return;
  }
  let engine;
  try{engine=new Speech()}catch{voiceStatus('Диктовка браузера недоступна. Используйте микрофон клавиатуры.');return;}
  const session={engine,button,target,original:target.value,serial:++voiceSerial};
  activeVoice=session;
  engine.lang='ru-RU';engine.interimResults=true;engine.continuous=false;
  engine.maxAlternatives=1;
  button.setAttribute('aria-pressed','true');button.classList.add('cc-voice-listening');
  voiceStatus('Слушаю… Нажмите микрофон ещё раз, чтобы остановить.');
  engine.onresult=result=>{if(activeVoice===session)currentSpeechText(session,result)};
  engine.onerror=event=>{
   if(activeVoice!==session)return;
   voiceStatus(event.error==='not-allowed'?'Нет доступа к микрофону. Разрешите его в браузере или используйте клавиатуру.':
    'Голосовой ввод не завершён. Можно написать сообщение вручную.');
   activeVoice=null;button.setAttribute('aria-pressed','false');button.classList.remove('cc-voice-listening');
  };
  engine.onend=()=>{
   if(activeVoice!==session)return;
   activeVoice=null;button.setAttribute('aria-pressed','false');button.classList.remove('cc-voice-listening');
   voiceStatus(session.target.value!==session.original?'Проверьте распознанный текст и нажмите ↑.':'Диктовка завершена. Можно написать текст.');
  };
  try{engine.start()}catch{stopVoice();voiceStatus('Не удалось включить микрофон. Используйте голосовой ввод клавиатуры.');}
 }
 el('voice-new').addEventListener('click',()=>toggleVoice(el('voice-new'),el('new-question')));
 el('voice-thread').addEventListener('click',()=>toggleVoice(el('voice-thread'),el('message')));
 for(const name of ['new-question','message']){
  const area=el(name);
  area.addEventListener('keydown',event=>{
   if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){
    event.preventDefault();(name==='message'?el('chat-form'):el('create-form')).requestSubmit();
   }
  });
 }
 if(win.visualViewport){
  const sync=()=>{
   const active=doc.activeElement;
   const keyboardVisible=active===el('new-question')||active===el('message');
   const viewport=win.visualViewport;
   const delta=keyboardVisible?Math.max(0,win.innerHeight-viewport.height-viewport.offsetTop):0;
   doc.documentElement?.style?.setProperty('--cc-keyboard-offset',Math.round(delta)+'px');
   doc.body.classList.toggle('cc-keyboard-active',keyboardVisible);
  };
  win.visualViewport.addEventListener('resize',sync);
  win.visualViewport.addEventListener('scroll',sync);
  doc.addEventListener('focusin',sync);doc.addEventListener('focusout',sync);
 }
 request('/api/commander-session').then(s=>{
  if(s.authenticated!==true||s.owner!==true)throw Error('OWNER_SESSION_REQUIRED');
  return request(AI+'?action=status');
 }).then(s=>s.authenticated?authenticated():Promise.reject()).catch(error=>{
  authorized=false;
  if(error?.status===401||error?.message==='OWNER_SESSION_REQUIRED'){
   // The main Holistic House origin owns the existing Google/Supabase browser
   // session. Bounce there silently once; its connect page checks that session
   // and returns here through the fragment handoff without another OAuth login.
   const requestedTask=new URLSearchParams(win.location.search||'').get('task');
   const continuation=typeof requestedTask==='string'&&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedTask)?
    '/chats.html?task='+encodeURIComponent(requestedTask):'/chats.html';
   win.location.replace(MAIN+'/commander-connect.html?next='+encodeURIComponent(continuation));
   return;
  }
  show('login',true);
  info('Не удалось проверить защищённую сессию. Повторите проверку; Google-вход не запускается из-за временной ошибки сервера.');
  win.HHGoogleOwnerSSO?.mount(el('google-owner'),s=>info(s));
 });
})(window,document);
