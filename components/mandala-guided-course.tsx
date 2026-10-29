"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, Download, Headphones, LockKeyhole, Pause, Play, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { affirmationGoalCatalog } from "@/lib/mandala/video-affirmations";
import type { VideoAffirmationGoal } from "@/lib/mandala/video-affirmations";
import { buildPersonalImageryCourse, COURSE_THEMES, selectVerifiedCourseEvidence, suggestGuidedGoalsFromProfile } from "@/lib/mandala/personal-guided-course.mjs";
import css from "./mandala-guided-course.module.css";

type Evidence = {axis:string;sourceTitle:string;measuredAt:string;definitionKey:string;percent:number};
type Session = {id:string;number:number;theme:VideoTheme;videoTheme:VideoTheme;videoScene:string;title:string;motif:string;scenes:string[];script:string;videoDurationSeconds:number};
type Status = "idle"|"loading"|"ready"|"empty"|"signin"|"error";
type Props = {
  locale:PublicLocale; theme:VideoTheme; selfRatings:Partial<Record<VideoTheme,number>>;
  disabled:boolean; onApplyFreeVideo:(session:Session)=>void;
};
const copy = {
  en: {
    eyebrow:"PERSONAL IMAGERY COURSE",title:"Your 8-part video journey",
    intro:"A gentle sequence of symbolic scenes, optional affirmations and spoken imagery. Inspired by resource-focused guided imagery; not autonomous psychotherapy.",
    personal:"Suggest from my test profile",accents:"Set accents / goals",close:"Hide goals",
    goals:"What would you like to give attention to?",chosen:"Choose up to 3 priorities; your choice comes before test scores.",
    suggested:"Topics with recent source-verified results (not a diagnosis or ranking of needs)",applySuggested:"Choose these themes",
    profile:"I consent to read my saved test results from my protected account for this on-device course preview. Nothing is sent to an external AI or stored here.",
    load:"Use saved scores",loading:"Reading verified scores…",read:"Verified test indicators considered",empty:"No current source-verified measures for these goals. Your chosen goals still work.",
    signin:"Sign in to My House to use saved tests.",signInLink:"My House",error:"Could not read your saved test profile. Continue with your chosen goals.",
    none:"No private profile loaded; selected goals and optional self-ratings only.",self:"Your 1–10 check-in is separate from validated test scores.",
    create:"Plan my 8 sessions",refresh:"Update programme",sequence:"Your personalised sequence",
    session:"Session",film:"video",free:"Free first video",ready:"Apply scene and affirmations to editor",
    firstHelp:"This prepares the existing 60-second local video editor. Tap Create video below, then download the actual MP4/WebM; no video is created automatically.",
    listen:"Listen to script on this device",stop:"Stop reading",script:"Text + voice script",download:"Save free script",
    spoken:"Device read-aloud is a preview, not a downloadable narrated audio file.",
    package:"Full 8-session package",packInfo:"8 reviewed storyboards, scripts, narrated audio meditations and 8 videos — available only after practitioner approval, confirmed payment and actual delivery. The remaining seven are previews, not unlocked purchases.",
    request:"Discuss the full package",locked:"Review and verified access needed",
    safeguard:"Pause or skip any image that feels uncomfortable. Do not use this for trauma exposure, crisis care or diagnosis. A qualified practitioner must review any clinical treatment plan.",
    privacy:"Private: no upload, third-party AI, CRM, marketing tags or persistent browser storage. Closing the page clears the profile preview.",
    focusLabel:"YOUR PERSONAL FOCUS",focusHeading:"What matters most to you now?",
    focusDescription:"Two short notes are enough. Your words shape the imagery of the eight sessions.",
    difficultyLabel:"Key difficulty · optional",difficultyPlaceholder:"For example: it is hard to pause and feel settled",
    goalLabel:"Key goal · optional",goalPlaceholder:"For example: move forward calmly and confidently",
    checkGoals:"Review my goals",selectedGoals:"Your priorities",stage:"8 gentle steps",
    detailed:"Specify your focus",detailHint:"Choose up to 3 specific goals from the same video editor filter.",
    fromGoals:"From your chosen goals · tests only with consent",fromTests:"From your goals and saved test results",
    themes:{energy:"Energy",money:"Money / work",relationships:"Relationships",goals:"Goals",life:"Meaning",health:"Self-care"}
  },
  ru: {
    eyebrow:"ПЕРСОНАЛЬНАЯ ПРОГРАММА",title:"8 видеосессий с образами",
    intro:"Бережный курс из символических сюжетов, установок и текстов для медитаций. На основе ресурсных образов символдрамы, но не автономная психотерапия.",
    personal:"Предложить по моим тестам",accents:"Расставить акценты / цели",close:"Скрыть цели",
    goals:"На чём сделать акцент?",chosen:"Выберите до 3 целей: ваш выбор важнее любых тестовых баллов.",
    suggested:"Темы, по которым есть свежие проверенные шкалы (не диагноз и не оценка тяжести)",applySuggested:"Выбрать эти темы",
    profile:"Согласен на чтение моих сохранённых результатов из защищённого кабинета только для подбора на этом устройстве. Данные не отправляются внешнему ИИ и не сохраняются здесь.",
    load:"Подобрать по тестам",loading:"Проверяем подтверждённые показатели…",read:"Учтены проверенные показатели тестов",empty:"Для выбранных целей нет актуальных подтверждённых шкал. Продолжайте с собственными целями.",
    signin:"Войдите в «Мой дом», чтобы использовать сохранённые тесты.",signInLink:"Мой дом",error:"Не удалось получить приватные показатели. Можно продолжить с выбранными целями.",
    none:"Приватный профиль не загружен; только выбранные цели и ваша самооценка.",self:"Самооценка 1–10 отдельно от психометрических шкал.",
    create:"Сформировать программу",refresh:"Обновить программу",sequence:"Ваша персональная серия",
    session:"Сессия",film:"видео",free:"Первое видео бесплатно",ready:"Перенести сюжет и установки в редактор",
    firstHelp:"Подготовит существующий локальный видеоредактор на 60 секунд. Нажмите «Создать видео» ниже и скачайте готовый MP4/WebM. Без вашего нажатия рендер не запускается.",
    listen:"Прослушать текст на устройстве",stop:"Остановить озвучку",script:"Текст и сценарий медитации",download:"Скачать текст №1",
    spoken:"Озвучивание устройством — превью, это ещё не скачиваемый аудиофайл с голосом.",
    package:"Полный пакет из 8 сессий",packInfo:"8 проверенных сюжетов, тексты, озвученные аудиомедитации и 8 видео — после проверки специалистом, подтверждённой оплаты и фактической доставки. Остальные 7 пока только анонс.",
    request:"Обсудить полный пакет",locked:"После проверки и подтверждения доступа",
    safeguard:"Если образ неприятен — остановитесь или пропустите. Программа не предназначена для работы с травмой, кризисом или диагностики. Клиническую программу проверяет специалист.",
    privacy:"Приватно: нет загрузки в сторонний ИИ, CRM, рекламные системы или постоянное хранилище браузера. При закрытии страницы данные исчезают.",
    focusLabel:"ЛИЧНЫЙ ФОКУС",focusHeading:"Что для вас важно сейчас?",
    focusDescription:"Достаточно пары фраз. Они помогут подобрать образы и сюжет восьми встреч.",
    difficultyLabel:"Ключевая сложность · необязательно",difficultyPlaceholder:"Например: трудно расслабиться после рабочего дня",
    goalLabel:"Ключевая цель · необязательно",goalPlaceholder:"Например: больше спокойствия и уверенности",
    checkGoals:"Проверить мои цели",selectedGoals:"Ваши акценты",stage:"8 бережных шагов",
    detailed:"Уточнить цели",detailHint:"До 3 конкретных целей из того же фильтра, что и в видеоредакторе.",
    fromGoals:"8 сессий по вашим целям · тесты по согласию",fromTests:"8 сессий по вашим целям и тестам",
    themes:{energy:"Энергия",money:"Деньги / дело",relationships:"Отношения",goals:"Цели",life:"Смыслы",health:"Забота о себе"}
  },
  es: {
    eyebrow:"PROGRAMA PERSONAL",title:"8 vídeos de imágenes guiadas",
    intro:"Ocho escenas simbólicas, frases opcionales y guiones de audio. Inspirado en la imaginería de recursos, no psicoterapia autónoma.",
    personal:"Sugerir según mis pruebas",accents:"Elegir prioridades / metas",close:"Ocultar metas",
    goals:"¿En qué quieres concentrarte?",chosen:"Elige hasta 3 prioridades. Tu elección tiene prioridad sobre las pruebas.",
    suggested:"Temas con resultados recientes verificados (no diagnóstico ni gravedad)",applySuggested:"Elegir estos temas",
    profile:"Acepto leer mis resultados guardados de mi cuenta protegida solo para esta vista previa en mi dispositivo. No se envían a IA externa ni se guardan aquí.",
    load:"Usar resultados guardados",loading:"Verificando resultados…",read:"Indicadores verificados considerados",empty:"No hay resultados recientes verificados para estas metas. Puedes continuar.",
    signin:"Inicia sesión en Mi Casa para usar tus pruebas.",signInLink:"Mi Casa",error:"No se pudo leer el perfil. Continúa con tus metas.",
    none:"Sin perfil privado; solo tus prioridades y autoevaluaciones.",self:"Autoevaluación 1–10 separada de pruebas validadas.",
    create:"Crear mi plan de 8 sesiones",refresh:"Actualizar plan",sequence:"Tu serie personalizada",
    session:"Sesión",film:"vídeo",free:"Primer vídeo gratis",ready:"Usar escena y afirmaciones en el editor",
    firstHelp:"Prepara el editor local para un vídeo de 60 segundos. Pulsa Crear vídeo abajo y descarga el MP4/WebM real. No se genera automáticamente.",
    listen:"Escuchar guion en este dispositivo",stop:"Detener audio",script:"Texto y guion",download:"Descargar guion gratis",
    spoken:"La voz del dispositivo es una vista previa, no un archivo de narración descargable.",
    package:"Paquete completo de 8 sesiones",packInfo:"8 guiones revisados, textos, meditaciones narradas y 8 vídeos, solo tras revisión profesional, pago confirmado y entrega real. Los 7 restantes son avances.",
    request:"Consultar el paquete",locked:"Requiere revisión y acceso confirmado",
    safeguard:"Detente o salta cualquier imagen incómoda. No es para exposición a traumas, crisis ni diagnósticos. Un profesional debe revisar los planes clínicos.",
    privacy:"Privado: sin envío a IA externa, CRM, anuncios ni almacenamiento permanente. Los datos desaparecen al cerrar.",
    focusLabel:"TU ENFOQUE PERSONAL",focusHeading:"¿Qué es importante para ti ahora?",
    focusDescription:"Bastan dos notas breves para orientar las imágenes de las ocho sesiones.",
    difficultyLabel:"Dificultad principal · opcional",difficultyPlaceholder:"Por ejemplo: me cuesta relajarme después del trabajo",
    goalLabel:"Objetivo principal · opcional",goalPlaceholder:"Por ejemplo: avanzar con calma y confianza",
    checkGoals:"Revisar mis metas",selectedGoals:"Tus prioridades",stage:"8 pasos amables",
    detailed:"Definir las prioridades",detailHint:"Elige hasta 3 metas del mismo filtro que usa el editor de vídeo.",
    fromGoals:"Según tus metas · pruebas solo con permiso",fromTests:"Según tus metas y resultados guardados",
    themes:{energy:"Energía",money:"Dinero / trabajo",relationships:"Relaciones",goals:"Metas",life:"Sentido",health:"Autocuidado"}
  }
} as const;

export function MandalaGuidedCourse({locale,theme,selfRatings,disabled,onApplyFreeVideo}:Props) {
  const t = copy[locale];
  const [goals,setGoals] = useState<VideoTheme[]>([]);
  const [goalsOpen,setGoalsOpen] = useState(false);
  const [detailGoals,setDetailGoals] = useState<VideoAffirmationGoal[]>([]);
  const [keyDifficulty,setKeyDifficulty] = useState("");
  const [keyGoal,setKeyGoal] = useState("");
  const [consent,setConsent] = useState(false);
  const [profileStatus,setProfileStatus] = useState<Status>("idle");
  const [profileEvidence,setProfileEvidence] = useState<Evidence[]>([]);
  const [suggestedGoals,setSuggestedGoals] = useState<VideoTheme[]>([]);
  const [planOpen,setPlanOpen] = useState(false);
  const [speaking,setSpeaking] = useState(false);
  const profileRequestRef = useRef(0);
  const actualGoals = goals.length ? goals : [theme];
  const plan = useMemo(()=>buildPersonalImageryCourse({
    locale,theme,goals:actualGoals,selfRatings,evidence:profileEvidence,keyDifficulty,keyGoal,
    detailGoals:detailGoals.flatMap(id=>affirmationGoalCatalog[locale].filter(item=>item.id===id).map(item=>item.label))
  }),[locale,theme,goals,selfRatings,profileEvidence,keyDifficulty,keyGoal,detailGoals]);
  const sessions = plan.sessions as Session[];
  useEffect(()=>()=>{profileRequestRef.current++;if(typeof window!=="undefined")window.speechSynthesis?.cancel();},[]);
  const toggleGoal=(goal:VideoTheme)=>{
    // Once explicitly consented and verified, the source readings can be
    // reused for a different chosen focus without another network request.
    setGoals(prev=>prev.includes(goal)?prev.filter(value=>value!==goal):
      prev.length<3?[...prev,goal]:[...prev.slice(1),goal]);
  };
  const toggleDetailGoal=(id:VideoAffirmationGoal)=>{
    setDetailGoals(previous=>previous.includes(id)?previous.filter(value=>value!==id):
      previous.length<3?[...previous,id]:previous);
  };
  const withdraw=()=>{
    profileRequestRef.current++;
    setConsent(false);setProfileEvidence([]);setSuggestedGoals([]);setProfileStatus("idle");
  };
  async function loadPrivateProfile(){
    if(!consent || disabled || profileStatus==="loading")return;
    const requestId=++profileRequestRef.current;
    setProfileStatus("loading");setProfileEvidence([]);setSuggestedGoals([]);
    try{
      const response=await fetch("/api/app/bootstrap?view=portrait",{
        method:"GET",credentials:"same-origin",cache:"no-store",redirect:"error",
        headers:{"Accept":"application/json"},referrerPolicy:"no-referrer",
      });
      if(requestId!==profileRequestRef.current)return;
      if(response.status===401 || response.status===403){setProfileStatus("signin");return;}
      if(!response.ok)throw new Error("private profile unavailable");
      const data:unknown=await response.json();
      if(!data || typeof data!=="object" || !("account" in data) || !("results" in data) ||
        !Array.isArray(data.results))throw new Error("invalid private profile");
      // Dynamic import avoids loading protected psychometric interpretation code
      // until the user deliberately opts in. The validated result never leaves this browser.
      const {buildPsychPortrait}=await import("@/lib/assessments/psych-portrait.js");
      const portrait=buildPsychPortrait(data.results);
      // A single authenticated read supports changing the 1-3 goals later.
      // Only the first-party source-cleared portrait leaves the parsing step;
      // deduplicate by validated axis. Nothing is persisted or transmitted.
      const candidates=COURSE_THEMES.flatMap(goal=>selectVerifiedCourseEvidence(portrait,[goal]));
      const evidence=Array.from(new Map(candidates.map(item=>[item.axis,item])).values()).slice(0,17) as Evidence[];
      const suggested=suggestGuidedGoalsFromProfile(portrait) as VideoTheme[];
      if(requestId!==profileRequestRef.current)return;
      setProfileEvidence(evidence);
      setSuggestedGoals(suggested);
      setProfileStatus(evidence.length?"ready":"empty");
    } catch {if(requestId===profileRequestRef.current){setProfileEvidence([]);setProfileStatus("error");}}
  }
  function createProgramme(){
    if(disabled || profileStatus==="loading")return;
    setPlanOpen(true);
    if(consent && !["ready","empty"].includes(profileStatus))void loadPrivateProfile();
  }
  function speak(script:string){
    if(typeof window==="undefined" || !("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    if(speaking){setSpeaking(false);return;}
    const utterance=new SpeechSynthesisUtterance(script);
    utterance.lang=locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US";
    utterance.rate=0.88;
    utterance.onend=()=>setSpeaking(false);
    utterance.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(utterance);setSpeaking(true);
  }
  function downloadFirst(script:string){
    const blob=new Blob([script+"\n"],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="holistic-house-guided-imagery-01-"+locale+".txt";
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  return <section className={css.panel} data-video-guided-course aria-labelledby="guided-course-heading">
    <div className={css.header}>
      <span className={css.emblem}><Sparkles size={20} aria-hidden="true"/></span>
      <div className={css.heading}>
        <small>{t.eyebrow}</small><h3 id="guided-course-heading">{t.title}</h3>
      </div>
      <span className={css.stageBadge}>01—08</span>
    </div>
    <p className={css.intro}>{t.intro}</p>
    <div className={css.focusCard} data-video-therapy-focus>
      <div className={css.focusHeading}>
        <small><Target size={14} aria-hidden="true"/>{t.focusLabel}</small>
        <h4>{t.focusHeading}</h4>
        <p>{t.focusDescription}</p>
      </div>
      <div className={css.focusFields}>
        <label htmlFor="therapy-key-difficulty">
          <span>{t.difficultyLabel}</span>
          <textarea id="therapy-key-difficulty" rows={2} maxLength={140}
            data-video-key-difficulty value={keyDifficulty} placeholder={t.difficultyPlaceholder}
            disabled={disabled} onChange={event=>setKeyDifficulty(event.currentTarget.value)}/>
        </label>
        <label htmlFor="therapy-key-goal">
          <span>{t.goalLabel}</span>
          <textarea id="therapy-key-goal" rows={2} maxLength={140}
            data-video-key-goal value={keyGoal} placeholder={t.goalPlaceholder}
            disabled={disabled} onChange={event=>setKeyGoal(event.currentTarget.value)}/>
        </label>
      </div>
      <div className={css.goalActions}>
        <button type="button" className={css.goalReview}
          data-video-goal-accents data-video-personal-pick disabled={disabled}
          onClick={()=>setGoalsOpen(open=>!open)} aria-expanded={goalsOpen}
          aria-controls="video-therapy-goals">
          <Target size={17} aria-hidden="true"/>{goalsOpen?t.close:t.checkGoals}
          <ChevronDown size={16} aria-hidden="true"/>
        </button>
        <span className={css.goalSelection}>{t.selectedGoals}: {actualGoals.map(item=>t.themes[item]).join(" · ")}{detailGoals.length?" · "+detailGoals.length+"/3":""}</span>
      </div>
      {goalsOpen?<div className={css.goalsPanel} id="video-therapy-goals" data-video-goals-filter>
        <strong>{t.goals}</strong><p>{t.chosen}</p>
        <div className={css.goalChips} role="group" aria-label={t.goals}>
          {(COURSE_THEMES as readonly VideoTheme[]).map(goal=>
            <button type="button" key={goal} disabled={disabled} aria-pressed={actualGoals.includes(goal)}
              onClick={()=>toggleGoal(goal)} data-guided-goal={goal}>
              {actualGoals.includes(goal)?<Check size={14} aria-hidden="true"/>:null}{t.themes[goal]}
            </button>)}
        </div>
        <div className={css.detailPanel} data-video-therapy-detailed-goals>
          <strong>{t.detailed}</strong>
          <small>{t.detailHint}</small>
          <div className={css.detailChips} role="group" aria-label={t.detailed}>
            {affirmationGoalCatalog[locale].map(item=>
              <button type="button" key={item.id} data-guided-focus-goal={item.id}
                aria-pressed={detailGoals.includes(item.id)}
                disabled={disabled||(!detailGoals.includes(item.id)&&detailGoals.length>=3)}
                onClick={()=>toggleDetailGoal(item.id)}>
                {detailGoals.includes(item.id)?<Check size={13} aria-hidden="true"/>:null}
                {item.label}
              </button>)}
          </div>
        </div>
        <label className={css.consent}>
          <input type="checkbox" checked={consent} disabled={disabled}
            onChange={event=>event.target.checked?setConsent(true):withdraw()}
            data-guided-profile-consent/>
          <span>{t.profile}</span>
        </label>
        <div className={css.profileActions}>
          <button type="button" disabled={disabled||!consent||profileStatus==="loading"}
            onClick={()=>void loadPrivateProfile()} data-guided-profile-import>
            <ShieldCheck size={15} aria-hidden="true"/>{profileStatus==="loading"?t.loading:t.load}
          </button>
          <small aria-live="polite">
            {profileStatus==="ready"?(plan.evidence.length?t.read:t.empty):profileStatus==="empty"?t.empty:
              profileStatus==="signin"?t.signin:profileStatus==="error"?t.error:t.none}
          </small>
        </div>
        {profileStatus==="ready" && suggestedGoals.length?<div className={css.suggestions} data-guided-goal-suggestions>
          <small>{t.suggested}</small>
          <div>{suggestedGoals.map(goal=><span key={goal}>{t.themes[goal]}</span>)}</div>
          <button type="button" disabled={disabled} data-guided-apply-suggestions
            onClick={()=>setGoals(suggestedGoals)}>{t.applySuggested}</button>
        </div>:null}
        {plan.evidence.length?<ul className={css.sources} data-guided-score-provenance>
          {plan.evidence.map(item=><li key={item.axis+"-"+item.measuredAt}>
            {item.axis.replaceAll("_"," ")} · {item.sourceTitle} · {item.measuredAt.slice(0,10)}
          </li>)}
        </ul>:null}
        <small className={css.self}>{t.self}</small>
      </div>:null}
      <button type="button" className={css.planButton} onClick={createProgramme}
        disabled={disabled||profileStatus==="loading"} data-guided-create-plan>
        <BookOpen size={23} aria-hidden="true"/>
        <span><strong>{planOpen?t.refresh:t.create}</strong>
          <small>{consent?t.fromTests:t.fromGoals}</small></span>
      </button>
      {profileStatus==="loading"?<p className={css.profileNotice} role="status">{t.loading}</p>:null}
      {profileStatus==="signin"?<p className={css.profileNotice}>{t.signin} <Link href={"/"+locale+"/app"} prefetch={false}>{t.signInLink}</Link></p>:null}
      {profileStatus==="error"?<p className={css.profileNotice} role="status">{t.error}</p>:null}
    </div>
    {planOpen?<div className={css.programme} data-guided-eight-sessions>
      <div className={css.sequenceHeader}><div><small>{t.stage}</small><h4>{t.sequence}</h4></div><span>8 / 8</span></div>
      <div className={css.sessionTrack} aria-label={t.sequence}>
        {sessions.map((session,index)=><span key={session.id} className={index===0?css.trackActive:""}>
          {String(index+1).padStart(2,"0")}
        </span>)}
      </div>
      <div className={css.sessionList}>
        {sessions.map((session,index)=><article className={css.sessionCard} key={session.id}
          data-guided-session={session.number}>
          <div className={css.sessionHeader}>
            <span className={css.number}>{String(index+1).padStart(2,"0")}</span>
            <div><small>{t.session} {session.number} · {t.themes[session.theme]}</small>
              <h5>{session.title}</h5><p>{session.motif}</p></div>
            {index>0?<LockKeyhole size={17} aria-label={t.locked}/>:<Check size={17} aria-hidden="true"/>}
          </div>
          {index===0?<div className={css.first}>
            <span className={css.free}>{t.free}</span>
            <p>{session.scenes.join(" ")}</p>
            <button type="button" className={css.apply} disabled={disabled}
              onClick={()=>onApplyFreeVideo(session)} data-guided-free-video>
              <Play size={16} aria-hidden="true"/>{t.ready}
            </button>
            <p className={css.help}>{t.firstHelp}</p>
            <details className={css.script}>
              <summary>{t.script}</summary>
              <p>{session.script}</p>
            </details>
            <div className={css.secondaryActions}>
              <button type="button" onClick={()=>speak(session.script)}>
                {speaking?<Pause size={15} aria-hidden="true"/>:<Headphones size={15} aria-hidden="true"/>}
                {speaking?t.stop:t.listen}
              </button>
              <button type="button" onClick={()=>downloadFirst(session.script)}>
                <Download size={15} aria-hidden="true"/>{t.download}
              </button>
            </div>
            <small>{t.spoken}</small>
          </div>:<p className={css.locked}>{t.locked}</p>}
        </article>)}
      </div>
      <div className={css.package}>
        <h4>{t.package}</h4><p>{t.packInfo}</p>
        <Link href={"/"+locale+"/services/imagery-therapy"} prefetch={false}>{t.request}</Link>
      </div>
      <p className={css.safeguard} role="note">{t.safeguard}</p>
    </div>:null}
    <p className={css.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
  </section>;
}
