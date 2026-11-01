"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight,Check,Film,ImagePlus,Music2,Send,SlidersHorizontal,Sparkles} from "lucide-react";
import {recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {allocateAdaptiveFilmTimeline} from "@/lib/mandala/free-film-timeline.mjs";
import {mergeVideoChatPreferences,nextVideoChatStep,parseVideoChatIntent,parseVideoChatStepChoice} from "@/lib/mandala/video-chat-intent.mjs";
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
type Scene={id:string;theme:string;status:string;media:string;video:string;poster?:string;label:Record<PublicLocale,string>;description:Record<PublicLocale,string>;categories:readonly string[];tags:readonly string[];motifs:readonly string[]};
type Props={
 locale:PublicLocale;goal:string;theme:VideoTheme;
 presets:readonly Preset[];scenes:readonly Scene[];disabled:boolean;canCreate:boolean;
 rendering:boolean;renderProgress:number;resultReady:boolean;resultFailed:boolean;
 onGoalChange:(text:string)=>void;
 onConfirm:(selection:{presetId:string;duration:Length;aspect:Aspect;music:Music;phrases:boolean;mood:Mood})=>boolean;
 onCreate:()=>void;onOpenResult:()=>void;onOpenEditor:()=>void;onPickPhoto:()=>void;onOpenAudio:()=>void;
};
const copy={
 ru:{title:"AI-видеорежиссёр",subtitle:"Подбираю реальные видеосюжеты · бесплатно",intro:"Привет! Какое видео вы хотите создать? Опишите идею или выберите тему — я помогу настроить ролик.",
  goal:"Какое видео вы представляете? Можно написать одной фразой.",mood:"Какая атмосфера нужна — мягкая или динамичная?",aspect:"Где будете смотреть ролик? Выберите формат.",duration:"Какой длины сделать ролик?",music:"Какую музыку добавить?",phrases:"Добавить поддерживающие фразы на экран?",review:"Я подобрал сюжет по вашим ответам. Проверьте сцены и параметры перед созданием.",ready:"Сценарий утверждён. Можно запускать запись настоящего видео.",
  done:"Видео готово. Откройте его для просмотра, скачивания и отправки.",error:"Не получилось распознать ответ. Выберите вариант ниже или уточните словами.",
  unsupported:"Для указанного конкретного объекта пока нет подходящего реального MP4. Могу предложить символический монтаж из доступных видеосцен — он не будет изображать запрошенный объект.",
  missing:"Подходящий монтаж из разрешённых сцен не найден. Измените тему или откройте редактор.", symbolic:"Предложить метафорический сюжет",retryGoal:"Изменить запрос",alternate:"Другой сюжет",confirm:"Подтвердить сценарий",create:"Создать видео",creating:"Собираем видео на устройстве…",loading:"Загружаем выбранные видеосцены…",open:"Открыть готовое видео",editor:"Расширенный редактор",startAgain:"Новый ролик",edit:"Изменить настройки",note:"Видео собирается из разрешённых MP4, не из новых AI-кадров. Ваш текст не передаётся внешним AI-сервисам.",
  placeholder:"Напишите, что хотите создать или изменить…",send:"Отправить",photo:"Добавить своё фото",audio:"Добавить голос или звук",promptChanged:"Обновил параметры. Проверьте сценарий снова.",
  blocked:"Результат не прошёл проверку или запись не удалась. Воспользуйтесь настройками и повторите создание.",stages:["Начало","Погружение","Развитие","Завершение"],
  themeChips:["Хочу больше спокойствия","Любовь и близость","Энергия и бодрость","Уверенность в себе"],
  moodChoices:[["Мягкая","slow"],["Динамичная","dynamic"]],aspectChoices:[["Вертикальный 9:16","portrait"],["Горизонтальный 16:9","landscape"],["Квадрат 1:1","square"]],
  musicChoices:[["Нежная музыка","love"],["Спокойная","meditation"],["Гармония","harmony"],["Без музыки","none"]],phraseChoices:[["Да, добавить","yes"],["Нет","no"]]},
 en:{title:"AI Video Director",subtitle:"Real approved footage · free",intro:"Hi! What video would you like to create? Describe it or choose a topic; I'll guide the settings.",
  goal:"What kind of video do you imagine? Describe it briefly.",mood:"What mood should it have — gentle or dynamic?",aspect:"Where will you use the video? Choose a format.",duration:"How long should it be?",music:"What soundtrack would you like?",phrases:"Add supportive phrases to the screen?",review:"Here's a story assembled from available footage. Review it before creating.",ready:"Story approved. You can now create the real video.",
  done:"Your video is ready. Open it to play, download or share.",error:"I couldn't interpret that choice. Try the options below or another phrase.",
  unsupported:"That specific subject is not available in our verified MP4 catalog. I can propose a symbolic story using existing footage, but it won't show that subject.",
  missing:"No compatible licensed clips were found. Change the goal or open the editor.",symbolic:"Use a symbolic story",retryGoal:"Change idea",alternate:"Another story",confirm:"Confirm story",create:"Create video",creating:"Recording video on this device…",loading:"Loading the selected video clips…",open:"Open finished video",editor:"Advanced editor",startAgain:"New video",edit:"Change settings",note:"Uses approved existing MP4 footage, not newly AI-generated frames. Your text is not sent to an external AI service.",
  placeholder:"Describe a video or tell me what to change…",send:"Send",photo:"Add my photo",audio:"Add my voice or audio",promptChanged:"Updated the settings. Please confirm the story again.",
  blocked:"Recording or playback verification failed. Adjust settings and retry.",stages:["Opening","Arriving","Exploring","Closing"],
  themeChips:["I want more calm","Love and connection","Energy and vitality","Confidence and focus"],
  moodChoices:[["Gentle","slow"],["Dynamic","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Landscape 16:9","landscape"],["Square 1:1","square"]],
  musicChoices:[["Warm melody","love"],["Meditative","meditation"],["Harmony","harmony"],["Silent","none"]],phraseChoices:[["Yes, add them","yes"],["No","no"]]},
 es:{title:"Director de vídeo IA",subtitle:"Escenas reales autorizadas · gratis",intro:"¡Hola! ¿Qué vídeo quieres crear? Describe tu idea o elige un tema; te guiaré por los ajustes.",
  goal:"¿Qué tipo de vídeo imaginas? Descríbelo en una frase.",mood:"¿Qué ambiente buscas: suave o dinámico?",aspect:"¿Dónde usarás el vídeo? Elige el formato.",duration:"¿Qué duración prefieres?",music:"¿Qué música prefieres?",phrases:"¿Añadir frases de apoyo en pantalla?",review:"Encontré una historia con escenas disponibles. Comprueba los ajustes antes de crear.",ready:"Historia aprobada. Ya puedes crear el vídeo real.",
  done:"El vídeo está listo. Ábrelo para ver, guardar o compartir.",error:"No entendí esa elección. Prueba las opciones o escribe de otra manera.",
  unsupported:"Ese objeto específico no está en el catálogo de MP4. Puedo proponer una historia simbólica, pero no mostrará ese objeto.",
  missing:"No se encontraron escenas autorizadas compatibles. Cambia el tema o usa el editor.",symbolic:"Usar una historia simbólica",retryGoal:"Cambiar idea",alternate:"Otra historia",confirm:"Confirmar historia",create:"Crear vídeo",creating:"Grabando vídeo en este dispositivo…",loading:"Cargando las escenas…",open:"Abrir vídeo terminado",editor:"Editor avanzado",startAgain:"Nuevo vídeo",edit:"Cambiar ajustes",note:"Montaje de MP4 autorizados, no fotogramas nuevos generados por IA. Tu texto no se envía a un servicio IA externo.",
  placeholder:"Describe el vídeo o lo que quieres cambiar…",send:"Enviar",photo:"Añadir mi foto",audio:"Añadir voz o audio",promptChanged:"Ajustes actualizados. Confirma la historia otra vez.",
  blocked:"Falló la grabación o verificación. Ajusta los parámetros e inténtalo otra vez.",stages:["Inicio","Entrada","Desarrollo","Cierre"],
  themeChips:["Quiero más calma","Amor y conexión","Energía y vitalidad","Confianza y enfoque"],
  moodChoices:[["Suave","slow"],["Dinámico","dynamic"]],aspectChoices:[["Vertical 9:16","portrait"],["Horizontal 16:9","landscape"],["Cuadrado 1:1","square"]],
  musicChoices:[["Melodía suave","love"],["Meditación","meditation"],["Armonía","harmony"],["Sin música","none"]],phraseChoices:[["Sí, añadir","yes"],["No","no"]]},
} as const;
const initial=(goal:string):Draft=>({goal:goal.slice(0,160),mood:null,aspect:null,duration:null,music:null,phrases:null});

export function MandalaVideoDirectorChat({locale,goal,theme,presets,scenes,disabled,canCreate,
 rendering,renderProgress,resultReady,resultFailed,onGoalChange,onConfirm,onCreate,onOpenResult,
 onOpenEditor,onPickPhoto,onOpenAudio}:Props){
 const t=copy[locale];
 const [draft,setDraft]=useState<Draft>(()=>initial(goal));
 const [step,setStep]=useState<Step>(()=>nextVideoChatStep(initial(goal)) as Step);
 const [lines,setLines]=useState<ChatLine[]>([{id:0,role:"assistant",text:t.intro}]);
 const [input,setInput]=useState("");
 const [symbolicAllowed,setSymbolicAllowed]=useState(false);
 const [alternative,setAlternative]=useState(0);
 const [captureStarted,setCaptureStarted]=useState(false);
 const [captureObserved,setCaptureObserved]=useState(false);
 const counter=useRef(0);
 const threadRef=useRef<HTMLDivElement>(null);
 const windowRef=useRef<HTMLElement>(null);
 const addLine=(role:ChatLine["role"],text:string)=>{
   setLines(existing=>[...existing.slice(-34),{id:++counter.current,role,text}]);
 };
 const question=(next:Step)=>next==="done"?t.done:next==="ready"?t.ready:t[next];
 // The same client-local goal field is edited by the existing Studio controls.
 useEffect(()=>{
   if(goal.trim()===draft.goal.trim()||!goal.trim())return;
   setDraft(previous=>({...previous,goal:goal.slice(0,160)}));
   setSymbolicAllowed(false);setAlternative(0);
   setStep(previous=>previous==="ready"||previous==="done"?"review":previous);
 // Avoid reacting to every local answer: identical text does not trigger changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[goal]);
 useEffect(()=>{
   const frame=windowRef.current;
   if(!frame)return;
   let raf=0;
   const update=()=>{
     const focus=frame.contains(document.activeElement)&&document.activeElement?.tagName==="INPUT";
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
 useEffect(()=>{if(captureStarted&&rendering)setCaptureObserved(true);},[captureStarted,rendering]);
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
 const durations=selected&&draft.duration?allocateAdaptiveFilmTimeline(draft.duration,selected.clips).map(item=>item.durationSeconds):[];
 const needSymbolic=Boolean(proposal?.requiresNewAiFootage||parseVideoChatIntent(draft.goal).specificVisual);
 const reviewAvailable=Boolean(selected&&draft.mood&&draft.aspect&&draft.duration&&draft.music!==null&&draft.phrases!==null);
 const offerSymbolic=needSymbolic&&!symbolicAllowed;
 const choices:readonly (readonly [string,string])[]=step==="goal"?t.themeChips.map(x=>[x,x] as const):
   step==="mood"?t.moodChoices:step==="aspect"?t.aspectChoices:
   step==="duration"?([10,15,20,30,60] as const).map(n=>[n+" s",String(n)] as const):
   step==="music"?t.musicChoices:step==="phrases"?t.phraseChoices:[];
 const answer=(raw:string)=>{
   if(disabled)return;
   const value=raw.trim().slice(0,160);
   if(!value)return;
   setInput("");addLine("user",value);
   if(step==="goal"){
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
     const extracted=parseVideoChatIntent(value);
     const hasChoice=Boolean(extracted.aspect||extracted.duration||extracted.mood||extracted.music||extracted.phrases!==null);
     if(!hasChoice){
       const next={...initial(value),...{goal:value}};
       setDraft(next);onGoalChange(value);setSymbolicAllowed(false);setAlternative(0);
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
   if(parsed===null){addLine("assistant",t.error);return;}
   const next={...draft,[step]:parsed} as Draft;
   setDraft(next);
   const following=nextVideoChatStep(next) as Step;
   setStep(following);addLine("assistant",question(following));
 };
 const reset=()=>{
   if(disabled)return;
   setDraft(initial(""));onGoalChange("");setStep("goal");setSymbolicAllowed(false);
   setAlternative(0);setCaptureStarted(false);setCaptureObserved(false);
   setLines([{id:++counter.current,role:"assistant",text:t.intro}]);setInput("");
 };
 const confirm=()=>{
   if(disabled||!reviewAvailable||!selected||!draft.duration||!draft.aspect||!draft.mood||draft.music===null||draft.phrases===null||offerSymbolic)return;
   const ok=onConfirm({presetId:selected.id,duration:draft.duration,aspect:draft.aspect,music:draft.music,phrases:draft.phrases,mood:draft.mood});
   if(!ok){addLine("assistant",t.blocked);return;}
   setStep("ready");addLine("assistant",t.ready);setCaptureStarted(false);setCaptureObserved(false);
 };
 const start=()=>{
   if(disabled||!canCreate||captureStarted)return;
   setCaptureObserved(false);setCaptureStarted(true);onCreate();
 };
  return <section ref={windowRef} className={css.window} data-video-director-chat data-chat-step={step} aria-labelledby="video-director-chat-heading">
   <header className={css.heading}>
     <span className={css.avatar} aria-hidden="true"><Sparkles size={20}/></span>
     <span className={css.titleGroup}><strong id="video-director-chat-heading">{t.title}</strong><small>{t.subtitle}</small></span>
     <button type="button" className={css.iconButton} onClick={onOpenEditor} aria-label={t.editor} title={t.editor}><SlidersHorizontal size={20}/></button>
   </header>
   <div ref={threadRef} className={css.thread} role="log" aria-live="polite" aria-relevant="additions text">
     {lines.map(line=><div key={line.id} className={line.role==="assistant"?css.assistant:css.user}>
       {line.text}
     </div>)}
     {(step==="review"||step==="ready"||step==="done")&&selected&&reviewAvailable?<div className={css.storyCard} data-video-chat-storyboard>
       <div className={css.storyTop}><Film size={19}/><strong>{selected.label[locale]}</strong></div>
       <div className={css.meta}>{draft.duration} s · {draft.aspect==="portrait"?"9:16":draft.aspect==="square"?"1:1":"16:9"} · {draft.music==="none"?"Silent":draft.music} · 4 MP4</div>
       <div className={css.shots}>
         {selected.clips.map((id,index)=>{
           const source=sourceById.get(id);
           return <div key={id} className={css.shot}>
             {source?.poster?<img alt="" src={source.poster} loading="lazy"/>:<span className={css.noPoster}><Film size={19}/></span>}
             <span><b>{index+1}. {t.stages[index]} · {durations[index]} s</b><small>{source?.label[locale]||id}</small></span>
           </div>;
         })}
       </div>
       {offerSymbolic?<div className={css.warning} role="alert">
         <p>{t.unsupported}</p><button type="button" disabled={disabled} onClick={()=>setSymbolicAllowed(true)}>{t.symbolic}</button>
         <button type="button" disabled={disabled} onClick={reset}>{t.retryGoal}</button>
       </div>:null}
       {step==="review"&&!offerSymbolic?<div className={css.storyActions}>
         <button type="button" className={css.primary} disabled={disabled} data-video-chat-confirm onClick={confirm}><Check size={17}/>{t.confirm}</button>
         {options.length>1?<button type="button" className={css.secondary} disabled={disabled} onClick={()=>setAlternative(n=>(n+1)%options.length)}>{t.alternate}</button>:null}
       </div>:null}
       {step==="ready"?<div className={css.storyActions}>
         <button type="button" className={css.primary} disabled={!canCreate||disabled||captureStarted} data-video-chat-create onClick={start}>
           <Film size={17}/>{t.create}
         </button>
         {!canCreate&&!disabled?<small className={css.loading}>{t.loading}</small>:null}
       </div>:null}
       {step==="done"?<button type="button" className={css.primary} onClick={onOpenResult} data-video-chat-result><ArrowRight size={18}/>{t.open}</button>:null}
     </div>:null}
     {(step==="review"||step==="ready")&&!selected?<div className={css.warning} role="alert"><p>{t.missing}</p><button type="button" onClick={reset}>{t.retryGoal}</button></div>:null}
     {captureStarted?<div className={css.status} role="status">
       <span className={css.pulse}/>{rendering?t.creating:t.loading}
       {rendering&&renderProgress>0?<small>{Math.round(renderProgress)}%</small>:null}
     </div>:null}
     {step==="done"?<div className={css.finishActions}>
       <button type="button" className={css.secondary} onClick={reset}>{t.startAgain}</button>
       <button type="button" className={css.secondary} onClick={()=>setStep("review")}>{t.edit}</button>
     </div>:null}
   </div>
   {choices.length>0?<div className={css.choices} role="group" aria-label={question(step)}>
     {choices.map(([label,value])=><button type="button" key={value} disabled={disabled} onClick={()=>answer(value===label?label:value)}>{label}</button>)}
   </div>:null}
   <form className={css.composer} onSubmit={event=>{event.preventDefault();answer(input);}}>
     <button className={css.composerTool} type="button" onClick={onPickPhoto} disabled={disabled} aria-label={t.photo} title={t.photo}><ImagePlus size={21}/></button>
     <input value={input} onChange={event=>setInput(event.currentTarget.value)} maxLength={160} disabled={disabled}
       autoComplete="off" aria-label={t.placeholder} placeholder={t.placeholder}/>
     <button className={css.send} type="submit" aria-label={t.send} disabled={disabled||!input.trim()}><Send size={19}/></button>
   </form>
   <div className={css.foot}><span>{t.note}</span><button type="button" onClick={onOpenAudio} disabled={disabled}><Music2 size={14}/>{t.audio}</button></div>
 </section>;
}