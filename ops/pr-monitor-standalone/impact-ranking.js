'use strict';
(()=>{
  // v3: 1h/24h/7d from the single-writer PR Merge Observer archive; no Actions fanout from the browser.
  const mount=document.getElementById('diagnostics-mount');
  if(!mount)return;
  const old=document.getElementById('hh-impact-rank')||document.getElementById('hh-impact-ranking');if(old)old.remove();
  const H=3600000,MS={hour:H,day:24*H,week:168*H},SLOTS={hour:6,day:6,week:7};
  const names={hour:'1ч',day:'24ч',week:'7д'},brief={hour:'за час',day:'за сутки',week:'за неделю'};
  const doc='https://docs.google.com/document/d/1IsXRcjNoaifzwVFLW8Xv8KLI1xGTnynrmKBKGAHa8wg/edit';
  const factors=[
   {id:'typescript',name:'TypeScript · типизация',color:'#b9d3ff',tags:['typescript']},
   {id:'build',name:'Next.js · Production Build',color:'#ffc576',tags:['build']},
   {id:'browser',name:'Browser / WebKit / E2E',color:'#8bc9ff',tags:['browser']},
   {id:'queue',name:'Очередь и нагрузка CI',color:'#f6cc84',tags:['queue']},
   {id:'conflict',name:'Конфликты DIRTY',color:'#75e2be',tags:['conflict']},
   {id:'fanout',name:'Повторные запуски / fan-out',color:'#80c9ef',tags:['fanout']},
   {id:'dependency',name:'Зависимости PR / Draft',color:'#9fbdef',tags:['dependency']}
  ];
  const n=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
  const $=x=>document.getElementById(x);
  const clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false});
  const date=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',day:'2-digit',month:'2-digit'});
  const fmt=t=>clock.format(new Date(t)).replace(/^24:/,'00:');
  const formatTime=t=>date.format(new Date(t))+' '+fmt(t)+' · Торонто';
  const isNum=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  const safeURL=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['github.com','docs.google.com'].includes(x.hostname)?x.href:null;}catch{return null;}};
  const link=(label,url)=>{const safe=safeURL(url);if(!safe)return null;const a=n('a',null,label);a.href=safe;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function shared(){
    if(window.__HH_OBSERVER_SHARED_V1__)return window.__HH_OBSERVER_SHARED_V1__;
    const q={data:null,at:0,promise:null};
    q.load=async(force=false)=>{
      if(q.data&&!force&&Date.now()-q.at<15*60000)return q.data;
      if(q.promise)return q.promise;
      q.promise=(async()=>{
        try{
          const c=new AbortController(),timer=setTimeout(()=>c.abort(),13000);
          let raw;try{const r=await fetch('/api/observer-archive',{signal:c.signal,cache:'default'});
            if(!r.ok)throw Error('HTTP '+r.status);raw=await r.json();}finally{clearTimeout(timer);}
          if(raw?.schema!=='HH_CI_OBSERVER_ROLLUP_V1'||!Array.isArray(raw.snapshots))throw Error('Invalid archive');
          q.data=raw;q.at=Date.now();
          try{localStorage.setItem('hh-observer-archive-last-v1',JSON.stringify(raw));}catch{}
          return raw;
        }catch(e){
          if(q.data)return q.data;
          try{const c=JSON.parse(localStorage.getItem('hh-observer-archive-last-v1')||'null');
            if(c?.schema==='HH_CI_OBSERVER_ROLLUP_V1'){q.data=c;q.at=Date.now();return {...c,_archive:{source:'browser_cache',warning:String(e)}};}}catch{}
          throw e;
        }finally{q.promise=null;}
      })();
      return q.promise;
    };
    q.window=(data,mode)=>{
      // The selected period is based on the CURRENT clock, not on the last archived sample.
      // Only completed UTC hours are compared: prevents a partial hour and false "full" coverage.
      const duration=MS[mode]||H,end=Math.floor(Date.now()/H)*H,start=end-duration,prior=start-duration;
      const samples=(data?.snapshots||[])
        .filter(s=>Number.isFinite(Date.parse(s.observed_at)))
        .sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
      const dedup=list=>{const map=new Map();for(const s of list)map.set(Math.floor(Date.parse(s.observed_at)/H)*H,s);
        return [...map.values()].sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at))};
      const current=dedup(samples.filter(s=>{const t=Date.parse(s.observed_at);return t>=start&&t<end}));
      const previous=dedup(samples.filter(s=>{const t=Date.parse(s.observed_at);return t>=prior&&t<start}));
      const last=samples.at(-1),lastAt=Date.parse(last?.observed_at);
      // For the 1h view, an older measurement may be shown ONLY with an explicit historical marker.
      const displayHistorical=mode==='hour'&&current.length===0&&Number.isFinite(lastAt)&&lastAt<start;
      const display=displayHistorical?[last]:current;
      const displayStart=displayHistorical?Math.floor(lastAt/H)*H:start;
      return {current,previous,start,end,prior,duration,expected:duration/H,
        display,displayHistorical,displayStart,displayEnd:displayHistorical?displayStart+H:end,
        lastObservedAt:Number.isFinite(lastAt)?lastAt:null};
    };
    window.__HH_OBSERVER_SHARED_V1__=q;return q;
  }
  const service=shared();
  const box=n('section','hir2-card');box.id='hh-impact-rank';box.setAttribute('aria-label','Рейтинг причин задержек PR по сохранённым наблюдениям');
  box.innerHTML='<div class="hir2-head"><div><h2>Рейтинг наблюдений</h2><p>Архивные теги Observer, не количество текущих ошибок CI</p></div>'+
   '<div class="hir2-select-wrap"><div id="hir2-switch" class="hir2-switch" role="group" aria-label="Период анализа">'+
   '<button type="button" data-window="hour">1ч</button><button type="button" data-window="day">24ч</button><button type="button" data-window="week">7д</button></div>'+
   '<p>Сравнение с предыдущим периодом</p></div></div>'+
   '<p class="hir2-period" id="hir2-period">Загружаю журнал…</p>'+
   '<div class="hir2-column"><span>Категория</span><span>Индекс наблюдений</span><span>Δ</span></div>'+
   '<div class="hir2-list" id="hir2-list" role="list" aria-live="polite"></div>'+
   '<div class="hir2-insights" id="hir2-insights"></div>'+ 
   '<section class="hir2-recent" id="hir2-recent" aria-label="Изменения между двумя сохранёнными срезами"><div class="hir2-recent-head"><h3>Последние два замера</h3><span id="hir2-recent-period">Проверяю…</span></div><div class="hir2-recent-grid" id="hir2-recent-grid"></div><p id="hir2-recent-note" class="hir2-recent-note">Фактические измерения Observer; не прогноз.</p></section>'+
   '<section class="hir2-health"><div class="hir2-health-head"><h3>Покрытие мониторинга</h3><span id="hir2-health-label">Проверяю…</span></div>'+
   '<div class="hir2-health-grid"><div><span class="hir2-symbol">✓</span><span>Журнал<strong id="hir2-source">—</strong></span></div>'+
   '<div><span class="hir2-symbol">◷</span><span>Последний срез<strong id="hir2-time">—</strong></span></div>'+
   '<div><span class="hir2-symbol">▥</span><span>Покрытие<strong id="hir2-coverage">—</strong></span></div>'+
   '<div><span class="hir2-symbol">▤</span><span>Источники<strong>Observer · GitHub · Google Docs</strong></span></div></div>'+
   '<p class="hir2-health-note" id="hir2-health-note">Достоверность данных проверяется…</p></section>'+
   '<p class="hir2-disclaimer"><b>Индекс 0–100</b> — эвристика по подтверждённым записям, НЕ минуты задержки merge и НЕ полный перечень ошибок. Категории отмечают наблюдения, но не доказывают первопричину. Для непокрытых часов используем «—», а не ноль; повторы — лишь кандидаты. <a href="'+doc+'" target="_blank" rel="noopener noreferrer">Журнал наблюдений</a></p>';
  mount.prepend(box);
  const legacyInfo=n('p','hir2-disclaimer');legacyInfo.id='hir2-legacy-gate-status';box.append(legacyInfo);
  const modes=Object.keys(names),buttons=[...box.querySelectorAll('#hir2-switch button')];
  let mode='hour',archive=null,expanded=null,error=null,request=0;
  try{const v=localStorage.getItem('hh-impact-selected-window-v2');if(modes.includes(v))mode=v;}catch{}
  function note(f,s){
    if(!s.length)return {score:null,text:'Нет наблюдений',count:null};
    const tagged=s.filter(x=>f.tags.some(tag=>(x.tags||[]).includes(tag))).length;
    const hasQueue=s.filter(x=>isNum(x.queued)),queueMax=hasQueue.length?Math.max(...hasQueue.map(x=>x.queued)):null;
    const running=s.filter(x=>isNum(x.running)),runningMax=running.length?Math.max(...running.map(x=>x.running)):null;
    if(f.id==='queue'){
      if(queueMax===null&&runningMax===null)return {score:null,text:'Нет измерения CI',count:null};
      const score=Math.min(100,Math.round(Math.min(60,(queueMax||0)*.7)+Math.min(40,(runningMax||0)*2)));
      return {score,text:'Q '+(queueMax===null?'—':queueMax)+' · R '+(runningMax===null?'—':runningMax)+' (пиковый срез)',count:queueMax};
    }
    if(!tagged)return {score:null,text:'Не отмечено в неполном журнале',count:null};
    const factorScale=({typescript:72,build:65,browser:65,conflict:70,fanout:40,dependency:50})[f.id]??38;
    const score=Math.min(100,Math.round(factorScale*(tagged/Math.max(1,s.length))*(1+Math.min(1,tagged/7))));
    return{score,text:tagged+' из '+s.length+' сохранённых часов',count:tagged};
  }
  function compare(f,range){
    const curr=note(f,range.current),prev=note(f,range.previous);
    // No percentages from partial archives: only show a difference for full equal observation coverage.
    if(range.current.length!==range.expected||range.previous.length!==range.expected||
       curr.count===null||prev.count===null)return{text:'—',tone:'unknown',score:null};
    const change=curr.score-prev.score;
    return {text:change===0?'= 0 п.':(change>0?'↑ +':'↓ −')+Math.abs(change)+' п.',
      tone:change>0?'bad':change<0?'good':'flat',score:change};
  }
  function trend(f,range){
    const N=SLOTS[mode],step=range.duration/N;
    return Array.from({length:N},(_,i)=>{
      const from=range.start+i*step,to=from+step;
      const subset=range.current.filter(s=>{const t=Date.parse(s.observed_at);return t>=from&&t<to});
      return note(f,subset).score;
    });
  }
  function sparkline(series,color){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('hir2-spark');svg.setAttribute('viewBox','0 0 108 42');svg.setAttribute('aria-hidden','true');
    let path='',started=false;
    for(const [i,value] of series.entries()){
      if(value===null){started=false;continue;}
      const x=4+i*100/Math.max(1,series.length-1),y=36-30*value/100;
      path+=(started?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';started=true;
    }
    const line=document.createElementNS(svg.namespaceURI,'path');
    for(const [k,v] of Object.entries({d:path,stroke:color,'stroke-width':2.4,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'}))line.setAttribute(k,v);
    svg.append(line);return svg;
  }
  function details(row,range){
    const d=n('div','hir2-detail'),latest=range.current.at(-1);
    d.append(n('p',null,'Основа: '+row.current.text+'. '+(range.displayHistorical?'ИСТОРИЧЕСКИЙ срез: в последнем завершённом часе данных нет.':range.current.length!==range.expected?'Покрытие неполное, индекс предварительный.':'Наблюдения за завершённые UTC-часы.')));
    d.append(n('p',null,'Сравнение с прошлым периодом: '+row.diff.text+'. Нельзя подменять отсутствие записей нулём.'));
    if(latest)d.append(n('p',null,'Последний сохранённый час: '+formatTime(Date.parse(latest.observed_at))+'. Состояние PR действительно только на дату среза.'));
    const sources=n('div','hir2-links');
    for(const url of [...new Set(range.current.flatMap(s=>s.evidence||[]))].slice(0,4)){
      const l=link('GitHub · доказательство',url);if(l)sources.append(l);
    }
    const journal=link('Google Docs',doc);if(journal)sources.append(journal);
    d.append(sources);return d;
  }
  function renderSnapshots(data){
    const list=$('hir2-recent-grid');list.replaceChildren();
    const points=(data?.snapshots||[]).filter(s=>Number.isFinite(Date.parse(s.observed_at)))
      .sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
    const distinct=new Map();for(const s of points)distinct.set(Math.floor(Date.parse(s.observed_at)/H),s);
    const last=[...distinct.values()].slice(-2);
    const previous=last.length===2?last[0]:null,current=last.length?last.at(-1):null;
    const span=previous?Math.round((Date.parse(current.observed_at)-Date.parse(previous.observed_at))/60000):null;
    $('hir2-recent-period').textContent=current?formatTime(Date.parse(current.observed_at)):'Нет замеров';
    const indicators=[
      {name:'OPEN PR',key:'open_prs',moreBad:true},
      {name:'CI ожидает',key:'queued',moreBad:true},
      {name:'CI выполняется',key:'running',moreBad:null},
      {name:'Новые PR / час',key:'created_prs',moreBad:null},
      {name:'MERGED / час',key:'merged_prs',moreBad:false}
    ];
    for(const item of indicators){
      const now=current?.[item.key],prev=previous?.[item.key];
      const known=isNum(now)&&isNum(prev);
      const delta=known?now-prev:null;
      const card=n('div','hir2-recent-item');
      const label=n('small',null,item.name);
      const value=n('strong',null,isNum(now)?String(now):'—');
      const direction=delta===null?'—':delta===0?'= 0':(delta>0?'↑ +':'↓ −')+Math.abs(delta);
      const tone=delta===null?'unknown':delta===0?'flat':
        item.moreBad===null?'neutral':(delta>0)===item.moreBad?'bad':'good';
      const change=n('span','hir2-recent-'+tone,direction);
      card.append(label,value,change);list.append(card);
    }
    $('hir2-recent-note').textContent=previous&&span!==null?
      (Date.now()-Date.parse(current.observed_at)>90*60000?'ИСТОРИЯ (не текущий статус). ':'')+
      'Срезы '+formatTime(Date.parse(previous.observed_at))+' → '+formatTime(Date.parse(current.observed_at))+
      ' (между ними '+span+' мин). Дельты — разница записанных значений; создано/merged относятся к скользящим 60-минутным окнам, НЕ к непересекающимся часам.':
      'Недостаточно двух разных часовых срезов для сравнения. Отсутствие записи не равно нулю.';
  }
  function draw(){
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.window===mode)));
    const range=service.window(archive,mode);
    const legacyHours=range.current.filter(s=>(s.tags||[]).includes('gate')).length;
    legacyInfo.textContent='Архивные gate-теги: '+legacyHours+' ч за выбранный период. Исключены из рейтинга причин: retired release-ready не обязательный check; текущие ошибки Core/Specialist/hh-merge-check проверяются по реальным GitHub jobs. История в журнале сохранена.';
    const visible={...range,current:range.display,start:range.displayStart,end:range.displayEnd};
    $('hir2-period').textContent=range.displayHistorical?
      'ПОСЛЕДНИЙ ИСТОРИЧЕСКИЙ час до '+formatTime(range.displayEnd)+' · в завершённом часе нет замера':
      (mode==='hour'?'Последний завершённый час':mode==='day'?'Последние 24 завершённых часа':'Последние 7 суток по UTC-часам')+' до '+formatTime(range.end)+' · сравнение с предыдущим равным окном';
    const rows=factors.map(f=>({f,current:note(f,visible.current),diff:compare(f,range),series:range.end!==null?trend(f,visible):[]}));
    rows.sort((a,b)=>(b.current.score??-1)-(a.current.score??-1));
    const list=$('hir2-list');list.replaceChildren();
    for(const [i,row] of rows.entries()){
      const article=n('article','hir2-row');article.setAttribute('role','listitem');
      const button=n('button','hir2-toggle');button.type='button';button.setAttribute('aria-expanded',String(expanded===row.f.id));
      const rank=n('span','hir2-rank'+(i===0?' hir2-top':''),i+1);
      const label=n('span','hir2-label');label.append(n('strong',null,row.f.name),n('small',null,row.current.text));
      const track=n('span','hir2-track'),fill=n('span','hir2-fill');
      fill.style.backgroundColor=row.f.color;fill.style.width=row.current.score===null?'0%':row.current.score+'%';track.append(fill);
      const bar=n('span','hir2-meter');bar.append(track,n('b',null,row.current.score===null?'—':String(row.current.score)));
      const tail=n('span','hir2-trend');tail.append(sparkline(row.series,row.f.color),n('span','hir2-delta hir2-'+row.diff.tone,row.diff.text));
      button.append(rank,label,bar,tail);article.append(button);
      button.addEventListener('click',()=>{expanded=expanded===row.f.id?null:row.f.id;draw()});
      if(expanded===row.f.id)article.append(details(row,visible));
      list.append(article);
    }
    const top=rows.find(r=>r.current.score!==null),better=rows.filter(r=>r.diff.score!==null&&r.diff.score<0).sort((a,b)=>a.diff.score-b.diff.score)[0];
    const tile=(title,item,good)=>{
      const x=n('div','hir2-tile '+(good?'hir2-tile-good':'hir2-tile-warn'));
      x.append(n('small',null,title),n('strong',null,item?.f.name||'Недостаточно данных'),
        n('span',null,item?good?item.diff.text:item.current.score+'/100':'—'));return x;
    };
    $('hir2-insights').replaceChildren(tile(range.displayHistorical?'Частый тег · ИСТОРИЯ':'Частый наблюдаемый тег',top,false),tile('Улучшение',better,true));
    renderSnapshots(archive);
    const last=archive?.snapshots?.at(-1),at=Date.parse(last?.observed_at),age=Number.isFinite(at)?(Date.now()-at)/60000:Infinity;
    const fresh=age<=80&&['github_comment','github_comment_cache'].includes(archive?._archive?.source)&&range.current.length>0;
    const saved=!!archive;
    $('hir2-health-label').textContent=!saved?'● Нет данных':fresh?'● Последний завершённый час записан':range.current.length===0?'● Пропущен завершённый час':'● Архив с задержкой';
    $('hir2-health-label').className=fresh?'hir2-ok':'hir2-off';
    $('hir2-source').textContent=archive?._archive?.source==='github_comment'?'GitHub · архив':archive?._archive?.source?.includes('cache')?'Сохранённая копия':saved?'Проверенный архив':'Не подключён';
    $('hir2-time').textContent=Number.isFinite(at)?formatTime(at):'—';
    $('hir2-coverage').textContent=range.current.length+'/'+range.expected+' ч · ранее '+range.previous.length+'/'+range.expected;
    $('hir2-health-note').textContent=(error?'Связь: '+String(error).slice(0,100)+'. ':'')+
      'Единственный источник периодических записей — существующий Observer :20 Toronto. Последний срез '+(Number.isFinite(age)?Math.max(0,Math.round(age))+' мин назад':'неизвестен')+
      '. Покрытие рассчитывается от текущего UTC-времени; рейтинг прошлых часов помечен как исторический. Пропуски не нули; дорогостоящие CI-запросы при переключении периодов не выполняются.';
    window.dispatchEvent(new CustomEvent('hh-ci-window-change',{detail:{mode,archive,range}}));
  }
  async function load(force=false){const id=++load.seq;
    try{const raw=await service.load(force);if(id!==load.seq)return;archive=raw;error=null;}
    catch(e){error=String(e?.message||e);}
    draw();
  }load.seq=0;
  buttons.forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.window;if(!names[next]||next===mode)return;
    mode=next;expanded=null;try{localStorage.setItem('hh-impact-selected-window-v2',mode)}catch{}draw();
  }));
  $('refresh')?.addEventListener('click',()=>void load(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(false)});
  setInterval(()=>{if(!document.hidden)void load(true)},30*60000);
  draw();void load();
})();