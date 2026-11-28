"use client";
import {useEffect,useState} from 'react';
const copy={
 ru:{title:'Gemini · доступ',intro:'Gemini отвечает на общие вопросы. Личные сведения и история разговора не передаются. Google может использовать общедоступные запросы и ответы для улучшения моделей.',adult:'Мне исполнилось 18 лет.',region:'Я нахожусь в регионе, где разрешён бесплатный Gemini (не ЕС/ЕЭЗ, Великобритания или Швейцария).',consent:'Разрешаю обработку только общедоступных тем в Gemini Free.',request:'Запросить доступ',pending:'Запрос сохранён. Необходима проверка допуска.',eligible:'Доступ подтверждён. Ответ Gemini отмечается отдельно.',revoke:'Отозвать согласие',off:'Доступ не активирован.',error:'Не удалось проверить или сохранить доступ.',loading:'Проверяем доступ…'},
 en:{title:'Gemini · access',intro:'Gemini answers general questions. Personal information and conversation history are not sent. Google may use public inputs and outputs to improve models.',adult:'I am at least 18 years old.',region:'I am in a region eligible for free Gemini (not the EEA, UK or Switzerland).',consent:'I consent to Gemini Free processing public topics only.',request:'Request access',pending:'Request saved. Eligibility review is required.',eligible:'Access confirmed. Gemini answers are labelled separately.',revoke:'Withdraw consent',off:'Access not enabled.',error:'Could not check or save access.',loading:'Checking access…'},
 es:{title:'Gemini · acceso',intro:'Gemini responde preguntas generales. No se envían datos personales ni el historial. Google puede utilizar entradas públicas y respuestas para mejorar sus modelos.',adult:'Tengo al menos 18 años.',region:'Estoy en una región apta para Gemini gratuito (fuera del EEE, Reino Unido y Suiza).',consent:'Acepto que Gemini Free procese solo temas públicos.',request:'Solicitar acceso',pending:'Solicitud guardada. Se requiere verificar la elegibilidad.',eligible:'Acceso confirmado. Las respuestas Gemini se identifican por separado.',revoke:'Retirar consentimiento',off:'Acceso no activado.',error:'No se pudo verificar o guardar el acceso.',loading:'Comprobando acceso…'}
};
type Status='not_enabled'|'pending'|'eligible';
const endpoint='/api/holistic-agent/gemini-access';
export default function WaveGeminiAccess({locale}:{locale:'ru'|'en'|'es'}){
 const t=copy[locale]||copy.en;
 const [open,setOpen]=useState(false),[status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [adult,setAdult]=useState(false),[region,setRegion]=useState(false),[consent,setConsent]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  setStatus(null);setError(false);
  void fetch(endpoint,{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('access');
   const d=await r.json();
   if(!['not_enabled','pending','eligible'].includes(d.status))throw Error('access');
   if(!controller.signal.aborted)setStatus(d.status);
  }).catch(()=>{if(!controller.signal.aborted)setError(true);});
  return ()=>controller.abort();
 },[open]);
 async function change(action:'request'|'revoke'){
  if(busy||action==='request'&&!(adult&&region&&consent))return;
  setBusy(true);setError(false);
  try{
   const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='request'?{action,adultDeclared:adult,regionDeclared:region,publicConsent:consent}:{action})});
   if(!r.ok)throw Error('access');
   const d=await r.json();if(!['not_enabled','pending','eligible'].includes(d.status))throw Error('access');
   setStatus(d.status);setAdult(false);setRegion(false);setConsent(false);
  }catch{setError(true);}finally{setBusy(false);}
 }
 return <details onToggle={e=>setOpen(e.currentTarget.open)} data-hh-wave-gemini-access><summary>{t.title}</summary>
  <div style={{display:'grid',gap:8,padding:8,fontSize:13}}>
   <p>{t.intro}</p><p role="status">{error?t.error:status==='eligible'?t.eligible:status==='pending'?t.pending:status==='not_enabled'?t.off:t.loading}</p>
   {status==='not_enabled'&&<><label><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)}/>{t.adult}</label>
   <label><input type="checkbox" checked={region} onChange={e=>setRegion(e.target.checked)}/>{t.region}</label>
   <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t.consent}</label>
   <button type="button" disabled={busy||!adult||!region||!consent} onClick={()=>void change('request')}>{t.request}</button></>}
   {(status==='eligible'||status==='pending')&&<button type="button" disabled={busy} onClick={()=>void change('revoke')}>{t.revoke}</button>}
  </div></details>;
}
