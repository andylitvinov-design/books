"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./monthly-support-thread.module.css";

type Message={id:string;text:string;mine:boolean;sentAt:string};
const copy={
  en:{title:"Private messages",privacy:"Only you and the practitioner can read these messages. Not emergency care.",placeholder:"Write a question…",send:"Send privately",refresh:"Refresh",loading:"Loading messages…",empty:"No messages yet.",closed:"This month has ended; you can still read previous messages.",error:"Message could not be saved or loaded. Please retry."},
  ru:{title:"Защищённая переписка",privacy:"Сообщения доступны только вам и мастеру. Не для экстренной помощи.",placeholder:"Напишите вопрос…",send:"Отправить приватно",refresh:"Обновить",loading:"Загружаем сообщения…",empty:"Пока нет сообщений.",closed:"Срок месяца завершён. Переписка доступна для чтения.",error:"Не удалось загрузить или сохранить сообщение. Повторите попытку."},
  es:{title:"Mensajes privados",privacy:"Solo tú y el profesional pueden leer los mensajes. No es atención urgente.",placeholder:"Escribe una pregunta…",send:"Enviar en privado",refresh:"Actualizar",loading:"Cargando mensajes…",empty:"Todavía no hay mensajes.",closed:"El mes ha terminado; los mensajes anteriores siguen disponibles.",error:"No se pudo cargar o guardar el mensaje. Inténtalo otra vez."},
} as const;
export function MonthlySupportThread({programId,locale}:{programId:string;locale:PublicLocale}){
  const t=copy[locale],endpoint="/api/client/personal-support/"+encodeURIComponent(programId)+"/messages";
  const [messages,setMessages]=useState<Message[]|null>(null),[canSend,setCanSend]=useState(false);
  const [body,setBody]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const operation=useRef<string|null>(null);
  async function load(){
    const response=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!Array.isArray(data?.messages))throw Error("LOAD_FAILED");
    setMessages(data.messages);setCanSend(data.canReply===true);
  }
  useEffect(()=>{
    let alive=true;
    fetch(endpoint,{credentials:"same-origin",cache:"no-store"}).then(async r=>{
      const data=await r.json();if(!r.ok||!Array.isArray(data.messages))throw Error("LOAD_FAILED");return data;
    }).then(data=>{if(alive){setMessages(data.messages);setCanSend(data.canReply===true)}})
      .catch(()=>{if(alive)setError(t.error)});
    return ()=>{alive=false};
  },[endpoint,t.error]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||!canSend||!body.trim()||body.trim().length>1200)return;
    setBusy(true);setError("");
    try{
      operation.current ||= window.crypto.randomUUID();
      const response=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({operationId:operation.current,text:body.trim()})});
      const data=await response.json().catch(()=>null);
      if(!response.ok||data?.saved!==true)throw Error("SEND_FAILED");
      setBody("");operation.current=null;await load();
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  return <section className={styles.thread} data-monthly-support-messages lang={locale}>
    <h3>{t.title}</h3><p className={styles.privacy}>{t.privacy}</p>
    {messages===null&&!error?<p role="status">{t.loading}</p>:null}
    {messages?.length===0?<p>{t.empty}</p>:null}
    {messages&&messages.length>0?<ol className={styles.list}>{messages.map(m=><li key={m.id} className={m.mine?styles.mine:styles.other}>
      <small>{m.mine?"✓ ":""}{new Date(m.sentAt).toLocaleString(locale)}</small><p>{m.text}</p>
    </li>)}</ol>:null}
    {canSend?<form onSubmit={submit}>
      <label>{t.title}<textarea value={body} rows={3} maxLength={1200} required placeholder={t.placeholder}
        onChange={e=>{setBody(e.target.value);operation.current=null;setError("")}}/></label>
      <button type="submit" disabled={busy||!body.trim()}>{busy?"…":t.send}</button>
    </form>:messages!==null?<p className={styles.privacy}>{t.closed}</p>:null}
    <button type="button" className={styles.refresh} disabled={busy}
      onClick={()=>{setError("");void load().catch(()=>setError(t.error))}}>{t.refresh}</button>
    {error?<p role="alert" className={styles.error}>{error}</p>:null}
  </section>;
}
