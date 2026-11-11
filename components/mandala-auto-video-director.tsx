"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {createPortal} from "react-dom";
import {Check,Sparkles,Target,Play,ArrowRight,Sun,Heart,Sprout,BriefcaseBusiness,Gift,AudioLines,Leaf,Zap,Moon,Star} from "lucide-react";
import {AUTO_VIDEO_GOALS,recommendAutoVideo} from "@/lib/mandala/auto-video-director.mjs";
import {recommendMyTubeTopicStoryClips} from "@/lib/mandala/mytube-video-tagging.mjs";
import {recommendMyTubePlotMontage} from "@/lib/mandala/mytube-plot-montage.mjs";
import {planEmotionDrivenVideo} from "@/lib/mandala/video-emotional-scene-plan.mjs";
import {planMyTubeCategory,verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey} from "@/lib/mandala/category-video-storyboard.mjs";
import {listMyTubePlots} from "@/lib/mandala/mytube-scenario-plots.mjs";
import type {MyTubePlot} from "@/lib/mandala/mytube-scenario-plots.mjs";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {classifyMyTubeRequest} from "@/lib/mandala/mytube-prompt-classifier.mjs";
import {listRecipientVideoKinds,listRecipientVideoOccasions,getRecipientVideoKind,
  buildRecipientVideoBrief,classifyRecipientVideoWish,buildRecipientVideoCaptions}
  from "@/lib/mandala/video-recipient-catalog.mjs";
import {listMyTubeMeaningAxes,listMyTubeMeaningMotifs,listMyTubeMotifScenarios} from "@/lib/mandala/mytube-meaning-hierarchy.mjs";
import {listMyTubeStyles,evaluateMyTubeMontageCreativeMatch} from "@/lib/mandala/mytube-creative-choices.mjs";
import {getStateTransitionScenario} from "@/lib/mandala/state-transition/scenario-engine.mjs";

import {StateTransitionSelector} from "./mandala-state-transition-selector";
import {MandalaMeaningIdeaSelector,type ConfirmedMeaningHandoff} from "./mandala-meaning-idea-selector";
import {allocateFreeFilmTimeline,allocateAdaptiveFilmTimeline,allocateVariableFilmTimeline,shiftAdaptiveFilmBoundary,shiftVariableFilmBoundary} from "@/lib/mandala/free-film-timeline.mjs";
import {STAGE_CAPTION_LIMIT,normalizeStageCaption} from "@/lib/mandala/stage-caption-track.mjs";
import {montageReplacementOptions,validateMontageClips} from "@/lib/mandala/video-montage-sources.mjs";
import {recommendPromptShotPlan} from "@/lib/mandala/prompt-shot-director.mjs";
import {recommendCuratedAudio} from "@/lib/mandala/curated-audio-recommendations.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

// Explicit opt-in only; preserves the original Video Director until QA.
// Safe public baseline: the owner explicitly requested release of Now → Want.
// Set the existing build variable to "false" to roll back without affecting
// editorial catalog records or existing saved videos.
const STSE_ENABLED=process.env.NEXT_PUBLIC_HH_STSE_ENABLED!=="false";
// A separate flag protects 256 unreviewed drafts from the public recommender.
const STSE_DRAFTS_ENABLED=STSE_ENABLED&&process.env.NEXT_PUBLIC_HH_STSE_CONTENT_EXPANSION_ENABLED==="true";
const MEANING_ENABLED=STSE_ENABLED&&process.env.NEXT_PUBLIC_HH_MEANING_IDEA_ENABLED==="true";

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
  recipientAudioPanel?:ReactNode;audioStoryboardReady?:boolean;onAudioToMontage?:()=>void;
  onAudioSelectionChange?:(active:boolean)=>void;
  onGoalChange:(value:string)=>void;
  onConceptTopicChange?:(selection:{categoryId:string;subcategoryId:string;topicId:string;brief?:string}|null)=>void;
  onCategoryChange?:(theme:VideoTheme)=>void;
  onAspectChange?:(value:"landscape"|"portrait"|"square")=>void;
  onContinue?:()=>void;onClarify?:()=>void;helpOpen?:boolean;
  goalContinueRef?:{current:(()=>boolean)|null};
  onShowAll?:()=>void;
  onInvalidate?:()=>void;
  onApply:(presetId:string,durationSeconds:10|15|20|30|60,
    edit?:{clipIds:readonly string[];durationSecondsByStage:readonly number[];
      captionTexts:readonly string[];excludedMotifs?:readonly string[];
      semanticScenePlan?:{pathId:string;emotionalAxisId:string;pace:"gentle"|"steady";
        shots:readonly {sceneId:string;beatIndex:number;strategyId:string;
          requiredTags:readonly string[]}[]}},
    options?:{keepGoalFlow?:boolean})=>void|boolean;
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
   melodyOptions:"Проверенная музыка для видео",melodyHint:"Выбранная мелодия включается в видео; звук можно отключить.",
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
   melodyOptions:"Reviewed music for your video",melodyHint:"Selected music is included in the video; you can change or mute it.",
   captionTrack:"Scene captions",captionHint:"Optional: one caption per stage. Your text appears in the video and is not sent to AI.",soundTrack:"Music and voice",soundMissing:"No audio attached",soundSettings:"Edit sound",
   timeline:"Montage timeline",openMontage:"Open montage (optional)",montageHelp:"Adjust shot order and durations, then confirm the storyboard.",reorder:"Reorder shot",less:"Shorten",more:"Lengthen",audioHint:"Music, voice and captions remain in the existing studio sections.",replaceScene:"Replace clip",replacementHint:"Only licensed catalogue videos are available.",
 },
 es:{
   title:"3. Elige tu historia (4 opciones)",
   intro:"Cuatro películas con licencia adaptadas a tu objetivo",
   goalsTitle:"¿Qué te gustaría cambiar?",
   placeholder:"Por ejemplo: quiero menos ansiedad y más calma",
   suggest:"Proponer vídeo",reason:"Vídeo sugerido",uncertain:"Confirma que la temática propuesta es correcta.",
   duration:"Duración",variants:"Elige una historia",storyboard:"Cuatro etapas del escenario elegida",topic:"Tema",edit:"Ajustar detalles (opcional)",
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
   melodyOptions:"Música revisada para tu vídeo",melodyHint:"La melodía elegida se incluye en el vídeo; puedes cambiarla o silenciarla.",
   captionTrack:"Texto por escena",captionHint:"Opcional: un texto por etapa. Se muestra en el vídeo, sin enviarlo a IA.",soundTrack:"Música y voz",soundMissing:"Sin audio adjunto",soundSettings:"Ajustar audio",
   timeline:"Línea de montaje",openMontage:"Abrir montaje (opcional)",montageHelp:"Cambia el orden y la duración; después confirma el guion.",reorder:"Ordenar escena",less:"Acortar",more:"Alargar",audioHint:"Música, voz y frases se ajustan en las secciones actuales.",replaceScene:"Cambiar clip",replacementHint:"Solo están disponibles vídeos aprobados del catálogo.",
 }
} as const;
const videoGoalCategories=[
 {id:"stress-anxiety",theme:"health",Icon:Leaf,art:"stress"},
 {id:"love-relationships",theme:"relationships",Icon:Heart,art:"love"},
 {id:"energy-confidence",theme:"energy",Icon:Zap,art:"energy"},
 {id:"goals-money",theme:"money",Icon:Sprout,art:"growth"},
] as const;
type CanonicalCategoryId=(typeof videoGoalCategories)[number]["id"];
const goalCardLabels={"ru":{"stress-anxiety":"Снятие стресса и расслабление","love-relationships":"Любовь и отношения","energy-confidence":"Энергия и уверенность","goals-money":"Развитие и изменения"},"en":{"stress-anxiety":"Stress relief and relaxation","love-relationships":"Love and relationships","energy-confidence":"Energy and confidence","goals-money":"Growth and change"},"es":{"stress-anxiety":"Aliviar el estrés y relajarse","love-relationships":"Amor y relaciones","energy-confidence":"Energía y confianza","goals-money":"Desarrollo y cambios"}} as const;
// All buttons are canonical 4×4×4 taxonomy topics, not decorative tags.
const goalTopicIds:Record<CanonicalCategoryId,readonly string[]>={"energy-confidence":["calm-presence","self-confidence","self-acceptance","healthy-habits","body-awareness","breathing-practices","motivation-drive","recovery-after-load","morning-energy"],"stress-anxiety":["stress-relief","constant-anxiety","anxiety-no-reason","work-stress","burnout","low-mood","inner-child","apathy","emotional-emptiness"],"love-relationships":["emotional-intimacy","couple-communication","find-love","ready-relationship","family-relationships","rebuilding-trust","choosing-partner","breakup-recovery","fear-intimacy"],"goals-money":["personal-growth","life-transitions","goal-setting","financial-stability","self-discipline","career-growth","income-growth","business-decisions","life-purpose"]};
const quickTopicLabels={"ru":{"calm-presence":"Спокойствие","self-confidence":"Уверенность","self-acceptance":"Баланс","healthy-habits":"Здоровье","body-awareness":"Тело","breathing-practices":"Дыхание","motivation-drive":"Внутренняя сила","recovery-after-load":"Ресурс","morning-energy":"Новый день"},"en":{"calm-presence":"Calm","self-confidence":"Confidence","self-acceptance":"Balance","healthy-habits":"Wellbeing","body-awareness":"Body","breathing-practices":"Breathing","motivation-drive":"Inner strength","recovery-after-load":"Recharge","morning-energy":"New day"},"es":{"calm-presence":"Calma","self-confidence":"Confianza","self-acceptance":"Equilibrio","healthy-habits":"Bienestar","body-awareness":"Cuerpo","breathing-practices":"Respiración","motivation-drive":"Fuerza interior","recovery-after-load":"Recuperación","morning-energy":"Nuevo día"}} as const;
const initialCategoryForTheme:Record<VideoTheme,CanonicalCategoryId>={
 energy:"energy-confidence",money:"goals-money",relationships:"love-relationships",
 goals:"goals-money",life:"goals-money",health:"stress-anxiety",
};
const popularTopicIds=["confidence","connection","fresh-start","stability","calm","vitality"] as const;
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
const legacyThemeForSubcategory:Record<string,VideoTheme>={
 "purpose-development":"life","goal-achievement":"goals","money-abundance":"money","business-career":"money",
 "loneliness-breakups":"relationships","finding-love":"relationships","couple-relationships":"relationships","intimacy-family":"relationships",
 "stress-fatigue":"health","body-health":"health","vital-energy":"energy","confidence-calm":"goals",
 "stress-burnout":"health","anxiety-fears":"health","psychological-trauma":"health","depression-apathy":"health",
};
const allowedDurations=[10,15,20,30,60] as const;
const allThemes=["energy","money","relationships","goals","life","health"] as const;
const themeLabels={
 ru:{energy:"Энергия",money:"Работа и деньги",relationships:"Отношения",goals:"Уверенность",life:"Развитие",health:"Спокойствие"},
 en:{energy:"Energy",money:"Work and money",relationships:"Relationships",goals:"Confidence",life:"Growth",health:"Calm"},
 es:{energy:"Energía",money:"Trabajo y dinero",relationships:"Relaciones",goals:"Confianza",life:"Desarrollo",health:"Calma"},
} as const;

export function MandalaAutoVideoDirector({
 locale,goal,theme,aspect,presets,scenes,disabled,activePresetId,clipLabel,
 audioAttached=false,audioTrackLabel="",audioTrackId=null,onPickAudio,onOpenAudio,recipientAudioPanel,audioStoryboardReady=false,onAudioToMontage,onAudioSelectionChange,onGoalChange,onConceptTopicChange,onCategoryChange,onAspectChange,onContinue,goalContinueRef,onClarify,helpOpen=false,onShowAll,onInvalidate,onApply,onCreate,canCreate=false,rendering=false,createFeedback=""
}:Props){
 const t=copy[locale];
 // A licensed four-shot sample is visible before any click; no recording begins automatically.
 const [proposal,setProposal]=useState<ReturnType<typeof recommendAutoVideo>|null>(()=>
   recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
 const [proposalContext,setProposalContext]=useState<{goal:string;theme:VideoTheme}|null>({goal,theme});
 const [overrideId,setOverrideId]=useState<string|null>(null);
 const [seconds,setSeconds]=useState<10|15|20|30|60|null>(null);
 const [selectedSubcategoryId,setSelectedSubcategoryId]=useState<string>("");
 const [videoAudience,setVideoAudience]=useState<"self"|"others">("self");
 // Retain the visitor's self-video format while selecting source-backed 9:16
 // for gifting; no unverified crop, rotation or source duplication.
 const selfAspectRef=useRef<"landscape"|"portrait"|"square">(aspect);
 // Keep the user's wording in each mode separately; switching never silently replaces it.
 const [requestDrafts,setRequestDrafts]=useState({self:"",others:""});
 const requestDraft=requestDrafts[videoAudience];
 const setRequestDraft=(next:string)=>setRequestDrafts(previous=>({...previous,[videoAudience]:next}));
 const [recipientKindId,setRecipientKindId]=useState<string>("");
 const [recipientAudioMode,setRecipientAudioMode]=useState(false);
 const [recipientOccasionId,setRecipientOccasionId]=useState<string>("");
 const [recipientContinueError,setRecipientContinueError]=useState("");
 const [recipientCaptionOverrides,setRecipientCaptionOverrides]=useState<Record<number,string>>({});
 const [selectedTopicId,setSelectedTopicId]=useState<string>("");
 const [selectedMeaningAxisId,setSelectedMeaningAxisId]=useState<string>("");
 const [selectedScenarioId,setSelectedScenarioId]=useState<string>("");
 const [selectedPlotId,setSelectedPlotId]=useState<string>("");
 const [selectedMotifId,setSelectedMotifId]=useState<string>("");
 const [selectedStyleId,setSelectedStyleId]=useState<string>("");
 const [transitionSelection,setTransitionSelection]=useState<{scenarioId:string;currentStateId:string;desiredStateId:string;intensity?:"low"|"medium"|"high";energy?:"low"|"moderate"|"high"}|null>(null);
 const [symbolicPlotFallback,setSymbolicPlotFallback]=useState(false);
 const [meaningHandoff,setMeaningHandoff]=useState<ConfirmedMeaningHandoff|null>(null);
 const [includeMeaningCaption,setIncludeMeaningCaption]=useState(false);
 const [plotData,setPlotData]=useState<{scenarioId:string;locale:PublicLocale;plots:MyTubePlot[]}|null>(null);
 const [plotsLoading,setPlotsLoading]=useState(false);
 const [selectedGoalId,setSelectedGoalId]=useState<string|null>(null);
 const [selectedGoalIds,setSelectedGoalIds]=useState<string[]>([]);
 const [subcategoriesOpen,setSubcategoriesOpen]=useState(true);
 const [selectedCategoryId,setSelectedCategoryId]=useState<CanonicalCategoryId>(
   ()=>initialCategoryForTheme[theme]);
 const [,setCategoryManuallySelected]=useState(false);
 const [requestNeedsChoice,setRequestNeedsChoice]=useState(false);
 const [goalTarget,setGoalTarget]=useState<HTMLElement|null>(null);
 const [audienceTarget,setAudienceTarget]=useState<HTMLElement|null>(null);
 const [topicTarget,setTopicTarget]=useState<HTMLElement|null>(null);
 const [ideaTarget,setIdeaTarget]=useState<HTMLElement|null>(null);
 const [montageTarget,setMontageTarget]=useState<HTMLElement|null>(null);
 const [requestTarget,setRequestTarget]=useState<HTMLElement|null>(null);
 const [profileTarget,setProfileTarget]=useState<HTMLElement|null>(null);
 const [profileMode,setProfileMode]=useState<"short"|"extended"|null>(null);
 const [profileCategory,setProfileCategory]=useState<CanonicalCategoryId>("energy-confidence");
 const [profileFocus,setProfileFocus]=useState<keyof typeof popularTopicCopy.ru>("confidence");
 const [profileDetails,setProfileDetails]=useState("");
 // Let Safari's native <details> own its open attribute. React's controlled
 // "open={state}" can close it between summary default activation and onToggle.
 // Preserve the last genuine user state only when React remounts this portal.
 const ideaRefinementOpenRef=useRef(false);
 const ideaRefinementNodeRef=useRef<HTMLDetailsElement|null>(null);
 const bindIdeaRefinement=useCallback((node:HTMLDetailsElement|null)=>{
   ideaRefinementNodeRef.current=node;
   if(node && ideaRefinementOpenRef.current)node.open=true;
 },[]);
 const [refineOpen,setRefineOpen]=useState(false);
 const [refineText,setRefineText]=useState("");
 const [promptClassification,setPromptClassification]=useState<ReturnType<typeof classifyMyTubeRequest>|null>(null);
 const [promptDesignedFor,setPromptDesignedFor]=useState<string|null>(null);
 const [timelineEdits,setTimelineEdits]=useState<{
   presetId:string;totalSeconds:number;clipIds:string[];durations:number[];captions:string[];userEdited?:boolean;
 }|null>(null);
 const [confirmedTimelineKey,setConfirmedTimelineKey]=useState<string|null>(null);
 useEffect(()=>{
   setGoalTarget(document.querySelector<HTMLElement>("[data-video-director-goal-controls]"));
   setAudienceTarget(document.querySelector<HTMLElement>("[data-video-director-audience-controls]"));
   setTopicTarget(document.querySelector<HTMLElement>("[data-video-director-topic-controls]"));
   setIdeaTarget(document.querySelector<HTMLElement>("[data-video-director-idea-controls]"));
   setMontageTarget(document.querySelector<HTMLElement>("[data-video-director-style-controls]"));
   setRequestTarget(document.querySelector<HTMLElement>("[data-video-request-prompt]"));
   setProfileTarget(document.querySelector<HTMLElement>("[data-video-profile-picker]"));
 },[]);
 useEffect(()=>{
   if(!selectedScenarioId){setPlotData(null);setPlotsLoading(false);return;}
   if(STSE_DRAFTS_ENABLED&&/-s[5-8]$/.test(selectedScenarioId)){
     setPlotData({scenarioId:selectedScenarioId,locale,plots:[]});setPlotsLoading(false);return;
   }
   let active=true;
   setPlotsLoading(true);
   // Download only the chosen category's plots, not the entire 1,024-plot catalog.
   listMyTubePlots(selectedScenarioId,locale)
     .then(plots=>{if(active){setPlotData({scenarioId:selectedScenarioId,locale,plots});setPlotsLoading(false);}})
     .catch(()=>{if(active){setPlotData({scenarioId:selectedScenarioId,locale,plots:[]});setPlotsLoading(false);}});
   return ()=>{active=false;};
 },[selectedScenarioId,locale]);
 const taxonomyCategories=listMyTubeCategories(locale);
 const taxonomySubcategories=listMyTubeSubcategories(selectedCategoryId,locale);
 const taxonomyTopics=selectedSubcategoryId?listMyTubeTopics(selectedCategoryId,selectedSubcategoryId,locale):[];
 const selectedTaxonomyTopic=selectedTopicId?getMyTubeTopic(selectedTopicId):null;
 // The explicitly picked canonical taxonomy is the source of truth for Ideas.
 // A stale optional request must never override this verified path.
 useEffect(()=>{
   if(!onConceptTopicChange)return;
   const current=selectedTopicId?getMyTubeTopic(selectedTopicId):null;
   onConceptTopicChange(current&&current.category.id===selectedCategoryId&&
     current.subcategory.id===selectedSubcategoryId?
     {categoryId:selectedCategoryId,subcategoryId:selectedSubcategoryId,topicId:selectedTopicId,
      brief:requestDraft.trim().slice(0,800)}:null);
 },[selectedCategoryId,selectedSubcategoryId,selectedTopicId,requestDraft,onConceptTopicChange]);
 const taxonomyMeanings=selectedTopicId?listMyTubeMeaningAxes(selectedTopicId,locale):[];
 const taxonomyScenarios=selectedTopicId&&selectedMeaningAxisId&&selectedMotifId?
   listMyTubeMotifScenarios(selectedTopicId,selectedMeaningAxisId,selectedMotifId,locale):[];
 const stseScenario=STSE_DRAFTS_ENABLED&&selectedScenarioId?
   getStateTransitionScenario(selectedScenarioId,locale):null;
 const suggestedVisualMotifs=selectedTopicId&&selectedMeaningAxisId?
   listMyTubeMeaningMotifs(selectedTopicId,selectedMeaningAxisId,locale):[];
 const availableVisualStyles=listMyTubeStyles(locale);
 const taxonomyPlots=plotData?.scenarioId===selectedScenarioId&&plotData.locale===locale?plotData.plots:[];
 const selectedTaxonomyPlot=taxonomyPlots.find(plot=>plot.id===selectedPlotId);
 const selectedPlotMedia=useMemo(()=>selectedTaxonomyPlot?recommendMyTubePlotMontage({
   plot:selectedTaxonomyPlot,scenes,excludedMotifs:proposal?.excludedMotifs||[],
   motifId:selectedMotifId||null,styleId:selectedStyleId||null,targetAspect:aspect,
 }):null,[selectedTaxonomyPlot,scenes,proposal?.excludedMotifs,selectedMotifId,selectedStyleId,aspect]);
 const chosen=presets.find(p=>p.id===(overrideId||proposal?.presetId));
 const fallbackSourcesValid=Boolean(selectedTaxonomyPlot&&!selectedPlotMedia?.hasFourApprovedSources&&
   chosen&&validateMontageClips([...chosen.clips],scenes,proposal?.excludedMotifs||[],aspect)&&
   !selectedMotifId&&!selectedStyleId);
 const fallbackEnabled=Boolean(symbolicPlotFallback&&fallbackSourcesValid);
 // Professional, licensed physical MP3s only; no oscillator score as an option.
 const melodyOptions=recommendCuratedAudio({theme,kind:"melody"}).slice(0,4);
 const sceneById=new Map(scenes.map(item=>[item.id,item]));
 const sceneLabel=(id:string)=>sceneById.get(id)?.label[locale]||clipLabel(id);
 const scenePoster=(id:string)=>sceneById.get(id)?.poster||null;
 const length=seconds||proposal?.durationSeconds||30;
 // Build the four narrative beats from the selected category before using
 // any preset. The planner proves real source geometry from published manifests.
 const effectiveCategoryId=videoAudience==="others"&&recipientKindId
   ?getRecipientVideoKind(recipientKindId)?.sourceCategoryId||selectedCategoryId
   :selectedCategoryId;
 const categoryPlan=useMemo(()=>planMyTubeCategory({
   categoryId:effectiveCategoryId,locale,aspect,
   durationSeconds:length,styleId:selectedStyleId||null,
   excludedMotifs:proposal?.excludedMotifs||[],scenes,
 }),[effectiveCategoryId,locale,aspect,length,selectedStyleId,proposal?.excludedMotifs,scenes]);
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
 // An explicitly confirmed emotional vector plus meaning + motif + scenario
 // becomes a tagged scene script. Four narrative beats are split into the
 // physically required 4 / 6 / 12 distinct, source-backed MP4 cuts.
 const confirmedTransition:{currentStateId:string;desiredStateId:string;intensity?:"low"|"medium"|"high";energy?:"low"|"moderate"|"high"}|null=meaningHandoff?.ideaBrief?.confirmedIdeaId&&
   meaningHandoff.ideaBrief.emotionalTransition
   ?{currentStateId:meaningHandoff.ideaBrief.emotionalTransition.from,
     desiredStateId:meaningHandoff.ideaBrief.emotionalTransition.to}
   :transitionSelection?.scenarioId===selectedScenarioId?transitionSelection:null;
 const semanticRequired=Boolean(selectedTopicId&&selectedMeaningAxisId&&
   selectedMotifId&&selectedScenarioId&&!fallbackEnabled);
 const semanticPlan=useMemo(()=>semanticRequired?planEmotionDrivenVideo({
   topicId:selectedTopicId,meaningAxisId:selectedMeaningAxisId,
   motifId:selectedMotifId,scenarioId:selectedScenarioId,
   plot:selectedTaxonomyPlot,emotional:confirmedTransition,
   durationSeconds:length,aspect,locale,scenes,
   excludedMotifs:proposal?.excludedMotifs||[],styleId:selectedStyleId||null,
   allowAbstractMotion:false
 }):null,[semanticRequired,selectedTopicId,selectedMeaningAxisId,selectedMotifId,
   selectedScenarioId,selectedTaxonomyPlot,confirmedTransition?.currentStateId,
   confirmedTransition?.desiredStateId,confirmedTransition?.intensity,
   confirmedTransition?.energy,length,aspect,locale,scenes,proposal?.excludedMotifs,selectedStyleId]);
 const semanticReady=Boolean(semanticPlan?.ok);
 const categoryClipIds=categoryPlan.ok&&!selectedTopicId&&!selectedScenarioId&&!selectedPlotId?
   categoryPlan.shots.map((shot:{sceneId:string})=>shot.sceneId):null;
 const userEdit=activeTimelineEdits?.userEdited===true&&
   (!semanticReady||activeTimelineEdits?.clipIds.length===semanticPlan?.shots.length);
 const stageClipIds=chosen?(userEdit?activeTimelineEdits!.clipIds:
   semanticReady?semanticPlan!.clipIds:categoryClipIds||
   activeTimelineEdits?.clipIds||personalizedShotIds||[...chosen.clips]):[];
 const stageDurations=chosen?(userEdit?activeTimelineEdits!.durations:
   semanticReady?semanticPlan!.shots.map(shot=>shot.durationSeconds):
   activeTimelineEdits?.durations||
   (categoryClipIds&&categoryClipIds.length!==4
     ?allocateVariableFilmTimeline(length,stageClipIds)
     :categoryClipIds?allocateFreeFilmTimeline(length,stageClipIds)
     :allocateAdaptiveFilmTimeline(length,stageClipIds)).map(shot=>shot.durationSeconds)):[];
 const semanticStageCaptions=semanticReady?semanticPlan!.shots.map((shot,index)=>{
   // Display narrative text once at the start of each of four semantic beats,
   // even when that beat spans three physical MP4 shots.
   if(semanticPlan!.shots.slice(0,index).some(prev=>prev.beatIndex===shot.beatIndex))
     return "";
   const text=selectedTaxonomyPlot?.beats?.[shot.beatIndex-1]||
     semanticPlan!.stages?.[shot.beatIndex-1]?.beatText||"";
   return normalizeStageCaption(Array.from(text).slice(0,STAGE_CAPTION_LIMIT).join(""));
 }):[];
 const manualStageCaptions=chosen?(userEdit?activeTimelineEdits!.captions:
   semanticReady?semanticStageCaptions:
   activeTimelineEdits?.captions||Array.from({length:stageClipIds.length},()=>"")):[];
 // Confirmed creative meaning is offered as an optional final caption.
 // Client-authored captions, music, voice and physical footage always win.
 const meaningCaption=meaningHandoff?.status==="editorial_only"&&includeMeaningCaption
   ?meaningHandoff.ideaBrief?.ideaText||null:null;
 const finalStageIndex=stageClipIds.length-1;
 const lastCaptionTaken=Boolean(manualStageCaptions[finalStageIndex]?.trim());
 const meaningCaptionTooLong=Boolean(meaningCaption&&!lastCaptionTaken&&
   Array.from(meaningCaption).length>STAGE_CAPTION_LIMIT);
 const meaningCaptionUsed=Boolean(meaningCaption&&!lastCaptionTaken&&!meaningCaptionTooLong);
 const recipientCaptionSeeds=videoAudience==="others"&&recipientKindId
   ?buildRecipientVideoCaptions({kindId:recipientKindId,occasionId:recipientOccasionId,
     wish:requestDraft,locale}):null;
 const stageCaptions=manualStageCaptions.map((caption,index)=>{
   // Keep an explicit empty caption empty; no hidden re-seeding.
   if(recipientCaptionSeeds&&Object.prototype.hasOwnProperty.call(recipientCaptionOverrides,index))
     return normalizeStageCaption(recipientCaptionOverrides[index]);
   if(recipientCaptionSeeds&&manualStageCaptions.length){
     const beat=Math.floor(index*4/manualStageCaptions.length);
     if(manualStageCaptions.slice(0,index).some((_,previous)=>
       Math.floor(previous*4/manualStageCaptions.length)===beat))return "";
     return normalizeStageCaption(recipientCaptionSeeds[beat]||"");
   }
   if(caption.trim())return caption;
   if(index===finalStageIndex&&meaningCaptionUsed)return meaningCaption!;
   return caption;
 });
 const timelineKey=JSON.stringify([chosen?.id,length,stageClipIds,stageDurations,
   stageCaptions,selectedMeaningAxisId,selectedMotifId,selectedStyleId,aspect,
   meaningHandoff?.ideaBrief?.confirmedIdeaId||null,meaningHandoff?.ideaBrief?.ideaText||null]);
 const topicMediaCoverage=selectedTopicId?recommendMyTubeTopicStoryClips({
   topicId:selectedTopicId,scenarioId:selectedScenarioId||null,scenes,
   excludedMotifs:proposal?.excludedMotifs||[],
   motifId:selectedMotifId||null,styleId:selectedStyleId||null,meaningAxisId:selectedMeaningAxisId||null,targetAspect:aspect,
 }):null;
 const creativeMontageEvidence=evaluateMyTubeMontageCreativeMatch({
   clipIds:stageClipIds,scenes,motifId:selectedMotifId||null,styleId:selectedStyleId||null,
 });
 // A pretty 16:9 Canvas is NOT proof that the input MP4s were landscape.
 // Block old four-shot export if any source is vertical, too short or reused.
 const physicalClipProof=stageClipIds.map(id=>verifiedCategorySource(sceneById.get(id)));
 const physicalClipReady=stageClipIds.length>=4&&stageClipIds.length<=12&&
   stageDurations.length===stageClipIds.length&&
   physicalClipProof.every((scene,index)=>Boolean(scene&&
     verifiedSceneAspect(scene,aspect)&&scene.durationSeconds>=stageDurations[index]))&&
   new Set(physicalClipProof.map(scene=>canonicalSourceMasterKey(scene))).size===stageClipIds.length&&
   (Boolean(selectedTopicId)||Boolean(categoryPlan.ok));
 const creativeSelectionUnavailable=Boolean(selectedScenarioId&&(selectedMotifId||selectedStyleId)&&
   !semanticReady&&(!topicMediaCoverage?.dedicatedFourSceneReady||!activeTimelineEdits||!creativeMontageEvidence.ok));
 const semanticStageIntegrity=!semanticRequired||Boolean(semanticReady&&
   stageClipIds.length===semanticPlan!.shots.length&&
   stageClipIds.every((sceneId,index)=>{
     if(sceneId===semanticPlan!.shots[index].sceneId)return true;
     const source=sceneById.get(sceneId);
     const tags=new Set([...(source?.tags||[]),...(source?.motifs||[]),
       source?.label?.en||"",source?.description?.en||""].join(" ")
       .toLowerCase().match(/[a-z][a-z0-9]{2,}/g)||[]);
     return semanticPlan!.shots[index].requiredTags.some(tag=>tags.has(tag));
   }));
 const plotLacksApprovedClips=Boolean(!physicalClipReady||!semanticStageIntegrity||
   (STSE_DRAFTS_ENABLED&&stseScenario?.newExpansion)||(selectedPlotId&&
   !semanticReady&&!selectedPlotMedia?.hasFourApprovedSources&&!fallbackEnabled)||creativeSelectionUnavailable);
 const topicSceneScores=new Map((topicMediaCoverage?.candidates||[]).map(item=>[item.sceneId,item.score]));
 const availableReplacements=stageClipIds.map(currentId=>
   montageReplacementOptions({scenes,currentId,selectedIds:stageClipIds,
     excludedMotifs:proposal?.excludedMotifs||[],limit:12,targetAspect:aspect})
     .sort((a,b)=>(topicSceneScores.get(b.id)||0)-(topicSceneScores.get(a.id)||0))
     .slice(0,6));
 // The one visible Goal CTA stages this plan; it never exports or charges.
 const prepareGoalForIdeas=():boolean=>{
   if(videoAudience!=="others")return true;
   if(recipientAudioMode){
     if(!audioStoryboardReady){
       setRecipientContinueError(locale==="ru"?"Сначала загрузите аудио, разрешите распознавание и подберите видеоряд.":locale==="es"?"Primero sube audio y prepara las escenas.":"Upload audio and prepare footage first.");
       return false;
     }
     onAudioToMontage?.();return false;
   }
   if(!recipientKindId){
     setRecipientContinueError(locale==="ru"?"Выберите подарок, поздравление или презентацию.":
       locale==="es"?"Elige regalo, felicitación o presentación.":"Choose Gift, Greeting or Presentation first.");
     return false;
   }
   if(!chosen||!physicalClipReady||plotLacksApprovedClips){
     setRecipientContinueError(locale==="ru"?"Недостаточно проверенных кадров. Выберите другой вариант.":
       locale==="es"?"Faltan clips verificados. Elige otra opción.":"Not enough verified clips. Choose another option.");
     return false;
   }
   const accepted=onApply(chosen.id,length as 10|15|20|30|60,{
     clipIds:[...stageClipIds],durationSecondsByStage:[...stageDurations],
     captionTexts:[...stageCaptions],excludedMotifs:proposal?.excludedMotifs||[]
   },{keepGoalFlow:true});
   if(accepted===false){
     setRecipientContinueError(locale==="ru"?"Не удалось подготовить фильм. Выберите другой вариант.":
       locale==="es"?"No se pudo preparar el vídeo. Elige otra opción.":"Unable to prepare this film. Choose another option.");
     return false;
   }
   setRecipientContinueError("");
   return true;
 };
 useEffect(()=>{
   if(!goalContinueRef)return;
   goalContinueRef.current=prepareGoalForIdeas;
   return ()=>{if(goalContinueRef.current===prepareGoalForIdeas)goalContinueRef.current=null;};
 },[goalContinueRef,prepareGoalForIdeas]);
 const editTimeline=(clipIds:readonly string[],durations:readonly number[],
   captions:readonly string[]=stageCaptions)=>{
   if(!chosen)return;
   onInvalidate?.(); // An edited cut must not leave a stale downloadable movie.
   setConfirmedTimelineKey(null);
   setTimelineEdits({presetId:chosen.id,totalSeconds:length,userEdited:true,
     clipIds:[...clipIds],durations:[...durations],captions:[...captions]});
 };
 const shiftBoundary=(index:number,direction:-1|1)=>{
   if(index<0||index>=stageDurations.length-1)return;
   const next=stageDurations.length===4?shiftAdaptiveFilmBoundary(stageDurations,index,direction):
     shiftVariableFilmBoundary(stageDurations,index,direction);
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
   recommended:ReturnType<typeof recommendAutoVideo>,plot:MyTubePlot|null=null,
   requestedSeconds?:10|15|20|30|60,presetOverride?:string,
   motifId:string|null=selectedMotifId||null,styleId:string|null=selectedStyleId||null,
   meaningAxisId:string|null=selectedMeaningAxisId||null)=>{
   if(!recommended.presetId)return null;
   const clipIds=plot?recommendMyTubePlotMontage({
     plot,scenes,excludedMotifs:recommended.excludedMotifs,motifId,styleId,targetAspect:aspect,
   }).clipIds:recommendMyTubeTopicStoryClips({
     topicId,scenarioId,scenes,excludedMotifs:recommended.excludedMotifs,motifId,styleId,
     meaningAxisId,targetAspect:aspect,
   }).clipIds;
   if(clipIds.length!==4)return null;
   const desiredSeconds=requestedSeconds||recommended.durationSeconds;
   return {presetId:presetOverride||recommended.presetId,totalSeconds:desiredSeconds,
     clipIds,durations:allocateAdaptiveFilmTimeline(desiredSeconds,clipIds)
       .map(shot=>shot.durationSeconds),
     captions:plot?plot.beats.map(text=>Array.from(text).slice(0,STAGE_CAPTION_LIMIT).join("")):["","","",""]};
 };
 // A prompt changed in the other shared editor must not leave a stale confirmation.
 const showProposal=Boolean(proposal&&proposalContext?.goal===goal&&
   (proposalContext?.theme===theme||proposal.theme===theme||activePresetId===chosen?.id));
 const alternatives=proposal?[proposal.presetId,...proposal.alternativePresetIds]
   .filter((id):id is string=>Boolean(id)): [];
 const choose=()=>{
   setRequestNeedsChoice(false);
   setSelectedGoalId(null);setSelectedGoalIds([]);
   setProposalContext({goal,theme});
   setProposal(recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes}));
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);
 };
 const chooseReadyGoal=(goalId:string)=>{
   setRequestNeedsChoice(false);
   setPromptDesignedFor(null);setPromptClassification(null);
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
   setSelectedSubcategoryId("");setSelectedTopicId("");setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setProposalContext({goal:nextGoal,theme:selectedTheme});
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposal(recommendAutoVideo({goal:nextGoal,goalId:nextIds[0],locale,
     fallbackTheme:selectedTheme,preferredTheme:selectedTheme,presets,scenes}));
 };
 // All three modes use the existing licensed four-shot planner and Canvas export.
 // No second renderer, remote API, contact database or paid generation.
 const resetAudienceStory=()=>{
   setRequestNeedsChoice(false);
   setRecipientContinueError("");setRecipientCaptionOverrides({});
   setSelectedGoalId(null);setSelectedGoalIds([]);
   setSelectedSubcategoryId("");setSelectedTopicId("");setSelectedMeaningAxisId("");
   setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);
   setSelectedMotifId("");setSelectedStyleId("");
   setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setPromptDesignedFor(null);setPromptClassification(null);
 };
 const changeVideoAudience=(mode:"self"|"others")=>{
   if(disabled||mode===videoAudience)return;
   const kind=getRecipientVideoKind(recipientKindId);
   const selectedSelfTheme=videoGoalCategories.find(item=>item.id===selectedCategoryId)?.theme||theme;
   const nextTheme=(mode==="others"?(kind?.theme||selectedSelfTheme):selectedSelfTheme) as VideoTheme;
   const nextGoal=mode==="others"
     ?buildRecipientVideoBrief({kindId:recipientKindId,occasionId:recipientOccasionId,
       wish:requestDrafts.others,locale})
     :requestDrafts.self;
   if(mode==="others"){
     selfAspectRef.current=aspect;
     if(aspect!=="portrait")onAspectChange?.("portrait");
   }else if(aspect!==selfAspectRef.current){
     onAspectChange?.(selfAspectRef.current);
   }
   setVideoAudience(mode);setRecipientAudioMode(false);onAudioSelectionChange?.(false);
   resetAudienceStory();
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseRecipientVideo=(kindId:string,occasionId="")=>{
   if(disabled||videoAudience!=="others")return;
   const kind=getRecipientVideoKind(kindId);
   if(!kind||(occasionId&&!listRecipientVideoOccasions(kindId,locale)
     .some(item=>item.id===occasionId)))return;
   const nextTheme=kind.theme as VideoTheme;
   const nextGoal=buildRecipientVideoBrief({kindId,occasionId,
     wish:requestDrafts.others,locale});
   setRecipientKindId(kindId);setRecipientOccasionId(occasionId);
   setRecipientAudioMode(false);onAudioSelectionChange?.(false);
   resetAudienceStory();
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseRecipientAudio=()=>{
   if(disabled||videoAudience!=="others"||recipientAudioMode)return;
   setRecipientAudioMode(true);setRecipientKindId("");setRecipientOccasionId("");
   resetAudienceStory();onInvalidate?.();onAudioSelectionChange?.(true);
 };
 const chooseCategory=(nextTheme:VideoTheme,categoryId:CanonicalCategoryId)=>{
   setRequestNeedsChoice(false);
   setPromptDesignedFor(null);setPromptClassification(null);
   if(disabled)return;
   setCategoryManuallySelected(true);
   const nextGoal=requestDraft.trim();
   onInvalidate?.();onCategoryChange?.(nextTheme);
   if(nextGoal!==goal)onGoalChange(nextGoal);
   setSelectedCategoryId(categoryId);setSubcategoriesOpen(true);
   setSelectedSubcategoryId("");setSelectedTopicId("");setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setSelectedGoalId(null);setSelectedGoalIds([]);setOverrideId(null);setSeconds(null);
   setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseTaxonomySubcategory=(subcategoryId:string)=>{
   setRequestNeedsChoice(false);
   setPromptDesignedFor(null);setPromptClassification(null);
   const item=taxonomySubcategories.find(row=>row.id===subcategoryId);
   if(!item)return;
   setCategoryManuallySelected(true);
   const nextTheme=legacyThemeForSubcategory[subcategoryId]||theme;
   onInvalidate?.();onCategoryChange?.(nextTheme);
   setSelectedGoalId(null);setSelectedGoalIds([]);
   setSelectedSubcategoryId(subcategoryId);setSelectedTopicId("");setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   const nextGoal=requestDraft.trim()||item.label;
   onGoalChange(nextGoal);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,preferredTheme:nextTheme,presets,scenes}));
 };
 const chooseTaxonomyTopic=(topicId:string)=>{
   setRequestNeedsChoice(false);
   setPromptDesignedFor(null);setPromptClassification(null);
   const found=getMyTubeTopic(topicId);
   if(!found||found.category.id!==selectedCategoryId)return;
   const nextTheme=legacyThemeForSubcategory[found.subcategory.id]||theme;
   // Preserve optional user prose in requestDraft but publish the explicit topic
   // as the canonical Studio goal, avoiding stale unrelated wishes (e.g. Sex).
   const label=found.topic.label[locale];
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(label);
   const recommended=recommendAutoVideo({goal:label,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes});
   setSelectedSubcategoryId(found.subcategory.id);setSelectedTopicId(topicId);setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");
   setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:label,theme:nextTheme});
   setProposal(recommended);
   setTimelineEdits(timelineForTopic(topicId,null,recommended));
 };
 const chooseMeaningAxis=(id:string)=>{
   if(!taxonomyMeanings.some(x=>x.id===id)||id===selectedMeaningAxisId)return;
   onInvalidate?.();setSelectedMeaningAxisId(id);
   setSelectedMotifId(listMyTubeMeaningMotifs(selectedTopicId,id,locale)[0]?.id||"");
   setSelectedStyleId("");
   setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);
   setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
 };
 const chooseTaxonomyMotif=(id:string)=>{
   if(!suggestedVisualMotifs.some(x=>x.id===id)||id===selectedMotifId)return;
   onInvalidate?.();setSelectedMotifId(id);setSelectedPlotId("");
   // Motif choices preserve stable scenario IDs but invalidate rendered clips;
   // media selection and licensing are checked again for the changed motif.
   setSymbolicPlotFallback(false);setOverrideId(null);setSeconds(null);
   setTimelineEdits(null);setConfirmedTimelineKey(null);
 };
 const chooseTaxonomyScenario=(scenarioId:string)=>{
   const scenario=taxonomyScenarios.find(item=>item.id===scenarioId);if(!scenario)return;
   setSelectedScenarioId(scenarioId);setSelectedPlotId("");setSymbolicPlotFallback(false);
   setTransitionSelection(null);
   const topicLabel=selectedTaxonomyTopic?.topic.label[locale]||goal;
   const nextGoal=(topicLabel+" · "+scenario.label).slice(0,160);
   onInvalidate?.();onGoalChange(nextGoal);
   const nextTheme=legacyThemeForSubcategory[selectedTaxonomyTopic?.subcategory.id||""]||theme;
   const recommended=recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes});
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommended);
   setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
   setTimelineEdits(selectedTopicId?timelineForTopic(selectedTopicId,scenarioId,recommended,null,undefined,undefined,selectedMotifId||null,selectedStyleId||null):null);
 };
 const chooseTaxonomyPlot=(plotId:string)=>{
   const plot=taxonomyPlots.find(item=>item.id===plotId);
   if(!plot||plot.scenarioId!==selectedScenarioId||!selectedTaxonomyTopic)return;
   setSelectedPlotId(plotId);setSymbolicPlotFallback(false);
   const nextTheme=legacyThemeForSubcategory[selectedTaxonomyTopic.subcategory.id]||theme;
   const nextGoal=(selectedTaxonomyTopic.topic.label[locale]+" · "+plot.label).slice(0,160);
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   const recommended=recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes});
   setProposalContext({goal:nextGoal,theme:nextTheme});setProposal(recommended);
   setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
   // Scene matcher is scenario-level only; plot-level footage is NOT certified.
   setTimelineEdits(selectedTopicId?timelineForTopic(selectedTopicId,selectedScenarioId,recommended,plot):null);
 };
 const chooseCreativeVisuals=(motifId:string,styleId:string)=>{
   if(disabled||(motifId&&motifId!==selectedMotifId))return;
   onInvalidate?.();setConfirmedTimelineKey(null);setSymbolicPlotFallback(false);
   setSelectedStyleId(styleId);
   // The style is optional: it can be selected before a story has been approved.
   setTimelineEdits(selectedScenarioId&&selectedTopicId&&proposal?
     timelineForTopic(selectedTopicId,selectedScenarioId,proposal,
       selectedTaxonomyPlot||null,length as 10|15|20|30|60,chosen?.id,
       selectedMotifId||null,styleId||null):null);
 };
 const useAvailableSymbolicCategory=()=>{
   if(disabled||!categoryPlan.ok)return;
   onInvalidate?.();
   const category=videoGoalCategories.find(item=>item.id===selectedCategoryId);
   const nextTheme=(category?.theme||theme) as VideoTheme;
   const nextGoal=taxonomyCategories.find(item=>item.id===selectedCategoryId)?.label||goal;
   setSelectedSubcategoryId("");setSelectedTopicId("");
   setSelectedMeaningAxisId("");setSelectedMotifId("");setSelectedScenarioId("");
   setSelectedPlotId("");setSelectedStyleId("");setSymbolicPlotFallback(false);
   setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setTransitionSelection(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setOverrideId(null);setProposalContext({goal:nextGoal,theme:nextTheme});
   onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:nextTheme,
     preferredTheme:nextTheme,presets,scenes}));
 };
 const enableSymbolicPlotFallback=()=>{
   if(!selectedTaxonomyPlot||!chosen||!fallbackSourcesValid)return;
   const clipIds=[...chosen.clips];
   if(!validateMontageClips(clipIds,scenes,proposal?.excludedMotifs||[]))return;
   const captions=selectedTaxonomyPlot.beats.map(text=>
     Array.from(text).slice(0,STAGE_CAPTION_LIMIT).join(""));
   onInvalidate?.();setConfirmedTimelineKey(null);setSymbolicPlotFallback(true);
   setTimelineEdits({presetId:chosen.id,totalSeconds:length,clipIds,
     durations:allocateAdaptiveFilmTimeline(length,clipIds).map(shot=>shot.durationSeconds),
     captions});
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
   setRequestNeedsChoice(false);
   setPromptDesignedFor(null);setPromptClassification(null);
   if(disabled)return;
   const category=videoGoalCategories.find(item=>item.id===profileCategory);
   if(!category)return;
   const nextTheme=category.theme as VideoTheme;
   const nextGoal=[taxonomyCategories.find(item=>item.id===profileCategory)?.label||profileCategory,popularTopicCopy[locale][profileFocus],
     ...(profileMode==="extended"&&profileDetails.trim()?[profileDetails.trim().slice(0,160)]:[])
   ].join(" · ").slice(0,300);
   onInvalidate?.();onCategoryChange?.(nextTheme);onGoalChange(nextGoal);
   setSelectedCategoryId(profileCategory);setCategoryManuallySelected(true);setSelectedGoalId(profileFocus);
   setSelectedGoalIds([profileFocus]);setSubcategoriesOpen(true);
   setSelectedSubcategoryId("");setSelectedTopicId("");setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);setIncludeMeaningCaption(false);
   setOverrideId(null);setSeconds(null);setTimelineEdits(null);setConfirmedTimelineKey(null);
   setProposalContext({goal:nextGoal,theme:nextTheme});
   setProposal(recommendAutoVideo({goal:nextGoal,goalId:profileFocus,locale,
     fallbackTheme:nextTheme,preferredTheme:nextTheme,presets,scenes}));
   setProfileMode(null);
 };
 // Interpret only when the visitor explicitly presses Design. Reuse existing
 // canonical category/topic UI and the same verified four-shot film renderer.
 const designFromRequest=()=>{
  if(disabled||!requestDraft.trim())return;
  if(videoAudience==="others"){
   if(recipientAudioMode)return;
   const inferred=classifyRecipientVideoWish(requestDraft);
   // Never replace an explicitly selected recipient category with a keyword guess.
   const kindId=recipientKindId||inferred?.kindId||"";
   const occasionId=recipientOccasionId||
     (inferred?.kindId===kindId?inferred.occasionId:"");
   if(!kindId){setPromptDesignedFor(goal);setPromptClassification(null);return;}
   chooseRecipientVideo(kindId,occasionId);
   setPromptDesignedFor(buildRecipientVideoBrief({kindId,occasionId,
     wish:requestDraft,locale}));
   return;
  }
  const inferred=classifyMyTubeRequest(requestDraft,locale);
   const classification=inferred; // Explicit Match can change a prior manual category.
  onInvalidate?.();
  setPromptClassification(classification);setPromptDesignedFor(goal);
  setRequestNeedsChoice(!classification);
  setSelectedGoalId(null);setSelectedGoalIds([]);
  // A broad context is provisional: neither the subcategory nor the specific
  // topic has been confirmed by the visitor.
  const matchLevel=(classification as (typeof classification & {matchLevel?:"category"|"context"}))?.matchLevel;
  const broad=matchLevel==="context"||matchLevel==="category";
  if(broad)setSelectedSubcategoryId("");
  else setSelectedSubcategoryId(classification?.subcategoryId||"");
  if(broad)setSelectedTopicId("");
  else setSelectedTopicId(classification?.topicId||"");
  setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");
  setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");
  setMeaningHandoff(null);setIncludeMeaningCaption(false);
  setOverrideId(null);setSeconds(null);setConfirmedTimelineKey(null);
  const nextTheme=(classification?legacyThemeForSubcategory[classification.subcategoryId]:null)||theme;
  if(classification){
   setCategoryManuallySelected(false);
   setSelectedCategoryId(classification.categoryId as CanonicalCategoryId);setSubcategoriesOpen(true);
   onCategoryChange?.(nextTheme);
  }
  if(!classification||broad){
   // Never reuse an unrelated previous-category film or silently choose
   // an exact topic for an unconfirmed broad contextual request.
   setProposal(null);setTimelineEdits(null);return;
  }
  const recommended=recommendAutoVideo({goal,locale,fallbackTheme:nextTheme,
   preferredTheme:classification?nextTheme:null,presets,scenes});
  setProposalContext({goal,theme:nextTheme});setProposal(recommended);
  setTimelineEdits(classification?timelineForTopic(
   classification.topicId,null,recommended,null,undefined,undefined,null,null,null
  ):null);
 };
 const analyzedPath=promptClassification?getMyTubeTopic(promptClassification.topicId):null;
 const requestAnalysisMeta=promptClassification as (typeof promptClassification & {
  contextLabel?:Record<"ru"|"en"|"es",string>;
  suggestedTopicIds?:readonly string[];
  matchLevel?:"category"|"context";
 });
 const broadRequestMatch=requestAnalysisMeta?.matchLevel==="context"||
  requestAnalysisMeta?.matchLevel==="category";
 const requestField=<label className={css.topicInput} data-video-request-input>
   <span className={css.srOnly}>{t.input}</span>
   <input type="text" data-auto-video-input value={requestDraft}
     maxLength={160} disabled={disabled}
     placeholder={videoAudience==="others"
       ?(locale==="ru"?"Кому и что вы хотите сказать?"
         :locale==="es"?"¿Para quién es el vídeo y qué quieres decir?"
         :"Who is it for, and what would you like to say?")
       :t.placeholder}
     onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();designFromRequest();}}}
     onChange={event=>{
       const text=event.currentTarget.value;
       const fallback=selectedTaxonomyTopic?.topic.label[locale]||
         taxonomySubcategories.find(row=>row.id===selectedSubcategoryId)?.label||"";
       const nextGoal=videoAudience==="others"
         ?buildRecipientVideoBrief({kindId:recipientKindId,occasionId:recipientOccasionId,
           wish:text,locale})
         :text.trim()||fallback;
       const recipient=videoAudience==="others"?getRecipientVideoKind(recipientKindId):null;
       const requestTheme=(recipient?.theme||theme) as VideoTheme;
       setRequestDraft(text);
       onInvalidate?.();onGoalChange(nextGoal);
       setPromptDesignedFor(null);setPromptClassification(null);
       setProposalContext({goal:nextGoal,theme:requestTheme});
       setProposal(recommendAutoVideo({goal:nextGoal,locale,fallbackTheme:requestTheme,
         preferredTheme:recipient?requestTheme:null,presets,scenes}));
       setOverrideId(null);setSeconds(null);setSelectedMeaningAxisId("");
       setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);
       setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);
       setIncludeMeaningCaption(false);setTimelineEdits(null);setConfirmedTimelineKey(null);
     }}/>
 </label>;
 const requestInput=<div className={css.requestComposer} data-video-request-composer>
  {requestField}
  <button type="button" data-video-request-design className={css.designRequest}
   disabled={disabled||!goal.trim()} onClick={designFromRequest}>
   <Sparkles size={17} aria-hidden="true"/>
   <span>{locale==="ru"?"Подобрать":locale==="es"?"Elegir":"Match"}</span>
   <ArrowRight size={17} aria-hidden="true"/>
  </button>
  {promptDesignedFor===goal?<div className={css.requestAnalysis}
   data-video-request-analysis data-confidence={promptClassification?.confidence||"unresolved"}
   role="status" aria-live="polite">
   {videoAudience==="others"?recipientKindId?<>
    <strong>{locale==="ru"?"Назначение подобрано":locale==="es"?"Finalidad seleccionada":"Purpose selected"}</strong>
    <span>{listRecipientVideoKinds(locale).find(item=>item.id===recipientKindId)?.label}
      {recipientOccasionId?" → "+(listRecipientVideoOccasions(recipientKindId,locale)
        .find(item=>item.id===recipientOccasionId)?.label||""):""}</span>
   </>:<p>{locale==="ru"?"Выберите «Подарок», «Поздравление» или «Видеопрезентация» выше.":
     locale==="es"?"Elige Regalo, Felicitación o Videopresentación arriba.":
     "Choose Gift, Greeting or Video presentation above."}</p>
   :promptClassification&&analyzedPath?<>
    <strong>{broadRequestMatch
      ?(locale==="ru"?"Направление найдено — уточните ваш запрос":locale==="es"?"Encontramos el tema — elige una opción":"Topic found — choose an aspect")
      :promptClassification.confidence==="low"?
      (locale==="ru"?"Предварительный вариант — проверьте":locale==="es"?"Propuesta preliminar — compruébala":"Provisional suggestion — please check"):
      (locale==="ru"?"Запрос разобран":locale==="es"?"Solicitud interpretada":"Request interpreted")}</strong>
    <span data-video-request-taxonomy>
     {broadRequestMatch
       ?requestAnalysisMeta?.contextLabel?.[locale]||analyzedPath.category.label[locale]
       :analyzedPath.category.label[locale]+" → "+analyzedPath.subcategory.label[locale]+" → "+analyzedPath.topic.label[locale]}
    </span>
    {broadRequestMatch?<div data-video-context-options>
      <p>{locale==="ru"?"Выберите направление, чтобы подобрать сценарий.":locale==="es"?"Elige una opción para preparar tu historia.":"Choose a direction for your story."}</p>
      <div className={css.topicChoices} role="group" aria-label={
        locale==="ru"?"Уточнение запроса":locale==="es"?"Opciones de contexto":"Context suggestions"}>
        {(requestAnalysisMeta?.suggestedTopicIds||[]).map(id=>{
          const found=getMyTubeTopic(id);
          if(!found||found.category.id!==promptClassification.categoryId)return null;
          return <button key={id} type="button" data-video-context-option={id}
            disabled={disabled} onClick={()=>chooseTaxonomyTopic(id)}>
            <span>{found.topic.label[locale]}</span>
          </button>;
        })}
      </div>
    </div>:<button type="button" className={css.requestJump} data-video-request-open-plan
     onClick={()=>document.querySelector<HTMLElement>("[data-auto-video-proposal]")?.scrollIntoView({
      behavior:"smooth",block:"start"
     })}>
     {locale==="ru"?"Посмотреть план из 4 сцен":locale==="es"?"Ver plan de 4 escenas":"See the 4-shot plan"}
     <ArrowRight size={14} aria-hidden="true"/>
    </button>}
   </>:<p data-video-request-unresolved>{locale==="ru"?
    "Тема неоднозначна. Уточните запрос или выберите категорию выше — прежний выбор не считается подходящим.":
    locale==="es"?"La petición es ambigua. Aclárala o elige una categoría arriba; no conservamos la selección anterior.":
    "This request is ambiguous. Refine it or choose a category above; the previous category is not assumed."}</p>}
  </div>:null}
 </div>;
 
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
         onChange={event=>setProfileCategory(event.currentTarget.value as CanonicalCategoryId)}>
         {videoGoalCategories.map(category=><option key={category.id} value={category.id}>
           {taxonomyCategories.find(item=>item.id===category.id)?.label||category.id}</option>)}
       </select>
     </label>
     <label>{locale==="ru"?"Что хочется почувствовать?":locale==="es"?"¿Cómo quieres sentirte?":"How would you like to feel?"}
       <select value={profileFocus} disabled={disabled}
         onChange={event=>setProfileFocus(event.currentTarget.value as keyof typeof popularTopicCopy.ru)}>
         {popularTopicIds.map(id=><option key={id} value={id}>
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
 const recipientFormatCards=[
  {id:"greeting",art:"love",Icon:Gift,
   title:locale==="ru"?"Поздравление или подарок":locale==="es"?"Felicitación o regalo":"Greeting or gift",
   desc:locale==="ru"?"Тёплое видео для близких":locale==="es"?"Vídeo para seres queridos":"A film for loved ones"},
  {id:"presentation",art:"growth",Icon:BriefcaseBusiness,
   title:locale==="ru"?"Презентация":locale==="es"?"Presentación":"Presentation",
   desc:locale==="ru"?"Проект, услуга или событие":locale==="es"?"Proyecto o servicio":"Project or service"},
  {id:"audio_visual",art:"energy",Icon:AudioLines,
   title:locale==="ru"?"Видеоряд по аудио":locale==="es"?"Vídeo desde audio":"Video from audio",
   desc:locale==="ru"?"Речь → смысл → кадры":locale==="es"?"Voz → texto → escenas":"Speech → text → scenes"}
 ] as const;
 const audienceBar=<div className={css.audienceBar} data-video-audience-switch>
     <span>{locale==="ru"?"Для кого видео?":locale==="es"?"¿Para quién?":"Who is this video for?"}</span>
     <div className={css.audienceToggle} role="group" aria-label={
       locale==="ru"?"Кому предназначено видео":locale==="es"?"Destinatario del vídeo":"Video audience"}>
       {(["self","others"] as const).map(mode=><button key={mode} type="button"
         data-auto-video-audience={mode} aria-pressed={videoAudience===mode}
         disabled={disabled} onClick={()=>changeVideoAudience(mode)}>
         {mode==="self"
           ?locale==="ru"?"Для себя":locale==="es"?"Para mí":"For myself"
           :locale==="ru"?"Для других":locale==="es"?"Para otros":"For others"}
       </button>)}
     </div>
   </div>;
 const goalPanel=<div className={css.goalPanel} data-auto-video-goal-panel>
   {audienceTarget?null:audienceBar}
   {videoAudience==="self"?<>
     <div className={css.goalChoices} role="group" aria-label={
       locale==="ru"?"Выберите цель видео":locale==="es"?"Elige tu objetivo":"Choose your video goal"}>
       {videoGoalCategories.map(item=><button type="button" key={item.id}
         data-auto-video-category={item.id} data-auto-video-category-theme={item.theme}
         aria-label={taxonomyCategories.find(category=>category.id===item.id)?.label||item.id}
         aria-pressed={selectedCategoryId===item.id&&!requestNeedsChoice} disabled={disabled}
         onClick={()=>chooseCategory(item.theme,item.id)}>
         {/* Cropped approved artwork is illustrative; underlying canonical category IDs are preserved. */}
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img data-video-goal-art src={"/images/video-goal-art/"+item.art+".webp"} alt="" loading="lazy"/>
       <span className={css.categoryIcon}><item.Icon size={21} aria-hidden="true"/></span>
       <strong>{goalCardLabels[locale][item.id]}</strong>
         {selectedCategoryId===item.id&&!requestNeedsChoice?<span className={css.categorySelected} aria-hidden="true">
           <Check size={15} strokeWidth={3}/></span>:null}
       </button>)}
     </div>
     {subcategoriesOpen&&!requestNeedsChoice?<div className={css.subcategories} data-auto-video-subcategories>
       <p className={css.popularHeading} data-video-goal-category-title>{locale==="ru"?"2. Выберите подкатегорию":locale==="es"?"2. Elige una subcategoría":"2. Choose a subcategory"}</p>
       <div className={css.topicChoices} role="group" data-mytube-subcategories
         aria-label={locale==="ru"?"Подкатегории цели":locale==="es"?"Subcategorías":"Goal subcategories"}>
         {taxonomySubcategories.map(item=><button type="button" key={item.id}
           data-auto-video-subcategory={item.id} aria-pressed={selectedSubcategoryId===item.id}
           disabled={disabled} title={item.chooseWhen}
           onClick={()=>chooseTaxonomySubcategory(item.id)}><span>{item.label}</span></button>)}
       </div>
     </div>:null}
   </>:<div className={css.recipientCatalog} data-video-recipient-catalog data-video-recipient-aspect={aspect}>
     <h3 className={css.recipientFormatTitle}>{locale==="ru"?"Выберите формат видео для других":locale==="es"?"Elige el formato":"Choose a video format"}</h3>
     <div className={css.recipientKinds} role="group" aria-label={locale==="ru"?"Формат видео для других":locale==="es"?"Formato de vídeo":"Video format"}>
       {recipientFormatCards.map(item=>{
         const Icon=item.Icon;
         const selected=item.id==="audio_visual"?recipientAudioMode:item.id==="greeting"
          ?!recipientAudioMode&&(recipientKindId==="gift"||recipientKindId==="greeting")
          :!recipientAudioMode&&recipientKindId==="presentation";
         return <button type="button" key={item.id} data-auto-video-recipient-kind={item.id}
           aria-pressed={selected} disabled={disabled}
           onClick={()=>item.id==="audio_visual"?chooseRecipientAudio():chooseRecipientVideo(item.id)}>
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img className={css.recipientFormatArt} src={"/images/video-goal-art/"+item.art+".webp"} alt="" loading="lazy"/>
           <span className={css.recipientFormatBody}><Icon size={18} aria-hidden="true"/>
             <strong>{item.title}</strong><small>{item.desc}</small></span>
           {selected?<span className={css.recipientFormatSelected} aria-hidden="true"><Check size={15}/></span>:null}
         </button>;
       })}
     </div>
     <p className={css.recipientHint} data-video-recipient-format-note>
       {aspect==="portrait"
         ?(locale==="ru"?"Формат 9:16 — настоящие вертикальные кадры без обрезки.":
           locale==="es"?"Formato 9:16 · clips verticales reales, sin recortes.":
           "9:16 format · real vertical footage, not cropped.")
         :(locale==="ru"?"Для этого формата нет подтверждённых кадров. Выберите 9:16.":
           locale==="es"?"No hay clips verificados para este formato. Elige 9:16.":
           "No verified footage for this format. Select 9:16.")}
     </p>
     {!recipientAudioMode&&(recipientKindId==="gift"||recipientKindId==="greeting")?
       <div className={css.recipientPurposeSwitch} role="group" aria-label={locale==="ru"?"Поздравление или подарок":locale==="es"?"Felicitación o regalo":"Greeting or gift"}>
         {(["greeting","gift"] as const).map(kind=><button type="button" key={kind} data-video-recipient-celebration={kind}
           aria-pressed={recipientKindId===kind} disabled={disabled} onClick={()=>chooseRecipientVideo(kind)}>
           {listRecipientVideoKinds(locale).find(v=>v.id===kind)?.label}
         </button>)}
       </div>:null}
     {recipientAudioMode?recipientAudioPanel:recipientKindId?<div className={css.recipientOccasions}>
       <p className={css.popularHeading}>{locale==="ru"?"Уточните назначение":
         locale==="es"?"Elige una ocasión":"Choose an occasion"}</p>
       <div className={css.recipientOptionChoices} role="group" aria-label={
         locale==="ru"?"Назначение видео":locale==="es"?"Ocasión":"Occasion"}>
         {listRecipientVideoOccasions(recipientKindId,locale).map(item=><button
           type="button" key={item.id} data-auto-video-recipient-occasion={item.id}
           aria-pressed={recipientOccasionId===item.id} disabled={disabled}
           onClick={()=>chooseRecipientVideo(recipientKindId,item.id)}>{item.label}</button>)}
       </div>
       <p className={css.recipientHint}>{locale==="ru"
         ?"Подберём символические кадры и первые титры. Свой текст можно изменить в монтаже."
         :locale==="es"?"Propondremos escenas simbólicas y textos que puedes editar durante el montaje."
         :"We'll suggest symbolic footage and editable video captions."}</p>
     </div>:<p className={css.recipientHint}>{locale==="ru"
       ?"Выберите подарок, поздравление или видеопрезентацию."
       :locale==="es"?"Elige regalo, felicitación o videopresentación."
       :"Choose Gift, Greeting or Video presentation."}</p>}
   </div>}
   {videoAudience==="others"&&recipientContinueError?<p role="status" data-video-recipient-continue-error>{recipientContinueError}</p>:null}
 </div>;
 const visibleQuickTopicIds=requestNeedsChoice?[]:[...new Set([
   ...(selectedSubcategoryId?taxonomyTopics.map(item=>item.id):[]),
   ...goalTopicIds[selectedCategoryId]
  ])].slice(0,6);
 const quickTopicPanel=videoAudience==="others"
  ?<div className={css.recipientTopicSummary} data-video-optional-topic-field data-video-recipient-topic-summary>
     <span>{locale==="ru"?"2. Тема видео":locale==="es"?"2. Tema":"2. Video topic"}</span>
     <strong>{recipientAudioMode
       ?(locale==="ru"?"Видеоряд по вашей речи":locale==="es"?"Vídeo de tu voz":"Footage from speech")
       :recipientKindId
       ?listRecipientVideoKinds(locale).find(item=>item.id===recipientKindId)?.label
         +(recipientOccasionId?" · "+(listRecipientVideoOccasions(recipientKindId,locale)
           .find(item=>item.id===recipientOccasionId)?.label||""):"")
       :locale==="ru"?"Выберите назначение выше":locale==="es"?"Elige un tipo arriba":"Choose a type above"}</strong>
   </div>
  :<>
  <div data-video-goal-topic-chips role="group"
    aria-label={locale==="ru"?"Темы видео":locale==="es"?"Temas del vídeo":"Video topics"}>
    {visibleQuickTopicIds.map(id=>{
      const item=getMyTubeTopic(id);
      if(!item||item.category.id!==selectedCategoryId)return null;
      const fullLabel=item.topic.label[locale];
      const shortLabels=quickTopicLabels[locale] as Partial<Record<string,string>>;
      return <button type="button" key={id} data-video-goal-topic={id}
        aria-pressed={selectedTopicId===id} aria-label={fullLabel} title={fullLabel}
        disabled={disabled} onClick={()=>chooseTaxonomyTopic(id)}>
        <span>{shortLabels[id]||fullLabel}</span>
        {selectedTopicId===id?<Check size={15} aria-hidden="true"/>:null}
      </button>;
    })}
  </div>
<label className={css.optionalTopic} data-video-optional-topic-field>
   <span>{locale==="ru"?"2. Тема (по желанию)":
     locale==="es"?"2. Tema (opcional)":"2. Topic (optional)"}</span>
   <select data-video-optional-topic disabled={disabled||!selectedSubcategoryId}
     value={selectedTopicId}
     onChange={event=>{
       const topicId=event.currentTarget.value;
       if(topicId)chooseTaxonomyTopic(topicId);
       else if(selectedSubcategoryId)chooseTaxonomySubcategory(selectedSubcategoryId);
     }}>
     <option value="">{selectedSubcategoryId?
       (locale==="ru"?"Подобрать автоматически":locale==="es"?"Elegir automáticamente":"Choose automatically"):
       (locale==="ru"?"Сначала выберите подкатегорию":locale==="es"?"Primero elige la subcategoría":"Choose a subcategory first")}</option>
     {taxonomyTopics.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
   </select>
 </label>
  </>;
 const montageStylePanel=<section className={css.montageStyle} data-mytube-style-filter>
   {selectedMeaningAxisId&&suggestedVisualMotifs.length===4?<div className={css.notice} data-mytube-creative-choices>
     <strong>{locale==="ru"?"Мотив — выберите один из четырёх образов":
       locale==="es"?"Motivo — una de cuatro imágenes":"Motif — one of four symbolic images"}</strong>
     <div className={css.topicChoices} role="group" data-mytube-motif-choices>
       {suggestedVisualMotifs.map(m=><button key={m.id} type="button" data-mytube-motif={m.id}
         aria-pressed={selectedMotifId===m.id} title={m.meaning}
         disabled={disabled} onClick={()=>chooseTaxonomyMotif(m.id)}>{m.label}</button>)}
     </div>


   </div>:null}
   <details className={css.storyboardDisclosure} data-mytube-style-advanced>
     <summary>{locale==="ru"?"Уточнить подбор стиля по сценарию (необязательно)":
       locale==="es"?"Ajustar el estilo según el guion (opcional)":
       "Refine style matching for the story (optional)"}</summary>
   <div className={css.montageStyleChoices} role="group" data-mytube-style-choices
     aria-label={locale==="ru"?"Стиль видео":locale==="es"?"Estilo del vídeo":"Video style"}>
     <button type="button" data-mytube-style="auto" aria-pressed={!selectedStyleId}
       disabled={disabled} onClick={()=>chooseCreativeVisuals(selectedMotifId||"","")}>
       {locale==="ru"?"Авто":locale==="es"?"Auto":"Auto"}</button>
     {availableVisualStyles.map(style=><button type="button" key={style.id}
       data-mytube-style={style.id} aria-pressed={selectedStyleId===style.id}
       title={style.description} disabled={disabled}
       onClick={()=>chooseCreativeVisuals(selectedMotifId||"",selectedStyleId===style.id?"":style.id)}>
       {style.label}</button>)}
   </div>
   </details>
   {selectedScenarioId&&creativeSelectionUnavailable?<p className={css.warning} role="status"
     data-mytube-creative-availability>
     {locale==="ru"?"Подходящих разрешённых клипов для выбранного стиля недостаточно.":
       locale==="es"?"Faltan clips aprobados para el estilo elegido.":
       "Not enough approved footage for the selected style."}
   </p>:null}
 </section>;
 const topicPanel=<div className={css.topicPanel} data-auto-video-topic-panel>
   <div className={css.topicHead}>
     <h3><Leaf size={19} aria-hidden="true"/>
       {locale==="ru"?"Уточните тему, смысл и сценарий":locale==="es"?"Precisa la idea y el guion":"Refine the theme, meaning and story"}</h3>
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
   {selectedSubcategoryId?<>
     <p className={css.popularHeading}>{locale==="ru"?"Тема — выберите конкретный запрос":locale==="es"?"Tema — elige una necesidad concreta":"Theme — choose a specific need"}</p>
     <div className={css.topicChoices} role="group" aria-label={locale==="ru"?"Темы подкатегории":"Subcategory themes"} data-auto-video-themes>
       {taxonomyTopics.map(item=><button key={item.id} type="button" data-auto-video-topic={item.id}
         aria-pressed={selectedTopicId===item.id} disabled={disabled} title={item.searchTerms.join(" · ")}
         onClick={()=>chooseTaxonomyTopic(item.id)}><span>{item.label}</span></button>)}
     </div>
   </>:null}
   {selectedTopicId?<div className={css.notice} data-mytube-meaning-choices>
     <strong>{locale==="ru"?"Смысл — выберите один из восьми векторов":
       locale==="es"?"Sentido — elige uno de ocho ejes":"Meaning — choose one of eight axes"}</strong>
     <div className={css.topicChoices} role="group" data-mytube-meaning-axes>
       {taxonomyMeanings.map(axis=><button key={axis.id} type="button" data-mytube-meaning-axis={axis.id}
         aria-pressed={selectedMeaningAxisId===axis.id} title={axis.description}
         disabled={disabled} onClick={()=>chooseMeaningAxis(axis.id)}>{axis.label}</button>)}
     </div>
   </div>:null}
   {MEANING_ENABLED&&selectedTopicId&&selectedMeaningAxisId?<MandalaMeaningIdeaSelector
     key={selectedTopicId+":"+selectedMeaningAxisId} locale={locale} topicId={selectedTopicId} disabled={disabled}
     initialAxisId={selectedMeaningAxisId} canChooseScenario={Boolean(selectedMotifId)}
     selectedScenarioId={selectedScenarioId}
     onConfirmHandoff={(next,caption)=>{
       setMeaningHandoff(next);setIncludeMeaningCaption(caption);setConfirmedTimelineKey(null);
     }}
     onChooseScenario={chooseTaxonomyScenario}/>:null}
   {STSE_ENABLED&&!MEANING_ENABLED&&selectedTopicId&&selectedMeaningAxisId&&selectedMotifId?<StateTransitionSelector
     key={selectedTopicId} locale={locale} topicId={selectedTopicId} disabled={disabled}
     allowEditorialDrafts={false}
     selectedScenarioId={selectedScenarioId}
     onChooseScenario={(scenarioId,context)=>{
       chooseTaxonomyScenario(scenarioId);
       setTransitionSelection(context?{scenarioId,...context}:null);
     }}/>:null}
   {selectedTopicId&&selectedMotifId&&taxonomyScenarios.length===4?<div className={css.storyChoices} data-mytube-scenario-concepts>
     <p className={css.variantsTitle}>{locale==="ru"?"Четыре сценария для выбранного мотива":locale==="es"?"Cuatro guiones del motivo":"Four film scenarios for this motif"}</p>
     {taxonomyScenarios.map((scenario,index)=>{
       const coverage=recommendMyTubeTopicStoryClips({topicId:selectedTopicId,
         scenarioId:scenario.id,scenes,excludedMotifs:proposal?.excludedMotifs||[],
         motifId:selectedMotifId,meaningAxisId:selectedMeaningAxisId,targetAspect:aspect});
       return <button key={scenario.id} type="button"
       data-mytube-scenario={scenario.id} aria-pressed={selectedScenarioId===scenario.id}
       disabled={disabled} onClick={()=>chooseTaxonomyScenario(scenario.id)}>
       <span className={css.storyNumber}>{index+1}. {selectedScenarioId===scenario.id?<Check size={15} aria-hidden="true"/>:null}</span>
       <strong>{scenario.label}</strong>
       <small>{scenario.creativeBrief}</small>
       <small data-scenario-source-coverage={coverage.candidateCount}>
         {locale==="ru"?`Подходящих видеофрагментов: ${coverage.candidateCount}; для монтажа нужно минимум 4`:
          locale==="es"?`Clips relacionados: ${coverage.candidateCount}; se necesitan al menos 4`:
          `Matching clips: ${coverage.candidateCount}; at least 4 required`}
       </small>
       <small>{locale==="ru"?"Концепция сценария; готовый видеоряд проверяется отдельно.":locale==="es"?"Concepto del escenario; el material de vídeo se verifica por separado.":"Scenario concept; matching footage is verified separately."}</small>
     </button>;
     })}
   </div>:null}
   {selectedScenarioId&&taxonomyScenarios.some(item=>item.id===selectedScenarioId)?
     <div className={css.notice} data-mytube-concept-storyboard>
       <strong>{locale==="ru"?"Четыре смысловых этапа сценария":locale==="es"?"Cuatro etapas narrativas del escenario":"Four narrative beats of the scenario"}</strong>
       <ol>{taxonomyScenarios.find(item=>item.id===selectedScenarioId)?.sceneOutline.map((beat,index)=>
         <li key={index}>{index+1}. {beat}</li>)}</ol>
       <small>{locale==="ru"?"Это творческая концепция; перед экспортом проверьте реальные кадры ниже.":
         locale==="es"?"Este es un concepto creativo; revisa los clips reales antes de exportar.":
         "This is a creative concept; review the actual clips below before export."}</small>
     </div>:null}
   {semanticRequired?<div className={semanticReady?css.notice:css.warning}
     role="status" data-emotional-scene-plan
     data-status={semanticPlan?.status||"NEEDS_EMOTIONAL_SELECTION"}>
     <strong>{locale==="ru"?"Эмоциональная партитура и план кадров":
       locale==="es"?"Partitura emocional y plan de tomas":"Emotional score and shot plan"}</strong>
     <p>{semanticReady
       ?(locale==="ru"?semanticPlan!.sceneCount+" реальных кадров за "+length+" сек.; четыре смысловые фазы. Совпадение редакционных тегов не доказывает буквальных действий.":
         locale==="es"?semanticPlan!.sceneCount+" tomas en "+length+" s. Las etiquetas no verifican las acciones.":
         semanticPlan!.sceneCount+" local footage cuts in "+length+"s; tagged but not frame-verified.")
       :(locale==="ru"?"Не хватает подтверждённого эмоционального перехода или проверенных клипов: ":
         locale==="es"?"Falta la transición o material verificado: ":"Missing confirmed transition or approved footage: ")+
         (semanticPlan?.status||"NEEDS_EMOTIONAL_SELECTION")}</p>
     {semanticReady?<details data-emotional-shot-details>
       <summary>{locale==="ru"?"Просмотреть покадровый план":
         locale==="es"?"Ver la lista de tomas":"Review the shot-by-shot plan"}</summary>
       <ol>{semanticPlan!.shots.map(shot=><li key={shot.number}>
         {shot.number}. {shot.durationSeconds} s · {sceneLabel(shot.sceneId)} ·
         {" "+shot.emotionalStageId+" · "+shot.requiredTags.slice(0,5).join(", ")}
       </li>)}</ol>
     </details>:categoryPlan.ok?
       <button type="button" data-emotional-symbolic-fallback
         disabled={disabled} onClick={useAvailableSymbolicCategory}>
         {locale==="ru"?"Выбрать общий символический ролик из доступных MP4":
           locale==="es"?"Usar un vídeo simbólico con clips disponibles":
           "Use an available symbolic video instead"}
       </button>:aspect!=="portrait"?<p>
       {locale==="ru"?"В каталоге нет подтверждённых горизонтальных исходников. Для доступных роликов выберите формат 9:16.":
         locale==="es"?"No hay fuentes horizontales verificadas. Prueba el formato 9:16.":
         "No verified landscape footage is available. Try the 9:16 portrait format."}
     </p>:null}
   </div>:null}
   {selectedScenarioId&&plotsLoading?<p className={css.notice} data-mytube-plots-loading aria-live="polite">
     {locale==="ru"?"Открываем четыре сюжета сценария…":locale==="es"?"Cargando cuatro tramas del escenario…":"Loading four plots for this scenario…"}
   </p>:null}
   {selectedScenarioId&&!plotsLoading&&taxonomyPlots.length===4?
     <div className={css.storyChoices} role="group" data-mytube-plot-choices
       aria-label={locale==="ru"?"Четыре разных сюжета выбранного сценария":locale==="es"?"Cuatro tramas diferentes":"Four distinct plots"}>
       <p className={css.variantsTitle}>
         {locale==="ru"?"Сюжеты: выберите одну из четырёх самостоятельных историй":
          locale==="es"?"Tramas: elige una de las cuatro historias":"Plots: choose one of four separate stories"}
       </p>
       {taxonomyPlots.map((plot,index)=><button type="button" key={plot.id} data-mytube-plot={plot.id}
         aria-pressed={selectedPlotId===plot.id} disabled={disabled}
         onClick={()=>chooseTaxonomyPlot(plot.id)}>
         <span className={css.storyNumber}>{index+1}. {selectedPlotId===plot.id?<Check size={15} aria-hidden="true"/>:null}</span>
         <strong>{plot.label}</strong>
         <small>{plot.modeLabel}</small>
         <small>{plot.synopsis}</small>
       </button>)}
     </div>:null}
   {STSE_DRAFTS_ENABLED&&stseScenario?.newExpansion?<p role="status" className={css.warning} data-stse-media-unbound>
     {locale==="ru"?"Новый сценарий ожидает редакционной проверки и привязки реальных разрешённых видеосцен. Экспорт пока отключён.":
       locale==="es"?"Este nuevo guion espera revisión editorial y vídeo autorizado. La exportación está desactivada.":
         "This new script awaits editorial review and licensed footage binding. Export is disabled."}
   </p>:null}
   {selectedScenarioId&&!plotsLoading&&plotData?.scenarioId===selectedScenarioId&&taxonomyPlots.length!==4?
     <p className={css.warning} data-mytube-plots-unavailable>
       {locale==="ru"?"Четыре сюжета пока недоступны; сценарий остаётся без выбранного сюжета.":
        locale==="es"?"Las cuatro tramas no están disponibles; no se ha elegido ninguna.":
        "Four plots are unavailable; no plot has been selected."}
     </p>:null}
   {selectedTaxonomyPlot?<div className={selectedPlotMedia?.hasFourApprovedSources?css.notice:css.warning}
     role="status" data-mytube-plot-media-status
      data-mytube-plot-media-origin={selectedPlotMedia?.hasOriginalAbstractMotion?"includes-original-abstract-animation":"filmed-or-general"}
     data-ready={selectedPlotMedia?.hasFourApprovedSources||fallbackEnabled?"true":"false"}
     data-plot-media-mode={selectedPlotMedia?.hasFourApprovedSources?"topic-symbolic":
       fallbackEnabled?"caption-symbolic":"insufficient"}>
     {selectedPlotMedia?.hasFourApprovedSources
       ?(locale==="ru"?`Для символического предпросмотра подобраны 4 проверенных MP4 из ${selectedPlotMedia.candidateCount} тематических кандидатов. ${selectedPlotMedia.hasOriginalAbstractMotion?"Включена оригинальная абстрактная анимация. ":""}События истории в кадрах не подтверждены.`:
         locale==="es"?`Seleccionados 4 MP4 aprobados entre ${selectedPlotMedia.candidateCount} candidatos temáticos. ${selectedPlotMedia.hasOriginalAbstractMotion?"Incluyen animación abstracta original. ":""}Interpretación simbólica, no escenas exactas verificadas.`:
         `4 approved MP4s selected from ${selectedPlotMedia.candidateCount} topic candidates. ${selectedPlotMedia.hasOriginalAbstractMotion?"Includes original abstract animation. ":""}Symbolic preview, not verified plot actions.`)
       :fallbackEnabled?(locale==="ru"?
          "Вы выбрали символический видеоряд с четырьмя сюжетными титрами. Фоновое видео лицензировано, но не изображает действия сюжета буквально.":
          locale==="es"?"Elegiste un vídeo simbólico con cuatro subtítulos narrativos. Los clips están aprobados, pero no representan literalmente la trama.":
          "You chose a symbolic licensed montage with four plot captions. Clips do not literally depict the story events.")
       :(locale==="ru"?`Недостаточно проверенных тематических MP4: ${selectedPlotMedia?.candidateCount??0} из 4. Экспорт выбранного сюжета недоступен; можно снять его выбор и сделать общий символический ролик.`:
         locale==="es"?`Solo hay ${selectedPlotMedia?.candidateCount??0} de 4 clips aprobados. Esta trama no se puede exportar; quita su selección para un vídeo simbólico general.`:
         `Only ${selectedPlotMedia?.candidateCount??0} of 4 approved topic clips. Plot export is unavailable; deselect it for a general symbolic film.`)}
     {!selectedPlotMedia?.hasFourApprovedSources?<button type="button"
       data-mytube-symbolic-caption-fallback disabled={disabled||!fallbackSourcesValid}
       aria-pressed={fallbackEnabled} onClick={enableSymbolicPlotFallback}>
       {locale==="ru"?"Использовать символические кадры и титры сюжета":
        locale==="es"?"Usar clips simbólicos con subtítulos de la trama":
        "Use symbolic clips and plot captions"}
     </button>:null}
     <button type="button" data-mytube-clear-plot disabled={disabled}
       onClick={()=>chooseTaxonomyScenario(selectedScenarioId)}>
       {locale==="ru"?"Снять выбор сюжета":locale==="es"?"Quitar selección de trama":"Deselect plot"}
     </button>
   </div>:null}
   {selectedTaxonomyPlot?<div className={css.notice} data-mytube-selected-plot-outline>
     <strong>{locale==="ru"?"Сюжет и четыре события":locale==="es"?"Trama y cuatro acontecimientos":"Selected plot and four events"}: {selectedTaxonomyPlot.label}</strong>
     <p>{selectedTaxonomyPlot.synopsis}</p>
     <ol>{selectedTaxonomyPlot.beats.map((beat,index)=><li key={index}>{index+1}. {beat}</li>)}</ol>
     <small>{locale==="ru"?"Вектор изменения: ":locale==="es"?"Vector de cambio: ":"Transformation vector: "}{selectedTaxonomyPlot.transformationIdea}</small>
     <small data-mytube-plot-media-disclaimer>
       {locale==="ru"?"Это сюжетная идея, а не готовое видео. MP4 подбираются по теме, сценарию и визуальным подсказкам сюжета; сами события в кадрах не подтверждены.":
        locale==="es"?"Es una idea creativa, no un vídeo terminado. Los MP4 se eligen por tema, escenario y pistas visuales; los acontecimientos exactos no están verificados.":
        "This is an editorial plot, not finished footage. Approved MP4s are ranked by topic, scenario and visual cues; the events themselves are not verified."}
     </small>
   </div>:null}
   {refineOpen?<div className={css.refinePanel} data-auto-video-refine-panel>
     <label htmlFor="auto-video-refine">{t.refine}</label>
     <textarea id="auto-video-refine" rows={2} maxLength={120}
       disabled={disabled} value={refineText} onChange={event=>setRefineText(event.currentTarget.value)}/>
     <button type="button" disabled={disabled||!refineText.trim()} onClick={()=>{
       const next=[goal.trim(),refineText.trim()].filter(Boolean).join(". ").slice(0,160);
       onInvalidate?.();onGoalChange(next);
       setProposal(recommendAutoVideo({goal:next,locale,fallbackTheme:theme,presets,scenes}));
       setProposalContext({goal:next,theme});
       setSelectedTopicId("");setSelectedMeaningAxisId("");setSelectedScenarioId("");setSelectedPlotId("");setSymbolicPlotFallback(false);setSelectedMotifId("");setSelectedStyleId("");setMeaningHandoff(null);setIncludeMeaningCaption(false);setOverrideId(null);setRefineOpen(false);setRefineText("");
       setTimelineEdits(null);setConfirmedTimelineKey(null);
     }}>{t.addRefine}<ArrowRight size={15} aria-hidden="true"/></button>
   </div>:null}
   <div className={css.popularRecommendations} data-auto-video-popular-topics>
     <p className={css.popularHeading}>{locale==="ru"?"Популярные темы — выберите или напишите свою":
       locale==="es"?"Temas populares: elige o escribe el tuyo":
       "Popular themes — choose one or write your own"}</p>
     <div className={css.popularTopics} role="group" aria-label={
       locale==="ru"?"Популярные темы":locale==="es"?"Temas populares":"Popular themes"}>
       {popularTopicIds.map(id=>{
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
       data-auto-video-all-scenes disabled={disabled} onClick={onShowAll}>
       {locale==="ru"?"Все сценарии":locale==="es"?"Todas las escenas":"All stories"}
       <ArrowRight size={16} aria-hidden="true"/>
     </button>:null}
   </div>
   {requestTarget?createPortal(requestInput,requestTarget):requestInput}
   {profileTarget?createPortal(profilePanel,profileTarget):profilePanel}
   {goalTarget?createPortal(goalPanel,goalTarget):goalPanel}
   {audienceTarget?createPortal(audienceBar,audienceTarget):null}
   {topicTarget?createPortal(quickTopicPanel,topicTarget):null}
   {ideaTarget?createPortal(<details ref={bindIdeaRefinement}
     className={css.ideaRefinement} data-video-ideas-refinement
     onToggle={event=>{
       if(event.currentTarget===ideaRefinementNodeRef.current)
         ideaRefinementOpenRef.current=event.currentTarget.open;
     }}>
     <summary onClick={event=>{
       // WebKit can lose the native <details> default toggle when React
       // reconciles this portal after a workspace change. Commit the actual
       // user's click before Safari's deferred toggle and preserve it if the
       // portal is remounted. Keyboard activation also dispatches click.
       event.preventDefault();
       const node=event.currentTarget.parentElement;
       if(node instanceof HTMLDetailsElement){
         node.open=!node.open;
         ideaRefinementOpenRef.current=node.open;
       }
     }}>{locale==="ru"?"Уточнить тему, смысл и сценарий (по желанию)":
       locale==="es"?"Explorar tema, significado y guion (opcional)":
       "Refine topic, meaning and story (optional)"}</summary>
     {topicPanel}
   </details>,ideaTarget):null}
   {montageTarget?createPortal(montageStylePanel,montageTarget):null}
   {showProposal&&proposal?<div className={css.result} data-auto-video-proposal aria-live="polite">
   <div className={css.notice} data-mytube-category-storyboard
     data-storyboard-status={categoryPlan.status}>
     <strong>{locale==="ru"?"Раскадровка по категории":locale==="es"?
       "Storyboard por categoría":"Category storyboard"} ·
       {" "}{aspect==="portrait"?"9:16":aspect==="landscape"?"16:9":"1:1"}</strong>
     <ol>{categoryPlan.stages.map((stage:{stage:number;name:string;purpose:string;requiredTags:string[]})=><li key={stage.stage}>
       <strong>{stage.stage}. {stage.name}</strong>
       <small>{" · "+stage.requiredTags.slice(0,4).join(" · ")}</small>
       <p><small>{stage.purpose}</small></p>
     </li>)}</ol>
     <p role="status">{categoryPlan.ok
       ?(locale==="ru"?"Подобраны "+categoryPlan.shots.length+" разных MP4; для экспорта нужна проверка монтажа.":
         locale==="es"?"Se sugieren "+categoryPlan.shots.length+" clips únicos; se requiere verificar el montaje.":
         categoryPlan.shots.length+" different MP4s suggested; export needs montage verification.")
       :(locale==="ru"?"Недостаточно подтверждённых уникальных видео нужного формата и стиля. Повторы запрещены.":
         locale==="es"?"No hay suficientes vídeos únicos verificados para este formato y estilo.":
         "Insufficient unique verified media for this aspect and style. No repeating footage.")}</p>
     {categoryPlan.ok&&categoryPlan.shots.some((shot:{symbolicFallback?:boolean})=>shot.symbolicFallback)
       ?<p role="note">{locale==="ru"?"Некоторые кадры подходят только символически: показанное действие требует визуальной проверки.":
         locale==="es"?"Algunas escenas son simbólicas y necesitan revisión visual.":
         "Some footage is only a symbolic match and still needs visual review."}</p>:null}
     {!physicalClipReady?<p role="status">{locale==="ru"
       ?"Четырёхклиповый экспорт пока заблокирован: нужен подходящий формат и достаточная длительность каждого MP4.":
       locale==="es"?"Exportación de cuatro clips bloqueada hasta contar con material del formato y duración correctos.":
       "Four-clip export blocked until physical format and source durations are verified."}</p>:null}
   </div>
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
           (locale==="ru"?"Подобраны 4 проверенных видеофрагмента по выбранной теме (в том числе возможна абстрактная анимация). Сюжет и монтаж ещё требуют проверки.":
             locale==="es"?"4 clips verificados seleccionados por tema (pueden incluir animación abstracta). Falta revisar la narrativa y el montaje.":
               "4 verified clips selected for this topic (may include abstract animation). Story and edit still need review."):
           (locale==="ru"?`По теме найдено ${topicMediaCoverage.candidateCount} из 4 нужных видеофрагментов. Показан общий символический монтаж, а не готовый тематический сюжет.`:
             locale==="es"?`Encontrados ${topicMediaCoverage.candidateCount} de 4 clips. Vista previa de montaje simbólico general, no un guion temático terminado.`:
               `${topicMediaCoverage.candidateCount} of 4 topic-matched clips. Showing general symbolic montage, not a finished topic-specific video.`)}
       </p>:null}
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
               setOverrideId(id===proposal.presetId?null:id);
               const nextPreset=presets.find(item=>item.id===id);
               const fallbackClips=fallbackEnabled&&selectedTaxonomyPlot&&nextPreset&&
                 validateMontageClips([...nextPreset.clips],scenes,proposal.excludedMotifs);
               setTimelineEdits(fallbackClips&&nextPreset&&selectedTaxonomyPlot?
                 {presetId:id,totalSeconds:length,clipIds:[...nextPreset.clips],
                  durations:allocateAdaptiveFilmTimeline(length,nextPreset.clips).map(shot=>shot.durationSeconds),
                  captions:selectedTaxonomyPlot.beats.map(text=>Array.from(text).slice(0,STAGE_CAPTION_LIMIT).join(""))}:
                 selectedTaxonomyPlot&&selectedTopicId&&!fallbackEnabled?
                 timelineForTopic(selectedTopicId,selectedScenarioId,proposal,selectedTaxonomyPlot,
                   length as 10|15|20|30|60,id):null);
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
             <b>{index+1}. {t.stages[Math.min(3,Math.floor(index*4/stageClipIds.length))]} · {stageDurations[index]} s</b><span>{sceneLabel(clip)}</span>
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
               <strong>{index+1}. {t.stages[Math.min(3,Math.floor(index*4/stageClipIds.length))]} · {stageDurations[index]} s</strong>
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
               <button type="button" disabled={disabled||index===stageClipIds.length-1}
                 aria-label={t.reorder+" → "+sceneLabel(clip)}
                 onClick={()=>swapScene(index,1)}>→</button>
               {index<stageClipIds.length-1?<button type="button" disabled={disabled||stageDurations[index]<=2}
                 aria-label={t.less+" "+sceneLabel(clip)}
                 onClick={()=>shiftBoundary(index,-1)}>−1s</button>:null}
               {index<stageClipIds.length-1?<button type="button" disabled={disabled||stageDurations[index+1]<=2}
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
               <span>{index+1}. {t.stages[Math.min(3,Math.floor(index*4/stageClipIds.length))]} · {stageDurations[index]} s</span>
               <input type="text" data-auto-video-stage-caption={index}
                 maxLength={STAGE_CAPTION_LIMIT} disabled={disabled}
                 value={stageCaptions[index]||""}
                 onChange={event=>{
                   const value=event.currentTarget.value;
                   setRecipientCaptionOverrides(old=>({...old,[index]:value}));
                   const captions=[...stageCaptions];
                   captions[index]=value;
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
               setSeconds(n);
               setTimelineEdits(fallbackEnabled&&selectedTaxonomyPlot&&chosen?
                 {presetId:chosen.id,totalSeconds:n,clipIds:[...chosen.clips],
                  durations:allocateAdaptiveFilmTimeline(n,chosen.clips).map(shot=>shot.durationSeconds),
                  captions:selectedTaxonomyPlot.beats.map(text=>Array.from(text).slice(0,STAGE_CAPTION_LIMIT).join(""))}:
                 selectedTaxonomyPlot&&selectedTopicId&&proposal?
                 timelineForTopic(selectedTopicId,selectedScenarioId,proposal,selectedTaxonomyPlot,n,
                   chosen?.id):null);
               setConfirmedTimelineKey(null);}}>{n} s</button>)}
         </div>
       </details>
       </details>
       {meaningHandoff?.status==="editorial_only"?<div className={css.notice}
         data-meaning-idea-film-intent>
         <strong>{locale==="ru"?"Подтверждённая идея":locale==="es"?"Idea confirmada":"Confirmed idea"}:</strong>
         {" "+(meaningHandoff.ideaBrief?.ideaText||"")}
         {meaningCaptionUsed?<p data-meaning-caption-preview>
           {locale==="ru"?"Будет добавлен финальный титр":locale==="es"?"Se añadirá el subtítulo final":"Final caption to be added"}:
           {" "+meaningCaption}</p>:null}
         {lastCaptionTaken&&includeMeaningCaption?<p>
           {locale==="ru"?"Ваш собственный финальный титр сохранён без изменений.":
             locale==="es"?"Tu subtítulo final se conserva sin cambios.":
               "Your existing final caption is preserved unchanged."}</p>:null}
         {meaningCaptionTooLong?<p role="alert" data-meaning-caption-overflow className={css.warning}>
           {locale==="ru"?"Смысловая идея слишком длинная для титра. Сократите формулировку или отключите титр.":
             locale==="es"?"La idea es demasiado larga para el subtítulo. Acórtala o desactívalo.":
               "The idea is too long for a caption. Shorten the wording or disable the caption."}</p>:null}
       </div>:null}
       <button type="button" data-auto-video-confirm className={css.confirm}
         disabled={disabled||plotLacksApprovedClips} onClick={()=>{
           if(meaningCaptionTooLong)return;
           const accepted=onApply(chosen.id,length as 10|15|20|30|60,{
             clipIds:stageClipIds,durationSecondsByStage:stageDurations,
             excludedMotifs:proposal.excludedMotifs,captionTexts:stageCaptions,
             ...(semanticReady&&semanticPlan?.pathId&&semanticPlan?.emotionalAxisId&&
                semanticPlan?.emotionalEnvelope?{semanticScenePlan:{
                  pathId:semanticPlan.pathId,
                  emotionalAxisId:semanticPlan.emotionalAxisId,
                  pace:semanticPlan.emotionalEnvelope.pace,
                  shots:stageClipIds.map((sceneId,index)=>({
                    sceneId,beatIndex:semanticPlan.shots[index].beatIndex,
                    strategyId:semanticPlan.shots[index].emotionalStageId,
                    requiredTags:semanticPlan.shots[index].requiredTags
                  }))
                }}:{})});
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
           disabled={disabled||!canCreate||plotLacksApprovedClips} onClick={onCreate}>
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
