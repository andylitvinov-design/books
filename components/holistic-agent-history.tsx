"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";

export type DialogueEntry={user:string;assistant:string;createdAt?:string};
type HistoryResponse={consent?:boolean;items?:DialogueEntry[];ownerBinding?:string};
const COPY={
 ru:{summary:"Текстовая история",privacy:"Отдельное разрешение: сохранить последние 30 пар реплик в зашифрованном виде в моём аккаунте. Аудиозаписи не хранятся. Я могу удалить историю в любой момент.",consent:"Сохранять мои текстовые диалоги",continue:"Продолжить прошлый разговор",show:"Просмотреть сохранённые сообщения",you:"Вы",assistant:"AI-проводник",erase:"Удалить историю и разрешение",empty:"Сохранённых реплик пока нет.",loading:"Загружаю…",error:"История временно недоступна. Разговор продолжится без сохранения.",failed:"Не удалось сохранить или изменить историю.",count:"Сохранено реплик:"},
 en:{summary:"Text conversation history",privacy:"Separate opt-in: encrypt and save my most recent 30 dialogue pairs in my account. Voice recordings are not saved. I can erase the history whenever I want.",consent:"Save my text conversations",continue:"Continue previous conversation",show:"View saved messages",you:"You",assistant:"AI guide",erase:"Erase history and permission",empty:"No saved conversation yet.",loading:"Loading…",error:"History is unavailable. The conversation can continue without saving.",failed:"Could not save or update history.",count:"Saved dialogue pairs:"},
 es:{summary:"Historial de texto",privacy:"Consentimiento separado: guardar cifrados los últimos 30 pares de mensajes en mi cuenta. No se guardan grabaciones de voz. Puedo borrar el historial cuando quiera.",consent:"Guardar mis conversaciones de texto",continue:"Continuar conversación anterior",show:"Ver mensajes guardados",you:"Tú",assistant:"Guía IA",erase:"Borrar historial y permiso",empty:"Todavía no hay conversaciones guardadas.",loading:"Cargando…",error:"El historial no está disponible. Puede continuar sin guardar.",failed:"No se pudo guardar o modificar el historial.",count:"Pares de mensajes guardados:"},
} as const;
export function usePrivateChatHistory({authenticated,onRestore}:{
 authenticated:boolean;onRestore:(items:DialogueEntry[])=>void;
}){
 const enabled=process.env.NEXT_PUBLIC_HH_AGENT_CHAT_HISTORY_ENABLED==="true";
 const owner=useRef("");
 const consentRef=useRef(false);
 const [status,setStatus]=useState<"idle"|"loading"|"ready"|"unavailable">("idle");
 const [consent,setConsent]=useState(false);
 const [items,setItems]=useState<DialogueEntry[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 useEffect(()=>{
  owner.current="";consentRef.current=false;setConsent(false);setItems([]);setError(false);
  if(!enabled||!authenticated){setStatus("idle");return;}
  const controller=new AbortController();
  setStatus("loading");
  fetch("/api/app/agent-chat-history",{
   method:"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal,
  }).then(async response=>{
   if(!response.ok)throw Error("HISTORY_NOT_READY");
   const data=await response.json() as HistoryResponse;
   if(controller.signal.aborted)return;
   const binding=typeof data.ownerBinding==="string"&&/^[0-9a-f]{64}$/u.test(data.ownerBinding)
    ?data.ownerBinding:"";
   if(!binding)throw Error("HISTORY_OWNER_INVALID");
   owner.current=binding;consentRef.current=data.consent===true;
   setConsent(consentRef.current);
   setItems(Array.isArray(data.items)?data.items.filter(entry=>
    typeof entry.user==="string"&&typeof entry.assistant==="string").slice(-30):[]);
   setStatus("ready");
  }).catch(()=>{if(!controller.signal.aborted)setStatus("unavailable");});
  return ()=>controller.abort();
 },[authenticated,enabled]);
 const changeConsent=useCallback(async (accepted:boolean)=>{
  if(!enabled||!authenticated||!owner.current||busy)return;
  setBusy(true);setError(false);
  try{
   const response=await fetch("/api/app/agent-chat-history",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","x-hh-chat-owner":owner.current},
    body:JSON.stringify({action:"consent",accepted}),
   });
   if(!response.ok)throw Error("HISTORY_CONSENT_FAILED");
   consentRef.current=accepted;setConsent(accepted);
   if(!accepted)setItems([]);
  }catch{setError(true);}
  finally{setBusy(false);}
 },[authenticated,busy,enabled]);
 const savePair=useCallback(async(user:string,assistant:string)=>{
  if(!enabled||!authenticated||!consentRef.current||!owner.current)return;
  const turnId=crypto.randomUUID();
  const binding=owner.current;
  try{
   const response=await fetch("/api/app/agent-chat-history",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","x-hh-chat-owner":binding},
    body:JSON.stringify({action:"append",turnId,user,assistant}),
   });
   if(!response.ok)throw Error("HISTORY_SAVE_FAILED");
   // Never add unconfirmed records to the visible archive.
   if(binding===owner.current&&consentRef.current)
    setItems(previous=>[...previous,{user,assistant}].slice(-30));
  }catch{if(binding===owner.current)setError(true);}
 },[authenticated,enabled]);
 const erase=useCallback(async()=>{
  if(!enabled||!authenticated||!owner.current||busy)return;
  setBusy(true);setError(false);
  try{
   const response=await fetch("/api/app/agent-chat-history",{
    method:"DELETE",credentials:"same-origin",cache:"no-store",
    headers:{"x-hh-chat-owner":owner.current},
   });
   if(!response.ok)throw Error("HISTORY_DELETE_FAILED");
   consentRef.current=false;setConsent(false);setItems([]);
  }catch{setError(true);}
  finally{setBusy(false);}
 },[authenticated,busy,enabled]);
 const restore=useCallback(()=>{if(consentRef.current&&items.length)onRestore(items);},[items,onRestore]);
 return {enabled,authenticated,status,consent,items,busy,error,changeConsent,savePair,erase,restore};
}
export type PrivateChatHistory=ReturnType<typeof usePrivateChatHistory>;
export function SecureDialogueHistory({history,locale}:{history:PrivateChatHistory;locale:PublicLocale}){
 if(!history.enabled||!history.authenticated)return null;
 const t=COPY[locale];
 return <details data-hh-secure-chat-history style={{
  padding:"8px 10px",border:"1px solid #e6dfd8",borderRadius:12,marginBlock:8,
 }}>
  <summary style={{cursor:"pointer",fontSize:14,fontWeight:600}}>{t.summary}</summary>
  <p style={{fontSize:13,lineHeight:1.45}}>{t.privacy}</p>
  {history.status==="loading"?<small role="status">{t.loading}</small>:
   history.status!=="ready"?<small role="status">{t.error}</small>:<>
    <label style={{display:"flex",gap:8,alignItems:"center",fontSize:14,minHeight:44}}>
     <input type="checkbox" checked={history.consent} disabled={history.busy}
      onChange={event=>void history.changeConsent(event.target.checked)}/>
     {t.consent}
    </label>
    {history.consent?<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
     <small>{history.items.length?t.count+" "+history.items.length:t.empty}</small>
     {history.items.length>0?<button type="button" onClick={history.restore}
      style={{minHeight:44}}>{t.continue}</button>:null}
     {history.items.length>0?<details style={{width:"100%"}}>
      <summary style={{cursor:"pointer",minHeight:44}}>{t.show}</summary>
      <div role="log" aria-label={t.show} style={{maxHeight:320,overflowY:"auto",padding:"8px 4px"}}>
       {history.items.map((item,index)=><div key={index} style={{marginBlock:10,fontSize:14,lineHeight:1.5}}>
        <strong>{t.you}:</strong> {item.user}
        <p><strong>{t.assistant}:</strong> {item.assistant}</p>
       </div>)}
      </div>
     </details>:null}
     <button type="button" disabled={history.busy} onClick={()=>void history.erase()}
      style={{minHeight:44}}>{t.erase}</button>
    </div>:null}
   </>}
  {history.error?<small role="alert">{t.failed}</small>:null}
 </details>;
}
