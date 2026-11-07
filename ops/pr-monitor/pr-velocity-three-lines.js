'use strict';
/* HH_PR_VELOCITY_THREE_LINES_V1
 * Add two evidence-backed time series to the existing merge-velocity SVG. The
 * existing blue P50 is rescaled together with them to one shared minute axis.
 * Fetches only when the original lazy chart loads/changes period, never timers.
 */
(function (env) {
  const PERIODS = new Set([1,6,24,72]);
  const SVGNS='http://www.w3.org/2000/svg';
  const COLORS={merge:'#95caff',first:'#ffc782',head:'#c8a5ff'};
  const nf=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const minutes=n=>!valid(n)?'—':n<1?nf.format(n*60)+' сек':n<60?nf.format(n)+' мин':nf.format(n/60)+' ч';
  function series(raw,more,period){
    if(raw?.schema!=='HH_PR_STAGE_TIMELINE_V2'||more?.schema!=='HH_PR_MERGE_CI_HEAD_TRENDS_V1'||raw.period_hours!==period||more.period_hours!==period||!Array.isArray(raw.buckets)||raw.buckets.length!==6||!Array.isArray(more.buckets)||more.buckets.length!==6)throw Error('Непроверенный источник графика');
    const points=raw.buckets.map((b,i)=>{
      const s=more.buckets[i],a=Date.parse(b.start),z=Date.parse(b.end),bStart=Date.parse(s?.start),bEnd=Date.parse(s?.end);
      if(!Number.isFinite(a)||!Number.isFinite(z)||Math.abs(a-bStart)>1000||Math.abs(z-bEnd)>1000||!Number.isSafeInteger(b.count)||b.count<0||!Number.isSafeInteger(s.merged_count)||s.merged_count<0||!Number.isSafeInteger(s.first_ci?.n)||!Number.isSafeInteger(s.ci_to_head_upper?.n)||s.first_ci.n>s.merged_count||s.ci_to_head_upper.n>s.merged_count)throw Error('Несовместимые интервалы или неполное подтверждение');
      // A partial PR listing must never silently override the original complete counts.
      if(more.coverage?.merged_complete===true&&b.count!==s.merged_count)throw Error('Несогласованные Merge-данные');
      const merge=valid(b.total?.median_minutes)&&b.total?.n>0?b.total.median_minutes:null;
      const first=valid(s.first_ci?.median_minutes)&&s.first_ci.n>0?s.first_ci.median_minutes:null;
      const head=valid(s.ci_to_head_upper?.median_minutes)&&s.ci_to_head_upper.n>0?s.ci_to_head_upper.median_minutes:null;
      const lastHead=valid(s.last_head_wave_upper?.median_minutes)&&s.last_head_wave_upper?.n>0?s.last_head_wave_upper.median_minutes:null;
      if(s.last_head_wave_upper && (!Number.isSafeInteger(s.last_head_wave_upper.n) || s.last_head_wave_upper.n<0 ||
          s.last_head_wave_upper.n>s.merged_count))throw Error('Некорректная выборка последней волны HEAD');
      return {merge,first,head,lastHead,merged:b.count,merge_n:b.total?.n||0,
        first_n:s.first_ci.n,head_n:s.ci_to_head_upper.n,lastHead_n:s.last_head_wave_upper?.n??0,
        start:b.start,end:b.end};
    });
    return {points,coverage:more.coverage,period};
  }
  const helpers={series,minutes,valid};
  if (typeof module==='object'&&module.exports)module.exports=helpers;
  if(!env?.document || !env.fetch)return;
  const doc=env.document;
  let host=null,plot=null,observer=null,busyKey='',sequence=0;
  function e(tag,attr,text,parent){
    const n=doc.createElementNS(SVGNS,tag);
    for(const [k,v] of Object.entries(attr||{}))n.setAttribute(k,String(v));
    if(text!=null)n.textContent=String(text);
    parent?.appendChild(n);return n;
  }
  function activeHours(){
    const chosen=Number(host?.querySelector('.hhv-range button[aria-pressed="true"]')?.dataset.hours);
    return PERIODS.has(chosen)?chosen:null;
  }
  function restore(svg){
    for(const n of svg.querySelectorAll('[data-hh-old-line="1"]')){n.removeAttribute('data-hh-old-line');n.removeAttribute('display');}
  }
  function legendAndFoot(model){
    let legend=host?.querySelector('.hhv-legend');
    if(legend){
      const old=legend.querySelector('.hhv-latency');if(old)old.hidden=true;
      legend.querySelectorAll('[data-hh-line-key]').forEach(x=>x.remove());
      for(const [key,label,color] of [
        ['merge','● PR → Merge',COLORS.merge],
        ['first','● PR → первая CI',COLORS.first],
        ['head','◌ Весь цикл новых HEAD (по CI)',COLORS.head]
      ]){
        let node=doc.createElement('span');node.dataset.hhLineKey=key;
        node.style.color=color;node.textContent=label;legend.appendChild(node);
      }
    }
    let note=host?.querySelector('.hhv-three-note');
    if(!note){note=doc.createElement('p');note.className='hhv-three-note';host?.querySelector('.hhv-foot')?.insertAdjacentElement('afterend',note);}
    const firstN=model.points.reduce((n,p)=>n+p.first_n,0);
    const headN=model.points.reduce((n,p)=>n+p.head_n,0);
    note.textContent='Временные линии: P50 по минутам (правая шкала), Merge/ч — левая. Первая CI: '+firstN+' PR с архивной записью. Новые HEAD: '+headN+' PR; пунктир показывает ВЕСЬ цикл от первой CI до CI на последнем отличающемся HEAD, не задержку одного ремонта. В карточках ниже — отдельно последняя наблюдаемая волна (тоже верхняя граница, не точный timestamp push). Выборка n<5 нестабильна. Отсутствующие события = «—», не 0.'+
      (model.coverage?.merged_complete===false?' Список слияний частичный.':'')+
      (model.coverage?.archive_complete===false?' Архив CI частичный.':'')+
      (model.coverage?.reference_stale===true?
        ' Снимок Merge старше 45 мин ('+String(model.coverage.reference_age_minutes??'—')+
        ' мин назад); линии отражают исторический срез, а не текущую очередь CI.':'');
  }
  function draw(model,svg){
    const old=svg.querySelector('[data-hh-three-lines]');if(old)old.remove();
    restore(svg);
    const max=Math.max(1,...model.points.flatMap(p=>[p.merge,p.first,p.head].filter(valid)));
    const ceiling=max<=4?4:Math.ceil(max/4)*4;
    const g=e('g',{'data-hh-three-lines':'1'},null,svg);
    const x=i=>39+i*56, y=v=>142-114*v/ceiling;
    const oldPath=svg.querySelector('path[stroke="#95caff"]');if(oldPath){oldPath.setAttribute('data-hh-old-line','1');oldPath.setAttribute('display','none');}
    svg.querySelectorAll('circle[fill="#a3d5ff"]').forEach(n=>{n.setAttribute('data-hh-old-line','1');n.setAttribute('display','none');});
    const bars=model.points.map(p=>p.merged*6/model.period),maxR=Math.max(1,...bars);
    for(let i=0;i<=4;i++){
      const val=ceiling*i/4, yy=y(val);
      e('text',{x:349,y:yy+4,'text-anchor':'end',fill:'#a6bfd9','font-size':8},nf.format(val),g);
      // Existing grid already corresponds to the same top/bottom y; ticks use
      // the independent minutes scale rather than an arbitrary SVG coordinate.
    }
    for(const v of [0,maxR/2,maxR]){
      const yy=142-114*v/maxR;
      e('text',{x:21,y:yy+3,'text-anchor':'end',fill:'#7ee1b7','font-size':8},nf.format(v),g);
    }
    for(const [key,color,dash] of [['merge',COLORS.merge,null],['first',COLORS.first,null],['head',COLORS.head,'5 4']]){
      let d='',prev=false;
      model.points.forEach((p,i)=>{
        if(!valid(p[key])) {prev=false;return;}
        d+=(prev?' L ':' M ')+x(i)+' '+y(p[key]);prev=true;
      });
      if(d){const a={d,fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'};if(dash)a['stroke-dasharray']=dash;e('path',a,null,g);}
      model.points.forEach((p,i)=>{
        if(!valid(p[key]))return;
        const mark=e('circle',{cx:x(i),cy:y(p[key]),r:3.6,fill:color,stroke:'#0c2032','stroke-width':1.2},null,g);
        const n=key==='merge'?p.merge_n:key==='first'?p.first_n:p.head_n;
        e('title',{},(key==='merge'?'PR → Merge':key==='first'?'PR → первая CI':'CI → новый HEAD (верхняя граница)')+' · '+minutes(p[key])+' · n='+n,mark);
      });
    }
    const rightFooter=Array.from(svg.querySelectorAll('text')).find(x=>x.getAttribute('y')==='177'&&x.getAttribute('text-anchor')==='end');
    if(rightFooter)rightFooter.textContent='max '+minutes(ceiling);
    legendAndFoot(model);
    const binEls=host.querySelectorAll('.hhv-buckets .hhv-bin');
    if(binEls.length===6)model.points.forEach((p,i)=>{
      binEls[i].querySelectorAll('[data-hh-extraline]').forEach(x=>x.remove());
      for(const [key,label] of [['first','CI'],['head','Весь HEAD-цикл ≤'],['lastHead','Последняя волна ≤']]){
        const el=doc.createElement('small');el.dataset.hhExtraline=key;
        el.textContent=label+': '+minutes(p[key])+' (n='+p[key+'_n']+')';binEls[i].appendChild(el);
      }
    });
  }
  function status(message){
    if(!host)return;
    let n=host.querySelector('.hhv-three-note');
    if(!n){n=doc.createElement('p');n.className='hhv-three-note';host.querySelector('.hhv-foot')?.insertAdjacentElement('afterend',n);}
    n.textContent=message;
  }
  async function enhance(){
    const svg=plot?.querySelector('svg'),hours=activeHours();
    if(!svg||!hours)return;
    const serial=++sequence;
    const key=hours+':'+svg.outerHTML.length;
    if(busyKey===key && svg.querySelector('[data-hh-three-lines]'))return;
    busyKey=key;
    try{
      const r=await env.fetch('/api/pr-stage-timeline?hours='+hours,{cache:'default',headers:{Accept:'application/json'}});
      if(!r.ok)throw Error('API PR '+r.status);
      const raw=await r.json();
      if(raw?.schema!=='HH_PR_STAGE_TIMELINE_V2'||!Number.isFinite(Date.parse(raw.generated_at||'')))throw Error('Нет полного источника merge');
      const u='/api/pr-merge-ci-head-trends?hours='+hours+'&asof='+encodeURIComponent(raw.generated_at);
      const resp=await env.fetch(u,{cache:'default',headers:{Accept:'application/json'}});
      if(!resp.ok){
        const payload=await resp.json().catch(()=>null);
        if(resp.status===400&&payload?.error==='INVALID_PERIOD_OR_REFERENCE')
          throw Error('Исторический снимок Merge слишком старый или некорректный; обновите данные');
        throw Error('API CI '+resp.status);
      }
      const data=await resp.json();
      const model=series(raw,data,hours);
      if(serial!==sequence||svg!==plot?.querySelector('svg')||hours!==activeHours())return;
      draw(model,svg);
    }catch(err){
      if(serial!==sequence)return;
      status('Линии CI / HEAD временно недоступны: '+String(err.message||err).slice(0,110)+'. Исходная линия PR → Merge сохранена.');
    }
  }
  function start(){
    host=doc.getElementById('hh-merge-velocity');plot=host?.querySelector('.hhv-graph');
    if(!plot)return false;
    observer=new MutationObserver(()=>{busyKey='';void enhance();});
    observer.observe(plot,{childList:true,subtree:false});
    if(plot.querySelector('svg'))void enhance();
    return true;
  }
  if(!start()){
    const watcher=new MutationObserver(()=>{if(start())watcher.disconnect();});
    watcher.observe(doc.documentElement,{childList:true,subtree:true});
  }
})(typeof window==='undefined'?null:window);