'use strict';
/* HH_PR_THREE_KPI_UI_V1: no direct GitHub fetch, no timer, no CI/merge action.
 * Original monitor sections remain visible. One cached same-origin request.
 */
(function(){
 if(typeof document==='undefined'||window.__hhThreeKpiMounted)return;
 window.__hhThreeKpiMounted=true;
 const ROOT='hh-pr-three-kpis',ENDPOINT='/api/pr-three-kpis';
 const SOURCE='https://github.com/andylitvinov-design/books/issues/3419';
 const HISTORY='https://github.com/andylitvinov-design/books/issues/3394';
 const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
 const dates=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
  day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const safeLink=u=>typeof u==='string'&&
  /^https:\/\/github\.com\/andylitvinov-design\/books\/(?:actions\/runs\/\d+(?:\/job\/\d+)?|pull\/\d+|issues\/\d+)$/.test(u)?u:null;
 function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;
  if(text!==undefined)x.textContent=String(text);return x;}
 let box,body,meta,reload,deepButton,report=null,busy=false,initialized=false,observer;
 const rows=[
  {key:'error_to_repair',title:'Error → Repair',
    what:'От завершения первого подтверждённого failed CI job до доказанного начала фактического Repair'},
  {key:'ci_first_pass',title:'CI First Pass',
    what:'Доля PR, успешно завершивших обязательный Core CI с первой волны; ранняя история может отсутствовать'},
  {key:'green_to_merge',title:'Green → Merge',
    what:'От последнего подтверждённого hh-merge-check PASS после Core/Specialist до фактического merged_at на том же HEAD'}
 ];
 function min(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0?
  (n<1?fmt.format(n*60)+' сек':fmt.format(n)+' мин'):'—';}
 function local(v){const n=Date.parse(v||'');return Number.isFinite(n)?dates.format(new Date(n)):'—';}
 function range(w){return w?.period?
   local(w.period.from)+' — '+local(w.period.to)+' Toronto':'Нет интервала';}
 function mount(){
  if(box)return true;
  const destination=document.getElementById('hh2-stages');
  const anchor=destination?.querySelector('#hh2-stages .hh2-compare')||
    destination?.querySelector('.hh2-compare');
  if(!anchor)return false;
  box=el('section','hh-kpi-panel');box.id=ROOT;
  box.setAttribute('aria-label','Три KPI PR от ошибки до Repair, First Pass и Green до Merge');
  const head=el('div','hh-kpi-head');
  const t=el('div');t.append(el('h2','','Три KPI · скорость PR'),
   el('small','','Последние 24 часа ↔ тот же час две недели назад'));
  reload=el('button','','Обновить');reload.type='button';
  reload.addEventListener('click',()=>void load(false,true));head.append(t,reload);
  box.append(head);
  const table=el('div','hh-kpi-table');
  const labels=el('div','hh-kpi-columns');
  labels.append(el('strong','','Показатель'),el('strong','','24 часа'),
   el('strong','','2 недели назад'));table.append(labels);
  body=el('div','hh-kpi-data');table.append(body);
  box.append(table);
  const options=el('div','hh-kpi-options');
  deepButton=el('button','','Проверить начало Repair (до 5 PR)');
  deepButton.type='button';deepButton.addEventListener('click',()=>void load(true,true));
  options.append(deepButton);box.append(options);
  meta=el('p','hh-kpi-note','Читаю проверенный архив GitHub…');
  meta.setAttribute('role','status');box.append(meta);
  destination.insertBefore(box,anchor);
  return true;
 }
 function itemValue(key,entry){
  if(!entry)return {label:'—',sub:'Нет данных'};
  if(key==='error_to_repair')
   return {label:entry.n?min(entry.mean_min):'—',
    sub:entry.n?'n='+entry.n+' · p50 '+min(entry.median_min)+' · p95 '+min(entry.p95_min):
    'n=0 · Repair без доказанной пары событий'};
  if(key==='green_to_merge')return {
   label:entry.n?min(entry.mean_min):'—',
   sub:entry.n?'n='+entry.n+' · p50 '+min(entry.median_min)+' · p95 '+min(entry.p95_min):
    'n=0 · проверенного PASS → Merge нет'};
  const n=entry.measured||0;
  return {label:n&&entry.percent_observed!==null?
    '≈'+fmt.format(entry.percent_observed)+'%*':'—',
    sub:n?'Первые СОХРАНЁННЫЕ волны: '+entry.passed+'/'+n+' PR · история неполная':
      'n=0 · первых волн нет в архиве'};
 }
 function evidenceItems(key,entry){
  if(key==='ci_first_pass')return entry.examples||[];
  return entry.rows||[];
 }
 function render(){
  if(!report||!body)return;
  body.replaceChildren();
  const today=report.windows?.last_24h,history=report.windows?.two_weeks_ago;
  for(const conf of rows) {
   const d=el('details','hh-kpi-item');
   const s=el('summary','hh-kpi-row');
   const a=el('span','hh-kpi-name',conf.title);
   const left=itemValue(conf.key,today?.[conf.key]);
   const right=itemValue(conf.key,history?.[conf.key]);
   const now=el('span','hh-kpi-number',left.label);
   now.append(el('small','',left.sub));
   const before=el('span','hh-kpi-number',right.label);
   before.append(el('small','',right.sub));
   s.append(a,now,before);d.append(s);
   const description=el('div','hh-kpi-detail');
   description.append(el('p','',conf.what));
   description.append(el('p','','Сейчас: '+range(today)+'; две недели назад: '+range(history)+'.'));
   if(conf.key==='ci_first_pass')description.append(el('p','hh-kpi-warning',
     '* Процент рассчитан только по первым сохранённым Core-запускам. Это НЕ подтверждённый CI First Pass всей когорты без полной истории GitHub.'));
   if(conf.key==='error_to_repair')description.append(el('p','hh-kpi-warning',
     'Repair измеряется только по подлинному событию repair_started на том же PR и HEAD после доказанной ошибки, а не по принятию dispatch или метке Repair.'));
   const items=evidenceItems(conf.key,today?.[conf.key]);
   if(items.length){
    const list=el('div','hh-kpi-examples');
    for(const e of items.slice(0,8)){
     const line=el('div','hh-kpi-example');
     const link=el('a','','#'+e.pr);link.href='https://github.com/andylitvinov-design/books/pull/'+e.pr;
     link.target='_blank';link.rel='noopener noreferrer';
     line.append(link,el('span','',
       typeof e.minutes==='number'?min(e.minutes):e.pass||'Подтверждённое событие'));
     const url=safeLink(e.job_url||e.workflow_url||e.run_url||e.failure_job_url);
     if(url){const u=el('a','','GitHub proof');u.href=url;u.target='_blank';
      u.rel='noopener noreferrer';line.append(u);}
     list.append(line);
    }
    description.append(list);
   }else description.append(el('p','hh-kpi-warning',
     'Нет доказанных пар событий за этот период: отсутствие метки не означает нулевую задержку.'));
   d.append(description);body.append(d);
  }
  meta.replaceChildren();
  meta.append('Источник: ');
  const l=el('a','','архив Core CI #3419');l.href=SOURCE;l.target='_blank';l.rel='noopener noreferrer';
  meta.append(l,' · ');
  const h=el('a','','исторический аудит #3394');h.href=HISTORY;h.target='_blank';h.rel='noopener noreferrer';
  meta.append(h,'. ');
  meta.append('Core архив: '+(report.coverage?.archived_run_count??'—')+
   ' запусков, '+(report.coverage?.archive_complete_read?'все страницы прочитаны':'неполный список страниц')+
   '. Исходная история Core CI не подтверждена полной; исторические пропуски ≠ 0.');
  if(report.coverage?.stale)meta.append(' УСТАРЕВШИЙ снимок.');
 }
 async function load(repair=false,force=false) {
  if(busy)return;
  busy=true;reload.disabled=true;deepButton.disabled=true;
  const old=report;
  meta.textContent=repair?'Проверяю подтверждённые ошибки и начало Repair (ограниченная выборка PR)…':
    'Читаю сохранённый архив KPI…';
  try{
   const response=await fetch(ENDPOINT+(repair?'?repair=1':''),{
    headers:{Accept:'application/json'},cache:force?'no-store':'default'});
   const data=await response.json();
   if(!response.ok||data.schema!=='HH_PR_THREE_KPI_V1'||!data.windows)
    throw Error(data.error||'HTTP '+response.status);
   report=data;render();
   if(repair)meta.append(' · Проверено Repair PR: '+
    (data.coverage?.repair_prs_checked??0)+' / '+(data.coverage?.repair_read_budget??0)+
    ' · глубокий аудит ограничен для защиты квоты GitHub.');
  }catch(e){report=old;if(old)render();
   meta.textContent='KPI временно недоступны: '+String(e.message||e).slice(0,125)+
     '. Старые значения не заменены нулями.';}
  finally{busy=false;reload.disabled=false;deepButton.disabled=false;}
 }
 function start(){
  if(!mount()){
   observer=new MutationObserver(()=>{if(mount()){observer.disconnect();activate();}});
   observer.observe(document.documentElement,{childList:true,subtree:true});
  }else activate();
 }
 function activate(){
  if(initialized)return;initialized=true;
  if('IntersectionObserver' in window){
   const watch=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){watch.disconnect();void load();}
   },{rootMargin:'250px 0px'});
   watch.observe(box);
  }else void load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
