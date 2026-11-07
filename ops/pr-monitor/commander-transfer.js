'use strict';
/* Explicit browser-window transfer. No task in URLs, no new API or write privileges. */
(function(win){
 if(!win||win.HHCommanderTransfer)return;
 const ORIGIN='https://holistichouse.vercel.app',URL=ORIGIN+'/admin/command-center';
 const PROTOCOL='hh.commander.task-transfer.v1';
 let running=null;
 const clip=(v,n)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,n);
 function section(text,start,end,max){
  const from=text.indexOf(start);
  if(from<0)return '';
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
 function stop(){
  const old=running;running=null;if(!old)return;
  win.removeEventListener('message',old.listener);
  win.clearInterval(old.timer);win.clearTimeout(old.expiry);
 }
 function begin({raw,fullPrompt},status){
  const source=String(raw||'').trim().slice(0,2500);
  if(source.length<8){if(status)status.textContent='Сначала опишите задачу.';return false}
  if(typeof win.crypto?.randomUUID!=='function'){
   if(status)status.textContent='Безопасная передача недоступна. Скопируйте промпт вручную.';return false;
  }
  stop();const popup=win.open(URL,'_blank');
  if(!popup){if(status)status.textContent='Открытие окна заблокировано. Используйте «Копировать промпт».';return false}
  const nonce=win.crypto.randomUUID(),full=String(fullPrompt||source).trim().slice(0,8500);
  const task={title:clip(source,140),summary:summarize(source,full),fullPrompt:full};
  let phase='HELLO',attempts=0;
  const listener=e=>{
   if(e.origin!==ORIGIN||e.source!==popup)return;
   const reply=e.data;
   if(!reply||reply.protocol!==PROTOCOL||reply.nonce!==nonce)return;
   if(reply.type==='READY'&&phase==='HELLO'){
    phase='DRAFT';
    try{popup.postMessage({protocol:PROTOCOL,type:'DRAFT',nonce,task},ORIGIN)}catch{}
    if(status)status.textContent='Кабинет открыт. Передаю черновик для проверки…';
   }else if(reply.type==='RECEIVED_FOR_REVIEW'&&phase==='DRAFT'&&reply.saved===false&&reply.agentStarted===false){
    if(status)status.textContent='Черновик передан. Проверьте и нажмите «Сохранить задачу» в защищённом кабинете. Полный промпт можно скопировать там.';
    stop();
   }
  };
  running={listener,timer:null,expiry:null};win.addEventListener('message',listener);
  const ping=()=>{
   if(!running)return;
   if(popup.closed){if(status)status.textContent='Окно кабинета закрыто. Черновик не сохранён.';stop();return}
   if(phase==='HELLO'){try{popup.postMessage({protocol:PROTOCOL,type:'HELLO',nonce},ORIGIN)}catch{}}
   else if(phase==='DRAFT'&&attempts++<8){try{popup.postMessage({protocol:PROTOCOL,type:'DRAFT',nonce,task},ORIGIN)}catch{}}
  };
  ping();running.timer=win.setInterval(ping,1600);
  running.expiry=win.setTimeout(()=>{
   if(status)status.textContent='Передача не подтверждена. После входа повторите отправку или скопируйте текст вручную.';
   stop();
  },120000);
  if(status)status.textContent='Открыл защищённый кабинет. После авторизации черновик будет передан для проверки, но не сохранится автоматически.';
  return true;
 }
 win.HHCommanderTransfer={begin,stop,summarize};
 if(typeof module!=='undefined'&&module.exports)module.exports=win.HHCommanderTransfer;
})(typeof window==='undefined'?globalThis:window);
