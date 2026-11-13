'use strict';
/* HH_PR_TRENDS_RECOVERY_V1: render an honest fallback on the original history
 * graph using already displayed and typed interval cards. No API/CI calls.
 */
(function (env) {
  const KINDS=/[ФF]\s*(\d+)\s*[·•.]\s*[ТT]\s*(\d+)(?:\s*[·•.]\s*\?\s*(\d+))?/giu;
  function parseCard(value){
    const text=String(value||'').replace(/\s+/g,' ');
    const label=text.match(/\b\d{1,2}:\d{2}\b/)?.[0]||null;
    const rows=[...text.matchAll(KINDS)].map(m=>[Number(m[1]),Number(m[2]),Number(m[3]||0)]);
    if(!label||rows.length<2||rows.some(p=>p.some(n=>!Number.isSafeInteger(n)||n<0)))return null;
    return {label,created:rows[0].reduce((a,b)=>a+b,0),merged:rows[1].reduce((a,b)=>a+b,0)};
  }
  function plotData(cards){
    const rows=Array.from(cards||[]).map(item=>parseCard(typeof item==='string'?item:item?.textContent)).filter(Boolean);
    return rows.length>=2?rows:null;
  }
  if(typeof module==='object'&&module.exports)module.exports={parseCard,plotData};
  if(!env?.document)return;
  const doc=env.document,NS='http://www.w3.org/2000/svg';
  let periods=null,chart=null,original=null,restored=null,queued=false;
  function make(tag,props,text){const x=doc.createElementNS(NS,tag);Object.entries(props||{}).forEach(([k,v])=>x.setAttribute(k,String(v)));if(text!=null)x.textContent=text;return x;}
  function hasOriginalData(){
    return Array.from(original?.querySelectorAll('path,polyline')||[]).some(x=>{
      const stroke=String(x.getAttribute('stroke')||x.style?.stroke||'').toLowerCase();
      return ['#8bc9ff','#75e2be'].includes(stroke);
    });
  }
  function draw(){
    queued=false;if(!periods||!chart||!original)return;
    const rows=plotData(periods.children),hasLines=hasOriginalData();
    if(hasLines||!rows){if(restored)restored.hidden=true;original.hidden=false;return;}
    if(!restored){restored=doc.createElement('div');restored.className='hh-history-recovered';chart.appendChild(restored);}
    original.hidden=true;restored.hidden=false;
    const graph=make('svg',{viewBox:'0 0 600 165',width:'100%',height:'165',role:'img','aria-label':'Восстановленные линии новых и объединённых PR по подтверждённым интервалам'});
    const top=Math.max(4,Math.ceil(Math.max(...rows.map(r=>Math.max(r.created,r.merged)),1)/4)*4);
    const x=i=>46+526*i/Math.max(1,rows.length-1),y=n=>128-n*102/top;
    for(let k=0;k<=4;k++){const v=top*k/4,yy=y(v);graph.appendChild(make('line',{x1:40,y1:yy,x2:578,y2:yy,stroke:'#36526c','stroke-dasharray':'3 6'}));graph.appendChild(make('text',{x:35,y:yy+4,fill:'#99b2c9','text-anchor':'end','font-size':11},String(v)));}
    for(const [key,color] of [['created','#8bc9ff'],['merged','#75e2be']]){
      graph.appendChild(make('polyline',{fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round',points:rows.map((r,i)=>x(i)+','+y(r[key])).join(' ')}));
      rows.forEach((r,i)=>{const dot=make('circle',{cx:x(i),cy:y(r[key]),r:4,fill:color,stroke:'#0e2034','stroke-width':1.4});dot.appendChild(make('title',{},r.label+' · '+(key==='created'?'Новые PR':'Merge')+': '+r[key]));graph.appendChild(dot);});
    }
    rows.forEach((r,i)=>graph.appendChild(make('text',{x:x(i),y:156,fill:'#b3c9dd','text-anchor':'middle','font-size':rows.length>=10?9:11},r.label)));
    const note=doc.createElement('p');note.className='hh-history-recovered-note';note.textContent='Линии восстановлены из подтверждённых интервалов Ф + Т + ?. Покрытие относится к наблюдаемой истории PR; отсутствие CI не означает ноль.';
    restored.replaceChildren(graph,note);
  }
  function schedule(){if(queued)return;queued=true;env.requestAnimationFrame(draw);}
  function mount(){
    periods=doc.getElementById('hh-trends-periods');chart=doc.querySelector('#hh-pr-trends .hh-trends-plot');original=doc.getElementById('hh-trends-svg');
    if(!periods||!chart||!original)return false;
    new MutationObserver(schedule).observe(periods,{childList:true,subtree:true,characterData:true});
    new MutationObserver(schedule).observe(original,{childList:true,subtree:true,attributes:true,attributeFilter:['d','points','stroke']});
    schedule();return true;
  }
  if(!mount()){
    const bootstrap=new MutationObserver(()=>{if(mount())bootstrap.disconnect();});
    bootstrap.observe(doc.documentElement,{childList:true,subtree:true});
  }
})(typeof window==='undefined'?null:window);