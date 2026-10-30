"use client";

import { useRef, useState, type FormEvent } from "react";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import styles from "./holistic-agent-chat.module.css";

type Mode = "rules" | "device" | "owned";
type PreviewFocus = "" | "stress" | "relationships" | "self_worth" | "meaning";
type Outline = {status:"draft_ready";title:string;lessons:Array<{number:number;title:string;steps:string[];videoReady:false}>;published:false;mediaReady:false};
type Message = { role: "user" | "assistant"; text: string };
type AgentDecision = { status: string; message?: string; question?: {key:string;text:string}|null;
  suggestions?: {id:string;kind:string;title:string;href:string}[] };
type AgentReply = { status:string;reply:string;modelUsed:boolean;source:string;
  suggestions:{id:string;kind:string;title:string;href:string}[];decision:AgentDecision;
  browserModelAllowed:boolean; usedSavedTestEvidence?:boolean; usedSavedVideoHistory?:boolean };
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
    useHistory:"Учесть отмеченные мной просмотренные видео (только в этом запросе)",
    historyUsed:"Учтены ранее отмеченные просмотренные видео; личная история не раскрыта нейросети.",
    kinds:{video:"Видео",audio:"Аудио",test:"Тест",course:"Курс",service:"Сессия"},
    hide:"Не предлагать снова",tried:"Я попробовал",localFeedback:"Мои отметки действуют только в этом диалоге и не сохраняются в кабинете.",
    programTitle:"Программа из 8 практик — предварительный план",
    programInfo:"Это образовательный план. Видео и аудио для этих 8 занятий ещё не созданы. Для индивидуальной психотерапии нужна проверка специалиста.",
    programFocus:"Выберите тему",programFocusItems:{stress:"Стресс и восстановление",relationships:"Отношения и границы",self_worth:"Самоподдержка и самооценка",meaning:"Смыслы и направление"},
    programTime:"Предпочитаемая длительность практики (не готового видео)",programSafety:"Я выбираю мягкий образовательный формат и могу остановить его в любой момент. Мне не требуется экстренная помощь.",
    programImagery:"Добавить добровольные ресурсные образы",programStart:"Подготовить план",
    programError:"Не удалось сформировать план. Проверьте вход в кабинет или выберите другую тему.",
    programReady:"План готов для ознакомления, не опубликован. Медиафайлы не создавались.",programEmpty:"Выберите тему и подтвердите готовность.",
    programStep:"Шаг",programNoMedia:"Сценарный план — не готовое видео."},
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
    useHistory:"Use videos I previously marked watched (this request only)",
    historyUsed:"Your previously marked videos informed ordering; no private history was sent to a model.",
    kinds:{video:"Video",audio:"Audio",test:"Test",course:"Course",service:"Session"},
    hide:"Don't suggest again",tried:"I tried it",localFeedback:"These choices apply only to this conversation; they are not saved to your account.",
    programTitle:"Eight-practice program — preview outline",
    programInfo:"Educational outline only. None of the eight video/audio lessons has been produced. Individual psychotherapy requires practitioner review.",
    programFocus:"Choose a topic",programFocusItems:{stress:"Stress and recovery",relationships:"Relationships and boundaries",self_worth:"Self-support and confidence",meaning:"Meaning and direction"},
    programTime:"Preferred practice length (not a finished video)",programSafety:"I choose a gentle educational outline, can stop anytime, and do not need immediate emergency help.",
    programImagery:"Allow optional resource imagery",programStart:"Create outline",
    programError:"Could not prepare the outline. Check your account or choose another topic.",
    programReady:"Draft outline, not published. No media was generated.",programEmpty:"Choose a topic and confirm readiness.",
    programStep:"Step",programNoMedia:"Written outline, not a finished video."},
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
    useHistory:"Usar vídeos que ya marqué como vistos (solo en esta consulta)",
    historyUsed:"Se tuvieron en cuenta vídeos marcados previamente; no se compartió historial con el modelo.",
    kinds:{video:"Vídeo",audio:"Audio",test:"Prueba",course:"Curso",service:"Sesión"},
    hide:"No volver a sugerir",tried:"Lo probé",localFeedback:"Estas marcas solo se aplican a esta conversación y no se guardan en tu cuenta.",
    programTitle:"Programa de ocho prácticas — borrador",
    programInfo:"Es un esquema educativo. No se han creado ocho vídeos o audios. La psicoterapia individual requiere revisión profesional.",
    programFocus:"Elige un tema",programFocusItems:{stress:"Estrés y recuperación",relationships:"Relaciones y límites",self_worth:"Autoapoyo y confianza",meaning:"Sentido y dirección"},
    programTime:"Duración deseada de la práctica (no del vídeo)",programSafety:"Elijo un esquema educativo suave, puedo detenerlo cuando quiera y no necesito ayuda de emergencia inmediata.",
    programImagery:"Permitir imágenes de recursos opcionales",programStart:"Preparar esquema",
    programError:"No se pudo crear el esquema. Comprueba tu cuenta o elige otro tema.",
    programReady:"Esquema no publicado. No se ha generado ningún vídeo.",programEmpty:"Elige un tema y confirma tu disposición.",
    programStep:"Paso",programNoMedia:"Esquema escrito; no es un vídeo listo."},
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
  const [useSavedHistory,setUseSavedHistory]=useState(false);
  const [historyUsed,setHistoryUsed]=useState(false);
  const [evidenceUsed,setEvidenceUsed]=useState(false);
  const [dismissedIds,setDismissedIds]=useState<string[]>([]);
  const [completedIds,setCompletedIds]=useState<string[]>([]);
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [choices,setChoices]=useState<AgentReply["suggestions"]>([]);
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [busy,setBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);
  const [previewFocus,setPreviewFocus]=useState<PreviewFocus>("");
  const [previewMinutes,setPreviewMinutes]=useState<8|12|20>(12);
  const [previewReady,setPreviewReady]=useState(false);
  const [previewImagery,setPreviewImagery]=useState(false);
  const [outline,setOutline]=useState<Outline|null>(null);
  const [outlineBusy,setOutlineBusy]=useState(false);
  const [outlineError,setOutlineError]=useState("");
  async function createOutline(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!previewFocus||!previewReady||outlineBusy)return;
    setOutlineBusy(true);setOutlineError("");setOutline(null);
    try{
      const response=await fetch("/api/holistic-agent/program",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,focus:previewFocus,minutes:previewMinutes,
          resourceImagery:previewImagery,safetyAcknowledged:previewReady}),
      });
      if(!response.ok)throw Error("PROGRAM_UNAVAILABLE");
      const data=await response.json() as Outline;
      if(data.status!=="draft_ready" || data.mediaReady!==false ||
        data.published!==false || data.lessons?.length!==8)throw Error("NOT_A_REVIEWED_DRAFT");
      setOutline(data);
    }catch{setOutlineError(t.programError);}
    finally{setOutlineBusy(false);}
  }

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
          usePrivateProfile:useSavedTests&&Boolean(axisRef),
          usePrivateHistory:useSavedHistory,
          feedback:{dismissedIds,completedIds}}),
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
      setHistoryUsed(data.usedSavedVideoHistory===true);
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
    <label className={styles.consent}>
      <input type="checkbox" checked={useSavedHistory}
        onChange={e=>setUseSavedHistory(e.target.checked)}/>
      {t.useHistory}
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
    {historyUsed&&<p className={styles.muted} role="status">{t.historyUsed}</p>}
    {choices.filter(x=>!dismissedIds.includes(x.id)&&!completedIds.includes(x.id)).length>0&&
      <div className={styles.choices}><h2>{t.suggestions}</h2>
        {choices.filter(x=>!dismissedIds.includes(x.id)&&!completedIds.includes(x.id)).map(x=>
          <div className={styles.offer} key={x.id}>
            <a href={x.href} rel="noreferrer">{x.title} · {t.option}</a>
            <div className={styles.feedbackActions}>
              <button type="button" onClick={()=>setDismissedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.hide}</button>
              <button type="button" onClick={()=>setCompletedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.tried}</button>
            </div>
          </div>)}
        <small className={styles.muted}>{t.localFeedback}</small>
      </div>}
    {status&&<p role="status">{status}</p>}
    <form onSubmit={submit} className={styles.form}>
      <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder}
        maxLength={2000} rows={3} disabled={busy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        <button type="button" onClick={()=>{controller.current?.abort();setMessages([]);setChoices([]);setStatus("");setSource("");setEvidenceUsed(false);setHistoryUsed(false);setDismissedIds([]);setCompletedIds([]);}}>{t.reset}</button>
        <button type="submit" disabled={busy||!draft.trim()||(mode==="owned"&&!agree)}>{busy?t.loading:t.send}</button>
        {busy&&<button type="button" onClick={()=>controller.current?.abort()}>{t.cancel}</button>}
      </div>
    </form>
    <details className={styles.programPanel} data-hh-eight-session-preview>
      <summary>{t.programTitle}</summary>
      <p className={styles.muted}>{t.programInfo}</p>
      <form onSubmit={createOutline} className={styles.form}>
        <label className={styles.mode}>{t.programFocus}
          <select value={previewFocus} onChange={e=>{
            setPreviewFocus(e.target.value as PreviewFocus);
            setOutline(null);
          }}>
            <option value="">{t.programFocus}</option>
            {(["stress","relationships","self_worth","meaning"] as const).map(item=>
              <option key={item} value={item}>{t.programFocusItems[item]}</option>)}
          </select>
        </label>
        <label className={styles.mode}>{t.programTime}
          <select value={previewMinutes}
            onChange={e=>setPreviewMinutes(Number(e.target.value) as typeof previewMinutes)}>
            {[8,12,20].map(n=><option key={n} value={n}>{n} min</option>)}
          </select>
        </label>
        <label className={styles.consent}>
          <input type="checkbox" checked={previewImagery}
            onChange={e=>setPreviewImagery(e.target.checked)}/>{t.programImagery}
        </label>
        <label className={styles.consent}>
          <input type="checkbox" checked={previewReady}
            onChange={e=>setPreviewReady(e.target.checked)}/>{t.programSafety}
        </label>
        <button type="submit" disabled={!previewFocus||!previewReady||outlineBusy}>
          {outlineBusy?t.loading:t.programStart}
        </button>
      </form>
      {outlineError&&<p role="status">{outlineError}</p>}
      {outline&&<section aria-label={t.programTitle} className={styles.outline}>
        <h2>{outline.title}</h2>
        <p className={styles.muted} role="status">{t.programReady}</p>
        <ol>{outline.lessons.map(item=><li key={item.number}>
          <strong>{t.programStep} {item.number}. {item.title}</strong>
          {item.steps.length>0&&<ul>{item.steps.map((step,i)=><li key={i}>{step}</li>)}</ul>}
          <small>{t.programNoMedia}</small>
        </li>)}</ol>
      </section>}
    </details>
  </section>;
}
