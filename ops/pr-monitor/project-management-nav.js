'use strict';
/* HH_PR_MONITOR_PM_NAV_V1: same-origin read-only project dashboard; no private data. */
(function(){
 if(typeof document==='undefined'||window.__hhPrPmNavV1)return;
 window.__hhPrPmNavV1=true;
 var TARGET='/project-management-public.html';
 function mount(){
  if(document.getElementById('hh-project-management-nav')||!document.body)return;
  var nav=document.createElement('nav');nav.id='hh-project-management-nav';
  nav.setAttribute('aria-label','Holistic House · управление');
  var current=document.createElement('span');current.className='hh-pm-tab hh-pm-current';
  current.textContent='PR Monitor';current.setAttribute('aria-current','page');
  var target=document.createElement('a');target.className='hh-pm-tab hh-pm-link';
  target.href=TARGET;target.textContent='Project Management';
  target.rel='noopener noreferrer';
  nav.append(current,target);document.body.append(nav);
  document.body.classList.add('hh-pm-nav-ready');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();