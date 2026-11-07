"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,Brain,Check,ChevronDown,Film,Heart,Layers,Leaf,LockKeyhole,
  Music2,Pencil,RefreshCw,Sparkles,Target,UserRound,X} from "lucide-react";
import {getMyTubeTaxonomy,listMyTubeScenarios} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeMeaningAxes,listMyTubeMeaningMotifs} from "@/lib/mandala/mytube-meaning-hierarchy.mjs";
import {listMyTubeStyles} from "@/lib/mandala/mytube-creative-choices.mjs";
import {suggestVideoConcept,reviseVideoConcept,videoConceptIsValid}
  from "@/lib/mandala/auto-video-concept.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-concept.module.css";

export type ApprovedVideoConcept={
  schemaVersion:string;signature:string;source:string;goal:string;
  categoryId:string;subcategoryId:string;topicId:string;meaningAxisId:string;
  motifId:string;scenarioId:string;styleId:string;mainMessage:string;
  sceneOutline:string[];emotionalProgram:string[];
  currentLabel:string;desiredLabel:string;mediaBindingStatus:string;
  hasPersonalInput:boolean;inferredTopic:boolean;
};
type Props={
  locale:PublicLocale;goal:string;theme:string;styleIndex:number;
  phrases:string[];signedIn:boolean;loginUnavailable:boolean;disabled:boolean;
  onRefreshLogin:()=>void;onApprove:(concept:ApprovedVideoConcept)=>void;
  onOpenGoal:()=>void;onOpenStyle:()=>void;
};
const COPY={
 ru:{
  ready:"Автоконцепция готова",title:"Ваша концепция видео",
  lead:"Мы подготовили сценарий на основе вашей цели. Посмотрите предложение и решите, подходит ли оно.",
  example:"Это пример без личной цели. Уточните её во вкладке «Цель», чтобы получить подходящий вариант.",
  goal:"Цель",category:"Категория",subcategory:"Подкатегория",topic:"Тема",
  style:"Стиль",scenario:"Сценарий",emotion:"Эмоциональная программа",meaning:"Смысл",motif:"Мотив",
  stages:"Четыре смысловых эпизода",story:"Основная идея",editing:"Редактирование концепции",
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
  lead:"We prepared a story from your goal. Review the suggestion and decide whether it feels right.",
  example:"This is an example without a personal goal. Add your goal to get a more relevant suggestion.",
  goal:"Goal",category:"Category",subcategory:"Subcategory",topic:"Topic",
  style:"Style",scenario:"Scenario",emotion:"Emotional journey",meaning:"Meaning",motif:"Motif",
  stages:"Four story stages",story:"Main idea",editing:"Edit concept",
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
  lead:"Hemos preparado una historia según tu objetivo. Revisa la propuesta y decide si te gusta.",
  example:"Este es un ejemplo sin objetivo personal. Añade tu objetivo para una mejor propuesta.",
  goal:"Objetivo",category:"Categoría",subcategory:"Subcategoría",topic:"Tema",
  style:"Estilo",scenario:"Guion",emotion:"Programa emocional",meaning:"Sentido",motif:"Motivo",
  stages:"Cuatro fases",story:"Idea principal",editing:"Editar concepto",
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
const IconBadge=({icon:Icon,tone}:{icon:typeof Target;tone:string})=>
  <span className={css.rowIcon} data-tone={tone}><Icon size={19} aria-hidden="true"/></span>;

export function MandalaVideoConcept({locale,goal,theme,styleIndex,phrases,signedIn,
  loginUnavailable,disabled,onRefreshLogin,onApprove,onOpenGoal,onOpenStyle}:Props){
  const t=COPY[locale]||COPY.en;
  const phraseSignature=phrases.join("\u001f");
  const suggested=useMemo(()=>suggestVideoConcept({
    locale,goal,theme,styleIndex,phrases:phraseSignature?phraseSignature.split("\u001f"):[]
  }) as ApprovedVideoConcept,[locale,goal,theme,styleIndex,phraseSignature]);
  const [custom,setCustom]=useState<ApprovedVideoConcept|null>(null);
  const [editing,setEditing]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [approvedSignature,setApprovedSignature]=useState<string|null>(null);
  const editButtonRef=useRef<HTMLButtonElement>(null);
  const modalRef=useRef<HTMLDivElement>(null);
  const concept=(custom&&custom.signature===suggested.signature)?custom:suggested;
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
  const approved=approvedSignature===concept.signature;

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
    setCustom(next);setApprovedSignature(null);
  };
  const submit=()=>{
    if(!videoConceptIsValid(concept))return;
    setApprovedSignature(concept.signature);
    setEditing(false);
    onApprove(concept);
  };
  const rows=[
    {id:"goal",label:t.goal,value:concept.goal,Icon:Target,tone:"rose"},
    {id:"category",label:t.category,value:category.label[locale],Icon:Layers,tone:"gold"},
    {id:"subcategory",label:t.subcategory,value:subcategory.label[locale],Icon:Leaf,tone:"mint"},
    {id:"topic",label:t.topic,value:topic.label[locale],Icon:Sparkles,tone:"purple"},
    {id:"style",label:t.style,value:style?.label||"",Icon:Sparkles,tone:"lilac"},
    {id:"scenario",label:t.scenario,value:scenario?.label||"",Icon:Film,tone:"blue"},
    {id:"emotion",label:t.emotion,value:concept.emotionalProgram.join(" → "),Icon:Heart,tone:"coral"},
    {id:"meaning",label:t.meaning,value:meaning?.label||"",Icon:Brain,tone:"gold"},
    {id:"motif",label:t.motif,value:motif?.label||"",Icon:Leaf,tone:"purple"}
  ] as const;

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
    </div> : <div className={css.rows} data-video-concept-summary>
      {rows.map(row=><div className={css.row} key={row.id} data-video-concept-field={row.id}>
        <IconBadge icon={row.Icon} tone={row.tone}/>
        <strong>{row.label}</strong>
        <span className={css.rowValue}>{row.value}</span>
        <ChevronDown className={css.rowChevron} size={15} aria-hidden="true"/>
      </div>)}
    </div>}
    <details className={css.beats} data-video-concept-beats>
      <summary>{t.stages}<ChevronDown size={17} aria-hidden="true"/></summary>
      <ol>{concept.sceneOutline.map((beat,index)=><li key={index}>{beat}</li>)}</ol>
    </details>
    <p className={css.status} role="note">{t.preview}</p>
    <div className={css.actions}>
      <button type="button" className={css.approve} data-video-concept-approve
        disabled={disabled||!videoConceptIsValid(concept)} onClick={submit}>
        <Check size={21}/><span>{editing?t.save:t.approve}</span><ArrowRight size={18}/>
      </button>
      <button type="button" ref={editButtonRef} className={css.edit}
        data-video-concept-edit disabled={disabled} onClick={()=>{
          if(editing){setEditing(false);return;}
          if(signedIn)setEditing(true);else setLoginOpen(true);
        }}>
        <Pencil size={19}/><span>{editing?t.cancel:t.edit}
          {!signedIn&&!editing?<small>{t.editHelp}</small>:null}</span>
      </button>
    </div>
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
