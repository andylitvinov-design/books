"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Check, ChevronDown, Download, Headphones, Heart, LockKeyhole, Moon, Pause, Play, RefreshCw, ShieldCheck, Sparkles, Sun, Target } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { affirmationGoalCatalog } from "@/lib/mandala/video-affirmations";
import type { VideoAffirmationGoal } from "@/lib/mandala/video-affirmations";
import { buildPersonalImageryCourse, COURSE_THEMES, selectVerifiedCourseEvidence, suggestGuidedGoalsFromProfile } from "@/lib/mandala/personal-guided-course.mjs";
import { chooseMeditationCourseTheme } from "@/lib/mandala/adaptive-meditation-course.mjs";
import { buildPersonalMeditationScript, isMeditationSafetyResponse } from "@/lib/mandala/personal-meditation-script.mjs";
import { selectResourcePractice } from "@/lib/mandala/resource-practice-selector.mjs";
import css from "./mandala-guided-course.module.css";

type Evidence = {axis:string;sourceTitle:string;measuredAt:string;definitionKey:string;percent:number};
type Session = {id:string;number:number;theme:VideoTheme;videoTheme:VideoTheme;videoScene:string;title:string;motif:string;scenes:string[];script:string;videoDurationSeconds:number};
type Status = "idle"|"loading"|"ready"|"empty"|"signin"|"error";
export type GuidedMeditationFocus = {
  difficulty:string;goal:string;goals:VideoTheme[];details:string[];
};
type Props = {
  onContextChange?: (focus:GuidedMeditationFocus)=>void;
  onAddMeditation?: (script:string)=>void;
  onOmitMeditation?: ()=>void;
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
    request:"Request the course",locked:"Review and verified access needed",
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
    request:"Заказать курс",locked:"После проверки и подтверждения доступа",
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
    request:"Solicitar el curso",locked:"Requiere revisión y acceso confirmado",
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

const flowCopy = {
  ru:{
    focus:"Фокус практики",state:"Состояние",vector:"Вектор развития",
    stateHint:"Выберите состояние, которое хотите поддержать. Можно уточнить цели ниже.",
    vectorHint:"От состояния сейчас → к желаемому состоянию",
    focusRequired:"Выберите состояние или цель.",vectorRequired:"Укажите состояние сейчас и желаемое.",transferLabel:"В повседневной жизни",
    stateOptions:{calm:"Спокойствие и сон",support:"Опора в себе",energy:"Больше энергии",connection:"Близость и тепло"},
    meditation:"Сформировать медитацию",generateMeditation:"Сгенерировать медитацию",meditationText:"Текст медитации",
    include:"Добавить медитацию к видео",omit:"Не добавлять",included:"Текст передан в редактор озвучки ниже. Озвучка и видео создаются только после отдельных подтверждений.",
    omitted:"Медитация останется отдельным текстом, в видео она не добавляется.",local:"Персональный текст формируется на устройстве без отправки результатов тестов внешнему ИИ.",
    practice:"Практика или ритуал",ritual:"Ритуал",exercise:"Упражнение",daily:"Практика",
    practiceLead:"Небольшая практика по выбранному фокусу. Можно остановиться или пропустить любой шаг.",
    refreshPractice:"Другой вариант",program:"Личная программа развития",generateProgram:"Сгенерировать личную программу развития в 8 сессий",
    companion:"Дополнительные настройки и результаты тестов по согласию"
  },
  en:{
    focus:"Practice focus",state:"Present state",vector:"Development direction",
    stateHint:"Choose a state to nurture. You can refine your goals below.",
    vectorHint:"From how you feel now → to how you want to feel",
    focusRequired:"Choose a state or a goal first.",vectorRequired:"Fill in both your current and desired states.",transferLabel:"Everyday transfer",
    stateOptions:{calm:"Calm and sleep",support:"Inner support",energy:"More energy",connection:"Closeness and warmth"},
    meditation:"Create your meditation",generateMeditation:"Generate meditation",meditationText:"Meditation script",
    include:"Add meditation to video",omit:"Do not add",included:"Script sent to the narration editor below. Voice and video require separate explicit actions.",
    omitted:"Your meditation stays as a separate text and will not be in the video.",local:"Script is assembled on this device; test results are not sent to outside AI.",
    practice:"Practice or ritual",ritual:"Ritual",exercise:"Exercise",daily:"Practice",
    practiceLead:"A small practice around your chosen focus. Pause or skip any step.",
    refreshPractice:"Try another",program:"Personal development plan",generateProgram:"Generate my 8-session personal development plan",
    companion:"Optional settings and test results with consent"
  },
  es:{
    focus:"Enfoque de la práctica",state:"Estado",vector:"Dirección de desarrollo",
    stateHint:"Elige un estado que quieras cultivar. Puedes afinar tus metas abajo.",
    vectorHint:"De tu estado actual → al estado que deseas",
    focusRequired:"Elige un estado o una meta.",vectorRequired:"Completa el estado actual y el deseado.",transferLabel:"En la vida diaria",
    stateOptions:{calm:"Calma y descanso",support:"Apoyo interior",energy:"Más energía",connection:"Cercanía y calidez"},
    meditation:"Crear meditación",generateMeditation:"Generar meditación",meditationText:"Texto de meditación",
    include:"Añadir meditación al vídeo",omit:"No añadir",included:"Texto enviado al editor de voz. La voz y el vídeo requieren acciones y consentimientos separados.",
    omitted:"Tu meditación seguirá siendo un texto separado.",local:"El texto se crea en tu dispositivo; las pruebas no se envían a una IA externa.",
    practice:"Práctica o ritual",ritual:"Ritual",exercise:"Ejercicio",daily:"Práctica",
    practiceLead:"Una breve práctica según tu enfoque. Puedes detener o saltar cualquier paso.",
    refreshPractice:"Otra variante",program:"Programa de desarrollo personal",generateProgram:"Generar mi programa personal de 8 sesiones",
    companion:"Opciones y pruebas con consentimiento"
  }
} as const;
const stateOptions = [
  {id:"calm",theme:"health" as VideoTheme,Icon:Moon},
  {id:"support",theme:"goals" as VideoTheme,Icon:Briefcase},
  {id:"energy",theme:"energy" as VideoTheme,Icon:Sun},
  {id:"connection",theme:"relationships" as VideoTheme,Icon:Heart}
] as const;
type PracticeKind = "ritual" | "exercise" | "daily";

export function MandalaGuidedCourse({locale,theme,selfRatings,disabled,onApplyFreeVideo,onContextChange,onAddMeditation,onOmitMeditation}:Props) {
  const t = copy[locale];
  const f = flowCopy[locale];
  const [focusMode,setFocusMode] = useState<"state"|"vector">("state");
  const [selectedState,setSelectedState] = useState<string|null>(null);
  const [meditationOpen,setMeditationOpen] = useState(false);
  const [meditationChoice,setMeditationChoice] = useState<"include"|"omit"|null>(null);
  const [practiceKind,setPracticeKind] = useState<PracticeKind>("ritual");
  const [practiceVariant,setPracticeVariant] = useState(0);
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
  const vectorTheme=chooseMeditationCourseTheme({request:keyGoal,theme}) as VideoTheme;
  const activeTheme:VideoTheme=focusMode==="vector"?vectorTheme:(goals[0]||theme);
  const actualGoals=goals.length?goals:[activeTheme];
  const detailLabels=useMemo(()=>detailGoals.flatMap(id=>
    affirmationGoalCatalog[locale].filter(item=>item.id===id).map(item=>item.label)),[detailGoals,locale]);
  const practiceResult=useMemo(()=>selectResourcePractice({
    locale,theme:activeTheme,kind:practiceKind==="daily"?"practice":practiceKind,
    revision:practiceVariant,
    focus:{difficulty:keyDifficulty,goal:keyGoal,goals:actualGoals,details:detailLabels},
  }),[locale,activeTheme,practiceKind,practiceVariant,keyDifficulty,keyGoal,goals,detailLabels]);
  const safetyProbe=useMemo(()=>buildPersonalMeditationScript({
    locale,theme:activeTheme,wish:keyGoal,technique:"grounding",length:3,
    focus:{difficulty:keyDifficulty,goal:keyGoal,goals:actualGoals,details:detailLabels},
  }),[locale,activeTheme,keyDifficulty,keyGoal,goals,detailLabels]);
  const safetyBlocked=practiceResult.status==="blocked"||isMeditationSafetyResponse(safetyProbe,locale);
  const safetyMessage=practiceResult.status==="blocked"?practiceResult.message:safetyBlocked?safetyProbe:"";
  const needsVector=focusMode==="vector"&&(!keyDifficulty.trim()||!keyGoal.trim());
  const needsState=focusMode==="state"&&!selectedState&&!keyGoal.trim()&&!goals.length;
  const focusReady=!safetyBlocked&&!needsVector&&!needsState;
  const journeySignature=JSON.stringify([focusMode,selectedState,activeTheme,goals,detailGoals,keyDifficulty,keyGoal,profileEvidence,selfRatings]);
  const [approvedSignature,setApprovedSignature]=useState("");
  const [programmeSignature,setProgrammeSignature]=useState("");
  const currentMeditation=meditationOpen&&approvedSignature===journeySignature&&focusReady;
  const currentProgramme=planOpen&&programmeSignature===journeySignature&&focusReady;
  // Only the visitor's explicit, on-device focus is shared with the
  // meditation composer. Never forward private test scores or raw answers.
  useEffect(()=>{
    onContextChange?.({difficulty:keyDifficulty,goal:keyGoal,goals:actualGoals,details:detailLabels});
  },[onContextChange,keyDifficulty,keyGoal,goals,activeTheme,detailLabels,locale]);
  const plan = useMemo(()=>buildPersonalImageryCourse({
    locale,theme:activeTheme,goals:actualGoals,selfRatings,evidence:profileEvidence,keyDifficulty,keyGoal,
    detailGoals:detailLabels
  }),[locale,activeTheme,goals,selfRatings,profileEvidence,keyDifficulty,keyGoal,detailLabels]);
  const sessions = plan.sessions as Session[];
  const firstScript = sessions[0]?.script || "";
  const resetGeneratedMeditation=()=>{
    if(meditationChoice==="include")onOmitMeditation?.();
    setMeditationOpen(false);setMeditationChoice(null);setPlanOpen(false);
    setApprovedSignature("");setProgrammeSignature("");
  };
  const previousSignatureRef=useRef(journeySignature);
  useEffect(()=>{
    if(previousSignatureRef.current===journeySignature)return;
    previousSignatureRef.current=journeySignature;
    if(meditationChoice==="include")onOmitMeditation?.();
    setMeditationOpen(false);setMeditationChoice(null);setPlanOpen(false);
    setApprovedSignature("");setProgrammeSignature("");
  },[journeySignature,meditationChoice,onOmitMeditation]);
  const selectState=(id:string,goalTheme:VideoTheme)=>{
    setSelectedState(id);setGoals([goalTheme]);setKeyGoal(f.stateOptions[id as keyof typeof f.stateOptions]);
    setKeyDifficulty("");resetGeneratedMeditation();
  };
  useEffect(()=>()=>{profileRequestRef.current++;if(typeof window!=="undefined")window.speechSynthesis?.cancel();},[]);
  const toggleGoal=(goal:VideoTheme)=>{
    resetGeneratedMeditation();
    setGoals(prev=>prev.includes(goal)?prev.filter(value=>value!==goal):
      prev.length<3?[...prev,goal]:[...prev.slice(1),goal]);
  };
  const toggleDetailGoal=(id:VideoAffirmationGoal)=>{
    resetGeneratedMeditation();
    setDetailGoals(previous=>previous.includes(id)?previous.filter(value=>value!==id):
      previous.length<3?[...previous,id]:previous);
  };
  const withdraw=()=>{
    resetGeneratedMeditation();
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
      resetGeneratedMeditation();
      setProfileEvidence(evidence);
      setSuggestedGoals(suggested);
      setProfileStatus(evidence.length?"ready":"empty");
    } catch {if(requestId===profileRequestRef.current){setProfileEvidence([]);setProfileStatus("error");}}
  }
  function generateMeditation(){
    if(disabled||!focusReady||!firstScript)return;
    setApprovedSignature(journeySignature);
    setMeditationOpen(true);setMeditationChoice(null);
  }
  function createProgramme(){
    if(disabled||!focusReady||profileStatus==="loading")return;
    setProgrammeSignature(journeySignature);
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
      <div className={css.flowTitle}><span>01</span><Target size={23} aria-hidden="true"/><h4>{f.focus}</h4></div>
      <div className={css.focusSwitch} role="group" aria-label={f.focus}>
        <button type="button" aria-pressed={focusMode==="state"} disabled={disabled}
          onClick={()=>{setFocusMode("state");setSelectedState(null);setGoals([]);setKeyGoal("");setKeyDifficulty("");resetGeneratedMeditation();}}><Heart size={20} aria-hidden="true"/>{f.state}</button>
        <button type="button" aria-pressed={focusMode==="vector"} disabled={disabled}
          onClick={()=>{setFocusMode("vector");setSelectedState(null);setGoals([]);setKeyGoal("");setKeyDifficulty("");resetGeneratedMeditation();}}><Target size={20} aria-hidden="true"/>{f.vector}</button>
      </div>
      {focusMode==="state"?<div className={css.stateGrid} role="group" aria-label={f.state}>
        {stateOptions.map(({id,theme:goalTheme,Icon})=><button key={id} type="button" disabled={disabled}
          aria-pressed={selectedState===id} data-guided-focus-state={id}
          onClick={()=>selectState(id,goalTheme)}>
          <Icon size={22} aria-hidden="true"/>{f.stateOptions[id]}
          {selectedState===id?<Check size={18} aria-hidden="true"/>:null}
        </button>)}
      </div>:<div className={css.focusFields}>
        <label htmlFor="therapy-key-difficulty">
          <span>{t.difficultyLabel}</span>
          <textarea id="therapy-key-difficulty" rows={2} maxLength={140}
            data-video-key-difficulty value={keyDifficulty} placeholder={t.difficultyPlaceholder}
            disabled={disabled} onChange={event=>{setKeyDifficulty(event.currentTarget.value);setSelectedState(null);resetGeneratedMeditation();}}/>
        </label>
        <label htmlFor="therapy-key-goal">
          <span>{t.goalLabel}</span>
          <textarea id="therapy-key-goal" rows={2} maxLength={140}
            data-video-key-goal value={keyGoal} placeholder={t.goalPlaceholder}
            disabled={disabled} onChange={event=>{setKeyGoal(event.currentTarget.value);setSelectedState(null);resetGeneratedMeditation();}}/>
        </label>
      </div>}
      <p className={css.focusHint}>{focusMode==="state"?f.stateHint:f.vectorHint}</p>
      {safetyBlocked?<p role="alert" className={css.profileNotice}>{safetyMessage}</p>:
        (needsVector||needsState)?<p role="note" className={css.profileNotice}>
          {needsVector?f.vectorRequired:f.focusRequired}</p>:null}
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
            onClick={()=>{resetGeneratedMeditation();setGoals(suggestedGoals);}}>{t.applySuggested}</button>
        </div>:null}
        {plan.evidence.length?<ul className={css.sources} data-guided-score-provenance>
          {plan.evidence.map(item=><li key={item.axis+"-"+item.measuredAt}>
            {item.axis.replaceAll("_"," ")} · {item.sourceTitle} · {item.measuredAt.slice(0,10)}
          </li>)}
        </ul>:null}
        <small className={css.self}>{t.self}</small>
      </div>:null}
      {profileStatus==="loading"?<p className={css.profileNotice} role="status">{t.loading}</p>:null}
      {profileStatus==="signin"?<p className={css.profileNotice}>{t.signin} <Link href={"/"+locale+"/app"} prefetch={false}>{t.signInLink}</Link></p>:null}
      {profileStatus==="error"?<p className={css.profileNotice} role="status">{t.error}</p>:null}

    </div>
    <section className={css.flowBlock} data-guided-meditation-step>
      <div className={css.flowTitle}><span>02</span><Headphones size={23} aria-hidden="true"/><h4>{f.meditation}</h4></div>
      <button type="button" className={css.flowPrimary} data-guided-generate-meditation
        disabled={disabled||!firstScript||!focusReady} onClick={generateMeditation}>
        <Sparkles size={22} aria-hidden="true"/>{f.generateMeditation}<ArrowRight size={20} aria-hidden="true"/>
      </button>
      {currentMeditation?<div className={css.flowResult} data-guided-meditation-result>
        <strong><BookOpen size={20} aria-hidden="true"/>{f.meditationText}</strong>
        <div className={css.meditationScript}>{firstScript}</div>
        <div className={css.meditationChoices}>
          <button type="button" disabled={disabled} data-guided-add-meditation
            aria-pressed={meditationChoice==="include"} onClick={()=>{
              setMeditationChoice("include");onAddMeditation?.(firstScript);
            }}><Play size={18} aria-hidden="true"/>{f.include}</button>
          <button type="button" disabled={disabled} data-guided-skip-meditation
            aria-pressed={meditationChoice==="omit"} onClick={()=>{setMeditationChoice("omit");onOmitMeditation?.();}}>{f.omit}</button>
        </div>
        <small role="status">{meditationChoice==="include"?f.included:meditationChoice==="omit"?f.omitted:f.local}</small>
      </div>:null}
    </section>
    {currentMeditation?<section className={css.flowBlock} data-guided-practice-step>
      <div className={css.flowTitle}><span>03</span><Heart size={23} aria-hidden="true"/><h4>{f.practice}</h4></div>
      <div className={css.practicePanel}>
        <div className={css.practicePicker} role="group" aria-label={f.practice}>
          {(["ritual","exercise","daily"] as const).map(kind=><button key={kind} type="button"
            disabled={disabled} aria-pressed={practiceKind===kind} onClick={()=>{setPracticeKind(kind);setPracticeVariant(0);}}>
            {kind==="ritual"?f.ritual:kind==="exercise"?f.exercise:f.daily}
          </button>)}
        </div>
        {practiceResult.status==="ready"?<>
          <h5>{practiceResult.title}</h5>
          <p>{f.practiceLead} {practiceResult.description}</p>
          <p><small>{practiceResult.topic}</small></p>
          <ol>{practiceResult.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
          <p><strong>{f.transferLabel}:</strong> {practiceResult.transfer}</p>
          <button className={css.practiceRefresh} type="button" disabled={disabled}
            onClick={()=>setPracticeVariant(current=>current+1)}>
            <RefreshCw size={17} aria-hidden="true"/>{f.refreshPractice}
          </button>
        </>:<p role="alert">{practiceResult.message}</p>}
      </div>
    </section>:null}
    <section className={css.flowBlock} data-guided-programme-step>
      <div className={css.flowTitle}><span>04</span><BookOpen size={23} aria-hidden="true"/><h4>{f.program}</h4></div>
      <button type="button" className={css.planButton} onClick={createProgramme}
        disabled={disabled||!focusReady||profileStatus==="loading"} data-guided-create-plan>
        <Sparkles size={22} aria-hidden="true"/>
        <span><strong>{f.generateProgram}</strong>
          <small>{consent?t.fromTests:t.fromGoals}</small></span>
        <ArrowRight size={18} aria-hidden="true"/>
      </button>
    </section>
    {currentProgramme?<div className={css.programme} data-guided-eight-sessions>
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
        <small className={css.enquiryNote}>{locale==="ru"?"Откроется заявка на обсуждение курса. Оплата и создание видео не запускаются.":
          locale==="es"?"Se abre una consulta sobre el curso, sin pago ni creación automática de vídeos.":
          "Opens a course enquiry, not a payment or automatic video production."}</small>
      </div>
      <p className={css.safeguard} role="note">{t.safeguard}</p>
    </div>:null}
    <p className={css.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
  </section>;
}
