'use strict';
/* HH_PR_JOURNEY_HEALTH_V1
 * Uses the existing cached created-cohort endpoint for exact Created→Merged
 * times. Detailed CI is user-triggered and remains an independently tagged
 * SAMPLE, never added to the complete-cohort mean.
 * No cron, GitHub token, background polling, or invented LIVE coverage.
 */
(function(){
 const HOURS=[1,6,12,24,48],PROD='codex/public-book-library';
 const stages=[
  ['ready','Ready','Нет общего журнала готовности по этой когорте'],
  ['triage','Triage','Есть stage receipts по PR, но нет полного агрегата'],
  ['claimed','Worker claim','Есть подтверждённые назначения, не полная история'],
  ['prepare','Создание → наблюдаемая очередь CI','Измерение только для PR с подтверждёнными CI-метками'],
  ['runner','Очередь → Runner','Подтверждены timestamps GitHub Actions jobs'],
  ['ci','Исполнение первой Core/Specialist CI','Верифицированная часть Actions jobs'],
  ['repair','Repair после ошибки','Нет полного журнала Repair с парой начало → публикация'],
  ['conflict','Конфликт → устранение','Метка конфликта не доказывает время ремонта'],
  ['retry_gap','Повторные CI','Не все повторные попытки привязаны к PR/HEAD'],
  ['gate','Проверки → Merge Gate','Только подтверждённые успешные required checks'],
  ['merge','Merge Gate → Merged','Только доказанный protected merge'],
  ['deployment_ready','Merged → Vercel READY','В cohort-источнике нет READY для каждого merge SHA'],
  ['live_verified','Vercel READY → подтверждение LIVE','LIVE-квитанции по PR есть, полного period-индекса нет'],
  ['created_to_live','Created → проверенный LIVE','Нельзя выводить без подтверждённой квитанции каждого PR']
 ];
 const ms=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null};
 const fmt=n=>n===null||!Number.isFinite(n)?'—':n<1?Math.round(n*60)+' сек':n<120?
  n.toLocaleString('ru-RU',{maximumFractionDigits:1})+' мин':
  (n/60).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ч';
 const quant=(numbers,p)=>{
  if(!numbers.length)return null;
  const a=numbers.slice().sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);
  return a[l]+(a[h]-a[l])*(i-l);
 };
 function calculate(snapshot,hours,scope){
  if(snapshot?.schema!=='HH_PR_CREATED_COHORT_V1'||!HOURS.includes(hours)||
    !['production','all'].includes(scope)||!Array.isArray(snapshot.rows))throw Error('INVALID_COHORT');
  const asof=ms(snapshot.generated_at),begin=asof-hours*3600000;
  if(asof===null)throw Error('INVALID_COHORT_TIMESTAMP');
  const created=snapshot.rows.filter(p=>{const t=ms(p.created_at);
    return t!==null&&t>=begin&&t<=asof&&(scope==='all'||p.base===PROD);});
  const merged=created.filter(p=>{const t=ms(p.merged_at);return t!==null&&t>=begin&&t<=asof;});
  const closedUnmerged=created.filter(p=>{const t=ms(p.closed_at);return ms(p.merged_at)===null&&t!==null&&t>=begin&&t<=asof;});
  const pending=created.filter(p=>!merged.includes(p)&&!closedUnmerged.includes(p));
  const times=merged.map(p=>(ms(p.merged_at)-ms(p.created_at))/60000).filter(v=>Number.isFinite(v)&&v>=0);
  const average=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;
  return {hours,scope,asof:snapshot.generated_at,start:new Date(begin).toISOString(),
   complete:snapshot.coverage?.complete===true,created:created.length,merged:merged.length,
   closedUnmerged:closedUnmerged.length,pending:pending.length,draft:pending.filter(p=>p.draft).length,
   mean:average,median:quant(times,.5),p50:quant(times,.5),p90:quant(times,.9),p95:quant(times,.95),
   coverage:{knownMergedDurations:times.length,mergedPopulation:merged.length,
    percent:merged.length?100*times.length/merged.length:null},
   merged_ids:merged.map(p=>p.number).sort((a,b)=>a-b),
   quantile_method:'LINEAR_INTERPOLATION',
   example:merged.slice().sort((a,b)=>(ms(b.merged_at)-ms(b.created_at))-(ms(a.merged_at)-ms(a.created_at)))
    .slice(0,5).map(p=>({number:p.number,minutes:(ms(p.merged_at)-ms(p.created_at))/60000})),
   cohortSource:snapshot.coverage};
 }
 function deepValues(deep,hours,scope){
  if(deep?.schema!=='HH_PR_STAGE_OVERVIEW_V1'||
   deep.selection?.hours!==hours||deep.selection?.scope!==scope)return null;
  return deep;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={calculate,deepValues,stages};
 if(typeof document==='undefined')return;
 let hours=24,scope='production',source=null,deep=null,busy=false;
 const box=document.createElement('section');box.className='hh-journey-health';box.id='hh-pr-journey-health';
 const h=document.createElement('h2');h.textContent='Полнота измерений: PR → LIVE';box.append(h);
 const intro=document.createElement('p');intro.className='hh-journey-muted';
 intro.textContent='Одна когорта created_at; время до merge — по всем смерженным PR. CI, Repair и LIVE — только по проверенным событиям.';box.append(intro);
 const controls=document.createElement('div');controls.className='hh-journey-controls';box.append(controls);
 const stat=document.createElement('div');stat.className='hh-journey-stats';box.append(stat);
 const info=document.createElement('p');info.className='hh-journey-muted';box.append(info);
 const table=document.createElement('div');table.className='hh-journey-grid';box.append(table);
 const actions=document.createElement('div');actions.className='hh-journey-actions';box.append(actions);
 const btn=document.createElement('button');btn.type='button';btn.textContent='Проверить детали CI выбранного периода';actions.append(btn);
 const prLink=document.createElement('a');prLink.href='/?pr=3301';prLink.textContent='Хронология отдельного PR';actions.append(prLink);
 const make=(tag,text,className)=>{const e=document.createElement(tag);e.textContent=text;if(className)e.className=className;return e};
 function place(){
  const main=document.querySelector('main');if(!main)return false;
  const anchor=main.querySelector('#pr-stage-panel')||main.querySelector('.pr5-v2');
  if(anchor&&anchor.nextElementSibling!==box)anchor.insertAdjacentElement('afterend',box);
  else if(!box.isConnected)main.append(box);
  return true;
 }
 function render(){
  controls.replaceChildren();
  for(const n of HOURS){const b=make('button',n+' ч');b.type='button';
   b.setAttribute('aria-pressed',String(n===hours));b.onclick=()=>{hours=n;deep=null;render();};
   controls.append(b);}
  const scopeBtn=make('button',scope==='production'?'Production PR':'Все PR');
  scopeBtn.type='button';scopeBtn.setAttribute('aria-label','Переключить ветки');
  scopeBtn.onclick=()=>{scope=scope==='production'?'all':'production';deep=null;render();};
  controls.append(scopeBtn);
  if(!source){info.textContent='Получаю существующий снимок PR...';return;}
  let s;try{s=calculate(source,hours,scope)}catch(e){info.textContent='Срез недоступен: '+e.message;return;}
  stat.replaceChildren();
  for(const [label,value] of [['Создано',s.created],['Merged',s.merged],['Без merge',s.closedUnmerged],
   ['Ещё не закрыто',s.pending],['Среднее Created→Merged',fmt(s.mean)],['P50',fmt(s.p50)],['P95',fmt(s.p95)],['Охват',s.coverage.knownMergedDurations+'/'+s.coverage.mergedPopulation]]){
   const card=make('div','', 'hh-journey-stat');card.append(make('small',label),make('strong',String(value)));stat.append(card);
  }
  const age=Math.max(0,Math.round((Date.now()-(ms(s.asof)||Date.now()))/60000));
  info.textContent=(s.complete?'Полная наблюдаемая когорта':'Неполная выборка PR')+
   ' · Снимок '+new Date(s.asof).toLocaleString('ru-RU',{timeZone:'America/Toronto'})+
   ' · '+age+' мин назад'+(age>75?' · УСТАРЕЛ':'')+
   '. Только '+s.merged+' смерженных PR входят в длительность Created→Merged.';
  table.replaceChildren();
  const heading=make('div','','hh-journey-head');heading.append(make('strong','Этап / контрольная точка'),
   make('strong','Реальное время / охват'));table.append(heading);
  const d=deepValues(deep,hours,scope),denom=d?.population?.merged;
  for(const [key,label,why] of stages){
   const row=make('div','','hh-journey-row');
   const left=make('div','');left.append(make('strong',label),make('small',why));
   const right=make('div','');
   const stats=d?.stages?.[key]||(key==='retry_gap'?d?.details?.retry_gap:null);
   if(stats&&stats.n>0){
    right.append(make('strong',fmt(stats.mean)),make('small','Выборка '+stats.n+'/'+(Number.isSafeInteger(denom)?denom:'?')+
     ' · P50 '+fmt(stats.p50??stats.median)+' · P95 '+fmt(stats.p95??null)+' · отдельные доказанные переходы'));
   }else{
    right.append(make('strong','— · не измерено'),make('small',d?'Нет проверенной пары событий':'Нужна подробная проверка'));
   }
   row.append(left,right);table.append(row);
  }
  if(d){
   const cv=d.coverage||{},identities=d.population?.pr_numbers;
   const samePopulation=Array.isArray(identities)&&
    identities.length===s.merged_ids.length&&
    identities.slice().sort((a,b)=>a-b).every((v,i)=>v===s.merged_ids[i]);
   info.textContent+=' Детали CI: '+(cv.selected??'?')+' выбранных PR из '+(cv.created??'?')+
    ', ошибок '+(cv.errors??'?')+', подтверждённых merge '+(cv.verified_merges??'?')+
    '. '+(samePopulation?'Состав PR совпадает, но время снимков может различаться; стадии нельзя складывать без проверки интервалов.':
     'ВНИМАНИЕ: состав детальной когорты не подтверждён по PR ID; средние этапов не складывать.');
  }
 }
 async function readCohort(){
  try{const r=await fetch('/api/pr-created-cohort',{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   source=await r.json();render();
  }catch(e){info.textContent='Нет достоверной когорты: '+String(e.message||e)+'. Данные не равны нулю.';}
 }
 btn.onclick=async()=>{
  if(busy)return;busy=true;btn.disabled=true;btn.textContent='Проверяю исходные события...';
  try{
   const res=await fetch('/api/pr-stage-overview?hours='+hours+'&scope='+scope,{cache:'no-store'});
   if(!res.ok)throw Error('CI HTTP '+res.status);
   const d=await res.json();if(!deepValues(d,hours,scope))throw Error('INVALID_CI_SNAPSHOT_SCOPE');
   deep=d;render();
  }catch(e){info.textContent+=' Подробный CI не получен: '+String(e.message||e)+
   '. Нет данных ≠ 0.';}
  finally{busy=false;btn.disabled=false;btn.textContent='Проверить детали CI выбранного периода';}
 };
 const boot=()=>{if(place()){render();void readCohort();return;}
   const observer=new MutationObserver(()=>{if(place()){observer.disconnect();render();void readCohort();}});
   observer.observe(document.documentElement,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
