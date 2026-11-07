'use strict';
/* Shared Commander chrome on every monitor page. No public write authority. */
(function(){
 if(typeof document==='undefined'||window.__HH_COMMANDER_SHELL_V1)return;
 window.__HH_COMMANDER_SHELL_V1=true;
 const paths={home:'/',tasks:'/project-management-public.html',agents:'/agents.html',projects:'/projects.html',monitor:'/pr-monitor.html'};
 const glyphs={home:'<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/>',tasks:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',agents:'<rect x="5" y="7" width="14" height="13" rx="3"/><path d="M12 3v4M9 13h.01M15 13h.01M9 17h6"/>',projects:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>'};
 const svg=name=>'<svg aria-hidden="true" viewBox="0 0 24 24">'+glyphs[name]+'</svg>';
 function make(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el}
 function mount(){
  if(!document.body||document.getElementById('hh-cc-dock'))return;
  document.body.classList.remove('hh-pm-nav-ready');document.body.classList.add('hh-cc-shell');
  const former=document.getElementById('hh-project-management-nav');if(former)former.remove();
  const head=make('header');head.id='hh-cc-topbar';
  head.append(make('span','hh-cc-logo','✺'));
  const brand=make('a','hh-cc-brand');brand.href='/';brand.append(make('strong',null,'Holistic House'),make('small',null,'Command Center'));head.append(brand);
  const refresh=make('button','hh-cc-iconbtn','⟳');refresh.type='button';refresh.title='Обновить страницу';refresh.setAttribute('aria-label','Обновить страницу');refresh.addEventListener('click',()=>location.reload());head.append(refresh);
  const more=make('button','hh-cc-iconbtn','⋮');more.type='button';more.title='Разделы мониторинга';more.setAttribute('aria-label','Разделы мониторинга');more.setAttribute('aria-expanded','false');head.append(more);
  const menu=make('div','hh-cc-menu');menu.hidden=true;
  [['Монитор PR, CI и Merge',paths.monitor],['Проекты и подзадачи',paths.tasks],['Агенты и автоматизации',paths.agents],['Библиотека навыков','/skills.html'],['Защищённый Agent Commander','https://holistichouse.vercel.app/admin/command-center']].forEach(([label,href])=>{const link=make('a',null,label);link.href=href;menu.append(link)});
  const brainLink=make('a',null,'🧠 Память проектов · AI Projects Brain');brainLink.href='/memory.html';menu.append(brainLink);
  head.append(menu);more.addEventListener('click',()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden))});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;more.setAttribute('aria-expanded','false')}});
  document.addEventListener('click',e=>{if(!head.contains(e.target)){menu.hidden=true;more.setAttribute('aria-expanded','false')}});
  document.body.prepend(head);
  const nav=make('nav');nav.id='hh-cc-dock';nav.setAttribute('aria-label','Agent Commander · основные разделы');
  const active=location.pathname==='/memory.html'?'projects':location.pathname===paths.tasks?'tasks':location.pathname===paths.agents?'agents':location.pathname===paths.projects?'projects':location.pathname===paths.monitor?'monitor':'home';
  [['home','Главная'],['tasks','Задачи'],['add','Создать'],['agents','Агенты'],['projects','Проекты']].forEach(([name,label])=>{
   const e=make(name==='add'?'button':'a');if(name==='add'){
    e.type='button';e.setAttribute('aria-label','Создать задачу');e.append(make('span','hh-cc-add','+'));e.addEventListener('click',openTaskDraft);
   }else{e.href=paths[name];e.innerHTML=svg(name);if(active===name)e.setAttribute('aria-current','page')}
   e.append(make('small',null,label));nav.append(e);
  });
  document.body.append(nav);
  const brainCss=make('link');brainCss.rel='stylesheet';brainCss.href='/commander-memory.css?v=20261107-brain-v1';document.head.append(brainCss);
  const brainJs=make('script');brainJs.src='/commander-memory.js?v=20261107-brain-v1';brainJs.async=false;document.head.append(brainJs);
  const bridge=make('script');bridge.id='hh-cc-transfer-loader';
  bridge.src='/commander-transfer.js?v=20261107-task-transfer-v1';document.head.append(bridge);
  const skillCss=make('link');skillCss.rel='stylesheet';skillCss.href='/commander-skills.css?v=20261107-skills-v1';document.head.append(skillCss);
  const skillJs=make('script');skillJs.src='/commander-skills.js?v=20261107-skills-v1';skillJs.async=false;document.head.append(skillJs);
  const loader=make('script');loader.id='hh-cc-task-input-loader';loader.async=false;
  loader.src='/commander-task-input.js?v=20261107-voice-decompose-v1';
  loader.onerror=()=>{loader.dataset.failed='true'};
  loader.onload=()=>{loader.dataset.loaded='true'};
  document.head.append(loader);
 }
 function openTaskDraft(){
  if(typeof window.HHOpenTaskIntake==='function'){window.HHOpenTaskIntake();return}
  const loader=document.getElementById('hh-cc-task-input-loader');
  if(loader&&loader.dataset.failed!=='true'&&loader.dataset.loaded!=='true'){
   loader.addEventListener('load',()=>{
    if(typeof window.HHOpenTaskIntake==='function')window.HHOpenTaskIntake();
    else openLegacyTaskDraft();
   },{once:true});return;
  }
  openLegacyTaskDraft();
 }
 function openLegacyTaskDraft(){
  let dialog=document.getElementById('hh-cc-task-draft');
  if(!dialog){
   dialog=make('div','hh-cc-dlg');dialog.id='hh-cc-task-draft';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Новая задача');
   const sheet=make('section','hh-cc-sheet');sheet.append(make('h2',null,'Новая задача'),make('p',null,'Публичный монитор не сохраняет и не запускает задания. Для реального создания используйте защищённый Agent Commander владельца.'));
   const draft=make('textarea');draft.placeholder='Опишите задачу — текст можно скопировать';draft.setAttribute('aria-label','Текст новой задачи');sheet.append(draft);
   const copy=make('button',null,'Копировать описание');copy.addEventListener('click',async()=>{if(!draft.value.trim())return;try{await navigator.clipboard.writeText(draft.value);copy.textContent='Скопировано ✓'}catch{draft.select();copy.textContent='Выделено — скопируйте вручную'}});sheet.append(copy);
   const owner=make('a',null,'Открыть защищённый редактор');owner.href='https://holistichouse.vercel.app/admin/command-center';sheet.append(owner);
   const close=make('button','hh-cc-secondary','Закрыть');close.type='button';close.addEventListener('click',()=>{dialog.hidden=true});sheet.append(close);dialog.append(sheet);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.hidden=true});document.body.append(dialog);
  }
  dialog.hidden=false;dialog.querySelector('textarea')?.focus();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
