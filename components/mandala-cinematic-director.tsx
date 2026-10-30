"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight, Check, ChevronRight, Download, Film, ShieldCheck, Sparkles, X} from "lucide-react";
import {buildCinematicStoryboard,customizeCinematicShot,CINEMATIC_STYLES,CINEMATIC_THEMES} from "@/lib/mandala/cinematic-director.mjs";
import {compileCinematicReferencePack} from "@/lib/mandala/cinematic-creative-brief.mjs";
import {QUESTION_REGISTRY,projectFieldsFromAnswers,questionsForDraft,questionsForGroup,subjectIsExplicitlyExcluded} from "@/lib/mandala/video-studio-question-registry.mjs";
import {buildCinematicAssemblyManifest,listCinematicRoutes} from "@/lib/mandala/cinematic-production.mjs";
import {graphemeTrim} from "@/lib/mandala/personal-video-intent.mjs";
import {otherVideoScenes} from "@/lib/mandala/holistic-video-themes";
import {moneyScenes} from "@/lib/mandala/money-flow-effects";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-cinematic-director.module.css";

export type CinematicShot={id:string;number:number;title:string;theme:VideoTheme;sceneId:string;
  startSeconds:number;durationSeconds:number;camera:string;providerPrompt:string;visualCue:string};
export type CinematicStoryboard={version:string;theme:VideoTheme;locale:string;styleId:string;
  durationSeconds:number;aspect:"portrait"|"square"|"landscape";shots:readonly CinematicShot[];
  shotCount:number;noExternalClientData:boolean;paidRenderApproved:boolean;localPreview:boolean;
  requiresPractitionerReview:boolean;
  sceneChoices:readonly {sceneId:string;theme:VideoTheme;visualCue:string}[]};
type Field="theme"|"difficulty"|"goal"|"profile"|"style"|"avoid";
type StyleId=keyof typeof CINEMATIC_STYLES;
const QUESTION_GROUPS=["personalization","principal","advanced","pro","extra"] as const;
type QuestionGroup=typeof QUESTION_GROUPS[number];
type StudioQuestion={id:string;scope:string;labels:Record<PublicLocale,string>;
  options:readonly {id:string;labels:Record<PublicLocale,string>}[]};
type BriefMusicPreference="none"|"calm"|"energetic";
type BriefCaptionPreference="none"|"phrases"|"subtitles";
type Props={locale:PublicLocale;theme:VideoTheme;therapyMode:boolean;disabled:boolean;intentText?:string;onIntentTextChange?:(value:string)=>void;onMusicPreference?:(choice:BriefMusicPreference)=>void;onCaptionPreference?:(choice:BriefCaptionPreference)=>void;onApplyStoryboard:(plan:CinematicStoryboard)=>void;onInvalidateStoryboard:()=>void};
const copy={
  en:{title:"Cinematic director",tag:"NEW · LOCAL & PRIVATE",
    intro:"Describe the atmosphere and change you would like to explore. Get a sequence of connected scenes.",
    open:"Plan my film",close:"Close director",edit:"Edit",done:"Done",back:"Back",
    visualIdea:"What would you like to see happen on screen?",
    visualIdeaPlaceholder:"For example: A white eagle flies over mountains and becomes a constellation of light",
    visualIdeaHelp:"Optional. This stays on your device. Only known fictional visual elements appear in the safe reference pack.",
    subjectQuestion:"What should appear on screen?",subjectChoices:["An eagle","A wolf","Nature only"],
    actionQuestion:"What should happen?",actionChoices:["Fly","Transform","Travel"],
    referenceTitle:"Style and reference plan (not generated AI footage)",
    referenceHint:"These are text descriptions of suggested keyframes, not generated pictures.",
    newAiRequired:"This creative scene needs a real video AI model. It is not available here yet; the free montage uses existing animated scenes.",
    supportedLocal:"Your free montage uses our existing moving scenes; no new AI footage or charges.",
    localMatchUnknown:"The free montage uses existing scenes. We cannot verify that they depict your description; review each scene before exporting.",
    understood:"Recognized visual elements",needsMore:"Add a subject or action above to make your story clearer.",categories:{personalization:"Personalization",principal:"Principal",advanced:"Advanced",pro:"Pro Cinematic",extra:"Extra"},refine:"Refine this plan",noQuestions:"No additional questions are needed here.",selectShot:"Choose a scene card to direct this shot.",ownAnswer:"Your answer",
    theme:"Topic",difficulty:"Main challenge",goal:"Desired change",profile:"My profile",style:"Visual style",avoid:"Avoid these images",
    profileEmpty:"Not connected",profileReady:"Verified test suggestions available",
    profileConsent:"I allow the site to read my saved test results in this browser to suggest a video theme. The results are not shared with video AI services, analytics or CRM.",
    profileLoad:"Suggest from my tests",profileLoading:"Reading your protected tests…",
    profileSignIn:"Sign in to your private account to access test suggestions.",
    profileError:"Unable to read tests; select a topic manually.",profileNone:"No current verified test suggestions; you can choose a topic yourself.",
    profileUse:"Choose",profileCabinet:"Update my profile",profileTests:"Take tests",visualOptions:"Style & imagery preferences",
    choose:"Choose a visual direction",custom:"In your own words",goalHint:"A voluntary, realistic next step, not a promise.",
    difficultyPlaceholder:"For example, feeling unsure at work",
    goalPlaceholder:"For example, approach a conversation more calmly",
    avoidPlaceholder:"For example, dark forests or water",
    format:"Format",length:"Length",seconds:"sec",plan:"Create storyboard",refresh:"Update storyboard",
    shots:"Four connected scenes",camera:"Camera",sceneChoice:"Change this shot",privacy:"Only pre-approved visual words may be used in an external AI prompt. Your problem, goals, photo and test results stay in this browser.",
    safe:"Provider-safe visual prompt",local:"Use as free moving montage",localHint:"Applies animated scenes to the existing local recorder. Press Create video below; no provider render or charge is started.",
    download:"Save safe storyboard",quote:"AI Premium · estimate required",quoteHelp:"Kling/Runway/Higgsfield remain quote-only: payment, owner approval and verified provider delivery are not enabled here.",
    myVideos:"My videos",myVideosHint:"Private account saving is available only after separate consent and cloud activation.",
    applied:"Montage selected. Use the existing Create video button to record it.",noData:"No information is sent to a provider.",
    themes:{energy:"Energy",money:"Money & work",relationships:"Relationships",goals:"Goals & purpose",life:"Everyday life",health:"Rest & wellbeing"}},
  ru:{title:"Кинорежиссёр",tag:"НОВОЕ · ЛОКАЛЬНО И ПРИВАТНО",
    intro:"Опишите желаемые изменения и атмосферу. Получите последовательность связанных сцен.",
    open:"Спланировать фильм",close:"Закрыть режиссёра",edit:"Изменить",done:"Готово",back:"Назад",
    visualIdea:"Что вы хотите увидеть в кадре?",
    visualIdeaPlaceholder:"Например: Белый орёл летит над горами и превращается в созвездие",
    visualIdeaHelp:"Необязательное поле. Текст остаётся на устройстве; в безопасный план попадают только распознанные вымышленные образы.",
    subjectQuestion:"Кто или что в кадре?",subjectChoices:["Орёл","Волк","Только природа"],
    actionQuestion:"Что происходит?",actionChoices:["Летит","Превращается","Путешествует"],
    referenceTitle:"План стиля и референсов (не готовое AI-видео)",
    referenceHint:"Это текстовые описания начальных и конечных кадров, а не созданные AI-картинки.",
    newAiRequired:"Для этой оригинальной сцены нужна настоящая видеомодель. Она пока недоступна: бесплатный монтаж использует существующие анимированные сцены.",
    supportedLocal:"Бесплатный монтаж использует готовые движущиеся сцены; новых AI-кадров и расходов нет.",
    localMatchUnknown:"Бесплатный монтаж использует готовые сцены. Их соответствие вашему описанию не проверено — просмотрите каждую сцену перед экспортом.",
    understood:"Распознано в описании",needsMore:"Уточните персонажа или действие выше — тогда сюжет станет понятнее.",categories:{personalization:"Персонализация",principal:"Основное",advanced:"Расширенное",pro:"Про-режиссура",extra:"Дополнительно"},refine:"Уточнить этот план",noQuestions:"В этом разделе дополнительных вопросов не нужно.",selectShot:"Выберите карточку сцены для покадровой режиссуры.",ownAnswer:"Свой ответ",
    theme:"Тема",difficulty:"Главная сложность",goal:"Желаемое изменение",profile:"Мой профиль",style:"Визуальный стиль",avoid:"Нежелательные образы",
    profileEmpty:"Не подключён",profileReady:"Есть рекомендации по проверенным тестам",
    profileConsent:"Я разрешаю прочитать мои сохранённые тесты в браузере для подбора темы видео. Результаты не передаются AI-видеосервисам, аналитике или CRM.",
    profileLoad:"Предложить по моим тестам",profileLoading:"Загружаем защищённые тесты…",
    profileSignIn:"Войдите в личный кабинет, чтобы использовать свои тесты.",
    profileError:"Не удалось прочитать тесты. Выберите тему вручную.",profileNone:"Нет актуальных проверенных рекомендаций. Выберите тему самостоятельно.",
    profileUse:"Выбрать",profileCabinet:"Обновить профиль",profileTests:"Пройти тесты",visualOptions:"Стиль и предпочтения по образам",
    choose:"Выберите художественное направление",custom:"Своими словами",goalHint:"Посильный желаемый шаг, без гарантий результата.",
    difficultyPlaceholder:"Например, неуверенность в рабочем разговоре",
    goalPlaceholder:"Например, говорить спокойнее и свободнее",
    avoidPlaceholder:"Например, тёмный лес или вода",
    format:"Формат",length:"Длительность",seconds:"сек",plan:"Сформировать раскадровку",refresh:"Обновить раскадровку",
    shots:"Четыре связанные сцены",camera:"Камера",sceneChoice:"Заменить кадр",privacy:"Внешнему AI допускаются только проверенные описания образов. Проблема, цели, фото и результаты тестов остаются в браузере.",
    safe:"Безопасный визуальный промпт",local:"Применить бесплатный видеомонтаж",localHint:"Четыре анимированные сцены подготовятся в СУЩЕСТВУЮЩЕМ редакторе. Нажмите ниже «Создать видео». Платного рендера нет.",
    download:"Сохранить раскадровку",quote:"AI Premium · нужна смета",quoteHelp:"Kling/Runway/Higgsfield пока только для оценки возможностей: оплата, утверждение расходов и доставка AI-фильма здесь не включены.",
    myVideos:"Мои видео",myVideosHint:"Приватное облачное хранение включается отдельно, с согласием владельца.",
    applied:"Монтаж подготовлен. Нажмите существующую кнопку «Создать видео».",noData:"Ничего не отправлено внешнему сервису.",
    themes:{energy:"Энергия",money:"Деньги и работа",relationships:"Отношения",goals:"Цели и смыслы",life:"Жизнь",health:"Отдых и самочувствие"}},
  es:{title:"Director cinematográfico",tag:"NUEVO · LOCAL Y PRIVADO",
    intro:"Describe los cambios y el ambiente que deseas explorar. Crea una secuencia de escenas conectadas.",
    open:"Planificar mi película",close:"Cerrar director",edit:"Editar",done:"Listo",back:"Volver",
    visualIdea:"¿Qué quieres ver en la pantalla?",
    visualIdeaPlaceholder:"Por ejemplo: Un águila blanca vuela sobre las montañas y se transforma en una constelación",
    visualIdeaHelp:"Opcional. El texto permanece en tu dispositivo; el plan seguro solo incluye elementos ficticios reconocidos.",
    subjectQuestion:"¿Quién o qué aparece?",subjectChoices:["Un águila","Un lobo","Solo naturaleza"],
    actionQuestion:"¿Qué sucede?",actionChoices:["Vuela","Se transforma","Viaja"],
    referenceTitle:"Plan de estilo y referencias (no vídeo IA generado)",
    referenceHint:"Son descripciones de fotogramas iniciales y finales, no imágenes creadas por IA.",
    newAiRequired:"Esta escena original necesita un modelo de vídeo IA. Aún no está disponible: el montaje gratuito usa escenas animadas existentes.",
    supportedLocal:"El montaje gratuito usa escenas existentes; no hay imágenes nuevas de IA ni cargos.",
    localMatchUnknown:"El montaje gratuito usa escenas existentes. No se ha comprobado que coincidan con tu descripción; revisa cada escena antes de exportar.",
    understood:"Elementos visuales reconocidos",needsMore:"Aclara el personaje o la acción para mejorar el guion.",categories:{personalization:"Personalización",principal:"Principal",advanced:"Avanzado",pro:"Pro cinematográfico",extra:"Extra"},refine:"Mejorar este plan",noQuestions:"No se necesitan más preguntas aquí.",selectShot:"Elige una tarjeta de escena para dirigir este plano.",ownAnswer:"Tu respuesta",
    theme:"Tema",difficulty:"Dificultad principal",goal:"Cambio deseado",profile:"Mi perfil",style:"Estilo visual",avoid:"Evitar estas imágenes",
    profileEmpty:"Sin conectar",profileReady:"Hay sugerencias de tests verificados",
    profileConsent:"Autorizo consultar mis tests guardados en este navegador para sugerir temas del vídeo. Los resultados no se envían a IA de vídeo, analítica ni CRM.",
    profileLoad:"Sugerir desde mis tests",profileLoading:"Consultando tests privados…",
    profileSignIn:"Inicia sesión en tu cuenta privada para consultar los tests.",
    profileError:"No se han podido consultar los tests; elige un tema manualmente.",profileNone:"No hay sugerencias verificadas recientes. Elige un tema manualmente.",
    profileUse:"Elegir",profileCabinet:"Actualizar mi perfil",profileTests:"Realizar tests",visualOptions:"Estilo y preferencias visuales",
    choose:"Elige una dirección visual",custom:"Con tus palabras",goalHint:"Un paso voluntario y posible, sin promesas.",
    difficultyPlaceholder:"Por ejemplo, inseguridad en una conversación",
    goalPlaceholder:"Por ejemplo, hablar con más calma",
    avoidPlaceholder:"Por ejemplo, bosque oscuro o agua",
    format:"Formato",length:"Duración",seconds:"s",plan:"Crear guion visual",refresh:"Actualizar guion visual",
    shots:"Cuatro escenas conectadas",camera:"Cámara",sceneChoice:"Cambiar escena",privacy:"Solo se pueden compartir descripciones visuales aprobadas con IA. Tus dificultades, metas, fotos y tests permanecen en el navegador.",
    safe:"Prompt visual seguro",local:"Usar montaje animado gratis",localHint:"Aplica escenas animadas al grabador local existente. Pulsa Crear vídeo; sin costes externos.",
    download:"Guardar guion visual",quote:"AI Premium · presupuesto requerido",quoteHelp:"Kling/Runway/Higgsfield solo para cotización: el pago, la aprobación y la entrega externa aún no están habilitados.",
    myVideos:"Mis vídeos",myVideosHint:"El almacenamiento privado requiere consentimiento y activación.",
    applied:"Montaje preparado. Pulsa el botón existente Crear vídeo.",noData:"No se enviaron datos a proveedores.",
    themes:{energy:"Energía",money:"Dinero y trabajo",relationships:"Relaciones",goals:"Metas y sentido",life:"Vida",health:"Descanso y bienestar"}},
} as const;
// Names are taken from the same three-language scene catalog as the original
// editor. English visualCue/providerPrompt remains internal to the disclosure
// and offline owner handoff, not the primary client-facing shot label.
function sceneDisplayName(theme:VideoTheme,sceneId:string,locale:PublicLocale):string{
  if(theme==="money")return moneyScenes.find(item=>item.id===sceneId)?.label[locale]||sceneId;
  return otherVideoScenes[theme].find(item=>item.id===sceneId)?.label[locale]||sceneId;
}
const FIELDS:Field[]=["theme","difficulty","goal","profile"];
export function MandalaCinematicDirector({locale,theme,therapyMode,disabled,intentText,onIntentTextChange,onMusicPreference,onCaptionPreference,onApplyStoryboard,onInvalidateStoryboard}:Props){
  const t=copy[locale]||copy.en;
  const [expanded,setExpanded]=useState(false);
  const [editing,setEditing]=useState<Field|null>(null);
  const [topic,setTopic]=useState<VideoTheme>(theme);
  const [difficulty,setDifficulty]=useState("");
  const [goal,setGoal]=useState("");
  const [localVisualIdea,setLocalVisualIdea]=useState("");
  const visualIdea=intentText??localVisualIdea;
  const [questionGroup,setQuestionGroup]=useState<QuestionGroup>("principal");
  const [revisingQuestion,setRevisingQuestion]=useState<string|null>(null);
  const [questionAnswers,setQuestionAnswers]=useState<Record<string,{selectedOptionId:string|null;customText:string|null;confirmed:boolean}>>({});
  const [selectedShotNumber,setSelectedShotNumber]=useState<number|null>(null);
  const [shotAnswers,setShotAnswers]=useState<Record<number,Record<string,{selectedOptionId:string|null;customText:string|null;confirmed:boolean}>>>({});
  const [subjectChoice,setSubjectChoice]=useState("");
  const [actionChoice,setActionChoice]=useState("");
  const [avoid,setAvoid]=useState("");
  const [style,setStyle]=useState<StyleId>("warm");
  const [aspect,setAspect]=useState<"portrait"|"square"|"landscape">("landscape");
  const [seconds,setSeconds]=useState<15|20|30|60>(20);
  const [generated,setGenerated]=useState(false);
  const [generatedMode,setGeneratedMode]=useState(therapyMode);
  const [applied,setApplied]=useState(false);
  const [customPlan,setCustomPlan]=useState<CinematicStoryboard|null>(null);
  const [profileConsent,setProfileConsent]=useState(false);
  const [profileState,setProfileState]=useState<"idle"|"loading"|"ready"|"signin"|"error">("idle");
  const [profileSuggestions,setProfileSuggestions]=useState<VideoTheme[]>([]);
  const profileRequestRef=useRef(0);
  const editRef=useRef<HTMLButtonElement>(null);
  const projectFields=useMemo(()=>projectFieldsFromAnswers(questionAnswers),[questionAnswers]);
  const basePlan=useMemo(()=>buildCinematicStoryboard({
    locale,theme:topic,style:(projectFields.styleId||style) as StyleId,aspect:(projectFields.aspect||aspect) as "portrait"|"square"|"landscape",
    durationSeconds:(projectFields.durationSeconds||seconds) as 15|20|30|60,wish:goal+" "+difficulty,avoid,
    mode:therapyMode?"therapy":"creative",
  }),[locale,topic,style,aspect,seconds,goal,difficulty,avoid,therapyMode,projectFields]);
  const initialQuestions=useMemo(()=>questionsForDraft({intentText:visualIdea,answers:questionAnswers}) as readonly StudioQuestion[],[visualIdea,questionAnswers]);
  const activeSceneAnswers=selectedShotNumber===null?{}:shotAnswers[selectedShotNumber]||{};
  const categoryAnswers=questionGroup==="pro"?activeSceneAnswers:questionAnswers;
  const categoryQuestions=useMemo(()=>questionsForGroup({intentText:visualIdea,answers:categoryAnswers,group:questionGroup,
    sceneSelected:Boolean(selectedShotNumber),extraSelected:questionGroup==="extra"&&generated}) as readonly StudioQuestion[],[visualIdea,categoryAnswers,questionGroup,selectedShotNumber,generated]);
  const visibleCategoryQuestions=generated?categoryQuestions.filter(question=>!initialQuestions.some(initial=>initial.id===question.id)):[];
  const plan:CinematicStoryboard=customPlan && customPlan.requiresPractitionerReview===therapyMode ? customPlan : basePlan;
  const showStoryboard=generated && generatedMode===therapyMode;
  const shotDirections=useMemo(()=>plan.shots.map(shot=>({shotId:shot.id,answers:shotAnswers[shot.number]||{}})),[plan,shotAnswers]);
  const referencePack=useMemo(()=>compileCinematicReferencePack({
    visualIdea,plan,answers:{subjectChoice:projectFields.subjectChoice||subjectChoice,actionChoice:projectFields.actionChoice||actionChoice},
    shotDirections,
  }),[visualIdea,plan,subjectChoice,actionChoice,projectFields,shotDirections]);
  const manifest=useMemo(()=>buildCinematicAssemblyManifest(plan),[plan]);
  const candidates=useMemo(()=>listCinematicRoutes({visibility:"client_private"}),[]);
  // A local storyboard survives Apply when its chosen topic becomes the parent topic.
  // A genuinely external topic change resets the stale draft instead.
  useEffect(()=>()=>{profileRequestRef.current++;},[]);
  const withdrawProfile=()=>{
    profileRequestRef.current++;
    setProfileConsent(false);setProfileSuggestions([]);setProfileState("idle");
  };
  async function loadPrivateSuggestions(){
    if(!profileConsent||disabled||profileState==="loading")return;
    const requestId=++profileRequestRef.current;
    setProfileState("loading");setProfileSuggestions([]);
    try{
      const response=await fetch("/api/app/bootstrap?view=portrait",{
        method:"GET",credentials:"same-origin",cache:"no-store",redirect:"error",
        headers:{"Accept":"application/json"},referrerPolicy:"no-referrer",
      });
      if(requestId!==profileRequestRef.current)return;
      if(response.status===401||response.status===403){setProfileState("signin");return;}
      if(!response.ok)throw Error("protected_profile_unavailable");
      const data:unknown=await response.json();
      if(!data||typeof data!=="object"||!("account" in data)||
        !("results" in data)||!Array.isArray(data.results))throw Error("invalid_profile");
      // Parse first-party, current source-validated axes only after consent.
      // The full private record is never stored, serialized into the storyboard,
      // or submitted to a video AI provider.
      const [{buildPsychPortrait},{suggestGuidedGoalsFromProfile}]=await Promise.all([
        import("@/lib/assessments/psych-portrait.js"),
        import("@/lib/mandala/personal-guided-course.mjs"),
      ]);
      const suggested=suggestGuidedGoalsFromProfile(buildPsychPortrait(data.results));
      if(requestId!==profileRequestRef.current)return;
      const allowed=new Set<string>(Array.from(CINEMATIC_THEMES));
      setProfileSuggestions(suggested.filter((x:string)=>allowed.has(x)).slice(0,3) as VideoTheme[]);
      setProfileState("ready");
    }catch{
      if(requestId===profileRequestRef.current){
        setProfileSuggestions([]);setProfileState("error");
      }
    }
  }
  const parentThemeRef=useRef(theme);
  useEffect(()=>{
    if(parentThemeRef.current===theme)return;
    parentThemeRef.current=theme;
    if(topic!==theme){setTopic(theme);setGenerated(false);setApplied(false);setCustomPlan(null);}
  },[theme,topic]);
  useEffect(()=>{
    if(!editing)return;
    editRef.current?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setEditing(null);};
    window.addEventListener("keydown",escape);
    return()=>window.removeEventListener("keydown",escape);
  },[editing]);
  const values:Record<Field,string>={
    theme:t.themes[topic],difficulty:difficulty||"—",goal:goal||"—",
    profile:profileState==="ready"&&profileSuggestions.length?t.profileReady:t.profileEmpty,
    style:CINEMATIC_STYLES[style].name[locale],avoid:avoid||"—",
  };
  const invalidate=()=>{
    setGenerated(false);setApplied(false);setCustomPlan(null);setSelectedShotNumber(null);
    onInvalidateStoryboard();
  };
  const updateVisualIdea=(value:string)=>{
    const clean=graphemeTrim(value,2000);
    if(onIntentTextChange)onIntentTextChange(clean);else setLocalVisualIdea(clean);
    // A new explicit exclusion is a manual correction, not an additional
    // suggestion.  Clear only the contradicted animal identity so the
    // remaining answers (for example, the action) survive the revision.
    setQuestionAnswers(current=>{
      const selected=current.PERSONAL_07?.selectedOptionId;
      if(!subjectIsExplicitlyExcluded(clean.toLowerCase(),selected))return current;
      return {...current,PERSONAL_07:{selectedOptionId:null,customText:null,confirmed:false}};
    });
    invalidate();
  };
  const fieldValue=(field:Field)=>field==="difficulty"?difficulty:field==="goal"?goal:avoid;
  const fieldChange=(field:Field,value:string)=>{
    const clean=graphemeTrim(value,160);
    if(field==="difficulty")setDifficulty(clean);
    else if(field==="goal")setGoal(clean);
    else if(field==="avoid")setAvoid(clean);
    invalidate();
  };
  const selectTopic=(next:VideoTheme)=>{setTopic(next);invalidate();};
  const selectStyle=(next:StyleId)=>{setStyle(next);invalidate();};
  const onPlan=()=>{setGeneratedMode(therapyMode);setGenerated(true);setApplied(false);setSelectedShotNumber(null);onInvalidateStoryboard();};
  const answerStudioQuestion=(questionId:string,selectedOptionId:string|null,customText:string|null=null,sceneScoped=false,confirmed=true)=>{
    if(sceneScoped&&selectedShotNumber!==null){
      setShotAnswers(current=>({...current,[selectedShotNumber]:{...current[selectedShotNumber],[questionId]:{selectedOptionId,customText,confirmed}}}));
      setApplied(false);onInvalidateStoryboard();
      return;
    }
    setQuestionAnswers(current=>({...current,[questionId]:{selectedOptionId,customText,confirmed}}));
    if(questionId==="BASIC_09"&&(selectedOptionId==="none"||selectedOptionId==="calm"||selectedOptionId==="energetic"))
      onMusicPreference?.(selectedOptionId);
    if(questionId==="BASIC_10"&&(selectedOptionId==="none"||selectedOptionId==="phrases"||selectedOptionId==="subtitles"))
      onCaptionPreference?.(selectedOptionId);
    if(confirmed)invalidate();
  };
  const answerForQuestion=(question:{id:string;scope:string})=>question.scope==="scene"&&selectedShotNumber!==null?
    shotAnswers[selectedShotNumber]?.[question.id]:questionAnswers[question.id];
  const chooseShot=(number:number,sceneId:string)=>{
    try{
      const next=customizeCinematicShot(plan,number,sceneId);
      setCustomPlan(next as CinematicStoryboard);setApplied(false);onInvalidateStoryboard();
    }catch{
      // A forged/obsolete scene option never reaches the recorder or provider.
      setCustomPlan(null);setGenerated(false);onInvalidateStoryboard();
    }
  };
  const apply=()=>{
    onApplyStoryboard(plan as CinematicStoryboard);
    setApplied(true);
  };
  const save=()=>{
    const safeManifest={...manifest,creativeReferencePack:referencePack,
      shots:plan.shots.map(s=>({title:s.title,camera:s.camera,
      visualCue:s.visualCue,providerPrompt:s.providerPrompt,...manifest.clips[s.number-1]}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(safeManifest,null,2)+"\n"],
      {type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="holistic-house-cinematic-storyboard.json";
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1200);
  };
  return <section className={css.root} id="cinematic-director" data-cinematic-director
    data-director-open={expanded?"true":"false"} aria-label={t.title}>
    <div className={css.hero}>
      <span className={css.icon}><Film size={22} aria-hidden="true"/></span>
      <div className={css.heading}><small>{t.tag}</small><h3>{t.title}</h3><p>{t.intro}</p></div>
      <button type="button" className={css.open} disabled={disabled}
        aria-expanded={expanded} aria-controls="cinematic-director-content"
        onClick={()=>{setExpanded(o=>!o);setEditing(null);}}>
        {expanded?t.close:t.open}<ChevronRight size={16} aria-hidden="true"/>
      </button>
    </div>
    {expanded?<div id="cinematic-director-content" className={css.body}>
      <label className={css.ideaInput} data-director-visual-idea>
        <strong>{t.visualIdea}</strong>
        <textarea rows={3} maxLength={2000} value={visualIdea} disabled={disabled}
          placeholder={t.visualIdeaPlaceholder}
          onChange={event=>updateVisualIdea(event.target.value)}/>
        <small>{t.visualIdeaHelp}</small>
      </label>
      <section className={css.questionCategories} data-director-contextual-questions>
        <nav className={css.categoryTabs} aria-label="Video Studio categories">
          {QUESTION_GROUPS.map(group=><button type="button" key={group} data-director-category={group}
            aria-pressed={questionGroup===group} onClick={()=>setQuestionGroup(group)}>{t.categories[group]}</button>)}
        </nav>
        {[...Object.entries(questionAnswers).map(([id,answer])=>({id,answer,scene:false})),
          ...(selectedShotNumber===null?[]:Object.entries(activeSceneAnswers).map(([id,answer])=>({id,answer,scene:true})))].filter(({answer})=>answer.confirmed).map(({id,answer,scene})=>{
          const question=(QUESTION_REGISTRY as readonly StudioQuestion[]).find(item=>item.id===id);
          if(!question)return null;
          const revisionKey=scene?`scene-${selectedShotNumber}-${id}`:id;
          const label=answer.customText||question.options.find(option=>option.id===answer.selectedOptionId)?.labels[locale];
          if(!label&&revisingQuestion!==revisionKey)return null;
          return <div key={revisionKey} className={css.contextQuestion} data-director-answer={id} data-director-answer-scope={scene?"scene":"global"}>
            <span>{question.labels[locale]}: {label}</span>
            {revisingQuestion===revisionKey?<>
              <div className={css.chips}>{question.options.map(option=><button type="button" key={option.id} disabled={disabled}
                aria-pressed={answer.selectedOptionId===option.id} onClick={()=>{answerStudioQuestion(id,option.id,null,scene);setRevisingQuestion(null);}}>{option.labels[locale]}</button>)}</div>
              <input value={answer.customText||""} placeholder={t.ownAnswer} disabled={disabled}
                onChange={event=>{const value=event.target.value;if(scene&&selectedShotNumber!==null)
                  setShotAnswers(current=>({...current,[selectedShotNumber]:{...current[selectedShotNumber],[id]:{...current[selectedShotNumber][id],customText:value,selectedOptionId:null}}}));
                  else setQuestionAnswers(current=>({...current,[id]:{...current[id],customText:value,selectedOptionId:null}}));}}/>
              <button type="button" disabled={disabled} onClick={()=>{answerStudioQuestion(id,null,answer.customText,scene);setRevisingQuestion(null);}}>{t.done}</button>
            </>:<button type="button" disabled={disabled} onClick={()=>setRevisingQuestion(revisionKey)}>{t.edit}</button>}
          </div>;
        })}
        <div className={css.questionList}>
          {initialQuestions.map(question=><fieldset key={question.id} className={css.contextQuestion}>
            <legend>{question.labels[locale]}</legend>
            <div className={css.chips}>{question.options.map(option=><button type="button" key={option.id} disabled={disabled}
              aria-pressed={questionAnswers[question.id]?.selectedOptionId===option.id}
              onClick={()=>answerStudioQuestion(question.id,option.id)}>{option.labels[locale]}</button>)}</div>
            <input value={questionAnswers[question.id]?.customText||""} placeholder={t.ownAnswer}
              onChange={event=>answerStudioQuestion(question.id,null,event.target.value,false,false)}
              onBlur={event=>{if(event.target.value.trim())answerStudioQuestion(question.id,null,event.target.value);}} disabled={disabled}/>
          </fieldset>)}
          {generated?visibleCategoryQuestions.length?visibleCategoryQuestions.map(question=>{
            const answer=answerForQuestion(question);
            const sceneScoped=question.scope==="scene";
            return <fieldset key={question.id} className={css.contextQuestion}>
              <legend>{question.labels[locale]}</legend>
              <div className={css.chips}>{question.options.map(option=><button type="button" key={option.id} disabled={disabled}
                aria-pressed={answer?.selectedOptionId===option.id}
                onClick={()=>answerStudioQuestion(question.id,option.id,null,sceneScoped)}>{option.labels[locale]}</button>)}</div>
              <input value={answer?.customText||""} placeholder={t.ownAnswer}
                onChange={event=>answerStudioQuestion(question.id,null,event.target.value,sceneScoped,false)}
                onBlur={event=>{if(event.target.value.trim())answerStudioQuestion(question.id,null,event.target.value,sceneScoped);}} disabled={disabled}/>
            </fieldset>;
          }):<small>{questionGroup==="pro"&&selectedShotNumber===null?t.selectShot:t.noQuestions}</small>:null}
        </div>
      </section>
      <div className={css.fields}>
        {FIELDS.map(field=><button type="button" key={field} className={css.field}
          data-director-field={field} disabled={disabled} onClick={()=>setEditing(field)}>
          <span><small>{t[field]}</small><strong>{values[field]}</strong></span>
          <span className={css.edit}>{t.edit}<ChevronRight size={15} aria-hidden="true"/></span>
        </button>)}
      </div>
      <details className={css.visualPrefs} data-director-visual-preferences>
        <summary>{t.visualOptions}</summary>
        <div className={css.fields}>
          {(["style","avoid"] as const).map(field=><button key={field} type="button"
            className={css.field} data-director-field={field} disabled={disabled}
            onClick={()=>setEditing(field)}>
            <span><small>{t[field]}</small><strong>{values[field]}</strong></span>
            <span className={css.edit}>{t.edit}<ChevronRight size={15} aria-hidden="true"/></span>
          </button>)}
        </div>
      </details>
      <div className={css.options}>
        <fieldset disabled={disabled}><legend>{t.format}</legend>
          <div className={css.chips}>
            {(["landscape","portrait","square"] as const).map((v,i)=><button type="button" key={v}
              aria-pressed={aspect===v} onClick={()=>{setAspect(v);invalidate();}}>
              {["16:9","9:16","1:1"][i]}</button>)}
          </div>
        </fieldset>
        <fieldset disabled={disabled}><legend>{t.length}</legend>
          <div className={css.chips}>{([15,20,30,60] as const).map(v=>
            <button key={v} type="button" aria-pressed={seconds===v}
              onClick={()=>{setSeconds(v);invalidate();}}>{v} {t.seconds}</button>)}
          </div>
        </fieldset>
      </div>
      <button type="button" className={css.primary} data-director-create-plan disabled={disabled}
        onClick={onPlan}><Sparkles size={17} aria-hidden="true"/>{showStoryboard?t.refresh:t.plan}</button>
      <p className={css.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
      {therapyMode?<p className={css.privacy} data-director-therapy-review role="note">
        {locale==="ru"?"Это ресурсная образная практика, не лечение или диагноз. Полная персональная терапевтическая программа требует проверки специалистом.":
          locale==="es"?"Es una práctica de imaginación, no un diagnóstico ni tratamiento. El programa terapéutico personalizado requiere revisión profesional.":
          "This is a resource-oriented imagery practice, not diagnosis or treatment. A full personalized therapy programme requires practitioner review."}
      </p>:null}
      {showStoryboard?<div className={css.story} data-director-storyboard>
        <h4>{t.shots} · {manifest.durationSeconds} {t.seconds}</h4>
        <div className={css.shots}>{plan.shots.map(shot=><article key={shot.id}
          className={css.shot} data-director-shot={shot.number} data-director-shot-selected={selectedShotNumber===shot.number?"true":"false"}>
          <span className={css.number}>{String(shot.number).padStart(2,"0")}</span>
          <div><strong>{shot.title}</strong><p>{t.themes[shot.theme]} · {sceneDisplayName(shot.theme,shot.sceneId,locale)}</p>
            <small>{shot.startSeconds}–{shot.startSeconds+shot.durationSeconds} {t.seconds} · {shot.sceneId}</small>
            <label className={css.sceneChoice}>
              <span>{t.sceneChoice}</span>
              <select data-director-scene-choice={shot.number} value={shot.sceneId} disabled={disabled}
                onChange={event=>chooseShot(shot.number,event.currentTarget.value)}>
                {plan.sceneChoices.filter(item=>item.theme===shot.theme||item.sceneId===shot.sceneId)
                  .map(item=><option key={item.sceneId} value={item.sceneId}>
                    {sceneDisplayName(item.theme,item.sceneId,locale)}
                  </option>)}
              </select>
            </label>
            <button type="button" className={css.shotSelect} data-director-shot-select={shot.number}
              aria-pressed={selectedShotNumber===shot.number} disabled={disabled}
              onClick={()=>{setSelectedShotNumber(shot.number);setQuestionGroup("pro");}}>{t.refine}</button>
            <details><summary>{t.safe}</summary><p>{referencePack.shots[shot.number-1]?.artOnlyPrompt||shot.providerPrompt}</p></details></div>
        </article>)}</div>
        <div className={css.reference} data-director-reference-pack>
          <strong>{t.referenceTitle}</strong>
          {referencePack.creativeSummary?<p data-director-recognized-visuals>
            {t.understood}: {referencePack.creativeSummary}</p>:null}
          {referencePack.contextualQuestions.length?<p>{t.needsMore}</p>:null}
          <p data-director-new-ai-status>
            {referencePack.requestedNovelVideo&&!referencePack.newAiVideoAvailable?t.newAiRequired:
              !referencePack.localMatchVerified?t.localMatchUnknown:t.supportedLocal}</p>
          <details><summary>{t.referenceHint}</summary>
            <ol>{referencePack.shots.map((shot:{shotId:string;reference:{start:string;end:string}})=><li key={shot.shotId}>
              <span>{shot.reference.start}</span>
              <span>{shot.reference.end}</span>
            </li>)}</ol>
          </details>
        </div>
        <button type="button" className={css.primary} data-director-apply-montage
          disabled={disabled} onClick={apply}><Check size={18} aria-hidden="true"/>{t.local}</button>
        <p className={css.helper}>{applied?t.applied:t.localHint}</p>
        <div className={css.secondary}>
          <button type="button" data-director-download-packet onClick={save}><Download size={16} aria-hidden="true"/>{t.download}</button>
          <Link prefetch={false} href={"/"+locale+"/app/videos"}>{t.myVideos}<ArrowRight size={14} aria-hidden="true"/></Link>
        </div><p className={css.helper}>{t.myVideosHint}</p>
        <div className={css.quote} data-director-provider-quote><strong>{t.quote}</strong>
          <p>{t.quoteHelp}</p><small>{candidates.filter(c=>c.id!=="local").map(c=>c.label).join(" · ")}</small></div>
      </div>:null}
    </div>:null}
    {editing?<div className={css.backdrop} role="presentation">
      <div className={css.sheet} role="dialog" aria-modal="true" aria-labelledby="director-edit-title">
        <div className={css.sheetHead}><h3 id="director-edit-title">{t[editing]}</h3>
          <button type="button" ref={editRef} onClick={()=>setEditing(null)} aria-label={t.back}>
            <X size={20} aria-hidden="true"/></button></div>
        {editing==="theme"?<div className={css.sheetChoices} role="group" aria-label={t.theme}>
          {(CINEMATIC_THEMES as VideoTheme[]).map(item=><button type="button" key={item}
            aria-pressed={topic===item} onClick={()=>selectTopic(item)}>{t.themes[item]}</button>)}
        </div>:editing==="profile"?<div className={css.profileOptions} data-director-profile-options>
          <label className={css.profileConsent}><input type="checkbox"
            data-director-profile-consent checked={profileConsent} disabled={disabled}
            onChange={event=>event.target.checked?setProfileConsent(true):withdrawProfile()}/>
            <span>{t.profileConsent}</span></label>
          <button type="button" className={css.primary} data-director-profile-import
            disabled={disabled||!profileConsent||profileState==="loading"}
            onClick={()=>void loadPrivateSuggestions()}>
            <Sparkles size={16} aria-hidden="true"/>
            {profileState==="loading"?t.profileLoading:t.profileLoad}
          </button>
          <p className={css.privacy} role="status">{profileState==="signin"?t.profileSignIn:
            profileState==="error"?t.profileError:
            profileState==="ready"&&!profileSuggestions.length?t.profileNone:
            profileState==="ready"?t.profileReady:t.profileEmpty}</p>
          {profileState==="ready"&&profileSuggestions.length?<div className={css.sheetChoices}
            data-director-profile-suggestions>
            {profileSuggestions.map(item=><button type="button" key={item}
              onClick={()=>{selectTopic(item);setEditing(null);}}>
              {t.profileUse}: {t.themes[item]}</button>)}
          </div>:null}
          <div className={css.secondary}>
            <Link href={"/"+locale+"/app"} prefetch={false}>{t.profileCabinet}</Link>
            <Link href={"/"+locale+"/client/tests"} prefetch={false}>{t.profileTests}</Link>
          </div>
        </div>:editing==="style"?<div className={css.sheetChoices} role="group" aria-label={t.choose}>
          {Object.entries(CINEMATIC_STYLES).map(([id,item])=><button type="button" key={id}
            aria-pressed={style===id} onClick={()=>selectStyle(id as StyleId)}>{item.name[locale]}</button>)}
        </div>:<label className={css.freeText}><span>{t.custom}</span>
          <textarea rows={5} maxLength={160} value={fieldValue(editing)}
            placeholder={editing==="difficulty"?t.difficultyPlaceholder:editing==="goal"?t.goalPlaceholder:t.avoidPlaceholder}
            onChange={event=>fieldChange(editing,event.target.value)}/>
          {editing==="goal"?<small>{t.goalHint}</small>:null}
        </label>}
        <p className={css.privacy}>{t.noData}</p>
        <button type="button" className={css.primary} onClick={()=>setEditing(null)}>
          <Check size={17} aria-hidden="true"/>{t.done}</button>
      </div>
    </div>:null}
  </section>;
}

