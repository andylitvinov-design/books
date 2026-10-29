"use client";

import { useRef, useState, type FormEvent } from "react";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-agent-chat.module.css";

type Mode = "rules" | "device" | "owned";
type Message = { role: "user" | "assistant"; text: string };
type AgentDecision = { status: string; message?: string; question?: {key:string;text:string}|null;
  suggestions?: {id:string;kind:string;title:string;href:string}[] };
type AgentReply = { status:string;reply:string;modelUsed:boolean;source:string;
  suggestions:{id:string;kind:string;title:string;href:string}[];decision:AgentDecision;
  browserModelAllowed:boolean };
const copy = {
  ru:{ title:"Разговор с AI-проводником",disclosure:"Я — AI-проводник Holistic House, не человек и не психотерапевт.",
    intro:"Опишите свой вопрос свободными словами. Личные результаты тестов пока не читаются и не сохраняются.",
    placeholder:"Что сейчас для вас важно?",send:"Отправить",cancel:"Остановить",mode:"Способ ответа",
    rules:"Без нейросети",device:"AI на устройстве (может потребоваться загрузка модели)",owned:"AI на нашем сервере (с согласия)",
    consent:"Разрешаю передать этот текст на собственный защищённый AI-сервер Holistic House.",
    loading:"Формирую ответ…",error:"Ответ сейчас недоступен. Проверьте вход в кабинет и попробуйте ещё раз.",
    unavailable:"Локальная модель в этом браузере или для русского языка недоступна; показан проверенный ответ.",
    source:"Источник ответа",suggestions:"Проверенные варианты",start:"Начните с вопроса. Можно сменить режим в любой момент.",
    option:"Выбрать",used:"На устройстве",backend:"Собственный сервер",simple:"Алгоритм"},
  en:{ title:"Chat with the AI guide",disclosure:"I am Holistic House's AI guide, not a human or a therapist.",
    intro:"Share your question in your own words. Private test results are not read or saved in this pilot.",
    placeholder:"What's on your mind?",send:"Send",cancel:"Stop",mode:"Response mode",
    rules:"Without a language model",device:"On-device AI (may download a model)",owned:"Our AI server (with consent)",
    consent:"I agree to send this message to Holistic House's secured, self-hosted AI server.",
    loading:"Preparing a reply…",error:"Reply unavailable. Check that you're signed into your cabinet and try again.",
    unavailable:"The on-device language model isn't available for this browser or language; the verified fallback is shown.",
    source:"Reply source",suggestions:"Verified options",start:"Start with a question. You can switch modes any time.",
    option:"Open",used:"On device",backend:"Self-hosted server",simple:"Rules"},
  es:{ title:"Habla con el asistente de IA",disclosure:"Soy el asistente de IA de Holistic House, no una persona ni terapeuta.",
    intro:"Escribe tu pregunta con tus propias palabras. Los resultados privados no se leen ni se guardan.",
    placeholder:"¿Qué te preocupa ahora?",send:"Enviar",cancel:"Detener",mode:"Tipo de respuesta",
    rules:"Sin modelo de IA",device:"IA en el dispositivo (puede descargar un modelo)",owned:"Nuestro servidor de IA (con permiso)",
    consent:"Acepto enviar este texto al servidor privado de IA de Holistic House.",
    loading:"Preparando una respuesta…",error:"Respuesta no disponible. Comprueba el inicio de sesión e inténtalo de nuevo.",
    unavailable:"El modelo local no está disponible para este navegador o idioma; se muestra la respuesta segura.",
    source:"Origen",suggestions:"Opciones verificadas",start:"Escribe una pregunta. Puedes cambiar el modo cuando quieras.",
    option:"Abrir",used:"En el dispositivo",backend:"Servidor propio",simple:"Reglas"},
} as const;

type NativePromptSession = { prompt: (text:string,options?:{signal?:AbortSignal})=>Promise<string>;
  destroy?:()=>void };
type NativeLanguageModel = { availability:(options:unknown)=>Promise<string>;
  create:(options?:unknown)=>Promise<NativePromptSession> };
export function HolisticAgentChat({locale}:{locale:PublicLocale}) {
  const t=copy[locale];
  const [mode,setMode]=useState<Mode>("rules");
  const [agree,setAgree]=useState(false);
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [choices,setChoices]=useState<AgentReply["suggestions"]>([]);
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [busy,setBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text=draft.trim().slice(0,2000);
    if(!text||busy||mode==="owned"&&!agree)return;
    const prior=messages.slice(-6),abort=new AbortController();
    controller.current=abort;setBusy(true);setStatus("");setDraft("");
    setMessages(prev=>[...prev,{role:"user",text}]);
    try {
      const response=await fetch("/api/holistic-agent/turn",{
        method:"POST",credentials:"same-origin",signal:abort.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,message:text,mode,history:prior,
          selectedGoal:null,ownedInferenceConsent:mode==="owned"&&agree}),
      });
      if(!response.ok)throw Error("CHAT_UNAVAILABLE");
      const data=await response.json() as AgentReply;
      let reply=data.reply,used=data.source||"none";
      if(mode==="device"&&data.browserModelAllowed&&!abort.signal.aborted){
        try {
          const native=(window as Window & {LanguageModel?:NativeLanguageModel}).LanguageModel;
          const languages=[locale];
          const caps={expectedInputs:[{type:"text",languages}],
            expectedOutputs:[{type:"text",languages}]};
          if(!native||await native.availability(caps)==="unavailable")
            throw Error("DEVICE_UNAVAILABLE");
          const envelope=prepareNaturalDialogue({locale,message:text,history:prior,decision:data.decision,
            channel:"browser",consent:{browserInference:true}});
          if(!envelope.modelAllowed||!envelope.modelRequest)throw Error("DEVICE_DISABLED");
          const session=await native.create(caps);
          try{
            const generated=await finishNaturalDialogue(envelope,async request=>{
              const prompt=request.messages.map(x=>x.role+": "+x.content).join("\n\n");
              return session.prompt(prompt,{signal:abort.signal});
            });
            if(generated.modelUsed){reply=generated.text;used="browser";}
          } finally {session.destroy?.();}
        } catch {
          setStatus(t.unavailable);
        }
      }
      if(abort.signal.aborted)return;
      setChoices(Array.isArray(data.suggestions)?data.suggestions:[]);
      setMessages(prev=>[...prev,{role:"assistant",text:reply}].slice(-30));
      setSource(used==="browser"?t.used:used==="owned"?t.backend:t.simple);
    } catch {
      if(!abort.signal.aborted)setStatus(t.error);
    } finally {
      setBusy(false);controller.current=null;
    }
  }
  return <section className={styles.root} data-hh-agent-preview>
    <h1>{t.title}</h1><p>{t.disclosure}</p><p>{t.intro}</p>
    <label className={styles.mode}>{t.mode}
      <select value={mode} onChange={event=>{setMode(event.target.value as Mode);setStatus("");}}>
        <option value="rules">{t.rules}</option>
        <option value="device">{t.device}</option>
        <option value="owned">{t.owned}</option>
      </select>
    </label>
    {mode==="owned"&&<label className={styles.consent}>
      <input type="checkbox" checked={agree} onChange={event=>setAgree(event.target.checked)}/>
      {t.consent}
    </label>}
    <div className={styles.thread} role="log" aria-live="polite">
      {!messages.length&&<p className={styles.muted}>{t.start}</p>}
      {messages.map((m,index)=><p key={index} className={m.role==="user"?styles.user:styles.assistant}>{m.text}</p>)}
    </div>
    {source&&<p className={styles.muted}>{t.source}: {source}</p>}
    {choices.length>0&&<div className={styles.choices}><h2>{t.suggestions}</h2>
      {choices.map(x=><a key={x.id} href={x.href} rel="noreferrer">{x.title} · {t.option}</a>)}
    </div>}
    {status&&<p role="status">{status}</p>}
    <form onSubmit={submit} className={styles.form}>
      <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder}
        maxLength={2000} rows={3} disabled={busy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        <button type="submit" disabled={busy||!draft.trim()||(mode==="owned"&&!agree)}>{busy?t.loading:t.send}</button>
        {busy&&<button type="button" onClick={()=>controller.current?.abort()}>{t.cancel}</button>}
      </div>
    </form>
  </section>;
}
