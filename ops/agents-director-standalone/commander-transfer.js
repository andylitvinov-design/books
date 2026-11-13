'use strict';
/* Same-site task transfer: in this tab, never to Holistic House admin.
 * sessionStorage is a 10-minute transport envelope, NOT persisted task storage.
 * Owner authorization is enforced by /api/seo-auth and owner-only write APIs.
 */
(function(win){
 if(!win||win.HHCommanderTransfer)return;
 const PATH='/task-editor.html',KEY='hh.commander.handoff.v2';
 const clip=(v,n)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,n);
 function section(text,start,end,max){
  const from=text.indexOf(start);if(from<0)return '';
  const a=from+start.length,b=end?text.indexOf(end,a):-1;
  return clip(text.slice(a,b<0?undefined:b),max);
 }
 function summarize(raw,prompt){
  const text=[
   'Исходная задача: '+clip(raw,140),
   section(prompt,'1. ЧТО НАДО ВЫПОЛНИТЬ','2. КАКОЙ РЕЗУЛЬТАТ',180),
   section(prompt,'2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ','3. ОРИЕНТИРЫ КАЧЕСТВА',140),
   section(prompt,'3. ОРИЕНТИРЫ КАЧЕСТВА','4. КОНТЕКСТ БИЗНЕСА',115),
   section(prompt,'4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА','5.',140)
  ].filter(Boolean).join('\n').slice(0,800);
  return text.length>=10?text:clip(raw,800);
 }
 function begin({raw,fullPrompt,relatedPr},status){
  const source=String(raw||'').trim().slice(0,2500);
  if(source.length<8){if(status)status.textContent='Сначала опишите задачу.';return false}
  if(!win.sessionStorage||!win.location?.assign){
   if(status)status.textContent='Передача недоступна в браузере. Скопируйте промпт вручную.';return false;
  }
  const packet={version:2,at:Date.now(),raw:source,fullPrompt:String(fullPrompt||'').trim().slice(0,15000),
   summary:summarize(source,String(fullPrompt||'')),
   relatedPr:[...new Set((Array.isArray(relatedPr)?relatedPr:[]).filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000))].slice(0,15)};
  try{
   win.sessionStorage.setItem(KEY,JSON.stringify(packet));
   // No URL parameters, cross-origin messaging, popup or public task write.
   win.location.assign(PATH);
   if(status)status.textContent='Открываю защищённый редактор на этом же сайте. Задача ещё не сохранена.';
   return true;
  }catch(e){
   try{win.sessionStorage.removeItem(KEY)}catch{}
   if(status)status.textContent='Браузер заблокировал передачу. Скопируйте промпт и откройте редактор вручную.';
   return false;
  }
 }
 win.HHCommanderTransfer={begin,summarize,path:PATH,transportKey:KEY};
 if(typeof module!=='undefined'&&module.exports)module.exports=win.HHCommanderTransfer;
})(typeof window==='undefined'?globalThis:window);
