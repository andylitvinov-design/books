"use client";
import { useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";
import { approvedMemoryForLocalPrompt } from "@/lib/holistic-support/agent-memory-policy.mjs";
import styles from "./holistic-agent-memory-panel.module.css";

export type MyAgentMemory = {kind:string;value:string;updatedAt?:string};
type MemoryReply = {consent?:boolean;items?:MyAgentMemory[];error?:string;saved?:boolean;deleted?:boolean};
const kindLabels={
  ru:{preferred_name:"Как ко мне обращаться",communication_style:"Обращение",response_length:"Длина ответа",avoid_format:"Не предлагать формат",personal_accent:"Что ещё учитывать"},
  en:{preferred_name:"Preferred name",communication_style:"Address style",response_length:"Answer length",avoid_format:"Avoid this format",personal_accent:"Another preference"},
  es:{preferred_name:"Cómo llamarme",communication_style:"Forma de dirigirte",response_length:"Longitud de respuesta",avoid_format:"No sugerir formato",personal_accent:"Otra preferencia"},
} as const;
const t={
  ru:{open:"Память агента",close:"Закрыть",title:"Что мне учитывать в будущих разговорах",privacy:"Сохраняются только выбранные вами пожелания, в зашифрованном виде в вашем аккаунте. История чата и результаты тестов здесь не сохраняются. Не вводите медицинские данные и пароли.",signed:"Чтобы сохранять память, войдите в личный кабинет.",unavailable:"Память сейчас недоступна; беседа без неё продолжит работать.",load:"Загрузка памяти…",enable:"Разрешить сохранять мои пожелания",disable:"Отозвать согласие и очистить память",use:"Учитывать сохранённые пожелания в этом диалоге (только на устройстве)",save:"Сохранить",delete:"Удалить",erase:"Удалить всю память",export:"Скопировать мои записи",empty:"Пока нет записей.",saveError:"Не получилось сохранить. Ничего не изменилось.",consentError:"Не получилось изменить согласие.",options:{style:["нейтрально","на вы","на ты"],length:["обычно","коротко","подробно"],avoid:["видео","аудио","тест","курс","сессии"]},namePlaceholder:"Например, Алекс",notePlaceholder:"Краткое пожелание, не медицинская история"},
  en:{open:"Agent memory",close:"Close",title:"What should I keep in mind in future chats?",privacy:"Only the preferences you explicitly choose are saved, encrypted in your account. Chat history and test results are never saved here. Please don't enter medical details or passwords.",signed:"Sign in to your account to save preferences.",unavailable:"Memory is currently unavailable. You can keep chatting without it.",load:"Loading memory…",enable:"Allow saving my preferences",disable:"Revoke consent and clear memory",use:"Use my saved preferences in this conversation (on-device only)",save:"Save",delete:"Remove",erase:"Erase all memory",export:"Copy my saved entries",empty:"No entries yet.",saveError:"Could not save. Your previous entry is unchanged.",consentError:"Could not update consent.",options:{style:["neutral","formal","informal"],length:["normal","short","detailed"],avoid:["video","audio","test","course","session"]},namePlaceholder:"For example, Alex",notePlaceholder:"One brief preference, not medical history"},
  es:{open:"Memoria del agente",close:"Cerrar",title:"¿Qué debo tener en cuenta en futuras charlas?",privacy:"Solo guardamos las preferencias que eliges explícitamente, cifradas en tu cuenta. Aquí no guardamos el historial ni los resultados de tests. No introduzcas información médica ni contraseñas.",signed:"Inicia sesión para guardar tus preferencias.",unavailable:"La memoria no está disponible; puedes conversar sin ella.",load:"Cargando…",enable:"Permitir guardar mis preferencias",disable:"Retirar consentimiento y borrar memoria",use:"Usar mis preferencias en esta conversación (solo en el dispositivo)",save:"Guardar",delete:"Eliminar",erase:"Borrar toda la memoria",export:"Copiar mis preferencias",empty:"Aún no hay entradas.",saveError:"No se pudo guardar; no hubo cambios.",consentError:"No se pudo actualizar el consentimiento.",options:{style:["neutro","formal","informal"],length:["normal","breve","detallado"],avoid:["vídeo","audio","test","curso","sesión"]},namePlaceholder:"Por ejemplo, Alex",notePlaceholder:"Una preferencia breve, no datos médicos"},
} as const;
const keys=["preferred_name","communication_style","response_length","avoid_format","personal_accent"] as const;
const selectValues={
  communication_style:["neutral","formal","informal"],
  response_length:["normal","short","detailed"],
  avoid_format:["video","audio","test","course","service"],
} as const;
const emptyDraft={preferred_name:"",communication_style:"neutral",response_length:"normal",avoid_format:"video",personal_accent:""};
export function HolisticAgentMemoryPanel({locale,onUse}:{
  locale:PublicLocale;onUse:(items:MyAgentMemory[])=>void;
}){
  const copy=t[locale];
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false);
  const [status,setStatus]=useState<"idle"|"ready"|"signed"|"unavailable">("idle");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [consent,setConsent]=useState(false),[useSaved,setUseSaved]=useState(false);
  const [items,setItems]=useState<MyAgentMemory[]>([]);
  const [drafts,setDrafts]=useState<Record<typeof keys[number],string>>(emptyDraft);
  const enabled=process.env.NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED==="true";
  if(!enabled)return null;
  const headers={"Content-Type":"application/json"} as const;
  async function read(){
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/app/agent-memory",{credentials:"same-origin",cache:"no-store"});
      if(response.status===401){setStatus("signed");return;}
      if(!response.ok){setStatus("unavailable");return;}
      const data=await response.json() as MemoryReply;
      const rows=Array.isArray(data.items)?data.items:[];
      setItems(rows);setConsent(data.consent===true);
      setDrafts({...emptyDraft,...Object.fromEntries(rows.map(row=>[row.kind,row.value]))});
      setStatus("ready");
      if(useSaved)onUse(data.consent===true?approvedMemoryForLocalPrompt(rows):[]);
    }catch{setStatus("unavailable");}
    finally{setLoading(false);}
  }
  function show(){
    if(open){setOpen(false);return;}
    setOpen(true);void read();
  }
  async function action(body:Record<string,unknown>,method:"POST"|"DELETE"="POST"){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/app/agent-memory",{
        method,credentials:"same-origin",headers:method==="POST"?headers:undefined,
        body:method==="POST"?JSON.stringify(body):undefined,cache:"no-store",
      });
      if(!response.ok){setError(body.action==="consent"?copy.consentError:copy.saveError);return false;}
      await read();return true;
    }catch{setError(copy.saveError);return false;}
    finally{setBusy(false);}
  }
  async function setConsent(accepted:boolean){
    if(!accepted){setUseSaved(false);onUse([]);}
    await action({action:"consent",accepted});
  }
  async function erase(){
    setUseSaved(false);onUse([]);
    await action({},"DELETE");
  }
  const change=(kind:typeof keys[number],value:string)=>setDrafts(prev=>({...prev,[kind]:value}));
  return <section className={styles.root} data-agent-memory>
    <button type="button" className={styles.toggle} onClick={show} aria-expanded={open}>{copy.open}</button>
    {open ? <div className={styles.panel} aria-label={copy.title}>
      <header><strong>{copy.title}</strong><button onClick={()=>setOpen(false)} type="button">{copy.close}</button></header>
      <p className={styles.note}>{copy.privacy}</p>
      {loading?<p role="status">{copy.load}</p>:
        status==="signed"?<p>{copy.signed}</p>:
        status==="unavailable"?<p role="status">{copy.unavailable}</p>:
        status==="ready"?<>
          <label className={styles.check}><input type="checkbox" checked={consent}
            disabled={busy} onChange={e=>void setConsent(e.target.checked)}/>
            {consent?copy.disable:copy.enable}
          </label>
          {consent ? <>
            <label className={styles.check}><input type="checkbox" checked={useSaved}
              onChange={e=>{setUseSaved(e.target.checked);onUse(e.target.checked?approvedMemoryForLocalPrompt(items):[]);}}/>
              {copy.use}
            </label>
            {keys.map(kind=>{
              const options=kind==="communication_style"?selectValues.communication_style:
                kind==="response_length"?selectValues.response_length:
                kind==="avoid_format"?selectValues.avoid_format:null;
              const labels=kind==="communication_style"?copy.options.style:
                kind==="response_length"?copy.options.length:
                kind==="avoid_format"?copy.options.avoid:null;
              return <div className={styles.field} key={kind}>
                <label htmlFor={"agent-memory-"+kind}>{kindLabels[locale][kind]}</label>
                {options && labels?<select id={"agent-memory-"+kind} value={drafts[kind]}
                  onChange={e=>change(kind,e.target.value)}>
                  {options.map((value,index)=><option key={value} value={value}>{labels[index]}</option>)}
                </select>:
                <input id={"agent-memory-"+kind} type="text"
                  maxLength={kind==="preferred_name"?60:160}
                  placeholder={kind==="preferred_name"?copy.namePlaceholder:copy.notePlaceholder}
                  value={drafts[kind]} onChange={e=>change(kind,e.target.value)}/>}
                <div className={styles.actions}><button type="button" disabled={busy||!drafts[kind].trim()}
                  onClick={()=>void action({action:"set",kind,value:drafts[kind]})}>{copy.save}</button>
                  {items.some(x=>x.kind===kind)?<button type="button" disabled={busy}
                    onClick={()=>void action({action:"remove",kind})}>{copy.delete}</button>:null}
                </div>
              </div>;
            })}
            <p className={styles.note}>{items.length?items.map(row=>kindLabels[locale][row.kind as keyof typeof kindLabels.ru]+": "+row.value).join(" · "):copy.empty}</p>
            <div className={styles.actions}>
              <button type="button" disabled={!items.length||busy} onClick={()=>{
                const text=items.map(row=>row.kind+": "+row.value).join("\n");
                void navigator.clipboard?.writeText(text);
              }}>{copy.export}</button>
              <button type="button" className={styles.erase} disabled={busy} onClick={()=>void erase()}>{copy.erase}</button>
            </div>
          </>:null}
        </>:null}
      {error?<p role="alert" className={styles.error}>{error}</p>:null}
    </div>:null}
  </section>;
}
