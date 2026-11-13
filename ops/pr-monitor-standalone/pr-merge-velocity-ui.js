'use strict';
/* HH_PR_MERGE_VELOCITY_V2 — self-contained, read-only original chart replacement.
 * Same-origin stage API; one request per selected range, manual refresh only.
 * No dependency on another Vercel deployment, CI, scheduler or paid provider.
 */
(function (env) {
  const PERIODS = [1, 6, 24, 72], NS = 'http://www.w3.org/2000/svg';
  const valid = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const num = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1});
  const duration = x => !valid(x) ? '—' : x < 1 ? num.format(x*60)+' сек' : x < 60 ? num.format(x)+' мин' : num.format(x/60)+' ч';
  function normalize(raw, hours, cohortFn) {
    const fn=cohortFn || env?.HHStrictCohort;
    if(typeof fn!=='function')throw Error('STRICT_COHORT_MODEL_UNAVAILABLE');
    const m=fn(raw,null,hours);
    return m.buckets.map(b=>({
      start:b.start,count:b.count,n:b.count,p50:b.median_minutes,
      perHour:b.count*6/hours
    }));
  }
  if (typeof module === 'object' && module.exports) module.exports = {normalize, duration};
  if (!env?.document || env.__hhPrVelocityV2) return;
  env.__hhPrVelocityV2 = true;
  const doc=env.document, cache=new Map();
  const clock=new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit',hour12:false});
  let hours=24, sequence=0, root, plot, bins, status, foot, buttons;
  function el(tag,cls,txt,parent) {
    const x=doc.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);
    if(parent)parent.appendChild(x);return x;
  }
  function s(tag,attrs,txt,parent) {
    const x=doc.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,String(v));
    if(txt!==undefined)x.textContent=String(txt);
    if(parent)parent.appendChild(x);return x;
  }
  function render(raw) {
    const rows=normalize(raw,hours);
    const maxCount=Math.max(1,...rows.map(r=>r.perHour));
    const maxDelay=Math.max(1,...rows.map(r=>r.p50).filter(valid));
    const graph=s('svg',{viewBox:'0 0 360 184',width:'100%',role:'img','aria-label':'Задержки PR до Merge: зелёные столбцы — PR/час, синяя линия — P50'});
    const x=i=>39+i*56, yCount=v=>142-v*114/maxCount, yDelay=v=>142-v*114/maxDelay;
    for(let i=0;i<5;i++){
      const y=142-i*28.5;
      s('line',{x1:26,y1:y,x2:337,y2:y,stroke:'#35536b','stroke-dasharray':'2 4'},undefined,graph);
    }
    rows.forEach((r,i)=>{
      const rect=s('rect',{x:x(i)-10,y:yCount(r.perHour),width:20,height:r.perHour*114/maxCount,rx:2,fill:'#75e2be',opacity:'.8'},undefined,graph);
      s('title',{},'Merge '+r.count+' · '+num.format(r.perHour)+'/ч',rect);
      s('text',{x:x(i),y:157,'text-anchor':'middle',fill:'#b5cadd','font-size':9},clock.format(new Date(r.start)),graph);
    });
    let path='',continuous=false;
    rows.forEach((r,i)=>{
      if(!valid(r.p50)){continuous=false;return;}
      path+=(continuous?' L ':' M ')+x(i)+' '+yDelay(r.p50);continuous=true;
    });
    if(path)s('path',{d:path,fill:'none',stroke:'#95caff','stroke-width':3},undefined,graph);
    rows.forEach((r,i)=>{
      if(!valid(r.p50))return;
      const dot=s('circle',{cx:x(i),cy:yDelay(r.p50),r:3.5,fill:'#a3d5ff',stroke:'#11263b','stroke-width':1},undefined,graph);
      s('title',{},'PR → Merge P50 '+duration(r.p50)+' · n='+r.n,dot);
    });
    s('text',{x:16,y:18,fill:'#75e2be','font-size':9},num.format(maxCount)+'/ч',graph);
    s('text',{x:348,y:177,'text-anchor':'end',fill:'#95caff','font-size':9},'max '+duration(maxDelay),graph);
    plot.replaceChildren(graph);bins.replaceChildren();
    rows.forEach(r=>{
      const item=el('div','hhv-bin',undefined,bins);
      el('strong','',clock.format(new Date(r.start)),item);
      el('small','','Merge '+r.count+' · '+num.format(r.perHour)+'/ч',item);
      el('small','','P50 '+duration(r.p50)+' · n='+r.n,item);
    });
    status.textContent=rows.some(r=>r.n)?'6 интервалов · одна когорта':'За выбранный период нет завершённых новых PR';
    foot.textContent='Production: только созданные И смерженные в этом интервале. P50 того же набора PR; неизвестно ≠ 0. Паузы CI в отдельной таблице.';
  }
  async function load(force) {
    const selected=hours, seq=++sequence;
    if(!force&&cache.has(selected)){render(cache.get(selected));return;}
    status.textContent='Загружаю подтверждённую когорту created+merged…';
    try {
      const response=await env.fetch('/api/pr-created-cohort',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('API '+response.status);
      const data=await response.json();
      normalize(data,selected);
      if(seq!==sequence||selected!==hours)return;
      cache.set(selected,data);render(data);
    } catch(e) {
      if(seq!==sequence)return;
      plot.replaceChildren(el('p','hhv-error','График задержек: нет проверенных данных. Нажмите «Обновить».'));
      bins.replaceChildren();status.textContent='Данные недоступны';
      foot.textContent=(selected>48?'Нет полного источника для 72 часов. ':String(e.message||e).slice(0,90))+' · отсутствие данных не равно нулю.';
    }
  }
  function mount() {
    if(doc.getElementById('hh-merge-velocity'))return;
    const main=doc.querySelector('main.wrap')||doc.querySelector('main');if(!main)return;
    const style=el('style','','#hh-merge-velocity{box-sizing:border-box;min-width:0;margin:7px 0;padding:10px;border:1px solid #365774;border-radius:13px;background:#11263b;color:#ebf4ff;font:12px system-ui,sans-serif}#hh-merge-velocity *{box-sizing:border-box}#hh-merge-velocity h2{margin:0;font-size:15px}#hh-merge-velocity .hhv-top{display:flex;justify-content:space-between;align-items:center;gap:5px;flex-wrap:wrap}#hh-merge-velocity .hhv-range{display:flex;gap:4px}#hh-merge-velocity button{background:#1a3b52;border:1px solid #436d89;border-radius:6px;color:#d8eeff;min-height:29px;padding:4px 8px;font-size:11px;cursor:pointer}#hh-merge-velocity button[aria-pressed=true]{background:#17617a;border-color:#70bddc}#hh-merge-velocity .hhv-graph{min-height:148px}#hh-merge-velocity svg{display:block;max-width:100%;height:auto}#hh-merge-velocity .hhv-legend{display:flex;gap:10px;flex-wrap:wrap;font-size:10px;margin:6px 0}#hh-merge-velocity .hhv-buckets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}#hh-merge-velocity .hhv-bin{display:flex;flex-direction:column;gap:3px;min-width:0;background:#19334a;padding:5px;border-radius:6px;font-size:10px}#hh-merge-velocity .hhv-bin small{font-size:9px;color:#b5cadd}#hh-merge-velocity .hhv-status,#hh-merge-velocity .hhv-foot,#hh-merge-velocity .hhv-three-note{font-size:10px;color:#b4cadd;margin:5px 0}#hh-merge-velocity .hhv-error{padding:30px 10px;color:#ffd0a0;text-align:center}@media(max-width:420px){#hh-merge-velocity .hhv-buckets{grid-template-columns:repeat(2,minmax(0,1fr))}}',doc.head);
    root=el('section','hhv-card',undefined,main);root.id='hh-merge-velocity';
    root.setAttribute('aria-label','График задержек PR → Merge');
    const header=el('div','hhv-top',undefined,root);
    el('h2','','Задержки PR → Merge',header);
    const controls=el('div','hhv-range',undefined,header);
    buttons=PERIODS.map(p=>{
      const button=el('button','',p+'ч',controls);button.type='button';
      button.dataset.hours=String(p);button.setAttribute('aria-pressed',String(p===hours));
      button.addEventListener('click',()=>{hours=p;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));void load(false);
        if(typeof env.CustomEvent==='function')env.dispatchEvent(new CustomEvent('hh-pr-strict-period',{detail:{hours,origin:'graph'}}));});
      return button;
    });
    const refresh=el('button','hhv-refresh','Обновить',header);refresh.type='button';
    refresh.addEventListener('click',()=>{cache.delete(hours);void load(true);});
    status=el('p','hhv-status','Загрузка…',root);
    const legend=el('div','hhv-legend',undefined,root);
    el('span','','▮ Merge/ч',legend).style.color='#75e2be';
    el('span','hhv-latency','● PR → Merge P50',legend).style.color='#95caff';
    plot=el('div','hhv-graph',undefined,root);
    bins=el('div','hhv-buckets',undefined,root);
    foot=el('p','hhv-foot','Только подтверждённые события GitHub.',root);
    env.addEventListener('hh-pr-strict-period',event=>{
      const next=event?.detail?.hours;
      if(event?.detail?.origin==='stages'&&[1,6,24,72].includes(next)&&next!==hours){
        hours=next;buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hours)===hours)));
        void load(false);
      }
    });
    void load(false);
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})(typeof window === 'undefined' ? null : window);
