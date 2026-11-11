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
 let box,body,meta,reload,deepButton,wavePanel,report=null,busy=false,initialized=false,observer;
 const rows=[
  {key:'error_to_repair',title:'Error → Repair',
    what:'От завершения failed job core-lint-types-build до доказанного начала Repair на том же PR/HEAD'},
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
  wavePanel=el('section','hh-kpi-wave');
  wavePanel.setAttribute('aria-label','Эффективность PR: первые CI-волны, повторы и скорость слияния');
  box.append(wavePanel);
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
   sub:entry.n?'n='+entry.n+' · P50 '+min(entry.median_min)+' · P95 '+min(entry.p95_min)+
    ' · merge по точному HEAD '+(entry.exact_head_merge_proofs||0)+
    ', архив '+(entry.archived_merge_proofs||0):
    'n=0 · нет пары последних обязательных PASS и подтверждённого merge'};
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
 // Explain a long-tail Green → Merge mean using only same-cohort exact-HEAD
 // observations. Never label the interval as an automatic-merge failure.
 function latencyOutlier(entry){
  if(!entry||!Number.isSafeInteger(entry.n)||entry.n<3||
     !Number.isFinite(entry.median_min)||entry.median_min<0||
     !Array.isArray(entry.rows)||entry.rows.length!==entry.n)return null;
  const ordered=entry.rows.filter(r=>Number.isSafeInteger(r?.pr)&&r.pr>0&&
    Number.isFinite(r?.minutes)&&r.minutes>=0).sort((a,b)=>b.minutes-a.minutes);
  if(ordered.length!==entry.n)return null;
  const worst=ordered[0];
  if(worst.minutes<30||worst.minutes<5*entry.median_min)return null;
  const meanWithoutOutlier=ordered.slice(1).reduce((sum,r)=>sum+r.minutes,0)/(entry.n-1);
  return {pr:worst.pr,minutes:worst.minutes,meanWithoutOutlier};
 }
function renderWaves(){
  if(!wavePanel)return;
  wavePanel.replaceChildren();
  const h=el('div','hh-kpi-wave-head');
  h.append(el('h3','','Эффективность CI · 24–48 ч'),
    el('small','','Сравнение двух соседних 24-часовых когорт PR по дате создания'));
  wavePanel.append(h);
  const data=report?.release_efficiency;
  if(data?.schema!=='HH_PR_WAVE_EFFECTIVENESS_V1'){
    const reason=report?.efficiency_lookup?.reason;
    wavePanel.append(el('p','hh-kpi-wave-note',
      'Статистика CI-волн временно недоступна'+(reason?' ('+reason+')':'')+
      '. Отсутствующие данные не равны нулю. Остальные KPI продолжают работать.'));
    return;
  }
  const now=data.periods?.last_24h,prev=data.periods?.previous_24h;
  if(!now||!prev)return;
  const grid=el('div','hh-kpi-wave-grid');
  function card(title,value,sub,previous){
    const c=el('article','hh-kpi-wave-card');
    c.append(el('span','hh-kpi-wave-label',title),el('strong','hh-kpi-wave-value',value),
      el('small','hh-kpi-wave-sub',sub),
      el('small','hh-kpi-wave-prev','Пред. 24 ч: '+previous));
    grid.append(c);
  }
  const ratio=p=>p.ci_archived_prs?
    String(p.one_observed_wave_prs)+'/'+String(p.ci_archived_prs):'—';
  card('1 CI-волна / PR · цель',ratio(now),
    'Первых сохранённых: '+now.ci_archived_prs+'/'+now.created_prs+
      ' PR · ≈'+(now.observed_one_wave_percent??'—')+'%*',
    ratio(prev)+' из '+prev.ci_archived_prs+' с CI');
  card('Лишние CI-волны · ↓',
    now.ci_archived_prs?'≥'+now.extra_observed_waves:'—',
    'Новый HEAD: '+now.new_head_extra_waves+' · тот же SHA: '+
      now.same_head_extra_waves+' · rerun: '+now.retry_attempts_observed,
    prev.ci_archived_prs?'≥'+prev.extra_observed_waves:'—');
  card('PR → Merge · P50 / P90 · ↓',
    now.merge_latency.n?min(now.merge_latency.median_min):'—',
    'P90: '+min(now.merge_latency.p90_min)+' · n='+
      now.merge_latency.n+'/'+now.created_prs+' созданных',
    prev.merge_latency.n?'P50 '+min(prev.merge_latency.median_min)+
      ' · P90 '+min(prev.merge_latency.p90_min)+
      ' · n='+prev.merge_latency.n:'—');
  wavePanel.append(grid);
  const completeness=data.coverage?.cohort_complete?'полная выборка PR за 48 ч':
    'список PR частичный';
  const note=el('p','hh-kpi-wave-note',
    '* Количество «1 волна» относится только к PR с хотя бы одним сохранённым Core CI. '+
    'Это не доказанный первый запуск за всю историю. '+completeness+
    '; Core-архив исторически неполный. '+
    'Слияния оцениваются только для уже merged PR; остальные '+now.unmerged_prs+
    ' из '+now.created_prs+' остаются незавершёнными. '+
    'Уменьшение числа волн само по себе не доказывает экономию времени.');
  wavePanel.append(note);
  if(now.examples?.length){
    const samples=el('details','hh-kpi-wave-examples');
    samples.append(el('summary','','Повторные CI и изменения HEAD · примеры'));
    const list=el('div','hh-kpi-wave-list');
    for(const p of now.examples.slice(0,5)){
      const line=el('div','hh-kpi-wave-example');
      const a=el('a','','PR #'+p.pr);
      a.href='https://github.com/andylitvinov-design/books/pull/'+p.pr;
      a.target='_blank';a.rel='noopener noreferrer';
      line.append(a,el('span','',p.waves_observed+
        ' сохранённых волн · новый HEAD '+p.new_head+
        ' · тот же SHA '+p.same_head+' · rerun '+p.retry_attempts));
      const proof=safeLink(p.run_url);
      if(proof){const link=el('a','','CI');link.href=proof;link.target='_blank';
        link.rel='noopener noreferrer';line.append(link);}
      list.append(line);
    }
    samples.append(list);wavePanel.append(samples);
  }
 }
 
 function render(){
  if(!report||!body)return;
  renderWaves();
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
   if(conf.key==='green_to_merge'){
    const outlier=latencyOutlier(today?.green_to_merge);
    if(outlier){
     const warning=el('p','hh-kpi-warning','Среднее увеличено одним длительным PR ');
     const prLink=el('a','','#'+outlier.pr);
     prLink.href='https://github.com/andylitvinov-design/books/pull/'+outlier.pr;
     prLink.target='_blank';prLink.rel='noopener noreferrer';
     warning.append(prLink,': '+min(outlier.minutes)+' после подтверждённого Gate PASS. '+
       'Без этого PR среднее ≈'+min(outlier.meanWithoutOutlier)+
       '. Сам интервал не доказывает причину ожидания.');
     description.append(warning);
    }
   }
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
  const merge=report.coverage?.merge_lookup;
  if(merge)meta.append(' Merge после Core: '+(merge.status||'НЕИЗВЕСТНО')+
   ' · '+(merge.returned_merged_prs??0)+' подтверждённых PR в '+(merge.pages??0)+
   ' страницах GitHub; охват старой истории не гарантирован.'+
   (merge.reason?' Ошибка: '+merge.reason+'.':''));
  meta.append(' Максимальную задержку ВСЕХ PR нельзя считать доказанной, пока есть пропуски меток.');
 }
 async function load(repair=false,force=false) {
  if(busy)return;
  busy=true;reload.disabled=true;deepButton.disabled=true;
  const old=report;
  meta.textContent=repair?'Проверяю подтверждённые ошибки и начало Repair (ограниченная выборка PR)…':
    'Читаю сохранённый архив KPI…';
  try{
   const response=await fetch(ENDPOINT+(repair?'?repair=1&efficiency=1':'?efficiency=1'),{
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
