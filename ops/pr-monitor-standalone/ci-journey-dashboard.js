'use strict';
/* Central persistent Core CI history, no client-side polling or API tokens. */
(()=>{
 window.__hhCiArchiveActive=true;
 const periods=[1,6,24,72];
 const STAGES=[['workflow_wait','Запуск workflow → создание jobs'],
   ['runner_wait','Ожидание runner'],
   ['checks','Все активные CI jobs (Core, Specialist, merge-check)'],
   ['between_waves_unknown','Между волнами CI (причина не установлена)'],
   ['other_unknown','Другие интервалы без подтверждения']];
 const dateFmt=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',
   month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const dt=x=>Number.isFinite(Date.parse(x||''))?dateFmt.format(new Date(x)):'нет метки';
 const fmtMin=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?
   (n<1?Math.round(n*60)+' сек':n<60?Number(n.toFixed(1))+' мин':Number((n/60).toFixed(2))+' ч'):'—';
 const fmtMs=n=>fmtMin(typeof n==='number'?n/60000:null);
 const el=(tag,cls,value)=>{const v=document.createElement(tag);if(cls)v.className=cls;
    if(value!==undefined)v.textContent=String(value);return v;};
 const link=raw=>typeof raw==='string'&&
   /^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+(?:\/job\/\d+)?$/.test(raw)?raw:null;
 const commitLink=sha=>typeof sha==='string'&&/^[0-9a-f]{40}$/.test(sha)?
   'https://github.com/andylitvinov-design/books/commit/'+sha:null;
 let target,card,body,meta,toolbar,status,exportBtn;
 let current=null,active=24,busy=false,lastKey='',lastAt=0;
 function period(){
   const h=Number(document.getElementById('hh-pr-merge-speed')?.dataset.mergePeriodHours);
   return periods.includes(h)?h:24;
 }
 function setCard(data){
   if(!card)return;
   const strong=card.querySelector('strong'),small=card.querySelector('small');
   const n=data?.summary?.n;
   if(strong)strong.textContent=n>0?'≥ '+fmtMin(data.summary.median_minutes):'—';
   if(small)small.textContent=n>0?'n='+n+' PR · архив (выборка)':'Нет подтверждённых PR';
   card.title='Медиана первой сохранённой Core CI queued → последнего сохранённого Core job completed. Историческое покрытие неполное; 0 и отсутствие данных различаются.';
 }
 function runLink(url,label){
   const safe=link(url);
   const a=el(safe?'a':'span','',label);
   if(safe){a.href=safe;a.target='_blank';a.rel='noopener noreferrer';}
   return a;
 }
 async function renderWaveDetails(pr,h,host){
   host.replaceChildren(el('p','hh-ci-archive-note','Читаю подтверждённые интервалы CI…'));
   try{
     const response=await fetch('/api/ci-journey-summary?hours='+h+'&pr='+pr,
       {headers:{Accept:'application/json'},cache:'default'});
     const data=await response.json();
     if(!response.ok||data.schema!=='HH_CI_WAVE_DETAIL_V1'||data.pr!==pr||
        data.period_hours!==h||!Array.isArray(data.waves)||data.total_waves!==data.waves.length)
       throw Error(data.error||'Список интервалов не подтверждён');
     host.replaceChildren();
     if(!data.available){
       host.append(el('p','hh-ci-archive-note','В выбранном периоде нет подтверждённых интервалов; это не ноль.'));
       return;
     }
     if(!data.waves.length){
       host.append(el('p','hh-ci-archive-note','Запуски пересекались по времени либо нет подтверждённых пауз.'));
       return;
     }
     const names={new_head:'Новый HEAD',same_head:'Тот же HEAD',unverified_head:'HEAD неизвестен'};
     for(const w of data.waves){
       if(!Object.hasOwn(names,w.kind)||!Number.isSafeInteger(w.duration_ms)||w.duration_ms<=0)continue;
       const item=el('div','hh-ci-wave-item');
       const head=el('div','hh-ci-archive-stage');
       head.append(el('strong','',names[w.kind]),el('b','',fmtMs(w.duration_ms)));
       const note=el('p','hh-ci-archive-note',dt(w.started_at)+' → '+dt(w.ended_at)+'. '+
          (w.after_failure?'Предыдущий CI завершился ошибкой. ':'')+
          'Кто инициировал новую волну и причина ожидания не доказаны.');
       const links=el('p','hh-ci-archive-note');
       links.append(runLink(w.prior_url,'Предыдущий CI'),' · ',runLink(w.next_url,'Следующий CI'));
       const commit=commitLink(w.next_head);
       if(commit){const a=el('a','',' · Коммит');a.href=commit;a.target='_blank';
         a.rel='noopener noreferrer';links.append(a);}
       item.append(head,note,links);host.append(item);
     }
     host.append(el('p','hh-ci-archive-note',
       'Смена SHA доказывает новый исходный код, а не причину задержки.'+
       (data.pagination_partial?' Исторический архив неполный.':'')));
   }catch(error){
     host.replaceChildren(el('p','hh-ci-archive-note',
       'История недоступна: '+String(error.message||error).slice(0,100)+'. Отсутствие данных не равно нулю.'));
   }
 }
 function render(data){
   current=data;active=data.period_hours;body.replaceChildren();
   const s=data.summary,n=s.n;
   setCard(data);
   const header=el('div','hh-ci-cards');
   for(const [title,value] of [
      ['Замерено CI путей',n+' PR'],['Медиана наблюдений',n?'≥ '+fmtMin(s.median_minutes):'—'],
      ['P90 наблюдений',n?'≥ '+fmtMin(s.p90_minutes):'—'],
      ['Повторных CI',String(s.repeats)] ]){
     const item=el('div','hh-ci-mini');
     item.append(el('span','',title),el('strong','',value));header.append(item);
   }
   body.append(header);
   const jobless=data.coverage?.jobless_startup_runs;
   if(Number.isSafeInteger(jobless)&&jobless>0)
     body.append(el('p','hh-ci-archive-note',
       'Во всём доступном архиве: '+jobless+' регистраций Core завершились startup_failure до создания jobs. Это не работа runner и не успешная CI.'));
   if(!n){
     body.append(el('p','hh-ci-archive-empty',
      'В архиве пока нет завершённых Core CI за выбранный период. По мере завершения новых проверок данные появятся автоматически. Это не означает 0 минут.'));
   } else {
     // The API computes this across the ENTIRE cohort, not the truncated
     // slowest-PR drilldown, so the stage totals reconcile with the mean.
     const breakdown=data.stage_breakdown;
     const sum=breakdown.stage_total_ms;
     const denom=breakdown.observed_elapsed_ms;
     const chart=el('div','hh-ci-journey-bars');
     for(const [i,[key,title]] of STAGES.entries()){
       const bar=el('div','hh-ci-journey-bar bar-'+i);
       bar.style.width=(denom?100*sum[key]/denom:0).toFixed(4)+'%';
       bar.title=title+': '+fmtMs(sum[key]);chart.append(bar);
     }
     body.append(el('h5','','Вклад этапов в среднее время одного PR'),chart);
     const pieces=el('div','hh-ci-journey-pieces');
     for(const [key,label] of STAGES){
       const line=el('div');
       const title=el('span','',label);
       title.append(el('small','hh-ci-stage-sample',' · n='+breakdown.prs_with_observed_span[key]+'/'+breakdown.n));
       line.append(title,el('b','',fmtMin(breakdown.mean_minutes_per_pr[key])));
       pieces.append(line);
     }
     const total=el('div','hh-ci-journey-total');
     total.append(el('strong','','Итого: среднее наблюдаемое время'),
       el('b','',fmtMin(breakdown.total_mean_minutes)));
     body.append(pieces,total,el('p','hh-ci-archive-note',
       'Каждая строка — средний вклад этапа на 1 PR из одной выборки n='+breakdown.n+
       '. Сумма строк равна общему среднему (с учётом округления). Параллельные jobs учитываются один раз. Промежутки без доказательств вынесены отдельно.'));
     // Named job durations overlap the stage chart: never add them to total.
     const named=data.job_clock_summary;
     if(named?.schema==='HH_CI_NAMED_JOB_CLOCK_V1'&&named.n===n){
       body.append(el('h5','','Фактическое время Core, Specialist и Merge jobs'));
       const clocks=el('div','hh-ci-journey-pieces');
       for(const [key,title] of [['core','Core CI'],['specialist','Specialist'],
         ['merge_gate','Merge-check']]){
         const clock=named.clocks?.[key],line=el('div');
         const caption=el('span','',title);
         caption.append(el('small','hh-ci-stage-sample',
           ' · n='+(clock?.measured_prs??0)+'/'+n+
           ' · P95 '+fmtMin(clock?.p95_minutes)));
         line.append(caption,el('b','',fmtMin(clock?.mean_minutes)));
         clocks.append(line);
       }
       body.append(clocks,el('p','hh-ci-archive-note',
         'Отдельные jobs, не дополнительное время PR. Их длительности могут перекрываться; отсутствие метки остаётся неизвестным, не нулём.'));
     }
     const head=data.wave_head_evidence;
     if(head?.schema==='HH_CI_WAVE_HEAD_EVIDENCE_V1'&&head.reconciled===true){
       const kind=head.transition_counts,span=head.transition_total_ms;
       const share=head.total_gap_ms>0?
         Number((100*span.new_head/head.total_gap_ms).toFixed(1))+'%':'—';
       body.append(el('h5','','Почему паузы между волнами CI'),
         el('p','hh-ci-archive-note',
           'В '+head.total_gap_count+' измеренных паузах: новый HEAD — '+
           kind.new_head+' ('+fmtMs(span.new_head)+'), тот же HEAD — '+
           kind.same_head+' ('+fmtMs(span.same_head)+
           '), без подтверждённого SHA — '+kind.unverified_head+
           '. На смену HEAD приходится '+share+' времени пауз. После неуспешной CI — '+
           head.after_failed_count+' пауз. Смена HEAD доказывает новую версию исходников, но не причину ожидания; это НЕ очередь runner и не доказанное время Repair.'));
       if(Number.isSafeInteger(head.new_head_after_success_count)&&
          head.new_head_after_success_count>0){
         body.append(el('p','hh-ci-archive-note',
           'Из них смена HEAD после успешной предыдущей Core CI: '+
           head.new_head_after_success_count+' пауз ('+
           fmtMs(head.new_head_after_success_ms)+
           '). Это повод проверить необходимость новой публикации, НЕ доказательство лишнего коммита: Specialist, Guard и другие обязательные проверки могли ещё выполняться либо завершиться ошибкой.'));
       }
       if(Array.isArray(head.top_delays)&&head.top_delays.length){
         const examples=el('div','hh-ci-archive-list');
         for(const row of head.top_delays){
           if(!Number.isSafeInteger(row.pr)||row.pr<1)continue;
           const p=el('div','hh-ci-archive-stage');
           const a=el('a','','PR #'+row.pr);
           a.href='https://github.com/andylitvinov-design/books/pull/'+row.pr;
           a.target='_blank';a.rel='noopener noreferrer';
           p.append(a,el('span','',fmtMin(row.minutes)+
             ' · новых HEAD: '+row.new_head_count));examples.append(p);
         }
         const moreDelays=el('details','hh-ci-archive-more');
         moreDelays.append(el('summary','','Самые длинные паузы · '+examples.childElementCount+' PR'),examples);
         body.append(moreDelays);
       }
     }
     const heading=el('div','hh-ci-rows-head');
     heading.append(el('h5','','История PR: первый и последний CI'),
       el('span','',n+' проверенных PR'));
     body.append(heading);
     const list=el('div','hh-ci-archive-list');
     const more=el('details','hh-ci-archive-more');
     const moreList=el('div','hh-ci-archive-list');
     for(const [index,r] of data.rows.slice(0,30).entries()){
       const row=el('details','hh-ci-archive-pr');
       const summary=el('summary');
       summary.append(el('span','hh-ci-pr-number','#'+r.pr),
         el('strong','',fmtMin(r.elapsed_minutes)),
         el('small','',r.runs+' CI · '+r.repeats+' повторов'),
         el('span','hh-ci-arrow','⌄'));
       row.append(summary);
       const detail=el('div','hh-ci-archive-pr-detail');
       const stamps=el('div','hh-ci-archive-timestamps');
       for(const [name,time,url] of [
         ['Первая регистрация Core (включая сбои)',r.first_at,r.first_url],
         ['Первый реально запущенный job',r.first_job_started_at,r.first_job_url],
         ['Последний job CI · завершение',r.last_at,r.last_url]]){
         const line=el('div');line.append(el('span','',name),runLink(url,dt(time)));stamps.append(line);
       }
       detail.append(stamps);
       if(r.repeats>0){
         const waves=el('details','hh-ci-archive-more');
         const waveBody=el('div','hh-ci-archive-list');
         waves.append(el('summary','','Каждая повторная волна · время, SHA, причины'),waveBody);
         let requested=false;
         waves.addEventListener('toggle',()=>{
           if(!waves.open||requested)return;
           requested=true;void renderWaveDetails(r.pr,data.period_hours,waveBody);
         });
         detail.append(waves);
       }
       if(r.job_clock_ms){
         for(const [key,title] of [['core','Core job'],['specialist','Specialist job'],
           ['merge_gate','Merge-check job']]){
           const line=el('div','hh-ci-archive-stage');
           line.append(el('span','',title+' · запущен'),
             el('b','',fmtMs(r.job_clock_ms[key])));
           detail.append(line);
         }
       }
       for(const [key,name] of STAGES){
         const line=el('div','hh-ci-archive-stage');
         line.append(el('span','',name),el('b','',fmtMs(r.stages_ms?.[key])));detail.append(line);
       }
       const pr=el('a','hh-ci-archive-pr-link','Открыть PR #'+r.pr);
       pr.href='https://github.com/andylitvinov-design/books/pull/'+r.pr;
       pr.target='_blank';pr.rel='noopener noreferrer';
       detail.append(el('p','hh-ci-archive-note',
         'HEAD SHA: '+r.distinct_heads+' · смен HEAD в паузах: '+
         (r.wave_head_evidence?.new_head_count??'—')+' · ошибки: '+r.failures+
         ' · startup без jobs: '+(r.jobless_startup_runs||0)+
         ' · наблюдаемая история CI может не включать старые запуски.'),pr);
       if(r.failures>0&&r.repeats>0){
         const drill=el('button','hh-ci-repair-drill','Ожидание агента · Repair · публикация');
         drill.type='button';
         drill.disabled=!document.getElementById('hh-pr-audit-form');
         drill.title=drill.disabled?'История этого PR доступна в разделе «Хронология PR»':
           'Открыть подтверждённые интервалы исправления для PR #'+r.pr;
         drill.addEventListener('click',()=>{
           const form=document.getElementById('hh-pr-audit-form');
           const field=form?.querySelector('input[type="number"]');
           if(!form||!field)return;
           field.value=String(r.pr);
           form.requestSubmit();
           form.scrollIntoView({behavior:'smooth',block:'start'});
         });
         detail.append(drill);
       }
       row.append(detail);
       if(index<4)list.append(row);else moreList.append(row);
     }
     body.append(list);
     if(moreList.childElementCount){
       const totalMore=Math.max(0,data.summary.n-4);
       more.append(el('summary','', 'Показать ещё PR: '+totalMore+
         (data.summary.n>30?' (из них '+(30-4)+' в раскрываемом списке)':'')),moreList);
       body.append(more);
     }
   }
   const source=el('a','hh-ci-source','Архив событий GitHub #3419');
   source.href='https://github.com/andylitvinov-design/books/issues/3419';
   source.target='_blank';source.rel='noopener noreferrer';
   meta.replaceChildren();
   meta.append(el('span','',
     'Срез: '+dt(data.coverage.archive_fetched_at)+' Toronto · охват '+data.coverage.archived_prs+
     ' PR / '+data.coverage.archived_runs+' runs · '+(data.coverage.stale?'УСТАРЕВШИЙ СРЕЗ':'сохранён в GitHub')),
     source,el('span','',
      'Выборка по последнему завершённому Core job; подтверждённые startup_failure без jobs показаны отдельно. Время Draft — не очередь runner. Пропуски ≠ ноль.'));
   exportBtn.disabled=!Array.isArray(data.rows)||!data.rows.length;
   exportBtn.textContent=data.coverage.rows_total>data.coverage.rows_returned?
     'CSV · первые '+data.coverage.rows_returned+' PR':'Экспорт CSV';
 }
 async function load(force=false){
   const h=period(),key=String(h);
   if(busy||(!force&&key===lastKey&&Date.now()-lastAt<180000))return;
   busy=true;status.textContent='Читаю архив CI…';
   try{
     const response=await fetch('/api/ci-journey-summary?hours='+h+(force?'&refresh=1':''),
       {headers:{Accept:'application/json'},cache:force?'no-store':'default'});
     const data=await response.json();
     if(!response.ok||data.schema!=='HH_CI_FIRST_LAST_ARCHIVE_V1'||
       data.stage_breakdown?.schema!=='HH_CI_JOURNEY_CONTRIBUTIONS_V1'||
       data.stage_breakdown?.reconciled!==true||!Array.isArray(data.rows))
       throw Error(data.error||'Ошибка API '+response.status);
     if(h!==period())return;
     render(data);lastKey=key;lastAt=Date.now();
     status.textContent='Данные обновлены · '+data.summary.n+' PR с наблюдаемыми CI.';
   }catch(e){
     status.textContent='Архив временно недоступен: '+String(e.message||e).slice(0,100)+
       '. Старый срез не заменён нулями.';
   }finally{busy=false;if(h!==period())void load(true);}
 }
 function csv(){
   if(!Array.isArray(current?.rows)||!current.rows.length)return;
   const fields=['pr','created_at','merged_at','first_at','last_at','elapsed_minutes',
      'runs','repeats','failures','partial','history_complete',
      'first_url','last_url',...STAGES.map(([k])=>k+'_minutes')];
   const lines=[fields.join(','),...current.rows.map(r=>fields.map(k=>{
     const stage=k.endsWith('_minutes')&&k!=='elapsed_minutes';
     const value=stage?Math.round((r.stages_ms?.[k.slice(0,-8)]||0)/60000*100)/100:r[k];
     return '"'+String(value??'').replaceAll('"','""')+'"';
   }).join(','))];
   const url=URL.createObjectURL(new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
   const anchor=el('a');anchor.href=url;anchor.download='hh-ci-first-last-'+active+'h.csv';
   document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
 }
 function mount(){
   if(document.getElementById('hh-ci-central-archive'))return true;
   target=document.getElementById('hh-ci-phase-metrics');
   const grid=target?.querySelector('.hh-ci-phase-grid');
   if(!grid||grid.children.length<3)return false;
   card=grid.children[1];
   const pane=el('section','hh-ci-central');pane.id='hh-ci-central-archive';
   pane.append(el('h4','','Первый → последний CI · постоянная история'),
     el('p','hh-ci-archive-note',
       'Реальные события Core CI по каждому PR: от первой сохранённой очереди до последнего завершённого job. Замеры сохраняются в GitHub и доступны на всех устройствах.'));
   toolbar=el('div','hh-ci-central-actions');
   exportBtn=el('button','','Экспорт CSV');exportBtn.type='button';exportBtn.disabled=true;
   const reload=el('button','','Перепроверить');reload.type='button';
   toolbar.append(exportBtn,reload);
   status=el('p','hh-ci-central-status','Получаю подтверждённые этапы…');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   body=el('div','hh-ci-central-body');meta=el('div','hh-ci-central-meta');
   pane.append(toolbar,status,body,meta);grid.insertAdjacentElement('afterend',pane);
   exportBtn.addEventListener('click',csv);
   reload.addEventListener('click',()=>void load(true));
   document.getElementById('refresh')?.addEventListener('click',()=>void load(true));
   const speed=document.getElementById('hh-pr-merge-speed');
   if(speed)new MutationObserver(()=>void load()).observe(speed,
      {attributes:true,attributeFilter:['data-merge-period-hours']});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
   const style=el('style');
   style.textContent='.hh-ci-central{padding:12px;margin:12px 0;background:#0b1d30;color:#e9f4ff;border:1px solid #365873;border-radius:13px}.hh-ci-central h4{font-size:15px;margin:0 0 7px}.hh-ci-central h5{font-size:13px;margin:12px 0 8px}.hh-ci-archive-note,.hh-ci-central-status,.hh-ci-central-meta,.hh-ci-archive-empty{font-size:11px;line-height:1.45;color:#acc3d8;margin:8px 0}.hh-ci-central-actions{display:flex;gap:8px;margin:10px 0}.hh-ci-central-actions button{border:1px solid #55758d;background:#25425a;color:#eef8ff;padding:8px 10px;border-radius:8px;font-size:11px}.hh-ci-central-actions button:disabled{opacity:.5}.hh-ci-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hh-ci-mini{border:1px solid #385c7b;border-radius:9px;background:#101f32;padding:10px 6px;display:flex;flex-direction:column;gap:5px;text-align:center}.hh-ci-mini span{font-size:10px;color:#aec6da}.hh-ci-mini strong{font-size:17px;color:#87c9ff}.hh-ci-journey-bars{height:13px;display:flex;border-radius:8px;overflow:hidden;background:#31465c}.hh-ci-journey-bar{min-width:0}.hh-ci-journey-bar.bar-0{background:#537dba}.hh-ci-journey-bar.bar-1{background:#89c6ff}.hh-ci-journey-bar.bar-2{background:#70debc}.hh-ci-journey-bar.bar-3{background:#ffc077}.hh-ci-journey-bar.bar-4{background:#8f90ae}.hh-ci-journey-pieces{margin-top:9px;display:grid;gap:8px}.hh-ci-journey-pieces>div,.hh-ci-archive-stage{display:flex;justify-content:space-between;gap:10px;font-size:11px}.hh-ci-journey-pieces span,.hh-ci-archive-stage span{color:#b3cada}.hh-ci-rows-head{display:flex;align-items:baseline;flex-wrap:wrap;justify-content:space-between;gap:8px}.hh-ci-rows-head span{font-size:10px;color:#adc3d8}.hh-ci-archive-list{display:grid;gap:6px}.hh-ci-archive-pr{border:1px solid #365674;border-radius:9px;background:#101e31}.hh-ci-archive-pr summary{display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 8px;font-size:11px;flex-wrap:wrap}.hh-ci-pr-number{font-weight:800;color:#a6d5ff}.hh-ci-archive-pr summary strong{color:#71dfbb;font-size:14px}.hh-ci-archive-pr summary small{color:#b5cce1}.hh-ci-arrow{margin-left:auto}.hh-ci-archive-pr-detail{padding:8px 10px 12px;border-top:1px solid #35506b;display:grid;gap:7px}.hh-ci-archive-timestamps{display:grid;gap:5px}.hh-ci-archive-timestamps>div{display:flex;justify-content:space-between;flex-wrap:wrap;gap:7px;font-size:11px}.hh-ci-archive-timestamps span{color:#aec7dc}.hh-ci-central a{color:#94ceff;text-decoration:underline}.hh-ci-central-meta{display:grid;gap:5px;border-top:1px solid #344d67;margin-top:14px;padding-top:10px}';
   style.textContent+=
     '.hh-ci-wave-item{border:1px solid #365873;border-radius:8px;padding:8px;margin:6px 0}.hh-ci-wave-item p{margin:4px 0}.hh-ci-wave-item a{color:#94ceff;text-decoration:underline}'+
     '.hh-ci-stage-sample{font-size:10px;color:#93a9c4;font-weight:400}'+
     '.hh-ci-journey-total{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #365873;padding-top:9px;margin-top:10px;font-size:12px}'+
     '.hh-ci-journey-total b{color:#71dfbb}'+
     '.hh-ci-archive-more{margin-top:8px;border:1px solid #365873;border-radius:9px;padding:9px}'+
     '.hh-ci-archive-more>summary{cursor:pointer;color:#9ed3ff;font-size:12px;font-weight:700;padding:2px}'+
     '.hh-ci-archive-more>.hh-ci-archive-list{margin-top:8px}';
   document.head.append(style);
   active=period();void load(false);return true;
 }
 if(mount())return;
 const watch=new MutationObserver(()=>{if(mount())watch.disconnect();});
 watch.observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener('DOMContentLoaded',()=>{if(mount())watch.disconnect();},{once:true});
})();