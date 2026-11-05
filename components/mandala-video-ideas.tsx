"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {Dispatch,SetStateAction} from "react";
import {ArrowDown,Check,Heart,Pencil,Play,Plus,RefreshCw,Sparkles,Target,Zap} from "lucide-react";
import {listMeaningAxes} from "@/lib/mandala/meaning-emotion/idea-engine.mjs";
import {listCurrentEmotionClusters,listDesiredEmotionClusters} from "@/lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import {suggestMeaningPhrases} from "@/lib/mandala/video-meaning-phrases.mjs";
import {linesForVideoAffirmations} from "@/lib/mandala/video-affirmations";
import type {AffirmationSettings} from "@/lib/mandala/video-affirmations";
import type {VideoLocale,VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-ideas.module.css";
type Axis={id:string;label:string;description:string};
type Cluster={id:string;label:string};
type Props={locale:VideoLocale;theme:VideoTheme;active:boolean;disabled:boolean;settings:AffirmationSettings;
 canGenerate:boolean;generating:boolean;onChange:Dispatch<SetStateAction<AffirmationSettings>>;
 onPendingChange:Dispatch<SetStateAction<boolean>>;onPreview:()=>void;onCreate:()=>void};
const wording={
 ru:{title:"Моё состояние и желание",current:"Состояние сейчас",desired:"Желаемое состояние",energy:"Энергия сейчас",scale:"по 10-балльной шкале",want:"Что бы мне хотелось",hint:"Выберите одно или несколько направлений",phrases:"Ваши фразы",regenerate:"Новые варианты",clear:"Очистить",own:"Добавить свою фразу",edit:"Изменить фразу",save:"Сохранить фразу",preview:"Посмотреть фразу в видео",down:"Переместить вниз",create:"Сгенерировать видео",empty:"Выберите направление, чтобы получить фразы",privacy:"Фразы подбираются автоматически, без передачи ответов внешним сервисам."},
 en:{title:"My state and intention",current:"How I feel now",desired:"How I want to feel",energy:"Energy now",scale:"on a 0–10 scale",want:"What I would like",hint:"Choose one or more directions",phrases:"Your phrases",regenerate:"New options",clear:"Clear",own:"Write my own phrase",edit:"Edit phrase",save:"Save phrase",preview:"Preview phrase in video",down:"Move down",create:"Generate video",empty:"Choose a direction for phrases",privacy:"Phrases update automatically without sending your answers to providers."},
 es:{title:"Mi estado y deseo",current:"Cómo me siento ahora",desired:"Cómo quiero sentirme",energy:"Energía actual",scale:"en una escala de 0 a 10",want:"Qué me gustaría",hint:"Elige una o varias direcciones",phrases:"Tus frases",regenerate:"Nuevas opciones",clear:"Borrar",own:"Escribir mi propia frase",edit:"Editar frase",save:"Guardar frase",preview:"Ver frase en vídeo",down:"Mover abajo",create:"Generar vídeo",empty:"Elige una dirección para las frases",privacy:"Las frases cambian automáticamente sin enviar tus respuestas a proveedores."}
} as const;
const allFive=[0,1,2,3,4];
export function MandalaVideoIdeas({locale,theme,active,disabled,settings,canGenerate,generating,
 onChange,onPendingChange,onPreview,onCreate}:Props){
 const t=wording[locale];
 const currentOptions=useMemo<Cluster[]>(()=>listCurrentEmotionClusters(locale),[locale]);
 const desiredOptions=useMemo<Cluster[]>(()=>listDesiredEmotionClusters(locale),[locale]);
 const axes=useMemo<Axis[]>(()=>listMeaningAxes(locale),[locale]);
 const [current,setCurrent]=useState("fatigue");
 const [desired,setDesired]=useState("calm");
 const [stateScore,setStateScore]=useState(4);
 const [energy,setEnergy]=useState(6);
 const [selectedAxes,setSelectedAxes]=useState<string[]>(["anchor"]);
 const [revision,setRevision]=useState(0);
 const [editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState("");
 const [cleared,setCleared]=useState(false);
 const lastApplied=useRef("");
 const signature=JSON.stringify([locale,selectedAxes,current,desired,stateScore,energy,revision]);
 const suggested=useMemo(()=>suggestMeaningPhrases(locale,selectedAxes,current,desired,stateScore,energy,revision),
  [locale,selectedAxes,current,desired,stateScore,energy,revision]);
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
 const toggleAxis=(id:string)=>{
  onPendingChange(false);
  setSelectedAxes(old=>old.includes(id)?(old.length===1?old:old.filter(x=>x!==id)):[...old,id]);
 };
 const moveDown=(index:number)=>{
  if(index>=lines.length-1)return;
  const next=[...lines];[next[index],next[index+1]]=[next[index+1],next[index]];
  save(next);
 };
 return <section className={css.ideas} data-video-ideas-compact aria-label={t.want} hidden={!active}>
   <div className={css.stateCard} data-video-ideas-state>
     <h3 className={css.title}><Heart size={22} aria-hidden="true"/>{t.title}</h3>
     <div className={css.selectGrid}>
       <label className={css.selectField}><span>{t.current}</span>
         <select data-video-ideas-current disabled={disabled} value={current}
           onChange={event=>{setCurrent(event.currentTarget.value);onPendingChange(false)}}>
           {currentOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select>
       </label>
       <label className={css.selectField}><span>{t.desired}</span>
         <select data-video-ideas-desired disabled={disabled} value={desired}
           onChange={event=>{setDesired(event.currentTarget.value);onPendingChange(false)}}>
           {desiredOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select>
       </label>
     </div>
     <div className={css.sliderGrid}>
       <label className={css.sliderField}>
         <span className={css.sliderTitle}><span><Target size={16} aria-hidden="true"/>{t.current}</span>
           <output htmlFor="video-ideas-state-score">{stateScore}/10</output></span>
         <span className={css.scaleHint}>{t.scale}</span>
         <input id="video-ideas-state-score" data-video-ideas-state-score type="range" min={0} max={10} step={1}
           value={stateScore} disabled={disabled} onChange={event=>{setStateScore(Number(event.currentTarget.value));onPendingChange(false)}}/>
       </label>
       <label className={css.sliderField}>
         <span className={css.sliderTitle}><span><Zap size={16} aria-hidden="true"/>{t.energy}</span>
           <output htmlFor="video-ideas-energy-score">{energy}/10</output></span>
         <span className={css.scaleHint}>{t.scale}</span>
         <input id="video-ideas-energy-score" data-video-ideas-energy-score type="range" min={0} max={10} step={1}
           value={energy} disabled={disabled} onChange={event=>{setEnergy(Number(event.currentTarget.value));onPendingChange(false)}}/>
       </label>
     </div>
   </div>
   <div className={css.wishCard} data-video-ideas-axes>
     <h3 className={css.title}><Sparkles size={22} aria-hidden="true"/>{t.want}</h3>
     <p className={css.subtitle}>{t.hint}</p>
     <div className={css.axisGrid} role="group" aria-label={t.want}>
       {axes.map(axis=><button key={axis.id} type="button" className={css.axisButton}
         data-video-meaning-axis={axis.id} title={axis.description}
         aria-pressed={selectedAxes.includes(axis.id)} disabled={disabled}
         onClick={()=>toggleAxis(axis.id)}>{selectedAxes.includes(axis.id)?
           <Check size={16} aria-hidden="true"/>:null}{axis.label}</button>)}
     </div>
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
   <button type="button" className={css.create} data-video-ideas-create disabled={disabled||!canGenerate}
     onClick={onCreate}><Play size={23} fill="currentColor" aria-hidden="true"/>
      {generating?t.create+"…":t.create}<span aria-hidden="true">→</span>
   </button>
   <p className={css.privacy}>{t.privacy}</p>
 </section>;
}
