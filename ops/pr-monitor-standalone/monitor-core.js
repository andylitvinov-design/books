
'use strict';
(() => {
  // HH_PR_HOURLY_METRICS_V1: use existing CI Triage hourly snapshots; no new workflow.
  const REPO = 'andylitvinov-design/books';
  const BASE = 'codex/public-book-library';
  const API = 'https://api.github.com';
  const COMMENT = 6532482940;
  const TIMEZONE = 'America/Toronto';
  const STORAGE = 'hh-pr-control-tower-v1-' + REPO;
  const PULSE_MS = 10 * 60000;
  const FULL_MS = 60 * 60000;
  const FORMAT_NUM = new Intl.NumberFormat('ru-RU');
  const FORMAT_CLOCK = new Intl.DateTimeFormat('ru-RU', {timeZone:TIMEZONE,hour:'2-digit',minute:'2-digit',hour12:false});
  const FORMAT_DAY = new Intl.DateTimeFormat('ru-RU', {timeZone:TIMEZONE,weekday:'long',day:'numeric',month:'long'});
  const FORMAT_DAY_KEY = new Intl.DateTimeFormat('en-CA', {timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'});
  const $ = (id) => document.getElementById(id);
  const num = (x) => Number.isSafeInteger(x) && x >= 0 ? x : null;
  const text = (x) => x == null ? '—' : FORMAT_NUM.format(x);
  const validDate = (x) => {const d=new Date(x);return Number.isFinite(d.valueOf())?d:null};
  const age = (x) => {const d=validDate(x);return d?Math.max(0,Date.now()-d.valueOf())/60000:Infinity};
  const hourKey = (date) => new Date(Math.floor(date.valueOf()/3600000)*3600000).toISOString();
  const htmlEscape = (s) => String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const state = {counts:{},run:{},queue:null,remote:[],local:[],fullAt:null,pulseAt:null,errors:[],loading:false,range:(window.innerWidth<680?6:12)};
  let lastFullRequest=0,lastPulseRequest=0;
  const isSnapshot = (s) => s && typeof s==='object' && validDate(s.hour_utc) && validDate(s.captured_at) && (num(s.open_total)!==null||num(s.running_runs)!==null);
  try {const saved=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(saved))state.local=saved.filter(isSnapshot).slice(-168)} catch {}
  function writeStorage(){try{localStorage.setItem(STORAGE,JSON.stringify(state.local.slice(-168)))}catch{}}
  async function github(path){
    const res=await fetch(API+path,{cache:'no-store'}); // Plain GET: GitHub CORS permits browsers without a custom API-version preflight.
    if(!res.ok){const reset=res.headers.get('x-ratelimit-reset');const date=reset?new Date(Number(reset)*1000):null;const hint=res.status===403&&date&&validDate(date)?' · лимит до '+FORMAT_CLOCK.format(date):'';throw Error('GitHub API '+res.status+hint)}
    return res.json();
  }
  async function count(query){
    const data=await github('/search/issues?q='+encodeURIComponent('repo:'+REPO+' is:pr '+query)+'&per_page=1');
    if(data.incomplete_results||num(data.total_count)==null)throw Error('Неполный поиск: '+query);
    return data.total_count;
  }
  function parseQueue(body){
    for(const m of String(body||'').matchAll(/```json\s*([\s\S]*?)```/g)){
      try{const json=JSON.parse(m[1]);if(json.schema==='HH_READY_MERGE_QUEUE_V2')return json}catch{}
    }
    return null;
  }
  function pullNumbers(runs){
    const found=new Set();
    for(const run of runs||[])for(const pr of run.pull_requests||[]){if(Number.isInteger(pr.number)&&(!pr.base?.ref||pr.base.ref===BASE))found.add(pr.number)}
    return [...found];
  }
  async function pulse(){
    lastPulseRequest=Date.now();
    const results=await Promise.allSettled([
      github('/repos/'+REPO+'/actions/runs?status=in_progress&per_page=100'),
      github('/repos/'+REPO+'/actions/runs?status=queued&per_page=1')
    ]);
    const errors=[];
    if(results[0].status==='fulfilled'){
      const r=results[0].value;state.run.running=num(r.total_count);state.run.ciPrNumbers=pullNumbers(r.workflow_runs);
      state.run.ciCoverage=(r.workflow_runs||[]).length>=(state.run.running??Infinity);
    }else{state.run.running=null;state.run.ciPrNumbers=[];errors.push(String(results[0].reason?.message||results[0].reason))}
    if(results[1].status==='fulfilled')state.run.queued=num(results[1].value.total_count);
    else{state.run.queued=null;errors.push(String(results[1].reason?.message||results[1].reason))}
    state.pulseAt=new Date().toISOString();state.errors=errors;
    saveLocal(false);render();
  }
  async function full(){
    if(state.loading)return;
    state.loading=true;lastFullRequest=Date.now();$('refresh').disabled=true;$('refresh').textContent='Обновляю…';
    const since=new Date(Date.now()-3600000).toISOString().replace(/\.\d{3}Z$/,'Z');
    const requests={
      open:count('is:open'),prod:count('is:open base:'+BASE),draft:count('is:open draft:true base:'+BASE),
      created:count('created:>='+since),merged:count('merged:>='+since),
      queue:github('/repos/'+REPO+'/issues/comments/'+COMMENT)
    };
    const keys=Object.keys(requests),out=await Promise.allSettled(Object.values(requests));const errors=[];
    out.forEach((v,i)=>{
      const key=keys[i];
      if(v.status==='fulfilled'){
        if(key==='queue'){
          const q=parseQueue(v.value.body);
          if(q){state.queue=q;const h=q.hourly_metrics_v1;const rows=Array.isArray(h)?h:(h?.schema==='HH_PR_HOURLY_METRICS_V1'&&Array.isArray(h.snapshots)?h.snapshots:[]);state.remote=rows.filter(s=>isSnapshot(s)&&(s.schema===undefined||s.schema==='HH_PR_HOURLY_METRICS_V1')).map(s=>({...s,hour_utc:hourKey(new Date(s.hour_utc))})).slice(-168)}
          else errors.push('Формат часовой очереди пока отсутствует');
        }else state.counts[key]=v.value;
      }else {if(key!=='queue')state.counts[key]=null;errors.push(key+': '+String(v.reason?.message||v.reason))}
    });
    state.fullAt=new Date().toISOString();
    try{await pulse()}catch(e){errors.push(String(e?.message||e))}
    state.errors=[...errors,...state.errors];state.loading=false;$('refresh').disabled=false;$('refresh').textContent='↻ Обновить';
    saveLocal(false);render();
  }
  function workNumbers(){
    const recent=state.remote.at(-1);
    if(!recent||age(recent.captured_at)>75||!Array.isArray(recent.work_pr_numbers))return [];
    return recent.work_pr_numbers.filter(Number.isInteger);
  }
  function processingCount(){return [...new Set([...(state.run.ciPrNumbers||[]),...workNumbers()])].length}
  function snapshot(){
    const cf=age(state.fullAt)<=80,cr=age(state.pulseAt)<=12;
    return {hour_utc:hourKey(new Date()),captured_at:new Date().toISOString(),
      created_60m:cf?state.counts.created??null:null,merged_60m:cf?state.counts.merged??null:null,
      open_total:cf?state.counts.open??null:null,open_prod:cf?state.counts.prod??null:null,
      draft_prod:cf?state.counts.draft??null:null,running_runs:cr?state.run.running??null:null,
      queued_runs:cr?state.run.queued??null:null,active_prs_in_ci:cr&&state.run.running!==null?(state.run.ciPrNumbers||[]).length:null,
      work_pr_numbers:workNumbers(),ready_verified:state.queue?.verified_ready?.length??null,
      source:'local_browser',sampled_work_prs:true};
  }
  function saveLocal(force){
    if(!state.fullAt||!state.pulseAt)return;
    const s=snapshot();if(!isSnapshot(s))return;
    const index=state.local.findIndex(x=>x.hour_utc===s.hour_utc);
    if(index===-1)state.local.push(s);else if(force||age(state.local[index].captured_at)>4)state.local[index]=s;
    state.local.sort((a,b)=>a.hour_utc.localeCompare(b.hour_utc));state.local=state.local.slice(-168);writeStorage();
  }
  function history(){
    const map=new Map();for(const s of state.remote)map.set(s.hour_utc,s);
    for(const s of state.local){const prev=map.get(s.hour_utc);if(!prev||validDate(s.captured_at)>validDate(prev.captured_at))map.set(s.hour_utc,s)}
    return [...map.values()].filter(isSnapshot).sort((a,b)=>b.hour_utc.localeCompare(a.hour_utc)).slice(0,168);
  }
  function loadTone(run,queue){
    if(run==null||queue==null)return 'unknown';
    if(queue>6||run>12)return 'busy';
    if(queue>2||run>6)return 'warn';
    return 'good';
  }
  function set(id,content){$(id).textContent=content}
  function renderOverview(){
    const fresh=age(state.pulseAt)<=12,complete=age(state.fullAt)<=80;
    const run=fresh?state.run.running:null,queue=fresh?state.run.queued:null,tone=loadTone(run,queue);
    $('signal').className='signal-dot '+tone;
    const descriptions={
      unknown:['Нет актуального замера CI','Обновите показатели: неизвестную нагрузку нельзя считать нулём'],
      busy:['CI загружена — избегать массовых push','Выполняется '+text(run)+' · ожидает '+text(queue)+' workflow runs'],
      warn:['CI занята — новые push по одному','Выполняется '+text(run)+' · ожидает '+text(queue)+' workflow runs'],
      good:[run===0&&queue===0?'CI свободна по наблюдаемым запускам':'Есть окно для новых PR', 'Выполняется '+text(run)+' · ожидает '+text(queue)+' workflow runs']
    };
    set('recommendation',descriptions[tone][0]);set('recommendation-reason',descriptions[tone][1]);
    set('now-prod',text(complete?state.counts.prod:null));set('now-total','всего открыто '+text(complete?state.counts.open:null));
    set('now-created',complete&&num(state.counts.created)!==null?'+'+text(state.counts.created):'—');set('now-merged',text(complete?state.counts.merged:null));
    set('now-running',text(run));set('now-queued',text(queue));
    set('now-work',fresh&&state.run.running!=null?'≥'+text(processingCount()):'—');
    set('now-ready',age(state.queue?.updated_at)<=90&&Array.isArray(state.queue?.verified_ready)?text(state.queue.verified_ready.length):'—');
    set('freshness',fresh?'CI '+FORMAT_CLOCK.format(validDate(state.pulseAt))+' · Торонто':'CI не обновлена · Торонто');
  }
  function localDayKey(date){return FORMAT_DAY_KEY.format(date)}
  function renderCard(s,previousKey,isCurrent){
    const start=validDate(s.hour_utc),captured=validDate(s.captured_at);
    const created=num(s.created_60m),merged=num(s.merged_60m),running=num(s.running_runs),queued=num(s.queued_runs),open=num(s.open_prod);
    const tone=loadTone(running,queued);
    const older=previousKey?state._viewMap.get(previousKey):null;
    const olderQueue=older?num(older.queued_runs):null;
    let trend='';
    if(queued!==null&&olderQueue!==null){const diff=queued-olderQueue;trend=diff===0?'=':diff>0?'<span class="delta-up">↑'+text(diff)+'</span>':'<span class="delta-down">↓'+text(-diff)+'</span>'}
    const source=s.source==='local_browser'?'браузер':'Triage';
    const time=FORMAT_CLOCK.format(start);const sampled=FORMAT_CLOCK.format(captured);
    const accessible='Час '+time+'. Новых '+(created??'нет данных')+', merge '+(merged??'нет данных')+', CI идёт '+(running??'нет данных')+', CI ждёт '+(queued??'нет данных')+', открыто production '+(open??'нет данных')+'. Замер '+sampled+'.';
    return '<article class="hour-card '+tone+(isCurrent?' is-now':'')+'" role="button" tabindex="0" aria-haspopup="dialog" aria-expanded="false" data-hour-utc="'+htmlEscape(s.hour_utc)+'" aria-label="'+htmlEscape(accessible)+'" title="'+htmlEscape(accessible)+'">'
      +'<div class="hour-top"><span class="hour-time">'+htmlEscape(time)+'</span><span class="hour-source">'+(isCurrent&&age(s.captured_at)<=12?'сейчас':source)+'</span></div>'
      +'<div class="hour-numbers"><div><div class="hour-number created">'+(created===null?'—':'+'+text(created))+'</div><div class="hour-label">новые</div></div><div><div class="hour-number merged">'+(merged===null?'—':'✓ '+text(merged))+'</div><div class="hour-label">merge</div></div></div>'
      +'<div class="hour-bottom"><span>▶ '+text(running)+'</span><span class="waiting">◷ '+text(queued)+'</span></div>'
      +'<div class="hour-footer"><span>PR '+text(open)+'</span><span>'+(trend?'Ждёт '+trend:'замер '+htmlEscape(sampled))+'</span></div></article>';
  }
  function renderGap(from,to){
    const n=to-from+1;const stamp=FORMAT_CLOCK.format(new Date(from*3600000));
    return '<div class="gap-card" aria-label="Нет замеров: '+n+' ч"><strong>'+htmlEscape(n===1?stamp+' · нет данных':n+' ч без данных')+'</strong><span>Замеры ещё не сохранены</span></div>';
  }
  function renderTimeline(){
    const range=state.range;const latest=Math.floor(Date.now()/3600000),map=new Map(history().map(x=>[x.hour_utc,x]));state._viewMap=map;window.__HH_HOUR_MAP__=map;
    const days=new Map();
    for(let offset=0;offset<range;offset++){
      const tick=latest-offset;const date=new Date(tick*3600000),day=localDayKey(date),key=hourKey(date);
      if(!days.has(day))days.set(day,{date,slots:[]});days.get(day).slots.push({tick,key,s:map.get(key)});
    }
    const blocks=[];let globalHasData=false;
    for(const {date,slots} of days.values()){
      const known=slots.filter(x=>x.s).length;globalHasData=globalHasData||known>0;
      const heading='<div class="day-heading"><h3>'+htmlEscape(FORMAT_DAY.format(date).replace(/^./,c=>c.toUpperCase()))+'</h3><span class="day-sub">'+known+' из '+slots.length+' часов с данными</span></div>';
      const cards=[];
      for(let i=0;i<slots.length;){
        if(slots[i].s){
          const item=slots[i];cards.push(renderCard(item.s,hourKey(new Date((item.tick-1)*3600000)),item.tick===latest));i++;continue;
        }
        let j=i+1;while(j<slots.length&&!slots[j].s)j++;
        cards.push(renderGap(slots[j-1].tick,slots[i].tick));i=j;
      }
      blocks.push('<div class="day-block">'+heading+'<div class="hours">'+cards.join('')+'</div></div>');
    }
    $('days').innerHTML=blocks.join('')+(globalHasData?'':'<div class="timeline-empty">Пока нет ни одного часового замера. После загрузки появится первая карточка; пропущенные часы не будут выдаваться за нули.</div>');
    for(const b of document.querySelectorAll('.range'))b.setAttribute('aria-pressed',Number(b.dataset.hours)===range?'true':'false');
  }
  function render(){
    renderOverview();renderTimeline();
    const errors=state.errors.filter(Boolean);
    const remote=state.remote.length;
    $('status').className='state'+(errors.length?' error':'');
    set('status',errors.length?'Часть показателей недоступна: '+errors.join(' · '):'История: '+remote+' общих снимков Triage · '+state.local.length+' локальных · автообновление 10/60 мин');
  }
  function exportCSV(){
    const rows=history();if(!rows.length){set('status','Снимков для экспорта пока нет.');return}
    const fields=['hour_utc','captured_at','created_60m','merged_60m','open_total','open_prod','draft_prod','active_prs_in_ci','running_runs','queued_runs','ready_verified','source'];
    const csv='\ufeff'+[fields.join(';'),...rows.map(s=>fields.map(f=>'"'+String(s[f]??'').replace(/"/g,'""')+'"').join(';'))].join('\r\n');
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    link.href=url;link.download='pr-control-tower-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('refresh').addEventListener('click',()=>{if(Date.now()-lastFullRequest<60000){set('status','Повторить полный запрос можно через минуту — берегём лимит GitHub API.');return}void full()});
  $('download-csv').addEventListener('click',exportCSV);
  for(const b of document.querySelectorAll('.range'))b.addEventListener('click',()=>{state.range=Number(b.dataset.hours);renderTimeline()});
  const tick=()=>{if(document.hidden)return;const now=Date.now();if(now-lastFullRequest>=FULL_MS)void full();else if(now-lastPulseRequest>=PULSE_MS)void pulse()};
  document.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);
  setInterval(tick,60000);render();void full();
})();
