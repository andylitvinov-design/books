"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, Download, Headphones, LockKeyhole, Pause, Play, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { buildPersonalImageryCourse, COURSE_THEMES, selectVerifiedCourseEvidence } from "@/lib/mandala/personal-guided-course.mjs";
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
    themes:{energy:"Energy",money:"Money / work",relationships:"Relationships",goals:"Goals",life:"Meaning",health:"Self-care"}
  },
  ru: {
    eyebrow:"ПЕРСОНАЛЬНАЯ ПРОГРАММА",title:"8 видеосессий с образами",
    intro:"Бережный курс из символических сюжетов, установок и текстов для медитаций. На основе ресурсных образов символдрамы, но не автономная психотерапия.",
    personal:"Предложить по моим тестам",accents:"Расставить акценты / цели",close:"Скрыть цели",
    goals:"На чём сделать акцент?",chosen:"Выберите до 3 целей: ваш выбор важнее любых тестовых баллов.",
    profile:"Согласен на чтение моих сохранённых результатов из защищённого кабинета только для подбора на этом устройстве. Данные не отправляются внешнему ИИ и не сохраняются здесь.",
    load:"Подобрать по тестам",loading:"Проверяем подтверждённые показатели…",read:"Учтены проверенные показатели тестов",empty:"Для выбранных целей нет актуальных подтверждённых шкал. Продолжайте с собственными целями.",
    signin:"Войдите в «Мой дом», чтобы использовать сохранённые тесты.",signInLink:"Мой дом",error:"Не удалось получить приватные показатели. Можно продолжить с выбранными целями.",
    none:"Приватный профиль не загружен; только выбранные цели и ваша самооценка.",self:"Самооценка 1–10 отдельно от психометрических шкал.",
    create:"Составить программу из 8 сессий",refresh:"Обновить программу",sequence:"Ваша персональная серия",
    session:"Сессия",film:"видео",free:"Первое видео бесплатно",ready:"Перенести сюжет и установки в редактор",
    firstHelp:"Подготовит существующий локальный видеоредактор на 60 секунд. Нажмите «Создать видео» ниже и скачайте готовый MP4/WebM. Без вашего нажатия рендер не запускается.",
    listen:"Прослушать текст на устройстве",stop:"Остановить озвучку",script:"Текст и сценарий медитации",download:"Скачать текст №1",
    spoken:"Озвучивание устройством — превью, это ещё не скачиваемый аудиофайл с голосом.",
    package:"Полный пакет из 8 сессий",packInfo:"8 проверенных сюжетов, тексты, озвученные аудиомедитации и 8 видео — после проверки специалистом, подтверждённой оплаты и фактической доставки. Остальные 7 пока только анонс.",
    request:"Обсудить полный пакет",locked:"После проверки и подтверждения доступа",
    safeguard:"Если образ неприятен — остановитесь или пропустите. Программа не предназначена для работы с травмой, кризисом или диагностики. Клиническую программу проверяет специалист.",
    privacy:"Приватно: нет загрузки в сторонний ИИ, CRM, рекламные системы или постоянное хранилище браузера. При закрытии страницы данные исчезают.",
    themes:{energy:"Энергия",money:"Деньги / дело",relationships:"Отношения",goals:"Цели",life:"Смыслы",health:"Забота о себе"}
  },
  es: {
    eyebrow:"PROGRAMA PERSONAL",title:"8 vídeos de imágenes guiadas",
    intro:"Ocho escenas simbólicas, frases opcionales y guiones de audio. Inspirado en la imaginería de recursos, no psicoterapia autónoma.",
    personal:"Sugerir según mis pruebas",accents:"Elegir prioridades / metas",close:"Ocultar metas",
    goals:"¿En qué quieres concentrarte?",chosen:"Elige hasta 3 prioridades. Tu elección tiene prioridad sobre las pruebas.",
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
    themes:{energy:"Energía",money:"Dinero / trabajo",relationships:"Relaciones",goals:"Metas",life:"Sentido",health:"Autocuidado"}
  }
} as const;

export function MandalaGuidedCourse({locale,theme,selfRatings,disabled,onApplyFreeVideo}:Props) {
  const t = copy[locale];
  const [goals,setGoals] = useState<VideoTheme[]>([]);
  const [goalsOpen,setGoalsOpen] = useState(false);
  const [consent,setConsent] = useState(false);
  const [profileStatus,setProfileStatus] = useState<Status>("idle");
  const [profileEvidence,setProfileEvidence] = useState<Evidence[]>([]);
  const [planOpen,setPlanOpen] = useState(false);
  const [speaking,setSpeaking] = useState(false);
  const profileRequestRef = useRef(0);
  const actualGoals = goals.length ? goals : [theme];
  const plan = useMemo(()=>buildPersonalImageryCourse({
    locale,theme,goals:actualGoals,selfRatings,evidence:profileEvidence
  }),[locale,theme,goals,selfRatings,profileEvidence]);
  const sessions = plan.sessions as Session[];
  useEffect(()=>()=>{profileRequestRef.current++;if(typeof window!=="undefined")window.speechSynthesis?.cancel();},[]);
  const toggleGoal=(goal:VideoTheme)=>{
    profileRequestRef.current++;
    setProfileEvidence([]);setProfileStatus("idle");setConsent(false);
    setGoals(prev=>prev.includes(goal)?prev.filter(value=>value!==goal):
      prev.length<3?[...prev,goal]:[...prev.slice(1),goal]);
  };
  const withdraw=()=>{
    profileRequestRef.current++;
    setConsent(false);setProfileEvidence([]);setProfileStatus("idle");
  };
  async function loadPrivateProfile(){
    if(!consent || disabled || profileStatus==="loading")return;
    const requestId=++profileRequestRef.current;
    setProfileStatus("loading");setProfileEvidence([]);
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
      const evidence=selectVerifiedCourseEvidence(portrait,actualGoals) as Evidence[];
      if(requestId!==profileRequestRef.current)return;
      setProfileEvidence(evidence);
      setProfileStatus(evidence.length?"ready":"empty");
    } catch {if(requestId===profileRequestRef.current){setProfileEvidence([]);setProfileStatus("error");}}
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
      <span className={css.emblem}><Sparkles size={19} aria-hidden="true"/></span>
      <div className={css.heading}>
        <small>{t.eyebrow}</small><h3 id="guided-course-heading">{t.title}</h3>
      </div>
    </div>
    <p className={css.intro}>{t.intro}</p>
    <div className={css.actions}>
      <button type="button" className={css.primary} onClick={()=>{setGoalsOpen(true);}}
        aria-expanded={goalsOpen} disabled={disabled} data-video-personal-pick>
        <Sparkles size={16} aria-hidden="true"/>{t.personal}
      </button>
      <button type="button" onClick={()=>setGoalsOpen(open=>!open)}
        aria-expanded={goalsOpen} disabled={disabled} data-video-goal-accents>
        <Target size={16} aria-hidden="true"/>{goalsOpen?t.close:t.accents}<ChevronDown size={15} aria-hidden="true"/>
      </button>
    </div>
    {goalsOpen?<div className={css.goalsPanel} data-video-goals-filter>
      <strong>{t.goals}</strong><p>{t.chosen}</p>
      <div className={css.goalChips} role="group" aria-label={t.goals}>
        {(COURSE_THEMES as readonly VideoTheme[]).map(goal=>
          <button type="button" key={goal} disabled={disabled} aria-pressed={actualGoals.includes(goal)}
            onClick={()=>toggleGoal(goal)} data-guided-goal={goal}>
            {actualGoals.includes(goal)?<Check size={14} aria-hidden="true"/>:null}{t.themes[goal]}
          </button>)}
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
          {profileStatus==="ready"?t.read:profileStatus==="empty"?t.empty:
            profileStatus==="signin"?t.signin:profileStatus==="error"?t.error:t.none}
        </small>
      </div>
      {profileStatus==="signin"?<Link href={"/"+locale+"/app"} prefetch={false}>{t.signInLink}</Link>:null}
      {profileEvidence.length?<ul className={css.sources} data-guided-score-provenance>
        {profileEvidence.map(item=><li key={item.axis+"-"+item.measuredAt}>
          {item.axis.replaceAll("_"," ")} · {item.sourceTitle} · {item.measuredAt.slice(0,10)}
        </li>)}
      </ul>:null}
      <small className={css.self}>{t.self}</small>
    </div>:null}
    <button type="button" className={css.planButton} onClick={()=>setPlanOpen(true)}
      disabled={disabled} data-guided-create-plan>
      <BookOpen size={18} aria-hidden="true"/>{planOpen?t.refresh:t.create}
    </button>
    {planOpen?<div className={css.programme} data-guided-eight-sessions>
      <h4>{t.sequence}</h4>
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
