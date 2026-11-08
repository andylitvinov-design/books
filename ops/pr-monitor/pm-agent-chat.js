'use strict';
/* HH_PM_AGENT_CHAT_PANEL_V1: same-origin owner session, truthful agent report feed.
 * Public PM remains readable without login; chat and reports are owner-only.
 */
(function(){
 const API='/api/pm-agent-chat';
 let panel=null,body=null,loginForm=null,googleSlot=null,main=null,notice=null,agentSel=null,modelSel=null,
     editor=null,sendBtn=null,history=null,reportList=null,reportBtn=null,modeDesc=null;
 let catalog=null,connected=false,openrouterConnected=false,models=[],messages=[],reportCache=[];
 const renderedGh=new Set();
 const mk=(tag,cls,text)=>{
  const e=document.createElement(tag);if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 const btn=(label,fn,cls='pm-btn')=>{const b=mk('button',cls,label);b.type='button';b.addEventListener('click',fn);return b};
 const msg=text=>{if(notice)notice.textContent=text};
 const selectedTasks=()=>[...document.querySelectorAll('.pm-task-check:checked')].map(n=>n.value)
  .filter(x=>/^(ci-head|ai-commits):[A-Z]\d{2}$/.test(x)).slice(0,8);
 const at=t=>{try{return new Date(t).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'})}catch{return '—'}};
 async function jsonFetch(url,options){
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
  let d;try{d=await r.json()}catch{throw Error('Ответ сервера не распознан');}
  if(!r.ok)throw Error(d.error||'HTTP '+r.status);
  return d;
 }
 function addLine(actor,text,meta,linkUrl){
  if(!history)return;
  const item=mk('div','pm-chat-line pm-chat-'+actor);
  const who=mk('div','pm-chat-who',actor==='user'?'Вы':actor==='agent'?'AI-исполнитель':'Монитор GitHub');
  item.appendChild(who);item.appendChild(mk('p','pm-chat-text',text));
  if(meta)item.appendChild(mk('small','pm-chat-meta',meta));
  if(linkUrl&&/^https:\/\/github\.com\/andylitvinov-design\/books\/issues\/(?:1419|3128|3890)#issuecomment-\d+$/.test(linkUrl)){
   const a=mk('a','pm-chat-report-link','Исходный отчёт');a.href=linkUrl;a.target='_blank';
   a.rel='noopener noreferrer';item.appendChild(a);
  }
  history.appendChild(item);history.scrollTop=history.scrollHeight;
 }
 function setTab(which){
  if(!main)return;
  const isChat=which==='chat';
  main.querySelector('.pm-chat-dialog').hidden=!isChat;
  main.querySelector('.pm-chat-reports').hidden=isChat;
  main.querySelector('.pm-tab-chat').setAttribute('aria-selected',String(isChat));
  main.querySelector('.pm-tab-reports').setAttribute('aria-selected',String(!isChat));
  if(!isChat&&reportCache.length===0)refreshReports();
 }
 function modelsReady(){
  if(!agentSel||!modelSel)return;
  for(const opt of agentSel.options)if(opt.value==='openrouter')opt.disabled=!openrouterConnected;
  modelSel.replaceChildren();
  if(!openrouterConnected){
    const option=mk('option',null,'OpenRouter не подключён');option.value='';
    modelSel.appendChild(option);modelSel.disabled=true;
  }else{
    const option=mk('option',null,'Выберите бесплатную модель');option.value='';modelSel.appendChild(option);
    for(const m of models){const opt=mk('option',null,m.name+' · '+m.id);opt.value=m.id;modelSel.appendChild(opt);}
    modelSel.disabled=agentSel.value!=='openrouter';
  }
  onModeChange();
 }
 function onModeChange(){
  if(!agentSel||!modeDesc)return;
  const mode=agentSel.value;
  modelSel.disabled=mode!=='openrouter'||!openrouterConnected;
  modeDesc.textContent=mode==='local'?'Работает сейчас, без внешнего API. Советы, а не изменение кода.':
    mode==='openrouter'?'Приватная модель требует отдельного серверного ключа Vercel. Бесплатная модель, без платного fallback.':
    mode==='github'?'OpenRouter Free с уже подключённым GitHub-ключом. Вопрос будет ПУБЛИЧНЫМ; подтвердите комментарий на GitHub. Ответ появится в отчётах после существующего Watchdog.':
    'Выберите доступного исполнителя.';
 }
 async function readStatus(){
  if(!loginForm||!main)return;
  try{
    const r=await jsonFetch(API+'?action=status');
    if(r.schema!=='HH_PM_AGENT_CHAT_V1'||r.authenticated!==true)throw Error('Неизвестная авторизация');
    connected=true;openrouterConnected=r.modes?.openrouter===true;
    loginForm.hidden=true;main.hidden=false;
    msg(openrouterConnected?'Чат владельца активен. OpenRouter Free доступен.':'Чат владельца активен. OpenRouter пока не подключён — локальный советник и отчёты GitHub доступны.');
    if(openrouterConnected){
      try{
        const data=await jsonFetch(API+'?action=models');
        models=Array.isArray(data.models)?data.models:[];if(!models.length)msg('Ключ есть, но каталог не подтвердил бесплатные модели.');
      }catch(e){models=[];msg('Не удалось подтвердить бесплатные модели: '+e.message);}
    }
    modelsReady();
  }catch(e){
    connected=false;loginForm.hidden=false;main.hidden=true;
    msg('Продолжите через Google. Отдельный код PR Monitor не требуется.');
    window.HHGoogleOwnerSSO?.mount(googleSlot,s=>msg(s));
  }
 }
 async function unlock(e){
  e.preventDefault();if(!loginForm)return;
  const pass=loginForm.querySelector('input');
  const val=pass?.value||'';
  if(val.length<3||val.length>256){msg('Введите существующий код владельца.');return;}
  const submit=loginForm.querySelector('button');submit.disabled=true;
  try{
    const r=await fetch('/api/seo-auth',{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({password:val})});
    pass.value='';
    if(!r.ok)throw Error('Код владельца не подтверждён: HTTP '+r.status);
    await readStatus();
  }catch(err){pass.value='';msg(String(err.message||err).slice(0,110))}
  finally{submit.disabled=false;}
 }
 function transcript(){
  const lines=['Holistic House · Agent Chat · приватная история текущей вкладки',
    'Сохранена вручную: '+new Date().toISOString(),'',
    ...messages.map(e=>(e.role==='user'?'Владелец':e.model||'Агент')+' ['+e.at+']:\n'+e.text+'\n')];
  const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=mk('a');a.href=url;a.download='hh-agent-chat-'+Date.now()+'.txt';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function sendMessage(e){
  e.preventDefault();if(!connected)return;
  const text=editor.value.trim();if(text.length<2||text.length>1200){msg('Сообщение должно содержать от 2 до 1200 символов.');return;}
  const mode=agentSel.value;if(mode==='openrouter'&&(!openrouterConnected||!modelSel.value)){msg('Выберите подключённую бесплатную модель OpenRouter.');return;}
  if(mode==='github'){
    if(!window.confirm('ВНИМАНИЕ: GitHub Agent Inbox #3890 — ПУБЛИЧНЫЙ технический канал. Сообщение будет видно всем после публикации на GitHub. Никаких персональных данных, паролей и API-ключей. Подготовить команду?')){
      msg('Передача в публичный GitHub отменена. Приватный чат не изменён.');return;
    }
    const tasks=selectedTasks();
    const prompt='!pm ask '+(tasks.length?'Задачи '+tasks.join(', ')+'. ':'')+text;
    if(prompt.length>1200){msg('Слишком длинный публичный запрос: сократите текст или число задач.');return;}
    const block=mk('div','pm-chat-line pm-chat-agent');
    block.append(mk('p','pm-chat-text','КОМАНДА ПОДГОТОВЛЕНА — НЕ ОТПРАВЛЕНА В GITHUB'));
    const input=mk('textarea','pm-chat-editor');input.value=prompt;input.readOnly=true;input.rows=4;
    input.setAttribute('aria-label','Публичная команда для GitHub OpenRouter Free');
    block.append(input);
    const gh=mk('a','pm-chat-report-link','Открыть GitHub Agent Inbox #3890');
    gh.href='https://github.com/andylitvinov-design/books/issues/3890#new_comment_field';
    gh.target='_blank';gh.rel='noopener noreferrer';block.append(gh);
    history.append(block);history.scrollTop=history.scrollHeight;
    try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(prompt);}
    catch(_){input.focus();input.select();}
    editor.value='';
    msg('Команда подготовлена. Вставьте её в комментарий GitHub и нажмите Comment. Это подтверждение владельца; до него AI НЕ запущен.');
    return;
  }
  const prior=messages.slice(-8).map(x=>({role:x.role==='user'?'user':'assistant',content:x.text.slice(0,800)}));
  sendBtn.disabled=true;editor.value='';
  addLine('user',text,at(new Date()));messages.push({role:'user',text,at:new Date().toISOString()});
  try{
    const out=await jsonFetch(API+'?action=chat',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode,message:text,model:mode==='openrouter'?modelSel.value:undefined,
       tasks:selectedTasks(),history:prior})});
    if(typeof out.reply!=='string'||!out.reply.trim())throw Error('Ответ пуст');
    const model=out.model||'Агент';messages.push({role:'assistant',model,text:out.reply,at:new Date().toISOString()});
    addLine('agent',out.reply,model+' · '+(out.priceVerified||'')+' · это не коммит');
    msg('Ответ получен. Функциональный LIVE и публикация кода не подтверждаются ответом модели.');
  }catch(err){msg('Ответ не получен: '+String(err.message||err).slice(0,130));}
  finally{sendBtn.disabled=false;editor.focus();}
 }
 async function refreshReports(){
  if(!connected||!reportList)return;
  reportBtn.disabled=true;reportList.replaceChildren(mk('p','pm-chat-hint','Получаю подтверждённые сообщения GitHub…'));
  try{
    const d=await jsonFetch(API+'?action=reports');
    if(!Array.isArray(d.reports))throw Error('Реестр недоступен');
    reportCache=d.reports;reportList.replaceChildren();
    if(!reportCache.length)reportList.appendChild(mk('p','pm-chat-hint','Подтверждённых отчётов в выбранных источниках нет.'));
    for(const r of reportCache){
      if(r.agent==='OpenRouter Free · GitHub Worker'&&!renderedGh.has(r.id)){
        renderedGh.add(r.id);addLine('agent',r.body,'OpenRouter Free · GitHub Actions · источник подтверждён',r.url);
      }
      if(!r.sourceVerified||!['ChatGPT Triage','GitHub Actions','OpenRouter Free · GitHub Worker','GitHub Repair Gateway'].includes(r.agent))continue;
      const card=mk('article','pm-chat-report-card');
      const head=mk('div','pm-chat-report-head',r.agent+' · '+at(r.createdAt)+' · '+r.origin);
      const body=mk('p','pm-chat-report-text',r.body);card.append(head,body);
      const a=mk('a','pm-chat-report-link','Открыть источник');a.href=r.url;
      a.target='_blank';a.rel='noopener noreferrer';card.append(a);
      card.appendChild(btn('Обсудить',()=>{
        setTab('chat');
        editor.value='Прокомментируй отчёт '+r.agent+' от '+r.createdAt+': '+r.body.slice(0,420);
        editor.focus();
      },'pm-btn pm-quiet'));
      reportList.appendChild(card);
    }
    msg('Отчёты GitHub загружены. Они подтверждают публикацию сообщения, не исправление кода.');
  }catch(e){reportList.replaceChildren(mk('p','pm-chat-error','Ошибка загрузки: '+String(e.message||e)))}
  finally{reportBtn.disabled=false;}
 }
 function init(snapshot){
  if(!snapshot||snapshot.schema!=='HH_PM_PUBLIC_V1'||panel)return;
  catalog=snapshot;
  const root=document.getElementById('pm-root');if(!root?.parentNode)return;
  panel=mk('section','pm-agent-chat');panel.id='pm-agent-chat';
  const title=mk('div','pm-agent-chat-heading');title.appendChild(mk('h2',null,'Чат с AI-исполнителями'));
  title.appendChild(mk('small',null,'Project Management · только владелец'));
  const workChats=mk('a','pm-chat-report-link','Открыть рабочие чаты');workChats.href='/chats.html';title.append(workChats);panel.appendChild(title);
  panel.appendChild(mk('p','pm-chat-hint','Публичный просмотр задач открыт. Переписка и отчёты требуют подтверждённую Google-сессию владельца. Отчёты из существующего GitHub, чат не запускает изменения кода.'));
  loginForm=mk('form','pm-chat-login');loginForm.hidden=true;
  loginForm.append(mk('p','pm-chat-hint','Вход владельца через Google · без дополнительного кода.'));
  googleSlot=mk('div','hh-sso-slot');loginForm.append(googleSlot);
  const backup=mk('details','hh-sso-backup');
  backup.append(mk('summary',null,'Резервный вход по коду'));
  const codeLabel=mk('label',null,'Код владельца PR Monitor');
  const pass=mk('input','pm-chat-password');pass.type='password';pass.name='password';pass.autocomplete='current-password';pass.required=true;pass.maxLength=256;
  codeLabel.appendChild(pass);backup.append(codeLabel);
  const unlockBtn=mk('button','pm-btn','Войти');unlockBtn.type='submit';backup.append(unlockBtn);
  loginForm.append(backup);loginForm.addEventListener('submit',unlock);panel.append(loginForm);
  main=mk('div','pm-chat-main');main.hidden=true;
  const tabs=mk('div','pm-chat-tabs');
  tabs.append(btn('Диалог',()=>setTab('chat'),'pm-btn pm-tab-chat'),btn('Отчёты агентов',()=>setTab('reports'),'pm-btn pm-tab-reports'));
  tabs.children[0].setAttribute('aria-selected','true');tabs.children[1].setAttribute('aria-selected','false');main.append(tabs);
  const dialog=mk('div','pm-chat-dialog');
  const modeLabel=mk('label','pm-chat-field','Исполнитель');
  agentSel=mk('select','pm-chat-mode');
  for(const [value,label]of [['local','Локальный PM Advisor · бесплатно'],['github','OpenRouter Free · GitHub secret (публичный канал)'],['openrouter','OpenRouter Free · отдельный ключ Vercel']]){
    const opt=mk('option',null,label);opt.value=value;agentSel.appendChild(opt);}
  agentSel.addEventListener('change',onModeChange);modeLabel.appendChild(agentSel);dialog.append(modeLabel);
  const modelLabel=mk('label','pm-chat-field','Модель OpenRouter');
  modelSel=mk('select','pm-chat-model');modelLabel.appendChild(modelSel);dialog.append(modelLabel);
  modeDesc=mk('p','pm-chat-hint');dialog.append(modeDesc);
  history=mk('div','pm-chat-history');history.setAttribute('role','log');history.setAttribute('aria-live','polite');dialog.append(history);
  const form=mk('form','pm-chat-input-form');
  editor=mk('textarea','pm-chat-editor');editor.rows=3;editor.maxLength=1200;editor.placeholder='Спросите о выбранных задачах, PR, CI, исправлениях…';
  editor.setAttribute('aria-label','Сообщение AI-исполнителю');form.append(editor);
  sendBtn=mk('button','pm-btn','Отправить сообщение');sendBtn.type='submit';form.append(sendBtn);
  form.addEventListener('submit',sendMessage);dialog.append(form);
  dialog.append(btn('Скачать историю чата',transcript,'pm-btn pm-quiet'));
  dialog.append(mk('p','pm-chat-hint','Это быстрый временный диалог. Для отдельной постоянной истории каждой задачи перейдите в «Рабочие чаты». Не вводите ключи или личные данные клиентов.'));
  const ghLink=mk('a','pm-chat-report-link','Открыть публичный GitHub Agent Inbox #3890');
  ghLink.href='https://github.com/andylitvinov-design/books/issues/3890';ghLink.target='_blank';ghLink.rel='noopener noreferrer';
  dialog.append(ghLink);main.append(dialog);
  const reports=mk('div','pm-chat-reports');reports.hidden=true;
  reportBtn=btn('Обновить отчёты GitHub',refreshReports,'pm-btn pm-quiet');reports.append(reportBtn);
  reportList=mk('div','pm-chat-report-list');reports.append(reportList);
  reports.append(mk('p','pm-chat-hint','Подключены только подтверждённые публикации GitHub Actions и ChatGPT-коннектора в существующих журналах #1419 и #3128. Другие агенты пока не подключены к входящим сообщениям.'));
  main.append(reports);panel.append(main);
  notice=mk('p','pm-chat-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');panel.append(notice);
  root.parentNode.insertBefore(panel,root);
  readStatus();
 }
 window.HHPM_AGENT_CHAT={init};
})();