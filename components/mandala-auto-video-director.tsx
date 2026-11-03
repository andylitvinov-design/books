"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Check,Sparkles,Target,Play,ArrowRight,Sun,Heart,Sprout,BriefcaseBusiness,Leaf,Zap,Coins,Moon,Star} from "lucide-react";
import {recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {recommendMyTubeTopicStoryClips} from "@/lib/mandala/mytube-video-tagging.mjs";
import {MyTubeScenarioPlotPicker} from "@/components/mytube-scenario-plot-picker";
import {listMyTubeSubcategories,listMyTubeTopics,listMyTubeScenarios,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {allocateAdaptiveFilmTimeline,shiftAdaptiveFilmBoundary} from "@/lib/mandala/free-film-timeline.mjs";
import {STAGE_CAPTION_LIMIT} from "@/lib/mandala/stage-caption-track.mjs";
import {montageReplacementOptions} from "@/lib/mandala/video-montage-sources.mjs";
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
   melodyOptions:"Cuatro melodías para tu historia",melodyHint:"La melodía elegida se incluye en el vídeo; puedes cambiarla o silenciarla.",
   captionTrack:"Texto por escena",captionHint:"Opcional: un texto por etapa. Se muestra en el vídeo, sin enviarlo a IA.",soundTrack:"Música y voz",soundMissing:"Sin audio adjunto",soundSettings:"Ajustar audio",
   timeline:"Línea de montaje",openMontage:"Abrir montaje (opcional)",montageHelp:"Cambia el orden y la duración; después confirma el guion.",reorder:"Ordenar escena",less:"Acortar",more:"Alargar",audioHint:"Música, voz y frases se ajustan en las secciones actuales.",replaceScene:"Cambiar clip",replacementHint:"Solo están disponibles vídeos aprobados del catálogo.",
 }
} as const;
const videoGoalCategories=[
 {id:"goals-money",theme:"money",poster:"wealth-sunrise",Icon:Coins,label:{ru:"Деньги и развитие",en:"Goals & Money",es:"Metas y dinero"}},
 {id:"love-relationships",theme:"relationships",poster:"partners",Icon:Heart,label:{ru:"Любовь и отношения",en:"Love & Relationships",es:"Amor y relaciones"}},
 {id:"energy-confidence",theme:"energy",poster:"clear-morning",Icon:Zap,label:{ru:"Энергия и уверенность",en:"Energy & Confidence",es:"Energía y confianza"}},
 {id:"stress-anxiety",theme:"health",poster:"gentle-falls",Icon:Leaf,label:{ru:"Стресс и тревога",en:"Stress & Anxiety",es:"Estrés y ansiedad"}}
] as const;
const legacyThemeForSubcategory:Record<string,VideoTheme>={
 "purpose-development":"life","goal-achievement":"goals","money-abundance":"money","business-career":"money",
 "loneliness-breakups":"relationships","finding-love":"relationships","couple-relationships":"relationships","intimacy-family":"relationships",
 "stress-fatigue":"health","body-health":"health","vital-energy":"energy","confidence-calm":"goals",
 "stress-burnout":"health","anxiety-fears":"health","psychological-trauma":"health","depression-apathy":"health",
};
const scenarioCardHeading={
 ru:["Новый маршрут","Точка опоры","Новый взгляд","Первый шаг"],
 en:["A New Path","A Place to Stand","A New Perspective","A First Step"],
 es:["Un nuevo camino","Un punto de apoyo","Una nueva perspectiva","Un primer paso"],
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
 const [selectedCategoryId,setSelectedCategoryId]=useState<(typeof videoGoalCategories)[number]["id"]>("energy-confidence");
 const [selectedSubcategoryId,setSelectedSubcategoryId]=useState<string>("");
 const [selectedTopicId,setSelectedTopicId]=useState<string>("");
 const [selectedScenarioId,setSelectedScenarioId]=useState<string>("");
 const [goalTarget,setGoalTarget]=useState<HTMLElement|null>(null);
 const [topicTarget,setTopicTarget]=useState<HTMLElement|null>(null);
 const [refineOpen,setRefineOpen]=useState(false);
 const [refineText,setRefineText]=useState("");
 const [timelineEdits,setTimelineEdits]=useState<{
   presetId:string;totalSeconds:number;clipIds:string[];durations:number[];captions:string[];
 }|null>(null);
 const [confirmedTimelineKey,setConfirmedTimelineKey]=useState<string|null>(null);
 useEffect(()=>{
   setGoalTarget(document.querySelector<HTMLElement>("[data-video-director-goal-controls]"));
   setTopicTarget(document.querySelector<HTMLElement>("[data-video-director-topic-controls]"));
 },[]);
 const taxonomySubcategories=listMyTubeSubcategories(selectedCategoryId,locale);
 const taxonomyTopics=selectedSubcategoryId?listMyTubeTopics(selectedCategoryId,selectedSubcategoryId,locale):[];
 const selectedTaxonomyTopic=selectedTopicId?getMyTubeTopic(selectedTopicId):null;
 const taxonomyScenarios=selectedTopicId?listMyTubeScenarios(selectedTopicId,locale):[];
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const dedicatedMelodies=chosen?scenarioAudioTracks(chosen.id):[];
 const melodyOptions=dedicatedMelodies.length===4?dedicatedMelodies:chosen?recommendScenarioMelodies(chosen):[];
 const sceneById=new Map(scenes.map(item=>[item.id,item]));
 const sceneLabel=(id:string)=>sceneById.get(id)?.label[locale]||clipLabel(id);
 const scenePoster=(id:string)=>sceneById.get(id)?.poster||null;
 const length=seconds||proposal?.durationSeconds||30;
 const activeTimelineEdits=chosen&&timelineEdits?.presetId===chosen.id&&
   timelineEdits.totalSeconds===length?timelineEdits:null;
 const stageClipIds=chosen?(activeTimelineEdits?.clipIds||[...chosen.clips]):[];
 const stageDurations=chosen?(activeTimelineEdits?.durations||
   allocateAdaptiveFilmTimeline(length,stageClipIds).map(shot=>shot.durationSeconds)):[];
 const stageCaptions=chosen?(activeTimelineEdits?.captions||["","","",""]):[];
 const timelineKey=JSON.stringify([chosen?.id,length,stageClipIds,stageDurations,stageCaptions]);
 const topicMediaCoverage=selectedTopicId?recommendMyTubeTopicStoryClips({
   topicId:selectedTopicId,scenarioId:selectedScenarioId||null,scenes,
   excludedMotifs:proposal?.excludedMotifs||[],
 }):null;
 const topicSceneScores=new Map((topicMediaCoverage?.candidates||[]).map(item=>[item.sceneId,item.score]));
 const availableReplacements=stageClipIds.map(currentId=>
   montageReplacementOptions({scenes,currentId,selectedIds:stageClipIds,
     excludedMotifs:proposal?.excludedMotifs||[],limit:12})
     .sort((a,b)=>(topicSceneScores.get(b.id)||0)-(topicSceneScores.get(a.id)||0))
     .slice(0,6));
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
 const timelineForTopic=(topicId:string,scenarioId:string|null,
   recommended:ReturnType<typeof recommendAutoVideo>)=>{
   const selection=recommendMyTubeTopicStoryClips({
     topicId,scenarioId,scenes,excludedMotifs:recommended.excludedMotifs,
   });
   if(!selection.dedicatedFourSceneReady||!recommended.presetId)return null;
   const clipIds=selection.clipIds;
   return {presetId:recommended.presetId,totalSeconds:recommended.durationSeconds,
     clipIds,durations:allocateAdaptiveFilmTimeline(recommended.durationSeconds,clipIds)
       .map(shot=>shot.durationSeconds),captions:["","","",""]};
 };
 // A prompt changed in the other shared editor must not leave a stale confirmation.
 const showProposal=Boolean(proposal&&proposalContext?.goal===goal&&
   (proposalContext?.theme===theme||proposal.theme===theme||activePresetId===chosen?.id));
 const alternatives=proposal?[proposal.presetId,...proposal.alternativePresetIds]
   .filter((id):id is string=>Boolean(id)): [];
 const choose=()=>{

   setProposalContext({goal,theme});
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);
 };
 const chooseCategory=(nextTheme:VideoTheme,categoryId:(typeof videoGoalCategories)[number]["id"])=>{
   if(disabled)return;
   onInvalidate?.();
   onCategoryChange?.(nextTheme);
   setSelectedCategoryId(categoryId);
   setSelectedSubcategoryId("");setSelectedTopicId("");setSelectedScenarioId("");
   setOverrideId(null);setSeconds(null);
   setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposalContext({goal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseTaxonomySubcategory=(subcategoryId:string)=>{
   const item=taxonomySubcategories.find(row=>row.id===subcategoryId);
   if(!item)return;
   const nextTheme=legacyThemeForSubcategory[subcategoryId]||theme;
   onInvalidate?.();onCategoryChange?.(nextTheme);
   setSelectedSubcategoryId(subcategoryId);setSelectedTopicId("");setSelectedScenarioId("");
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   onGoalChange(item.label);
   setProposalContext({goal:item.label,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:item.label,locale,fallbackTheme:nextTheme,preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseTaxonomyTopic=(topicId:string)=>{
   const found=getMyTubeTopic(topicId);if(!found)return;
   const nextTheme=legacyThemeForSubcategory[found.subcategory.id]||theme;
   const label=found.topic.label[locale];
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(label);
   const recommended=recommendAutoVideo({goal:label,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes});
   setSelectedTopicId(topicId);setSelectedScenarioId("");
   setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:label,theme:nextTheme});
   setProposal(recommended);
   setTimelineEdits(timelineForTopic(topicId,null,recommended));
 };
 const chooseTaxonomyScenario=(scenarioId:string)=>{
   const scenario=taxonomyScenarios.find(item=>item.id===scenarioId);if(!scenario)return;
   setSelectedScenarioId(scenarioId);
   const topicLabel=selectedTaxonomyTopic?.topic.label[locale]||goal;
   const nextGoal=(topicLabel+" · "+scenario.label).slice(0,160);
   onInvalidate?.();onGoalChange(nextGoal);
   const nextTheme=legacyThemeForSubcategory[selectedTaxonomyTopic?.subcategory.id||""]||theme;
   const recommended=recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes});
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommended);
   setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
   setTimelineEdits(selectedTopicId?timelineForTopic(selectedTopicId,scenarioId,recommended):null);
 };
 const goalPanel=<div className={css.goalPanel} data-auto-video-goal-panel>
   <div className={css.goalChoices} role="group" aria-label={
     locale==="ru"?"Выберите цель видео":locale==="es"?"Elige tu objetivo":"Choose your video goal"}>
     {videoGoalCategories.map(item=><button type="button" key={item.id}
       data-auto-video-category={item.id} data-auto-video-category-theme={item.theme}
       aria-pressed={selectedCategoryId===item.id} disabled={disabled}
       onClick={()=>chooseCategory(item.theme,item.id)}>
       {scenePoster(item.poster)?<img src={scenePoster(item.poster)!}
         className={css.categoryPoster} alt="" loading="lazy"/>:null}
       <span className={css.categoryIcon}><item.Icon size={21} aria-hidden="true"/></span>
       <strong>{item.label[locale]}</strong>
       {selectedCategoryId===item.id?<span className={css.categorySelected} aria-hidden="true">
         <Check size={15} strokeWidth={3}/></span>:null}
     </button>)}
   </div>
 </div>;
 const topicPanel=<div className={css.topicPanel} data-auto-video-topic-panel>
   <div className={css.topicHead}>
     <h3><Leaf size={19} aria-hidden="true"/>
       {locale==="ru"?"2. Опишите свою тему":locale==="es"?"2. Describe tu tema":"2. Describe your topic"}</h3>
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
   <label className={css.topicInput}>
     <span className={css.srOnly}>{t.input}</span>
     <input type="text" data-auto-video-input value={goal}
       maxLength={160} disabled={disabled} placeholder={t.placeholder}
       onChange={event=>{
         const value=event.currentTarget.value;
         onInvalidate?.();onGoalChange(value);
         setProposalContext({goal:value,theme});
         setProposal(recommendAutoVideo({goal:value,locale,fallbackTheme:theme,presets,scenes}));
         setOverrideId(null);setSeconds(null);setSelectedTopicId("");setSelectedScenarioId("");
         setTimelineEdits(null);setConfirmedTimelineKey(null);
       }}/>
   </label>
   <p className={css.popularHeading}>
     {locale==="ru"?"Подкатегория — выберите одну из четырёх":
       locale==="es"?"Subcategoría — elige una de cuatro":"Subcategory — choose one of four"}
   </p>
   <div className={css.topicChoices} role="group" aria-label={t.goalsTitle} data-auto-video-subcategories>
     {taxonomySubcategories.map(item=><button key={item.id} type="button" data-auto-video-subcategory={item.id}
       aria-pressed={selectedSubcategoryId===item.id} disabled={disabled}
       title={item.chooseWhen} onClick={()=>chooseTaxonomySubcategory(item.id)}>
       <span>{item.label}</span>
     </button>)}
   </div>
   {selectedSubcategoryId?<>
     <p className={css.popularHeading}>{locale==="ru"?"Тема — выберите конкретный запрос":locale==="es"?"Tema — elige una necesidad concreta":"Theme — choose a specific need"}</p>
     <div className={css.topicChoices} role="group" aria-label={locale==="ru"?"Темы подкатегории":"Subcategory themes"} data-auto-video-themes>
       {taxonomyTopics.map(item=><button key={item.id} type="button" data-auto-video-topic={item.id}
         aria-pressed={selectedTopicId===item.id} disabled={disabled} title={item.searchTerms.join(" · ")}
         onClick={()=>chooseTaxonomyTopic(item.id)}><span>{item.label}</span></button>)}
     </div>
   </>:null}
   {selectedTopicId&&taxonomyScenarios.length===4?<div className={css.storyChoices} data-mytube-scenario-concepts>
     <p className={css.variantsTitle}>{locale==="ru"?"Четыре сюжетных подхода к выбранной теме":locale==="es"?"Cuatro enfoques narrativos para este tema":"Four story approaches for this topic"}</p>
     {taxonomyScenarios.map((scenario,index)=>{
       const coverage=recommendMyTubeTopicStoryClips({topicId:selectedTopicId,
         scenarioId:scenario.id,scenes,excludedMotifs:proposal?.excludedMotifs||[]});
       return <button key={scenario.id} type="button"
       data-mytube-scenario={scenario.id} aria-pressed={selectedScenarioId===scenario.id}
       disabled={disabled} onClick={()=>chooseTaxonomyScenario(scenario.id)}>
       <span className={css.storyNumber}>{index+1}. {selectedScenarioId===scenario.id?<Check size={15} aria-hidden="true"/>:null}</span>
       <strong>{scenarioCardHeading[locale][index]} · {selectedTaxonomyTopic?.topic.label[locale]}</strong>
       <small>{scenario.creativeBrief}</small>
       <small data-scenario-source-coverage={coverage.candidateCount}>
         {locale==="ru"?`Подходящих видеофрагментов: ${coverage.candidateCount}; для монтажа нужно минимум 4`:
          locale==="es"?`Clips relacionados: ${coverage.candidateCount}; se necesitan al menos 4`:
          `Matching clips: ${coverage.candidateCount}; at least 4 required`}
       </small>
       <small>{locale==="ru"?"Концепция сюжета; готовый видеоряд проверяется отдельно.":locale==="es"?"Concepto narrativo; el material de vídeo se verifica por separado.":"Story concept; matching footage is verified separately."}</small>
     </button>;
     })}
   </div>:null}
   {selectedScenarioId?<MyTubeScenarioPlotPicker key={selectedScenarioId}
     locale={locale} scenarioId={selectedScenarioId} context="director"/>:null}
   {refineOpen?<div className={css.refinePanel} data-auto-video-refine-panel>
     <label htmlFor="auto-video-refine">{t.refine}</label>
     <textarea id="auto-video-refine" rows={2} maxLength={120}
       disabled={disabled} value={refineText} onChange={event=>setRefineText(event.currentTarget.value)}/>
     <button type="button" disabled={disabled||!refineText.trim()} onClick={()=>{
       const next=[goal.trim(),refineText.trim()].filter(Boolean).join(". ").slice(0,160);
       onInvalidate?.();onGoalChange(next);
       setProposal(recommendAutoVideo({goal:next,locale,fallbackTheme:theme,presets,scenes}));
       setProposalContext({goal:next,theme});
       setSelectedTopicId("");setSelectedScenarioId("");setOverrideId(null);setRefineOpen(false);setRefineText("");
       setTimelineEdits(null);setConfirmedTimelineKey(null);
     }}>{t.addRefine}<ArrowRight size={15} aria-hidden="true"/></button>
   </div>:null}
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
   {goalTarget?createPortal(goalPanel,goalTarget):goalPanel}
   {topicTarget?createPortal(topicPanel,topicTarget):topicPanel}
   {showProposal&&proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
     {!goal.trim()?<p className={css.demoNote} data-auto-video-preview-example>
       {locale==="ru"?"Пример сценария · выберите тему или напишите цель":locale==="es"
         ?"Historia de ejemplo · elige o escribe tu objetivo":"Sample storyboard · choose or write your goal"}
     </p>:null}
     {chosen?<div>
       <h4>{t.reason}: {chosen.label[locale]}</h4>
       <p className={css.meta}>{length} s · {aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"} · {t.source}</p>
       <p className={css.meta} data-auto-video-matched-theme>{t.topic}: {themeLabels[locale][proposal.theme as VideoTheme]}</p>
       {topicMediaCoverage?<p className={css.notice} data-auto-video-topic-coverage
         data-coverage-ready={topicMediaCoverage.dedicatedFourSceneReady?"true":"false"}>
         {topicMediaCoverage.dedicatedFourSceneReady?
           (locale==="ru"?"Подобраны 4 лицензированных видеофрагмента по выбранной теме. Сюжет и монтаж ещё требуют проверки.":
             locale==="es"?"4 clips con licencia seleccionados por tema. Falta revisar la narrativa y el montaje.":
               "4 licensed clips selected for this topic. Story and edit still need review."):
           (locale==="ru"?`По теме найдено ${topicMediaCoverage.candidateCount} из 4 нужных видеофрагментов. Показан общий символический монтаж, а не готовый тематический сюжет.`:
             locale==="es"?`Encontrados ${topicMediaCoverage.candidateCount} de 4 clips. Vista previa de montaje simbólico general, no un guion temático terminado.`:
               `${topicMediaCoverage.candidateCount} of 4 topic-matched clips. Showing general symbolic montage, not a finished topic-specific video.`)}
       </p>:null}
       {proposal.confidence==="low"||proposal.confidence==="medium"?<p className={css.warning}>{t.uncertain}</p>:null}
       {proposal.requiresNewAiFootage?<p className={css.warning}>{t.warning}</p>:null}
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
               setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes,
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
