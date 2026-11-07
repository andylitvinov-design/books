"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {Dispatch,SetStateAction} from "react";
import {ArrowDown,Check,Heart,Pencil,Play,Plus,RefreshCw} from "lucide-react";
import {goalCurrentMeaningId,goalDesiredMeaningId} from "./mandala-video-goal-clarification";
import type {VideoGoalProfile} from "./mandala-video-goal-clarification";
import {suggestMeaningPhrases} from "@/lib/mandala/video-meaning-phrases.mjs";
import {linesForVideoAffirmations} from "@/lib/mandala/video-affirmations";
import type {AffirmationSettings} from "@/lib/mandala/video-affirmations";
import type {VideoLocale,VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-ideas.module.css";
type Props={locale:VideoLocale;theme:VideoTheme;active:boolean;disabled:boolean;settings:AffirmationSettings;
 goalProfile:VideoGoalProfile;onBackToGoal:()=>void;generating:boolean;
 onChange:Dispatch<SetStateAction<AffirmationSettings>>;
 onPendingChange:Dispatch<SetStateAction<boolean>>;onPreview:()=>void;onCreate:()=>void};
const wording={
 ru:{title:"Моё состояние и желание",current:"Состояние сейчас",desired:"Желаемое состояние",energy:"Энергия сейчас",scale:"по 10-балльной шкале",want:"Что бы мне хотелось",hint:"Выберите одно или несколько направлений",phrases:"Ваши фразы",regenerate:"Новые варианты",clear:"Очистить",own:"Добавить свою фразу",edit:"Изменить фразу",save:"Сохранить фразу",preview:"Посмотреть фразу в видео",down:"Переместить вниз",create:"Сгенерировать видео",empty:"Выберите направление, чтобы получить фразы",privacy:"Фразы подбираются автоматически, без передачи ответов внешним сервисам."},
 en:{title:"My state and intention",current:"How I feel now",desired:"How I want to feel",energy:"Energy now",scale:"on a 0–10 scale",want:"What I would like",hint:"Choose one or more directions",phrases:"Your phrases",regenerate:"New options",clear:"Clear",own:"Write my own phrase",edit:"Edit phrase",save:"Save phrase",preview:"Preview phrase in video",down:"Move down",create:"Generate video",empty:"Choose a direction for phrases",privacy:"Phrases update automatically without sending your answers to providers."},
 es:{title:"Mi estado y deseo",current:"Cómo me siento ahora",desired:"Cómo quiero sentirme",energy:"Energía actual",scale:"en una escala de 0 a 10",want:"Qué me gustaría",hint:"Elige una o varias direcciones",phrases:"Tus frases",regenerate:"Nuevas opciones",clear:"Borrar",own:"Escribir mi propia frase",edit:"Editar frase",save:"Guardar frase",preview:"Ver frase en vídeo",down:"Mover abajo",create:"Generar vídeo",empty:"Elige una dirección para las frases",privacy:"Las frases cambian automáticamente sin enviar tus respuestas a proveedores."}
} as const;
const allFive=[0,1,2,3,4];
export function MandalaVideoIdeas({locale,theme,active,disabled,settings,generating,goalProfile,onBackToGoal,
 onChange,onPendingChange,onPreview,onCreate}:Props){
 const t=wording[locale];
 const [revision,setRevision]=useState(0);
 const [editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState("");
 const [cleared,setCleared]=useState(false);
 const lastApplied=useRef("");
 const signature=JSON.stringify([locale,goalProfile,revision]);
 // Reuse the same offline five-line editor; all selected inputs influence
 // editorial text, without a new model, diagnosis or provider transfer.
 const suggested=useMemo(()=>{
  const currents=goalProfile.current.length?goalProfile.current:["fatigue"];
  const desireds=goalProfile.desired.length?goalProfile.desired:["calm"];
  const axes=goalProfile.axes.length?goalProfile.axes:["meaning"];
  const variants=Array.from({length:5},(_,idx)=>suggestMeaningPhrases(
   locale,axes,goalCurrentMeaningId(currents[idx%currents.length]),
   goalDesiredMeaningId(desireds[idx%desireds.length]),
   goalProfile.desiredLevel,goalProfile.energy,revision+idx));
  const picked=variants.map((lines,idx)=>lines[idx]).concat(variants.flat());
  return [...new Set(picked.filter(line=>typeof line==="string"&&line.trim()))].slice(0,5);
 },[locale,goalProfile,revision]);
 useEffect(()=>{
  if(!active||signature===lastApplied.current)return;
  lastApplied.current=signature;
  onChange(old=>({...old,enabled:true,selected:allFive,custom:"",presetOverride:suggested,
   visibility:old.visibility.length?old.visibility:["large"]}));
  // Choosing a tab is not consent to silently approve a legacy pending draft.
  setCleared(false);setEditing(null);
 },[active,signature,suggested,onChange]);
 const stored=linesForVideoAffirmations(locale,theme,settings);
 const lines=cleared?[]:settings.presetOverride?.length===5?stored:suggested;
 const save=(next:string[])=>{
  const safe=next.slice(0,5).map(line=>Array.from(line.replace(/[<>]/g,"").trim()).slice(0,36).join(""));
  if(safe.length!==5||safe.some(line=>!line))return false;
  onChange(old=>({...old,enabled:true,selected:allFive,custom:"",presetOverride:safe}));
  onPendingChange(false);setCleared(false);return true;
 };
 const saveDraft=(index:number)=>{
  if(!draft.trim())return;
  const next=[...lines];next[index]=draft;
  if(save(next))setEditing(null);
 };
 const moveDown=(index:number)=>{
  if(index>=lines.length-1)return;
  const next=[...lines];[next[index],next[index+1]]=[next[index+1],next[index]];
  save(next);
 };
 return <section className={css.ideas} data-video-ideas-compact aria-label={t.want} hidden={!active}>
   <div className={css.goalSummary} data-video-ideas-goal-summary>
   <span>{locale==="ru"?"Цель уточнена · выберите установки":
    locale==="es"?"Objetivo definido · elige las frases":"Goal clarified · choose your support phrases"}</span>
   <button type="button" data-video-ideas-edit-goal disabled={disabled} onClick={onBackToGoal}>
    {locale==="ru"?"Изменить ответы":locale==="es"?"Editar respuestas":"Edit my answers"}
   </button>
  </div>
  <section className={css.phrases} data-video-ideas-phrases aria-labelledby="video-ideas-phrases-heading">
     <div className={css.phraseHeader}><h3 id="video-ideas-phrases-heading">
         <Heart size={22} aria-hidden="true"/>{t.phrases} ({lines.length})</h3>
       <div className={css.actions}>
         <button type="button" data-video-ideas-regenerate disabled={disabled}
           onClick={()=>setRevision(n=>n+1)}><RefreshCw size={15} aria-hidden="true"/>{t.regenerate}</button>
         <button type="button" data-video-ideas-clear disabled={disabled} onClick={()=>{
           setCleared(true);setEditing(null);
           onChange(old=>({...old,enabled:false,selected:[],presetOverride:undefined,custom:""}));
           onPendingChange(false);
         }}>{t.clear}</button>
       </div>
     </div>
     {lines.length===0?<p className={css.subtitle}>{t.empty}</p>:null}
     <ol className={css.phraseList}>
       {lines.map((line,index)=><li key={index} data-video-idea-phrase={index} className={css.item}>
         <span className={css.number}>{index+1}</span>
         {editing===index?<input data-video-idea-edit={index} aria-label={t.edit}
           className={css.editInput} maxLength={36} value={draft} disabled={disabled}
           onChange={event=>setDraft(event.currentTarget.value)}
           onKeyDown={event=>{if(event.key==="Enter")saveDraft(index);if(event.key==="Escape")setEditing(null)}}/>:
           <span className={css.text}>{line}</span>}
         <button type="button" className={css.tool} disabled={disabled} aria-label={t.preview}
           onClick={onPreview}><Play size={16} aria-hidden="true"/></button>
         <button type="button" className={css.tool} disabled={disabled}
           aria-label={editing===index?t.save:t.edit} onClick={()=>{
             if(editing===index)saveDraft(index);else{setDraft(line);setEditing(index);}
           }}>{editing===index?<Check size={17} aria-hidden="true"/>:<Pencil size={17} aria-hidden="true"/>}</button>
         <button type="button" className={css.tool} disabled={disabled||index===lines.length-1||editing!==null}
           aria-label={t.down} onClick={()=>moveDown(index)}><ArrowDown size={16} aria-hidden="true"/></button>
       </li>)}
     </ol>
     {lines.length===5?<button type="button" data-video-ideas-own-phrase className={css.own}
       disabled={disabled} onClick={()=>{setDraft(lines[4]);setEditing(4)}}>
       <Plus size={18} aria-hidden="true"/>{t.own}</button>:null}
   </section>
   <button type="button" className={css.create} data-video-ideas-create disabled={disabled}
     onClick={onCreate}><Play size={23} fill="currentColor" aria-hidden="true"/>
      {generating?t.create+"…":t.create}<span aria-hidden="true">→</span>
   </button>
   <p className={css.privacy}>{t.privacy}</p>
 </section>;
}
