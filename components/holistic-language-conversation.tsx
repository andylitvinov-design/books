"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, RotateCcw, Send, Sparkles, Volume2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { createLanguageSession, turnLanguageAgent } from "@/lib/holistic-support/language-agent.mjs";
import { applyAgentMemoryForTurn, approvedMemoryForLocalPrompt, proposeAgentMemoryPreference } from "@/lib/holistic-support/agent-memory-policy.mjs";
import { publicReikiAudioSlots, verifiedPublicReikiIntro } from "@/lib/holistic-support/public-reiki-audio-client.mjs";
import { prepareLocalConversation, acceptLocalConversationReply, type LocalContext } from "@/lib/holistic-support/local-conversation-contract.mjs";
import { HolisticAgentMemoryPanel, type MyAgentMemory } from "@/components/holistic-agent-memory-panel";
import styles from "./holistic-language-conversation.module.css";

type Video = { id: string; title: string; topics: string[]; sourceLanguage?: "en" | "ru"; durationMinutes?: number };
type GuideTest = { key: string; title: string; href: string; durationMinutes: number };
type Suggestion = { id: string; kind: string; title: string; href?: string; videoId?: string };
type Entry = { role: "visitor" | "agent"; text: string; suggestions?: Suggestion[]; requestId?: number; generated?: string };
type WorkerReply = { type: string; requestId?: number; text?: string; progress?: number; chars?: number; message?: string };
const locales = {
  en: {
    title:"Open conversation", subtitle:"Tell me what you want in your own words.",
    first:"I'm a virtual guide. We can look at your goals and choose verified resources together.",
    placeholder:"Type a question or describe your goal…", send:"Send", clear:"Start over",
    reply:"Guide", you:"You", privacy:"This public dialogue stays in this tab. It does not read your private tests, contact practitioners or use an external chat API.",
    verified:"Verified materials", watch:"Select video", open:"Open resource",
    gpu:"Try a local language model", load:"Download model to this device", loading:"Loading local model",
    ready:"Local model is ready", unavailable:"This device cannot run the local model. The guide still works.",
    pilot:"Optional local conversation: after download, recent messages are processed only on your device, not sent to a chat API. The model does not access your private profile.",
    local:"Local AI reply", stop:"Turn off local AI", stopAnswer:"Stop reply", writing:"Writing a response on your device…", error:"Local conversation failed; the checked guidance remains.",
    modelNotice:"The model runtime and weights are downloaded from external hosts only after your click; no ChatGPT account or token is needed. Saved preferences are only added when you explicitly turn on their use.",
    publicAudio:"I found published Reiki course introduction audio. This is not a standalone guided meditation.",
  },
  ru: {
    title:"Свободный разговор", subtitle:"Напишите о своей ситуации своими словами.",
    first:"Я виртуальный проводник. Можем вместе уточнить цель и подобрать проверенные материалы.",
    placeholder:"Напишите вопрос или расскажите о своей задаче…", send:"Отправить", clear:"Начать заново",
    reply:"Проводник", you:"Вы", privacy:"Публичный диалог остаётся в этой вкладке. Он не читает личные результаты тестов, не пишет мастерам и не обращается к внешнему чат-API.",
    verified:"Проверенные материалы", watch:"Выбрать видео", open:"Открыть материал",
    gpu:"Попробовать локальную языковую модель", load:"Загрузить модель на устройство", loading:"Загрузка локальной модели",
    ready:"Локальная модель готова", unavailable:"На этом устройстве модель не запускается. Обычный проводник продолжит работать.",
    pilot:"Добровольный локальный диалог: после загрузки модель обрабатывает последние реплики только на вашем устройстве, не отправляя их в чат-API. Личный профиль она не читает.",
    local:"Ответ локального AI", stop:"Выключить локальный AI", stopAnswer:"Остановить ответ", writing:"Формулирую ответ на вашем устройстве…", error:"Локальный диалог недоступен; проверенная подсказка сохранена.",
    modelNotice:"Код и веса модели загружаются с внешних хостов по нажатию. Токены ChatGPT не требуются. Сохранённые пожелания используются только после отдельного разрешения в панели памяти.",
    publicAudio:"Нашлись опубликованные вступительные аудио курса Reiki. Это не самостоятельная медитация.",
  },
  es: {
    title:"Conversación libre", subtitle:"Describe lo que necesitas con tus propias palabras.",
    first:"Soy una guía virtual. Podemos aclarar tu objetivo y buscar materiales verificados.",
    placeholder:"Escribe una pregunta o describe tu objetivo…", send:"Enviar", clear:"Empezar de nuevo",
    reply:"Guía", you:"Tú", privacy:"Este diálogo público se mantiene en esta pestaña. No lee tests privados, no contacta profesionales ni usa una API externa de chat.",
    verified:"Materiales verificados", watch:"Elegir vídeo", open:"Abrir recurso",
    gpu:"Probar un modelo local", load:"Descargar el modelo", loading:"Cargando el modelo local",
    ready:"Modelo local listo", unavailable:"Este dispositivo no admite el modelo local. La guía sigue funcionando.",
    pilot:"Diálogo local opcional: tras la descarga, el modelo procesa los últimos mensajes solo en tu dispositivo, sin enviarlos a una API. No accede a tu perfil privado.",
    local:"Respuesta de IA local", stop:"Apagar IA local", stopAnswer:"Detener respuesta", writing:"Redactando una respuesta en tu dispositivo…", error:"Falló el diálogo local; se conserva la guía verificada.",
    modelNotice:"El módulo y sus pesos se descargan de servidores externos solo si lo autorizas. No necesitas ChatGPT. Los recuerdos se usan solo con tu permiso adicional.",
    publicAudio:"Se encontraron introducciones de audio publicadas del curso Reiki. No son meditaciones guiadas independientes.",
  },
} as const;
export function HolisticLanguageConversation({
  locale, seedTopic, videos, tests, enabledFormats, onVideo, active = true,
}: {
  locale: PublicLocale;
  seedTopic?: string | null;
  videos: Video[];
  tests: Record<string, GuideTest[]>;
  enabledFormats?: string[];
  onVideo: (id: string | null) => void;
  active?: boolean;
}) {
  const t=locales[locale];
  const [state,setState] = useState(() => createLanguageSession({locale,seedTopic,enabledFormats}));
  const [entries,setEntries] = useState<Entry[]>([{role:"agent",text:t.first}]);
  const [draft,setDraft] = useState("");
  const [hasGpu,setHasGpu] = useState(false);
  const [modelMode,setModelMode] = useState<"off"|"loading"|"ready"|"failed">("off");
  const [modelProgress,setModelProgress] = useState(0);
  const [generating,setGenerating] = useState(false);
  const [savedMemory,setSavedMemory] = useState<MyAgentMemory[]>([]);
  const [memoryOwner,setMemoryOwner] = useState("");
  const [memoryProposal,setMemoryProposal] = useState<{kind:string;value:string}|null>(null);
  const [memoryNotice,setMemoryNotice] = useState("");
  const [memorySaving,setMemorySaving] = useState(false);
  const [modelError,setModelError] = useState("");
  const modelWorker=useRef<Worker | null>(null);
  const requestCounter=useRef(0);
  const activeLocalContext=useRef<LocalContext|null>(null);
  const audioCounter=useRef(0);
  const threadRef=useRef<HTMLDivElement>(null);
  const modelExperiment=process.env.NEXT_PUBLIC_HH_LOCAL_LLM_EXPERIMENTAL === "true";

  useEffect(()=>{
    setHasGpu(typeof window!=="undefined" && window.isSecureContext && typeof navigator!=="undefined" && "gpu" in navigator);
    return ()=>{modelWorker.current?.terminate();modelWorker.current=null;};
  },[]);
  // Account memory is read only when the feature is released and the owner
  // explicitly consented to automatic use. Server auth+RLS control all reads.
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED!=="true")return;
    let active=true;
    void fetch("/api/app/agent-memory",{credentials:"same-origin",cache:"no-store"})
      .then(async response=>response.ok?await response.json():null)
      .then((data:unknown)=>{
        if(!active)return;
        const safe=data&&typeof data==="object"?data as {
          consent?:boolean;useInDialogue?:boolean;items?:MyAgentMemory[];ownerBinding?:string
        }:null;
        setSavedMemory(safe?.consent===true && safe.useInDialogue===true
          ?approvedMemoryForLocalPrompt(safe.items):[]);
        setMemoryOwner(typeof safe?.ownerBinding==="string"?safe.ownerBinding:"");
      }).catch(()=>{if(active){setSavedMemory([]);setMemoryOwner("");}});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(threadRef.current) threadRef.current.scrollTop=threadRef.current.scrollHeight;
  },[entries]);
  useEffect(()=>{
    if(active)return;
    // Returning to the guided workflow must stop hidden GPU/remote downloads.
    modelWorker.current?.terminate();modelWorker.current=null;
    activeLocalContext.current=null;requestCounter.current+=1;
    setGenerating(false);setModelMode("off");setModelProgress(0);
  },[active]);

  function haltModel() {
    modelWorker.current?.terminate();
    modelWorker.current=null;
    setModelMode("off");setModelProgress(0);setGenerating(false);setModelError("");
    activeLocalContext.current=null;
    requestCounter.current+=1;
    audioCounter.current+=1;
  }
  function stopAnswer() {
    modelWorker.current?.postMessage({type:"cancel"});
    requestCounter.current+=1;
    activeLocalContext.current=null;
    setGenerating(false);
  }
  function reset() {
    stopAnswer();
    audioCounter.current+=1;
    setEntries([{role:"agent",text:t.first}]);
    setState(createLanguageSession({locale,seedTopic,enabledFormats}));
    setDraft("");setMemoryProposal(null);setMemoryNotice("");
  }
  function startModel() {
    if(!modelExperiment || !hasGpu || modelWorker.current) return;
    setModelMode("loading");setModelProgress(0);setModelError("");
    try {
      const worker=new Worker("/holistic-mind/webllm-worker.mjs",{type:"module"});
      modelWorker.current=worker;
      worker.onmessage=(event:MessageEvent<WorkerReply>)=>{
        const data=event.data;
        if(data.type==="progress")setModelProgress(Math.max(0,Math.min(100,data.progress??0)));
        if(data.type==="ready")setModelMode("ready");
        if(data.type==="started" && data.requestId===requestCounter.current)
          setGenerating(true);
        if(data.type==="complete" && data.requestId===requestCounter.current) {
          const request=activeLocalContext.current?.request;
          const localeForReply=activeLocalContext.current?.locale;
          const approved=acceptLocalConversationReply(data.text,{
            request,locale:localeForReply,
          });
          if(approved) setEntries(prev=>prev.map(entry=>entry.role==="agent" &&
            entry.requestId===data.requestId?{...entry,generated:approved}:entry));
          activeLocalContext.current=null;
          setGenerating(false);
        }
        if(data.type==="error"){
          if(data.requestId===undefined) {
            setModelMode("failed");worker.terminate();modelWorker.current=null;
          } else if(data.requestId!==requestCounter.current) return;
          activeLocalContext.current=null;
          setGenerating(false);
          setModelError(t.error);
        }
      };
      worker.onerror=()=>{setModelMode("failed");setModelError(t.error);
        worker.terminate();modelWorker.current=null;};
      worker.postMessage({type:"load"});
    } catch {
      setModelMode("failed");setModelError(t.error);
    }
  }
  function submit() {
    const value=draft.trim();
    if(!value || generating)return;
    // Only previously verified public catalog props; never submit private tests.
    const input={text:value,previous:state,locale,catalog:{videos,tests}};
    const plainResult=turnLanguageAgent(input);
    // Saved communication preferences influence the deterministic guide while
    // enabled, but never overwrite the visitor's explicit session choices.
    const withPreference=savedMemory.length
      ?applyAgentMemoryForTurn(state,savedMemory):null;
    const result=withPreference ? turnLanguageAgent({...input,previous:withPreference})
      : plainResult;
    const localRequestId=++requestCounter.current;
    const localContext=prepareLocalConversation({
      history:entries.map(entry=>({role:entry.role,text:entry.generated||entry.text})),
      currentMessage:value,decision:result,locale,memory:savedMemory,
    });
    setState(plainResult.state); // do not persist memory-derived state across opt-out
    setMemoryNotice("");
    setMemoryProposal(process.env.NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED==="true" &&
      !["safety_handoff","safety_check_required","stopped"].includes(result.status)
      ?proposeAgentMemoryPreference(value):null);
    setEntries(prev=>[...prev,
      {role:"visitor",text:value.slice(0,4000)},
      {role:"agent",text:result.text,suggestions:result.suggestions as Suggestion[],
        requestId:localRequestId},
    ].slice(-36));
    setDraft("");
    setModelError("");
    audioCounter.current+=1;
    if(result.state.format==="audio" && result.status==="no_match" &&
       result.state.maxDurationMin===null && result.state.topic) {
      const ticket=audioCounter.current;
      const slots=publicReikiAudioSlots({topic:result.state.topic,locale:result.state.locale});
      if(slots.length) {
        void Promise.all(slots.map(async lesson=>{
          try {
            // Public lesson identifier only. Do NOT send the message, user ID or private tests.
            const endpoint="/api/reiki-intro-audio?lesson="+lesson+"&locale="+result.state.locale;
            const response=await fetch(endpoint,{credentials:"omit"});
            if(!response.ok)return null;
            return verifiedPublicReikiIntro(await response.json(),{lesson,locale:result.state.locale});
          } catch {return null;}
        })).then(items=>{
          if(ticket!==audioCounter.current)return;
          const approved=items.filter((item):item is NonNullable<typeof item>=>item!==null);
          if(!approved.length)return;
          setEntries(prev=>prev.map((entry,index)=>index===prev.length-1 &&
            entry.role==="agent" && entry.text===result.text
            ? {...entry,text:t.publicAudio,suggestions:approved} :entry));
        });
      }
    }
    // Local generative dialogue receives only current-tab messages. It NEVER
    // receives protected tests, profile, identity, authorized offers or secrets.
    // Active audio retrieval stays deterministic until the manifest is checked.
    if(["recommend","clarify","no_match"].includes(result.status) &&
       !(result.state.format==="audio" && result.status==="no_match") &&
       modelMode==="ready" && modelWorker.current && localContext) {
      activeLocalContext.current=localContext;
      setGenerating(true);
      modelWorker.current.postMessage({
        type:"generate",requestId:localRequestId,
        context:localContext,turns:localContext.turns,
      });
    }
  }

  async function saveProposedMemory() {
    if(!memoryProposal||memorySaving)return;
    if(!memoryOwner){
      setMemoryNotice(locale==="ru"?"Войдите в кабинет и откройте панель памяти, чтобы подтвердить аккаунт.":
        locale==="es"?"Inicia sesión y abre el panel de memoria para confirmar la cuenta.":
          "Sign in and open the memory panel to confirm the account.");
      return;
    }
    setMemorySaving(true);setMemoryNotice("");
    try{
      const response=await fetch("/api/app/agent-memory",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","x-hh-memory-owner":memoryOwner},
        body:JSON.stringify({action:"set",kind:memoryProposal.kind,value:memoryProposal.value}),
      });
      if(!response.ok){
        setMemoryNotice(locale==="ru"?"Чтобы запомнить, войдите в кабинет и разрешите сохранение в панели памяти."
          :locale==="es"?"Para recordar, inicia sesión y autoriza la memoria en el panel."
          :"To save this, sign in and enable memory in the memory panel.");
        return;
      }
      const next=await fetch("/api/app/agent-memory",{credentials:"same-origin",cache:"no-store"});
      if(next.ok) {
        const data=await next.json() as {
          consent?:boolean;useInDialogue?:boolean;items?:MyAgentMemory[];ownerBinding?:string
        };
        setSavedMemory(data.consent===true && data.useInDialogue===true
          ?approvedMemoryForLocalPrompt(data.items):[]);
        setMemoryOwner(typeof data.ownerBinding==="string"?data.ownerBinding:"");
      }
      setMemoryProposal(null);
      setMemoryNotice(locale==="ru"?"Пожелание сохранено в профиле."
        :locale==="es"?"Preferencia guardada en tu perfil.":"Preference saved in your profile.");
    }catch{
      setMemoryNotice(locale==="ru"?"Не удалось сохранить пожелание."
        :locale==="es"?"No se pudo guardar.":"Could not save preference.");
    }finally{setMemorySaving(false);}
  }
  return <div className={styles.root} data-holistic-language-conversation>
    <p className={styles.intro}><MessageCircle size={18} aria-hidden="true"/>{t.subtitle}</p>
    <div className={styles.history} role="log" aria-live="polite" aria-relevant="additions" ref={threadRef}>
      {entries.map((entry,i)=><div key={i}
        className={entry.role==="visitor"?styles.visitor:styles.agent}>
        <span className={styles.speaker}>{entry.role==="visitor"?t.you:t.reply}</span>
        <p>{entry.generated||entry.text}</p>
        {entry.generated && entry.text!==entry.generated ?
          <p className={styles.verifiedContext}>{entry.text}</p> : null}
        {entry.suggestions?.length ? <div className={styles.materials}>
          <strong>{t.verified}</strong>
          {entry.suggestions.map(s=><div key={s.id} className={styles.material}>
            <span>{s.title}</span>
            {s.kind==="video" && s.videoId ?
              <button type="button" onClick={()=>onVideo(s.videoId??null)}>
                {t.watch}<ArrowRight size={14} aria-hidden="true"/></button>
            : s.href ?
              <a href={s.href} target="_blank" rel="noopener noreferrer">
                {t.open}<ArrowRight size={14} aria-hidden="true"/></a> : null}
          </div>)}
        </div> : null}
      </div>)}
      {generating && modelMode==="ready" ?
        <div className={styles.generated} role="status">
          <Sparkles size={15} aria-hidden="true"/>
          <span>{t.writing}</span>
          <button type="button" onClick={stopAnswer}>{t.stopAnswer}</button>
        </div> : null}
    </div>
    <form className={styles.form} onSubmit={event=>{event.preventDefault();submit();}}>
      <label htmlFor="holistic-free-dialogue-input">{t.title}</label>
      <textarea id="holistic-free-dialogue-input" value={draft} maxLength={4000} rows={2}
        onChange={event=>setDraft(event.target.value)}
        onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){
          event.preventDefault();submit();
        }}}
        placeholder={t.placeholder}/>
      <div className={styles.formActions}>
        <button type="button" className={styles.reset} onClick={reset}>
          <RotateCcw size={15} aria-hidden="true"/>{t.clear}
        </button>
        <button type="submit" disabled={!draft.trim()||generating} className={styles.send}>
          <Send size={16} aria-hidden="true"/>{t.send}
        </button>
      </div>
    </form>
    {memoryProposal ? <div className={styles.memoryRequest} data-memory-proposal>
      <p>{locale==="ru"?"Вы хотите сохранить это пожелание?":locale==="es"?
        "¿Quieres guardar esta preferencia?":"Save this preference?"}
        <strong>{memoryProposal.kind}: {memoryProposal.value}</strong></p>
      <div>
        <button type="button" disabled={memorySaving} onClick={()=>void saveProposedMemory()}>
          {locale==="ru"?"Запомнить":locale==="es"?"Guardar":"Remember"}</button>
        <button type="button" onClick={()=>{setMemoryProposal(null);setMemoryNotice("");}}>
          {locale==="ru"?"Не сохранять":locale==="es"?"No guardar":"Not now"}</button>
      </div>
    </div> : null}
    {memoryNotice?<p role="status" className={styles.memoryNotice}>{memoryNotice}</p>:null}
    <HolisticAgentMemoryPanel locale={locale} onUse={(rows,ownerBinding)=>{
      stopAnswer();setSavedMemory(rows);setMemoryOwner(ownerBinding);
    }}/>
    {modelExperiment ? <div className={styles.experiment} data-local-model-experiment>
      <p><Volume2 size={16} aria-hidden="true"/>{t.gpu}</p>
      <small>{t.pilot} {t.modelNotice}</small>
      {modelMode==="off" ? <button type="button" onClick={startModel} disabled={!hasGpu}>{hasGpu?t.load:t.unavailable}</button>
      : modelMode==="loading" ? <div role="status">{t.loading}: {modelProgress}%
          <progress max="100" value={modelProgress}/><button type="button" onClick={haltModel}>{t.stop}</button>
        </div>
      : modelMode==="ready" ? <div role="status">{t.ready}
          <button type="button" onClick={haltModel}>{t.stop}</button>
        </div>
      : <p role="status">{modelError||t.unavailable}<button type="button" onClick={haltModel}>{t.stop}</button></p>}
    </div> : null}
    <p className={styles.privacy}>{t.privacy}</p>
  </div>;
}
