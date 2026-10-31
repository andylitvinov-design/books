"use client";

import { useRef, useState } from "react";
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
type HypnoDraft={model:HypnoModel;key:string;strategy:string;phrases:string[];selected:number[];custom:string;status:string;display?:Pick<AffirmationSettings,"density"|"frequency"|"visibility"|"position"|"textScale">};

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
const hypnoMiniThemes:VideoTheme[]=["money","relationships","energy","goals"];
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
function problemIndexFromNote(theme:VideoTheme,raw:string,fallback:number):number{
 const note=raw.toLocaleLowerCase().slice(0,160);
 const keywords:Record<VideoTheme,RegExp[]> = {
 energy:[/напряж|тревог|stress|tensi|anxi/i,/устал|утом|tired|fatig|cansad/i,/спеш|тороп|rush|prisa/i],
 money:[/цен|price|precio|cobr/i,/неопредел|uncertain|incertid/i,/сомнен|doubt|duda/i],
 relationships:[/отказ|отверг|reject|rechaz/i,/границ|boundar|límite/i,/разговор|конфликт|convers|conflict/i],
 goals:[/ясност|направлен|clarity|rumbo/i,/откладыв|procrast|posterg/i,/ошиб|mistake|error/i],
 life:[/перемен|change|cambio/i,/неопредел|uncertain|incertid/i,/радост|joy|alegr/i],
 health:[/перегруз|overload|sobrecarg/i,/сил|energy|fuerza/i,/напряж|stress|tensi/i],
 };
 const found=keywords[theme].findIndex(re=>re.test(note));
 return found>=0?found:fallback;
}

export function MandalaHypnoCompact({
  locale, theme, settings, onChange, disabled=false, scenes, activeScene, activePoster,
  onSelectScene, onSelectTheme, onPreview, onCreate,
}: {
  locale:VideoLocale; theme:VideoTheme; settings:AffirmationSettings;
  onChange:(next:AffirmationSettings)=>void; disabled?:boolean;
  scenes:SceneOption[]; activeScene:string; activePoster?:string|null;
  onSelectScene:(id:string)=>void; onSelectTheme:(next:VideoTheme)=>void; onPreview:()=>void; onCreate:()=>void;
}) {
  const ui=copy[locale],extra=hypnoExtra[locale];
  const [open,setOpen]=useState<EditPanel>(null);
  const [problemIndex,setProblemIndex]=useState(0);
  const [goalId,setGoalId]=useState<VideoAffirmationGoal>(topicGoals[theme][0]);
  const [problemNote,setProblemNote]=useState("");
  const [goalNote,setGoalNote]=useState("");
  const [selectionSource,setSelectionSource]=useState<"smart"|"ready"|"tests"|"gemini">("ready");
  const extraGoal=topicGoals[theme].includes(goalId)?goalId:topicGoals[theme][0];
  const issue=hypnoRequestProblems[locale][theme][problemIndex] || hypnoRequestProblems[locale][theme][0];
  const goal=affirmationGoalCatalog[locale].find(item=>item.id===extraGoal) || affirmationGoalCatalog[locale][0];
  const lines=linesForVideoAffirmations(locale,theme,settings);
  const position=settings.position||"center";
  const scale=settings.textScale||"medium";
  const [showHint,setShowHint]=useState(false);
  const [tone,setTone]=useState<"gentle"|"balanced"|"uplifting">("gentle");
  const [kind,setKind]=useState<"support"|"possibility"|"action">("support");
  const [focus,setFocus]=useState<"support"|"confidence"|"action">("support");
  const [length,setLength]=useState<"short"|"medium">("medium");
  const [generation,setGeneration]=useState(0);
  const [allPhrases,setAllPhrases]=useState(false);
  const [ownOpen,setOwnOpen]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
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
  const requestKey=JSON.stringify([waveInput,problemNote,goalNote]);
  const latestKey=useRef(requestKey);
  latestKey.current=requestKey;
  const draft=draftState?.model===model&&draftState.key===requestKey?draftState:null;
  const candidates=draft?.phrases??(settings.presetOverride?.length===5?settings.presetOverride:suggestedVideoAffirmations[locale][theme]);
  const chosen=draft?.selected??settings.selected;
  const currentCustom=draft?.custom??settings.custom;
  const countCustom=(value:string)=>value.split(/\r?\n/u).filter(v=>v.trim()).length;
  const selectedCount=chosen.length+countCustom(currentCustom);
  const signature=JSON.stringify([theme,settings.enabled,settings.selected,settings.custom,settings.presetOverride]);
  const approved=!draft&&Boolean(approvalKey&&signature===approvalKey);
  // Any newly generated/edited options stay separate from the active video snapshot.
  const waveNow=buildWaveNarrativeDraft({...waveInput,currentText:problemNote,goalText:goalNote,round:generation,
    fallbackStrategy:buildWaveStrategy(waveInput),
    fallbackPhrases:buildHypnoFilteredPhrases(locale,theme,problemIndex,extraGoal,tone,kind,focus,length,generation)});
  const safetyBlocked=waveNow.status==="safety_handoff";
  const summary=safetyBlocked?waveNow.strategy:
    model==="wave"?(draft?.strategy??waveNow.strategy):(draft?.strategy??extra.aiPrompt);

  function snapshotAsDraft():HypnoDraft {
    const phrases=settings.presetOverride?.length===5?settings.presetOverride:suggestedVideoAffirmations[locale][theme];
    return {model,key:requestKey,strategy:summary,phrases:[...phrases],
      selected:[...settings.selected],custom:settings.custom,status:"category_only"};
  }
  function waveDraftFor(input:typeof waveInput, nextRound:number, key:string):HypnoDraft {
    const outcome=buildWaveNarrativeDraft({...input,currentText:problemNote,goalText:goalNote,round:nextRound,
      fallbackStrategy:buildWaveStrategy(input),
      fallbackPhrases:buildHypnoFilteredPhrases(locale,input.theme,input.problemIndex,input.goalId,
        input.tone,input.kind,input.focus,input.length,nextRound)});
    return {model:"wave",key,strategy:outcome.strategy,phrases:outcome.phrases,
      selected:outcome.status==="safety_handoff"?[]:[0,1,2],
      custom:draftState?.custom??settings.custom,status:outcome.status,display:draftState?.display};
  }
  function filtered(nextTheme:VideoTheme=theme,nextProblem=problemIndex,nextGoal:VideoAffirmationGoal=extraGoal){
    pending.current?.abort();runId.current++;
    const next=generation+1;
    const input={...waveInput,theme:nextTheme,problemIndex:nextProblem,goalId:nextGoal};
    const key=JSON.stringify([input,problemNote,goalNote]);
    setModel("wave");setGeminiBusy(false);setGeminiNotice("");
    setDraftState(waveDraftFor(input,next,key));
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
      setTestProposal(proposed);setOpen("request");
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
    if(!ownText.trim()||safetyBlocked)return;
    const base=draft??snapshotAsDraft();
    const combined=compactCustomAffirmationInput([base.custom,ownText.trim()].filter(Boolean).join("\n"));
    if(base.selected.length+countCustom(combined)>5){
      setNote(locale==="ru"?"Можно утвердить не более пяти фраз. Уберите одну выбранную.":
        locale==="es"?"Confirma hasta cinco frases; desmarca una primero.":
        "Approve up to five phrases; deselect one first.");
      return;
    }
    setDraftState({...base,custom:combined});setOwnText("");setApprovalKey("");
  }
  function toggleSelected(i:number){
    if(safetyBlocked)return;
    const base=draft??snapshotAsDraft();
    const selected=base.selected.includes(i)?base.selected.filter(v=>v!==i):[...base.selected,i];
    if(selected.length+countCustom(base.custom)>5){setNote(locale==="ru"?"Не больше пяти фраз":
      locale==="es"?"Máximo cinco frases":"Maximum five phrases");return;}
    setDraftState({...base,selected});setApprovalKey("");
  }

  const toggle=(panel:Exclude<EditPanel,null>)=>setOpen(current=>current===panel?null:panel);
  const propose=()=>{
    filtered();setOpen(null);
  };
  const ready=()=>{
    pending.current?.abort();runId.current++;
    setModel("wave");setGeminiBusy(false);setGeminiNotice("");
    setDraftState({model:"wave",key:requestKey,strategy:buildWaveStrategy(waveInput),
      phrases:[...suggestedVideoAffirmations[locale][theme]],selected:[0,1,2],
      custom:draftState?.custom??settings.custom,status:"category_only",display:draftState?.display});
    setSelectionSource("ready");setApprovalKey("");setOpen(null);
  };
  const changeTheme=(next:VideoTheme)=>{
    if(next===theme)return;
    pending.current?.abort();runId.current++;
    const input={...waveInput,theme:next,problemIndex:0,goalId:topicGoals[next][0]};
    const key=JSON.stringify([input,problemNote,goalNote]);
    setModel("wave");setGeminiBusy(false);setGeminiNotice("");
    setDraftState(waveDraftFor(input,generation+1,key));
    onSelectTheme(next);
    setGeneration(n=>n+1);
    setSelectionSource("smart");setApprovalKey("");setGoalId(topicGoals[next][0]);setProblemIndex(0);
    setOpen("request");
  };

  function switchModel(next:HypnoModel){
    if(disabled||next===model)return;
    pending.current?.abort();runId.current++;
    setGeminiBusy(false);setGeminiNotice("");setApprovalKey("");
    setModel(next);setDraftState(null);
    if(next==="wave")setDraftState(waveDraftFor(waveInput,generation+1,requestKey));
    else if(geminiConsent&&!safetyBlocked)void generateGemini();
  }
  async function generateGemini(){
    if(disabled||!geminiConsent||safetyBlocked)return;
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
      setDraftState({model:"gemini",key,...checked,selected:[0,1,2],custom:draftState?.custom??settings.custom,status:"category_only",display:draftState?.display});
      setSelectionSource("gemini");
    }catch{
      if(number!==runId.current||key!==latestKey.current)return;
      setGeminiNotice(status===401?extra.aiSignIn:
        status===503||status===429?extra.aiUnavailable:extra.aiFailure);
    }finally{if(number===runId.current)setGeminiBusy(false);}
  }
  const advancedSettings:AffirmationSettings={...settings,...draft?.display,
    presetOverride:draft?.phrases??settings.presetOverride,selected:draft?.selected??settings.selected,
    custom:draft?.custom??settings.custom};
  function updateAdvancedDraft(next:AffirmationSettings){
    if(safetyBlocked)return;
    const base=draft??snapshotAsDraft();
    const phrases=Array.isArray(next.presetOverride)&&next.presetOverride.length===5
      ?[...next.presetOverride]:base.phrases;
    setDraftState({...base,phrases,selected:[...next.selected],custom:next.custom,
      display:{density:next.density,frequency:next.frequency,visibility:[...next.visibility],
        position:next.position,textScale:next.textScale}});
    setApprovalKey("");
  }

  function approvePhrases(){
    if(!draft||draft.status==="safety_handoff"||safetyBlocked)return;
    const selected=[...new Set(draft.selected)].filter(i=>Number.isInteger(i)&&i>=0&&i<draft.phrases.length).slice(0,5);
    const custom=compactCustomAffirmationInput(draft.custom);
    if(!selected.length&&!countCustom(custom))return;
    if(selected.length+countCustom(custom)>5)return;
    if(draft.phrases.length!==5)return; // legacy adapter remains five slots
    const next={...settings,...draft.display,enabled:true,presetOverride:[...draft.phrases],selected,custom};
    onChange(next); // the ONLY phrase-draft -> live-video transition
    setApprovalKey(JSON.stringify([theme,next.enabled,next.selected,next.custom,next.presetOverride]));
    setSelectionSource(model==="gemini"?"gemini":"smart");setDraftState(null);
  }

  return (
    <section className={css.overview} data-hypno-overview aria-label={locale==="ru"?"Персональные гипноаффирмации":ui.phrases}>
      <section className={css.card} data-hypno-request>
        <div className={css.cardHead}>
          <span className={css.emblem}><Target size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.request}</h4><p>{ui.requestHint}</p></div>
          <button type="button" className={css.edit} data-hypno-request-edit
            disabled={disabled} aria-expanded={open==="request"} aria-controls="hypno-request-options"
            onClick={()=>toggle("request")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>

        <div className={css.topicMiniRail} role="group" aria-label={ui.theme}>
          {hypnoMiniThemes.map((id,i)=><button type="button" key={id} data-hypno-accent={id}
            aria-pressed={theme===id} disabled={disabled} onClick={()=>changeTheme(id)}>{extra.topics[i]}</button>)}
        </div>
        <div className={css.profileMiniActions}>
          <button type="button" data-hypno-suggest-tests disabled={disabled||testBusy}
            onClick={()=>void suggestFromTests()}><Sparkles size={14} aria-hidden="true"/>{testBusy?ui.tests:extra.tests}</button>
          <Link href={"/"+locale+"/tests"} prefetch={false}><Target size={14} aria-hidden="true"/>{extra.test}</Link>
        </div>
        <div className={css.requestPreview}>
          <div><span className={css.micro}>{ui.current}</span><strong>{problemNote.trim()||issue.label}</strong></div>
          <ChevronRight size={17} color="#8da99d" aria-hidden="true"/>
          <div><span className={css.micro}>{ui.desired}</span><strong>{goalNote.trim()||goal.label}</strong></div>
        </div>
        <div className={css.shortNote}>
          <input type="text" value={problemNote} disabled={disabled} maxLength={160}
            data-hypno-short-request aria-label={extra.note} placeholder={extra.note}
            onChange={event=>setProblemNote(event.target.value)}/>
          <button type="button" data-hypno-update-request disabled={disabled} onClick={()=>{
            const problem=problemIndexFromNote(theme,problemNote,problemIndex);
            setProblemIndex(problem);filtered(theme,problem,extraGoal);
          }}>{extra.update}</button>
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
        {open==="request"&&<div className={css.editPane} id="hypno-request-options" data-hypno-request-options>
          <label className={css.fieldLabel} htmlFor="hypno-quick-theme">{ui.theme}</label>
          <select id="hypno-quick-theme" value={theme} disabled={disabled}
            onChange={event=>changeTheme(event.target.value as VideoTheme)}>
            {primaryThemes.map(item=><option key={item} value={item}>{ui.themeNames[item]}</option>)}
            {(["life","health"] as const).map(item=><option key={item} value={item}>{ui.themeNames[item]}</option>)}
          </select>
          <strong className={css.fieldLabel}>{ui.problem}</strong>
          <div className={css.chipGrid}>
            {hypnoRequestProblems[locale][theme].map((item,i)=><button key={item.label}
              type="button" data-hypno-problem={i} aria-pressed={problemIndex===i}
              disabled={disabled} onClick={()=>setProblemIndex(i)}>{item.label}</button>)}
          </div>
          <textarea rows={2} value={problemNote} maxLength={400} disabled={disabled}
            aria-label={ui.optional} placeholder={ui.problemPlaceholder}
            onChange={event=>setProblemNote(event.target.value)}/>
          <strong className={css.fieldLabel}>{ui.goal}</strong>
          <div className={css.chipGrid}>
            {topicGoals[theme].map(id=>{
              const row=affirmationGoalCatalog[locale].find(entry=>entry.id===id);
              return row?<button type="button" key={id} aria-pressed={goalId===id}
                data-hypno-goal={id} disabled={disabled} onClick={()=>setGoalId(id)}>{row.label}</button>:null;
            })}
          </div>
          <textarea rows={2} value={goalNote} maxLength={400} disabled={disabled}
            aria-label={ui.goalPlaceholder} placeholder={ui.goalPlaceholder}
            onChange={event=>setGoalNote(event.target.value)}/>
          <small className={css.contextNote}>{ui.optional}</small>
          <button type="button" className={css.apply} data-hypno-apply-request
            disabled={disabled} onClick={propose}><WandSparkles size={17} aria-hidden="true"/>{ui.apply}</button>
        </div>}
      </section>

        <section className={css.strategyCard} data-hypno-strategy>
        <div className={css.strategyHead}><BrainCircuit size={18} aria-hidden="true"/><h4>{extra.strategy}</h4></div>
        <div className={css.modelChoice} role="group" aria-label={extra.strategy}>
          <button type="button" data-hypno-model="wave" aria-pressed={model==="wave"}
            disabled={disabled} onClick={()=>switchModel("wave")}>{extra.wave}</button>
          <button type="button" data-hypno-model="gemini" aria-pressed={model==="gemini"}
            disabled={disabled} onClick={()=>switchModel("gemini")}>{extra.gemini}</button>
        </div>
        <p className={css.strategySummary} aria-live="polite" data-hypno-strategy-summary>{summary}</p>
        {model==="wave"&&<small data-hypno-wave-source>{waveNow.status==="personalized"?
          (locale==="ru"?"По смыслу вашего описания · локально":locale==="es"?"Según tu descripción · local":"Based on your notes · on device"):
          (locale==="ru"?"По выбранным категориям":locale==="es"?"Según temas elegidos":"By selected categories")}</small>}
        {model==="gemini"&&<div className={css.geminiControls}>
          <label className={css.geminiConsent}>
            <input type="checkbox" data-hypno-gemini-consent checked={geminiConsent} disabled={disabled||geminiBusy}
              onChange={e=>setGeminiConsent(e.target.checked)}/>
            <span>{extra.aiConsent}</span>
          </label>
          <button type="button" data-hypno-gemini-generate disabled={disabled||safetyBlocked||geminiBusy||!geminiConsent}
            onClick={()=>{void generateGemini();}}><WandSparkles size={15} aria-hidden="true"/>
            {geminiBusy?extra.aiBusy:extra.aiRun}</button>
        </div>}
        {draft&&<p className={css.strategyHint}>{extra.aiDraft}</p>}
        {geminiNotice&&<p role="status" className={css.strategyNotice}>{geminiNotice}</p>}
        <small className={css.strategyPrivacy}>{extra.aiPrivacy}</small>
      </section>

      <section className={css.card} data-hypno-phrases>
        <div className={css.cardHead}>
          <span className={css.emblem}><Sparkles size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{extra.support}</h4><p>{ui.phraseHint}</p></div>
          <button type="button" className={css.edit} data-hypno-phrases-edit
            disabled={disabled} aria-expanded={open==="phrases"} aria-controls="hypno-phrase-options"
            onClick={()=>toggle("phrases")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>

        <div className={css.modeRail} role="group" aria-label={extra.support}>
          <button type="button" data-hypno-smart disabled={disabled} aria-pressed={selectionSource==="smart"} onClick={propose}><Sparkles size={14}/>{ui.smart}</button>
          <button type="button" data-hypno-ready disabled={disabled} aria-pressed={selectionSource==="ready"} onClick={ready}>{ui.ready}</button>
          <button type="button" data-hypno-tests disabled={disabled} aria-pressed={selectionSource==="tests"}
            onClick={()=>{setOpen("phrases");setShowHint(true);}}>{ui.tests}</button>
        </div>
        <button type="button" data-hypno-filters-toggle className={css.filtersToggle}
           aria-expanded={filtersOpen} aria-controls="hypno-phrase-filter-options" disabled={disabled}
           onClick={()=>setFiltersOpen(x=>!x)}>
           <SlidersHorizontal size={15} aria-hidden="true"/>
           <span>{locale==="ru"?"Тип · Цель · Тон · Фокус · Длина":locale==="es"?"Tipo · Meta · Tono · Enfoque · Longitud":"Type · Goal · Tone · Focus · Length"}</span>
           <ChevronDown size={15} aria-hidden="true"/>
         </button>
        <div className={css.filtersMini} id="hypno-phrase-filter-options" data-hypno-phrase-filters hidden={!filtersOpen}>
          <label>{extra.role}<select value={kind} data-hypno-filter-type disabled={disabled} onChange={e=>setKind(e.target.value as typeof kind)}>
            {(["support","possibility","action"] as const).map((id,i)=><option key={id} value={id}>{extra.roles[i]}</option>)}
          </select></label>
          <label>{extra.goal}<select value={extraGoal} data-hypno-filter-goal disabled={disabled}
            onChange={e=>{setGoalId(e.target.value as VideoAffirmationGoal);setApprovalKey("");}}>
            {topicGoals[theme].map(id=><option key={id} value={id}>{affirmationGoalCatalog[locale].find(x=>x.id===id)?.label}</option>)}
          </select></label>
          <label>{extra.tone}<select value={tone} data-hypno-filter-tone disabled={disabled} onChange={e=>setTone(e.target.value as typeof tone)}>
            {(["gentle","balanced","uplifting"] as const).map((id,i)=><option key={id} value={id}>{extra.tones[i]}</option>)}
          </select></label>
          <label>{extra.focus}<select value={focus} data-hypno-filter-focus disabled={disabled} onChange={e=>setFocus(e.target.value as typeof focus)}>
            {(["support","confidence","action"] as const).map((id,i)=><option key={id} value={id}>{extra.focuses[i]}</option>)}
          </select></label>
          <label>{extra.length}<select value={length} data-hypno-filter-length disabled={disabled} onChange={e=>setLength(e.target.value as typeof length)}>
            {(["short","medium"] as const).map((id,i)=><option key={id} value={id}>{extra.lengths[i]}</option>)}
          </select></label>
          <button type="button" data-hypno-generate-new disabled={disabled||geminiBusy} onClick={()=>{if(model==="gemini")void generateGemini();else propose();}}>
            <WandSparkles size={14} aria-hidden="true"/>{extra.generate}</button>
        </div>
        <div className={css.phraseCounter}>
          <span>{selectedCount}/5 {ui.selected}</span>
          <button type="button" disabled={disabled} onClick={()=>setAllPhrases(v=>!v)}>{allPhrases?extra.less:extra.more}<ChevronDown size={13}/></button>
        </div>
        <div className={css.phraseMiniList}>
          {(allPhrases?candidates:candidates.slice(0,3)).map((sentence,i)=><button type="button" key={i} data-hypno-phrase={i}
            aria-pressed={chosen.includes(i)} disabled={disabled} onClick={()=>toggleSelected(i)}>
            {chosen.includes(i)?<Check size={15}/>:<span aria-hidden="true">○</span>}
            <span>{sentence}</span></button>)}
        </div>
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
          {showHint&&<div className={css.testEntry}>
            <p className={css.contextNote}>{ui.testsHelp}</p>
            <div className={css.designFoot}>
              <Link href={"/"+locale+"/tests"} prefetch={false}>{locale==="ru"?"Пройти тест":locale==="es"?"Hacer una prueba":"Take a test"}</Link>
              <Link href={"/"+locale+"/personality-profiles"} prefetch={false}>{locale==="ru"?"Заполнить профиль":locale==="es"?"Completar perfil":"Build my profile"}</Link>
            </div>
          </div>}
          <MandalaVideoAffirmations locale={locale} theme={theme} settings={advancedSettings} onChange={updateAdvancedDraft} disabled={disabled}
            onTestPersonalization={()=>setSelectionSource("tests")}/>
        </div>}
        <button type="button" className={css.approveMini} data-hypno-approve disabled={disabled||safetyBlocked||(!draft&&!settings.enabled)||!selectedCount}
          onClick={approvePhrases}><Check size={16} aria-hidden="true"/>{approved?extra.approved:extra.approve}</button>
      </section>

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
            onClick={()=>toggle("design")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
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

      <label className={css.enable}>
        <input type="checkbox" data-hypno-overview-enable checked={settings.enabled} disabled={disabled||safetyBlocked}
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
        <button type="button" data-video-affirmation-preview aria-label={ui.previewButton} disabled={disabled||safetyBlocked}
          onClick={onPreview}><CirclePlay size={19} aria-hidden="true"/>{ui.previewButton}<ChevronRight size={15}/></button>
      </section>
      <button type="button" className={css.create} data-hypno-create-video disabled={disabled||safetyBlocked||!settings.enabled}
        onClick={onCreate}><Sparkles size={18} aria-hidden="true"/>{ui.create}<ChevronRight size={16}/></button>
      <p className={css.privacy}>{ui.privacy} <span>{ui.previewHint}</span></p>
    </section>
  );
}
