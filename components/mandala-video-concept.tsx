"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,Brain,Check,ChevronDown,LockKeyhole,
  Pencil,RefreshCw,Sparkles,UserRound,X} from "lucide-react";
import {getMyTubeTaxonomy,listMyTubeScenarios} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeMeaningAxes,listMyTubeMeaningMotifs} from "@/lib/mandala/mytube-meaning-hierarchy.mjs";
import {listMyTubeStyles} from "@/lib/mandala/mytube-creative-choices.mjs";
import {VIDEO_CONCEPT_FIELD_LABELS,VIDEO_CONCEPT_REVIEW_FIELD_IDS,buildConceptShotSketch}
  from "@/lib/mandala/video-concept-semantic.mjs";
import {summarizeVideoGoalProfile,type VideoGoalProfile} from "./mandala-video-personalization";
import type {TimedSpeechTranscript} from "@/lib/mandala/audio-visual-storyboard.mjs";
import {suggestVideoConcept,reviseVideoConcept,videoConceptIsValid}
  from "@/lib/mandala/auto-video-concept.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import {buildVideoConceptNarrative} from "@/lib/mandala/video-concept-narrative.mjs";
import {storyReviewSignature,storyReviewRequired,conceptSceneAlignment,validEditorialShotActions}
  from "@/lib/mandala/video-story-review.mjs";
import {MandalaStoryboardSceneSketch} from "./mandala-storyboard-scene-sketch";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "@/lib/mandala/video-creative-directions.mjs";
import {reviewConceptQuality} from "@/lib/mandala/cinematic-concept-v3.mjs";
import css from "./mandala-video-concept.module.css";

export type ApprovedVideoConcept={
  schemaVersion:string;signature:string;source:string;goal:string;
  categoryId:string;subcategoryId:string;topicId:string;meaningAxisId:string;
  motifId:string;scenarioId:string;styleId:string;mainMessage:string;
  sceneOutline:string[];emotionalProgram:string[];
  currentLabel:string;desiredLabel:string;mediaBindingStatus:string;
  hasPersonalInput:boolean;inferredTopic:boolean;
  semanticConfidence?:string;semanticPurpose?:string|null;semanticAudience?:string|null;
  conceptText?:string;energyStart?:number|null;energyTarget?:number|null;
  baseSignature?:string;creativeDirectionId?:string;creativeTitle?:string;creativeMode?:string;
  creativeSymbol?:string;creativePitch?:string;creativeSchemaVersion?:string;
  creativeReview?:{score:number;hardFailures:string[];status:"pass"|"revise"|"needs_input"};
  creativeMatchFactors?:string[];creativeRankVersion?:string;
  personalizationSignals?:{
    source:"confirmed_answers";currentIds:string[];desiredIds:string[];focusIds:string[];
    energyStart:number|null;energyTarget:number|null
  }|null;
  psychologicalBrief?:{family:string;[key:string]:unknown};
  goalPlan?:{id:string;type:"leisure"|"support"|"change";mechanismId:string;
    scenarioStrategy:"shelter"|"journey"|"reframe"|"integration";
    secondaryScenarioStrategy:"shelter"|"journey"|"reframe"|"integration";
    meaningAxisId:string;topicId:string|null;contextKey:string}|null;
  userEditedFields?:string[];
  storyReviewSignature?:string|null;
  conceptScenes?:Array<{id:string;index:number;action:string;narrative:string}>;
  storySource?:string;storyboard?:Array<{title:string;action:string;emotion:string;keywords:string[];sceneId?:string;
    startSeconds?:number;endSeconds?:number;visualSubject?:string;visualAction?:string;
    shotType?:string;searchKeywords?:string[];
    continuityKeys?:string[];sourceStatus?:string}>;
  avoidImagery?:string[];speechBeatsSource?:string;personalizationFocus?:string|null;
  parameters?:Record<string,{value:string|string[]|null;status:string;source:string}>;
};
type Props={
  locale:PublicLocale;goal:string;theme:string;styleIndex:number;
  speechTranscript?:TimedSpeechTranscript|null;
  profile?:VideoGoalProfile|null;durationSeconds?:number;
  selectedTopic?:{categoryId:string;subcategoryId:string;topicId:string;brief?:string}|null;
  ownerFields?:Partial<Record<"references"|"delivery"|"wordsAndVoice"|"soundtrack"|"timelineBinding"|"creationMode",string|null>>;
  phrases:string[];approvedConcept:ApprovedVideoConcept|null;draftConcept?:ApprovedVideoConcept|null;
  suggestedConcept?:ApprovedVideoConcept|null;selectedDirectionId?:string|null;
  signedIn:boolean;loginUnavailable:boolean;disabled:boolean;
  onRefreshLogin:()=>void;onApprove:(concept:ApprovedVideoConcept)=>void;
  onDraftChange?:(concept:ApprovedVideoConcept)=>void;
  onOpenGoal:()=>void;onOpenStyle:()=>void;
};
const COPY={
 ru:{
  ready:"Автоконцепция готова",title:"Ваша концепция видео",
  lead:"Сначала ключевая идея, затем связный концепт и параметры.",
  example:"Это пример без личной цели. Уточните её во вкладке «Цель», чтобы получить подходящий вариант.",
  goal:"Цель",category:"Категория",subcategory:"Подкатегория",topic:"Тема",
  style:"Стиль",scenario:"Сценарий",emotion:"Эмоциональная программа",meaning:"Смысл",motif:"Мотив",
  stages:"Эмоциональная дуга · 4 фазы",story:"Основная идея",editing:"Редактирование концепции",
  textTitle:"Текст концепции",textEdit:"Изменить текст",textSave:"Сохранить текст",textCancel:"Отмена",parameters:"Параметры концепции",
  preview:"Редакционный сценарий, не готовое видео. Перед записью проверим подходящие видеосцены.",
  approve:"Одобрить и продолжить",edit:"Редактировать концепцию",editHelp:"Требуется регистрация",
  approved:"Концепция одобрена",changed:"Цель изменилась. Проверьте обновлённую концепцию.",
  save:"Сохранить и продолжить",cancel:"Назад к предложению",loginTitle:"Редактирование концепции",
  loginLead:"Чтобы изменить детали концепции и работать с личными настройками, войдите или создайте бесплатный аккаунт Holistic House.",
  loginAction:"Войти / зарегистрироваться",loginHint:"Вход откроется в новой вкладке. Вернитесь сюда: концепция останется на экране.",
  refresh:"Проверить вход",later:"Не сейчас",unavailable:"Сейчас не удаётся проверить вход. Одобрение без регистрации доступно.",
  guest:"Предложение бесплатно · просмотр без регистрации",noGoal:"Уточнить цель",editStyle:"Открыть стиль"
 },
 en:{
  ready:"Your concept is ready",title:"Your video concept",
  lead:"Review your main idea, the short film concept and its details.",
  example:"This is an example without a personal goal. Add your goal to get a more relevant suggestion.",
  goal:"Goal",category:"Category",subcategory:"Subcategory",topic:"Topic",
  style:"Style",scenario:"Scenario",emotion:"Emotional journey",meaning:"Meaning",motif:"Motif",
  stages:"Emotional arc · 4 phases",story:"Main idea",editing:"Edit concept",
  textTitle:"Concept story",textEdit:"Edit text",textSave:"Save text",textCancel:"Cancel",parameters:"Concept parameters",
  preview:"An editorial story, not a finished film. We check suitable source footage before export.",
  approve:"Approve & continue",edit:"Edit concept",editHelp:"Sign-in required",
  approved:"Concept approved",changed:"The goal changed. Review the updated suggestion.",
  save:"Save & continue",cancel:"Back to suggestion",loginTitle:"Edit your concept",
  loginLead:"To edit the details of your concept and personal settings, sign in or create a free Holistic House account.",
  loginAction:"Sign in / create account",loginHint:"Sign-in opens in a new tab. Return here; your concept stays on screen.",
  refresh:"Check sign-in",later:"Not now",unavailable:"Could not verify your account. You can still approve without signing in.",
  guest:"Free suggestion · no sign-in to continue",noGoal:"Refine goal",editStyle:"Open style"
 },
 es:{
  ready:"Concepto preparado",title:"Tu concepto de vídeo",
  lead:"Primero la idea clave, después el concepto y sus detalles.",
  example:"Este es un ejemplo sin objetivo personal. Añade tu objetivo para una mejor propuesta.",
  goal:"Objetivo",category:"Categoría",subcategory:"Subcategoría",topic:"Tema",
  style:"Estilo",scenario:"Guion",emotion:"Programa emocional",meaning:"Sentido",motif:"Motivo",
  stages:"Arco emocional · 4 fases",story:"Idea principal",editing:"Editar concepto",
  textTitle:"Texto del concepto",textEdit:"Editar texto",textSave:"Guardar texto",textCancel:"Cancelar",parameters:"Parámetros del concepto",
  preview:"Es un guion editorial, no un vídeo terminado. Verificamos los clips antes de exportar.",
  approve:"Aprobar y continuar",edit:"Editar concepto",editHelp:"Requiere acceso",
  approved:"Concepto aprobado",changed:"Cambió el objetivo. Revisa la nueva propuesta.",
  save:"Guardar y continuar",cancel:"Volver a propuesta",loginTitle:"Editar concepto",
  loginLead:"Para editar tu concepto y ajustes personales, entra o crea una cuenta gratis de Holistic House.",
  loginAction:"Entrar / crear cuenta",loginHint:"El acceso se abre en otra pestaña. Vuelve aquí: tu concepto permanece.",
  refresh:"Comprobar acceso",later:"Ahora no",unavailable:"No se pudo verificar tu cuenta. Puedes aprobar sin entrar.",
  guest:"Propuesta gratuita · sin registro",noGoal:"Precisar objetivo",editStyle:"Abrir estilos"
 }
} as const;
const DIRECTION_UI={
  ru:{title:"Выберите историю",lead:"Два сюжета по вашей цели и выбранным состояниям. Выберите тот, который откликается.",
    badge:"Режиссёрские варианты",settings:"Творческие настройки",ideaEdit:"Изменить идею",ideaSave:"Сохранить идею",quality:"Уточните цель, чтобы подобрать две законченные истории. Сырой сценарий нельзя одобрить."},
  en:{title:"Choose your story",lead:"Two film stories selected for your goal and confirmed preferences. Choose the one that feels right.",
    badge:"Creative directions",settings:"Creative settings",ideaEdit:"Edit idea",ideaSave:"Save idea",quality:"Refine your goal to receive two complete film stories. An unfinished draft cannot be approved."},
  es:{title:"Elige tu historia",lead:"Dos historias elegidas según tu objetivo y preferencias confirmadas. Elige la que más te inspire.",
    badge:"Propuestas creativas",settings:"Ajustes creativos",ideaEdit:"Editar idea",ideaSave:"Guardar idea",quality:"Concreta tu objetivo para recibir dos historias completas. Un borrador incompleto no se puede aprobar."}
} as const;
export function MandalaVideoConcept({locale,goal,theme,styleIndex,phrases,speechTranscript=null,ownerFields,profile=null,selectedTopic=null,durationSeconds=30,approvedConcept,draftConcept=null,signedIn,
  loginUnavailable,disabled,onRefreshLogin,onApprove,onDraftChange,onOpenGoal,onOpenStyle,
  suggestedConcept=null,selectedDirectionId=null}:Props){
  const t=COPY[locale]||COPY.en;
  const phraseSignature=phrases.join("\u001f");
  const localSuggested=useMemo(()=>suggestVideoConcept({
    locale,goal,theme,styleIndex,phrases:phraseSignature?phraseSignature.split("\u001f"):[],speechTranscript,
    personalization:profile?summarizeVideoGoalProfile(profile,locale):null,
    selectedTopicId:selectedTopic?.topicId||null,creativeBrief:selectedTopic?.brief||null
  }) as unknown as ApprovedVideoConcept,[locale,goal,theme,styleIndex,phraseSignature,speechTranscript,profile,selectedTopic?.topicId,selectedTopic?.brief]);
  const suggested=suggestedConcept||localSuggested;
  const [chosenDirection,setChosenDirection]=useState<{intentSignature:string;id:string}|null>(null);
  const directions=useMemo(()=>getVideoCreativeDirections(suggested,locale),
    [suggested,locale]);
  const localDirectionId=chosenDirection?.intentSignature===suggested.signature?
    chosenDirection.id:null;
  const selectedDirection=directions.find(d=>d.id===selectedDirectionId)||
    directions.find(d=>d.id===localDirectionId)||
    (draftConcept?.baseSignature===suggested.signature?
      directions.find(d=>d.id===draftConcept?.creativeDirectionId):undefined)||
    (approvedConcept?.baseSignature===suggested.signature?
      directions.find(d=>d.id===approvedConcept?.creativeDirectionId):undefined)||
    directions[0];
  const directed=useMemo(()=>selectedDirection?
    applyVideoCreativeDirection(suggested,selectedDirection) as ApprovedVideoConcept:suggested,
    [suggested,selectedDirection]);
  const [custom,setCustom]=useState<ApprovedVideoConcept|null>(null);
  const [draftByDirection,setDraftByDirection]=useState<Record<string,ApprovedVideoConcept>>({});
  const [ideaEditing,setIdeaEditing]=useState(false);
  const [ideaDraft,setIdeaDraft]=useState("");
  const [textEditing,setTextEditing]=useState(false);
  const [shotEditing,setShotEditing]=useState(false);
  const [shotDrafts,setShotDrafts]=useState<string[]>([]);
  const [textDraft,setTextDraft]=useState("");
  const [editing,setEditing]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [approvedSignature,setApprovedSignature]=useState<string|null>(null);
  const [hasLocalEdits,setHasLocalEdits]=useState(false);
  const editButtonRef=useRef<HTMLButtonElement>(null);
  const modalRef=useRef<HTMLDivElement>(null);
  const concept=(custom&&custom.signature===directed.signature)?custom:
    draftByDirection[directed.signature]||
    (draftConcept&&draftConcept.signature===directed.signature?draftConcept:null)||
    (approvedConcept&&approvedConcept.signature===directed.signature?approvedConcept:directed);
  // Auto-selected default phrase suggestions are not confirmation that a
  // visitor supplied a personal goal. The free guest example remains
  // approvable; specific user requests still require a complete film.
  const hasExplicitFilmIntent=Boolean(goal.trim()||selectedTopic?.topicId||profile||
    speechTranscript?.text?.trim());
  const isStoryFilm=hasExplicitFilmIntent&&concept.hasPersonalInput&&
    concept.source!=="audio_transcript"&&
    !["practice","celebration","presentation","audio_visual"].includes(concept.semanticPurpose||"");
  // Check edited text again. The original automatic PASS does not authorize
  // an arbitrary later manual rewrite, unsafe promise or arrow-chain idea.
  const editedReview=concept.creativeSchemaVersion==="hh-creative-concept-v3"&&
    concept.userEditedFields?.length&&concept.storyboard?.length===6?
    reviewConceptQuality({
      title:concept.creativeTitle,
      idea:concept.mainMessage,pitch:concept.creativePitch||"",
      story:concept.conceptText||"",
      symbol:concept.creativeSymbol,
      activeSymbol:{name:concept.creativeSymbol},
      emotionalBeats:concept.emotionalProgram,
      storyboard:concept.storyboard.map((shot,index)=>({
        ...shot,index:index+1,visualAction:shot.action,
        visualSubject:shot.visualSubject||"human_action",
        startSeconds:index*5,endSeconds:(index+1)*5,
        continuityKeys:shot.continuityKeys||["hero","action"],
        sourceStatus:"editorial_unverified",sourceVerified:false
      })),
      turningPoint:concept.storyboard[3].action,
      endingImage:concept.storyboard[5].action,
      mediaBindingStatus:"editorial_only_unverified",
      sourceStatus:"editorial_unverified",
      psychologicalBrief:concept.psychologicalBrief||{family:"editorial"}
    },{locale,goal:concept.goal,avoidImagery:concept.avoidImagery||[]}):null;
  const passV3=concept.creativeSchemaVersion==="hh-creative-concept-v3"&&
    concept.creativeReview?.status==="pass"&&concept.storyboard?.length===6&&
    (!editedReview||editedReview.status==="pass");
  const passCurated=concept.storySource==="curated_editorial"&&concept.storyboard?.length===6;
  // If the author changes the plot, the old six shots are NOT silently
  // treated as an approved illustration of the rewritten story.
  const storyboardNeedsReview=storyReviewRequired(concept);
  const storyboardSceneAlignment=conceptSceneAlignment(concept);
  const creativeReady=(!isStoryFilm||passV3||passCurated)&&
    !storyboardNeedsReview&&storyboardSceneAlignment.aligned;
  const taxonomy=getMyTubeTaxonomy();
  const categories=taxonomy.categories;
  const category=categories.find(c=>c.id===concept.categoryId)||categories[0];
  const subcategory=category.subcategories.find(s=>s.id===concept.subcategoryId)||category.subcategories[0];
  const topic=subcategory.topics.find(x=>x.id===concept.topicId)||subcategory.topics[0];
  const meaning=listMyTubeMeaningAxes(topic.id,locale).find(m=>m.id===concept.meaningAxisId);
  const motifs=listMyTubeMeaningMotifs(topic.id,concept.meaningAxisId,locale);
  const motif=motifs.find(m=>m.id===concept.motifId);
  const scenario=listMyTubeScenarios(topic.id,locale).find(s=>s.id===concept.scenarioId);
  const styles=listMyTubeStyles(locale);
  const style=styles.find(s=>s.id===concept.styleId);
  const approved=!hasLocalEdits&&(approvedSignature===concept.signature||
    approvedConcept?.signature===concept.signature);
  // A category-only intent (for example "Love") must not imply a specific love story.
  const displayedTopic=concept.semanticConfidence==="low"?category.label[locale]:topic.label[locale];
  const generatedText=buildVideoConceptNarrative({
    locale,topic:displayedTopic,mainMessage:concept.mainMessage,
    scenario:concept.semanticConfidence==="low"?"":scenario?.label||"",
    motif:concept.semanticConfidence==="low"?"":motif?.label||"",
    emotionalProgram:concept.emotionalProgram,
    currentState:concept.parameters?.currentState?.value,
    desiredState:concept.parameters?.desiredState?.value,
    focus:concept.personalizationFocus,
    pace:concept.parameters?.pace?.value,
    energyStart:concept.energyStart,energyTarget:concept.energyTarget,durationSeconds
  });
  const narrativeText=concept.conceptText?.trim()||generatedText;

  useEffect(()=>{
    if(loginOpen&&signedIn){setLoginOpen(false);setEditing(true);}
  },[loginOpen,signedIn]);
  useEffect(()=>{
    if(!loginOpen)return;
    const before=document.activeElement instanceof HTMLElement?document.activeElement:null;
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return()=>{(before||editButtonRef.current)?.focus();};
  },[loginOpen]);

  const chooseDirection=(id:string)=>{
    if(id===selectedDirection?.id&&selectedDirectionId===id)return;
    setChosenDirection({intentSignature:suggested.signature,id});
    setCustom(null);setApprovedSignature(null);
    const direction=directions.find(d=>d.id===id);
    const next=direction?applyVideoCreativeDirection(suggested,direction) as ApprovedVideoConcept:null;
    const nextKey=next?.signature||null;
    if(next)onDraftChange?.(draftByDirection[next.signature]||next);
    setHasLocalEdits(Boolean(nextKey&&draftByDirection[nextKey]));
    setTextEditing(false);setIdeaEditing(false);setShotEditing(false);setEditing(false);
  };
  const change=(patch:Partial<ApprovedVideoConcept>)=>{
    const next=reviseVideoConcept(concept,patch,locale) as ApprovedVideoConcept;
    if(Object.keys(patch).some(key=>
      ["categoryId","subcategoryId","topicId","scenarioId","meaningAxisId","motifId"].includes(key))){
      const editedScenario=listMyTubeScenarios(next.topicId,locale)
        .find(s=>s.id===next.scenarioId);
      next.mainMessage=editedScenario?.label||next.mainMessage;
      next.conceptText=undefined;next.storyboard=undefined;next.creativeDirectionId=undefined;
      next.creativeTitle=undefined;next.creativeSymbol=undefined;
      next.creativeMode=undefined;next.storySource=undefined;
      if(next.parameters){
        const defaultVisual=listMyTubeStyles(locale).find(s=>s.id===next.styleId)?.description||null;
        next.parameters={...next.parameters,
          visualWorld:{value:defaultVisual,status:"manual",source:"editor"},
          visualActions:{value:[...next.sceneOutline],status:"manual",source:"editor"}};
      }
    }
    if("mainMessage" in patch){
      next.userEditedFields=[...new Set([...(concept.userEditedFields||[]),"mainMessage"])];
    }
    if(Object.keys(patch).some(key=>["categoryId","subcategoryId","topicId","scenarioId"].includes(key))){
      next.creativeReview={score:0,status:"needs_input",hardFailures:["topic_requires_regeneration"]};
    }
    setCustom(next);setDraftByDirection(rows=>({...rows,[next.signature]:next}));
    setApprovedSignature(null);setHasLocalEdits(true);
      onDraftChange?.(next);
  };
  const startIdeaEdit=()=>{setIdeaDraft(concept.mainMessage);setIdeaEditing(true);};
  const saveIdeaEdit=()=>{
    const idea=ideaDraft.trim();
    if(!idea||idea.includes("→"))return;
    if(idea!==concept.mainMessage){
      const next={...concept,mainMessage:idea,
        userEditedFields:[...new Set([...(concept.userEditedFields||[]),"mainMessage"])]};
      setCustom(next);setDraftByDirection(rows=>({...rows,[next.signature]:next}));
      setApprovedSignature(null);setHasLocalEdits(true);
      onDraftChange?.(next);
    }
    setIdeaEditing(false);
  };
  const startTextEdit=()=>{setTextDraft(narrativeText);setTextEditing(true);};
  const saveTextEdit=()=>{
    const text=textDraft.trim();
    if(!text)return;
    if(text!==narrativeText){
      const next={...concept,conceptText:text,
        userEditedFields:[...new Set([...(concept.userEditedFields||[]),"conceptText"])]};
      setCustom(next);setDraftByDirection(rows=>({...rows,[next.signature]:next}));
      setApprovedSignature(null);setHasLocalEdits(true);
      onDraftChange?.(next);
    }
    setTextEditing(false);
  };
  const startShotEdit=()=>{
    if(!concept.storyboard?.length||concept.storyboard.length!==6)return;
    setShotDrafts(concept.storyboard.map(shot=>shot.action));
    setShotEditing(true);
  };
  const saveShotEdits=()=>{
    if(!concept.storyboard||!validEditorialShotActions(shotDrafts))return;
    const storyboard=concept.storyboard.map((shot,index)=>{
      const action=shotDrafts[index].trim();
      const changed=shot.action.trim()!==action;
      return {...shot,action,visualAction:action,
        // Edits invalidate tags and visual props inherited from the old action.
        keywords:changed?[]:[...shot.keywords],
        searchKeywords:changed?[]:[...(shot.searchKeywords||[])],
        visualSubject:changed?"human_action":shot.visualSubject,
        continuityKeys:changed?[]:shot.continuityKeys};
    });
    // Keep all three representations of the event in sync.
    let conceptText=concept.conceptText||"";
    const conceptScenes=concept.conceptScenes?.map((scene,index)=>{
      const before=concept.storyboard?.[index]?.action||"";
      const after=storyboard[index].action;
      if(before!==after)conceptText=conceptText.replace(before,after);
      return {...scene,action:after,narrative:before===after?
        scene.narrative:scene.narrative.replace(before,after)};
    });
    const next:ApprovedVideoConcept={...concept,storyboard,
      conceptText:conceptScenes?conceptText:concept.conceptText,
      conceptScenes,
      parameters:concept.parameters?{...concept.parameters,
       visualActions:{value:storyboard.map(shot=>shot.action),
         status:"manual",source:"editor"}}:undefined,
      userEditedFields:[...new Set([...(concept.userEditedFields||[]),"storyboard"])]};
    setCustom(next);setDraftByDirection(rows=>({...rows,[next.signature]:next}));
    setApprovedSignature(null);setHasLocalEdits(true);setShotEditing(false);
    onDraftChange?.(next);
  };
  const confirmRevisedStory=()=>{
    const review=storyReviewSignature(concept);
    if(!review||!validEditorialShotActions(concept.storyboard?.map(shot=>shot.action))||
      !storyboardSceneAlignment.aligned)return;
    const next:ApprovedVideoConcept={...concept,storyReviewSignature:review};
    setCustom(next);setDraftByDirection(rows=>({...rows,[next.signature]:next}));
    setApprovedSignature(null);setHasLocalEdits(true);
    onDraftChange?.(next);
  };
  const submit=()=>{
    if(textEditing||ideaEditing||shotEditing||!creativeReady||!videoConceptIsValid(concept))return;
    const approvedToSave={...concept,conceptText:narrativeText};
    setCustom(approvedToSave);
    setDraftByDirection(rows=>({...rows,[approvedToSave.signature]:approvedToSave}));
    setApprovedSignature(concept.signature);
    setHasLocalEdits(false);
    setEditing(false);
    onApprove(approvedToSave);
  };
  const purposes:Record<string,[string,string,string]>={
    celebration:["Поздравление / подарок","Greeting / gift","Felicitación / regalo"],
    presentation:["Презентация","Presentation","Presentación"],
    practice:["Медитативная практика","Guided practice","Práctica guiada"],
    audio_visual:["Видеоряд по аудио","Audio-based visuals","Vídeo desde audio"],
    personal_support:["Личная поддержка","Personal support","Apoyo personal"],
    reflection:["Личное размышление","Personal reflection","Reflexión personal"]
  };
  const purposeLabel=(value:string|null|undefined)=>{
    const labels=purposes[value||""];
    return labels?(locale==="ru"?labels[0]:locale==="es"?labels[2]:labels[1]):"—";
  };
  // Display every meaningful creative parameter, not legacy technical placeholders.
  // The headline, style, meaning, symbol, scenario and emotional arc are no longer
  // hidden in a second grid, so they belong in this same vertical list.
  const visibleCreativeKeys=new Set([
    "intent","topicId","meaningAxisId","motifId","scenarioId",
    "styleId","emotionalProgram"
  ]);
  const allParameterRows=VIDEO_CONCEPT_FIELD_LABELS.filter(row=>{
    if(!visibleCreativeKeys.has(row.id)&&!VIDEO_CONCEPT_REVIEW_FIELD_IDS.includes(row.id))
      return false;
    const field=concept.parameters?.[row.id];
    return Boolean(field&&field.status!=="unknown"&&field.value!==null&&field.value!==""&&
      (!Array.isArray(field.value)||field.value.length));
  });
  // The shared JS storyboard helper can return legacy or authored film shots.
  // Narrow the UI contract explicitly so strict TypeScript never infers any.
  const sketch=buildConceptShotSketch(concept,durationSeconds) as Array<{
    number:number;startSeconds:number;endSeconds:number;shotKind:number;
    beat:string;title?:string;emotion?:string
  }>;
  const word=(ru:string,en:string,es:string)=>locale==="ru"?ru:locale==="es"?es:en;
  const audienceText:Record<string,string>={
    family:word("Семья","Family","Familia"),
    partner:word("Партнёр","Partner","Pareja"),
    client:word("Клиент","Client","Cliente"),
    public:word("Зрители","Viewers","Público"),
    self:word("Для себя","For myself","Para mí")
  };
  const statuses:Record<string,[string,string,string]>={
    extracted:["из речи","from speech","del audio"],suggested:["предложено","suggested","sugerido"],
    synchronized:["из настроек","synced","sincronizado"],manual:["изменено","edited","editado"],
    unknown:["не указано","unknown","sin datos"]
  };
  const codeNames:Record<string,string>={
    symbolic_quest:word("Символическая история","Symbolic story","Historia simbólica"),
    relational_mirror:word("История отношений","Relationship story","Historia de vínculos"),
    grounded_dilemma:word("Ситуация и выбор","Situation and choice","Situación y elección"),
    journey:word("Путь","Journey","Viaje"),
    shelter:word("Защищённое пространство","Shelter","Refugio"),
    awakening:word("Пробуждение","Awakening","Despertar"),
    integration:word("Интеграция","Integration","Integración"),
    steady:word("Ровный","Steady","Constante"),
    gentle:word("Мягкий","Gentle","Suave"),
    balanced:word("Умеренная","Balanced","Equilibrada"),
    dynamic:word("Динамичный","Dynamic","Dinámico"),
    uplifting:word("Воодушевляющая","Uplifting","Inspiradora"),
    rising:word("Нарастающий","Rising","Creciente"),
    warm:word("Тёплый","Warm","Cálido"),
    clear:word("Ясный","Clear","Claro"),
    meditation:word("Медитация","Meditation","Meditación"),
    reiki:"Reiki",hypnosis:word("Гипноз","Hypnosis","Hipnosis")
  };
  const shotKinds=[
    word("Общий план","Establishing shot","Plano general"),
    word("Деталь","Detail","Detalle"),
    word("Поворот","Turning point","Giro"),
    word("Действие","Action","Acción"),
    word("Отклик","Response","Respuesta"),
    word("Финал","Closing shot","Plano final")
  ];
  const timecode=(seconds:number)=>{
    const whole=Math.round(seconds);
    return String(Math.floor(whole/60)).padStart(2,"0")+":"+String(whole%60).padStart(2,"0");
  };
  const problemTopic=concept.topicId==="anxiety-no-reason"||concept.topicId==="constant-anxiety";
  const parameterLabels:Record<string,string|null>={
    purpose:purposeLabel(concept.semanticPurpose),
    audience:concept.semanticAudience?audienceText[concept.semanticAudience]||concept.semanticAudience:null,
    categoryId:category.label[locale],subcategoryId:subcategory.label[locale],
    topicId:displayedTopic,meaningAxisId:meaning?.label||null,
    motifId:concept.creativeSymbol||motif?.label||null,
    scenarioId:concept.creativeTitle||scenario?.label||null,
    styleId:style?.label||null
  };

  return <section className={css.panel} data-video-concept-auto data-concept-source={concept.source}
      data-concept-approved={approved?"true":"false"} aria-label={t.title}>
    <div className={css.headline}>
      <div><span className={css.eyebrow}><Sparkles size={16}/>{approved?t.approved:t.ready}</span>
        <h3>{editing?t.editing:t.title}</h3>
        <p>{t.lead}</p></div>
      <span className={css.aiSymbol} aria-hidden="true"><Brain size={24}/></span>
    </div>
    {!concept.hasPersonalInput?<p className={css.example} data-video-concept-example>
      {t.example} <button type="button" disabled={disabled} onClick={onOpenGoal}>{t.noGoal}</button>
    </p>:null}
    {approvedSignature&&!approved?<p className={css.example} role="status">{t.changed}</p>:null}
    {directions.length>1?<section className={css.directionChooser} data-video-concept-directions
       aria-label={DIRECTION_UI[locale].title}>
       <span className={css.directionEyebrow}><Sparkles size={14} aria-hidden="true"/>
         {DIRECTION_UI[locale].badge}</span>
       <h4>{DIRECTION_UI[locale].title}</h4>
       <p>{DIRECTION_UI[locale].lead}</p>
       <div className={css.directionGrid}>
         {directions.map(direction=><button type="button" key={direction.id}
           className={css.directionOption} data-video-concept-direction={direction.id}
           aria-pressed={selectedDirection?.id===direction.id}
           disabled={disabled||textEditing||editing}
           onClick={()=>chooseDirection(direction.id)}>
           <span className={css.directionOptionTop}>
             <strong>{direction.title}</strong>
             <span className={css.directionRadio} aria-hidden="true">
               {selectedDirection?.id===direction.id?<Check size={15}/>:null}</span>
           </span>
           <small>{direction.mode}</small>
           <span className={css.directionIdea} data-video-concept-direction-hook>
             {("pitch" in direction&&direction.pitch)?String(direction.pitch):
               direction.storyboard?.[0]?.action||direction.idea}
           </span>
           {Array.isArray(direction.matchFactors)?<small className={css.directionFit}
             data-video-concept-matched-factors={direction.matchFactors.join(",")}>
             {word("Учтено:","Based on:","Basado en:")}{" "}
             {direction.matchFactors.map((key:string)=>({
               current:word("состояние сейчас","current state","estado actual"),
               desired:word("желаемое чувство","desired feeling","estado deseado"),
               focus:word("направление развития","growth focus","área de desarrollo"),
               energy:word("уровень энергии","energy level","nivel de energía"),
               topic:word("тема запроса","your goal","tu objetivo")
             } as Record<string,string>)[key]||key).join(" · ")}
           </small>:null}
         </button>)}
       </div>
     </section>:null}
    <section className={css.mainIdeaCard} aria-label={t.story}>
      <div className={css.mainIdeaHeading}>
        <h4>{t.story}</h4>
        {!ideaEditing?<button type="button" className={css.ideaEdit}
          data-video-main-idea-edit disabled={disabled||textEditing||editing}
          onClick={startIdeaEdit}><Pencil size={15}/>{DIRECTION_UI[locale].ideaEdit}</button>:null}
      </div>
      {ideaEditing?<div className={css.ideaEditor}>
        <textarea data-video-main-idea-input maxLength={450} rows={3} autoFocus
          aria-label={t.story} value={ideaDraft} disabled={disabled}
          onChange={event=>setIdeaDraft(event.currentTarget.value)}/>
        <div className={css.narrativeButtons}>
          <button type="button" onClick={saveIdeaEdit} disabled={disabled||!ideaDraft.trim()||ideaDraft.includes("→")}>
            <Check size={16}/>{DIRECTION_UI[locale].ideaSave}</button>
          <button type="button" onClick={()=>setIdeaEditing(false)}>{t.textCancel}</button>
        </div>
      </div>:null}
      {concept.creativeTitle&&directions.length<2?
        <span className={css.conceptTitle}>{concept.creativeTitle}</span>:null}
      {!ideaEditing?<strong data-video-concept-main-idea="true">{concept.mainMessage}</strong>:null}
    </section>
    <section className={css.narrativeCard} data-video-concept-text>
      <div className={css.narrativeHeading}>
        <h4 data-video-concept-scene-count={concept.storyboard?.length||undefined}>
          {t.textTitle}{concept.storyboard?.length?
            " · "+concept.storyboard.length+" "+word("сцен","scenes","escenas"):""}
        </h4>
        {!textEditing?<button type="button" className={css.narrativeEdit}
          data-video-concept-text-edit disabled={disabled} onClick={startTextEdit}>
          <Pencil size={16}/>{t.textEdit}
        </button>:null}
      </div>
      {textEditing?<>
        <textarea className={css.narrativeInput} data-video-concept-text-input
          aria-label={t.textTitle} rows={5} maxLength={6000} autoFocus
          value={textDraft} disabled={disabled} onChange={event=>setTextDraft(event.target.value)}/>
        <div className={css.narrativeButtons}>
          <button type="button" onClick={saveTextEdit} disabled={disabled||!textDraft.trim()}>
            <Check size={16}/>{t.textSave}</button>
          <button type="button" onClick={()=>setTextEditing(false)}>{t.textCancel}</button>
        </div>
      </>:<p className={css.narrativeCopy} data-video-concept-paragraph>{narrativeText}</p>}
    </section>
    {!creativeReady&&!storyboardNeedsReview?<p className={css.example} role="status" data-video-concept-quality-needed>
      {DIRECTION_UI[locale].quality} <button type="button" onClick={onOpenGoal}>{t.noGoal}</button>
    </p>:null}
    {editing&&signedIn ? <div className={css.editor} data-video-concept-editor>
      <label>{t.category}
        <select value={category.id} disabled={disabled} onChange={e=>change({
          categoryId:e.target.value,subcategoryId:"",topicId:"",motifId:"",scenarioId:""
        })}>{categories.map(c=><option value={c.id} key={c.id}>{c.label[locale]}</option>)}</select>
      </label>
      <label>{t.subcategory}
        <select value={subcategory.id} disabled={disabled} onChange={e=>change({
          subcategoryId:e.target.value,topicId:"",scenarioId:"",motifId:""
        })}>{category.subcategories.map(s=><option key={s.id} value={s.id}>{s.label[locale]}</option>)}</select>
      </label>
      <label>{t.topic}
        <select value={topic.id} disabled={disabled} onChange={e=>change({
          topicId:e.target.value,scenarioId:"",motifId:""
        })}>{subcategory.topics.map(x=><option key={x.id} value={x.id}>{x.label[locale]}</option>)}</select>
      </label>
      <label>{t.meaning}
        <select value={concept.meaningAxisId} disabled={disabled} onChange={e=>change({
          meaningAxisId:e.target.value,motifId:""
        })}>{listMyTubeMeaningAxes(topic.id,locale).map(x=>
          <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </label>
      <label>{t.motif}
        <select value={concept.motifId} disabled={disabled} onChange={e=>change({
          motifId:e.target.value
        })}>{motifs.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </label>
      <label>{t.scenario}
        <select value={concept.scenarioId} disabled={disabled} onChange={e=>change({
          scenarioId:e.target.value
        })}>{listMyTubeScenarios(topic.id,locale).map(x=>
          <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </label>
      <label>{t.story}
        <textarea rows={2} maxLength={240} value={concept.mainMessage} disabled={disabled}
          onChange={e=>change({mainMessage:e.target.value})}/>
      </label>
      <button type="button" className={css.styleLink} onClick={onOpenStyle}
        disabled={disabled}><Sparkles size={17}/>{t.editStyle}<ArrowRight size={16}/></button>
    </div> : null}
    <details className={css.beats} data-video-concept-shot-sketch open>
      <summary>{word("Предложенная раскадровка","Suggested storyboard","Guion gráfico propuesto")}
        {" · "}{durationSeconds}{word(" сек","s"," s")} · {sketch.length} {word("кадров","shots","tomas")}
        <ChevronDown size={17} aria-hidden="true"/></summary>
      <ol className={css.parameterList}>{sketch.map((shot,index)=><li key={shot.number}
        data-video-concept-scene-graphic={shot.number}>
        <div className={css.storyShotGraphicRow}>
         <div className={css.storyShotGraphicFrame}>
          <MandalaStoryboardSceneSketch locale={locale} action={shot.beat}
            visualSubject={concept.storyboard?.[index]?.visualSubject}
            keywords={concept.storyboard?.[index]?.keywords}
            shotType={concept.storyboard?.[index]?.shotType}/>
         </div>
         <div className={css.storyShotGraphicText}>
          <strong>{timecode(shot.startSeconds)}–{timecode(shot.endSeconds)}</strong> ·
          {" "}{shot.title?<span className={css.shotTitle}>{shot.title}</span>:
            shotKinds[shot.shotKind]}: <span className={css.shotAction}>{shot.beat}</span>
          {shot.emotion?<small className={css.shotEmotion}>{shot.emotion}</small>:null}
         </div>
        </div>
      </li>)}</ol>
      <p className={css.status}>{word(
        "Это план сцен, не подтверждение наличия разных видеоматериалов. Подбор и проверка MP4 — в Монтаже.",
        "This is an editorial shot plan, not verified footage. Montage checks distinct source clips.",
        "Es un plan creativo, no metraje verificado. Montaje comprueba clips distintos."
      )}</p>
      {concept.storyboard?.length===6?<div className={css.storyShotEditor} data-video-storyboard-editor>
        {shotEditing?<>
          {shotDrafts.map((action,index)=><label key={index}>
            <strong>{word("Сцена","Scene","Escena")} {index+1} ·
              {" "}{timecode(sketch[index]?.startSeconds??index*5)}–{timecode(sketch[index]?.endSeconds??(index+1)*5)}</strong>
            <textarea data-video-storyboard-action-edit={index+1} rows={2} maxLength={360}
              disabled={disabled} value={action}
              onChange={event=>setShotDrafts(items=>items.map((item,i)=>
                i===index?event.target.value:item))}/>
          </label>)}
          <div className={css.storyEditorActions}>
            <button type="button" data-video-storyboard-save disabled={disabled||!validEditorialShotActions(shotDrafts)}
              onClick={saveShotEdits}>{word("Сохранить 6 сцен","Save 6 scenes","Guardar 6 escenas")}</button>
            <button type="button" disabled={disabled} onClick={()=>setShotEditing(false)}>
              {t.textCancel}</button>
          </div>
        </>:<button type="button" data-video-storyboard-edit disabled={disabled||ideaEditing||textEditing}
          onClick={startShotEdit}>{word("Уточнить действия в сценах","Edit scene actions","Editar acciones de escenas")}</button>}
        {!storyboardSceneAlignment.aligned?<p role="status"
         data-video-storyboard-concept-mismatch className={css.storyReviewNotice}>
         {word("Сценарий и действия разошлись. Сверьте все шесть действий с текстом и их порядок.",
           "The story no longer contains the six actions in order. Update the story and shot list.",
           "La historia ya no contiene las seis acciones en orden. Corrige el texto y las tomas.")}
       </p>:null}
       {storyboardNeedsReview&&!shotEditing?<div className={css.storyReviewNotice}
          data-video-storyboard-review-required role="status">
          <p>{word(
            "Вы изменили историю. Проверьте шесть действий выше: они должны соответствовать новому тексту. При необходимости измените сцены.",
            "You changed the story. Review the six actions above against your new text; edit any scenes that no longer fit.",
            "Has cambiado la historia. Revisa las seis acciones con el nuevo texto y corrige las escenas que ya no encajen."
          )}</p>
          <button type="button" data-video-storyboard-confirm
            disabled={disabled||ideaEditing||textEditing||!storyboardSceneAlignment.aligned}
            onClick={confirmRevisedStory}>
            <Check size={16}/>{word("Я проверил(а) соответствие сцен",
              "I've reviewed the six scenes","He revisado las seis escenas")}
          </button>
        </div>:null}
      </div>:null}
    </details>
    <details className={css.beats} data-video-concept-beats>
      <summary>{t.stages}<ChevronDown size={17} aria-hidden="true"/></summary>
      <ol>{concept.emotionalProgram.map((phase,index)=><li key={index}>{phase}</li>)}</ol>
    </details>
    {concept.parameters?<details className={css.parameters} data-video-concept-all-parameters>
      <summary><strong>{DIRECTION_UI[locale].settings}</strong><ChevronDown size={19} aria-hidden="true"/></summary>
      <ol className={css.parameterList}>{allParameterRows.map(row=>{
        const item=concept.parameters?.[row.id];
        const v=item?.status==="synchronized"?ownerFields?.[row.id as keyof NonNullable<Props["ownerFields"]>]??item?.value:item?.value;
        const shown=parameterLabels[row.id]??v;
        const value=Array.isArray(shown)?shown.join(" → "):
          shown==null||shown===""?"—":codeNames[String(shown)]||String(shown);
        const stateLabels=statuses[item?.status||"unknown"]||statuses.unknown;
        const state=item?.status==="unknown"?word("Не указано","Not specified","Sin datos"):
          item?.source==="goal"?word("Из цели","From goal","Del objetivo"):
          item?.source==="personalization"?word("Из персонализации","From personalization","De personalización"):
          item?.source==="speech"?word("Из аудио","From audio","Del audio"):
          locale==="ru"?stateLabels[0]:locale==="es"?stateLabels[2]:stateLabels[1];
        return <li key={row.id} data-concept-parameter={row.id}>
          <div className={css.parameterLabel}>
            <strong>{problemTopic&&row.id==="situation"?word("Проблема","Problem","Problema"):
              locale==="ru"?row.ru:locale==="es"?row.es:row.en}</strong>
            <small>{state}</small>
          </div>
          {row.id==="emotionalProgram"?
            <ol className={css.emotionSteps} data-video-concept-journey>
              {concept.emotionalProgram.map((phase,index)=><li key={index}>
                <span className={css.journeyNumber}>{index+1}</span><span>{phase}</span>
              </li>)}
            </ol>:
            <div className={css.parameterValue}>{value}</div>}
        </li>;
      })}</ol>
    </details>:null}
    {concept.personalizationFocus?<p className={css.status} data-video-concept-personalization-focus>
      {word("Что укрепляем","Personalization focus","Enfoque personal")}: {concept.personalizationFocus}
    </p>:null}
    <div className={css.actions} data-video-concept-action-rail>
      <button type="button" className={css.approve} data-video-concept-approve
        disabled={disabled||textEditing||ideaEditing||shotEditing||!creativeReady||!videoConceptIsValid(concept)} onClick={submit}>
        <Check size={21}/><span>{editing?t.save:t.approve}</span><ArrowRight size={18}/>
      </button>
      <button type="button" ref={editButtonRef} className={css.edit}
        data-video-concept-edit disabled={disabled} onClick={()=>{
          if(editing){
            setEditing(false);
            const base=approvedConcept?.signature===suggested.signature?approvedConcept:suggested;
            setCustom(concept.conceptText?{...base,conceptText:concept.conceptText}:null);
            setHasLocalEdits(Boolean(concept.conceptText));return;
          }
          if(signedIn)setEditing(true);else setLoginOpen(true);
        }}>
        <Pencil size={19}/><span>{editing?t.cancel:t.edit}
          {!signedIn&&!editing?<small>{t.editHelp}</small>:null}</span>
      </button>
    </div>
    {concept.source==="audio_transcript"?<p className={css.status} data-video-concept-from-audio role="status">
      {locale==="ru"?"Все смысловые параметры предложены по расшифровке речи. Слова и монтаж можно проверить отдельно.":
        locale==="es"?"Los parámetros se propusieron a partir del audio. Revisa el texto y el montaje por separado.":
        "Concept parameters were proposed from your transcript. Review wording and footage separately."}
    </p>:null}
    <p className={css.status} role="note">{t.preview}</p>
    <p className={css.guestNote}>{t.guest}</p>
    {loginOpen?<div className={css.backdrop} data-video-concept-auth-overlay
      onMouseDown={e=>{if(e.target===e.currentTarget)setLoginOpen(false);}}>
      <div className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="video-concept-login-title"
        aria-describedby="video-concept-login-desc" ref={modalRef}
        onKeyDown={e=>{
          if(e.key==="Escape"){setLoginOpen(false);return;}
          if(e.key!=="Tab"||!modalRef.current)return;
          const elements=Array.from(modalRef.current.querySelectorAll<HTMLElement>("button,a[href]"));
          const first=elements[0],last=elements[elements.length-1];
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        }}>
        <button type="button" className={css.close} data-video-concept-auth-close
          onClick={()=>setLoginOpen(false)} aria-label={t.later}><X size={20}/></button>
        <div className={css.dialogImage} aria-hidden="true"/>
        <div className={css.dialogBody}>
          <span className={css.lock}><LockKeyhole size={24}/></span>
          <h3 id="video-concept-login-title">{t.loginTitle}</h3>
          <p id="video-concept-login-desc">{t.loginLead}</p>
          <Link href={"/"+locale+"/app/videos"} target="_blank" rel="noopener noreferrer"
            prefetch={false} className={css.login} data-video-concept-signin>
            <UserRound size={19}/>{t.loginAction}<ArrowRight size={18}/>
          </Link>
          <p className={css.loginHint}>{t.loginHint}</p>
          <button type="button" className={css.checkLogin}
            data-video-concept-check-login onClick={onRefreshLogin}>
            <RefreshCw size={17}/>{t.refresh}
          </button>
          {loginUnavailable?<p role="status" className={css.example}>{t.unavailable}</p>:null}
          <button type="button" className={css.later} onClick={()=>setLoginOpen(false)}>
            {t.later}</button>
        </div>
      </div>
    </div>:null}
  </section>;
}
