'use strict';
/* HH_CI_VERIFIED_PANEL_V1. One request per page load and manual refresh.
 * Existing PR/merge graph is retained, this separate graph is Actions-only.
 */
(function(){
  if(typeof document==='undefined')return;
  const API='/api/ci-verified-load';
  const SCHEMA='HH_CI_VERIFIED_LOAD_V2',STALE_AFTER_MS=120000;
  let host=null,info=null,chart=null,staleList=null,refresh=null,scheduled=null,lastRequest=0;
  const mk=(tag,cls,label)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(label!=null)x.textContent=String(label);return x;};
  const valid=n=>Number.isSafeInteger(n)&&n>=0;
  const clock=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?new Intl.DateTimeFormat('ru-RU',{
    timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t)):'—';};
  const safeUrl=u=>typeof u==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(u)?u:null;
  const count=(n,complete)=>valid(n)?(complete?'':'≥')+n:'—';
  function safeCiNumber(data,key){
    // If no CI workflow was checked and some were present, even the lower bound
    // 0 is not a useful load observation. Explicitly show unknown instead.
    if(!data||!data.coverage||!data.ci)return '—';
    if(!data.coverage.complete && data.coverage.checked_ci_runs===0 &&
       data.coverage.known_ci_runs>0)return '—';
    return count(data.ci[key],data.coverage.complete===true);
  }
  function graph(payload){
    chart.replaceChildren();
    const x=payload.trend;
    if(!x?.bins||x.bins.length!==6){chart.textContent='История запусков недоступна';return;}
    const width=560,height=150,pad=34,base=height-25;
    const max=Math.max(1,...x.bins.flatMap(r=>[r.ci,r.other]));
    const ns='http://www.w3.org/2000/svg';
    const make=(tag,props,txt)=>{const el=document.createElementNS(ns,tag);
      for(const [k,v] of Object.entries(props||{}))el.setAttribute(k,String(v));
      if(txt!=null)el.textContent=String(txt);return el;};
    const svg=make('svg',{viewBox:`0 0 ${width} ${height}`,width:'100%',role:'img',
      'aria-label':'Запуски GitHub Actions по 10 минут: CI и другие workflows отдельно'});
    const dx=(width-pad*2)/6,bar=dx*.25;
    for(let i=0;i<6;i++){
      const r=x.bins[i],left=pad+i*dx+dx*.18;
      for(const [offset,value,color] of [[0,r.ci,'#80c6ff'],[bar+5,r.other,'#b6a8dc']]){
        const h=Math.round(value/max*(base-15));
        const rect=make('rect',{x:left+offset,y:base-h,width:bar,height:Math.max(1,h),rx:3,fill:color});
        rect.append(make('title',{},`${clock(r.at)} · ${offset===0?'CI':'Другое'}: ${value}`));svg.append(rect);
      }
      svg.append(make('text',{x:pad+(i+.5)*dx,y:height-5,fill:'#b9cfe0','font-size':12,'text-anchor':'middle'},clock(r.at)));
    }
    chart.append(svg,mk('p','hh-ci-v-note',
      'Голубой — CI workflow · фиолетовый — другая GitHub-работа. '+
      'Это зарегистрированные не-skipped запуски, не количество выполненных jobs. '+
      (x.complete?'Окно 60 минут покрыто.':'Выборка частичная (≥).')));
  }
  function show(data){
    if(data?.schema!==SCHEMA||!data.coverage||!data.ci||!data.other)
      throw Error('INVALID_VERIFIED_CI_RESPONSE');
    const t=Date.parse(data.observed_at||'');
    if(!Number.isFinite(t)||t>Date.now()+60000||Date.now()-t>STALE_AFTER_MS)
      throw Error('STALE_VERIFIED_CI_RESPONSE');
    window.__hhCiVerifiedSnapshot=data;
    window.dispatchEvent(new Event('hh:ci-verified-updated'));
    info.replaceChildren();
    const complete=data.coverage.complete===true;
    const stats=mk('div','hh-ci-v-stats');
    for(const [label,value,cls] of [
      ['CI jobs выполняются',safeCiNumber(data,'running_jobs'),''],
      ['CI jobs ожидают',safeCiNumber(data,'queued_jobs'),''],
      ['Другая работа · jobs',count(data.other.running_jobs,complete),''],
      ['Stale CI',count(data.ci.stale_workflows,complete),data.ci.stale_workflows>0?'bad':'']]){
      const s=mk('div','hh-ci-v-stat '+cls);s.append(mk('span','',label),mk('strong','',value));stats.append(s);
    }
    info.append(stats,mk('p','hh-ci-v-note',
      `Срез ${clock(data.observed_at)} Торонто · проверено ${data.coverage.checked_runs}/${data.coverage.listed_runs} активных workflow. `+
      (complete?'Полный охват активных статусов.':'Частичный охват: показаны только подтверждённые jobs (≥).')+
      ' Старые завершённые jobs исключены из нагрузки.'));
    staleList.replaceChildren();
    const stale=data.stale?.filter(x=>x.kind==='ci')||[];
    if(stale.length){staleList.append(mk('b','hh-ci-v-stale-title','Stale CI · подозрительные workflow старше 45 минут'));
      for(const s of stale.slice(0,10)){
        const a=mk(safeUrl(s.url)?'a':'span','hh-ci-v-stale-link',
          `${s.name} · ${s.age_minutes??'—'} мин · ${s.reason}`);
        if(safeUrl(s.url)){a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';}
        staleList.append(a);
      }
    }else staleList.append(mk('p','hh-ci-v-note',complete?'Stale CI не обнаружены.':'Подтверждённых Stale CI нет в проверенной части.'));
    scheduled.replaceChildren();
    const health=data.schedule;
    scheduled.append(mk('b','',health?.status==='DELAYED'?'Расписание GitHub: есть пропуски':
      health?.status==='OBSERVED'?'Расписание GitHub: свежие запуски':'Расписание GitHub: данные неполные'));
    for(const row of health?.rows||[])scheduled.append(mk('p','hh-ci-v-note',
      `${row.name}: ${row.age_minutes===null?'неизвестно':row.age_minutes+' мин назад'} · ${row.status}`));
    scheduled.append(mk('p','hh-ci-v-note','Событийные handoff и существующий Watchdog backstop остаются основными; новый cron не создаётся.'));
    graph(data);
  }
  async function load(force=false){
    if(!host||refresh.disabled||force&&Date.now()-lastRequest<60000)return;
    lastRequest=Date.now();refresh.disabled=true;
    info.textContent='Проверяю GitHub workflow и фактически активные jobs…';
    try{
      const response=await fetch(API,{headers:{Accept:'application/json'},cache:force?'no-store':'default'});
      if(!response.ok)throw Error('HTTP '+response.status);
      show(await response.json());
    }catch(error){
      window.__hhCiVerifiedSnapshot=null;
      window.dispatchEvent(new Event('hh:ci-verified-updated'));
      info.textContent='Достоверная нагрузка CI недоступна: '+String(error.message||error).slice(0,90)+'. Неизвестно ≠ 0.';
    }finally{refresh.disabled=false;}
  }
  function mount(){
    const first=document.querySelector('#hh-pr-two-screens .hh2-first');
    if(!first)return false;
    if(document.getElementById('hh-ci-verified'))return true;
    host=mk('section','hh-ci-v-panel');host.id='hh-ci-verified';
    const heading=mk('div','hh-ci-v-heading');
    heading.append(mk('h3','','GitHub · фактическая нагрузка'),
      mk('span','hh-ci-v-pill','CI jobs ≠ workflow ≠ AI-агенты'));
    refresh=mk('button','hh-ci-v-refresh','Обновить');refresh.type='button';
    refresh.addEventListener('click',()=>void load(true));
    heading.append(refresh);
    info=mk('div','hh-ci-v-info','Читаю подтверждённые GitHub Actions…');
    staleList=mk('div','hh-ci-v-stale');
    chart=mk('div','hh-ci-v-chart');
    scheduled=mk('div','hh-ci-v-schedule');
    host.append(heading,info,staleList,mk('h4','','Запуски GitHub Actions · 6 × 10 минут'),chart,scheduled);
    const after=first.querySelector('.hh2-ci-kpis');
    if(after)after.insertAdjacentElement('afterend',host);else first.append(host);
    void load();return true;
  }
  if(!mount()){
    const obs=new MutationObserver(()=>{if(mount())obs.disconnect();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
