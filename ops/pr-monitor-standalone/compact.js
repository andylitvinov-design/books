'use strict';
(() => {
 const addScript=(src)=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);};
 const addStyle=(src)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=src;document.head.appendChild(link);};
 addScript('/compact-original.js');
 addStyle('/pr-trends.css');
 addStyle('/pr-trends-toggle.css');
 addStyle('/pr-kinds.css');
 addScript('/pr-kinds.js');
 addStyle('/pr-trends-consistent.css?v=20261102d');
 addScript('/pr-trends-consistent.js?v=20261102d');
 // unified source handles both period modes; legacy requests removed
addStyle('/queue-detail.css');
addScript('/queue-detail.js');
 addScript('/queue-speed.js');
 addScript('/watchdog-control-tower.js');
 addStyle('/one-screen.css?v=20261102c');
 addStyle('/one-screen-tuning.css?v=20261102c');
 addScript('/one-screen.js?v=20261102c');
 addStyle('/ci-phase-metrics.css?v=20261102a');
 addScript('/ci-phase-metrics.js?v=20261102a');
 addStyle('/ci-loop.css');
 addScript('/ci-loop.js');
 addStyle('/monitor-layout-pr-first.css?v=20261104a');
 addScript('/monitor-layout-pr-first.js?v=20261104a');

 // Retry the on-demand PR audit after the document exists: the optional
 // original index loader may execute before <main> and silently return.
 const ensureAttribution=()=>{
  if(document.getElementById('hh-pr-attribution'))return;
  if(!document.querySelector('link[href^="/pr-attribution-ui.css"]'))
   addStyle('/pr-attribution-ui.css?v=20261104live');
  if(document.querySelector('script[data-hh-pr-audit-dom-ready]'))return;
  const s=document.createElement('script');
  s.src='/pr-attribution-ui.js?v=20261104checkpoint3';
  s.async=false;s.setAttribute('data-hh-pr-audit-dom-ready','1');
  document.head.appendChild(s);
 };
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',ensureAttribution,{once:true});
 else ensureAttribution();


 addStyle('/pr-journey-health.css?v=20261104checkpoint3');
 addScript('/pr-journey-health.js?v=20261104checkpoint3');
})();
