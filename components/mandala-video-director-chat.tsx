"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {ChangeEvent,FormEvent} from "react";
import {ArrowRight,Check,Film,ImagePlus,Music2,Send,SlidersHorizontal,Sparkles} from "lucide-react";
import {recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {compileExecutableVideoScenario,parseAiVideoCutSuggestion} from "@/lib/mandala/video-executable-director.mjs";
import {normalizeStageCaption} from "@/lib/mandala/stage-caption-track.mjs";
import {getVideoGoalTopic,listVideoGoalScenarios} from "@/lib/mandala/video-goal-taxonomy.mjs";
import {initialVideoChatTree,nextVideoChatTreeStep,videoChatTreeOptions,
 chooseVideoChatTreeOption,resolveVideoChatTreeRequest,changeVideoChatPhraseFilter,
 chooseCustomVideoChatPhrase,autocompleteVideoChatTree,VIDEO_CHAT_TREE_STEPS,
 recognizeVideoChatTreeOption,recognizeVideoChatPhraseStyle} from "@/lib/mandala/video-chat-tree.mjs";
import {isGenericVideoRequest,parseVideoChatAction,mergeVideoChatPreferences,parseVideoChatIntent,parseVideoChatStepChoice,suggestVideoChatDefaults} from "@/lib/mandala/video-chat-intent.mjs";
import {understandVideoChatReply} from "@/lib/mandala/video-chat-understanding.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-director-chat.module.css";

type Aspect="portrait"|"landscape"|"square";
type Length=10|15|20|30|60;
type Music="none"|"harmony"|"love"|"meditation";
type Mood="slow"|"dynamic";
type TreeStep="category"|"topic"|"scenario"|"idea"|"phrase";
type Step=TreeStep|"mood"|"aspect"|"duration"|"music"|"phrases"|"review"|"ready"|"done";
type Draft={goal:string;mood:Mood|null;aspect:Aspect|null;duration:Length|null;music:Music|null;phrases:boolean|null;
 categoryId:string|null;topicId:string|null;scenarioId:string|null;ideaId:string|null;
 phraseId:string|null;phraseText:string|null;tone:"gentle"|"confident"|"grounded"|"inspiring";speaker:"self"|"support";length:"short"|"extended"};
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
 ru:{title:"AI-видеорежиссёр",subtitle:"Подбираю реальные видеосюжеты · бесплатно",intro:"Привет! Подберём видео по дереву сайта: цель, тема, сценарий, идея и слова поддержки. Выберите цель или опишите запрос.",
  category:"Какова цель вашего видео? Выберите направление или опишите запрос своими словами.",topic:"Какую тему хотите раскрыть? Выберите одну из шести.",scenario:"Какой сценарий вам ближе? Четыре варианта — разные истории.",idea:"Какую главную идею передать зрителю?",phrase:"Какие слова поддержки включить в видео? Выберите фразу или настройте её тон.",skipPhrase:"Без фраз",conceptNote:"Выбранный сюжет пока не привязан к отдельным MP4. Ниже — другой, доступный монтаж по вашей теме, а не точная экранизация этого сюжета.",selectedPrefix:"Выбрано: ",unknownGoal:"Пока не могу определить тему по описанию. Выберите цель ниже — ваш текст сохранён.",tone:"Тон",speaker:"Обращение",length:"Длина",toneNames:{gentle:"Бережно",confident:"Уверенно",grounded:"Спокойно",inspiring:"Вдохновляюще"},speakerNames:{self:"От себя · Я",support:"К тебе · Ты"},lengthNames:{short:"Коротко",extended:"Развёрнуто"},
  filterNames:{mood:"Атмосфера",aspect:"Формат",duration:"Время",music:"Музыка",phrases:"Фразы"},
  goal:"Какое видео вы представляете? Можно написать одной фразой.",mood:"Какая атмосфера нужна — мягкая или динамичная?",aspect:"Где будете смотреть ролик? Выберите формат.",duration:"Какой длины сделать ролик?",music:"Какую музыку добавить?",phrases:"Добавить поддерживающие фразы на экран?",review:"Я подобрал сюжет по вашим ответам. Проверьте сцены и параметры перед созданием.",ready:"Сценарий утверждён. Можно запускать запись настоящего видео.",
  done:"Видео готово. Откройте его для просмотра, скачивания и отправки.",error:"Не получилось распознать ответ. Выберите вариант ниже или уточните словами.",
  unsupported:"Для указанного конкретного объекта пока нет подходящего реального MP4. Могу предложить символический монтаж из доступных видеосцен — он не будет изображать запрошенный объект.",
  missing:"Подходящий монтаж из разрешённых сцен не найден. Измените тему или откройте редактор.", symbolic:"Предложить метафорический сюжет",retryGoal:"Изменить запрос",alternate:"Другой сюжет",confirm:"Подтвердить сценарий",create:"Создать видео",creating:"Собираем видео на устройстве…",loading:"Загружаем выбранные видеосцены…",open:"Открыть готовое видео",editor:"Расширенный редактор",startAgain:"Новый ролик",edit:"Изменить настройки",note:"Видео собирается из разрешённых MP4, не из новых AI-кадров. Ваш текст не передаётся внешним AI-сервисам.",
  noteAi:"С вашего разрешения текст идеи и выбранные настройки отправляются подтверждённому бесплатному AI. Фото и голос остаются на устройстве.",
  placeholder:"Напишите, что хотите создать или изменить…",send:"Отправить",photo:"Добавить своё фото",audio:"Настроить аудиогид, музыку и голос",promptChanged:"Обновил параметры. Проверьте сценарий снова.",chatHelp:"Опишите пожелание своими словами. Я помогу выбрать цель, тему, сценарий, идею и фразы. Можно сказать «второй вариант», «выбери сам», «назад», «без музыки» или изменить любую настройку.",chatAmbiguous:"В запросе несколько противоречащих вариантов. Какой выбрать?",chatDuration:"Доступная длительность: 10, 15, 20, 30 или 60 секунд. Уточните выбор.",chatUnknown:"Я не уверен, что понял выбор. Напишите иначе, выберите вариант ниже или скажите «выбери сам».",chatAlternateMissing:"Сейчас нет другого подтверждённого видеомонтажа. Выберите другую идею или измените тему.",chatAudio:"Настройки голоса и аудиогида открываются отдельно; музыка и фразы на экране настраиваются независимо.",chatConfirmFirst:"Сначала подтвердите сценарий; только затем запускается создание видео.",
  aiConsent:"Разрешить бесплатному AI уточнять вопрос и предлагать реальный монтаж (передать идею и фильтры внешнему сервису)",aiPlan:"AI: подобрать сцены и монтаж",aiPlanBusy:"AI подбирает монтаж…",aiPlanReady:"AI предложил проверенный монтаж. Проверьте кадры и подтвердите.",aiPlanFailed:"AI-монтаж недоступен или не прошёл проверку — локальный сценарий сохранён.",planLocal:"Локальный режиссёр",planAi:"AI · проверенный сценарий",aiBusy:"AI уточняет вопрос…",aiFallback:"Бесплатный AI сейчас недоступен — продолжим с локальными настройками.",
  assetTimeout:"Сцены или права на запись пока недоступны. Выберите другой сюжет либо проверьте настройки.",
  auto:"Подобрать настройки автоматически",timeout:"Запись не началась. Проверьте доступность сцен и попробуйте снова.",blocked:"Результат не прошёл проверку или запись не удалась. Воспользуйтесь настройками и повторите создание.",stages:["Начало","Погружение","Развитие","Завершение"],
  themeChips:["Хочу больше спокойствия","Любовь и близость","Энергия и бодрость","Уверенность в себе"],
  moodChoices:[["Мягкая","slow"],["Динамичная","dynamic"]],aspectChoices:[["Вертикальный 9:16","portrait"],["Горизонтальный 16:9","landscape"],["Квадрат 1:1","square"]],
  musicChoices:[["Нежная музыка","love"],["Спокойная","meditation"],["Гармония","harmony"],["Без музыки","none"]],phraseChoices:[["Да, добавить","yes"],["Нет","no"]]},
 en:{title:"AI Video Director",subtitle:"Real approved footage · free",intro:"Hi! I’ll guide you through your goal, topic, story, idea and supportive words. Pick a goal or describe your wish.",
  category:"What is your video's goal? Choose an area or describe what matters to you.",topic:"Which of these six topics fits best?",scenario:"Which of the four different stories would you like?",idea:"What main idea should the video convey?",phrase:"Choose a supportive line, or customize its tone.",skipPhrase:"No captions",conceptNote:"This narrative is not yet linked to its own MP4 footage. The edit below is an available topic-based alternative, not an exact rendering of that story.",selectedPrefix:"Selected: ",unknownGoal:"I couldn't place that description in the topic tree. Choose a goal below; your words are saved.",tone:"Tone",speaker:"Address",length:"Length",toneNames:{gentle:"Gentle",confident:"Confident",grounded:"Grounded",inspiring:"Inspiring"},speakerNames:{self:"First person · I",support:"Support · You"},lengthNames:{short:"Short",extended:"Extended"},
  filterNames:{mood:"Mood",aspect:"Format",duration:"Length",music:"Music",phrases:"Phrases"},
  goal:"What kind of video do you imagine? Describe it briefly.",mood:"What mood should it have — gentle or dynamic?",aspect:"Where will you use the video? Choose a format.",duration:"How long should it be?",music:"What soundtrack would you like?",phrases:"Add supportive phrases to the screen?",review:"Here's a story assembled from available footage. Review it before creating.",ready:"Story approved. You can now create the real video.",
  done:"Your video is ready. Open it to play, download or share.",error:"I couldn't interpret that choice. Try the options below or another phrase.",
  unsupported:"That specific subject is not available in our verified MP4 catalog. I can propose a symbolic story using existing footage, but it won't show that subject.",
  missing:"No compatible licensed clips were found. Change the goal or open the editor.",symbolic:"Use a symbolic story",retryGoal:"Change idea",alternate:"Another story",confirm:"Confirm story",create:"Create video",creating:"Recording video on this device…",loading:"Loading the selected video clips…",open:"Open finished video",editor:"Advanced editor",startAgain:"New video",edit:"Change settings",note:"Uses approved existing MP4 footage, not newly AI-generated frames. Your text is not sent to an external AI service.",
  noteAi:"With your permission, the idea text and selected settings are sent to confirmed free AI. Photos and voice stay on your device.",
  placeholder:"Describe a video or tell me what to change…",send:"Send",photo:"Add my photo",audio:"Set up voice, music and audio guide",promptChanged:"Updated the settings. Please confirm the story again.",chatHelp:"Describe your request in your own words. I can help select a goal, topic, story, idea and phrases. Try 'second option', 'choose for me', 'go back', 'no music', or edit any setting.",chatAmbiguous:"I found conflicting options. Which one do you prefer?",chatDuration:"Available lengths: 10, 15, 20, 30 or 60 seconds. Please choose one.",chatUnknown:"I'm not sure which option you meant. Try different words, tap a choice below, or say 'choose for me'.",chatAlternateMissing:"No other verified film edit is available yet. Try another idea or topic.",chatAudio:"Voice and audio-guide controls open separately. Music and on-screen phrases remain independent.",chatConfirmFirst:"Confirm the story first, then you can create the video.",
  aiConsent:"Allow free AI to ask one question and suggest a real film cut (send my goal and filters externally)",aiPlan:"AI: arrange real scenes",aiPlanBusy:"AI is planning the cut…",aiPlanReady:"AI suggested a verified cut. Review the scenes, then confirm.",aiPlanFailed:"AI edit was unavailable or invalid. Your local film plan is preserved.",planLocal:"Local director",planAi:"AI · validated cut",aiBusy:"AI is personalizing…",aiFallback:"Free AI is unavailable, so we will continue locally.",
  assetTimeout:"Sources or recording permissions are not ready. Try another story or check settings.",
  auto:"Suggest settings for me",timeout:"Recording did not begin. Check the video sources and retry.",blocked:"Recording or playback verification failed. Adjust settings and retry.",stages:["Opening","Arriving","Exploring","Closing"],
  themeChips:["I want more calm","Love and connection","Energy and vitality","Confidence and focus"],
  moodChoices:[["Gentle","slow"],["Dynamic","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Landscape 16:9","landscape"],["Square 1:1","square"]],
  musicChoices:[["Warm melody","love"],["Meditative","meditation"],["Harmony","harmony"],["Silent","none"]],phraseChoices:[["Yes, add them","yes"],["No","no"]]},
 es:{title:"Director de vídeo IA",subtitle:"Escenas reales autorizadas · gratis",intro:"¡Hola! Elijamos objetivo, tema, historia, idea y palabras de apoyo. Selecciona un objetivo o describe tu deseo.",
  category:"¿Cuál es el objetivo de tu vídeo? Elige un área o describe tu necesidad.",topic:"¿Cuál de estos seis temas encaja mejor?",scenario:"¿Cuál de las cuatro historias prefieres?",idea:"¿Qué idea central quieres transmitir?",phrase:"Elige una frase de apoyo o cambia su tono.",skipPhrase:"Sin frases",conceptNote:"Esta historia todavía no tiene sus propios MP4. El montaje disponible es una alternativa sobre el tema, no la representación exacta del guion.",selectedPrefix:"Elegido: ",unknownGoal:"No he identificado el tema. Elige un objetivo de la lista; tu descripción se conserva.",tone:"Tono",speaker:"Tratamiento",length:"Longitud",toneNames:{gentle:"Suave",confident:"Segura",grounded:"Serena",inspiring:"Inspiradora"},speakerNames:{self:"Desde mí · Yo",support:"Apoyo · Tú"},lengthNames:{short:"Corta",extended:"Larga"},
  filterNames:{mood:"Ambiente",aspect:"Formato",duration:"Tiempo",music:"Música",phrases:"Frases"},
  goal:"¿Qué tipo de vídeo imaginas? Descríbelo en una frase.",mood:"¿Qué ambiente buscas: suave o dinámico?",aspect:"¿Dónde usarás el vídeo? Elige el formato.",duration:"¿Qué duración prefieres?",music:"¿Qué música prefieres?",phrases:"¿Añadir frases de apoyo en pantalla?",review:"Encontré una historia con escenas disponibles. Comprueba los ajustes antes de crear.",ready:"Historia aprobada. Ya puedes crear el vídeo real.",
  done:"El vídeo está listo. Ábrelo para ver, guardar o compartir.",error:"No entendí esa elección. Prueba las opciones o escribe de otra manera.",
  unsupported:"Ese objeto específico no está en el catálogo de MP4. Puedo proponer una historia simbólica, pero no mostrará ese objeto.",
  missing:"No se encontraron escenas autorizadas compatibles. Cambia el tema o usa el editor.",symbolic:"Usar una historia simbólica",retryGoal:"Cambiar idea",alternate:"Otra historia",confirm:"Confirmar historia",create:"Crear vídeo",creating:"Grabando vídeo en este dispositivo…",loading:"Cargando las escenas…",open:"Abrir vídeo terminado",editor:"Editor avanzado",startAgain:"Nuevo vídeo",edit:"Cambiar ajustes",note:"Montaje de MP4 autorizados, no fotogramas nuevos generados por IA. Tu texto no se envía a un servicio IA externo.",
  noteAi:"Con tu permiso, el texto de la idea y los ajustes elegidos se envían a IA gratuita verificada. Fotos y voz permanecen en tu dispositivo.",
  placeholder:"Describe el vídeo o lo que quieres cambiar…",send:"Enviar",photo:"Añadir mi foto",audio:"Configurar voz, música y audioguía",promptChanged:"Ajustes actualizados. Confirma la historia otra vez.",chatHelp:"Describe tu objetivo con tus palabras. Puedo ayudarte a elegir meta, tema, guion, idea y frases. Prueba 'segunda opción', 'elige tú', 'atrás', 'sin música' o cambia un ajuste.",chatAmbiguous:"Hay opciones contradictorias. ¿Cuál prefieres?",chatDuration:"Duraciones disponibles: 10, 15, 20, 30 o 60 segundos. Elige una.",chatUnknown:"No estoy seguro de qué opción quieres. Dilo de otra forma, toca una opción o escribe 'elige tú'.",chatAlternateMissing:"No hay otro montaje verificado disponible. Prueba otra idea o tema.",chatAudio:"La voz y la audioguía se configuran aparte. La música y las frases en pantalla son independientes.",chatConfirmFirst:"Primero confirma el guion; después podrás crear el vídeo.",
  aiConsent:"Permitir que la IA gratuita formule una pregunta y proponga un montaje real (enviar idea y filtros)",aiPlan:"IA: ordenar escenas reales",aiPlanBusy:"IA prepara el montaje…",aiPlanReady:"La IA propuso un montaje verificado. Revísalo y confírmalo.",aiPlanFailed:"Montaje IA no disponible o no válido. Se mantiene el plan local.",planLocal:"Director local",planAi:"IA · montaje validado",aiBusy:"La IA personaliza la pregunta…",aiFallback:"La IA gratuita no está disponible; continuaremos localmente.",
  assetTimeout:"Las escenas o permisos aún no están disponibles. Prueba otra historia o revisa los ajustes.",
  auto:"Sugerir ajustes automáticamente",timeout:"No se inició la grabación. Comprueba las escenas y vuelve a intentarlo.",blocked:"Falló la grabación o verificación. Ajusta los parámetros e inténtalo otra vez.",stages:["Inicio","Entrada","Desarrollo","Cierre"],
  themeChips:["Quiero más calma","Amor y conexión","Energía y vitalidad","Confianza y enfoque"],
  moodChoices:[["Suave","slow"],["Dinámico","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Horizontal 16:9","landscape"],["Cuadrado 1:1","square"]],
  musicChoices:[["Melodía suave","love"],["Meditación","meditation"],["Armonía","harmony"],["Sin música","none"]],phraseChoices:[["Sí, añadir","yes"],["No","no"]]},
} as const;
const initial=(goal:string,locale:PublicLocale):Draft=>{
 const parsed=parseVideoChatIntent(goal);
 return {...initialVideoChatTree(goal,locale),goal:parsed.text,mood:parsed.mood as Mood|null,
   aspect:parsed.aspect as Aspect|null,duration:parsed.duration as Length|null,
   music:parsed.music as Music|null,phrases:parsed.phrases} as Draft;
};

export function MandalaVideoDirectorChat({locale,goal,theme,presets,scenes,disabled,canCreate,
 renderOptions,rendering,renderProgress,resultReady,resultFailed,onGoalChange,onConfirm,onCreate,onOpenResult,
 onOpenEditor,onPickPhoto,onOpenAudio,onInvalidate}:Props){
 const t=copy[locale];
 const [draft,setDraft]=useState<Draft>(()=>initial(goal,locale));
 const [step,setStep]=useState<Step>(()=>nextVideoChatTreeStep(initial(goal,locale)) as Step);
 const [lines,setLines]=useState<ChatLine[]>([{id:0,role:"assistant",text:t.intro}]);
 const [input,setInput]=useState("");
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
 const addLine=(role:ChatLine["role"],text:string)=>{
   setLines(existing=>[...existing.slice(-34),{id:++counter.current,role,text}]);
 };
 const question=(next:Step)=>next==="done"?t.done:next==="ready"?t.ready:t[next];
 // The same client-local goal field is edited by the existing Studio controls.
 useEffect(()=>{
   if(goal.trim()===draft.goal.trim()||!goal.trim())return;
   setDraft(initial(goal,locale));
   setStep(nextVideoChatTreeStep(initial(goal,locale)) as Step);
   setSymbolicAllowed(false);setAlternative(0);
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
   if(!aiConsent||!draft.topicId||!draft.scenarioId||!draft.ideaId||
       !["mood","aspect","duration","music","phrases"].includes(step))return;
   const questionGoal=draft.goal.trim()||
     getVideoGoalTopic(draft.topicId,locale)?.desiredOutcome||"";
   if(questionGoal.length<3)return;
   const key=locale+":"+questionGoal;
   if(aiAskedKeyRef.current===key)return;
   aiAskedKeyRef.current=key;
   const controller=new AbortController();
   setAiStatus("loading");
   void fetch("/api/holistic-support/video-director-chat",{
     method:"POST",credentials:"same-origin",cache:"no-store",
     headers:{"Content-Type":"application/json"},signal:controller.signal,
     body:JSON.stringify({consent:true,locale,goal:questionGoal,step,
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
 },[aiConsent,draft.goal,locale,step]);
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
 const chosenTopic=draft.topicId?getVideoGoalTopic(draft.topicId,locale):null;
 const chosenNarrative=draft.scenarioId&&draft.topicId?
   listVideoGoalScenarios(draft.topicId,locale).find(row=>row.id===draft.scenarioId):null;
 const filmTheme=(chosenTopic?.legacyVideoTheme||theme) as VideoTheme;
 const goalForPlan=draft.goal.trim()||chosenTopic?.desiredOutcome||"";
 const proposal=useMemo(()=>goalForPlan?recommendAutoVideo({
   goal:goalForPlan,locale,fallbackTheme:filmTheme,presets,scenes}):null,
   [goalForPlan,locale,filmTheme,presets,scenes]);
 // The selected canonical topic determines the visual production theme.
 // Stable options make the validated four-shot compiler independent of
 // unrelated chat-message rerenders.
 const options=useMemo(()=>{
   const proposed=proposal?[proposal.presetId,...proposal.alternativePresetIds]
     .filter((id):id is string=>Boolean(id)):[];
   const scoped=proposed.filter(id=>presets.find(item=>item.id===id)?.theme===filmTheme);
   return draft.topicId?(scoped.length?scoped:
     presets.filter(item=>item.theme===filmTheme).map(item=>item.id)).slice(0,4):proposed;
 },[proposal,draft.topicId,filmTheme,presets]);
 const chosenId=options[alternative%Math.max(1,options.length)]||null;
 const selected=chosenId?presets.find(item=>item.id===chosenId):null;
 const sourceById=useMemo(()=>new Map(scenes.map(item=>[item.id,item])),[scenes]);
 const canPlan=Boolean(selected&&draft.mood&&draft.aspect&&draft.duration&&draft.music!==null&&draft.phrases!==null);
 const planKey=JSON.stringify([goalForPlan,draft.categoryId,draft.topicId,draft.scenarioId,
   draft.ideaId,draft.phraseId,draft.phraseText,chosenId,draft.duration,draft.aspect,draft.music,
   draft.mood,draft.phrases,renderOptions.quality,renderOptions.brightness,renderOptions.volumePercent]);
 const currentAiCut=aiCut?.key===planKey?aiCut.value:null;
 const executable=useMemo(()=>{
   if(!canPlan||!selected)return null;
   try{
     const plan=compileExecutableVideoScenario({
       goal:goalForPlan,locale,fallbackTheme:filmTheme,presets,scenes,
       selectedPresetId:selected.id,alternativePresetIds:options.slice(1),
       excludedMotifs:proposal?.excludedMotifs||[],
       draft,renderOptions,aiSuggestion:currentAiCut,
     });
     if(!draft.phrases||!draft.phraseText)return plan;
     // Real stage captions are rendered by the same Canvas / MediaRecorder.
     const parts=draft.phraseText.split(/\r?\n/).map(normalizeStageCaption).filter(Boolean);
     if(!parts.length)return plan;
     const captions=[...plan.edit.captionTexts];
     captions[1]=parts[0];
     if(parts[1])captions[2]=parts[1];
     return {...plan,shots:plan.shots.map((shot,index)=>({...shot,captionText:captions[index]})),
       edit:{...plan.edit,captionTexts:captions}};
   }catch{return null;}
 },[canPlan,selected,draft,locale,filmTheme,goalForPlan,presets,scenes,proposal,options,renderOptions,currentAiCut]);
 const needSymbolic=Boolean(proposal?.requiresNewAiFootage||parseVideoChatIntent(goalForPlan).specificVisual);
 const reviewAvailable=Boolean(executable);
 const offerSymbolic=needSymbolic&&!symbolicAllowed;
 const choices:readonly (readonly [string,string])[]=VIDEO_CHAT_TREE_STEPS.includes(step)?
    videoChatTreeOptions(draft,step,locale).map(row=>[row.label,row.id] as const):
    step==="mood"?t.moodChoices:step==="aspect"?t.aspectChoices:
    step==="duration"?([10,15,20,30,60] as const).map(n=>[n+" s",String(n)] as const):
    step==="music"?t.musicChoices:step==="phrases"?t.phraseChoices:[];
 const answer=(raw:string)=>{
   if(disabled)return;
   const value=raw.trim().replace(/\s+/gu," ").slice(0,800);
   if(!value)return;
   const isTreeStep=VIDEO_CHAT_TREE_STEPS.includes(step);
   const displayed=isTreeStep?
     videoChatTreeOptions(draft,step,locale).find(row=>row.id===value)?.label:null;
   setInput("");addLine("user",displayed||value);
   const action=parseVideoChatAction(value,step);
   if(action==="confirm"){confirm();return;}
   if(action==="create"){start();return;}
   if(action==="open"){onOpenResult();return;}
   const reply=understandVideoChatReply(value,step) as {
     kind:string;reason?:string;requested?:number;goal?:string;
     targetStep?:string;direction?:number;audioRequested?:boolean;
     filters:Partial<Draft>;
   };
   const commit=(next:Draft,target:Step,feedback:string)=>{
     if(JSON.stringify(next)!==JSON.stringify(draft)){
       cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
       onInvalidate();
     }
     setDraft(next);
     if(next.goal!==draft.goal)onGoalChange(next.goal);
     if(next.categoryId!==draft.categoryId||next.topicId!==draft.topicId||
       next.scenarioId!==draft.scenarioId){
       setSymbolicAllowed(false);setAlternative(0);
     }
     setCaptureStarted(false);setCaptureObserved(false);
     setStep(target);addLine("assistant",feedback);
   };
   const withFilters=(base:Draft,filters:Partial<Draft>)=>{
     const next={...base,...filters};
     // Removing screen text also removes its formerly chosen phrase. Other
     // category/topic/scenario selections are preserved.
     if(filters.phrases===false){
       next.phraseId=null;next.phraseText=null;
     }else if(filters.phrases===true&&!base.phrases){
       next.phraseId=null;next.phraseText=null;
     }
     return next as Draft;
   };
   const nextQuestion=(next:Draft)=>nextVideoChatTreeStep(next) as Step;
   if(reply.kind==="reset"){reset();return;}
   if(reply.kind==="help"){addLine("assistant",t.chatHelp);return;}
   if(reply.kind==="repeat"){addLine("assistant",question(step));return;}
   if(reply.kind==="confirm"){confirm();return;}
   if(reply.kind==="create"){start();return;}
   if(reply.kind==="open"){onOpenResult();return;}
   if(reply.kind==="navigate"){
     const requested=(reply.targetStep||step) as Step;
     if(requested==="goal"){commit(draft,"category",t.category);return;}
     if(requested==="review"&&!draft.categoryId){
       addLine("assistant",t.category);return;
     }
     cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
     if(step==="ready"||step==="done")onInvalidate();
     setStep(requested);addLine("assistant",question(requested));return;
   }
   if(reply.kind==="auto"){autoComplete();return;}
   if(reply.kind==="alternate"){
     if(options.length<2){addLine("assistant",t.chatAlternateMissing);return;}
     onInvalidate();cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
     setAlternative(n=>(n+1)%options.length);setStep("review");addLine("assistant",t.review);
     return;
   }
   if(reply.kind==="audio"){onOpenAudio();addLine("assistant",t.chatAudio);return;}
   if(reply.kind==="skip"){
     if(step==="phrase"){
       const next={...draft,phrases:false,phraseId:null,phraseText:null} as Draft;
       const following=nextQuestion(next);
       commit(next,following,question(following));return;
     }
     if(isTreeStep){addLine("assistant",t.chatUnknown+" "+question(step));return;}
     if(step==="review"||step==="ready"||step==="done"){
       addLine("assistant",t.chatUnknown);return;
     }
     const themed=draft.topicId?getVideoGoalTopic(draft.topicId,locale):null;
     const defaults=suggestVideoChatDefaults(draft,
       (themed?.legacyVideoTheme||theme) as VideoTheme) as Draft;
     const next={...draft,[step]:defaults[step as keyof Draft]} as Draft;
     const following=nextQuestion(next);
     commit(next,following,question(following));return;
   }
   // Direct UI IDs, ordinals and contextual paraphrases select ONLY a real
   // child of the active parent. No unmatched free text becomes a scenario ID.
   if(isTreeStep){
     const chosen=recognizeVideoChatTreeOption(draft,step,value,locale) as Draft|null;
     if(chosen){
       const following=nextQuestion(chosen);
       const label=videoChatTreeOptions(draft,step,locale).find(o=>
         (step==="category"?o.id===chosen.categoryId:
          step==="topic"?o.id===chosen.topicId:
          step==="scenario"?o.id===chosen.scenarioId:
          step==="idea"?o.id===chosen.ideaId:o.id===chosen.phraseId))?.label||"";
       commit(chosen,following,t.selectedPrefix+label+". "+question(following));
       return;
     }
   }
   // Phrasing like "more confident, addressed to me, and shorter" changes
   // only curated phrase filters. Existing video mood and duration stay intact.
   const phraseStyle=recognizeVideoChatPhraseStyle(value,step);
   if(phraseStyle&&reply.filters.phrases!==false&&
     reply.kind!=="goal"&&reply.kind!=="append_goal"&&
     (step==="phrase"||step==="review"||step==="ready"||step==="done")){
     let next=withFilters(draft,reply.filters);
     for(const [key,val] of Object.entries(phraseStyle) as Array<["tone"|"speaker"|"length",string]>){
       const changed=changeVideoChatPhraseFilter(next,key,val) as Draft|null;
       if(changed)next=changed;
     }
     commit(next,"phrase",question("phrase"));return;
   }
   if(reply.kind==="relative_duration"){
     const lengths=[10,15,20,30,60] as const;
     const previous=draft.duration??30;
     const duration=reply.direction===-1?[...lengths].reverse().find(x=>x<previous):
       lengths.find(x=>x>previous);
     if(!duration){addLine("assistant",t.chatDuration);return;}
     const next={...draft,duration} as Draft;
     const following=isTreeStep?step:nextQuestion(next);
     commit(next,following,t.promptChanged+" "+question(following));return;
   }
   if(reply.kind==="clarify"&&reply.reason==="unsupported_duration"){
     addLine("assistant",t.chatDuration);return;
   }
   if(reply.kind==="clarify"&&reply.reason==="ambiguous"){
     addLine("assistant",t.chatAmbiguous);return;
   }
   // Resolve a new goal in the canonical taxonomy, keeping explicit media
   // settings. A new topic must drop stale story/idea/phrase selections.
   if(reply.kind==="goal"){
     const description=reply.goal||value;
     if(isTreeStep&&(step==="category"||step==="topic")){
       const base=step==="topic"?draft:initial("",locale);
       const resolved=resolveVideoChatTreeRequest(base,description,step,locale) as Draft|null;
       if(resolved){
         const next=withFilters(mergeVideoChatPreferences({...draft,...resolved},value) as Draft,reply.filters);
         const following=nextQuestion(next);
         commit(next,following,question(following));return;
       }
       if(step==="category"){
         const next=withFilters({...draft,goal:description},reply.filters);
         commit(next,"category",t.unknownGoal+" "+t.category);return;
       }
     }else{
       const fresh=initial(description,locale);
       const retained={...fresh,mood:draft.mood,aspect:draft.aspect,
         duration:draft.duration,music:draft.music,phrases:draft.phrases,
         tone:draft.tone,speaker:draft.speaker,length:draft.length} as Draft;
       const next=withFilters(retained,reply.filters);
       const following=nextQuestion(next);
       commit(next,following,question(following));return;
     }
   }
   if(reply.kind==="append_goal"){
     const next=withFilters({...draft,goal:[draft.goal,reply.goal]
       .filter(Boolean).join("; ").slice(0,800)} as Draft,reply.filters);
     const following=isTreeStep?step:nextQuestion(next);
     commit(next,following,question(following));return;
   }
   // Full text can provide several production options in one sentence. Do
   // not discard them simply because a story choice is currently pending.
   const directFilter=!isTreeStep&&["mood","aspect","duration","music","phrases"].includes(step)?
     parseVideoChatStepChoice(step,value):null;
   if(reply.kind==="edit"||reply.kind==="settings_only"||directFilter!==null){
     const picked=withFilters(mergeVideoChatPreferences(draft,value) as Draft,{
       ...(directFilter===null?{}:{[step]:directFilter}),...reply.filters,
     });
     const following=isTreeStep?step:nextQuestion(picked);
     commit(picked,following,question(following));
     if(reply.audioRequested){onOpenAudio();addLine("assistant",t.chatAudio);}
     return;
   }
   // The phrase input is a genuine user-authored line. Guard it using the
   // existing 96-character caption sanitizer, not a guessed catalog ID.
   if(step==="phrase"&&reply.kind==="clarify"&&
     !/^(?:да|нет|не знаю|не понял|yes|no|maybe|s[ií]|n[oó]|no s[eé])$/iu.test(value)){
     const custom=chooseCustomVideoChatPhrase(draft,value) as Draft|null;
     if(custom){const following=nextQuestion(custom);
       commit(custom,following,question(following));return;}
   }
   // A visitor can name a known topic at any point, not just while the
   // topic chips are visible. Validate against the single canonical taxonomy.
   if(step==="topic"&&reply.kind==="clarify"){
     const chosen=resolveVideoChatTreeRequest(draft,value,"topic",locale) as Draft|null;
     if(chosen){
       const next=withFilters({...draft,...chosen} as Draft,reply.filters);
       const following=nextQuestion(next);
       commit(next,following,question(following));return;
     }
   }
   if((step==="review"||step==="ready"||step==="done")&&reply.kind==="clarify"){
     const category=recognizeVideoChatTreeOption(initial("",locale),
       "category",value,locale) as Draft|null;
     if(category){
       const next=withFilters({...category,mood:draft.mood,aspect:draft.aspect,
         duration:draft.duration,music:draft.music,phrases:draft.phrases,
         tone:draft.tone,speaker:draft.speaker,length:draft.length} as Draft,reply.filters);
       const following=nextQuestion(next);
       commit(next,following,question(following));return;
     }
     const topic=resolveVideoChatTreeRequest(initial("",locale),
       value,"category",locale) as Draft|null;
     if(topic){
       const next=withFilters({...topic,mood:draft.mood,aspect:draft.aspect,
         duration:draft.duration,music:draft.music,phrases:draft.phrases,
         tone:draft.tone,speaker:draft.speaker,length:draft.length} as Draft,reply.filters);
       const following=nextQuestion(next);
       commit(next,following,question(following));return;
     }
   }
   if(step==="category"&&!isGenericVideoRequest(value)&&value.length>=3&&
     reply.kind!=="clarify"){
     const next=withFilters({...draft,goal:value} as Draft,reply.filters);
     commit(next,"category",t.unknownGoal+" "+t.category);return;
   }
   addLine("assistant",t.chatUnknown+" "+question(step));
 };
 const autoComplete=()=>{
   if(disabled)return;
   if(!draft.categoryId&&!draft.goal.trim()){
     addLine("assistant",t.category);return;
   }
   const tree=autocompleteVideoChatTree(draft,theme,locale) as Draft|null;
   if(!tree){addLine("assistant",t.error);return;}
   const matched=tree.topicId?getVideoGoalTopic(tree.topicId,locale):null;
   const next=suggestVideoChatDefaults(tree,
     (matched?.legacyVideoTheme||theme) as VideoTheme) as Draft;
   setDraft(next);
   if(next.goal!==draft.goal)onGoalChange(next.goal);
   setSymbolicAllowed(false);onInvalidate();
   setStep("review");addLine("assistant",t.review);
 };
 const reset=()=>{
   if(disabled)return;
   cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
   setDraft(initial("",locale));onGoalChange("");setStep("category");setSymbolicAllowed(false);
   aiAskedKeyRef.current="";setAiStatus("idle");setAiConsent(false);
   setAlternative(0);setCaptureStarted(false);setCaptureObserved(false);
   setLines([{id:++counter.current,role:"assistant",text:t.intro}]);setInput("");
 };
 const confirm=()=>{
   if(disabled||!executable||offerSymbolic)return;
   const ok=onConfirm({scenario:executable});
   if(!ok){addLine("assistant",t.blocked);return;}
   approvedPlanKeyRef.current=planKey;
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
         consent:true,locale,goal:goalForPlan,durationSeconds:executable.durationSeconds,
         aspect:executable.aspect,mood:executable.mood,
         music:executable.audio.trackId,phrases:executable.phrases,
         candidateSceneIds:executable.candidateSceneIds,
         excludedMotifs:executable.edit.excludedMotifs,
       }),
     });
     if(!response.ok)throw Error("VIDEO_PLAN_UNAVAILABLE");
     const payload:unknown=await response.json();
     if(controller.signal.aborted||!payload||typeof payload!=="object"||
       !("suggestion" in payload))return;
     const accepted=parseAiVideoCutSuggestion(payload.suggestion,{
       candidateSceneIds:executable.candidateSceneIds,
       durationSeconds:executable.durationSeconds,scenes,
       excludedMotifs:executable.edit.excludedMotifs,
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
   if(disabled||!canCreate||captureStarted)return;
   if(approvedPlanKeyRef.current!==planKey){setStep("review");onInvalidate();addLine("assistant",t.promptChanged);return;}
   const accepted=onCreate();
   if(accepted===false){addLine("assistant",t.blocked);return;}
   setCaptureObserved(false);setCaptureStarted(true);
 };
  return <section ref={windowRef} className={css.window} data-video-director-chat data-chat-step={step} aria-labelledby="video-director-chat-heading">
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
       {chosenNarrative?<div className={css.warning} role="note" data-chat-concept-unbound>
         <strong>{chosenNarrative.title}</strong><p>{t.conceptNote}</p>
         {draft.phraseText?<small>“{draft.phraseText}”</small>:null}
       </div>:null}
       <div className={css.storyTop}><Film size={19}/><strong>{selected.label[locale]}</strong></div>
       <div className={css.meta} data-executable-video-scenario={executable?.version}>
         {draft.duration} s · {draft.aspect==="portrait"?"9:16":draft.aspect==="square"?"1:1":"16:9"} · {draft.music==="none"?"Silent":draft.music} · 4 MP4 · {executable?.origin==="ai_suggestion_validated"?t.planAi:t.planLocal}
       </div>
       <div className={css.filterSummary} role="group" aria-label={t.edit}>
       {(["category","topic","scenario","idea","phrase"] as const).map(key=><button
          type="button" key={key} data-video-chat-edit-tree={key}
          disabled={disabled||captureStarted}
          onClick={()=>{cutAbortRef.current?.abort();setAiCut(null);setAiCutState("idle");
            onInvalidate();setStep(key);addLine("assistant",question(key));}}>
          <span>{t[key]}</span><strong>{key==="category"?draft.categoryId:
            key==="topic"?chosenTopic?.title:key==="scenario"?chosenNarrative?.title:
            key==="idea"?"✓":draft.phraseText?"✓":"—"}</strong>
        </button>)}
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
         <button type="button" className={css.primary} disabled={disabled} data-video-chat-confirm onClick={confirm}><Check size={17}/>{t.confirm}</button>
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
           {options.length>1?<button type="button" onClick={()=>{setAlternative(n=>(n+1)%options.length);setStep("review");}}>{t.alternate}</button>:null}
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
   {step!=="review"&&step!=="ready"&&step!=="done"?<div className={css.autoChoices}>
     <button type="button" disabled={disabled} data-video-chat-auto onClick={autoComplete}>
       <Sparkles size={15}/>{t.auto}
     </button>
   </div>:null}
   {step==="phrase"?<div className={css.phraseFilters} data-video-chat-phrase-filters>
      {(["tone","speaker","length"] as const).map(key=><fieldset key={key}>
        <legend>{t[key]}</legend><div>
          {(key==="tone"?["gentle","confident","grounded","inspiring"]:
            key==="speaker"?["self","support"]:["short","extended"]).map(value=><button
              key={value} type="button" disabled={disabled}
              data-chat-phrase-filter={key+"-"+value} aria-pressed={draft[key]===value}
              onClick={()=>{const changed=changeVideoChatPhraseFilter(draft,key,value) as Draft|null;
                if(changed){setDraft(changed);onInvalidate();}}}>
              {key==="tone"?t.toneNames[value as keyof typeof t.toneNames]:
                key==="speaker"?t.speakerNames[value as keyof typeof t.speakerNames]:
                  t.lengthNames[value as keyof typeof t.lengthNames]}
            </button>)}
        </div>
      </fieldset>)}
      <button type="button" className={css.skipPhrase} disabled={disabled}
        data-video-chat-skip-phrase onClick={()=>{
          const next={...draft,phrases:false,phraseId:null,phraseText:null};
          setDraft(next);onInvalidate();
          const following=nextVideoChatTreeStep(next) as Step;
          setStep(following);addLine("assistant",question(following));
        }}>{t.skipPhrase}</button>
    </div>:null}
   {choices.length>0?<div className={css.choices} role="group" aria-label={question(step)}>
     {choices.map(([label,value])=><button type="button" key={value} disabled={disabled}
        data-video-chat-tree-choice={VIDEO_CHAT_TREE_STEPS.includes(step)?value:undefined}
        onClick={()=>answer(value===label?label:value)}>{label}</button>)}
   </div>:null}
   <form className={css.composer} onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();answer(input);}}>
     <button className={css.composerTool} type="button" onClick={onPickPhoto} disabled={disabled} aria-label={t.photo} title={t.photo}><ImagePlus size={21}/></button>
     <textarea rows={2} value={input} onChange={(event:ChangeEvent<HTMLTextAreaElement>)=>setInput(event.currentTarget.value)}
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