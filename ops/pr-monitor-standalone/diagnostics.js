
'use strict';
(() => {
 const HOUR=3600000,MIN10=600000,ZONE='America/Toronto';
 const DOC='https://docs.google.com/document/d/1IsXRcjNoaifzwVFLW8Xv8KLI1xGTnynrmKBKGAHa8wg/edit';
 const SHEET='https://docs.google.com/spreadsheets/d/1D2SG8fRtN5hK6hyHZcOGafmD23WHyjsmaUN-vo48EoY/edit';
 const mount=document.getElementById('diagnostics-mount');
 if(!mount)return;
 const panel=document.createElement('section');
 panel.id='pr-blockers';panel.className='diagnostics-panel';
 panel.setAttribute('aria-label','Причины задержки PR по периодам');
 panel.innerHTML='<div class="diagnostics-heading"><div><h2>Что тормозит Merge</h2><p>Причины, проверки и следующие действия</p></div><a href="'+DOC+'" target="_blank" rel="noopener noreferrer">Журнал ↗</a></div>'+
 '<div class="diagnostics-period"><strong id="blocker-period">Загрузка периода…</strong><span id="blocker-fresh">Проверяю</span></div>'+
 '<div id="blocker-fallback" class="diagnostics-fallback" role="group" aria-label="Выбрать один из шести периодов" hidden></div>'+
 '<div class="diagnostics-kpis"><div><label>Затронуто PR</label><strong id="blocker-pr">—</strong><small>из проверенной выборки</small></div><div><label>CI ожидает</label><strong id="blocker-queued">—</strong><small>на момент замера</small></div><div><label>CI выполняется</label><strong id="blocker-running">—</strong><small>на момент замера</small></div></div>'+
 '<div class="diagnostics-title">Ключевые проблемы <span>от самых сильных</span></div><div class="diagnostics-list" id="blocker-list" aria-live="polite"></div>'+
 '<button type="button" id="blocker-more" class="diagnostics-more" hidden>Показать все</button>'+
 '<div class="diagnostics-title">Дорогие проверки CI <span>runner-min · частичная выборка</span></div><div class="diagnostics-jobs" id="blocker-jobs"></div>'+
 '<p class="diagnostics-foot" id="blocker-foot">Загрузка источников…</p>';
 mount.append(panel);
 const $=id=>document.getElementById(id);
 const stamp=new Intl.DateTimeFormat('ru-RU',{timeZone:ZONE,hour:'2-digit',minute:'2-digit',hour12:false});
 const zoneFmt=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,timeZoneName:'short'});
 const fmt=t=>stamp.format(new Date(t)).replace(/^24:/,'00:');
 const tz=t=>zoneFmt.formatToParts(new Date(t)).find(x=>x.type==='timeZoneName')?.value||'Toronto';
 const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(v):'—';
 const n=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el};
 const goodUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['github.com','docs.google.com'].includes(x.hostname)?x.href:null}catch{return null}};
 const addLink=(label,u)=>{const href=goodUrl(u);if(!href)return null;const a=n('a',null,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
 let archive=null,live=null,expanded=new Set(),showAll=false,lastSelection='',loaded=false,fallbackIndex=5,savedPeriods=[],periodResults=new Map(),periodInflight=new Set(),periodFailed=new Map();
 try {const raw=JSON.parse(localStorage.getItem('hh-pr-blocker-hourly-v1')||'[]');if(Array.isArray(raw))savedPeriods=raw.filter(p=>p&&Number.isFinite(Date.parse(p.start))&&Number.isFinite(Date.parse(p.observed_at))).slice(-168)}catch{}
 function graphState(){
  const trend=document.getElementById('hh-pr-trends');
  const ten=!!trend?.classList.contains('hh-ten-active');
  const unit=ten?MIN10:HOUR;
  const container=document.getElementById(ten?'hh-ten-periods':'hh-trends-periods');
  const buttons=[...(container?.querySelectorAll('.hh-period')||[])];
  const position=buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true');
  const idx=position<0?5:position;
  const active=buttons[idx];
  const utc=Number(active?.dataset.start);
  const aligned=Number.isSafeInteger(utc)&&utc>0&&utc%unit===0;
  const start=aligned?utc:Math.floor(Date.now()/unit)*unit-(5-idx)*unit;
  return{start,unit,index:idx,hasGraph:buttons.length===6};
 }
 function histPeriod(hour){return archive?.periods?.find(x=>Date.parse(x.start)===hour)||null}
 function livePeriod(hour){
  const currentHour=Math.floor(Date.now()/HOUR)*HOUR;
  const remote=live?.periods?.find(x=>Date.parse(x.start)===hour)||null;
  const stored=savedPeriods.find(x=>Date.parse(x.start)===hour)||null;
  if(hour===currentHour)return remote||stored;
  if(stored&&(!remote?.observed_at||Date.parse(stored.observed_at)>=Date.parse(remote.observed_at)))return stored;
  return remote||stored;
 }
 function sources(hour){
  const past=histPeriod(hour),incoming=livePeriod(hour),queried=periodResults.get(hour)||null;
  const isCurrent=hour===Math.floor(Date.now()/HOUR)*HOUR;
  const combined=[];
  if(incoming?.blockers?.length)combined.push(...incoming.blockers.map(b=>({...b,origin:isCurrent?'GitHub':'История GitHub',old:!isCurrent,observed_at:incoming.observed_at})));
  if(queried?.blockers)combined.push(...queried.blockers.map(b=>({...b,origin:'GitHub за час',old:true,observed_at:queried.observed_at})));
  if(past?.blockers)combined.push(...past.blockers.map(b=>({...b,origin:'Журнал',old:true,observed_at:past.observed_at})));
  const seen=new Set();
  const blockers=combined.filter(b=>{
    const key=b.type+'|'+((b.prs||[]).length?(b.prs||[]).join(','):b.label||b.id);
    if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>(b.priority||0)-(a.priority||0));
  const jobs=isCurrent&&incoming?.jobs?.length?incoming.jobs:queried?.jobs?.length?queried.jobs:incoming?.jobs?.length?incoming.jobs:past?.jobs?.length?past.jobs:[];
  return{past,incoming,queried,isCurrent,blockers,jobs};
 }
 function row(b,i){
  const article=n('article','diagnostics-item'),button=n('button','diagnostics-toggle');
  button.type='button';button.setAttribute('aria-expanded',String(expanded.has(b.id)));
  const rank=n('span','diagnostics-rank',String(i+1)),main=n('span','diagnostics-name');
  main.append(n('span',null,b.label||'Проблема'));
  const sub=n('small','diagnostics-caption');
  sub.append(n('span','diagnostics-confidence',b.confidence||'UNKNOWN'));
  sub.firstChild.dataset.value=b.confidence||'UNKNOWN';
  sub.append(n('span',null,' · '+b.origin+(b.old?' · исторический HEAD':'')));
  main.append(sub);
  const impact=n('span','diagnostics-impact',b.prs?.length?b.prs.length+' PR':'охват —');
  button.append(rank,main,impact,n('span','diagnostics-chevron',expanded.has(b.id)?'⌃':'⌄'));
  article.append(button);
  button.addEventListener('click',()=>{expanded.has(b.id)?expanded.delete(b.id):expanded.add(b.id);render()});
  if(expanded.has(b.id)){
   const d=n('div','diagnostics-detail');
   d.append(n('p',null,b.reason||'Точная причина пока не определена.'));
   if(b.head_sha)d.append(n('p',null,'HEAD: '+b.head_sha.slice(0,12)+' (только на дату среза)'));
   if(b.observed_at)d.append(n('p',null,'Замер: '+fmt(Date.parse(b.observed_at))+' '+tz(Date.parse(b.observed_at))));
   d.append(n('p',null,'Ответственный: '+(b.owner||'не назначен')));
   d.append(n('p',null,'Следующее действие: '+(b.next_action||'Проверить exact-HEAD CI.')));
   d.append(n('p',null,'Закрыть проблему после: '+(b.cleared_if||'проверенных фактических изменений.')));
   const links=n('div','diagnostics-link-row');
   for(const pr of b.prs||[]){const a=addLink('#'+pr,'https://github.com/andylitvinov-design/books/pull/'+pr);if(a)links.append(a)}
   for(const [k,url] of (b.evidence||[]).entries()){const a=addLink('Проверка '+(k+1),url);if(a)links.append(a)}
   if(links.children.length)d.append(links);
   article.append(d);
  }
  return article;
 }
 function fallbackControls(gs){
  const el=$('blocker-fallback');el.hidden=gs.hasGraph;
  if(gs.hasGraph)return;
  el.replaceChildren();
  for(let i=0;i<6;i++){
   const b=n('button',null,fmt(Math.floor(Date.now()/HOUR)*HOUR-(5-i)*HOUR).slice(0,2));
   b.type='button';b.setAttribute('aria-pressed',String(i===gs.index));
   b.addEventListener('click',()=>{fallbackIndex=i;render();});
   el.append(b);
  }
 }
 function render(fallbackIndex){
  const gs=graphState();
  if(!gs.hasGraph&&Number.isInteger(fallbackIndex))gs.index=fallbackIndex;
  if(!gs.hasGraph){gs.unit=HOUR;gs.start=Math.floor(Date.now()/HOUR)*HOUR-(5-gs.index)*HOUR;}
  const id=gs.start+'|'+gs.unit,changed=lastSelection!==id;
  if(changed){lastSelection=id;expanded.clear();showAll=false}
  fallbackControls(gs);
  const hour=Math.floor(gs.start/HOUR)*HOUR,s=sources(hour);
  $('blocker-period').textContent=fmt(gs.start)+'–'+fmt(gs.start+gs.unit)+' '+tz(gs.start)+(gs.unit===MIN10?' · часовая диагностика':'');
  const reference=s.isCurrent&&s.incoming?.observed_at?s.incoming.observed_at:s.past?.observed_at||s.queried?.observed_at||s.incoming?.observed_at;
  const age=reference?Math.max(0,Date.now()-Date.parse(reference))/60000:Infinity;
  $('blocker-fresh').textContent=!reference?'нет замера':s.isCurrent?(age<=15?'сейчас':age<=75?'задержка':'устарел'):'история';
  const unique=new Set(s.blockers.flatMap(x=>x.prs||[]));
  $('blocker-pr').textContent=unique.size?num(unique.size):'—';
  const measurement=s.incoming&&(s.incoming.queued!==null||s.incoming.running!==null)?s.incoming:s.past||s.queried||s.incoming;
  $('blocker-queued').textContent=num(measurement?.queued);
  $('blocker-running').textContent=num(measurement?.running);
  const list=$('blocker-list');list.replaceChildren();
  if(s.blockers.length)for(const [i,b] of s.blockers.slice(0,showAll?s.blockers.length:3).entries())list.append(row(b,i));
  else list.append(n('p','diagnostics-empty',loaded?'Для периода нет подтверждённых блокеров. Пропуск данных ≠ нулевая задержка.':'Загружаю сведения о проверках…'));
  $('blocker-more').hidden=s.blockers.length<=3;
  $('blocker-more').textContent=showAll?'Скрыть дополнительные':'Показать все ('+s.blockers.length+')';
  const jobs=$('blocker-jobs');jobs.replaceChildren();
  if(s.jobs?.length)for(const j of s.jobs.slice().sort((a,b)=>(b.runner_minutes||0)-(a.runner_minutes||0)).slice(0,5)){
    const item=n('div','diagnostics-job'),left=n('div'),right=n('span',null,num(j.runner_minutes)+' мин');
    left.append(addLink(j.name,j.url)||n('span',null,j.name||'Workflow job'));
    left.append(n('small',null,'Ожидание p50/p95 '+num(j.queue_p50??j.queue_minutes)+' / '+num(j.queue_p95??j.queue_minutes)+' мин · n='+num(j.n)));
    right.append(n('small',null,'runtime p50 '+num(j.run_p50??j.run_minutes)+' мин'));
    item.append(left,right);jobs.append(item);
  }else jobs.append(n('p','diagnostics-empty','Нет полной выборки дорогих jobs для выбранного периода.'));
  const foot=$('blocker-foot');foot.textContent=([s.past?.coverage,s.queried?.coverage,s.incoming?.coverage].filter(Boolean).join(' · ')||'Измерения за этот час отсутствуют')+
    ' · Неизвестные значения не заменяются нулём. '+(s.isCurrent&&age>75?'Исторические ошибки необходимо подтвердить на актуальном HEAD. ':'');
  const a=addLink('Реестр root×PR',SHEET);if(a){foot.append(n('span',null,' '),a);}
  if(!s.isCurrent)void loadHour(hour);
 }
 function refresh(){render();}
 document.addEventListener('click',e=>{if(e.target.closest('#hh-trends-periods .hh-period,#hh-ten-periods .hh-period,#hh-granularity-switch button'))setTimeout(refresh,0);});
 $('blocker-more').addEventListener('click',()=>{showAll=!showAll;render()});
 const observer=new MutationObserver(()=>{if(!document.hidden)render()});
 const graphArea=document.querySelector('.throughput');
 if(graphArea)observer.observe(graphArea.parentNode,{childList:true});
 const trendRoot=document.getElementById('hh-pr-trends');
 if(trendRoot)observer.observe(trendRoot,{attributes:true,attributeFilter:['class']});
 const hourBtns=document.getElementById('hh-trends-periods');
 if(hourBtns)observer.observe(hourBtns,{childList:true});
 const tenBtns=document.getElementById('hh-ten-periods');
 if(tenBtns)observer.observe(tenBtns,{childList:true});
 async function json(path){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(path,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
  finally{clearTimeout(timeout)}
 }
 async function loadHour(hour){
  if(periodResults.has(hour)||periodInflight.has(hour)||(periodFailed.get(hour)||0)>Date.now())return;
  periodInflight.add(hour);
  try{
    const data=await json('/api/blocker-period?hour='+encodeURIComponent(new Date(hour).toISOString()));
    if(data?.schema==='HH_PR_BLOCKER_HOUR_V1'&&Date.parse(data.start)===hour){
      periodResults.set(hour,data);render();
    }else periodFailed.set(hour,Date.now()+300000);
  }catch{periodFailed.set(hour,Date.now()+300000)}
  finally{periodInflight.delete(hour)}
 }
 async function load(){
  const [one,two]=await Promise.allSettled([json('/blocker-history.json'),json('/api/blockers')]);
  if(one.status==='fulfilled'&&['HH_PR_BLOCKER_HISTORY_V1','HH_PR_BLOCKER_PERIOD_V1'].includes(one.value.schema))archive=one.value;
  if(two.status==='fulfilled'&&two.value.schema==='HH_PR_BLOCKER_LIVE_V1'){
   live=two.value;
   const latest=live.periods?.at(-1);
   if(latest&&latest.observed_at){
    const snapshot=new Map(savedPeriods.map(p=>[p.start,p]));
    snapshot.set(latest.start,{...latest,coverage:(latest.coverage||'')+' · сохранено в браузере'});
    savedPeriods=[...snapshot.values()].sort((a,b)=>a.start.localeCompare(b.start)).slice(-168);
    try{localStorage.setItem('hh-pr-blocker-hourly-v1',JSON.stringify(savedPeriods))}catch{}
   }
   try{localStorage.setItem('hh-pr-blocker-last-v1',JSON.stringify({at:Date.now(),payload:live}))}catch{}
  }
  else if(!live){try{const c=JSON.parse(localStorage.getItem('hh-pr-blocker-last-v1')||'null');if(c?.payload?.schema==='HH_PR_BLOCKER_LIVE_V1')live=c.payload}catch{}}
  loaded=true;render();
 }
 render();void load();
 $('refresh')?.addEventListener('click',()=>void load());
 setInterval(()=>{if(document.hidden)return;void load()},30*60000);
})();
