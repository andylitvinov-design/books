'use client';
import {useEffect,useState} from 'react';
const TRUSTED_ORIGIN='https://holistic-house-pr-monitor.vercel.app';
const MESSAGE='HH_COMMANDER_AUTOMATIONS_BRIDGE_V1';
export default function AutomationsBridge(){
 const [state,setState]=useState('Подключение к Agent Commander…');
 useEffect(()=>{
  const nonce=new URLSearchParams(window.location.search).get('nonce');
  const opener=window.opener;
  if(!opener||!nonce||!/^[a-f0-9]{32}$/.test(nonce)){
   setState('Не удалось подтвердить запрос приложения. Откройте подключение ещё раз.');return;
  }
  let closed=false;
  const allowed=['read','write'];
  async function handler(event){
   if(closed||event.origin!==TRUSTED_ORIGIN||event.source!==opener)return;
   const msg=event.data;
   if(!msg||msg.type!==MESSAGE||msg.nonce!==nonce||!allowed.includes(msg.operation)||
     typeof msg.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(msg.requestId))return;
   if(msg.operation==='write'&&(typeof msg.payload!=='object'||!msg.payload||
      JSON.stringify(msg.payload).length>10000))return;
   try{
    const response=await fetch('/api/admin/command-center/skills',{
     method:msg.operation==='read'?'GET':'POST',credentials:'same-origin',
     cache:'no-store',headers:{'Accept':'application/json',...(msg.operation==='write'?{'Content-Type':'application/json'}:{})},
     ...(msg.operation==='write'?{body:JSON.stringify(msg.payload)}:{})
    });
    let data;
    try{data=await response.json();}catch{data={error:'INVALID_SERVER_RESPONSE'};}
    if(!closed)opener.postMessage({type:MESSAGE,kind:'response',nonce,requestId:msg.requestId,status:response.status,data},TRUSTED_ORIGIN);
    setState(response.ok?'Защищённое соединение активно. Продолжайте в Agent Commander.':'Проверьте доступ владельца в Holistic House.');
   }catch{
    if(!closed)opener.postMessage({type:MESSAGE,kind:'response',nonce,requestId:msg.requestId,status:503,data:{error:'BRIDGE_UNAVAILABLE'}},TRUSTED_ORIGIN);
   }
  }
  window.addEventListener('message',handler);
  opener.postMessage({type:MESSAGE,kind:'ready',nonce},TRUSTED_ORIGIN);
  setState('Соединение активно. Оставьте эту вкладку открытой во время редактирования.');
  return()=>{closed=true;window.removeEventListener('message',handler);};
 },[]);
 return <main style={{maxWidth:440,margin:'48px auto',padding:24,fontFamily:'system-ui',lineHeight:1.6}}>
  <h1 style={{fontSize:22}}>Agent Commander · защищённый редактор</h1>
  <p role="status">{state}</p>
  <p>Тексты заданий и записи хранятся только в приватной базе Holistic House. Другие сайты не получают доступ к вашей сессии или cookie.</p>
  <a href="/admin/command-center/automations">Открыть редактор непосредственно здесь</a>
 </main>;
}
