/* Agent Director / Tasks: owner-authenticated PR→LIVE rows.
   Source of truth: EXISTING Supabase PR completion gateway; no GitHub write
   token or model call in this browser. Never infer LIVE from GitHub Merge. */
(function(win,doc){
 'use strict';
 const M=win.HHPRCompletionMobileModel,root=doc.getElementById('pm-pr-completion');
 if(!root||!M)return;
 const API='/api/commander-pr-completion',AUTH='/api/commander-session';
 const AUTH_NEXT='/project-management-public.html',REMEMBER='hh.commander.monitor.return.v1';
 const SSO='https://holistichouse.vercel.app/commander-connect.html?next='+encodeURIComponent(AUTH_NEXT);
 // Non-secret tab markers only: one silent reconnect for a previously verified owner.
 const SEEN_OWNER='hh.commander.tasks.owner-seen.v1',SSO_ATTEMPT='hh.commander.tasks.sso-attempt.v1';
 const FETCH_TIMEOUT=13500,INTERVAL=60000,MAX_ROWS=6;
 const el=id=>doc.getElementById(id);
 const list=el('pm-pr-completion-list'),form=el('pm-pr-completion-form');
 const input=el('pm-pr-number'),notice=el('pm-pr-completion-status');
 const auth=el('pm-pr-completion-login'),authLink=el('pm-pr-completion-signin');
 const health=el('pm-pr-completion-health'),submit=el('pm-pr-submit');
 const state={rows:[],histories:new Map(),opened:new Set(),more:false,
   signedIn:false,loading:false,posting:false,submittingId:new Map(),refreshTimer:null,
   lastLoadedAt:null,verifiedSession:false,checkingSession:false,liveProofs:new Map()};
 function mk(tag,cls,text){
  const node=doc.createElement(tag);if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);return node;
 }
 function link(label,url,cls){
  const node=mk('a',cls,label);node.href=url;
  if(/^https:\/\/github\.com\//.test(url)){node.target='_blank';node.rel='noopener noreferrer';}
  return node;
 }
 function note(text,kind='info'){notice.textContent=text;notice.dataset.tone=kind;}
 function reason(error){
  const code=String(error?.code||error?.message||error||'').slice(0,95);
  if(code==='OWNER_SESSION_REQUIRED'||code==='OWNER_SESSION_EXPIRED')return 'Восстановите существующую сессию Holistic House.';
  if(code==='OWNER_ACCESS_DENIED'||code==='OWNER_ACCESS_NOT_VERIFIED')return 'Права владельца не подтверждены.';
  if(code==='OWNER_CHECK_UNAVAILABLE'||code==='OWNER_REFRESH_UNAVAILABLE'||code==='PRIVATE_STORE_NOT_CONFIGURED')return 'Проверка сессии временно недоступна. Обновите статусы — повторный вход не требуется.';
  if(code==='PR_NUMBER_INVALID')return 'Введите существующий номер PR (только цифры).';
  if(code==='PR_GATEWAY_NOT_CONFIGURED')return 'Шлюз Commander ещё не настроен на сервере.';
  if(code==='PR_UPSTREAM_SCHEMA_CHANGED')return 'Версия API Commander изменилась; статус не подтверждён.';
  if(code==='PR_UPSTREAM_INVALID_JSON'||code==='PR_UPSTREAM_INVALID_SCHEMA')return 'Непроверенный ответ Commander.';
  if(code==='PR_GATEWAY_UNAVAILABLE'||code==='PRIVATE_STORE_UNAVAILABLE')return 'Связь с Commander временно недоступна.';
  return 'Не удалось подтвердить действие: '+(code||'попробуйте обновить');
 }
 const ctx=()=>({method:'POST',credentials:'same-origin',cache:'no-store',
   redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'}});
 async function request(url,options,timeout=FETCH_TIMEOUT){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{return await win.fetch(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
 }
 async function ownerSession(){
  const response=await request(AUTH,{method:'GET',credentials:'same-origin',cache:'no-store',
    redirect:'error',headers:{Accept:'application/json'}},10500);
  const data=await response.json().catch(()=>null);
  if(response.status===200&&data?.authenticated===true&&data?.owner===true)return true;
  if(response.status===401&&['OWNER_SESSION_REQUIRED','OWNER_SESSION_EXPIRED'].includes(data?.error))return false;
  throw {code:response.status===403?'OWNER_ACCESS_DENIED':'OWNER_CHECK_UNAVAILABLE',status:response.status===403?403:503};
 }
 async function api(action,fields={},retry=true){
  let response;
  try{response=await request(API,{...ctx(),body:JSON.stringify({action,...fields})});}
  catch{return Promise.reject({code:'PR_GATEWAY_UNAVAILABLE'});}
  if(response.status===401&&retry){
   // Existing session endpoint refreshes the HttpOnly Supabase owner cookie.
   if(await ownerSession())return api(action,fields,false);
  }
  let payload;try{payload=await response.json();}
  catch{throw {code:'PR_UPSTREAM_INVALID_JSON'};}
  if(!response.ok)throw {code:payload?.error||'PR_GATEWAY_UNAVAILABLE',status:response.status};
  if(payload?.schema!=='HH_COMMANDER_PR_COMPLETION_V1')throw {code:'PR_UPSTREAM_SCHEMA_CHANGED'};
  return payload;
 }
 function markOwnerSession(){
  try{win.sessionStorage.setItem(SEEN_OWNER,'1');win.sessionStorage.removeItem(SSO_ATTEMPT);}catch{}
 }
 function showSignIn(message,reconnect=false){
  state.signedIn=false;auth.hidden=false;form.hidden=true;
  list.replaceChildren();
  note(message||'Подключите существующую сессию Holistic House.');
  authLink.href=SSO;authLink.textContent='Использовать текущую сессию';
  if(reconnect){
   try{
    if(win.sessionStorage.getItem(SEEN_OWNER)==='1'&&!win.sessionStorage.getItem(SSO_ATTEMPT)){
     win.sessionStorage.setItem(SSO_ATTEMPT,'1');
     win.sessionStorage.setItem(REMEMBER,AUTH_NEXT);
     note('Восстанавливаю текущую сессию Holistic House…');
     win.location.replace(SSO);
    }
   }catch{} // No storage: use the explicit safe link instead.
  }
 }
 authLink?.addEventListener('click',()=>{
  try{win.sessionStorage.setItem(REMEMBER,AUTH_NEXT);win.sessionStorage.setItem(SSO_ATTEMPT,'1');}catch{}
 });
 function displayHealth(value){
  health.replaceChildren();health.hidden=true;
  if(!value||typeof value!=='object')return;
  const stale=value.status==='GITHUB_WATCHDOG_STALE';
  const unclear=['HEALTH_UNAVAILABLE','GITHUB_API_NOT_VERIFIED','MONITOR_STALE'].includes(value.status);
  if(!stale&&!unclear)return;
  const text=stale?
   'Штатный Watchdog давно не запускался. Резервные проверки могут продолжаться; смотрите время последнего подтверждения.':
   'Проверка расписания Watchdog сейчас недостоверна. Продвижение PR не подтверждено.';
  health.append(mk('span',null,'⚠ '+text));
  health.hidden=false;
 }
 function progress(view){
  const bar=mk('ol','pm-pr-progress');
  bar.setAttribute('aria-label','Этапы доведения PR');
  for(const step of view.stages){
   const li=mk('li','pm-pr-step pm-pr-step-'+step.state);
   li.dataset.step=step.id;
   const circle=mk('span','pm-pr-step-dot',step.state==='done'?'✓':
      step.state==='error'?'!':step.state==='active'?'●':'');
   circle.setAttribute('aria-hidden','true');
   li.append(circle,mk('span','pm-pr-step-name',step.label));bar.append(li);
  }
  return bar;
 }
 function singleDetail(label,value){
  const row=mk('div','pm-pr-fact');
  row.append(mk('dt',null,label),mk('dd',null,value));
  return row;
 }
 function latestHistory(number){
  const stored=state.histories.get(number);
  return stored?.items||[];
 }
 function detailPanel(view){
  const row=view.item,box=mk('div','pm-pr-expanded');
  box.id='pm-pr-details-'+row.prNumber;
  box.append(mk('p','pm-pr-current','Текущий этап: '+view.current));
  box.append(mk('p','pm-pr-checked','Последняя проверка: '+
    M.time(row.lastCheckedAt)+(row.checkedCount?' · проверок: '+row.checkedCount:'')));
  box.append(progress(view));
  const facts=mk('dl','pm-pr-facts');
  facts.append(
   singleDetail('HEAD',M.shortSHA(row.headSha)),
   singleDetail('Причина',view.detail),
   singleDetail('Repair Worker',row.dispatchAccepted?
      'Передача принята; начало работы отдельно не подтверждено':'Запуск пока не подтверждён')
  );
  const diagnostic=latestHistory(row.prNumber).find(e=>e?.diagnostic);
  if(diagnostic?.diagnostic){
   const d=diagnostic.diagnostic;
   facts.append(singleDetail('AI-диагностика',d.modelResponseVerified===true?
     'Ответ бесплатной модели подтверждён · $0.00':d.status||'Статус неизвестен'));
  }
  if(row.mergeSha)facts.append(singleDetail('Merge SHA',M.shortSHA(row.mergeSha)));
  facts.append(singleDetail('LIVE',view.hasLiveProof?
   'Исторически подтверждён: '+M.time(view.liveProof.at):
   'Пока нет независимого свидетельства LIVE; Merge ≠ LIVE'));
  box.append(facts);
  const event= view.ciEvent;
  if(event){
   const ciText=(event.conclusion||'unknown')+' · '+(event.category||event.workflowName||'CI');
   box.append(mk('p','pm-pr-ci-note','CI на текущем HEAD: '+ciText));
  }
  const actions=mk('div','pm-pr-details-actions');
  const refresh=mk('button','pm-pr-quiet','⟳ Обновить');
  refresh.type='button';
  refresh.addEventListener('click',async()=>{
   refresh.disabled=true;
   await refreshStatus().then(()=>loadHistory(row.prNumber)).catch(error=>note(reason(error),'error'));
   refresh.disabled=false;
  });
  actions.append(refresh,link('Подробнее ↗',
    'https://github.com/andylitvinov-design/books/pull/'+row.prNumber,
    'pm-pr-outline'));
  if(view.hasLiveProof&&view.liveProof.receiptUrl)
   actions.append(link('Доказательство LIVE ↗',view.liveProof.receiptUrl,'pm-pr-outline'));
  box.append(actions);
  return box;
 }
 async function loadLiveProof(n){
  const item=state.rows.find(r=>r.prNumber===n);
  if(!item||item.status!=='MERGED'||!item.mergeSha||!state.opened.has(n))return;
  const prior=state.liveProofs.get(n);
  if(prior&&Date.now()-prior.at<15*60000)return;
  try{
   const response=await request('/api/pr-attribution?pr='+n,{
    method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
    headers:{Accept:'application/json'}},12500);
   if(!response.ok){state.liveProofs.set(n,{at:Date.now(),data:null});return;}
   const data=await response.json();
   const confirmed=M.safeHistoricalLiveProof(item,data);
   state.liveProofs.set(n,{at:Date.now(),data:confirmed?data:null});
   renderRows();
  }catch{state.liveProofs.set(n,{at:Date.now(),data:null});}
 }
 function trackedRow(item){
  const view=M.present(item,latestHistory(item.prNumber),
    state.liveProofs.get(item.prNumber)?.data||null);
  if(!view)return null;
  const expanded=state.opened.has(item.prNumber);
  const card=mk('article','pm-pr-card pm-pr-card-'+view.tone);
  card.dataset.prNumber=String(item.prNumber);
  const heading=mk('div','pm-pr-row-heading');
  const tag=link('PR #'+item.prNumber,
    'https://github.com/andylitvinov-design/books/pull/'+item.prNumber,'pm-pr-tag');
  tag.setAttribute('aria-label','GitHub PR номер '+item.prNumber);
  const status=mk('div','pm-pr-summary');
  status.append(mk('span','pm-pr-status pm-pr-status-'+view.tone,view.title));
  const subtitle=mk('span','pm-pr-substatus',
   item.status==='MERGED'?'LIVE ещё не доказан':
    item.status==='BLOCKED'?'Требует решения':view.current);
  status.append(subtitle);
  const act=mk('button','pm-pr-action','До LIVE');
  act.type='button';act.title='Заявка уже в Commander. Обновить статус, не создавать дубль.';
  act.setAttribute('aria-label','Проверить доведение PR '+item.prNumber+' до LIVE');
  act.addEventListener('click',async()=>{
   act.disabled=true;
   state.opened.add(item.prNumber);
   note('PR #'+item.prNumber+' уже отслеживается. Обновляю статус без повторной заявки.');
   await refreshStatus().then(()=>loadHistory(item.prNumber)).catch(e=>note(reason(e),'error'));
   act.disabled=false;
  });
  const expand=mk('button','pm-pr-toggle',expanded?'⌃':'⌄');
  expand.type='button';
  expand.setAttribute('aria-expanded',String(expanded));
  expand.setAttribute('aria-controls','pm-pr-details-'+item.prNumber);
  expand.setAttribute('aria-label',(expanded?'Скрыть':'Показать')+' этапы PR '+item.prNumber);
  expand.addEventListener('click',()=>{
   if(state.opened.has(item.prNumber))state.opened.delete(item.prNumber);
   else{state.opened.add(item.prNumber);void loadHistory(item.prNumber);}
   renderRows();
  });
  heading.append(tag,status,act,expand);
  card.append(heading);
  if(expanded)card.append(detailPanel(view));
  return card;
 }
 function renderRows(){
  list.replaceChildren();
  if(!state.signedIn)return;
  const entries=state.more?state.rows:state.rows.slice(0,MAX_ROWS);
  if(!entries.length)list.append(mk('p','pm-pr-empty',
   'Пока нет зарегистрированных PR. Введите номер ниже, чтобы начать.'));
  for(const entry of entries){const node=trackedRow(entry);if(node)list.append(node);}
  if(state.rows.length>MAX_ROWS){
   const more=mk('button','pm-pr-more',state.more?'Свернуть список':
     'Показать ещё '+(state.rows.length-MAX_ROWS)+' PR');
   more.type='button';more.addEventListener('click',()=>{state.more=!state.more;renderRows();});
   list.append(more);
  }
 }
 async function loadHistory(n){
  if(!state.opened.has(n)||!state.signedIn)return;
  try{
   const data=await api('history',{prNumber:n,page:1});
   if(data.ownerOnly!==true||!Array.isArray(data.ciEvents))throw {code:'PR_UPSTREAM_SCHEMA_CHANGED'};
   state.histories.set(n,{items:data.ciEvents.slice(0,30),at:Date.now()});
   renderRows();
   if(state.rows.some(row=>row.prNumber===n&&row.status==='MERGED'))void loadLiveProof(n);
  }catch(error){
   if(error?.status===401){showSignIn();return;}
   note('PR #'+n+': '+reason(error),'warning');
  }
 }
 async function refreshStatus(quiet=false){
  if(state.loading)return;
  state.loading=true;
  try{
   const data=await api('status');
   const rows=M.rowsFromStatus(data);
   if(rows===null)throw {code:'PR_UPSTREAM_SCHEMA_CHANGED'};
   state.rows=rows;
   state.lastLoadedAt=new Date().toISOString();
   displayHealth(data.watchdogHealth);
   renderRows();
   if(!quiet)note('Обновлено: '+M.time(state.lastLoadedAt));
   if(!state.opened.size&&rows.length) {
    state.opened.add((rows.find(r=>r.status==='WATCHING'||r.status==='LEASED')||rows[0]).prNumber);
    renderRows();
    void loadHistory([...state.opened][0]);
   }
  }catch(error){
   if(error?.status===401){showSignIn('Восстановите текущую сессию Holistic House.');return;}
   note(reason(error),'error');
  }finally{state.loading=false;}
 }
 async function create(event){
  event.preventDefault();
  if(state.posting||!state.signedIn)return;
  const n=M.prNumber(input.value);
  if(n===null){input.setAttribute('aria-invalid','true');note('Введите номер PR — только цифры, без #.','error');input.focus();return;}
  input.removeAttribute('aria-invalid');
  const known=state.rows.find(row=>row.prNumber===n);
  if(known){
   state.opened.add(n);
   note('PR #'+n+' уже зарегистрирован. Повторная заявка не создаётся.');
   renderRows();
   await refreshStatus().then(()=>loadHistory(n));return;
  }
  if(typeof win.crypto?.randomUUID!=='function'){
   note('Не удаётся безопасно создать идентификатор заявки. Обновите браузер.','error');return;
  }
  const id=state.submittingId.get(n)||win.crypto.randomUUID();
  state.submittingId.set(n,id);state.posting=true;submit.disabled=true;
  note('Отправляю PR #'+n+' в защищённую очередь…');
  try{
   const data=await api('submit',{prNumber:n,requestId:id});
   const saved=M.safeRow(data.item);
   if(!saved||saved.prNumber!==n)throw {code:'PR_UPSTREAM_SCHEMA_CHANGED'};
   state.submittingId.delete(n);
   state.rows=[saved,...state.rows.filter(r=>r.prNumber!==n)];
   state.opened.add(n);input.value='';renderRows();
   note('PR #'+n+' зарегистрирован. Автоматический ремонт и LIVE ещё не подтверждены.','success');
   void refreshStatus(true).then(()=>loadHistory(n));
  }catch(error){
   if(error?.status===401)showSignIn('Для отправки восстановите текущую сессию владельца.');
   else note(reason(error),'error');
  }finally{state.posting=false;submit.disabled=!state.signedIn;}
 }
 async function bootstrap(){
  if(state.checkingSession)return;
  state.checkingSession=true;
  let ok;
  try{ok=await ownerSession();}
  catch(error){
   state.signedIn=false;auth.hidden=true;form.hidden=true;list.replaceChildren();
   note(reason(error?.code?error:{code:'OWNER_CHECK_UNAVAILABLE'}),'error');return;
  }finally{state.checkingSession=false;}
  if(!ok){showSignIn('Используйте действующую авторизацию Holistic House — второй Google-вход не нужен.',true);return;}
  state.signedIn=true;state.verifiedSession=true;markOwnerSession();auth.hidden=true;form.hidden=false;
  submit.disabled=false;
  await refreshStatus();
  if(!state.refreshTimer)state.refreshTimer=win.setInterval(()=>{
    if(doc.visibilityState!=='hidden'||doc.visibilityState===undefined){
     if(M.needsAutoRefresh(state.rows)){
      void refreshStatus(true).then(()=>{
       for(const n of state.opened)void loadHistory(n);
      });
     }
    }
  },INTERVAL);
 }
 form?.addEventListener('submit',event=>void create(event));
 input?.addEventListener('input',()=>input.removeAttribute('aria-invalid'));
 el('pm-pr-completion-reload')?.addEventListener('click',()=>void (state.signedIn?refreshStatus():bootstrap()));
 win.addEventListener('pageshow',event=>{if(event.persisted&&state.signedIn)void refreshStatus(true);});
 void bootstrap();
})(window,document);
