"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import styles from "./public-enquiry-guest-chat.module.css";

type Locale="en"|"ru"|"es";
type Message={id:string;author:"guest"|"operator";text:string;createdAt:string};
type Case={id:string;referenceCode:string;serviceTitle:string;status:string};
type ReadResult={enquiry:Case;messages:Message[];hasMore:boolean;mode:string};
const COPY={
  en:{title:"Private enquiry conversation",busy:"Opening your private conversation…",
    invalid:"This browser has no valid access to this request. Use the original browser or contact Holistic House.",
    service:"Service",number:"Reference",message:"Your message",placeholder:"Write to the practitioner…",
    send:"Send message",sending:"Saving…",refresh:"Refresh conversation",error:"The message was not saved. Retry without changing the text.",refreshError:"Message saved, but the conversation did not refresh. Use Refresh.",
    noMessages:"No replies yet. Your original enquiry is safely saved in CRM.",
    closed:"This enquiry is closed. Earlier messages remain visible.",
    privacy:"Only participants in this enquiry can see these encrypted messages. A saved reply is not proof the other person has read it.",
    warning:"Use this chat for scheduling and ordinary questions. Do not include personal contact links or medical documents.",
    back:"Holistic House services",older:"Only the latest 100 messages are shown.",
    mine:"You",operator:"Holistic House"},
  ru:{title:"Личная переписка по заявке",busy:"Открываем защищённый диалог…",
    invalid:"На этом устройстве нет подтверждённого доступа к заявке. Вернитесь в исходный браузер или свяжитесь с Holistic House.",
    service:"Услуга",number:"Номер заявки",message:"Ваше сообщение",placeholder:"Напишите мастеру…",
    send:"Отправить сообщение",sending:"Сохраняем…",refresh:"Обновить переписку",error:"Сообщение не было сохранено. Повторите без изменения текста.",refreshError:"Сообщение сохранено, но переписка не обновилась. Нажмите «Обновить».",
    noMessages:"Ответов пока нет. Исходная заявка сохранена в CRM.",
    closed:"Заявка закрыта. Предыдущие сообщения остаются видимыми.",
    privacy:"Зашифрованные сообщения доступны только участникам заявки. Сохранение ответа не означает, что собеседник прочитал его.",
    warning:"Используйте чат для записи и обычных вопросов. Не отправляйте личные контактные ссылки и медицинские документы.",
    back:"Услуги Holistic House",older:"Показаны только последние 100 сообщений.",
    mine:"Вы",operator:"Holistic House"},
  es:{title:"Conversación privada de la solicitud",busy:"Abriendo conversación privada…",
    invalid:"Este navegador no tiene acceso verificado. Vuelve al navegador original o contacta con Holistic House.",
    service:"Servicio",number:"Referencia",message:"Tu mensaje",placeholder:"Escribe al profesional…",
    send:"Enviar mensaje",sending:"Guardando…",refresh:"Actualizar conversación",error:"No se guardó el mensaje. Reinténtalo sin cambiar el texto.",refreshError:"Mensaje guardado, pero el chat no se actualizó. Usa Actualizar.",
    noMessages:"Todavía no hay respuestas. La solicitud original está guardada en CRM.",
    closed:"La solicitud está cerrada. Los mensajes anteriores siguen visibles.",
    privacy:"Solo quienes participan en esta solicitud pueden leer estos mensajes cifrados. Guardar no confirma la lectura.",
    warning:"Utiliza este chat para citas y preguntas habituales. No envíes enlaces personales ni documentos médicos.",
    back:"Servicios Holistic House",older:"Solo se muestran los últimos 100 mensajes.",
    mine:"Tú",operator:"Holistic House"},
} as const;

export default function PublicEnquiryGuestChat({locale,enquiryId}:{locale:Locale;enquiryId:string}){
  const t=COPY[locale];
  const [data,setData]=useState<ReadResult|null>(null);
  const [loading,setLoading]=useState(true);
  const [accessDenied,setAccessDenied]=useState(false);
  const [busy,setBusy]=useState(false);
  const [draft,setDraft]=useState("");
  const [error,setError]=useState("");
  const pending=useRef<{id:string;text:string}|null>(null);
  const endpoint="/api/public-enquiry-chat?"+new URLSearchParams({enquiry:enquiryId});
  const reload=useCallback(async(signal?:AbortSignal)=>{
    const response=await fetch(endpoint,{credentials:"same-origin",cache:"no-store",signal});
    if(!response.ok)throw Error(response.status===401?"GUEST_ACCESS_REQUIRED":"CHAT_READ_FAILED");
    const result=await response.json();
    if(result?.mode!=="verified_guest_browser"||result.enquiry?.id!==enquiryId||
       !Array.isArray(result.messages))throw Error("INVALID_GUEST_CHAT_RESPONSE");
    if(!signal?.aborted)setData(result as ReadResult);
  },[endpoint,enquiryId]);
  useEffect(()=>{
    const controller=new AbortController();
    setData(null);setAccessDenied(false);setLoading(true);setError("");
    reload(controller.signal).catch(e=>{
      if(!controller.signal.aborted){
        setAccessDenied(e.message==="GUEST_ACCESS_REQUIRED"||e.message==="CHAT_READ_FAILED");
        setError(t.invalid);
      }
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return ()=>controller.abort();
  },[reload,t.invalid]);
  async function send(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const text=draft.trim();
    if(!text||busy||accessDenied||!data||!["requested","contacted"].includes(data.enquiry.status))return;
    const old=pending.current;
    const operation=old&&old.text===text?old:{id:crypto.randomUUID(),text};
    pending.current=operation;
    setBusy(true);setError("");
    try{
      const response=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({operationId:operation.id,text})});
      const result=await response.json().catch(()=>null);
      if(!response.ok||result?.stored!==true)throw Error("SEND_NOT_CONFIRMED");
      setDraft("");pending.current=null;
      // The POST was committed; a later refresh failure must not invite
      // resubmitting a successfully saved message.
      await reload().catch(()=>setError(t.refreshError));
    }catch{setError(t.error)}
    finally{setBusy(false)}
  }
  const mayReply=Boolean(data&&["requested","contacted"].includes(data.enquiry.status));
  return <main className={styles.root}>
    <header className={styles.header}><Link href={"/"+locale+"/services"}>{t.back}</Link><h1>{t.title}</h1></header>
    {loading?<p role="status">{t.busy}</p>:
      accessDenied||!data?<p role="alert">{t.invalid}</p>:<>
        <div className={styles.case}>
          <strong>{t.service}: {data.enquiry.serviceTitle}</strong>
          <span>{t.number}: {data.enquiry.referenceCode}</span>
        </div>
        <p className={styles.notice}>{t.warning}</p>
        <div className={styles.timeline} role="log" aria-live="polite" aria-label={t.title}>
          {data.messages.length?data.messages.map(message=><div key={message.id}
            className={message.author==="guest"?styles.guest:styles.operator}>
            <strong>{message.author==="guest"?t.mine:t.operator}</strong>
            <p>{message.text}</p>
            <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString(locale)}</time>
          </div>):<p>{t.noMessages}</p>}
          {data.hasMore&&<p className={styles.notice}>{t.older}</p>}
        </div>
        <button type="button" className={styles.refresh} disabled={busy}
          onClick={()=>{void reload().catch(()=>setError(t.error))}}>{t.refresh}</button>
        {mayReply?<form className={styles.compose} onSubmit={send}>
          <label htmlFor="hh-guest-chat-composer">{t.message}</label>
          <textarea id="hh-guest-chat-composer" rows={3} maxLength={1200}
            value={draft} disabled={busy} placeholder={t.placeholder}
            onChange={event=>{setDraft(event.target.value);setError("")}}/>
          <button type="submit" disabled={busy||!draft.trim()}>{busy?t.sending:t.send}</button>
        </form>:<p className={styles.notice}>{t.closed}</p>}
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.notice}>{t.privacy}</p>
      </>}
  </main>;
}
