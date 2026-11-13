'use strict';
/* Read-only project snapshot. No direct Supabase access, no write API, no polling. */
(function(){
 const root=document.getElementById('cc-content');if(!root)return;
 const view=root.dataset.view||'home';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const allTasks=p=>p.stages.flatMap(s=>s.tasks.map(t=>({...t,stage:s.title,project:p.title,projectKey:p.key})));
 const status=s=>['blocked','partial','verified','planned'].includes(s)?s:'planned';
 const kpis=[['Проекты',p=>p.length],['Задачи',p=>p.flatMap(allTasks).length],['С PR',p=>p.flatMap(allTasks).filter(t=>t.prs.length).length],['Блокеры',p=>p.flatMap(allTasks).filter(t=>status(t.status)==='blocked').length]];
 function hero(title,subtitle){const h=el('section','hh-cc-hero');h.append(el('p','hh-cc-eyebrow','✦ HOLISTIC HOUSE · STRATEGY OS'),el('h1',null,title),el('p',null,subtitle));root.append(h)}
 function panel(title,link,label){const p=el('section','hh-cc-panel'),h=el('div','hh-cc-panel-head');h.append(el('h2',null,title));if(link){const a=el('a',null,label||'Все →');a.href=link;h.append(a)}p.append(h);root.append(p);return p}
 function row(p,text,subtitle,url,mark){const a=el('a','hh-cc-row');a.href=url;a.append(el('span','hh-cc-num',mark),(()=>{const d=el('span','hh-cc-row-body');d.append(el('strong',null,text),el('small',null,subtitle));return d})(),el('span','hh-cc-arrow','›'));p.append(a)}
 function footer(snapshot){const dt=new Date(snapshot.asOf),valid=Number.isFinite(dt.getTime());const age=valid?(Date.now()-dt.getTime())/86400000:Infinity;
  root.append(el('p','hh-cc-stamp',valid?'Публичный срез: '+dt.toLocaleString('ru-RU')+(age>1?' · старше 24 часов':'')+' · GitHub PR проверяются отдельно':'Дата среза неизвестна'));
  root.append(el('p','hh-cc-muted','Публичные статусы — не доказательство выполнения. Код → CI → Merge → функциональный LIVE подтверждаются раздельно.'))}
 function home(s){const ps=s.projects,tasks=ps.flatMap(allTasks);hero('Мой брифинг','Проекты и агенты · фактический статус');
  const meter=el('section','hh-cc-metrics');meter.setAttribute('aria-label','Статистика публичных задач');
  kpis.forEach(([name,fn])=>{const box=el('div','hh-cc-metric');box.append(el('b',null,fn(ps)),el('small',null,name));meter.append(box)});root.append(meter);
  const priority=tasks.filter(t=>t.status==='blocked').concat(tasks.filter(t=>t.status==='partial')).slice(0,4);
  const p=panel('⭐ Главные приоритеты','/project-management-public.html','Все задачи ›');
  priority.forEach((t,i)=>row(p,t.id+' · '+t.title,t.project+' · '+(t.prs.length?'PR #'+t.prs.join(', #'):'PR пока нет'),'/project-management-public.html',String(i+1)));
  const quick=panel('Мониторинг и управление');const links=el('div','hh-cc-quicklinks');
  [['◷','PR → CI → Merge','https://holistic-house-pr-observatory.vercel.app/'],['▥','Задержки CI → HEAD','https://holistic-house-pr-observatory.vercel.app/'],['☑','Проекты и задачи','/project-management-public.html'],['♧','Работа агентов','/agents.html']].forEach(([icon,label,url])=>{const a=el('a',null,icon+'  '+label);a.href=url;links.append(a)});quick.append(links);
  const c=panel('Состояние проектов','/projects.html','Открыть ›');for(const p of ps){const tasks=allTasks(p);row(c,p.title,tasks.length+' подзадач · '+tasks.filter(t=>t.status==='verified').length+' отмечено как подтверждённые','/project-management-public.html','▦')}
  footer(s);
 }
 function projects(s){hero('Проекты','Крупные задачи → этапы → подзадачи → PR');const m=el('section','hh-cc-metrics');kpis.forEach(([k,fn])=>{const x=el('div','hh-cc-metric');x.append(el('b',null,fn(s.projects)),el('small',null,k));m.append(x)});root.append(m);
  s.projects.forEach((p,i)=>{const tasks=allTasks(p),c=panel(p.title);c.append(el('p','hh-cc-muted',p.summary));row(c,'Открыть '+p.stages.length+' этапов и '+tasks.length+' подзадач',tasks.filter(t=>t.status==='blocked').length+' блокеров · '+tasks.filter(t=>t.prs.length).length+' задач с PR','/project-management-public.html',String(i+1))});footer(s);
 }
 function agents(s){hero('Агенты','Только наблюдаемые события и проверяемые действия');
  const chatsPanel=panel('💬 Рабочие чаты по задачам','/chats.html','Открыть чаты ›');
  chatsPanel.append(el('p','hh-cc-muted','Раздельные команды и задания, несколько исполнителей, приватная история и проверка PR. Назначение не означает запуск агента.'));
  const skillPanel=panel('🧩 Библиотека навыков','/skills.html','Открыть каталог ›');skillPanel.append(el('p','hh-cc-muted','30 SKILL.md: по подзадаче Commander подберёт подходящие инструкции, даст проверить и скачать пакет для исполнителя. Без запуска агента или платного API.'));
  const a=panel('♧ ChatGPT и автоматизации');a.append(el('p','hh-cc-muted','Реальная активность измеряется отдельным наблюдением, а не количеством чатов. Число активных сейчас неизвестно без свежего проверенного источника.'));
  const al=el('a','hh-cc-external','Смотреть счётчик GPT-агентов в PR Monitor ›');al.href='https://holistic-house-pr-observatory.vercel.app/';a.append(al);
  const b=panel('⚙ GitHub Watchdog и Repair Worker');b.append(el('p','hh-cc-muted','Проверка текущего PR и HEAD, разрешённый запуск только через существующий защищённый процесс. Подготовленная передача задачи ещё не коммит.'));
  const bl=el('a','hh-cc-external','Открыть монитор CI и очереди ›');bl.href='https://holistic-house-pr-observatory.vercel.app/';b.append(bl);
  row(b,'🛠 AI PR Repair · North Mini Code','Проверить конкретный PR и подготовить команду для GitHub Worker; отправка владельцем, без ключей браузера','/project-management-public.html','🛠');
  const c=panel('🛡 Owner Execution Gateway');c.append(el('p','hh-cc-muted','Создание, запуск, повторы и отмена требуют авторизации владельца на существующем сервере. Публичному монитору ключи не выдаются.'));
  const cl=el('a','hh-cc-external','Открыть защищённый редактор задач ›');cl.href='/task-editor.html';c.append(cl);
  const p=panel('Подзадачи для исполнителей');row(p,'Выбрать 1–8 задач и подготовить передачу','ChatGPT Work / GitHub Issue / существующий Repair Worker','/project-management-public.html','☑');footer(s);
 }
 async function main(){try{
  const r=await fetch('/project-management-public.json',{cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);const s=await r.json();
  if(s?.schema!=='HH_PM_PUBLIC_V1'||!Array.isArray(s.projects)||!s.projects.length||s.projects.length>8||!s.projects.every(p=>Array.isArray(p.stages)))throw Error('Непроверенный публичный снимок');
  root.replaceChildren();if(view==='agents')agents(s);else if(view==='projects')projects(s);else home(s);
 }catch(err){root.replaceChildren();hero(view==='agents'?'Агенты':view==='projects'?'Проекты':'Мой брифинг','Данные не подставляются из устаревшего кэша');const p=panel('Источник недоступен');p.append(el('p','hh-cc-error','Не удалось загрузить публичный реестр: '+String(err.message||err)));
  const a=el('a','hh-cc-external','Открыть исходный PR Monitor ›');a.href='https://holistic-house-pr-observatory.vercel.app/';p.append(a)} }
 main();
})();
