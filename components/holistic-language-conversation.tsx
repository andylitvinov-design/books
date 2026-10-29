"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, RotateCcw, Send, Sparkles, Volume2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { createLanguageSession, turnLanguageAgent } from "@/lib/holistic-support/language-agent.mjs";
import styles from "./holistic-language-conversation.module.css";

type Video = { id: string; title: string; topics: string[]; sourceLanguage?: "en" | "ru"; durationMinutes?: number };
type GuideTest = { key: string; title: string; href: string; durationMinutes: number };
type Suggestion = { id: string; kind: string; title: string; href?: string; videoId?: string };
type Entry = { role: "visitor" | "agent"; text: string; suggestions?: Suggestion[] };
type WorkerReply = { type: string; requestId?: number; text?: string; progress?: number; message?: string };
const locales = {
  en: {
    title:"Open conversation", subtitle:"Tell me what you want in your own words.",
    first:"I'm a virtual guide. We can look at your goals and choose verified resources together.",
    placeholder:"Type a question or describe your goal…", send:"Send", clear:"Start over",
    reply:"Guide", you:"You", privacy:"This public dialogue stays in this tab. It does not read your private tests, contact practitioners or use an external chat API.",
    verified:"Verified materials", watch:"Select video", open:"Open resource",
    gpu:"Try a local language model", load:"Download model to this device", loading:"Loading local model",
    ready:"Local model is ready", unavailable:"This device cannot run the local model. The guide still works.",
    pilot:"Optional experiment: a large model is downloaded to your device. The model only rephrases approved public guidance; your personal messages are not given to the model.",
    local:"Locally generated wording", stop:"Stop local model", error:"Local wording is unavailable; verified guidance is unchanged.",
    modelNotice:"The model runtime and weights are downloaded from external hosts only after your click; no ChatGPT account or token is needed.",
  },
  ru: {
    title:"Свободный разговор", subtitle:"Напишите о своей ситуации своими словами.",
    first:"Я виртуальный проводник. Можем вместе уточнить цель и подобрать проверенные материалы.",
    placeholder:"Напишите вопрос или расскажите о своей задаче…", send:"Отправить", clear:"Начать заново",
    reply:"Проводник", you:"Вы", privacy:"Публичный диалог остаётся в этой вкладке. Он не читает личные результаты тестов, не пишет мастерам и не обращается к внешнему чат-API.",
    verified:"Проверенные материалы", watch:"Выбрать видео", open:"Открыть материал",
    gpu:"Попробовать локальную языковую модель", load:"Загрузить модель на устройство", loading:"Загрузка локальной модели",
    ready:"Локальная модель готова", unavailable:"На этом устройстве модель не запускается. Обычный проводник продолжит работать.",
    pilot:"Добровольный эксперимент: на устройство загружается большая модель. Она только перефразирует проверенную публичную подсказку, не получая ваши личные сообщения.",
    local:"Формулировка локальной модели", stop:"Выключить локальную модель", error:"Локальная формулировка недоступна; проверенный ответ остаётся без изменений.",
    modelNotice:"Программный модуль и веса загружаются с внешних хостов только по вашему нажатию. Аккаунт ChatGPT и токены не требуются.",
  },
  es: {
    title:"Conversación libre", subtitle:"Describe lo que necesitas con tus propias palabras.",
    first:"Soy una guía virtual. Podemos aclarar tu objetivo y buscar materiales verificados.",
    placeholder:"Escribe una pregunta o describe tu objetivo…", send:"Enviar", clear:"Empezar de nuevo",
    reply:"Guía", you:"Tú", privacy:"Este diálogo público se mantiene en esta pestaña. No lee tests privados, no contacta profesionales ni usa una API externa de chat.",
    verified:"Materiales verificados", watch:"Elegir vídeo", open:"Abrir recurso",
    gpu:"Probar un modelo local", load:"Descargar el modelo", loading:"Cargando el modelo local",
    ready:"Modelo local listo", unavailable:"Este dispositivo no admite el modelo local. La guía sigue funcionando.",
    pilot:"Experimento opcional: se descarga un modelo grande al dispositivo. Solo reformula una respuesta pública revisada y no recibe tus mensajes personales.",
    local:"Redacción del modelo local", stop:"Detener modelo local", error:"No está disponible la reformulación local; se conserva la respuesta verificada.",
    modelNotice:"El módulo y sus pesos se descargan de servidores externos solo si lo autorizas. No se necesita ChatGPT ni tokens.",
  },
} as const;
function validGenerated(text: string) {
  const clean = text.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180);
  return clean.length > 15 && clean.length < 181 &&
    !/https?:|www\.|@|<|>|[$€£]|\d{2,}|гарантир|лечит|диагноз|treatment|diagnos|cure|garantiz|curar|precio/i.test(clean)
    ? clean : "";
}
export function HolisticLanguageConversation({
  locale, seedTopic, videos, tests, enabledFormats, onVideo,
}: {
  locale: PublicLocale;
  seedTopic?: string | null;
  videos: Video[];
  tests: Record<string, GuideTest[]>;
  enabledFormats?: string[];
  onVideo: (id: string | null) => void;
}) {
  const t=locales[locale];
  const [state,setState] = useState(() => createLanguageSession({locale,seedTopic,enabledFormats}));
  const [entries,setEntries] = useState<Entry[]>([{role:"agent",text:t.first}]);
  const [draft,setDraft] = useState("");
  const [hasGpu,setHasGpu] = useState(false);
  const [modelMode,setModelMode] = useState<"off"|"loading"|"ready"|"failed">("off");
  const [modelProgress,setModelProgress] = useState(0);
  const [localPhrase,setLocalPhrase] = useState("");
  const [modelError,setModelError] = useState("");
  const modelWorker=useRef<Worker | null>(null);
  const requestCounter=useRef(0);
  const threadRef=useRef<HTMLDivElement>(null);
  const modelExperiment=process.env.NEXT_PUBLIC_HH_LOCAL_LLM_EXPERIMENTAL === "true";

  useEffect(()=>{
    setHasGpu(typeof window!=="undefined" && window.isSecureContext && typeof navigator!=="undefined" && "gpu" in navigator);
    return ()=>{modelWorker.current?.terminate();modelWorker.current=null;};
  },[]);
  useEffect(()=>{
    if(threadRef.current) threadRef.current.scrollTop=threadRef.current.scrollHeight;
  },[entries]);

  function haltModel() {
    modelWorker.current?.terminate();
    modelWorker.current=null;
    setModelMode("off");setModelProgress(0);setLocalPhrase("");setModelError("");
    requestCounter.current+=1;
  }
  function reset() {
    haltModel();
    setEntries([{role:"agent",text:t.first}]);
    setState(createLanguageSession({locale,seedTopic,enabledFormats}));
    setDraft("");
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
        if(data.type==="partial" && data.requestId===requestCounter.current) {
          setLocalPhrase(validGenerated(data.text??""));
        }
        if(data.type==="complete" && data.requestId===requestCounter.current) {
          setLocalPhrase(validGenerated(data.text??""));
        }
        if(data.type==="error"){
          setModelError(t.error);
          if(data.requestId===undefined){setModelMode("failed");worker.terminate();modelWorker.current=null;}
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
    if(!value)return;
    // Only previously verified public catalog props; never submit private tests.
    const result=turnLanguageAgent({
      text:value,previous:state,locale,
      catalog:{videos,tests},
    });
    setState(result.state);
    setEntries(prev=>[...prev,
      {role:"visitor",text:value.slice(0,4000)},
      {role:"agent",text:result.text,suggestions:result.suggestions as Suggestion[]},
    ].slice(-36));
    setDraft("");
    setLocalPhrase("");
    requestCounter.current+=1;
    if(result.status==="recommend" && modelMode==="ready" && result.allowLocalRewrite &&
       modelWorker.current) {
      modelWorker.current.postMessage({type:"cancel"});
      modelWorker.current.postMessage({
        type:"generate",requestId:requestCounter.current,locale:result.state.locale,
        seed:result.text.slice(0,300),
      });
    }
  }

  return <div className={styles.root} data-holistic-language-conversation>
    <p className={styles.intro}><MessageCircle size={18} aria-hidden="true"/>{t.subtitle}</p>
    <div className={styles.history} role="log" aria-live="polite" aria-relevant="additions" ref={threadRef}>
      {entries.map((entry,i)=><div key={i}
        className={entry.role==="visitor"?styles.visitor:styles.agent}>
        <span className={styles.speaker}>{entry.role==="visitor"?t.you:t.reply}</span>
        <p>{entry.text}</p>
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
      {localPhrase && modelMode==="ready" ?
        <div className={styles.generated}><Sparkles size={15} aria-hidden="true"/>
          <span>{t.local}: {localPhrase}</span></div> : null}
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
        <button type="submit" disabled={!draft.trim()} className={styles.send}>
          <Send size={16} aria-hidden="true"/>{t.send}
        </button>
      </div>
    </form>
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
