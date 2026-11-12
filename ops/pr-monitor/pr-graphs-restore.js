'use strict';
/* HH_PR_CHART_PAIR_RESTORE_V1 — place the ORIGINAL chart DOM nodes
 * together after the heading; preserve filters, SVGs and API data.
 * Independent from the legacy compact KPI widget, which may be missing.
 * No network requests, timers or background jobs are introduced here.
 */
(function(win){
 if(!win?.document || win.__hhPrChartPairRestoredV1)return;
 win.__hhPrChartPairRestoredV1=true;
 const doc=win.document;
 let watcher=null, queued=false;
 function arrange(){
  const main=doc.querySelector('main.wrap');
  if(!main)return false;
  let pair=doc.getElementById('hh-pr-top-graphs');
  if(!pair){
   pair=doc.createElement('section');
   pair.id='hh-pr-top-graphs';
   pair.className='hh-pr-top-graphs';
   pair.setAttribute('aria-label','Два графика мониторинга PR: активность и задержки');
  }
  const compact=doc.getElementById('hh-pr-merge-speed');
  const header=main.querySelector('header.header');
  const after=compact?.parentElement===main?compact:header;
  const next=after?.nextSibling||main.firstChild;
  if(pair.parentElement!==main || (after && pair.previousElementSibling!==after))
   main.insertBefore(pair,next);
  const activity=doc.getElementById('hh-pr-trends');
  const latency=doc.getElementById('hh-merge-velocity');
  if(activity && activity.parentElement!==pair)pair.appendChild(activity);
  if(latency && latency.parentElement!==pair)pair.appendChild(latency);
  return Boolean(activity && latency && pair.contains(activity) && pair.contains(latency));
 }
 function arrangeSoon(){
  if(queued)return;
  queued=true;
  Promise.resolve().then(()=>{
   queued=false;
   if(arrange()&&watcher){watcher.disconnect();watcher=null;}
  });
 }
 function start(){
  if(arrange())return;
  watcher=new MutationObserver(arrangeSoon);
  watcher.observe(doc.body,{childList:true,subtree:true});
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})(typeof window==='undefined'?null:window);
