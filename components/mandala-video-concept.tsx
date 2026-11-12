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
  avoidImagery?:string[];speechBeatsSource?:string;personalizationFocus?:string|null;
  parameters?:Record<string,{value:string|string[]|null;status:string;source:string}>;
};
type Props={
  locale:PublicLocale;goal:string;theme:string;styleIndex:number;
  speechTranscript?:TimedSpeechTranscript|null;
  profile?:VideoGoalProfile|null;durationSeconds?:number;
  selectedTopic?:{categoryId:string;subcategoryId:string;topicId:string;brief?:string}|null;
  ownerFields?:Partial<Record<"references"|"delivery"|"wordsAndVoice"|"soundtrack"|"timelineBinding"|"creationMode",string|null>>;
  phrases:string[];approvedConcept:ApprovedVideoConcept|null; signedIn:boolean;loginUnavailable:boolean;disabled:boolean;
  onRefreshLogin:()=>void;onApprove:(concept:ApprovedVideoConcept)=>void;
  onOpenGoal:()=>void;onOpenStyle:()=>void;
};
const COPY={
 ru:{
  ready:"Автоконцепция готова",title:"Ваша концепция видео",
  lead:"Сначала ключевая идея, затем связный концепт и параметры.",
  example:"Это пример без личной цели. Уточните её во вкладке «Цель», чтобы получить подходящий вариант.",
  goal:"Цель",category:"Категория",subcategory:"Подкатегория",topic:"Тема",
  style:"Стиль",scenario:"Сценарий",emotion:"Эмоциональная программа",meaning:"Смысл",motif:"Мотив",
  stages:"Четыре смысловых эпизода",story:"Основная идея",editing:"Редактирование концепции",
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
  stages:"Four story stages",story:"Main idea",editing:"Edit concept",
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
  stages:"Cuatro fases",story:"Idea principal",editing:"Editar concepto",
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
export function MandalaVideoConcept({locale,goal,theme,styleIndex,phrases,speechTranscript=null,ownerFields,profile=null,selectedTopic=null,durationSeconds=30,approvedConcept,signedIn,
  loginUnavailable,disabled,onRefreshLogin,onApprove,onOpenGoal,onOpenStyle}:Props){
  const t=COPY[locale]||COPY.en;
  const phraseSignature=phrases.join("\u001f");
  const suggested=useMemo(()=>suggestVideoConcept({
    locale,goal,theme,styleIndex,phrases:phraseSignature?phraseSignature.split("\u001f"):[],speechTranscript,
    personalization:profile?summarizeVideoGoalProfile(profile,locale):null,
    selectedTopicId:selectedTopic?.topicId||null,creativeBrief:selectedTopic?.brief||null
  }) as ApprovedVideoConcept,[locale,goal,theme,styleIndex,phraseSignature,speechTranscript,profile,selectedTopic?.topicId,selectedTopic?.brief]);
  const [custom,setCustom]=useState<ApprovedVideoConcept|null>(null);
  const [textEditing,setTextEditing]=useState(false);
  const [textDraft,setTextDraft]=useState("");
  const [editing,setEditing]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [approvedSignature,setApprovedSignature]=useState<string|null>(null);
  const [hasLocalEdits,setHasLocalEdits]=useState(false);
  const editButtonRef=useRef<HTMLButtonElement>(null);
  const modalRef=useRef<HTMLDivElement>(null);
  const concept=(custom&&custom.signature===suggested.signature)?custom:
    (approvedConcept&&approvedConcept.signature===suggested.signature?approvedConcept:suggested);
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

  const change=(patch:Partial<ApprovedVideoConcept>)=>{
    const next=reviseVideoConcept(concept,patch,locale) as ApprovedVideoConcept;
    setCustom(next);setApprovedSignature(null);setHasLocalEdits(true);
  };
  const startTextEdit=()=>{setTextDraft(narrativeText);setTextEditing(true);};
  const saveTextEdit=()=>{
    const text=textDraft.trim();
    if(!text)return;
    if(text!==narrativeText){
      setCustom({...concept,conceptText:text});
      setApprovedSignature(null);setHasLocalEdits(true);
    }
    setTextEditing(false);
  };
  const submit=()=>{
    if(textEditing||!videoConceptIsValid(concept))return;
    const approvedToSave={...concept,conceptText:narrativeText};
    setCustom(approvedToSave);
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
  const sketch=buildConceptShotSketch(concept,durationSeconds);
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
  const timecode=(seconds:number)=>
    String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
  const parameterLabels:Record<string,string|null>={
    purpose:purposeLabel(concept.semanticPurpose),
    audience:concept.semanticAudience?audienceText[concept.semanticAudience]||concept.semanticAudience:null,
    categoryId:category.label[locale],subcategoryId:subcategory.label[locale],
    topicId:displayedTopic,meaningAxisId:meaning?.label||null,
    motifId:motif?.label||null,scenarioId:scenario?.label||null,
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
    <section className={css.mainIdeaCard} aria-label={t.story}>
      <h4>{t.story}</h4>
      <strong data-video-concept-main-idea="true">{concept.mainMessage}</strong>
    </section>
    <section className={css.narrativeCard} data-video-concept-text>
      <div className={css.narrativeHeading}>
        <h4>{t.textTitle}</h4>
        {!textEditing?<button type="button" className={css.narrativeEdit}
          data-video-concept-text-edit disabled={disabled} onClick={startTextEdit}>
          <Pencil size={16}/>{t.textEdit}
        </button>:null}
      </div>
      {textEditing?<>
        <textarea className={css.narrativeInput} data-video-concept-text-input
          aria-label={t.textTitle} rows={5} maxLength={1200} autoFocus
          value={textDraft} disabled={disabled} onChange={event=>setTextDraft(event.target.value)}/>
        <div className={css.narrativeButtons}>
          <button type="button" onClick={saveTextEdit} disabled={disabled||!textDraft.trim()}>
            <Check size={16}/>{t.textSave}</button>
          <button type="button" onClick={()=>setTextEditing(false)}>{t.textCancel}</button>
        </div>
      </>:<p className={css.narrativeCopy} data-video-concept-paragraph>{narrativeText}</p>}
    </section>
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
    {concept.parameters?<section className={css.parameters} data-video-concept-all-parameters>
      <h4>{t.parameters}</h4>
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
            <strong>{locale==="ru"?row.ru:locale==="es"?row.es:row.en}</strong>
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
    </section>:null}
    {concept.personalizationFocus?<p className={css.status} data-video-concept-personalization-focus>
      {word("Что укрепляем","Personalization focus","Enfoque personal")}: {concept.personalizationFocus}
    </p>:null}
    <div className={css.actions} data-video-concept-action-rail>
      <button type="button" className={css.approve} data-video-concept-approve
        disabled={disabled||textEditing||!videoConceptIsValid(concept)} onClick={submit}>
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
    <details className={css.beats} data-video-concept-beats>
      <summary>{t.stages}<ChevronDown size={17} aria-hidden="true"/></summary>
      <ol>{concept.sceneOutline.map((beat,index)=><li key={index}>{beat}</li>)}</ol>
    </details>
    <details className={css.beats} data-video-concept-shot-sketch>
      <summary>{word("Предложенная раскадровка","Suggested storyboard","Guion gráfico propuesto")}
        {" · "}{durationSeconds}{word(" сек","s"," s")} · {sketch.length} {word("кадров","shots","tomas")}
        <ChevronDown size={17} aria-hidden="true"/></summary>
      <ol className={css.parameterList}>{sketch.map(shot=><li key={shot.number}>
        <strong>{timecode(shot.startSeconds)}–{timecode(shot.endSeconds)}</strong> ·
        {" "}{shotKinds[shot.shotKind]}: {shot.beat}
      </li>)}</ol>
      <p className={css.status}>{word(
        "Это план сцен, не подтверждение наличия разных видеоматериалов. Подбор и проверка MP4 — в Монтаже.",
        "This is an editorial shot plan, not verified footage. Montage checks distinct source clips.",
        "Es un plan creativo, no metraje verificado. Montaje comprueba clips distintos."
      )}</p>
    </details>
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
