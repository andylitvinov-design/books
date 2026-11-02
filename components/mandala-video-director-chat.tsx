"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {ChangeEvent,FormEvent} from "react";
import {ArrowRight,Check,Film,ImagePlus,Music2,Send,SlidersHorizontal,Sparkles} from "lucide-react";
import {recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {compileExecutableVideoScenario,parseAiVideoCutSuggestion} from "@/lib/mandala/video-executable-director.mjs";
import {hasVideoChatFilter,isGenericVideoRequest,parseVideoChatAction,mergeVideoChatPreferences,nextVideoChatStep,parseVideoChatIntent,parseVideoChatStepChoice,suggestVideoChatDefaults} from "@/lib/mandala/video-chat-intent.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-director-chat.module.css";

type Aspect="portrait"|"landscape"|"square";
type Length=10|15|20|30|60;
type Music="none"|"harmony"|"love"|"meditation";
type Mood="slow"|"dynamic";
type Step="goal"|"mood"|"aspect"|"duration"|"music"|"phrases"|"review"|"ready"|"done";
type Draft={goal:string;mood:Mood|null;aspect:Aspect|null;duration:Length|null;music:Music|null;phrases:boolean|null};
type ChatLine={id:number;role:"assistant"|"user";text:string};
type Preset={id:string;theme:VideoTheme;label:Record<PublicLocale,string>;clips:readonly string[];focusTags?:readonly string[]};
type Scene={id:string;theme:string;collection:string;status:string;media:string;video:string;poster?:string;rightsReference:{kind:string};label:Record<PublicLocale,string>;description:Record<PublicLocale,string>;categories:readonly string[];tags:readonly string[];motifs:readonly string[]};
type Props={
 locale:PublicLocale;goal:string;theme:VideoTheme;
 presets:readonly Preset[];scenes:readonly Scene[];disabled:boolean;canCreate:boolean;
 renderOptions:{quality:"hd"|"fullhd";brightness:"soft"|"bright";volumePercent:number};
 rendering:boolean;renderProgress:number;resultReady:boolean;resultFailed:boolean;
 onGoalChange:(text:string)=>void;onInvalidate:()=>void;
 onConfirm:(selection:{scenario:ReturnType<typeof compileExecutableVideoScenario>})=>boolean;
 onCreate:()=>boolean|void;onOpenResult:()=>void;onOpenEditor:()=>void;onPickPhoto:()=>void;onOpenAudio:()=>void;
};
const copy={
 ru:{title:"AI-видеорежиссёр",subtitle:"Подбираю реальные видеосюжеты · бесплатно",intro:"Привет! Какое видео вы хотите создать? Опишите идею или выберите тему — я помогу настроить ролик.",
  filterNames:{mood:"Атмосфера",aspect:"Формат",duration:"Время",music:"Музыка",phrases:"Фразы"},
  goal:"Какое видео вы представляете? Можно написать одной фразой.",mood:"Какая атмосфера нужна — мягкая или динамичная?",aspect:"Где будете смотреть ролик? Выберите формат.",duration:"Какой длины сделать ролик?",music:"Какую музыку добавить?",phrases:"Добавить поддерживающие фразы на экран?",review:"Я подобрал сюжет по вашим ответам. Проверьте сцены и параметры перед созданием.",ready:"Сценарий утверждён. Можно запускать запись настоящего видео.",
  done:"Видео готово. Откройте его для просмотра, скачивания и отправки.",error:"Не получилось распознать ответ. Выберите вариант ниже или уточните словами.",
  unsupported:"Для указанного конкретного объекта пока нет подходящего реального MP4. Могу предложить символический монтаж из доступных видеосцен — он не будет изображать запрошенный объект.",
  missing:"Подходящий монтаж из разрешённых сцен не найден. Измените тему или откройте редактор.", symbolic:"Предложить метафорический сюжет",retryGoal:"Изменить запрос",alternate:"Другой сюжет",confirm:"Подтвердить сценарий",create:"Создать видео",creating:"Собираем видео на устройстве…",loading:"Загружаем выбранные видеосцены…",open:"Открыть готовое видео",editor:"Расширенный редактор",startAgain:"Новый ролик",edit:"Изменить настройки",note:"Видео собирается из разрешённых MP4, не из новых AI-кадров. Ваш текст не передаётся внешним AI-сервисам.",
  noteAi:"С вашего разрешения текст идеи и выбранные настройки отправляются подтверждённому бесплатному AI. Фото и голос остаются на устройстве.",
  placeholder:"Напишите, что хотите создать или изменить…",send:"Отправить",photo:"Добавить своё фото",audio:"Добавить голос или звук",promptChanged:"Обновил параметры. Проверьте сценарий снова.",
  aiConsent:"Разрешить бесплатному AI уточнять вопрос и предлагать реальный монтаж (передать идею и фильтры внешнему сервису)",aiPlan:"AI: подобрать сцены и монтаж",aiPlanBusy:"AI подбирает монтаж…",aiPlanReady:"AI предложил проверенный монтаж. Проверьте кадры и подтвердите.",aiPlanFailed:"AI-монтаж недоступен или не прошёл проверку — локальный сценарий сохранён.",planLocal:"Локальный режиссёр",planAi:"AI · проверенный сценарий",aiBusy:"AI уточняет вопрос…",aiFallback:"Бесплатный AI сейчас недоступен — продолжим с локальными настройками.",
  assetTimeout:"Сцены или права на запись пока недоступны. Выберите другой сюжет либо проверьте настройки.",
  auto:"Подобрать настройки автоматически",timeout:"Запись не началась. Проверьте доступность сцен и попробуйте снова.",blocked:"Результат не прошёл проверку или запись не удалась. Воспользуйтесь настройками и повторите создание.",stages:["Начало","Погружение","Развитие","Завершение"],
  themeChips:["Хочу больше спокойствия","Любовь и близость","Энергия и бодрость","Уверенность в себе"],
  moodChoices:[["Мягкая","slow"],["Динамичная","dynamic"]],aspectChoices:[["Вертикальный 9:16","portrait"],["Горизонтальный 16:9","landscape"],["Квадрат 1:1","square"]],
  musicChoices:[["Нежная музыка","love"],["Спокойная","meditation"],["Гармония","harmony"],["Без музыки","none"]],phraseChoices:[["Да, добавить","yes"],["Нет","no"]]},
 en:{title:"AI Video Director",subtitle:"Real approved footage · free",intro:"Hi! What video would you like to create? Describe it or choose a topic; I'll guide the settings.",
  filterNames:{mood:"Mood",aspect:"Format",duration:"Length",music:"Music",phrases:"Phrases"},
  goal:"What kind of video do you imagine? Describe it briefly.",mood:"What mood should it have — gentle or dynamic?",aspect:"Where will you use the video? Choose a format.",duration:"How long should it be?",music:"What soundtrack would you like?",phrases:"Add supportive phrases to the screen?",review:"Here's a story assembled from available footage. Review it before creating.",ready:"Story approved. You can now create the real video.",
  done:"Your video is ready. Open it to play, download or share.",error:"I couldn't interpret that choice. Try the options below or another phrase.",
  unsupported:"That specific subject is not available in our verified MP4 catalog. I can propose a symbolic story using existing footage, but it won't show that subject.",
  missing:"No compatible licensed clips were found. Change the goal or open the editor.",symbolic:"Use a symbolic story",retryGoal:"Change idea",alternate:"Another story",confirm:"Confirm story",create:"Create video",creating:"Recording video on this device…",loading:"Loading the selected video clips…",open:"Open finished video",editor:"Advanced editor",startAgain:"New video",edit:"Change settings",note:"Uses approved existing MP4 footage, not newly AI-generated frames. Your text is not sent to an external AI service.",
  noteAi:"With your permission, the idea text and selected settings are sent to confirmed free AI. Photos and voice stay on your device.",
  placeholder:"Describe a video or tell me what to change…",send:"Send",photo:"Add my photo",audio:"Add my voice or audio",promptChanged:"Updated the settings. Please confirm the story again.",
  aiConsent:"Allow free AI to ask one question and suggest a real film cut (send my goal and filters externally)",aiPlan:"AI: arrange real scenes",aiPlanBusy:"AI is planning the cut…",aiPlanReady:"AI suggested a verified cut. Review the scenes, then confirm.",aiPlanFailed:"AI edit was unavailable or invalid. Your local film plan is preserved.",planLocal:"Local director",planAi:"AI · validated cut",aiBusy:"AI is personalizing…",aiFallback:"Free AI is unavailable, so we will continue locally.",
  assetTimeout:"Sources or recording permissions are not ready. Try another story or check settings.",
  auto:"Suggest settings for me",timeout:"Recording did not begin. Check the video sources and retry.",blocked:"Recording or playback verification failed. Adjust settings and retry.",stages:["Opening","Arriving","Exploring","Closing"],
  themeChips:["I want more calm","Love and connection","Energy and vitality","Confidence and focus"],
  moodChoices:[["Gentle","slow"],["Dynamic","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Landscape 16:9","landscape"],["Square 1:1","square"]],
  musicChoices:[["Warm melody","love"],["Meditative","meditation"],["Harmony","harmony"],["Silent","none"]],phraseChoices:[["Yes, add them","yes"],["No","no"]]},
 es:{title:"Director de vídeo IA",subtitle:"Escenas reales autorizadas · gratis",intro:"¡Hola! ¿Qué vídeo quieres crear? Describe tu idea o elige un tema; te guiaré por los ajustes.",
  filterNames:{mood:"Ambiente",aspect:"Formato",duration:"Tiempo",music:"Música",phrases:"Frases"},
  goal:"¿Qué tipo de vídeo imaginas? Descríbelo en una frase.",mood:"¿Qué ambiente buscas: suave o dinámico?",aspect:"¿Dónde usarás el vídeo? Elige el formato.",duration:"¿Qué duración prefieres?",music:"¿Qué música prefieres?",phrases:"¿Añadir frases de apoyo en pantalla?",review:"Encontré una historia con escenas disponibles. Comprueba los ajustes antes de crear.",ready:"Historia aprobada. Ya puedes crear el vídeo real.",
  done:"El vídeo está listo. Ábrelo para ver, guardar o compartir.",error:"No entendí esa elección. Prueba las opciones o escribe de otra manera.",
  unsupported:"Ese objeto específico no está en el catálogo de MP4. Puedo proponer una historia simbólica, pero no mostrará ese objeto.",
  missing:"No se encontraron escenas autorizadas compatibles. Cambia el tema o usa el editor.",symbolic:"Usar una historia simbólica",retryGoal:"Cambiar idea",alternate:"Otra historia",confirm:"Confirmar historia",create:"Crear vídeo",creating:"Grabando vídeo en este dispositivo…",loading:"Cargando las escenas…",open:"Abrir vídeo terminado",editor:"Editor avanzado",startAgain:"Nuevo vídeo",edit:"Cambiar ajustes",note:"Montaje de MP4 autorizados, no fotogramas nuevos generados por IA. Tu texto no se envía a un servicio IA externo.",
  noteAi:"Con tu permiso, el texto de la idea y los ajustes elegidos se envían a IA gratuita verificada. Fotos y voz permanecen en tu dispositivo.",
  placeholder:"Describe el vídeo o lo que quieres cambiar…",send:"Enviar",photo:"Añadir mi foto",audio:"Añadir voz o audio",promptChanged:"Ajustes actualizados. Confirma la historia otra vez.",
  aiConsent:"Permitir que la IA gratuita formule una pregunta y proponga un montaje real (enviar idea y filtros)",aiPlan:"IA: ordenar escenas reales",aiPlanBusy:"IA prepara el montaje…",aiPlanReady:"La IA propuso un montaje verificado. Revísalo y confírmalo.",aiPlanFailed:"Montaje IA no disponible o no válido. Se mantiene el plan local.",planLocal:"Director local",planAi:"IA · montaje validado",aiBusy:"La IA personaliza la pregunta…",aiFallback:"La IA gratuita no está disponible; continuaremos localmente.",
  assetTimeout:"Las escenas o permisos aún no están disponibles. Prueba otra historia o revisa los ajustes.",
  auto:"Sugerir ajustes automáticamente",timeout:"No se inició la grabación. Comprueba las escenas y vuelve a intentarlo.",blocked:"Falló la grabación o verificación. Ajusta los parámetros e inténtalo otra vez.",stages:["Inicio","Entrada","Desarrollo","Cierre"],
  themeChips:["Quiero más calma","Amor y conexión","Energía y vitalidad","Confianza y enfoque"],
  moodChoices:[["Suave","slow"],["Dinámico","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Horizontal 16:9","landscape"],["Cuadrado 1:1","square"]],
  musicChoices:[["Melodía suave","love"],["Meditación","meditation"],["Armonía","harmony"],["Sin música","none"]],phraseChoices:[["Sí, añadir","yes"],["No","no"]]},
} as const;
const initial=(goal:string):Draft=>({goal:goal.replace(/\s+/gu," ").slice(0,800),mood:null,aspect:null,duration:null,music:null,phrases:null});

export function MandalaVideoDirectorChat({locale,goal,theme,presets,scenes,disabled,canCreate,
 renderOptions,rendering,renderProgress,resultReady,resultFailed,onGoalChange,onConfirm,onCreate,onOpenResult,
 onOpenEditor,onPickPhoto,onOpenAudio,onInvalidate}:Props){
 const t=copy[locale];
 const [draft,setDraft]=useState<Draft>(()=>initial(goal));
 const [step,setStep]=useState<Step>(()=>nextVideoChatStep(initial(goal)) as Step);
 const [lines,setLines]=useState<ChatLine[]>([{id:0,role:"assistant",text:t.intro}]);
 const [input,setInput]=useState("");
 // Server-rendered chat can be visible before React attaches input handlers.
 const [clientHydrated,setClientHydrated]=useState(false);
 const [symbolicAllowed,setSymbolicAllowed]=useState(false);
 const [aiConsent,setAiConsent]=useState(false);
 const [aiStatus,setAiStatus]=useState<"idle"|"loading"|"ready"|"fallback">("idle");
 const aiAskedKeyRef=useRef("");
 const currentStepRef=useRef<Step>(step);
 currentStepRef.current=step;
 const [alternative,setAlternative]=useState(0);
 const [aiCut,setAiCut]=useState<{key:string;value:{clipIds:string[];stageSeconds:number[]}}|null>(null);
 const [aiCutState,setAiCutState]=useState<"idle"|"loading"|"ready"|"fallback">("idle");
 const cutAbortRef=useRef<AbortController|null>(null);
 const approvedPlanKeyRef=useRef("");
 useEffect(()=>()=>cutAbortRef.current?.abort(),[]);
 const [captureStarted,setCaptureStarted]=useState(false);
 const [captureObserved,setCaptureObserved]=useState(false);
 const [assetWaitLong,setAssetWaitLong]=useState(false);
 const counter=useRef(0);
 const threadRef=useRef<HTMLDivElement|null>(null);
 const windowRef=useRef<HTMLElement|null>(null);
 const composerRef=useRef<HTMLTextAreaElement|null>(null);
 useEffect(()=>{
   // Preserve a guest's text if they started typing before hydration.
   const preHydrationText=composerRef.current?.value||"";
   if(preHydrationText)setInput(value=>value||preHydrationText.slice(0,800));
   setClientHydrated(true);
 },[]);
 const addLine=(role:ChatLine["role"],text:string)=>{
   setLines(existing=>[...existing.slice(-34),{id:++counter.current,role,text}]);
 };
 const question=(next:Step)=>next==="done"?t.done:next==="ready"?t.ready:t[next];
 // The same client-local goal field is edited by the existing Studio controls.
 useEffect(()=>{
   if(goal.trim()===draft.goal.trim()||!goal.trim())return;
   setDraft(previous=>({...previous,goal:goal.replace(/\s+/gu," ").slice(0,800)}));
   setSymbolicAllowed(false);setAlternative(0);
   cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
   approvedPlanKeyRef.current="";
   // A new goal entered outside the chat cannot inherit external-AI consent.
   setAiConsent(false);aiAskedKeyRef.current="";setAiStatus("idle");
   setStep(previous=>previous==="ready"||previous==="done"?"review":previous);
 // Avoid reacting to every local answer: identical text does not trigger changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[goal]);
 useEffect(()=>{
   const frame=windowRef.current;
   if(!frame)return;
   let raf=0;
   const update=()=>{
     const focus=frame.contains(document.activeElement)&&["INPUT","TEXTAREA"].includes(document.activeElement?.tagName||"");
     const mobile=window.innerWidth<=700;
     frame.dataset.composeActive=mobile&&focus?"true":"false";
     const visual=window.visualViewport;
     if(mobile&&focus){
       frame.style.setProperty("--chat-visual-top",Math.max(0,Math.round(visual?.offsetTop||0))+"px");
       frame.style.setProperty("--chat-visual-height",Math.round(visual?.height||window.innerHeight)+"px");
     }else{frame.style.removeProperty("--chat-visual-top");frame.style.removeProperty("--chat-visual-height");}
   };
   const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);};
   schedule();window.addEventListener("resize",schedule);
   frame.addEventListener("focusin",schedule);frame.addEventListener("focusout",schedule);
   window.visualViewport?.addEventListener("resize",schedule);
   window.visualViewport?.addEventListener("scroll",schedule);
   return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",schedule);
     frame.removeEventListener("focusin",schedule);frame.removeEventListener("focusout",schedule);
     window.visualViewport?.removeEventListener("resize",schedule);
     window.visualViewport?.removeEventListener("scroll",schedule);};
 },[]);
 useEffect(()=>{
   const thread=threadRef.current;
   if(thread)thread.scrollTop=thread.scrollHeight;
 },[lines,step,alternative]);
 // Explicit opt-in; the local deterministic guide remains available instantly.
 // The model may only phrase a question, never modify filters or render jobs.
 useEffect(()=>{
   if(!aiConsent||!draft.goal.trim()||step==="goal"||step==="ready"||step==="done")return;
   const key=locale+":"+draft.goal.trim();
   if(aiAskedKeyRef.current===key)return;
   aiAskedKeyRef.current=key;
   const controller=new AbortController();
   setAiStatus("loading");
   void fetch("/api/holistic-support/video-director-chat",{
     method:"POST",credentials:"same-origin",cache:"no-store",
     headers:{"Content-Type":"application/json"},signal:controller.signal,
     body:JSON.stringify({consent:true,locale,goal:draft.goal,step,
       draft:{mood:draft.mood,aspect:draft.aspect,duration:draft.duration,
         music:draft.music,phrases:draft.phrases}}),
   }).then(async response=>{
     if(!response.ok)throw Error("FREE_AI_UNAVAILABLE");
     return response.json();
   }).then(payload=>{
     if(controller.signal.aborted)return;
     if(typeof payload?.reply!=="string"||payload.reply.length>160)throw Error("UNSAFE_AI_REPLY");
     if(currentStepRef.current!==step){setAiStatus("idle");return;}
     setAiStatus("ready");
     // Upgrade the last local question instead of displaying two competing
     // assistant questions for one filter when external AI responds.
     setLines(existing=>{
       const last=existing.at(-1);
       if(last?.role==="assistant"&&last.text===question(step))
         return [...existing.slice(0,-1),{...last,text:payload.reply}];
       return [...existing.slice(-34),{id:++counter.current,role:"assistant",text:payload.reply}];
     });
   }).catch(()=>{
     if(controller.signal.aborted)return;
     setAiStatus("fallback");addLine("assistant",t.aiFallback);
   });
   return ()=>controller.abort();
 // The first question is the sole external request per film goal; follow-ups stay local.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[aiConsent,draft.goal,locale]);
 useEffect(()=>{if(captureStarted&&rendering)setCaptureObserved(true);},[captureStarted,rendering]);
 useEffect(()=>{
   if(step!=="ready"||canCreate||disabled){setAssetWaitLong(false);return;}
   const id=window.setTimeout(()=>setAssetWaitLong(true),12000);
   return ()=>window.clearTimeout(id);
 },[step,canCreate,disabled]);
 // If the underlying guarded createVideo did not enter recording, do not strand
 // the conversation in a spinner. Actual rendering is never cancelled by this.
 useEffect(()=>{
   if(!captureStarted||captureObserved||rendering)return;
   const id=window.setTimeout(()=>{
     setCaptureStarted(false);setStep("ready");addLine("assistant",t.timeout);
   },8000);
   return ()=>window.clearTimeout(id);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[captureStarted,captureObserved,rendering]);
 useEffect(()=>{
   if(captureStarted&&captureObserved&&!rendering&&resultReady){
     setStep("done");addLine("assistant",t.done);setCaptureStarted(false);
   }else if(captureStarted&&captureObserved&&!rendering&&resultFailed){
     setStep("ready");addLine("assistant",t.blocked);setCaptureStarted(false);
   }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[captureStarted,captureObserved,rendering,resultReady,resultFailed]);
 const proposal=useMemo(()=>draft.goal.trim()?recommendAutoVideo({goal:draft.goal,locale,fallbackTheme:theme,presets,scenes}):null,
   [draft.goal,locale,theme,presets,scenes]);
 const options=proposal?[proposal.presetId,...proposal.alternativePresetIds].filter((id):id is string=>Boolean(id)):[];
 const chosenId=options[alternative%Math.max(1,options.length)]||null;
 const selected=chosenId?presets.find(item=>item.id===chosenId):null;
 const sourceById=useMemo(()=>new Map(scenes.map(item=>[item.id,item])),[scenes]);
 const canPlan=Boolean(selected&&draft.mood&&draft.aspect&&draft.duration&&draft.music!==null&&draft.phrases!==null);
 const planKey=JSON.stringify([draft.goal,chosenId,draft.duration,draft.aspect,draft.music,
   draft.mood,draft.phrases,renderOptions.quality,renderOptions.brightness,renderOptions.volumePercent]);
 const currentPlanKeyRef=useRef(planKey);
 currentPlanKeyRef.current=planKey;
 const currentAiCut=aiCut?.key===planKey?aiCut.value:null;
 const executable=useMemo(()=>{
   if(!canPlan||!selected)return null;
   try{
     return compileExecutableVideoScenario({
       goal:draft.goal,locale,fallbackTheme:theme,presets,scenes,
       selectedPresetId:selected.id,alternativePresetIds:proposal?.alternativePresetIds||[],
       excludedMotifs:proposal?.excludedMotifs||[],
       draft,renderOptions,aiSuggestion:currentAiCut,
     });
   }catch{return null;}
 },[canPlan,selected,draft,locale,theme,presets,scenes,proposal,renderOptions,currentAiCut]);
 const executionKey=JSON.stringify([planKey,executable?.edit.clipIds,executable?.edit.durationSecondsByStage]);
 const needSymbolic=Boolean(proposal?.requiresNewAiFootage||executable?.requiresNovelFootage||parseVideoChatIntent(draft.goal).specificVisual);
 const reviewAvailable=Boolean(executable);
 const offerSymbolic=needSymbolic&&!symbolicAllowed;
 const choices:readonly (readonly [string,string])[]=step==="goal"?t.themeChips.map(x=>[x,x] as const):
   step==="mood"?t.moodChoices:step==="aspect"?t.aspectChoices:
   step==="duration"?([10,15,20,30,60] as const).map(n=>[n+" s",String(n)] as const):
   step==="music"?t.musicChoices:step==="phrases"?t.phraseChoices:[];
 const answer=(raw:string)=>{
   if(disabled)return;
   const value=raw.trim().replace(/\s+/gu," ").slice(0,800);
   if(!value)return;
   setInput("");addLine("user",value);
   // A direct command acts on the approved storyboard. Only modifications
   // invalidate an AI cut, never Confirm/Create/Open messages.
   const action=parseVideoChatAction(value,step);
   if(action==="confirm"){confirm();return;}
   if(action==="create"){start();return;}
   if(action==="open"){onOpenResult();return;}
   cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
   if(step==="goal"){
     if(isGenericVideoRequest(value)){
       addLine("assistant",t.goal);return;
     }
     const parsed=parseVideoChatIntent(value);
     const next:Draft={...draft,goal:parsed.text,mood:parsed.mood as Mood|null,
       aspect:parsed.aspect as Aspect|null,duration:parsed.duration as Length|null,
       music:parsed.music as Music|null,phrases:parsed.phrases};
     setDraft(next);onGoalChange(parsed.text);setSymbolicAllowed(false);setAlternative(0);
     const following=nextVideoChatStep(next) as Step;
     setStep(following);addLine("assistant",question(following));
     return;
   }
   if(step==="review"||step==="ready"||step==="done"){
     const hasChoice=hasVideoChatFilter(value);
     // Existing encoded output must no longer be offered once the user asks
     // for a new edit or a new film, even before reconfirming the storyboard.
     onInvalidate();
     if(isGenericVideoRequest(value)){
       setDraft(initial(""));onGoalChange("");setSymbolicAllowed(false);setAlternative(0);
       setAiConsent(false);aiAskedKeyRef.current="";setAiStatus("idle");
       setCaptureStarted(false);setCaptureObserved(false);setStep("goal");
       addLine("assistant",t.goal);return;
     }
     if(!hasChoice){
       const next={...initial(value),...{goal:value}};
       setDraft(next);onGoalChange(value);setSymbolicAllowed(false);setAlternative(0);
       setAiConsent(false);aiAskedKeyRef.current="";setAiStatus("idle");
       setCaptureStarted(false);setCaptureObserved(false);
       setStep("mood");addLine("assistant",t.mood);
     }else{
       const next=mergeVideoChatPreferences(draft,value) as Draft;
       setDraft(next);setCaptureStarted(false);setCaptureObserved(false);
       const following=nextVideoChatStep(next) as Step;
       setStep(following);addLine("assistant",t.promptChanged);
     }
     return;
   }
   const parsed=parseVideoChatStepChoice(step,value);
   // A single natural-language message may supply several other preferences.
   // Keep all recognized choices, rather than discarding all but the current step.
   if(parsed===null&&!hasVideoChatFilter(value)){addLine("assistant",t.error);return;}
   const next=mergeVideoChatPreferences(
     parsed===null?draft:{...draft,[step]:parsed},value) as Draft;
   setDraft(next);
   const following=nextVideoChatStep(next) as Step;
   setStep(following);addLine("assistant",question(following));
 };
 const autoComplete=()=>{
   if(disabled)return;
   const next=suggestVideoChatDefaults(draft,proposal?.theme||theme) as Draft;
   setDraft(next);setStep("review");addLine("assistant",t.review);
 };
 const reset=()=>{
   if(disabled)return;
   cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
   setDraft(initial(""));onGoalChange("");setStep("goal");setSymbolicAllowed(false);
   aiAskedKeyRef.current="";setAiStatus("idle");setAiConsent(false);
   setAlternative(0);setCaptureStarted(false);setCaptureObserved(false);
   setLines([{id:++counter.current,role:"assistant",text:t.intro}]);setInput("");
 };
 const confirm=()=>{
   if(disabled||!executable||offerSymbolic||aiCutState==="loading")return;
   cutAbortRef.current?.abort();
   const ok=onConfirm({scenario:executable});
   if(!ok){addLine("assistant",t.blocked);return;}
   approvedPlanKeyRef.current=executionKey;
   setStep("ready");addLine("assistant",t.ready);setCaptureStarted(false);setCaptureObserved(false);
 };
 const enhanceExecutable=async()=>{
   if(!aiConsent||disabled||!executable||offerSymbolic||aiCutState==="loading")return;
   cutAbortRef.current?.abort();
   const requestKey=planKey;
   const controller=new AbortController();
   cutAbortRef.current=controller;
   setAiCutState("loading");
   try{
     const response=await fetch("/api/holistic-support/video-director-plan",{
       method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",
       signal:controller.signal,
       headers:{"Content-Type":"application/json","Accept":"application/json"},
       body:JSON.stringify({
         consent:true,locale,goal:draft.goal,durationSeconds:executable.durationSeconds,
         aspect:executable.aspect,mood:executable.mood,
         music:executable.audio.trackId,phrases:executable.phrases,
         candidateSceneIds:executable.candidateSceneIds,
         excludedMotifs:executable.edit.excludedMotifs,
       }),
     });
     if(!response.ok)throw Error("VIDEO_PLAN_UNAVAILABLE");
     const payload:unknown=await response.json();
     if(controller.signal.aborted||requestKey!==currentPlanKeyRef.current||
       currentStepRef.current!=="review"||!payload||typeof payload!=="object"||
       !("suggestion" in payload))return;
     const accepted=parseAiVideoCutSuggestion(payload.suggestion,{
       candidateSceneIds:executable.candidateSceneIds,
       durationSeconds:executable.durationSeconds,scenes,
       excludedMotifs:executable.edit.excludedMotifs,
       goal:draft.goal,
     });
     if(!accepted)throw Error("VIDEO_PLAN_UNTRUSTED");
     setAiCut({key:requestKey,value:{clipIds:[...accepted.clipIds],
       stageSeconds:[...accepted.stageSeconds]}});
     setAiCutState("ready");addLine("assistant",t.aiPlanReady);
   }catch{
     if(!controller.signal.aborted){setAiCutState("fallback");addLine("assistant",t.aiPlanFailed);}
   }finally{
     if(cutAbortRef.current===controller)cutAbortRef.current=null;
   }
 };
 const start=()=>{
   if(disabled||!canCreate||captureStarted||step!=="ready")return;
   if(approvedPlanKeyRef.current!==executionKey){setStep("review");onInvalidate();addLine("assistant",t.promptChanged);return;}
   const accepted=onCreate();
   if(accepted===false){addLine("assistant",t.blocked);return;}
   setCaptureObserved(false);setCaptureStarted(true);
 };
  return <section ref={windowRef} className={css.window} data-video-director-chat data-chat-step={step} data-chat-hydrated={clientHydrated?"true":"false"} aria-labelledby="video-director-chat-heading">
   <header className={css.heading}>
     <span className={css.avatar} aria-hidden="true"><Sparkles size={20}/></span>
     <span className={css.titleGroup}><strong id="video-director-chat-heading">{t.title}</strong><small>{t.subtitle}</small></span>
     <button type="button" className={css.iconButton} disabled={disabled||captureStarted} onClick={onOpenEditor} aria-label={t.editor} title={t.editor}><SlidersHorizontal size={20}/></button>
   </header>
   <div ref={threadRef} className={css.thread} role="log" aria-live="polite" aria-relevant="additions text">
     {lines.map(line=><div key={line.id} className={line.role==="assistant"?css.assistant:css.user}>
       {line.text}
     </div>)}
     {(step==="review"||step==="ready"||step==="done")&&selected&&reviewAvailable?<div className={css.storyCard} data-video-chat-storyboard>
       <div className={css.storyTop}><Film size={19}/><strong>{selected.label[locale]}</strong></div>
       <div className={css.meta} data-executable-video-scenario={executable?.version}>
         {draft.duration} s · {draft.aspect==="portrait"?"9:16":draft.aspect==="square"?"1:1":"16:9"} · {draft.music==="none"?"Silent":draft.music} · 4 MP4 · {executable?.origin==="ai_suggestion_validated"?t.planAi:t.planLocal}
       </div>
       <div className={css.filterSummary} role="group" aria-label={t.edit}>
       {(["mood","aspect","duration","music","phrases"] as const).map(key=><button
         key={key} type="button" disabled={disabled||captureStarted}
         data-video-chat-change-filter={key}
         onClick={()=>{cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");onInvalidate();setStep(key);addLine("assistant",question(key));}}>
         <span>{t.filterNames[key]}</span>
         <strong>{key==="duration"?draft.duration+" s":
           key==="phrases"?(draft.phrases?"✓":"—"):
           key==="aspect"?(draft.aspect==="portrait"?"9:16":draft.aspect==="square"?"1:1":"16:9"):
           String(draft[key])}</strong>
       </button>)}
     </div>
     <div className={css.shots}>
         {executable?.shots.map((shot,index)=>{
           const source=sourceById.get(shot.sceneId);
           return <div key={shot.sceneId} className={css.shot} data-chat-shot-id={shot.sceneId}>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             {source?.poster?<img alt="" src={source.poster} loading="lazy"/>:<span className={css.noPoster}><Film size={19}/></span>}
             <span><b>{index+1}. {t.stages[index]} · {shot.durationSeconds} s</b>
               <small>{source?.label[locale]||shot.sceneId}</small>
               {shot.captionText?<small>“{shot.captionText}”</small>:null}
             </span>
           </div>;
         })}
       </div>
       {offerSymbolic?<div className={css.warning} role="alert">
         <p>{t.unsupported}</p><button type="button" disabled={disabled} onClick={()=>setSymbolicAllowed(true)}>{t.symbolic}</button>
         <button type="button" disabled={disabled} onClick={reset}>{t.retryGoal}</button>
       </div>:null}
       {step==="review"&&!offerSymbolic?<div className={css.storyActions}>
         <button type="button" className={css.primary} disabled={disabled||aiCutState==="loading"} data-video-chat-confirm onClick={confirm}><Check size={17}/>{t.confirm}</button>
         {options.length>1?<button type="button" className={css.secondary} disabled={disabled} onClick={()=>{
           cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");onInvalidate();
           setAlternative(n=>(n+1)%options.length);
         }}>{t.alternate}</button>:null}
         {aiConsent&&executable?<button type="button" className={css.secondary}
           data-video-chat-ai-cut disabled={disabled||aiCutState==="loading"}
           onClick={()=>void enhanceExecutable()}>{aiCutState==="loading"?t.aiPlanBusy:t.aiPlan}</button>:null}
       </div>:null}
       {step==="ready"?<div className={css.storyActions}>
         <button type="button" className={css.primary} disabled={!canCreate||disabled||captureStarted} data-video-chat-create onClick={start}>
           <Film size={17}/>{t.create}
         </button>
         {!canCreate&&!disabled?(assetWaitLong?<div className={css.warning} role="alert">
           <p>{t.assetTimeout}</p>
           {options.length>1?<button type="button" onClick={()=>{cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
             onInvalidate();setAlternative(n=>(n+1)%options.length);setStep("review");}}>{t.alternate}</button>:null}
           <button type="button" onClick={onOpenEditor}>{t.editor}</button>
         </div>:<small className={css.loading}>{t.loading}</small>):null}
       </div>:null}
       {step==="done"?<button type="button" className={css.primary} onClick={onOpenResult} data-video-chat-result><ArrowRight size={18}/>{t.open}</button>:null}
     </div>:null}
     {(step==="review"||step==="ready")&&(!selected||!executable)?<div className={css.warning} role="alert"><p>{t.missing}</p><button type="button" onClick={reset}>{t.retryGoal}</button></div>:null}
     {captureStarted?<div className={css.status} role="status">
       <span className={css.pulse}/>{rendering?t.creating:t.loading}
       {rendering&&renderProgress>0?<small>{Math.round(renderProgress)}%</small>:null}
     </div>:null}
     {step==="done"?<div className={css.finishActions}>
       <button type="button" className={css.secondary} onClick={reset}>{t.startAgain}</button>
       <button type="button" className={css.secondary} onClick={()=>{onInvalidate();setStep("review");}}>{t.edit}</button>
     </div>:null}
   </div>
   {step!=="goal"&&step!=="review"&&step!=="ready"&&step!=="done"?<div className={css.autoChoices}>
     <button type="button" disabled={disabled} data-video-chat-auto onClick={autoComplete}>
       <Sparkles size={15}/>{t.auto}
     </button>
   </div>:null}
   {choices.length>0?<div className={css.choices} role="group" aria-label={question(step)}>
     {choices.map(([label,value])=><button type="button" key={value} disabled={disabled} onClick={()=>answer(value===label?label:value)}>{label}</button>)}
   </div>:null}
   <form className={css.composer} onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();answer(input);}}>
     <button className={css.composerTool} type="button" onClick={onPickPhoto} disabled={disabled} aria-label={t.photo} title={t.photo}><ImagePlus size={21}/></button>
     <textarea ref={composerRef} rows={2} value={input} onChange={(event:ChangeEvent<HTMLTextAreaElement>)=>setInput(event.currentTarget.value)}
       onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();answer(input);}}}
       maxLength={800} disabled={disabled}
       autoComplete="off" aria-label={t.placeholder} placeholder={t.placeholder}/>
     <button className={css.send} type="submit" aria-label={t.send} disabled={disabled||!input.trim()}><Send size={19}/></button>
   </form>
   <label className={css.aiOptIn}>
     <input type="checkbox" checked={aiConsent} disabled={disabled}
       onChange={(event:ChangeEvent<HTMLInputElement>)=>{
         const allowed=event.currentTarget.checked;
         setAiConsent(allowed);
         if(!allowed){
           cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
           setAiStatus("idle");onInvalidate();setStep(current=>current==="ready"?"review":current);
         }
       }}/>
     <span>{t.aiConsent}{aiStatus==="loading"?" · "+t.aiBusy:""}</span>
   </label>
   <div className={css.foot}><span>{aiConsent?t.noteAi:t.note}</span><button type="button" onClick={onOpenAudio} disabled={disabled}><Music2 size={14}/>{t.audio}</button></div>
 </section>;
}
