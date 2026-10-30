"use client";

import { useRef, useState, type FormEvent } from "react";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import styles from "./holistic-agent-chat.module.css";

type Mode = "rules" | "device" | "owned";
type Message = { role: "user" | "assistant"; text: string };
type AgentDecision = { status: string; message?: string; question?: {key:string;text:string}|null;
  suggestions?: {id:string;kind:string;title:string;href:string}[] };
type AgentReply = { status:string;reply:string;modelUsed:boolean;source:string;
  suggestions:{id:string;kind:string;title:string;href:string}[];decision:AgentDecision;
  browserModelAllowed:boolean; usedSavedTestEvidence?:boolean };
const copy = {
  ru:{ title:"Разговор с AI-проводником",disclosure:"Я — AI-проводник Holistic House, не человек и не психотерапевт.",
    intro:"Опишите запрос свободно. По вашему согласию можно учесть проверенные результаты выбранной темы без передачи баллов нейросети.",
    placeholder:"Что сейчас для вас важно?",send:"Отправить",cancel:"Остановить",mode:"Способ ответа",
    rules:"Без нейросети",device:"AI на устройстве (может потребоваться загрузка модели)",owned:"AI на нашем сервере (с согласия)",
    consent:"Разрешаю передать моё сообщение и последние реплики этого диалога на собственный защищённый AI-сервер Holistic House.",
    loading:"Формирую ответ…",error:"Ответ сейчас недоступен. Проверьте вход в кабинет и попробуйте ещё раз.",
    unavailable:"Локальная модель в этом браузере или для русского языка недоступна; показан проверенный ответ.",
    source:"Источник ответа",suggestions:"Проверенные варианты",start:"Начните с вопроса. Можно сменить режим в любой момент.",
    option:"Выбрать",reset:"Новый разговор",used:"На устройстве",backend:"Собственный сервер",simple:"Алгоритм",
    axis:"Тема профиля (необязательно)",axisNone:"Без дополнительной оси",format:"Предпочитаемый формат",
    allFormats:"Любой подходящий",useTests:"Разрешаю учесть мои сохранённые тесты по выбранной оси только для этого запроса",
    evidenceUsed:"Учтено наличие проверенного результата; баллы не передавались нейросети.",
    kinds:{video:"Видео",audio:"Аудио",test:"Тест",course:"Курс",service:"Сессия"}},
  en:{ title:"Chat with the AI guide",disclosure:"I am Holistic House's AI guide, not a human or a therapist.",
    intro:"Describe your question. With your permission, verified results for your selected topic can inform suggestions without sharing scores with a model.",
    placeholder:"What's on your mind?",send:"Send",cancel:"Stop",mode:"Response mode",
    rules:"Without a language model",device:"On-device AI (may download a model)",owned:"Our AI server (with consent)",
    consent:"I agree to send this message and recent conversation turns to Holistic House's secured, self-hosted AI server.",
    loading:"Preparing a reply…",error:"Reply unavailable. Check that you're signed into your cabinet and try again.",
    unavailable:"The on-device language model isn't available for this browser or language; the verified fallback is shown.",
    source:"Reply source",suggestions:"Verified options",start:"Start with a question. You can switch modes any time.",
    option:"Open",reset:"New conversation",used:"On device",backend:"Self-hosted server",simple:"Rules",
    axis:"Profile topic (optional)",axisNone:"No extra axis",format:"Preferred format",
    allFormats:"Any suitable option",useTests:"Allow saved test evidence for this axis and this request only",
    evidenceUsed:"Verified test evidence informed the match; raw scores were not sent to a language model.",
    kinds:{video:"Video",audio:"Audio",test:"Test",course:"Course",service:"Session"}},
  es:{ title:"Habla con el asistente de IA",disclosure:"Soy el asistente de IA de Holistic House, no una persona ni terapeuta.",
    intro:"Describe tu pregunta. Con tu permiso se pueden considerar resultados del eje elegido sin enviar puntuaciones al modelo.",
    placeholder:"¿Qué te preocupa ahora?",send:"Enviar",cancel:"Detener",mode:"Tipo de respuesta",
    rules:"Sin modelo de IA",device:"IA en el dispositivo (puede descargar un modelo)",owned:"Nuestro servidor de IA (con permiso)",
    consent:"Acepto enviar este mensaje y los últimos turnos de la conversación al servidor privado de IA de Holistic House.",
    loading:"Preparando una respuesta…",error:"Respuesta no disponible. Comprueba el inicio de sesión e inténtalo de nuevo.",
    unavailable:"El modelo local no está disponible para este navegador o idioma; se muestra la respuesta segura.",
    source:"Origen",suggestions:"Opciones verificadas",start:"Escribe una pregunta. Puedes cambiar el modo cuando quieras.",
    option:"Abrir",reset:"Nueva conversación",used:"En el dispositivo",backend:"Servidor propio",simple:"Reglas",
    axis:"Tema del perfil (opcional)",axisNone:"Sin dimensión adicional",format:"Formato preferido",
    allFormats:"Cualquier opción adecuada",useTests:"Permito usar pruebas guardadas del eje elegido solo para esta consulta",
    evidenceUsed:"Se consideró la existencia de una prueba verificada; no se enviaron puntuaciones al modelo.",
    kinds:{video:"Vídeo",audio:"Audio",test:"Prueba",course:"Curso",service:"Sesión"}},
} as const;

type NativePromptSession = { prompt: (text:string,options?:{signal?:AbortSignal})=>Promise<string>;
  destroy?:()=>void };
type NativeLanguageModel = { availability:(options:unknown)=>Promise<string>;
  create:(options?:unknown)=>Promise<NativePromptSession> };
export function HolisticAgentChat({locale}:{locale:PublicLocale}) {
  const t=copy[locale];
  const [mode,setMode]=useState<Mode>("rules");
  const [agree,setAgree]=useState(false);
  const [axisRef,setAxisRef]=useState("");
  const [format,setFormat]=useState<""|"video"|"audio"|"test"|"course"|"service">("");
  const [useSavedTests,setUseSavedTests]=useState(false);
  const [evidenceUsed,setEvidenceUsed]=useState(false);
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
    setMessages(prev=>[...prev,{role:"user" as const,text}]);
    try {
      const response=await fetch("/api/holistic-agent/turn",{
        method:"POST",credentials:"same-origin",signal:abort.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,message:text,mode,history:prior,
          selectedGoal:null,ownedInferenceConsent:mode==="owned"&&agree,
          chosenAxes:axisRef?[axisRef]:[],
          preferredFormat:format||null,
          usePrivateProfile:useSavedTests&&Boolean(axisRef)}),
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
      setEvidenceUsed(data.usedSavedTestEvidence===true);
      setMessages(prev=>[...prev,{role:"assistant" as const,text:reply}].slice(-30));
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
    <div className={styles.preferences}>
      <label className={styles.mode}>{t.axis}
        <select value={axisRef} onChange={e=>{
          setAxisRef(e.target.value);if(!e.target.value)setUseSavedTests(false);
        }}>
          <option value="">{t.axisNone}</option>
          {Object.entries(AXIS_REFS).map(([id,axis])=>
            <option key={id} value={id}>{axis.label[locale]||axis.label.en}</option>)}
        </select>
      </label>
      <label className={styles.mode}>{t.format}
        <select value={format} onChange={e=>setFormat(e.target.value as typeof format)}>
          <option value="">{t.allFormats}</option>
          {(["video","audio","test","course","service"] as const).map(kind=>
            <option key={kind} value={kind}>{t.kinds[kind]}</option>)}
        </select>
      </label>
    </div>
    <label className={styles.consent}>
      <input type="checkbox" disabled={!axisRef} checked={useSavedTests}
        onChange={e=>setUseSavedTests(e.target.checked)}/>
      {t.useTests}
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
    {evidenceUsed&&<p className={styles.muted} role="status">{t.evidenceUsed}</p>}
    {choices.length>0&&<div className={styles.choices}><h2>{t.suggestions}</h2>
      {choices.map(x=><a key={x.id} href={x.href} rel="noreferrer">{x.title} · {t.option}</a>)}
    </div>}
    {status&&<p role="status">{status}</p>}
    <form onSubmit={submit} className={styles.form}>
      <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder}
        maxLength={2000} rows={3} disabled={busy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        <button type="button" onClick={()=>{controller.current?.abort();setMessages([]);setChoices([]);setStatus("");setSource("");setEvidenceUsed(false);}}>{t.reset}</button>
        <button type="submit" disabled={busy||!draft.trim()||(mode==="owned"&&!agree)}>{busy?t.loading:t.send}</button>
        {busy&&<button type="button" onClick={()=>controller.current?.abort()}>{t.cancel}</button>}
      </div>
    </form>
  </section>;
}
