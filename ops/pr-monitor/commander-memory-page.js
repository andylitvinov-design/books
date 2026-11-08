'use strict';
/* Read-only memory browser; never writes GitHub, stores credentials, or launches agents. */
(function(win){
 if(!win||!win.document)return;
 const doc=win.document,api=win.HHCommanderMemory,by=id=>doc.getElementById(id);
 const listEl=by('hh-memory-projects'),query=by('hh-memory-search'),status=by('hh-memory-status');
 if(!listEl||!api)return;
 const detail=by('hh-memory-detail'),title=by('hh-memory-title'),meta=by('hh-memory-meta'),
  docs=by('hh-memory-docs'),bundle=by('hh-memory-bundle'),feedback=by('hh-memory-feedback');
 const mk=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 let catalog=null,selected='',epoch=0;
 function showProjects(){
  listEl.replaceChildren();
  if(!catalog)return;
  const matches=api.find(query.value,catalog);
  status.textContent=matches.length+' проектов найдено'+(catalog.registryUpdated
    ?' · дата обновления реестра: '+catalog.registryUpdated:'')+
    (catalog.warnings.length?' · '+catalog.warnings.join('; '):'');
  if(!matches.length){listEl.append(mk('p',null,'Совпадений по названию и синонимам нет. Попробуйте другое слово.'));return}
  for(const p of matches){
   const button=mk('button','hh-memory-project');button.type='button';
   button.setAttribute('aria-pressed',String(selected===p.id));
   button.append(mk('strong',null,'▤ '+p.name),mk('small',null,
    (p.repo?p.repo+' · ':'')+(p.hasFolder?'Папка памяти':'Папка не проверена')+
    (p.source==='registry'?' · '+p.status:'')));
   button.addEventListener('click',()=>openProject(p.id));listEl.append(button);
  }
 }
 async function openProject(id){
  const token=++epoch;selected=id;feedback.textContent='';
  showProjects();detail.hidden=false;title.textContent='Читаю память проекта…';
  meta.textContent='Загружаю файлы из публичного репозитория…';docs.replaceChildren();bundle.value='';
  by('hh-memory-task').disabled=true;
  try{
   const record=await api.load(id);
   if(token!==epoch)return;
   title.textContent=record.project.name;
   meta.textContent='Источник: '+record.project.id+' · '+record.documents.length+
    ' файлов получено · '+record.missing.length+' отсутствуют · '+record.errors.length+' ошибок. '+
    'Статус реестра — справочный, не подтверждение LIVE.';
   const folder=mk('a','hh-memory-source','Открыть папку в GitHub');folder.href=record.folderUrl;
   folder.target='_blank';folder.rel='noopener noreferrer';docs.append(folder);
   for(const file of record.documents){
    const details=mk('details'),summary=mk('summary',null,file.name),pre=mk('pre',null,file.text);
    const link=mk('a','hh-memory-source','Оригинал '+file.name);link.href=file.url;
    link.target='_blank';link.rel='noopener noreferrer';details.append(summary,pre,link);docs.append(details);
   }
   if(!record.documents.length)docs.append(mk('p',null,
    'Нет доступных файлов паспорта. Проверьте папку в GitHub; данные не подменяются предположениями.'));
   if(record.errors.length)docs.append(mk('p',null,'Ошибки чтения: '+record.errors.join('; ')));
   bundle.value=api.bundle(record,3300);
   by('hh-memory-task').disabled=false;
  }catch(e){if(token!==epoch)return;title.textContent='Память не загружена';
   meta.textContent='Источник недоступен: '+String(e.message||e);docs.replaceChildren();
   bundle.value='';by('hh-memory-task').disabled=true;}
  showProjects();
 }
 by('hh-memory-copy').addEventListener('click',async()=>{
  if(!bundle.value){feedback.textContent='Сначала выберите проект.';return}
  try{await win.navigator.clipboard.writeText(bundle.value);feedback.textContent='Контекст скопирован.'}
  catch{bundle.focus();bundle.select();feedback.textContent='Выделено — скопируйте вручную.'}
 });
 by('hh-memory-task').addEventListener('click',()=>{
  if(!selected)return;
  win.HHCommanderMemorySelection=selected;
  if(typeof win.HHOpenTaskIntake==='function')win.HHOpenTaskIntake();
  else feedback.textContent='Панель задач недоступна. Скопируйте контекст и откройте защищённый редактор.';
 });
 query.addEventListener('input',showProjects);
 (async()=>{
  try{catalog=await api.list();showProjects();
   const id=new URLSearchParams(win.location.search).get('project');
   if(id&&catalog.projects.some(p=>p.id===id))await openProject(id);
  }catch(e){status.textContent='Память не загружена: '+String(e.message||e)+'. Откройте AI Projects Brain в GitHub.'}
 })();
})(typeof window==='undefined'?null:window);
