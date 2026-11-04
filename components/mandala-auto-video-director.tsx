"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {Check,Sparkles,Target,Play,ArrowRight,Sun,Heart,Sprout,BriefcaseBusiness,Leaf,Zap,Coins,Moon,Star} from "lucide-react";
import {AUTO_VIDEO_GOALS,recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {allocateAdaptiveFilmTimeline,shiftAdaptiveFilmBoundary} from "@/lib/mandala/free-film-timeline.mjs";
import {STAGE_CAPTION_LIMIT} from "@/lib/mandala/stage-caption-track.mjs";
import {montageReplacementOptions} from "@/lib/mandala/video-montage-sources.mjs";
import {recommendPromptShotPlan} from "@/lib/mandala/prompt-shot-director.mjs";
import {recommendScenarioMelodies} from "@/lib/mandala/scenario-soundtracks.mjs";
import {scenarioAudioTracks} from "@/lib/mandala/scenario-audio-catalog.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

type Preset={
  id:string;theme:VideoTheme;
  label:Record<PublicLocale,string>;clips:readonly string[];focusTags?:readonly string[];
};
type SceneMeta={id:string;theme:string;collection:string;status:string;media:string;
  rightsReference:{kind:string};pace?:string;
  video:string;poster?:string;label:Record<PublicLocale,string>;description:Record<PublicLocale,string>;
  categories:readonly string[];tags:readonly string[];motifs:readonly string[]};
type Props={
  locale:PublicLocale;goal:string;theme:VideoTheme;aspect:"landscape"|"portrait"|"square";presets:readonly Preset[];
  scenes:readonly SceneMeta[];
  disabled:boolean;activePresetId:string|null;
  clipLabel:(id:string)=>string;
  audioAttached?:boolean;audioTrackLabel?:string;onOpenAudio?:()=>void;
  audioTrackId?:string|null;onPickAudio?:(id:string)=>void;
  onGoalChange:(value:string)=>void;
  onCategoryChange?:(theme:VideoTheme)=>void;
  onContinue?:()=>void;onClarify?:()=>void;helpOpen?:boolean;
  onShowAll?:()=>void;
  onInvalidate?:()=>void;
  onApply:(presetId:string,durationSeconds:10|15|20|30|60,
    edit?:{clipIds:readonly string[];durationSecondsByStage:readonly number[];captionTexts:readonly string[];excludedMotifs?:readonly string[]})=>void|boolean;
  onCreate?:()=>void;canCreate?:boolean;rendering?:boolean;createFeedback?:string;
};
const copy={
 ru:{
   title:"3. Выберите ваш сценарий (4 варианта)",
   intro:"Четыре варианта из проверенных видео по вашей цели",
   goalsTitle:"Что хотелось бы изменить?",
   placeholder:"Например: хочу меньше тревожиться и ощущать спокойствие",
   suggest:"Подобрать сценарий",reason:"Мой сценарий",uncertain:"Проверьте тему: это предварительная рекомендация.",
   duration:"Длительность",variants:"Выберите один из сценариев",storyboard:"Четыре сцены выбранного сценария",topic:"Направление",edit:"Изменить детали (необязательно)",
   stages:["Начало","Погружение","Развитие","Завершение"],
   source:"4 настоящих MP4 · бесплатный монтаж",
   accept:"Подтвердить сценарий",applied:"Сценарий выбран — нажмите «Создать видео».",
   warning:"Новых персонажей и кадров здесь не генерируем: предложен символический монтаж.",
   empty:"Нет подходящего готового сюжета с такими ограничениями. Уточните цель или используйте расширенный редактор.",
   safety:"Образная практика для поддержки, не медицинское или психотерапевтическое лечение.",
   input:"Или напишите свою цель",clarify:"Уточнить цель",refine:"Что именно хотите почувствовать или изменить?",addRefine:"Добавить к цели",moreGoals:"Ещё цели",create:"Создать выбранное видео",waiting:"Создаём видео…",blocked:"Проверьте выбранный звук и разрешения для создания видео.",
   selectedGoal:"Выбранная цель",
   promptShotNotice:"Видеосцены подобраны отдельно под вашу цель из существующей библиотеки — без платной генерации.",
   promptShotPartial:"Некоторые образы из запроса не найдены. Проверьте кадры перед подтверждением.",
   melodyOptions:"Четыре мелодии для вашего сценария",melodyHint:"Выбранная мелодия включается в видео; звук можно отключить.",
   captionTrack:"Текст по сценам",captionHint:"Необязательно: одна надпись на каждом этапе. Текст показывается в вашем видео, а не отправляется в ИИ.",soundTrack:"Музыка и голос",soundMissing:"Звук не прикреплён",soundSettings:"Настроить звук",
   timeline:"Монтажная шкала",openMontage:"Открыть монтаж (необязательно)",montageHelp:"Измените порядок и длительность сцен, затем подтвердите сценарий.",reorder:"Порядок сцены",less:"Укоротить",more:"Удлинить",audioHint:"Музыка, голос и фразы настраиваются в существующих разделах видеостудии.",replaceScene:"Заменить клип",replacementHint:"Доступны только проверенные видео из каталога.",
 },
 en:{
   title:"3. Choose your story (4 options)",
   intro:"Four licensed film options based on your goal",
   goalsTitle:"What would you like to change?",
   placeholder:"For example: I want less anxiety and more calm",
   suggest:"Suggest my film",reason:"Suggested film",uncertain:"Please check this provisional topic.",
   duration:"Duration",variants:"Choose a story",storyboard:"Four shots in the chosen story",topic:"Topic",edit:"Adjust details (optional)",
   stages:["Opening","Arriving","Exploring","Closing"],
   source:"4 genuine MP4 clips · free compilation",
   accept:"Confirm this story",applied:"Story selected — choose Create video.",
   warning:"New characters and footage are not generated here; this is a symbolic montage.",
   empty:"No ready-made story matches those exclusions. Refine your goal or use the advanced editor.",
   safety:"Supportive imagery, not medical or psychotherapeutic treatment.",
   input:"Or write your own goal",clarify:"Refine goal",refine:"What would you like to feel or change?",addRefine:"Add to my goal",moreGoals:"More goals",create:"Create selected video",waiting:"Creating video…",blocked:"Check your selected audio and permissions before creating video.",
   selectedGoal:"Selected goal",
   promptShotNotice:"Each shot was selected from the existing film library for your goal; no paid generation.",
   promptShotPartial:"Some requested imagery is unavailable. Please check each shot before confirming.",
   melodyOptions:"Four melodies for your story",melodyHint:"Selected music is included in the video; you can change or mute it.",
   captionTrack:"Scene captions",captionHint:"Optional: one caption per stage. Your text appears in the video and is not sent to AI.",soundTrack:"Music and voice",soundMissing:"No audio attached",soundSettings:"Edit sound",
   timeline:"Montage timeline",openMontage:"Open montage (optional)",montageHelp:"Adjust shot order and durations, then confirm the storyboard.",reorder:"Reorder shot",less:"Shorten",more:"Lengthen",audioHint:"Music, voice and captions remain in the existing studio sections.",replaceScene:"Replace clip",replacementHint:"Only licensed catalogue videos are available.",
 },
 es:{
   title:"3. Elige tu historia (4 opciones)",
   intro:"Cuatro películas con licencia adaptadas a tu objetivo",
   goalsTitle:"¿Qué te gustaría cambiar?",
   placeholder:"Por ejemplo: quiero menos ansiedad y más calma",
   suggest:"Proponer vídeo",reason:"Vídeo sugerido",uncertain:"Confirma que la temática propuesta es correcta.",
   duration:"Duración",variants:"Elige una historia",storyboard:"Cuatro escenas de la historia elegida",topic:"Tema",edit:"Ajustar detalles (opcional)",
   stages:["Inicio","Llegada","Desarrollo","Cierre"],
   source:"4 clips MP4 reales · montaje gratuito",
   accept:"Confirmar esta historia",applied:"Historia elegida; pulsa Crear vídeo.",
   warning:"No se generan personajes ni escenas nuevas: es un montaje simbólico.",
   empty:"Ningún montaje coincide con estas restricciones. Ajusta el objetivo o usa el editor avanzado.",
   safety:"Imágenes de apoyo, no un tratamiento médico ni psicoterapéutico.",
   input:"O escribe tu objetivo",clarify:"Precisar objetivo",refine:"¿Qué te gustaría sentir o cambiar?",addRefine:"Añadir al objetivo",moreGoals:"Más objetivos",create:"Crear vídeo seleccionado",waiting:"Creando vídeo…",blocked:"Comprueba el audio y los permisos para crear el vídeo.",
   selectedGoal:"Objetivo elegido",
   promptShotNotice:"Cada escena se seleccionó de la biblioteca existente según tu objetivo, sin generación de pago.",
   promptShotPartial:"Algunas imágenes solicitadas no están disponibles. Revisa las escenas antes de confirmar.",
   melodyOptions:"Cuatro melodías para tu historia",melodyHint:"La melodía elegida se incluye en el vídeo; puedes cambiarla o silenciarla.",
   captionTrack:"Texto por escena",captionHint:"Opcional: un texto por etapa. Se muestra en el vídeo, sin enviarlo a IA.",soundTrack:"Música y voz",soundMissing:"Sin audio adjunto",soundSettings:"Ajustar audio",
   timeline:"Línea de montaje",openMontage:"Abrir montaje (opcional)",montageHelp:"Cambia el orden y la duración; después confirma el guion.",reorder:"Ordenar escena",less:"Acortar",more:"Alargar",audioHint:"Música, voz y frases se ajustan en las secciones actuales.",replaceScene:"Cambiar clip",replacementHint:"Solo están disponibles vídeos aprobados del catálogo.",
 }
} as const;
const videoGoalCategories=[
 {id:"strength",theme:"energy",poster:"clear-morning",Icon:Zap,
   label:{ru:"Сила",en:"Strength",es:"Fuerza"},
   fullLabel:{ru:"Поддержка силы",en:"Strength & energy",es:"Fuerza y energía"}},
 {id:"calm",theme:"health",poster:"gentle-falls",Icon:Leaf,
   label:{ru:"Антистресс",en:"Calm",es:"Calma"},
   fullLabel:{ru:"Антистресс и расслабление",en:"Stress relief & calm",es:"Calma y descanso"}},
 {id:"love",theme:"relationships",poster:"partners",Icon:Heart,
   label:{ru:"Любовь",en:"Love",es:"Amor"},
   fullLabel:{ru:"Гармония и любовь",en:"Harmony & love",es:"Armonía y amor"}},
 {id:"possibilities",theme:"money",poster:"wealth-sunrise",Icon:Coins,
   label:{ru:"Деньги",en:"Money",es:"Dinero"},
   fullLabel:{ru:"Деньги и возможности",en:"Money & opportunities",es:"Dinero y oportunidades"}},
 {id:"growth",theme:"goals",poster:"clear-morning",Icon:Sparkles,
   label:{ru:"Развитие",en:"Growth",es:"Crecer"},
   fullLabel:{ru:"Развитие и новые возможности",en:"Personal growth",es:"Desarrollo personal"}}
] as const;
const popularTopicOrder={
 strength:["confidence","connection","fresh-start","stability","calm","vitality"],
 calm:["calm","vitality","confidence","fresh-start","connection","stability"],
 love:["connection","fresh-start","confidence","calm","stability","vitality"],
 possibilities:["stability","confidence","vitality","fresh-start","connection","calm"],
 growth:["fresh-start","confidence","vitality","stability","connection","calm"]
} as const;
const popularTopicCopy={
 ru:{confidence:"Обрести уверенность",connection:"Больше близости",
   "fresh-start":"Начать новый этап",stability:"Опора в работе",
   calm:"Спокойствие и сон",vitality:"Энергия и сила"},
 en:{confidence:"Build confidence",connection:"More closeness",
   "fresh-start":"Start a new chapter",stability:"Support at work",
   calm:"Calm and sleep",vitality:"Energy and strength"},
 es:{confidence:"Ganar confianza",connection:"Más cercanía",
   "fresh-start":"Empezar nueva etapa",stability:"Apoyo en el trabajo",
   calm:"Calma y sueño",vitality:"Energía y fuerza"}
} as const;
const allowedDurations=[10,15,20,30,60] as const;
const allThemes=["energy","money","relationships","goals","life","health"] as const;
const themeLabels={
 ru:{energy:"Энергия",money:"Работа и деньги",relationships:"Отношения",goals:"Уверенность",life:"Развитие",health:"Спокойствие"},
 en:{energy:"Energy",money:"Work and money",relationships:"Relationships",goals:"Confidence",life:"Growth",health:"Calm"},
 es:{energy:"Energía",money:"Trabajo y dinero",relationships:"Relaciones",goals:"Confianza",life:"Desarrollo",health:"Calma"},
} as const;

export function MandalaAutoVideoDirector({
 locale,goal,theme,aspect,presets,scenes,disabled,activePresetId,clipLabel,
 audioAttached=false,audioTrackLabel="",audioTrackId=null,onPickAudio,onOpenAudio,onGoalChange,onCategoryChange,onContinue,onClarify,helpOpen=false,onShowAll,onInvalidate,onApply,onCreate,canCreate=false,rendering=false,createFeedback=""
}:Props){
 const t=copy[locale];
 // A licensed four-shot sample is visible before any click; no recording begins automatically.
 const [proposal,setProposal]=useState<ReturnType<typeof recommendAutoVideo>|null>(()=>
   recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
 const [proposalContext,setProposalContext]=useState<{goal:string;theme:VideoTheme}|null>({goal,theme});
 const [overrideId,setOverrideId]=useState<string|null>(null);
 const [seconds,setSeconds]=useState<10|15|20|30|60|null>(null);
 const [selectedGoalId,setSelectedGoalId]=useState<string|null>(null);
 const [selectedGoalIds,setSelectedGoalIds]=useState<string[]>([]);
 const [subcategoriesOpen,setSubcategoriesOpen]=useState(true);
 const [selectedCategoryId,setSelectedCategoryId]=useState<keyof typeof popularTopicOrder>(
   ()=>videoGoalCategories.find(item=>item.theme===theme)?.id ?? "strength");
 const [goalTarget,setGoalTarget]=useState<HTMLElement|null>(null);
 const [topicTarget,setTopicTarget]=useState<HTMLElement|null>(null);
 const [requestTarget,setRequestTarget]=useState<HTMLElement|null>(null);
 const [profileTarget,setProfileTarget]=useState<HTMLElement|null>(null);
 const [profileMode,setProfileMode]=useState<"short"|"extended"|null>(null);
 const [profileCategory,setProfileCategory]=useState<keyof typeof popularTopicOrder>("strength");
 const [profileFocus,setProfileFocus]=useState<keyof typeof popularTopicCopy.ru>("confidence");
 const [profileDetails,setProfileDetails]=useState("");
 const [refineOpen,setRefineOpen]=useState(false);
 const [refineText,setRefineText]=useState("");
 const [timelineEdits,setTimelineEdits]=useState<{
   presetId:string;totalSeconds:number;clipIds:string[];durations:number[];captions:string[];
 }|null>(null);
 const [confirmedTimelineKey,setConfirmedTimelineKey]=useState<string|null>(null);
 useEffect(()=>{
   setGoalTarget(document.querySelector<HTMLElement>("[data-video-director-goal-controls]"));
   setTopicTarget(document.querySelector<HTMLElement>("[data-video-director-topic-controls]"));
   setRequestTarget(document.querySelector<HTMLElement>("[data-video-request-prompt]"));
   setProfileTarget(document.querySelector<HTMLElement>("[data-video-profile-picker]"));
 },[]);
 const selectedGoal=AUTO_VIDEO_GOALS.find(item=>item.id===selectedGoalId);
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const dedicatedMelodies=chosen?scenarioAudioTracks(chosen.id):[];
 const melodyOptions=dedicatedMelodies.length===4?dedicatedMelodies:chosen?recommendScenarioMelodies(chosen):[];
 const sceneById=new Map(scenes.map(item=>[item.id,item]));
 const sceneLabel=(id:string)=>sceneById.get(id)?.label[locale]||clipLabel(id);
 const scenePoster=(id:string)=>sceneById.get(id)?.poster||null;
 const length=seconds||proposal?.durationSeconds||30;
 const activeTimelineEdits=chosen&&timelineEdits?.presetId===chosen.id&&
   timelineEdits.totalSeconds===length?timelineEdits:null;
 // One local licensed source is chosen for EACH storyboard beat, not merely
 // the fixed four clips attached to the nearest old template. Switching to a
 // different template is an intentional override; editing clips wins over both.
 const promptShotPlan=useMemo(()=>recommendPromptShotPlan({
   goal,theme:proposal?.theme||theme,scenes,
   excludedMotifs:proposal?.excludedMotifs||[],baseClipIds:chosen?.clips||[],
 }),[goal,theme,scenes,proposal,chosen]);
 const personalizedShotIds=(!overrideId&&promptShotPlan.mode==="personalized"&&
   promptShotPlan.canExport)?promptShotPlan.clipIds:null;
 const stageClipIds=chosen?(activeTimelineEdits?.clipIds||personalizedShotIds||[...chosen.clips]):[];
 const stageDurations=chosen?(activeTimelineEdits?.durations||
   allocateAdaptiveFilmTimeline(length,stageClipIds).map(shot=>shot.durationSeconds)):[];
 const stageCaptions=chosen?(activeTimelineEdits?.captions||["","","",""]):[];
 const timelineKey=JSON.stringify([chosen?.id,length,stageClipIds,stageDurations,stageCaptions]);
 const availableReplacements=stageClipIds.map(currentId=>
   montageReplacementOptions({scenes,currentId,selectedIds:stageClipIds,
     excludedMotifs:proposal?.excludedMotifs||[],limit:6}));
 const editTimeline=(clipIds:readonly string[],durations:readonly number[],
   captions:readonly string[]=stageCaptions)=>{
   if(!chosen)return;
   onInvalidate?.(); // An edited cut must not leave a stale downloadable movie.
   setConfirmedTimelineKey(null);
   setTimelineEdits({presetId:chosen.id,totalSeconds:length,
     clipIds:[...clipIds],durations:[...durations],captions:[...captions]});
 };
 const shiftBoundary=(index:number,direction:-1|1)=>{
   if(index<0||index>=3)return;
   const next=shiftAdaptiveFilmBoundary(stageDurations,index,direction);
   if(next.some((seconds,i)=>seconds!==stageDurations[i]))editTimeline(stageClipIds,next);
 };
 const swapScene=(index:number,direction:-1|1)=>{
   const other=index+direction;
   if(other<0||other>=stageClipIds.length)return;
   const next=[...stageClipIds];
   [next[index],next[other]]=[next[other],next[index]];
   editTimeline(next,stageDurations);
 };
 const replaceStage=(index:number,nextId:string)=>{
   if(!availableReplacements[index]?.some(scene=>scene.id===nextId))return;
   const next=[...stageClipIds];next[index]=nextId;
   editTimeline(next,stageDurations);
 };
 // A prompt changed in the other shared editor must not leave a stale confirmation.
 const showProposal=Boolean(proposal&&proposalContext?.goal===goal&&
   (proposalContext?.theme===theme||proposal.theme===theme||activePresetId===chosen?.id));
 const alternatives=proposal?[proposal.presetId,...proposal.alternativePresetIds]
   .filter((id):id is string=>Boolean(id)): [];
 const choose=()=>{
   setSelectedGoalId(null);setSelectedGoalIds([]);
   setProposalContext({goal,theme});
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);
 };
 const chooseReadyGoal=(goalId:string)=>{
   const item=AUTO_VIDEO_GOALS.find(entry=>entry.id===goalId);
   if(!item||disabled)return;
   const nextIds=selectedGoalIds.includes(goalId)
     ?selectedGoalIds.filter(id=>id!==goalId)
     :selectedGoalIds.length<2?[...selectedGoalIds,goalId]:selectedGoalIds;
   if(nextIds.length===selectedGoalIds.length&&nextIds.every((id,index)=>id===selectedGoalIds[index]))return;
   const nextGoal=nextIds.map(id=>
     popularTopicCopy[locale][id as keyof typeof popularTopicCopy.ru]||
     AUTO_VIDEO_GOALS.find(entry=>entry.id===id)?.labels[locale]||id
   ).join(" · ");
   const selectedTheme=(videoGoalCategories.find(category=>category.id===selectedCategoryId)?.theme||theme) as VideoTheme;
   onInvalidate?.();onGoalChange(nextGoal);
   setSelectedGoalIds(nextIds);setSelectedGoalId(nextIds[0]||null);
   setProposalContext({goal:nextGoal,theme:selectedTheme});
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposal(recommendAutoVideo({goal:nextGoal,goalId:nextIds[0],locale,
     fallbackTheme:selectedTheme,preferredTheme:selectedTheme,presets,scenes}));
 };
 const chooseCategory=(nextTheme:VideoTheme,categoryId:keyof typeof popularTopicOrder)=>{
   if(disabled)return;
   const nextGoal=selectedGoalIds.length?"":goal;
   onInvalidate?.();onCategoryChange?.(nextTheme);
   if(nextGoal!==goal)onGoalChange(nextGoal);
   setSelectedCategoryId(categoryId);setSubcategoriesOpen(true);
   setSelectedGoalId(null);setSelectedGoalIds([]);setOverrideId(null);setSeconds(null);
   setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const renderTopic=(item:(typeof AUTO_VIDEO_GOALS)[number],variant:"subcategory"|"popular"="subcategory")=>{
   const Icon=item.id==="confidence"?Sun:item.id==="connection"?Heart:
     item.id==="fresh-start"?Sprout:item.id==="stability"?BriefcaseBusiness:
     item.id==="calm"?Moon:Star;
   return <button key={item.id} type="button"
       data-auto-video-goal={variant==="subcategory"?item.id:undefined}
       data-auto-video-popular-topic={variant==="popular"?item.id:undefined}
       aria-pressed={selectedGoalIds.includes(item.id)}
       disabled={disabled||(!selectedGoalIds.includes(item.id)&&selectedGoalIds.length>=2)}
       onClick={()=>chooseReadyGoal(item.id)}>
       <Icon size={18} aria-hidden="true"/><span>{
         popularTopicCopy[locale][item.id as keyof typeof popularTopicCopy.ru]||item.labels[locale]
       }</span>
     </button>;
 };

 // Device-only profile recommender. Never persists answers or contacts an external AI.
 const applyProfile=()=>{
   if(disabled)return;
   const category=videoGoalCategories.find(item=>item.id===profileCategory);
   if(!category)return;
   const nextTheme=category.theme as VideoTheme;
   const nextGoal=[category.fullLabel[locale],popularTopicCopy[locale][profileFocus],
     ...(profileMode==="extended"&&profileDetails.trim()?[profileDetails.trim().slice(0,160)]:[])
   ].join(" · ").slice(0,300);
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   setSelectedCategoryId(profileCategory);setSelectedGoalId(profileFocus);
   setSelectedGoalIds([profileFocus]);setSubcategoriesOpen(true);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,goalId:profileFocus,locale,
     fallbackTheme:nextTheme,preferredTheme:nextTheme,presets,scenes}));
   setProfileMode(null);
 };
 const requestInput=<label className={css.topicInput} data-video-request-input>
   <span className={css.srOnly}>{t.input}</span>
   <input type="text" data-auto-video-input value={goal}
     maxLength={300} disabled={disabled} placeholder={t.placeholder}
     onChange={event=>{
       const value=event.currentTarget.value;
       onInvalidate?.();onGoalChange(value);
       setProposalContext({goal:value,theme});
       setProposal(recommendAutoVideo({goal:value,locale,fallbackTheme:theme,presets,scenes}));
       setOverrideId(null);setSeconds(null);setSelectedGoalId(null);setSelectedGoalIds([]);
       setTimelineEdits(null);setConfirmedTimelineKey(null);
     }}/>
 </label>;
 const profilePanel=<div className={css.profilePanel} data-video-profile-recommendation>
   <div className={css.profileSummary}>
     <span><Sparkles size={19} aria-hidden="true"/>
       {locale==="ru"?"Совет по вашему профилю":locale==="es"?"Recomendación por perfil":"Profile-based suggestion"}
     </span>
     <div className={css.profileActions}>
       <button type="button" data-video-profile-short aria-expanded={profileMode==="short"}
         disabled={disabled} onClick={()=>setProfileMode(mode=>mode==="short"?null:"short")}>
         {locale==="ru"?"Краткая · 1 мин":locale==="es"?"Breve · 1 min":"Quick · 1 min"}
       </button>
       <button type="button" data-video-profile-extended aria-expanded={profileMode==="extended"}
         disabled={disabled} onClick={()=>setProfileMode(mode=>mode==="extended"?null:"extended")}>
         {locale==="ru"?"Расширенная":locale==="es"?"Detallada":"Detailed"}
       </button>
     </div>
   </div>
   {profileMode?<div className={css.profileForm} data-video-profile-form role="group"
     aria-label={locale==="ru"?"Анкета подбора видео":locale==="es"?"Cuestionario de vídeo":"Video questionnaire"}>
     <label>{locale==="ru"?"Что сейчас важнее?":locale==="es"?"¿Qué te importa más?":"What matters most?"}
       <select value={profileCategory} disabled={disabled}
         onChange={event=>setProfileCategory(event.currentTarget.value as keyof typeof popularTopicOrder)}>
         {videoGoalCategories.map(category=><option key={category.id} value={category.id}>
           {category.fullLabel[locale]}</option>)}
       </select>
     </label>
     <label>{locale==="ru"?"Что хочется почувствовать?":locale==="es"?"¿Cómo quieres sentirte?":"How would you like to feel?"}
       <select value={profileFocus} disabled={disabled}
         onChange={event=>setProfileFocus(event.currentTarget.value as keyof typeof popularTopicCopy.ru)}>
         {popularTopicOrder.strength.map(id=><option key={id} value={id}>
           {popularTopicCopy[locale][id]}</option>)}
       </select>
     </label>
     {profileMode==="extended"?<label>
       {locale==="ru"?"Какие образы и пожелания учесть?":locale==="es"?"¿Qué imágenes prefieres?":"Any imagery or preferences?"}
       <textarea maxLength={160} rows={2} value={profileDetails} disabled={disabled}
         onChange={event=>setProfileDetails(event.currentTarget.value)}
         placeholder={locale==="ru"?"Например: природа, вода, мягкое движение":locale==="es"?"Naturaleza y agua":"Nature, water, gentle movement"}/>
     </label>:null}
     <button type="button" className={css.profileSubmit} data-video-profile-apply
       disabled={disabled} onClick={applyProfile}>
       {locale==="ru"?"Подобрать 4 сценария":locale==="es"?"Sugerir 4 historias":"Suggest 4 stories"}
       <ArrowRight size={17} aria-hidden="true"/>
     </button>
     <small>{locale==="ru"?"Ответы остаются на этой странице. Подбор из существующих видео без передачи данных внешнему ИИ.":
       locale==="es"?"Respuestas locales, sin enviarlas a una IA externa.":
       "Answers stay on this page; no external AI transfer."}</small>
   </div>:null}
 </div>;
 const goalPanel=<div className={css.goalPanel} data-auto-video-goal-panel>
   <div className={css.goalChoices} role="group" aria-label={
     locale==="ru"?"Выберите цель видео":locale==="es"?"Elige tu objetivo":"Choose your video goal"}>
     {videoGoalCategories.map(item=><button type="button" key={item.id}
       data-auto-video-category={item.id} data-auto-video-category-theme={item.theme}
       aria-label={item.fullLabel[locale]}
              aria-pressed={selectedCategoryId===item.id} disabled={disabled}
       onClick={()=>chooseCategory(item.theme,item.id)}>
       <span className={css.categoryIcon}><item.Icon size={21} aria-hidden="true"/></span>
       <strong>{item.label[locale]}</strong>
       {selectedCategoryId===item.id?<span className={css.categorySelected} aria-hidden="true">
         <Check size={15} strokeWidth={3}/></span>:null}
     </button>)}
   </div>
   {subcategoriesOpen?<div className={css.subcategories} data-auto-video-subcategories>
     <p className={css.popularHeading}>{locale==="ru"?"Подкатегории · выберите до двух":
       locale==="es"?"Subcategorías · elige hasta dos":"Subcategories · choose up to two"}</p>
     <div className={css.topicChoices} role="group" aria-label={
       locale==="ru"?"Подкатегории цели":locale==="es"?"Subcategorías":"Goal subcategories"}>
       {popularTopicOrder[selectedCategoryId].map(id=>{
         const item=AUTO_VIDEO_GOALS.find(entry=>entry.id===id);
         return item?renderTopic(item):null;
       })}
     </div>
   </div>:null}
 </div>;
 const topicPanel=<div className={css.topicPanel} data-auto-video-topic-panel>
   <div className={css.topicHead}>
     <h3><Leaf size={19} aria-hidden="true"/>
       {locale==="ru"?"2. Выберите тему":locale==="es"?"2. Elige el tema":"2. Choose your topic"}</h3>
     <button type="button" data-auto-video-clarify
       disabled={disabled} aria-expanded={onClarify?helpOpen:refineOpen}
       onClick={()=>{
         if(onClarify){onClarify();return;}
         setRefineOpen(open=>!open);
       }}>
       <Sparkles size={16} aria-hidden="true"/>
       <span>{locale==="ru"?"Я помогу: разберём проблему и определим запрос. Free.":
         locale==="es"?"Te ayudo a aclarar tu petición. Gratis.":
         "I'll help clarify your situation and goal. Free."}</span>
       <ArrowRight size={16} aria-hidden="true"/>
     </button>
   </div>
   {refineOpen?<div className={css.refinePanel} data-auto-video-refine-panel>
     <label htmlFor="auto-video-refine">{t.refine}</label>
     <textarea id="auto-video-refine" rows={2} maxLength={120}
       disabled={disabled} value={refineText} onChange={event=>setRefineText(event.currentTarget.value)}/>
     <button type="button" disabled={disabled||!refineText.trim()} onClick={()=>{
       const next=[goal.trim(),refineText.trim()].filter(Boolean).join(". ").slice(0,160);
       onInvalidate?.();onGoalChange(next);
       setProposal(recommendAutoVideo({goal:next,locale,fallbackTheme:theme,presets,scenes}));
       setProposalContext({goal:next,theme});
       setSelectedGoalId(null);setOverrideId(null);setRefineOpen(false);setRefineText("");
       setTimelineEdits(null);setConfirmedTimelineKey(null);
     }}>{t.addRefine}<ArrowRight size={15} aria-hidden="true"/></button>
   </div>:null}
   <div className={css.popularRecommendations} data-auto-video-popular-topics>
     <p className={css.popularHeading}>{locale==="ru"?"Популярные темы — выберите или напишите свою":
       locale==="es"?"Temas populares: elige o escribe el tuyo":
       "Popular themes — choose one or write your own"}</p>
     <div className={css.popularTopics} role="group" aria-label={
       locale==="ru"?"Популярные темы":locale==="es"?"Temas populares":"Popular themes"}>
       {popularTopicOrder.strength.map(id=>{
         const item=AUTO_VIDEO_GOALS.find(entry=>entry.id===id);
         return item?renderTopic(item,"popular"):null;
       })}
     </div>
   </div>
 </div>;
 return <section className={css.root} data-auto-video-director aria-labelledby="auto-video-heading">
   <div className={css.head}><Sparkles size={22} aria-hidden="true"/>
     <div><h3 id="auto-video-heading">{t.title}</h3><p>{t.intro}</p></div>
     {onShowAll?<button type="button" className={css.allScenes}
       data-auto-video-all-scenes onClick={onShowAll}>
       {locale==="ru"?"Все сценарии":locale==="es"?"Todas las escenas":"All stories"}
       <ArrowRight size={16} aria-hidden="true"/>
     </button>:null}
   </div>
   {requestTarget?createPortal(requestInput,requestTarget):requestInput}
   {profileTarget?createPortal(profilePanel,profileTarget):profilePanel}
   {goalTarget?createPortal(goalPanel,goalTarget):goalPanel}
   {topicTarget?createPortal(topicPanel,topicTarget):topicPanel}
   {showProposal&&proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
     {!goal.trim()?<p className={css.demoNote} data-auto-video-preview-example>
       {locale==="ru"?"Пример сценария · выберите тему или напишите цель":locale==="es"
         ?"Historia de ejemplo · elige o escribe tu objetivo":"Sample storyboard · choose or write your goal"}
     </p>:null}
     {chosen?<div>
       <h4>{t.reason}: {chosen.label[locale]}</h4>
       {selectedGoal?<p className={css.meta}>{t.selectedGoal}: {selectedGoal.labels[locale]}</p>:null}
       <p className={css.meta}>{length} s · {aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"} · {t.source}</p>
       <p className={css.meta} data-auto-video-matched-theme>{t.topic}: {themeLabels[locale][proposal.theme as VideoTheme]}</p>
       {proposal.confidence==="low"||proposal.confidence==="medium"?<p className={css.warning}>{t.uncertain}</p>:null}
       {proposal.requiresNewAiFootage?<p className={css.warning}>{t.warning}</p>:null}
       {personalizedShotIds?<p className={css.meta} data-auto-video-per-shot>{t.promptShotNotice}
         {promptShotPlan.missingSignals.length?<span className={css.warning}> {t.promptShotPartial}</span>:null}
       </p>:null}
       <div className={css.storyChoices} role="group" aria-label={t.variants} data-auto-video-story-options>
         {alternatives.map((id,index)=>{
           const option=presets.find(item=>item.id===id);
           return option?<button key={id} type="button" data-auto-video-option={id}
             aria-pressed={chosen.id===id} disabled={disabled}
             onClick={()=>{if(chosen?.id!==id)onInvalidate?.();
               setOverrideId(id===proposal.presetId?null:id);setTimelineEdits(null);
               setConfirmedTimelineKey(null);}}>
             {scenePoster(option.clips[0])?<img src={scenePoster(option.clips[0])!}
               alt="" loading="lazy" className={css.storyPoster}/>:null}
             <span className={css.storyNumber}>{index+1}. {chosen.id===id?<Check size={15} aria-hidden="true"/>:null}</span>
             <strong>{option.label[locale]}</strong>
             <small>{sceneById.get(option.clips[0])?.description[locale]||""}</small>
           </button>:null;
         })}
       </div>
       <details className={css.storyboardDisclosure} data-auto-video-storyboard-details>
         <summary>{locale==="ru"?"Предпросмотр 4 кадров и настройки монтажа":
           locale==="es"?"Ver las 4 escenas y editar":"Preview 4 shots and edit"}</summary>
       <p className={css.variantsTitle}>{t.storyboard}</p>
       <ol className={css.shots} data-auto-video-storyboard>
         {stageClipIds.map((clip,index)=>{
           const scene=sceneById.get(clip);
           return <li key={clip}>
             {scenePoster(clip)?<img src={scenePoster(clip)!} alt="" loading="lazy" className={css.shotPoster}/>:null}
             <b>{index+1}. {t.stages[index]} · {stageDurations[index]} s</b><span>{sceneLabel(clip)}</span>
             {scene?<small className={css.clipDescription}>{scene.description[locale]}</small>:null}
             {scene?<small className={css.clipTags}>{themeLabels[locale][scene.theme as VideoTheme]||scene.theme} · {scene.tags.slice(0,3).join(" · ")}</small>:null}
           </li>;
         })}
       </ol>
       {melodyOptions.length===4?<div className={css.melodyPanel} data-auto-video-melody-options>
         <p className={css.variantsTitle}>{t.melodyOptions}</p>
         <div className={css.melodyChoices} role="group" aria-label={t.melodyOptions}>
           {melodyOptions.map(track=><button key={track.id} type="button" data-auto-video-melody={track.id}
             disabled={disabled||!onPickAudio} aria-pressed={audioTrackId===track.id}
             title={track.detail[locale]} onClick={()=>onPickAudio?.(track.id)}>
             {audioTrackId===track.id?<Check size={14} aria-hidden="true"/>:null}{track.name[locale]}
           </button>)}
         </div>
         <p className={css.melodyHint}>{t.melodyHint}</p>
       </div>:null}
       <div className={css.timelineTrack} data-auto-video-timeline-preview
         role="list" aria-label={t.timeline}>
         {stageClipIds.map((clip,index)=><div key={clip} role="listitem"
           className={css.timelineSegment} style={{flexGrow:stageDurations[index]}}
           title={sceneLabel(clip)+" · "+stageDurations[index]+" s"}>
           <strong>{index+1}</strong><span>{stageDurations[index]} s</span>
         </div>)}
       </div>
       <details className={css.montageDetails} data-auto-video-montage>
         <summary>{t.openMontage}</summary>
         <p className={css.notice}>{t.montageHelp}</p>
         <div className={css.montageRows}>
           {stageClipIds.map((clip,index)=><div className={css.montageRow} key={clip}>
             <span className={css.montageName}>
               <strong>{index+1}. {t.stages[index]} · {stageDurations[index]} s</strong>
               <small>{sceneLabel(clip)}</small>
             </span>
             <label className={css.montageReplace}>
               <span>{t.replaceScene}</span>
               <select data-auto-video-stage-replace={index} value={clip}
                 disabled={disabled||availableReplacements[index].length===0}
                 onChange={event=>replaceStage(index,event.currentTarget.value)}>
                 <option value={clip}>{sceneLabel(clip)}</option>
                 {availableReplacements[index].map(item=>
                   <option key={item.id} value={item.id}>{sceneLabel(item.id)}</option>)}
               </select>
             </label>
             <div className={css.montageActions}>
               <button type="button" disabled={disabled||index===0}
                 aria-label={t.reorder+" ← "+sceneLabel(clip)}
                 onClick={()=>swapScene(index,-1)}>←</button>
               <button type="button" disabled={disabled||index===3}
                 aria-label={t.reorder+" → "+sceneLabel(clip)}
                 onClick={()=>swapScene(index,1)}>→</button>
               {index<3?<button type="button" disabled={disabled||stageDurations[index]<=2}
                 aria-label={t.less+" "+sceneLabel(clip)}
                 onClick={()=>shiftBoundary(index,-1)}>−1s</button>:null}
               {index<3?<button type="button" disabled={disabled||stageDurations[index+1]<=2}
                 aria-label={t.more+" "+sceneLabel(clip)}
                 onClick={()=>shiftBoundary(index,1)}>+1s</button>:null}
             </div>
           </div>)}
         </div>
         <div className={css.trackSection} data-auto-video-tracks>
           <div className={css.trackLabel}>{t.captionTrack}</div>
           <div className={css.textSegments} data-auto-video-text-track
             role="list" aria-label={t.captionTrack}>
             {stageCaptions.map((caption,index)=><div key={index} role="listitem"
               data-caption-active={caption.trim()?"true":"false"}
               title={caption||t.captionTrack}
               className={css.textSegment} style={{flexGrow:stageDurations[index]}}>
               <span>{caption?"Aa":"·"}</span>
             </div>)}
           </div>
           <div className={css.stageCaptionFields} data-auto-video-caption-editor>
             <p className={css.notice}>{t.captionHint}</p>
             {stageClipIds.map((clip,index)=><label key={clip} className={css.captionInput}>
               <span>{index+1}. {t.stages[index]} · {stageDurations[index]} s</span>
               <input type="text" data-auto-video-stage-caption={index}
                 maxLength={STAGE_CAPTION_LIMIT} disabled={disabled}
                 value={stageCaptions[index]||""}
                 onChange={event=>{
                   const captions=[...stageCaptions];
                   captions[index]=event.currentTarget.value;
                   editTimeline(stageClipIds,stageDurations,captions);
                 }}/>
             </label>)}
           </div>
           <div className={css.soundTrack} data-auto-video-sound-track
             data-attached={audioAttached?"true":"false"}>
             <div className={css.soundTrackLabel}>
               <strong>{t.soundTrack}</strong>
               <small>{audioAttached?(audioTrackLabel||t.soundTrack):t.soundMissing}</small>
             </div>
             {onOpenAudio?<button type="button" disabled={disabled} onClick={onOpenAudio}>
               {t.soundSettings}</button>:null}
           </div>
         </div>
         <p className={css.notice}>{t.replacementHint} {t.audioHint}</p>
       </details>
       <details className={css.details} data-auto-video-adjust>
         <summary>{t.edit}</summary>
         <div className={css.adjust}><span>{t.topic}:</span>
           {allThemes.map(value=><button type="button" key={value} disabled={disabled}
             aria-pressed={proposal.theme===value}
             onClick={()=>{
               onInvalidate?.();setOverrideId(null);setTimelineEdits(null);
               setConfirmedTimelineKey(null);
               setProposalContext({goal,theme});
               setProposal(recommendAutoVideo({goal,goalId:selectedGoalId,locale,fallbackTheme:theme,presets,scenes,
                 preferredTheme:value}));
             }}>{themeLabels[locale][value]}</button>)}
         </div>
         <div className={css.adjust}><span>{t.duration}:</span>
           {allowedDurations.map(n=><button type="button" key={n} disabled={disabled}
             aria-pressed={length===n} onClick={()=>{if(length!==n)onInvalidate?.();
               setSeconds(n);setTimelineEdits(null);setConfirmedTimelineKey(null);}}>{n} s</button>)}
         </div>
       </details>
       </details>
       <button type="button" data-auto-video-confirm className={css.confirm}
         disabled={disabled} onClick={()=>{
           const accepted=onApply(chosen.id,length as 10|15|20|30|60,{
             clipIds:stageClipIds,durationSecondsByStage:stageDurations,
             excludedMotifs:proposal.excludedMotifs,captionTexts:stageCaptions});
           if(accepted!==false){
             setConfirmedTimelineKey(timelineKey);
             onContinue?.(); // Changes only the active existing workspace.
           }
         }}>
         <Heart size={19} aria-hidden="true"/>
         <span>{locale==="ru"?"Подобрать слова поддержки, настроить аудиогид":
           locale==="es"?"Elegir frases de apoyo y configurar el audio":
           "Choose supportive phrases & set up audio guidance"}</span>
         <ArrowRight size={18} aria-hidden="true"/>
       </button>
       {activePresetId===chosen.id&&confirmedTimelineKey===timelineKey?<div className={css.appliedActions}>
         <p className={css.notice} role="status">{t.applied}</p>
         {onCreate?<button type="button" className={css.create} data-auto-video-create
           disabled={disabled||!canCreate} onClick={onCreate}>
           <Play size={17} fill="currentColor" aria-hidden="true"/>
           {rendering?t.waiting:t.create}
         </button>:null}
         {createFeedback?<p role="status" className={css.notice}>{createFeedback}</p>:null}
         {!canCreate&&!disabled?<p className={css.notice}>{t.blocked}</p>:null}
       </div>:null}
       <p className={css.notice}>{t.safety}</p>
     </div>:<p role="status" className={css.warning}>{t.empty}</p>}
   </div>:null}
 </section>;
}
