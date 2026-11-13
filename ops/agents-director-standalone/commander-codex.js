'use strict';
/* Explicit owner-approved GitHub Codex handoff; never simulates a Codex session. */
(function(win,doc){
 const API='/api/commander-codex';
 const screen=doc.getElementById('cc-thread')?'chat':doc.getElementById('ac-workspace')?'editor':null;
 if(!screen)return;
 const target=screen==='chat'?doc.getElementById('cc-handoff'):
  doc.getElementById('ac-history')?.closest('section');
 if(!target)return;
 const section=doc.createElement('section');
 section.className=screen==='chat'?'cc-surface hh-codex-card':'ac-card hh-codex-card';
 section.setAttribute('aria-label','Передача задачи в Codex');
 section.innerHTML=`<div class="hh-codex-heading"><h2>⌘ Codex · реализация кода</h2><span class="hh-codex-pill">GitHub</span></div>
 <p class="hh-codex-hint">Отправить задачу в Codex через GitHub: создать issue с назначением агента или оставить команду в открытом PR. Это отдельная операция, а не AI-консультация.</p>
 <div class="hh-codex-actions"><button type="button" data-codex="prepare">Заполнить из задачи</button><button type="button" data-codex="check">Проверить подключение</button></div>
 <form data-codex="form">
 <label>Способ отправки<select data-codex="mode"><option value="issue">Новая задача → GitHub issue</option><option value="pr">Доработать существующий PR</option></select></label>
 <label data-codex="pr-row" hidden>Номер существующего PR<input data-codex="pr" type="number" min="1" max="999999" inputmode="numeric" placeholder="3916"></label>
 <label>Название<input data-codex="title" maxlength="120" required placeholder="Конкретный результат для Codex"></label>
 <label>Задание Codex · только публичные технические данные<textarea data-codex="prompt" rows="6" maxlength="6000" required placeholder="Опишите код, критерии готовности, тесты, ограничения и контекст PR"></textarea></label>
 <label class="hh-codex-consent"><input type="checkbox" data-codex="public"> Я проверил текст: его можно публиковать в открытом GitHub.</label>
 <label class="hh-codex-consent"><input type="checkbox" data-codex="credits"> Проверены права Codex и лимиты GitHub AI credits/Actions без дополнительных списаний.</label>
 <label class="hh-codex-consent"><input type="checkbox" data-codex="policy"> Проверены действующие PR, lease и правила одного изменения HEAD.</label>
 <button class="hh-codex-send" type="submit" data-codex="send" disabled>Отправить в Codex</button></form>
 <p class="hh-codex-result" role="status" aria-live="polite" data-codex="status">Отправка не настроена или ещё не проверена.</p>
 <div class="hh-codex-actions"><a data-codex="link" hidden target="_blank" rel="noopener noreferrer">Открыть GitHub-подтверждение</a><button type="button" data-codex="receipt" hidden>Проверить результат в GitHub</button></div>
 <p class="hh-codex-hint">GitHub подтвердит только создание issue или комментария. Старт Codex, CI, merge и LIVE проверяются отдельно. При отсутствии подключения можно скопировать задание для Codex CLI вручную.</p>
 <p class="hh-codex-hint"><a href="https://github.com/andylitvinov-design/books/issues/3890" target="_blank" rel="noopener noreferrer">Открыть публичный технический Inbox #3890</a></p>
 <button type="button" data-codex="copy">Скопировать задание для Codex CLI</button>`;
 target.before(section);
 const el=key=>section.querySelector('[data-codex="'+key+'"]');
 const status=text=>{el('status').textContent=String(text)};
 const clean=s=>String(s||'').trim();
 let enabled=false,dispatchId='',result=null,busy=false,sourceStamp='';
 function data(){
  if(screen==='chat'){
   const selected=doc.getElementById('cc-project')?.value||'commander';
   return {title:doc.getElementById('cc-thread-title')?.textContent||'',
    project:selected,description:doc.getElementById('cc-description')?.value||'',
    notes:doc.getElementById('cc-message')?.value||'',
    prs:doc.getElementById('cc-prs')?.value||''};
  }
  return {title:doc.getElementById('ac-title')?.value||'',project:doc.getElementById('ac-project')?.value||'commander',
   description:doc.getElementById('ac-source')?.value||'',
   notes:doc.getElementById('ac-prompt')?.value||'',prs:''};
 }
 function prepare(){
  const d=data(),text=clean(d.notes)||clean(d.description);
  el('title').value=clean(d.title).slice(0,120);
  el('prompt').value=[text,'','Project: '+d.project,
   'Acceptance: implement the feature/fix, add focused tests and record exact-HEAD PR evidence.',
   'Policy: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md',
   'Reuse existing PR where applicable; one coherent publication; no new paid service.'].join('\n').slice(0,6000);
  const n=Number((d.prs||'').split(',')[0]?.trim());
  if(Number.isSafeInteger(n)&&n>0){el('mode').value='pr';el('pr').value=String(n)}
  syncMode();invalidate();
  status('Черновик заполнен. Проверьте публичный текст, права Codex и бюджетные ограничения.');
 }
 function invalidate(){
  dispatchId='';result=null;el('link').hidden=true;el('receipt').hidden=true;
  el('send').disabled=!enabled||busy;
 }
 function syncMode(){el('pr-row').hidden=el('mode').value!=='pr'}
 async function request(path,method='GET',body){
  const r=await win.fetch(API+path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  let j;try{j=await r.json()}catch{throw Error('Сервер не вернул JSON')}
  if(!r.ok)throw Error(j.error||'HTTP '+r.status);
  return j;
 }
 async function check(){
  try{const d=await request('?action=status');enabled=d.eligibleForDispatch===true;
   status(enabled?'Канал Codex подключён. Отправка требует подтверждения трех пунктов.':
    'Автоматическая отправка в Codex пока выключена. Можно скопировать публичное техническое задание и передать его вручную через Codex CLI. Не отправляйте приватный контекст в публичный GitHub.');
  }catch(e){enabled=false;status('Проверка подключения: '+String(e.message||e))}
  el('send').disabled=!enabled||busy;
 }
 function showLink(url){
  if(!/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:issues|pull)\/\d+(?:#issuecomment-\d+)?$/.test(url||''))return;
  el('link').href=url;el('link').hidden=false;
 }
 async function submit(e){
  e.preventDefault();if(!enabled||busy)return;
  if(!el('public').checked||!el('credits').checked||!el('policy').checked)
   return status('Подтвердите публичность текста, бюджет и проверку PR/lease.');
  const d=data(),title=clean(el('title').value),prompt=clean(el('prompt').value);
  const mode=el('mode').value,pr=Number(el('pr').value);
  if(title.length<5||title.length>120||prompt.length<20||prompt.length>6000)
   return status('Название: 5–120 символов; задание: 20–6000 символов.');
  if(mode==='pr'&&(!Number.isSafeInteger(pr)||pr<1))return status('Введите номер существующего PR.');
  if(!dispatchId)dispatchId=win.crypto.randomUUID();
  const fingerprint=[d.project,mode,pr,title,prompt].join('|');
  if(sourceStamp&&sourceStamp!==fingerprint)dispatchId=win.crypto.randomUUID();
  sourceStamp=fingerprint;busy=true;el('send').disabled=true;
  status('Передаю запрос на сервер… подтверждение выполнения Codex пока отсутствует.');
  try{
   result=await request('?action=dispatch','POST',{id:dispatchId,project:d.project,mode,
    pr:mode==='pr'?pr:undefined,title,prompt,consentPublic:true,consentCredits:true,consentPolicy:true});
   showLink(result.url);
   el('receipt').hidden=false;
   status(result.duplicate?'Запрос уже зарегистрирован в GitHub. Выполнение Codex не подтверждено.':
    result.assignedOnGithub?'GitHub подтвердил назначение агента. Старт Codex и результат нужно проверить отдельно.':
    'GitHub принял запрос, но запуск Codex ещё НЕ подтверждён. Проверьте назначение агента.');
  }catch(err){status('Отправка не подтверждена: '+String(err.message||err)+'. Не отправляйте повторно, пока не проверите GitHub.');}
  finally{busy=false;el('send').disabled=true}
 }
 async function receipt(){
  if(!result||busy)return;
  const num=result.mode==='issue'?result.issue:result.pr;
  if(!num)return;
  try{const p=await request('?action=receipt&mode='+result.mode+'&number='+num);
   status('GitHub: '+(p.mode==='issue'?(p.assignedOnGithub?'агент назначен':'агент не назначен'):
    p.merged?'PR смержен (LIVE не проверен)':'PR открыт')+'. Старт Codex и LIVE не доказаны.');
   showLink(p.url);
  }catch(e){status('Не удалось проверить GitHub: '+String(e.message||e))}
 }
 async function copy(){
  const text=clean(el('title').value)+'\n\n'+clean(el('prompt').value);
  if(text.length<24)return status('Сначала подготовьте задание.');
  try{await win.navigator.clipboard.writeText(text);status('Техническое задание скопировано. Это не автоматический запуск.');}
  catch{status('Браузер не разрешил копирование. Выделите текст вручную.');}
 }
 el('prepare').addEventListener('click',prepare);
 el('check').addEventListener('click',check);
 el('mode').addEventListener('change',()=>{syncMode();invalidate()});
 el('form').addEventListener('submit',submit);
 el('receipt').addEventListener('click',receipt);
 el('copy').addEventListener('click',copy);
 for(const k of ['title','prompt','pr'])el(k).addEventListener('input',invalidate);
 if(screen==='chat'){
  const titleNode=doc.getElementById('cc-thread-title');
  if(titleNode)new MutationObserver(()=>{
   for(const k of ['title','prompt','pr'])el(k).value='';
   for(const k of ['public','credits','policy'])el(k).checked=false;
   enabled=false;invalidate();status('Выбрана другая задача. Подготовьте текст и заново проверьте подключение.');
  }).observe(titleNode,{childList:true,characterData:true,subtree:true});
 }
 syncMode();
})(window,document);
