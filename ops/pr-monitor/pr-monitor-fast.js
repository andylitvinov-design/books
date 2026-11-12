'use strict';
/* HH_PR_MONITOR_FAST_V1 — authentic charts, bounded read-only API calls.
 * No DOM watch loops, browser Github search, polling, DOM movers or paid agent.
 */
(function(env){
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 function normalizeActivity(d){
  if(d?.schema!=='HH_CI_RUNNER_BINS_V2'||d.pr?.schema!=='HH_PR_ACTIVITY_CONSISTENT_V1')throw Error('Неподтверждённая схема PR/CI');
  const rows=d.pr?.intervals?.hour,ci=d.counts?.hour;
  if(!Array.isArray(rows)||rows.length!==6||!rows.every(r=>Number.isFinite(Date.parse(r.start))&&valid(r.created)&&valid(r.merged)))throw Error('История PR неполная');
  const ciComplete=d.coverage?.counts_complete===true&&Array.isArray(ci)&&ci.length===6&&ci.every(valid);
  return {rows:rows.map((r,i)=>({start:r.start,created:r.created,merged:r.merged,ci:ciComplete?ci[i]:null})),
   created:valid(d.pr.recent?.created)?d.pr.recent.created:null,
   merged:valid(d.pr.recent?.merged)?d.pr.recent.merged:null,
   ci:ciComplete?ci[5]:null,partial:!ciComplete||d.pr.coverage?.complete!==true||d.pr.stale===true};
 }
 function normalizeLatency(d,hours){
  if(d?.schema!=='HH_PR_STAGE_TIMELINE_V2'||d.period_hours!==hours||!Array.isArray(d.buckets)||d.buckets.length!==6)throw Error('Неподтверждённая серия задержек');
  return d.buckets.map(b=>{
   const n=b?.total?.n,p50=b?.total?.median_minutes;
   if(!Number.isFinite(Date.parse(b.start))||!valid(b.count)||!valid(n)||n>b.count||
       (n>0&&!(typeof p50==='number'&&Number.isFinite(p50)&&p50>=0)))throw Error('Некорректное измерение');
   return {start:b.start,count:b.count,n,p50:n>0?p50:null};
  });
 }
 function fmtDelay(n){
  if(typeof n!=='number'||!Number.isFinite(n)||n<0)return '—';
  if(n<1)return Math.round(n*60)+' сек';
  if(n<60)return n.toLocaleString('ru-RU',{maximumFractionDigits:1})+' мин';
  return (n/60).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ч';
 }
 if(typeof module==='object'&&module.exports)module.exports={normalizeActivity,normalizeLatency,fmtDelay};
 if(!env?.document)return;
 const doc=env.document,ns='http://www.w3.org/2000/svg',get=id=>doc.getElementById(id);
 const createdColor='#9fd3ff',mergedColor='#71e5bb',ciColor='#ffcb85';
 let period=6,loading=false,journeyLoaded=false;
 function svgEl(tag,attrs,parent,txt){
  const e=doc.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs||{}))e.setAttribute(key,String(value));
  if(txt!==undefined)e.textContent=String(txt);
  if(parent)parent.appendChild(e);return e;
 }
 function setText(id,value){const e=get(id);if(e)e.textContent=String(value);}
 function base(svg){
  svg.replaceChildren();
  for(let i=0;i<=4;i++)svgEl('line',{x1:34,y1:146-i*27,x2:350,y2:146-i*27,stroke:'#33516a','stroke-dasharray':'2 5'},svg);
 }
 const clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',hour12:false});
 function hourLabel(value){return clock.format(new Date(value));}
 function line(svg,values,max,color){
  let d='',last=false;
  values.forEach((v,i)=>{
   if(typeof v!=='number'||!Number.isFinite(v)){last=false;return;}
   const x=41+i*59,y=146-v/max*108;
   d+=(last?' L':' M')+x.toFixed(1)+' '+y.toFixed(1);last=true;
  });
  if(d)svgEl('path',{d,fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'},svg);
  values.forEach((v,i)=>{if(typeof v==='number'&&Number.isFinite(v))svgEl('circle',{cx:41+i*59,cy:(146-v/max*108).toFixed(1),r:3,fill:color},svg);});
 }
 function drawActivity(data){
  const svg=get('activity-graph');base(svg);
  const a=[data.rows.map(x=>x.created),data.rows.map(x=>x.merged),data.rows.map(x=>x.ci)];
  const max=Math.max(1,...a.flat().filter(n=>typeof n==='number'&&Number.isFinite(n)));
  a.forEach((series,i)=>line(svg,series,max,[createdColor,mergedColor,ciColor][i]));
  data.rows.forEach((r,i)=>svgEl('text',{x:41+i*59,y:174,'text-anchor':'middle','font-size':10,fill:'#a7bfd3'},svg,hourLabel(r.start)));
  svgEl('text',{x:8,y:24,'font-size':10,fill:'#b8d1e3'},svg,String(max));
  setText('count-created',data.created===null?'—':data.created);
  setText('count-merged',data.merged===null?'—':data.merged);
  setText('count-ci',data.ci===null?'—':data.ci);
  setText('activity-note',(data.partial?'Частичное покрытие; неизвестное = —. ':'Данные проверены. ')+'CI = запуски workflow, не jobs.');
 }
 function drawLatency(rows){
  const svg=get('latency-graph');base(svg);
  const maxCount=Math.max(1,...rows.map(x=>x.count));
  const maxDelay=Math.max(1,...rows.map(x=>x.p50).filter(n=>typeof n==='number'));
  rows.forEach((r,i)=>{
   const h=r.count*104/maxCount;
   svgEl('rect',{x:41+i*59-9,y:146-h,width:18,height:h,rx:2,fill:mergedColor,opacity:'.84'},svg);
   svgEl('text',{x:41+i*59,y:174,'text-anchor':'middle','font-size':10,fill:'#a7bfd3'},svg,hourLabel(r.start));
  });
  line(svg,rows.map(x=>x.p50),maxDelay,createdColor);
  svgEl('text',{x:8,y:24,'font-size':10,fill:'#b8d1e3'},svg,String(maxCount));
  const covered=rows.filter(x=>x.n>0).length;
  setText('latency-note',covered+' из 6 интервалов с измеренным P50 · нет данных ≠ 0');
  const recent=[...rows].reverse().find(x=>x.n>0);
  setText('merge-p50',recent?fmtDelay(recent.p50):'—');
 }
 async function read(path,schema,timeoutMs=9000){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeoutMs);
  try{
   const r=await env.fetch(path,{signal:ac.signal,cache:'default',headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();
   if(data?.schema!==schema)throw Error('Схема данных не совпадает');
   return data;
  }finally{clearTimeout(timer);}
 }
 async function loadActivity(){
  try{drawActivity(normalizeActivity(await read('/api/ci-runner-trends','HH_CI_RUNNER_BINS_V2')));}
  catch(e){setText('activity-note','Данные PR/CI временно недоступны · нажмите «Обновить»');}
 }
 async function loadLatency(){
  const selected=period;
  try{const rows=normalizeLatency(await read('/api/pr-stage-timeline?hours='+selected,'HH_PR_STAGE_TIMELINE_V2'),selected);
   if(selected===period)drawLatency(rows);
  }catch(e){if(selected===period)setText('latency-note','Данные Merge временно недоступны · нажмите «Обновить»');}
 }
 async function loadAll(){
  if(loading)return;loading=true;get('refresh').disabled=true;
  setText('live-state','Обновляю два графика из существующих API…');
  await Promise.allSettled([loadActivity(),loadLatency()]);
  setText('live-state','Монитор доступен · неизвестные значения показаны как —');
  loading=false;get('refresh').disabled=false;
 }
 async function loadJourney(){
  if(journeyLoaded)return;journeyLoaded=true;const parent=get('journey-body');
  parent.textContent='Читаю подтверждённые этапы…';
  try{
   const data=await read('/api/pr-stage-overview?hours=24','HH_PR_STAGE_OVERVIEW_V1');
   const entries=[['Подготовка',data.stages?.prepare],['Ожидание runner',data.stages?.runner],['Core CI',data.stages?.ci],['Gate',data.stages?.gate],['Merge',data.stages?.merge]];
   const dl=doc.createElement('dl');
   for(const [label,row] of entries){const dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=row?.n>0?fmtDelay(row.median):'—';dl.append(dt,dd);}
   const dt=doc.createElement('dt'),dd=doc.createElement('dd');
   dt.textContent='Merge → LIVE';dd.textContent='Нужна отдельная LIVE-квитанция';dl.append(dt,dd);parent.replaceChildren(dl);
   const note=doc.createElement('p');note.textContent='Медианы только по проверенным этапам и когортам. Отсутствие данных не равно нулю.';parent.append(note);
  }catch(e){parent.textContent='Этапы временно недоступны. Воспользуйтесь полной диагностикой ниже.';journeyLoaded=false;}
 }
 doc.querySelectorAll('[data-hours]').forEach(button=>button.addEventListener('click',()=>{
  period=Number(button.dataset.hours);
  doc.querySelectorAll('[data-hours]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  setText('latency-note','Обновляю выбранный период…');void loadLatency();
 }));
 get('refresh').addEventListener('click',()=>{void loadAll();});
 get('journey').addEventListener('toggle',()=>{if(get('journey').open)void loadJourney();});
 void loadAll();
})(typeof window==='undefined'?null:window);
