"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { appFetch } from "@/lib/app/client-fetch";
import Image from "next/image";
import Link from "next/link";
import { BrainCircuit, Check, ChevronDown, ChevronRight, CirclePlay, Film, Pencil, SlidersHorizontal, Sparkles, Target, WandSparkles } from "lucide-react";
import type { VideoLocale, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import {
  affirmationGoalCatalog, buildHypnoFilteredPhrases, compactCustomAffirmationInput, hypnoRequestProblems,
  linesForVideoAffirmations, suggestedVideoAffirmations,
} from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings, VideoAffirmationGoal } from "@/lib/mandala/video-affirmations";
import { buildWaveStrategy, reviewGeminiStrategy } from "@/lib/mandala/hypno-psych-strategy";
import { buildWaveNarrativeDraft } from "@/lib/mandala/hypno-wave-engine.mjs";
import { MandalaVideoAffirmations } from "./mandala-video-affirmations";
import css from "./mandala-hypno-compact.module.css";

type SceneOption = { id:string; label:string; symbol:string; poster:string|null };
type EditPanel = "request"|"phrases"|"display"|"design"|null;
type Position = "top"|"center"|"bottom";
type TextScale = "small"|"medium"|"large";
type HypnoModel="wave"|"gemini";
type HypnoDraft={model:HypnoModel;key:string;strategy:string;phrases:string[];selected:number[]};

const topicGoals: Record<VideoTheme, VideoAffirmationGoal[]> = {
  energy:["rhythm","recovery","strength"], money:["value","planning","stability"],
  relationships:["connection","boundaries","dialogue"], goals:["clarity","progress","meaning"],
  life:["meaning","rhythm","connection"], health:["recovery","rhythm","strength"],
};
const primaryThemes: VideoTheme[] = ["energy","money","relationships","goals"];
const copy = {
  en: {
    request:"My request", requestHint:"Difficulty and goal in one place", current:"Now", desired:"My goal",
    change:"Edit", problem:"What feels difficult?", goal:"What would you like instead?",
    optional:"Optional details (stay in this browser)", problemPlaceholder:"If useful, describe a situation in your own words…",
    goalPlaceholder:"Add your own goal, if you wish…", theme:"Theme", apply:"Suggest phrases from my choices",
    phrases:"My phrases", phraseHint:"Choose phrases or refine your suggestions",
    smart:"Smart match", ready:"Ready phrases", tests:"From my tests", byRequest:"From selected issue and goal",
    selected:"selected", choices:"Other options", own:"My phrase", testsHelp:"For saved-test matching, choose the secure consented button below. No profile is loaded automatically.",
    display:"Show in video", displayHint:"How and when the words appear", every:"Every", size:"Size",
    position:"Position", placements:["Top","Centre","Bottom"], sizes:["Small","Medium","Large"],
    additional:"Other display controls (density, visibility and experimental short frame)",
    design:"Video design", designHint:"Scene, atmosphere and original sound", sound:"Audio", adjustAudio:"Choose sound",
    scenery:"Choose a scene", moreScenes:"All video scenes", preview:"Preview", previewHint:"Preview only — no export or account save",
    previewButton:"Preview real video", create:"Create video", use:"In video", privacy:"Personal notes and test results stay here. Only consented category codes reach Gemini.",
    themeNames:{energy:"Energy",money:"Money",relationships:"Love",goals:"Goals",life:"Life",health:"Wellbeing"},
    enabledNote:"Switch on to include the chosen phrases in the video",
  },
  ru: {
    request:"Мой запрос", requestHint:"Проблема и цель в одном месте", current:"Сейчас", desired:"Моя цель",
    change:"Изменить", problem:"Что сейчас беспокоит?", goal:"К чему хотите прийти?",
    optional:"Описание своими словами · необязательно", problemPlaceholder:"Если хотите, опишите, в какой ситуации возникает трудность…",
    goalPlaceholder:"При желании уточните, что хотите изменить…", theme:"Тема", apply:"Подобрать по моему запросу",
    phrases:"Мои фразы", phraseHint:"Выберите фразы или уточните подбор",
    smart:"Умный подбор", ready:"Готовые", tests:"По тестам", byRequest:"По выбранной проблеме и цели",
    selected:"выбрано", choices:"Другие варианты", own:"Своя фраза", testsHelp:"Чтобы использовать сохранённые тесты, нажмите отдельную кнопку согласованного подбора ниже. Автозагрузки профиля нет.",
    display:"Показ в видео", displayHint:"Как и когда появляются фразы", every:"Каждые", size:"Размер",
    position:"Расположение", placements:["Сверху","По центру","Снизу"], sizes:["Малый","Средний","Крупный"],
    additional:"Другие настройки: плотность, видимость и экспериментальный короткий кадр",
    design:"Дизайн видео", designHint:"Сцена, атмосфера и оригинальные звуки", sound:"Звук", adjustAudio:"Выбрать звук",
    scenery:"Выберите сцену", moreScenes:"Все видеосцены", preview:"Предпросмотр", previewHint:"Только просмотр, без сохранения и рендера",
    previewButton:"Просмотреть видео", create:"Создать видео", use:"В видео", privacy:"Личные записи и тесты не отправляются в Gemini. Только выбранные параметры с согласия.",
    themeNames:{energy:"Энергия",money:"Деньги",relationships:"Отношения",goals:"Цели",life:"Жизнь",health:"Самочувствие"},
    enabledNote:"Включите, чтобы выбранные фразы вошли в видео",
  },
  es: {
    request:"Mi intención", requestHint:"Dificultad y objetivo en un lugar", current:"Ahora", desired:"Mi objetivo",
    change:"Cambiar", problem:"¿Qué te preocupa?", goal:"¿Qué deseas conseguir?",
    optional:"Detalles opcionales (solo en este navegador)", problemPlaceholder:"Si quieres, describe la situación con tus palabras…",
    goalPlaceholder:"Puedes aclarar tu objetivo si quieres…", theme:"Tema", apply:"Sugerir frases para mi objetivo",
    phrases:"Mis frases", phraseHint:"Elige o ajusta tus frases",
    smart:"Sugerir frases", ready:"Preparadas", tests:"Mis pruebas", byRequest:"Según la dificultad y la meta",
    selected:"elegidas", choices:"Más opciones", own:"Mi frase", testsHelp:"Para usar tus tests guardados, toca el botón de consentimiento seguro de abajo. Nunca cargamos tu perfil sin pedirlo.",
    display:"Texto en vídeo", displayHint:"Cuándo y cómo aparecen las frases", every:"Cada", size:"Tamaño",
    position:"Posición", placements:["Arriba","Centro","Abajo"], sizes:["Pequeño","Mediano","Grande"],
    additional:"Más ajustes: densidad, visibilidad y fotograma breve experimental",
    design:"Diseño de vídeo", designHint:"Escena, ambiente y sonidos originales", sound:"Audio", adjustAudio:"Elegir audio",
    scenery:"Elige una escena", moreScenes:"Todas las escenas", preview:"Vista previa", previewHint:"Solo vista previa, sin exportar",
    previewButton:"Ver vídeo real", create:"Crear vídeo", use:"En vídeo", privacy:"Notas personales y tests no van a Gemini. Solo categorías con tu permiso.",
    themeNames:{energy:"Energía",money:"Dinero",relationships:"Relaciones",goals:"Metas",life:"Vida",health:"Bienestar"},
    enabledNote:"Activa para incluir las frases seleccionadas en tu vídeo",
  },
} as const;


const hypnoExtra = {
 ru:{topics:["Работа","Общение","Энергия","Цели"],tests:"Предложить по тестам",test:"Пройти тест",
  note:"Кратко опишите свой запрос (необязательно)",update:"Обновить",proposal:"Предлагаемый запрос",
  accept:"Подходит",alternate:"Другой вариант",noData:"Нет подходящих сохранённых результатов. Выберите цель или пройдите тест.",
  auth:"Войдите в кабинет или выберите готовую цель.",source:"Предложено по разрешённым темам тестов, не диагноз.",
  support:"Фразы поддержки",hint:"Подберите и утвердите подходящие слова",role:"Тип фраз",goal:"К чему идём",
  tone:"Тон",focus:"Фокус",length:"Длина фраз",roles:["Поддержка","Возможность","Действие"],
  tones:["Бережные","Сбалансированные","Воодушевляющие"],focuses:["Опора","Уверенность","Действие"],
  lengths:["Короткие","Средние"],generate:"Сгенерировать новые варианты",approve:"Утвердить фразы",
  approved:"Фразы утверждены",more:"Показать все пять",less:"Свернуть",add:"Своя фраза",
  addButton:"Добавить",additional:"Дополнительно",strategy:"Психологическая стратегия",wave:"Wave · Holistic",gemini:"Gemini · AI",
  aiPrompt:"Gemini подготовит краткую стратегию и фразы после согласия.",
  aiConsent:"Разрешаю передать тему, цель и настройки Gemini. В бесплатном тарифе запросы могут использоваться для обучения моделей.",
  aiRun:"Создать стратегию и фразы",aiBusy:"Создаём…",
  aiSignIn:"Для Gemini войдите в кабинет. Wave работает без входа.",
  aiUnavailable:"Gemini недоступен или бесплатный доступ не подтверждён. Выберите Wave.",
  aiFailure:"Ответ Gemini не прошёл проверку. Попробуйте Wave или повторите запрос.",
  aiDraft:"Новые предложения: фразы в видео не изменятся до утверждения.",
  aiPrivacy:"Wave работает локально. Gemini получает категории, но не личные записи.",
  catalog:"Подбор по выбранным вариантам. Ваш текст остаётся на устройстве."},
 en:{topics:["Work","Communication","Energy","Goals"],tests:"Suggest from tests",test:"Take a test",
  note:"Describe your request briefly (optional)",update:"Update",proposal:"Suggested goal",
  accept:"This fits",alternate:"Another option",noData:"No eligible saved results. Choose a goal or take a test.",
  auth:"Sign in or choose a ready goal.",source:"Suggested from permitted test topics, not a diagnosis.",
  support:"Support phrases",hint:"Choose and approve helpful phrases",role:"Phrase type",goal:"Toward",
  tone:"Tone",focus:"Focus",length:"Length",roles:["Support","Possibility","Action"],
  tones:["Gentle","Balanced","Uplifting"],focuses:["Support","Confidence","Action"],
  lengths:["Short","Medium"],generate:"Generate new options",approve:"Approve phrases",
  approved:"Phrases approved",more:"Show all five",less:"Show less",add:"My phrase",
  addButton:"Add",additional:"Advanced",strategy:"Psychological strategy",wave:"Wave · Holistic",gemini:"Gemini · AI",
  aiPrompt:"Gemini can draft a strategy and phrases after your consent.",
  aiConsent:"I permit sharing topic, goal and settings with Gemini. Free-tier prompts may be used to improve models.",
  aiRun:"Draft strategy and phrases",aiBusy:"Writing…",
  aiSignIn:"Sign in for Gemini. Wave needs no account.",
  aiUnavailable:"Gemini is unavailable or free-tier access is unconfirmed. Choose Wave.",
  aiFailure:"Gemini's reply did not pass review. Try Wave or retry.",
  aiDraft:"New suggestions: active video phrases remain until approval.",
  aiPrivacy:"Wave runs locally. Gemini receives categories, not personal notes.",
  catalog:"Selection uses chosen categories. Your text stays on device."},
 es:{topics:["Trabajo","Comunicación","Energía","Metas"],tests:"Sugerir con mis tests",test:"Hacer test",
  note:"Describe tu objetivo (opcional)",update:"Actualizar",proposal:"Objetivo sugerido",
  accept:"Me sirve",alternate:"Otra opción",noData:"No hay resultados válidos. Elige una meta o haz un test.",
  auth:"Inicia sesión o elige una meta.",source:"Propuesto según temas permitidos, no un diagnóstico.",
  support:"Frases de apoyo",hint:"Elige y aprueba frases útiles",role:"Tipo",goal:"Meta",
  tone:"Tono",focus:"Enfoque",length:"Longitud",roles:["Apoyo","Posibilidad","Acción"],
  tones:["Suaves","Equilibradas","Motivadoras"],focuses:["Apoyo","Confianza","Acción"],
  lengths:["Cortas","Medianas"],generate:"Generar variantes",approve:"Confirmar frases",
  approved:"Frases aprobadas",more:"Ver todas",less:"Mostrar menos",add:"Mi frase",
  addButton:"Añadir",additional:"Avanzado",strategy:"Estrategia psicológica",wave:"Wave · Holistic",gemini:"Gemini · AI",
  aiPrompt:"Gemini puede redactar una estrategia y frases con tu permiso.",
  aiConsent:"Acepto compartir tema, meta y ajustes con Gemini. Los datos gratuitos pueden usarse para mejorar los modelos.",
  aiRun:"Crear estrategia y frases",aiBusy:"Creando…",
  aiSignIn:"Inicia sesión para Gemini. Wave no requiere cuenta.",
  aiUnavailable:"Gemini no está disponible o no se confirmó el nivel gratuito. Elige Wave.",
  aiFailure:"La respuesta no pasó la revisión. Prueba Wave.",
  aiDraft:"Propuesta nueva: el vídeo no cambia hasta que la apruebes.",
  aiPrivacy:"Wave funciona localmente. Gemini no recibe notas personales.",
  catalog:"La selección usa las opciones elegidas. Tu texto queda en el dispositivo."}
} as const;
const ideaCopy={
 ru:{title:"1. Идея",hint:"Главная мысль вашего видео",own:"Своя идея (по желанию)",profile:"Подобрать по моему профилю",update:"Обновить профиль",apply:"Подобрать фразы",gender:"Форма обращения",female:"Женщина",male:"Мужчина",variants:["Я справлюсь","Я сильная","Я в гармонии","Я открыт новому"]},
 en:{title:"1. Idea",hint:"The central thought of your video",own:"My own idea (optional)",profile:"Suggest from my profile",update:"Update profile",apply:"Find phrases",gender:"Addressing",female:"Woman",male:"Man",variants:["I can manage","I am strong","I feel balanced","I welcome change"]},
 es:{title:"1. Idea",hint:"La idea central de tu vídeo",own:"Mi propia idea (opcional)",profile:"Según mi perfil",update:"Actualizar perfil",apply:"Elegir frases",gender:"Dirigido a",female:"Mujer",male:"Hombre",variants:["Puedo lograrlo","Soy fuerte","Estoy en armonía","Me abro al cambio"]},
} as const;
type HypnoTestProposal={theme:VideoTheme;problemIndex:number;goal:VideoAffirmationGoal};
const profileDirections:Record<string,HypnoTestProposal>={
 stress:{theme:"energy",problemIndex:0,goal:"rhythm"},
 anxiety:{theme:"energy",problemIndex:0,goal:"rhythm"},
 sleep:{theme:"energy",problemIndex:1,goal:"recovery"},
 energy:{theme:"energy",problemIndex:1,goal:"strength"},
 resource:{theme:"energy",problemIndex:1,goal:"recovery"},
 emotional_regulation:{theme:"energy",problemIndex:0,goal:"rhythm"},
 self_support:{theme:"energy",problemIndex:1,goal:"recovery"},
 focus:{theme:"goals",problemIndex:0,goal:"clarity"},
 clarity:{theme:"goals",problemIndex:0,goal:"clarity"},
 functioning:{theme:"goals",problemIndex:1,goal:"progress"},
 meaning:{theme:"life",problemIndex:0,goal:"meaning"},
 boundaries:{theme:"relationships",problemIndex:1,goal:"boundaries"},
 relationships:{theme:"relationships",problemIndex:2,goal:"dialogue"}
};
export function MandalaHypnoCompact({
  locale, theme, settings, onChange, disabled=false, scenes, activeScene, activePoster, requestText="", children,
  onSelectScene, onSelectTheme, onPreview, onCreate,
}: {
  locale:VideoLocale; theme:VideoTheme; settings:AffirmationSettings;
  onChange:(next:AffirmationSettings)=>void; disabled?:boolean;
  scenes:SceneOption[]; activeScene:string; activePoster?:string|null; requestText?:string; children?:ReactNode;
  onSelectScene:(id:string)=>void; onSelectTheme:(next:VideoTheme)=>void; onPreview:()=>void; onCreate:()=>void;
}) {
  const ui=copy[locale],extra=hypnoExtra[locale];
  const [open,setOpen]=useState<EditPanel>(null);
  const [problemIndex,setProblemIndex]=useState(0);
  const [goalId,setGoalId]=useState<VideoAffirmationGoal>(topicGoals[theme][0]);
  const problemNote=requestText.slice(0,160);
  const goalNote="";
  const [selectionSource,setSelectionSource]=useState<"smart"|"ready"|"tests"|"gemini">("ready");
  const extraGoal=topicGoals[theme].includes(goalId)?goalId:topicGoals[theme][0];
  const lines=linesForVideoAffirmations(locale,theme,settings);
  const position=settings.position||"center";
  const scale=settings.textScale||"medium";
  const [ideaIndex,setIdeaIndex]=useState(0);
  const [ownIdea,setOwnIdea]=useState("");
  const [gender,setGender]=useState<"female"|"male">("female");
  const ideas=locale==="ru"&&gender==="male"?["Я справлюсь","Я сильный","Я в гармонии","Я открыт новому"]:ideaCopy[locale].variants;
  const ideaText=ownIdea.trim()||ideas[ideaIndex];
  const [tone,setTone]=useState<"gentle"|"balanced"|"uplifting">("gentle");
  const [kind,setKind]=useState<"support"|"possibility"|"action">("support");
  const [focus,setFocus]=useState<"support"|"confidence"|"action">("support");
  const [length,setLength]=useState<"short"|"medium">("medium");
  const [generation,setGeneration]=useState(0);
  const [ownOpen,setOwnOpen]=useState(false);
  const [ownText,setOwnText]=useState("");
  const [testProposal,setTestProposal]=useState<HypnoTestProposal|null>(null);
  const [testBusy,setTestBusy]=useState(false);
  const [note,setNote]=useState("");
  const [approvalKey,setApprovalKey]=useState("");
  const [model,setModel]=useState<HypnoModel>("wave");
  const [draftState,setDraftState]=useState<HypnoDraft|null>(null);
  const [geminiConsent,setGeminiConsent]=useState(false);
  const [geminiBusy,setGeminiBusy]=useState(false);
  const [geminiNotice,setGeminiNotice]=useState("");
  const runId=useRef(0);
  const pending=useRef<AbortController|null>(null);
  const waveInput={locale,theme,problemIndex,goalId:extraGoal,tone,focus,kind,length};
  // Raw notes remain browser-local and NEVER enter Gemini's enum-only payload.
  const requestKey=JSON.stringify([waveInput,problemNote,goalNote]);
  const latestKey=useRef(requestKey);
  latestKey.current=requestKey;
  const draft=draftState?.model===model&&draftState.key===requestKey?draftState:null;
  const candidates=draft?.phrases??(settings.presetOverride?.length===5?settings.presetOverride:suggestedVideoAffirmations[locale][theme]);
  const chosen=draft?.selected??settings.selected;
  const selectedCount=chosen.length;
  const signature=JSON.stringify([theme,settings.enabled,settings.selected,settings.custom,settings.presetOverride]);
  const approved=!draft&&Boolean(approvalKey&&signature===approvalKey);
  const summary=model==="wave"?(draft?.strategy??buildWaveStrategy(waveInput)):(draft?.strategy??extra.aiPrompt);
  // Wave v2 reads the visitor's NOW → GOAL only on-device; no text is sent
  // to third-party models or written to account state. Existing approved
  // video phrases remain unchanged until the visitor explicitly approves.
  function createWaveDraft(round:number,nextTheme:VideoTheme=theme,
    nextProblem=problemIndex,nextGoal:VideoAffirmationGoal=extraGoal,
    overrides:Partial<Pick<typeof waveInput,"kind"|"tone"|"focus"|"length">>={}):HypnoDraft {
    // Test suggestions can change theme/chips in the same React event. Build
    // the draft with their NEXT values, not a stale pre-render request key.
    const localInput={...waveInput,...overrides,theme:nextTheme,problemIndex:nextProblem,goalId:nextGoal};
    const key=JSON.stringify([localInput,problemNote,goalNote]);
    const fallbackStrategy=buildWaveStrategy(localInput);
    const fallbackPhrases=buildHypnoFilteredPhrases(
      locale,nextTheme,nextProblem,nextGoal,localInput.tone,localInput.kind,localInput.focus,localInput.length,round);
    const result=buildWaveNarrativeDraft({...localInput,currentText:problemNote,goalText:goalNote,
      round,fallbackStrategy,fallbackPhrases});
    if(result.status==="safety_handoff"){
      return {model:"wave",key,strategy:result.strategy,phrases:[],selected:[]};
    }
    const maxLength=localInput.length==="short"?26:36;
    const chosenIdea=Array.from(ideaText).slice(0,maxLength).join("");
    const phrases=[...new Set([chosenIdea,...result.phrases,...fallbackPhrases])]
      .filter(line=>Array.from(line).length<=maxLength).slice(0,5);
    return {model:"wave",key,strategy:result.strategy,
      phrases:phrases.length===5?phrases:fallbackPhrases,selected:[0,1,2]};
  }
  function filtered(nextTheme:VideoTheme=theme,nextProblem=problemIndex,nextGoal:VideoAffirmationGoal=extraGoal,
    overrides:Partial<Pick<typeof waveInput,"kind"|"tone"|"focus"|"length">>={}){
    pending.current?.abort();runId.current++;
    setModel("wave");setGeminiBusy(false);setGeminiNotice("");
    const next=generation+1;
    // Updating a request or accepting a test proposal only stages a Wave v2
    // suggestion. The parent video never receives it before Approve.
    setDraftState(createWaveDraft(next,nextTheme,nextProblem,nextGoal,overrides));
    setGeneration(next);setSelectionSource("smart");setApprovalKey("");
  }
  async function suggestFromTests(){
    if(testBusy||disabled)return;
    setTestBusy(true);setNote("");setTestProposal(null);
    try{
      const response=await appFetch("video-affirmation-focus") as {axes?:unknown};
      const axes=Array.isArray(response.axes)?response.axes.filter(v=>typeof v==="string").slice(0,3):[];
      const proposed=axes.map(v=>profileDirections[String(v)]).find(Boolean);
      if(!proposed){setNote(extra.noData);return;}
      setTestProposal(proposed);
    }catch(error){
      const status=(error as {status?:number}).status;
      setNote(status===401?extra.auth:extra.noData);
    }finally{setTestBusy(false);}
  }
  function acceptTestProposal(){
    if(!testProposal)return;
    const p=testProposal;
    if(p.theme!==theme)onSelectTheme(p.theme);
    setProblemIndex(p.problemIndex);setGoalId(p.goal);
    filtered(p.theme,p.problemIndex,p.goal);
    setTestProposal(null);setSelectionSource("tests");setOpen(null);
  }
  function addCustom(){
    if(!ownText.trim())return;
    const custom=compactCustomAffirmationInput([settings.custom,ownText.trim()].filter(Boolean).join("\n"));
    onChange({...settings,enabled:true,custom});setOwnText("");setApprovalKey("");
  }
  function toggleSelected(i:number){
    if(draft)setDraftState({...draft,selected:draft.selected.includes(i)?
      draft.selected.filter(v=>v!==i):[...draft.selected,i].slice(0,5)});
    else{
      const selected=settings.selected.includes(i)?settings.selected.filter(v=>v!==i):[...settings.selected,i].slice(0,5);
      onChange({...settings,enabled:true,selected});
    }
    setApprovalKey("");
  }

  const toggle=(panel:Exclude<EditPanel,null>)=>setOpen(current=>current===panel?null:panel);
  const propose=()=>{
    pending.current?.abort();runId.current++;
    const next=generation+1;
    setModel("wave");setDraftState(createWaveDraft(next));
    setGeneration(next);setSelectionSource("smart");setApprovalKey("");setOpen(null);
  };
  const ready=()=>{
    pending.current?.abort();runId.current++;
    setModel("wave");setDraftState(null);setGeminiBusy(false);setGeminiNotice("");
    onChange({...settings,enabled:true,presetOverride:undefined,selected:[0,1,2]});
    setSelectionSource("ready");setApprovalKey("");setOpen(null);
  };
  const changeTheme=(next:VideoTheme)=>{
    if(next===theme)return;
    pending.current?.abort();runId.current++;
    setModel("wave");setDraftState(null);setGeminiBusy(false);setGeminiNotice("");
    onSelectTheme(next);
    onChange({...settings,enabled:settings.enabled,presetOverride:undefined,selected:[0,1,2]});
    setSelectionSource("ready");setApprovalKey("");setGoalId(topicGoals[next][0]);setProblemIndex(0);
    setOpen("request");
  };

  function switchModel(next:HypnoModel){
    if(disabled||next===model)return;
    pending.current?.abort();runId.current++;
    setGeminiBusy(false);setGeminiNotice("");setApprovalKey("");
    setModel(next);setDraftState(null);
    if(next==="wave")setDraftState(createWaveDraft(generation+1));
    else if(geminiConsent)void generateGemini();
  }
  async function generateGemini(){
    if(disabled||!geminiConsent)return;
    pending.current?.abort();
    const controller=new AbortController();pending.current=controller;
    const number=++runId.current,key=requestKey;
    setGeminiBusy(true);setGeminiNotice("");setApprovalKey("");
    let status=0;
    try{
      const response=await fetch("/api/holistic-support/hypno-strategy",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...waveInput,externalModelOptIn:true}),signal:controller.signal});
      status=response.status;
      if(!response.ok)throw Error("GEMINI_UNAVAILABLE");
      const raw:unknown=await response.json();
      const checked=reviewGeminiStrategy(raw,locale,length);
      if(!checked)throw Error("GEMINI_REVIEW");
      if(number!==runId.current||key!==latestKey.current)return;
      setDraftState({model:"gemini",key,...checked,selected:[0,1,2]});
      setSelectionSource("gemini");
    }catch{
      if(number!==runId.current||key!==latestKey.current)return;
      setGeminiNotice(status===401?extra.aiSignIn:
        status===503||status===429?extra.aiUnavailable:extra.aiFailure);
    }finally{if(number===runId.current)setGeminiBusy(false);}
  }
  function approvePhrases(){
    if(draft){
      if(!draft.selected.length)return;
      const next={...settings,enabled:true,presetOverride:draft.phrases,selected:draft.selected};
      onChange(next);
      setApprovalKey(JSON.stringify([theme,next.enabled,next.selected,next.custom,next.presetOverride]));
      setSelectionSource(model==="gemini"?"gemini":"smart");setDraftState(null);
    }else setApprovalKey(signature);
  }

  const selectedScene=scenes.find(scene=>scene.id===activeScene)||scenes[0];
  return (
    <section className={css.overview} data-hypno-overview aria-label={locale==="ru"?"Персональные гипноаффирмации":ui.phrases}>
      <section className={css.card} data-hypno-request data-hypno-idea>
        <div className={css.cardHead}>
          <span className={css.emblem}><Target size={22} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ideaCopy[locale].title}</h4><p>{ideaCopy[locale].hint}</p></div>
        </div>
        <div className={css.ideaRail} role="group" aria-label={ideaCopy[locale].title}>
          {ideas.map((text,index)=><button key={index} type="button" data-hypno-idea-choice={index}
            disabled={disabled} aria-pressed={ideaIndex===index&&!ownIdea.trim()} onClick={()=>{
              setIdeaIndex(index);setOwnIdea("");setDraftState(null);setApprovalKey("");
            }}>{ideaIndex===index&&!ownIdea.trim()?<Check size={18} aria-hidden="true"/>:null}{text}</button>)}
        </div>
        <label className={css.ideaOwn}>
          <span>{ideaCopy[locale].own}</span>
          <input type="text" value={ownIdea} maxLength={36} disabled={disabled}
            data-hypno-idea-own placeholder={ideaCopy[locale].own}
            onChange={event=>{setOwnIdea(event.target.value);setDraftState(null);setApprovalKey("");}}/>
        </label>
        <div className={css.ideaGender} role="group" aria-label={ideaCopy[locale].gender}>
          <span>{ideaCopy[locale].gender}</span>
          <button type="button" aria-pressed={gender==="female"} disabled={disabled} onClick={()=>{setGender("female");setDraftState(null);setApprovalKey("");}}>{ideaCopy[locale].female}</button>
          <button type="button" aria-pressed={gender==="male"} disabled={disabled} onClick={()=>{setGender("male");setDraftState(null);setApprovalKey("");}}>{ideaCopy[locale].male}</button>
        </div>
        <div className={css.ideaActions}>
          <button type="button" className={css.profilePrimary} data-hypno-suggest-tests disabled={disabled||testBusy}
            onClick={()=>void suggestFromTests()}><Sparkles size={18} aria-hidden="true"/>{testBusy?ui.tests:ideaCopy[locale].profile}</button>
          <Link href={"/"+locale+"/personality-profiles"} prefetch={false}>{ideaCopy[locale].update}<ChevronRight size={17} aria-hidden="true"/></Link>
        </div>
        {testProposal&&<div className={css.testMiniProposal} data-hypno-profile-proposal>
          <strong>{extra.proposal}</strong>
          <p>{hypnoRequestProblems[locale][testProposal.theme][testProposal.problemIndex].label} → {affirmationGoalCatalog[locale].find(g=>g.id===testProposal.goal)?.label}</p>
          <p>{extra.source}</p>
          <div>
            <button type="button" data-hypno-accept-proposal onClick={acceptTestProposal}>{extra.accept}</button>
            <button type="button" onClick={()=>setTestProposal({...testProposal,problemIndex:(testProposal.problemIndex+1)%3})}>{extra.alternate}</button>
          </div>
        </div>}
        {note&&<p role="status" className={css.hypnoMiniNotice}>{note}</p>}
        <button type="button" className={css.ideaApply} data-hypno-apply-request disabled={disabled}
          onClick={propose}><WandSparkles size={19} aria-hidden="true"/>{ideaCopy[locale].apply}<ChevronRight size={18} aria-hidden="true"/></button>
      </section>

      <details className={css.strategyDisclosure}>
        <summary>{extra.strategy} · {extra.wave}<ChevronDown size={17} aria-hidden="true"/></summary>
        <section className={css.strategyCard} data-hypno-strategy>
        <div className={css.strategyHead}><BrainCircuit size={18} aria-hidden="true"/><h4>{extra.strategy}</h4></div>
        <div className={css.modelChoice} role="group" aria-label={extra.strategy}>
          <button type="button" data-hypno-model="wave" aria-pressed={model==="wave"}
            disabled={disabled} onClick={()=>switchModel("wave")}>{extra.wave}</button>
          <button type="button" data-hypno-model="gemini" aria-pressed={model==="gemini"}
            disabled={disabled} onClick={()=>switchModel("gemini")}>{extra.gemini}</button>
        </div>
        <p className={css.strategySummary} aria-live="polite" data-hypno-strategy-summary>{summary}</p>
        {model==="gemini"&&<div className={css.geminiControls}>
          <label className={css.geminiConsent}>
            <input type="checkbox" data-hypno-gemini-consent checked={geminiConsent} disabled={disabled||geminiBusy}
              onChange={e=>setGeminiConsent(e.target.checked)}/>
            <span>{extra.aiConsent}</span>
          </label>
          <button type="button" data-hypno-gemini-generate disabled={disabled||geminiBusy||!geminiConsent}
            onClick={()=>{void generateGemini();}}><WandSparkles size={15} aria-hidden="true"/>
            {geminiBusy?extra.aiBusy:extra.aiRun}</button>
        </div>}
        {draft&&<p className={css.strategyHint}>{extra.aiDraft}</p>}
        {geminiNotice&&<p role="status" className={css.strategyNotice}>{geminiNotice}</p>}
        <small className={css.strategyPrivacy}>{extra.aiPrivacy}</small>
      </section>
      </details>

      <section className={css.card} data-hypno-phrases>
        <div className={css.cardHead}>
          <span className={css.emblem}><Sparkles size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{extra.support}</h4><p>{ui.phraseHint}</p></div>
          <button type="button" className={css.edit} data-hypno-phrases-edit
            disabled={disabled} aria-expanded={open==="phrases"} aria-controls="hypno-phrase-options"
            onClick={()=>toggle("phrases")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>

        <div className={css.modeRail} role="group" aria-label={extra.support}>
          <button type="button" data-hypno-smart disabled={disabled} aria-pressed={selectionSource==="smart"} onClick={propose}><Sparkles size={17} aria-hidden="true"/>{ui.smart}</button>
          <button type="button" data-hypno-ready disabled={disabled} aria-pressed={selectionSource==="ready"} onClick={ready}>{ui.ready}</button>
          <button type="button" data-hypno-tests disabled={disabled||testBusy} aria-pressed={selectionSource==="tests"}
            onClick={()=>void suggestFromTests()}>{ui.tests}</button>
        </div>
        <div className={css.filtersMini} id="hypno-phrase-filter-options" data-hypno-phrase-filters>
          <div className={css.filterRow} data-hypno-filter-type role="group" aria-label={extra.role}>
            <strong>{extra.role}</strong><div>
              {(["support","possibility","action"] as const).map((id,i)=><button type="button" key={id}
                aria-pressed={kind===id} disabled={disabled} onClick={()=>{setKind(id);filtered(theme,problemIndex,extraGoal,{kind:id});}}>{extra.roles[i]}</button>)}
            </div>
          </div>
          <div className={css.filterRow} data-hypno-filter-tone role="group" aria-label={extra.tone}>
            <strong>{extra.tone}</strong><div>
              {(["gentle","balanced","uplifting"] as const).map((id,i)=><button type="button" key={id}
                aria-pressed={tone===id} disabled={disabled} onClick={()=>{setTone(id);filtered(theme,problemIndex,extraGoal,{tone:id});}}>{extra.tones[i]}</button>)}
            </div>
          </div>
          <div className={css.filterRow} data-hypno-filter-focus role="group" aria-label={extra.focus}>
            <strong>{extra.focus}</strong><div>
              {(["support","confidence","action"] as const).map((id,i)=><button type="button" key={id}
                aria-pressed={focus===id} disabled={disabled} onClick={()=>{setFocus(id);filtered(theme,problemIndex,extraGoal,{focus:id});}}>{extra.focuses[i]}</button>)}
            </div>
          </div>
          <div className={css.filterRow} data-hypno-filter-length role="group" aria-label={extra.length}>
            <strong>{extra.length}</strong><div>
              {(["short","medium"] as const).map((id,i)=><button type="button" key={id}
                aria-pressed={length===id} disabled={disabled} onClick={()=>{setLength(id);filtered(theme,problemIndex,extraGoal,{length:id});}}>{extra.lengths[i]}</button>)}
            </div>
          </div>
        </div>
        <button type="button" className={css.regenerate} data-hypno-generate-new disabled={disabled||geminiBusy}
          onClick={()=>{if(model==="gemini")void generateGemini();else propose();}}>
          <WandSparkles size={18} aria-hidden="true"/>{extra.generate}</button>
        <div className={css.phraseCounter}><strong>{locale==="ru"?"Выберите фразы":locale==="es"?"Elige frases":"Choose phrases"}</strong><span>{selectedCount}/5 {ui.selected}</span></div>
        <div className={css.phraseMiniList}>
          {candidates.map((sentence,i)=><button type="button" key={i} data-hypno-phrase={i}
            aria-pressed={chosen.includes(i)} disabled={disabled} onClick={()=>toggleSelected(i)}>
            {chosen.includes(i)?<Check size={15}/>:<span aria-hidden="true">○</span>}
            <span>{sentence}</span></button>)}
        </div>
        {settings.custom.split(/\r?\n/).filter(Boolean).map((sentence,i)=><div key={i} className={css.customPhrase}><Check size={18} aria-hidden="true"/>{sentence}</div>)}
        <div className={css.phraseFoot}>
          <button type="button" disabled={disabled} onClick={()=>setOwnOpen(v=>!v)}>{extra.add}<ChevronDown size={14}/></button>
          <button type="button" disabled={disabled} onClick={()=>toggle("phrases")}>{extra.additional}<ChevronRight size={14}/></button>
        </div>
        {ownOpen&&<div className={css.shortNote+" "+css.miniOwn}>
          <input value={ownText} data-hypno-own-phrase disabled={disabled} maxLength={36} placeholder={extra.add}
            onChange={e=>setOwnText(e.target.value)}/>
          <button type="button" disabled={disabled||!ownText.trim()} onClick={addCustom}>{extra.addButton}</button>
        </div>}
        {open==="phrases"&&<div className={css.legacyEditor} id="hypno-phrase-options" data-hypno-phrase-editor>
          <MandalaVideoAffirmations locale={locale} theme={theme} settings={settings} onChange={onChange} disabled={disabled}
            onTestPersonalization={()=>setSelectionSource("tests")}/>
        </div>}
        <button type="button" className={css.approveMini} data-hypno-approve disabled={disabled||(draft?!draft.selected.length:(!settings.enabled||(!selectedCount&&!settings.custom.trim())))}
          onClick={approvePhrases}><Check size={16} aria-hidden="true"/>{approved?extra.approved:extra.approve}</button>
      </section>

      <details className={css.advanced}><summary>{locale==="ru"?"Дополнительные настройки видео":locale==="es"?"Ajustes adicionales de vídeo":"Additional video settings"}<ChevronDown size={18} aria-hidden="true"/></summary>
      <section className={css.card} data-hypno-display>
        <div className={css.cardHead}>
          <span className={css.emblem}><SlidersHorizontal size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.display}</h4><p>{ui.displayHint}</p></div>
          <button type="button" className={css.edit} disabled={disabled}
            data-hypno-display-edit aria-expanded={open==="display"} aria-controls="hypno-display-options"
            onClick={()=>toggle("display")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        {open==="display"?<>
        <div className={css.metaGrid}>
          <div><small>{ui.every}</small><strong>{settings.frequency===1?"8":settings.frequency===3?"3":"5"} {locale==="ru"?"сек":locale==="es"?"s":"sec"}</strong></div>
          <div><small>{ui.size}</small><strong>{ui.sizes[scale==="small"?0:scale==="large"?2:1]}</strong></div>
          <div><small>{ui.position}</small><strong>{ui.placements[position==="top"?0:position==="bottom"?2:1]}</strong></div>
        </div>
        </>:<div className={css.compactOverviewLine} data-hypno-display-summary>
          {settings.frequency===1?"8":settings.frequency===3?"3":"5"} {locale==="ru"?"сек":locale==="es"?"s":"sec"} · {ui.sizes[scale==="small"?0:scale==="large"?2:1]} · {ui.placements[position==="top"?0:position==="bottom"?2:1]}
        </div>}
        {open==="display"&&<fieldset className={css.editPane} id="hypno-display-options" disabled={disabled} data-hypno-display-options>
          <strong className={css.fieldLabel}>{ui.every}</strong>
          <div className={css.chipGrid}>{([1,2,3] as const).map((v,i)=><button type="button" key={v}
            data-hypno-frequency={v} aria-pressed={settings.frequency===v}
            onClick={()=>onChange({...settings,frequency:v})}>{[8,5,3][i]} {locale==="ru"?"сек":"s"}</button>)}</div>
          <strong className={css.fieldLabel}>{ui.size}</strong>
          <div className={css.chipGrid}>{(["small","medium","large"] as TextScale[]).map((value,i)=><button type="button" key={value}
            data-hypno-size={value} aria-pressed={scale===value}
            onClick={()=>onChange({...settings,textScale:value})}>{ui.sizes[i]}</button>)}</div>
          <strong className={css.fieldLabel}>{ui.position}</strong>
          <div className={css.chipGrid}>{(["top","center","bottom"] as Position[]).map((value,i)=><button type="button" key={value}
            data-hypno-position={value} aria-pressed={position===value}
            onClick={()=>onChange({...settings,position:value})}>{ui.placements[i]}</button>)}</div>
          <small className={css.contextNote}>{ui.additional}</small>
          <button type="button" className={css.secondaryAction} onClick={()=>setOpen("phrases")}>{ui.change} · {ui.additional}<ChevronRight size={14}/></button>
        </fieldset>}
      </section>

      <section className={css.card} data-hypno-design>
        <div className={css.cardHead}>
          <span className={css.emblem}><Film size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.design}</h4><p>{ui.designHint}</p></div>
          <button type="button" className={css.edit} disabled={disabled}
            data-hypno-design-edit aria-expanded={open==="design"} aria-controls="hypno-design-options"
            onClick={()=>setOpen("design")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        <button type="button" className={css.sceneMiniSummary} data-hypno-scene-summary
          disabled={disabled} aria-expanded={open==="design"} aria-controls="hypno-design-options"
          onClick={()=>toggle("design")}>
          <span className={css.sceneMiniThumb}>
            {selectedScene?.poster?<Image src={selectedScene.poster} width={46} height={34} unoptimized alt=""/>:
              <span aria-hidden="true">{selectedScene?.symbol||"✦"}</span>}
          </span>
          <span className={css.sceneMiniLabel}>{selectedScene?.label||ui.scenery}</span>
          <ChevronDown size={16} aria-hidden="true"/>
        </button>
        {open==="design"&&<div className={css.sceneRail} aria-label={ui.scenery}>
          {scenes.map(scene=><button type="button" key={scene.id} disabled={disabled}
            aria-pressed={activeScene===scene.id} data-hypno-scene={scene.id}
            onClick={()=>onSelectScene(scene.id)}>
            <span className={css.scenePhoto}>
              {scene.poster?<Image src={scene.poster} width={100} height={74} unoptimized alt=""/>:<span className={css.sceneFallback}>{scene.symbol}</span>}
              {activeScene===scene.id&&<Check className={css.sceneCheck} size={18} aria-hidden="true"/>}
            </span>
            <span className={css.sceneLabel}>{scene.label}</span>
          </button>)}
        </div>}
        {open==="design"&&<div className={css.designFoot}>
          <a href="#video-templates">{ui.moreScenes}<ChevronRight size={14}/></a>
          <a href="#video-audio">{ui.sound} · {ui.adjustAudio}<ChevronRight size={14}/></a>
        </div>}
        {open==="design"&&<div className={css.editPane} id="hypno-design-options">
          <p className={css.contextNote}>{ui.scenery}</p>
          <div className={css.chipGrid}>
            {primaryThemes.map(item=><button key={item} type="button" disabled={disabled}
              aria-pressed={theme===item} onClick={()=>changeTheme(item)}>{ui.themeNames[item]}</button>)}
          </div>
          <div className={css.designFoot}><a href="#video-templates">{ui.moreScenes}</a><a href="#video-audio">{ui.adjustAudio}</a></div>
        </div>}
      </section>

      </details>
      {children}
      <label className={css.enable}>
        <input type="checkbox" data-hypno-overview-enable checked={settings.enabled} disabled={disabled}
          onChange={event=>onChange({...settings,enabled:event.target.checked})}/>
        <span>{ui.use}</span>
        {!settings.enabled&&<small>{ui.enabledNote}</small>}
      </label>
      <section className={css.preview} data-hypno-preview style={activePoster?{backgroundImage:"linear-gradient(95deg,rgba(5,38,34,.93),rgba(5,38,34,.28)),url("+activePoster+")"}:undefined}>
        <div>
          <small>{ui.preview}</small>
          <strong>{lines[0]||suggestedVideoAffirmations[locale][theme][0]}</strong>
          <span>{selectedCount}/5 {ui.selected} · {settings.frequency===1?8:settings.frequency===3?3:5} {locale==="ru"?"сек":"s"}</span>
        </div>
        <button type="button" data-video-affirmation-preview disabled={disabled} aria-label={ui.previewButton}
          onClick={onPreview}><CirclePlay size={19} aria-hidden="true"/>{ui.previewButton}<ChevronRight size={15}/></button>
      </section>
      <button type="button" className={css.create} data-hypno-create-video disabled={disabled||!settings.enabled}
        onClick={onCreate}><Sparkles size={18} aria-hidden="true"/>{ui.create}<ChevronRight size={16}/></button>
      <p className={css.privacy}>{ui.privacy} <span>{ui.previewHint}</span></p>
    </section>
  );
}
