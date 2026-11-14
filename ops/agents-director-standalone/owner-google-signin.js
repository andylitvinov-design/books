(function(win,doc){
 'use strict';
 const MAIN='https://holistichouse.vercel.app';
 const allowed=new Set(['/agents.html','/pr-monitor.html','/task-editor.html','/chats.html','/projects.html','/memory.html','/ci-errors.html']);
 function nextPath(){
  try{
   const u=new URL(win.location.href),path=u.pathname;
   if(!allowed.has(path))return '/agents.html';
   if(path==='/chats.html'){
    const entries=[...u.searchParams.entries()];
    if(entries.length&&!(entries.length===1&&entries[0][0]==='task'&&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entries[0][1])))return path;
    return path+u.search;
   }
   return path;
  }catch{return '/agents.html'}
 }
 function mount(slot,onStatus){
  if(!slot||slot.dataset.hhSsoMounted==='yes')return;
  slot.dataset.hhSsoMounted='yes';slot.classList.add('hh-sso-slot');
  const status=doc.createElement('p');status.className='hh-sso-status';
  status.textContent='Вход через существующий Google-аккаунт Holistic House.';slot.append(status);
  const link=doc.createElement('a');link.className='hh-sso-button cc-primary';
  link.href=MAIN+'/commander-connect.html?next='+encodeURIComponent(nextPath());
  link.textContent='Продолжить через Google';
  slot.append(link);
  if(typeof onStatus==='function')onStatus('Откройте существующую страницу Google-входа Holistic House.');
 }
 win.HHGoogleOwnerSSO={mount};
})(window,document);
