'use strict';
/* HH_PR_DASHBOARD_ISOLATED_V1: verified read-only evidence, no timers, no DOM watchers */
(function(env){
const REPO='https://github.com/andylitvinov-design/books';
const URLS=Object.freeze({flow:'/api/ci-runner-trends',speed:'/api/pr-stage-timeline?hours=24',stages:'/api/pr-stage-overview',ci:'/api/ci-insights',queue:'/api/control-tower-stats',repair:'/api/pr-three-kpis'});
const SCHEMAS=Object.freeze({flow:'HH_CI_RUNNER_BINS_V2',speed:'HH_PR_STAGE_TIMELINE_V2',stages:'HH_PR_STAGE_OVERVIEW_V1',ci:'HH_CI_DEEP_MONITOR_V1',queue:'HH_CONTROL_DISPATCH_METRICS_V1',repair:'HH_PR_THREE_KPI_V1'});
const safeNum=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
const number=n=>safeInt(n)?n.toLocaleString('ru-RU'):'—';
const delay=n=>!safeNum(n)?'—':n<1?Math.round(n*60)+' сек':n<60?n.toLocaleString('ru-RU',{maximumFractionDigits:1})+' мин':(n/60).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ч';
const clampText=(v,n=120)=>String(v??'').slice(0,n);
const isTime=s=>Number.isFinite(Date.parse(s));
const stamp=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(d):'—';};
const hour=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',hour12:false}).format(d):'?';};
function activity(data){
 if(data?.schema!==SCHEMAS.flow||data.pr?.schema!=='HH_PR_ACTIVITY_CONSISTENT_V1')throw Error('ACTIVITY_SCHEMA');
 const rows=data.pr?.intervals?.hour;
 if(!Array.isArray(rows)||rows.length!==6||!rows.every(r=>isTime(r.start)&&safeInt(r.created)&&safeInt(r.merged)))throw Error('ACTIVITY_BINS');
 const ci=data.counts?.hour,validCI=data.coverage?.counts_complete===true&&Array.isArray(ci)&&ci.length===6&&ci.every(safeInt);
 return {rows:rows.map((r,i)=>({time:r.start,created:r.created,merged:r.merged,ci:validCI?ci[i]:null})),created:safeInt(data.pr.recent?.created)?data.pr.recent.created:null,merged:safeInt(data.pr.recent?.merged)?data.pr.recent.merged:null,ci:validCI?ci[5]:null,complete:validCI&&data.pr.coverage?.complete===true&&!data.pr.stale,sourceTime:data.generated_at};
}
function speed(data){
 if(data?.schema!==SCHEMAS.speed||data.period_hours!==24||!Array.isArray(data.buckets)||data.buckets.length!==6)throw Error('SPEED_SCHEMA');
 return data.buckets.map(r=>{const n=r.total?.n,m=r.total?.median_minutes;if(!isTime(r.start)||!safeInt(r.count)||!safeInt(n)||n>r.count||(n>0&&!safeNum(m)))throw Error('SPEED_BIN');return{time:r.start,count:r.count,n,median:n>0?m:null};});
}
function compactRecords(data){
 if(data?.schema!==SCHEMAS.queue)return[];
 const src=data.pr_timestamps?.records;if(typeof src!=='string'||src.length>750000)return[];
 let rows;try{rows=JSON.parse(src)}catch{return[];}if(!Array.isArray(rows))return[];
 return rows.filter(r=>Array.isArray(r)&&r.length>=16&&safeInt(r[0])&&typeof r[1]==='string'&&/^[0-9a-f]{40}$/i.test(r[1])&&safeInt(r[4]))
 .sort((a,b)=>b[4]-a[4]).slice(0,15).map(r=>({number:r[0],sha:r[1].slice(0,10),updated:r[4],prod:r[2]===1,ready:safeInt(r[7])&&r[7]>0,triage:safeInt(r[8])&&r[8]>0,claimed:safeInt(r[9])&&r[9]>0}));
}
const publicHelpers={activity,speed,compactRecords,delay,number,SCHEMAS,URLS};
if(typeof module==='object'&&module.exports)module.exports=publicHelpers;
if(!env?.document||typeof env.fetch!=='function')return;
const doc=env.document,el=id=>doc.getElementById(id);
const dom=(tag,cls,txt)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const svgNS='http://www.w3.org/2000/svg',colors=['#9bcfff','#78e3bd','#ffc681'];
const snapshots={};let refreshing=false;
function put(id,value){const e=el(id);if(e)e.textContent=String(value);}
function anchor(num,title){const a=dom('a',null,title||('#'+num));a.href=REPO+'/pull/'+num;a.target='_blank';a.rel='noopener noreferrer';return a;}
function sv(parent,tag,attrs={},txt){const e=doc.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=String(txt);if(parent)parent.appendChild(e);return e;}
function frame(svg,max){svg.replaceChildren();for(let i=0;i<=4;i++){const y=145-i*27;sv(svg,'line',{x1:32,y1:y,x2:350,y2:y,stroke:'#38516e','stroke-dasharray':'3 6'});}sv(svg,'text',{x:8,y:28,fill:'#b8cfe4','font-size':10},number(max));}
function plot(svg,values,max,color){let d='',joined=false;values.forEach((v,i)=>{if(!safeNum(v)){joined=false;return;}const x=44+i*58,y=145-v/max*108;d+=(joined?' L':' M')+x.toFixed(1)+' '+y.toFixed(1);joined=true;});if(d)sv(svg,'path',{d,fill:'none',stroke:color,'stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'});values.forEach((v,i)=>{if(safeNum(v))sv(svg,'circle',{cx:44+i*58,cy:(145-v/max*108).toFixed(1),r:3,fill:color});});}
function clear(e){e.replaceChildren();}
function td(row,text){const x=dom('td',null,text);row.appendChild(x);return x;}
function item(root,label,value,note,url){const line=dom('div','list-item'),a=dom('div'),labelEl=dom(url?'a':'span',null,clampText(label,115));if(url){labelEl.href=url;labelEl.target='_blank';labelEl.rel='noopener noreferrer';}a.append(labelEl);if(note)a.append(dom('small','muted',clampText(note,185)));line.append(a,dom('b',null,value));root.append(line);}
function drawFlow(d){const svg=el('chart-flow');const series=[d.rows.map(r=>r.created),d.rows.map(r=>r.merged),d.rows.map(r=>r.ci)];const prMax=Math.max(1,...series[0],...series[1]),ciMax=Math.max(1,...series[2].filter(safeNum));frame(svg,prMax);plot(svg,series[0],prMax,colors[0]);plot(svg,series[1],prMax,colors[1]);plot(svg,series[2],ciMax,colors[2]);if(d.ci!==null)sv(svg,'text',{x:350,y:28,fill:'#ffc681','font-size':10,'text-anchor':'end'},'CI '+number(ciMax));d.rows.forEach((r,i)=>sv(svg,'text',{x:44+i*58,y:168,fill:'#a6bdd4','font-size':10,'text-anchor':'middle'},hour(r.time)));put('flow-info',d.complete?'Серия подтверждена PR/CI источниками.':'Покрытие CI частичное; неизвестное = —.');put('k-created',number(d.created));put('k-merged',number(d.merged));put('k-ci',number(d.ci));}
function drawSpeed(d){const svg=el('chart-speed'),max=Math.max(1,...d.map(r=>r.count)),maxDelay=Math.max(1,...d.map(r=>r.median).filter(safeNum));frame(svg,max);d.forEach((r,i)=>{const h=107*r.count/max;sv(svg,'rect',{x:44+i*58-10,y:(145-h).toFixed(1),width:20,height:h.toFixed(1),rx:2,fill:colors[1],opacity:'.8'});sv(svg,'text',{x:44+i*58,y:168,fill:'#a6bdd4','font-size':10,'text-anchor':'middle'},hour(r.time));});plot(svg,d.map(r=>r.median),maxDelay,colors[0]);const measured=d.reduce((n,r)=>n+r.n,0);put('speed-info','Замерено '+number(measured)+' Merge; синяя линия = P50 по отдельной шкале минут.');}

function renderStages(d){
 if(d?.schema!==SCHEMAS.stages||!d.stages||!d.population)throw Error('STAGE_SCHEMA');
 put('k-open',number(d.population.open));put('k-median',d.population.full?.n>0?delay(d.population.full.median):'—');put('k-median-note',d.population.full?.n>0?'Выборка '+number(d.population.full.n)+' PR · 24 ч':'Нет проверенного интервала');put('stages-period','24 часа · '+stamp(d.generated_at));
 const labels=[['prepare','Подготовка / HEAD'],['runner','Ожидание runner'],['ci','Core / Specialist CI'],['gate','Merge Gate'],['merge','Green → Merge']];
 const tbody=el('stage-rows');clear(tbody);
 for(const [key,label]of labels){
  const s=d.stages[key],w=d.waiting?.[key],tr=dom('tr');td(tr,label);td(tr,number(s?.n));
  td(tr,s?.n>0?delay(s.median):'—');td(tr,s?.n>0?delay(s.p90):'—');
  const cell=td(tr,number(w?.n));if(Array.isArray(w?.examples)&&safeInt(w.examples[0])&&w.examples[0]>0){cell.append(' · ');cell.append(anchor(w.examples[0]));}tbody.append(tr);
 }
 const names=[['core_queue','Core Queue'],['specialist_queue','Specialist Queue'],['preflight','Preflight'],['core_jobs','Core Jobs'],['specialist_jobs','Specialist Jobs'],['retry_gap','Retry Gap'],['gate_queue','Gate Queue'],['gate_job','Gate Job']];
 const detail=el('stage-detail');clear(detail);
 for(const [key,name]of names){const entry=dom('article');entry.append(dom('span',null,name),dom('b',null,d.details?.[key]?.n>0?delay(d.details[key].median):'—'));detail.append(entry);}
 snapshots.stages=d;updateRecommendations();
}
function renderCI(d){
 if(d?.schema!==SCHEMAS.ci)throw Error('CI_SCHEMA');
 const coverage=d.coverage||{};put('ci-coverage',coverage.complete===true?'Полная проверка':'Выборка, не все jobs');
 put('k-ci-jobs',number(coverage.measured_jobs));put('k-ci-fails',number(coverage.failed_jobs));
 const queue=[...(d.wait_checks||[]),...(d.merge_checks||[])].filter(x=>safeNum(x.queue_p50));
 put('k-runner',queue.length?delay(queue[0].queue_p50):'—');
 const errors=el('ci-errors');clear(errors);
 const hits=Array.isArray(d.errors)?d.errors.filter(x=>safeNum(x.failures)&&x.failures>0).sort((a,b)=>b.failures-a.failures).slice(0,9):[];
 if(!hits.length)errors.append(dom('p','empty','В измеренной выборке ошибок не выявлено. Это не утверждение обо всех jobs.'));
 for(const entry of hits){const n=entry.examples?.find(e=>Array.isArray(e?.pr)&&safeInt(e.pr[0]))?.pr[0];item(errors,entry.title||entry.key,number(entry.failures),'Ошибка в выборке'+(n?' · PR #'+n:''),n?REPO+'/pull/'+n:null);}
 const checks=el('ci-checks');clear(checks);const seen=new Set();let count=0;
 for(const row of [...(d.wait_checks||[]),...(d.merge_checks||[])]){
  if(!row?.name||seen.has(row.name)||count>=9)continue;seen.add(row.name);count++;
  const label=row.name.includes(' / ')?row.name.split(' / ').slice(-1)[0]:row.name;
  const info=number(row.n)+' jobs · '+number(row.failed)+' ошибок';
  const value='P50 '+(safeNum(row.run_p50)?delay(row.run_p50):'—');
  item(checks,label,value,info,row.url?.startsWith('https://github.com/')?row.url:null);
 }
 if(!count)checks.append(dom('p','empty','Недостаточно проверенных job событий.'));
 snapshots.ci=d;updateRecommendations();
}
function renderQueue(d){
 if(d?.schema!==SCHEMAS.queue)throw Error('QUEUE_SCHEMA');
 const counts=d.counts||{};put('k-actionable',number(counts.actionable_prs));put('k-blocked',number(counts.blocked_total));
 put('k-worker',number(counts.worker_dispatches));put('k-production',number(counts.production_prs));
 put('queue-asof',d.checked_at?'Срез: '+stamp(d.checked_at):'Время среза неизвестно');
 const root=el('queue-states');clear(root);
 const aliases={awaiting_core:'Ожидает Core',core_workflow_queued:'Core в очереди',core_runner_running:'Core выполняется',parent_blocked:'Блокировка базового PR',source_proof_missing:'Нет source proof',conflict_unverified:'Конфликт не проверен',manual_conflict_handoffs:'Ручная передача конфликта',already_handled:'Уже обработано',wake_undelivered:'Wake не доставлен'};
 const list=Object.entries(d.queue_states||{}).filter(([,n])=>safeInt(n)&&n>0).sort((a,b)=>b[1]-a[1]).slice(0,11);
 if(!list.length)root.append(dom('p','empty','Причины ожидания не классифицированы в текущем срезе.'));
 for(const [key,n]of list)item(root,aliases[key]||key,number(n));
 const block=el('blocked-reasons');clear(block);
 const reasons=Object.entries(d.blocked_examples||{}).filter(([,a])=>Array.isArray(a)&&a.length).sort((a,b)=>b[1].length-a[1].length).slice(0,9);
 if(!reasons.length)block.append(dom('p','empty','Нет проверенных примеров блокировок.'));
 for(const [key,rows]of reasons){const pr=rows.find(x=>safeInt(x.pr_number))?.pr_number;item(block,key.replace(/_/g,' '),number(rows.length),pr?'Пример PR #'+pr:null,pr?REPO+'/pull/'+pr:null);}
 const table=el('pr-rows');clear(table);
 const records=compactRecords(d);if(!records.length){const tr=dom('tr');td(tr,'Реестр недоступен');td(tr,'—');td(tr,'—');td(tr,'—');table.append(tr);}
 for(const r of records){
  const tr=dom('tr'),cell=td(tr,'');cell.append(anchor(r.number));td(tr,stamp(r.updated*1000));td(tr,r.sha);
  const tags=[];if(r.prod)tags.push('production');if(r.triage)tags.push('triage отметка');if(r.claimed)tags.push('worker claim');if(r.ready)tags.push('ready отметка');
  td(tr,tags.join(' · ')||'metadata');table.append(tr);
 }
 snapshots.queue=d;updateRecommendations();
}
function renderRepair(d){
 if(d?.schema!==SCHEMAS.repair)throw Error('REPAIR_SCHEMA');
 const r=d.windows?.last_24h;if(!r)throw Error('REPAIR_WINDOW');
 const err=r.error_to_repair,first=r.ci_first_pass,green=r.green_to_merge;
 put('k-repair',err?.n>0?delay(err.median_min):'—');
 put('k-firstpass',safeNum(first?.percent_observed)?first.percent_observed.toLocaleString('ru-RU',{maximumFractionDigits:1})+'%':'—');
 put('k-greenmerge',green?.n>0?delay(green.median_min):'—');put('k-green-n',number(green?.n));
 put('repair-explanation','Ошибка → Repair: n='+number(err?.n)+'. Первая наблюдаемая CI: '+number(first?.measured)+' запусков, история неполная. Green → Merge: n='+number(green?.n)+' — только проверенный HEAD.');
 const root=el('repair-examples');clear(root);
 const rows=Array.isArray(green?.rows)?green.rows.slice(0,8):[];
 if(!rows.length)root.append(dom('p','empty','Недостаточно подтверждённых переходов.'));
 for(const x of rows){const n=x.pr;if(safeInt(n)&&n>0)item(root,'PR #'+n,delay(x.minutes),x.merge_proof||'Подтверждение GitHub',REPO+'/pull/'+n);}
 snapshots.repair=d;updateRecommendations();
}
function updateRecommendations(){
 const root=el('recommendations');clear(root);const list=[],stage=snapshots.stages,ci=snapshots.ci,queue=snapshots.queue,repair=snapshots.repair;
 if(stage){for(const [key,label]of [['prepare','Подготовка'],['runner','Runner'],['ci','CI'],['gate','Gate'],['merge','Merge']]){const w=stage.waiting?.[key];if(w?.n>0){const n=w.examples?.find(safeInt);list.push([label+': ожидают '+number(w.n)+' PR',n?'Пример PR #'+n:'Проверить события в GitHub',n?REPO+'/pull/'+n:null]);}}}
 if(queue?.counts?.blocked_total>0)list.push(['Есть блокировки: '+number(queue.counts.blocked_total),'Разобрать подтверждённые причины в разделе «Очередь».',queue.run_url?.startsWith('https://github.com/')?queue.run_url:null]);
 if(ci?.coverage?.complete===false)list.push(['CI мониторинг охватывает выборку','Не делать вывод обо всех PR по ограниченной выборке jobs.',REPO+'/actions']);
 if(repair?.windows?.last_24h?.error_to_repair?.history_complete===false)list.push(['Ошибка → Repair не измерена полностью','Не выдавать неизвестные границы исправления за ноль минут.',null]);
 if(!list.length)list.push(['Жду проверенных событий','Обновить данные и отдельно подтвердить production LIVE.',REPO+'/pulls']);
 for(const [title,note,url]of list.slice(0,8))item(root,title,'',note,url);
}
function fetchSafe(path,schema,timeoutMs=8500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 return env.fetch(path,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})
 .then(async response=>{if(!response.ok)throw Error('HTTP_'+response.status);const value=await response.json();if(value?.schema!==schema)throw Error('BAD_SCHEMA');return value;})
 .finally(()=>clearTimeout(timer));
}
async function refresh(){
 if(refreshing)return;refreshing=true;el('refresh').disabled=true;
 put('status','Обновляю проверенные данные PR Monitor…');el('state-dot').className='status-dot';
 let complete=0,errors=0,latest=null;
 const tasks=[['flow',d=>drawFlow(activity(d))],['speed',d=>drawSpeed(speed(d))],['stages',renderStages],['ci',renderCI],['queue',renderQueue],['repair',renderRepair]];
 const result=await Promise.allSettled(tasks.map(async([key,fn])=>{
  const data=await fetchSafe(URLS[key],SCHEMAS[key],key==='ci'?11000:8500);fn(data);
  if(isTime(data.generated_at))latest=data.generated_at;complete++;
 }));
 for(let i=0;i<result.length;i++){if(result[i].status==='rejected'){errors++;const key=tasks[i][0];if(key==='flow')put('flow-info','Сейчас нет ответа данных PR/CI — нажмите «Обновить».');if(key==='speed')put('speed-info','Нет данных Merge — нажмите «Обновить».');if(key==='ci')put('ci-coverage','CI источник недоступен');}}
 put('status',errors?'Доступно '+complete+' из 6 источников. '+errors+' недоступны. Страница остаётся рабочей.':'Все 6 источников доступны. Данные обновлены.');
 if(latest)put('updated-at','Торонто: '+stamp(latest));
 el('state-dot').className='status-dot '+(complete>=4?'good':complete===0?'bad':'');
 el('refresh').disabled=false;refreshing=false;updateRecommendations();
}
el('refresh').addEventListener('click',()=>{void refresh();});
void refresh();
})(typeof window==='undefined'?null:window);
