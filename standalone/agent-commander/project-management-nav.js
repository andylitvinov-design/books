'use strict';
/* Overlay the existing trusted Commander navigation without rewriting its source. */
(function(){
 if(window.__HH_CRON_NAV_LOADER_V2)return;window.__HH_CRON_NAV_LOADER_V2=true;
 const old=document.createElement('script');
 old.src='/project-management-nav-legacy.js?v=20261107-cron-v2';
 old.defer=true;
 const icon='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>';
 let timer=null;
 function add(){
  const dock=document.getElementById('hh-cc-dock');
  if(!dock||dock.querySelector('a[href="/automations.html"]'))return false;
  const a=dock.querySelector('a[href="/agents.html"]');
  const link=a?a.cloneNode(true):document.createElement('a');
  link.href='/automations.html';link.setAttribute('aria-label','Автоматизации');
  link.removeAttribute('aria-current');
  const svg=link.querySelector('svg');if(svg)svg.outerHTML=icon;
  else{const span=document.createElement('span');span.innerHTML=icon;link.prepend(span);}
  const small=link.querySelector('small');if(small)small.textContent='Авто';
  else{const small2=document.createElement('small');small2.textContent='Авто';link.append(small2);}
  const text=link.querySelector('span:not(:has(svg))');if(text&&text.textContent?.trim()==='Агенты')text.textContent='Авто';
  if(location.pathname==='/automations.html'){link.classList.add('hh-cron-selected');link.setAttribute('aria-current','page');}
  if(a?.nextSibling)dock.insertBefore(link,a.nextSibling);else dock.appendChild(link);
  const style=document.createElement('style');
  style.textContent='#hh-cc-dock{grid-template-columns:repeat(6,minmax(0,1fr))!important;padding-left:5px!important;padding-right:5px!important}#hh-cc-dock>a{min-width:0!important;padding-left:1px!important;padding-right:1px!important}#hh-cc-dock a.hh-cron-selected{color:#d5adff!important}#hh-cc-dock a small{font-size:9px!important}@media(max-width:340px){#hh-cc-dock a small{font-size:8px!important}}';
  document.head.appendChild(style);
  return true;
 }
 const observer=new MutationObserver(()=>{if(add())observer.disconnect();});
 observer.observe(document.documentElement,{subtree:true,childList:true});
 old.onload=()=>{if(add())observer.disconnect();};
 document.head.appendChild(old);
 if(document.readyState==='complete')add();
})();
