"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {Dispatch,SetStateAction} from "react";
import {ArrowDown,Check,ChevronDown,Heart,Mic,Pencil,Play,Plus,RefreshCw,SlidersHorizontal,Sparkles,Target,Zap} from "lucide-react";
import {listMeaningAxes} from "@/lib/mandala/meaning-emotion/idea-engine.mjs";
import {listCurrentEmotionClusters,listDesiredEmotionClusters} from "@/lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import {resolveVideoIdeaContext,suggestVideoGoalPhrases} from "@/lib/mandala/video-goal-idea-phrases.mjs";
import {isIdeaEditorSnapshot,planIdeaSelection,sanitizeIdeaPhrase} from "@/lib/mandala/video-idea-selection.mjs";
import {goalCurrentMeaningId,goalDesiredMeaningId,DEFAULT_VIDEO_GOAL_PROFILE,type VideoGoalProfile} from "./mandala-video-personalization";
import type {AffirmationSettings} from "@/lib/mandala/video-affirmations";
import type {VideoLocale,VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-ideas.module.css";

type Axis={id:string;label:string;description:string};
type Cluster={id:string;label:string};
type Props={
 locale:VideoLocale;theme:VideoTheme;requestText:string;active:boolean;disabled:boolean;settings:AffirmationSettings;
 profile?:VideoGoalProfile;
 generating:boolean;onChange:Dispatch<SetStateAction<AffirmationSettings>>;
 onPendingChange:Dispatch<SetStateAction<boolean>>;onPreview:()=>void;onCreate:()=>void;status?:string;
 onRecord:()=>void;onResetPreview:()=>void;
};

const wording={
 ru:{
  size:"Размер фразы на экране",sizes:["Меньше","Обычно","Крупнее"],select:"Выберите свои фразы",
  selected:"выбрано",pick:"Выберите минимум 5 фраз, которые вам откликаются.",
  more:"Ещё фразы",moreHint:"Другие варианты",own:"Своя фраза",ownHint:"Написать текст",
  record:"Записать голос",recordHint:"Свой голос",add:"Добавить",cancel:"Отмена",
  placeholder:"Введите свою короткую фразу",edit:"Изменить фразу",save:"Сохранить",
  play:"Показать фразы в видео",move:"Переместить ниже",choose:"Выбрать фразу",unchoose:"Убрать фразу",
  clear:"Сбросить выбор",max:"В видео можно выбрать не более 10 фраз.",
  full:"Сначала выберите как минимум 5 фраз.",next:"Перейти к монтажу",
  refine:"Уточнить состояние и направления",title:"Моё состояние и желание",
  current:"Состояние сейчас",desired:"Желаемое состояние",energy:"Энергия сейчас",
  scale:"по 10-балльной шкале",want:"Что бы мне хотелось",
  hint:"Выберите одно или несколько направлений",
  privacy:"Фразы подбираются в браузере. Изменения можно внести позже.",
  saved:"Фраза сохранена и включена в видео.",savedReplaced:"Фраза в видео. Последняя выбранная заменена.",
 },
 en:{
  size:"Text size on screen",sizes:["Smaller","Standard","Larger"],select:"Select your phrases",
  selected:"selected",pick:"Choose at least 5 phrases that resonate with you.",
  more:"More phrases",moreHint:"New options",own:"Write a phrase",ownHint:"Your own words",
  record:"Record a phrase",recordHint:"Use your voice",add:"Add phrase",cancel:"Cancel",
  placeholder:"Write a short supportive phrase",edit:"Edit phrase",save:"Save",
  play:"Preview phrases in video",move:"Move phrase down",choose:"Select phrase",unchoose:"Deselect phrase",
  clear:"Clear selection",max:"Choose up to 10 phrases for your video.",
  full:"Choose at least 5 phrases to continue.",next:"Continue to Montage",
  refine:"Fine-tune my state and intention",title:"My state and intention",
  current:"How I feel now",desired:"How I want to feel",energy:"Energy now",
  scale:"on a 0–10 scale",want:"What I would like",
  hint:"Choose one or more directions",
  privacy:"Suggestions stay in your browser. You can change them later.",
  saved:"Saved and included in your video.",savedReplaced:"Saved in video; last selected phrase was replaced.",
 },
 es:{
  size:"Tamaño de texto en pantalla",sizes:["Menor","Normal","Mayor"],select:"Elige tus frases",
  selected:"elegidas",pick:"Elige al menos 5 frases que conecten contigo.",
  more:"Más frases",moreHint:"Otras opciones",own:"Escribir frase",ownHint:"Con tus palabras",
  record:"Grabar frase",recordHint:"Tu propia voz",add:"Añadir frase",cancel:"Cancelar",
  placeholder:"Escribe una frase breve de apoyo",edit:"Editar frase",save:"Guardar",
  play:"Ver frases en vídeo",move:"Mover frase abajo",choose:"Elegir frase",unchoose:"Quitar frase",
  clear:"Borrar selección",max:"Puedes elegir hasta 10 frases para el vídeo.",
  full:"Elige al menos 5 frases para continuar.",next:"Continuar al montaje",
  refine:"Ajustar mi estado y mi intención",title:"Mi estado y deseo",
  current:"Cómo me siento ahora",desired:"Cómo quiero sentirme",energy:"Energía actual",
  scale:"en una escala de 0 a 10",want:"Qué me gustaría",
  hint:"Elige una o varias direcciones",
  privacy:"Las sugerencias permanecen en tu navegador. Puedes cambiarlas después.",
  saved:"Frase guardada e incluida en el vídeo.",savedReplaced:"Guardada; se reemplazó la última frase elegida.",
 }
} as const;

const allFive=[0,1,2,3,4];
const scaleValues=["small","medium","large"] as const;
const cleanPhrase=sanitizeIdeaPhrase;

export function MandalaVideoIdeas({locale,theme,requestText,profile,active,disabled,settings,generating,
 onChange,onPendingChange,onPreview,onCreate,status,onRecord,onResetPreview}:Props){
 const t=wording[locale];
 const goalContext=useMemo(()=>resolveVideoIdeaContext({locale,request:requestText,theme}),[locale,requestText,theme]);
 const currentOptions=useMemo<Cluster[]>(()=>listCurrentEmotionClusters(locale),[locale]);
 const desiredOptions=useMemo<Cluster[]>(()=>listDesiredEmotionClusters(locale),[locale]);
 const axes=useMemo<Axis[]>(()=>listMeaningAxes(locale),[locale]);
 const [current,setCurrent]=useState("fatigue");
 const [desired,setDesired]=useState(()=>goalContext.desiredId);
 const [stateScore,setStateScore]=useState(4);
 const [energy,setEnergy]=useState(6);
 const [selectedAxes,setSelectedAxes]=useState<string[]>(()=>goalContext.axisIds);
 const [selectionGoalKey,setSelectionGoalKey]=useState(goalContext.key);
 const [revision,setRevision]=useState(0);
 const [options,setOptions]=useState<string[]>(()=>suggestVideoGoalPhrases({locale,request:requestText,theme,axisIds:goalContext.axisIds,desired:goalContext.desiredId,limit:7}));
 const [chosen,setChosen]=useState<number[]>(allFive);
 const [editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState("");
 const [adding,setAdding]=useState(false);
 const [moreClicks,setMoreClicks]=useState(0);
 const [feedback,setFeedback]=useState("");
 const lastApplied=useRef("");
 // A changed Goal starts a new set of proposals. Merely revisiting Ideas
 // with the same Goal never discards locally edited/approved phrases.
 const axesForGoal=selectionGoalKey===goalContext.key?selectedAxes:goalContext.axisIds;
 const desiredForGoal=selectionGoalKey===goalContext.key?desired:goalContext.desiredId;
 useEffect(()=>{
  if(selectionGoalKey===goalContext.key)return;
  setSelectionGoalKey(goalContext.key);
  setSelectedAxes(goalContext.axisIds);
  setDesired(goalContext.desiredId);
  setRevision(0);
 },[selectionGoalKey,goalContext.key,goalContext.axisIds,goalContext.desiredId]);
 // Preserve the canonical Goal classifier. Explicit local Personalization
 // answers refine its suggestions without losing Love/relationship relevance.
 const profileKey=JSON.stringify(profile??null);
 const hasCurrentChoice=Boolean(profile&&
  JSON.stringify(profile.current)!==JSON.stringify(DEFAULT_VIDEO_GOAL_PROFILE.current));
 const hasDesiredChoice=Boolean(profile&&
  JSON.stringify(profile.desired)!==JSON.stringify(DEFAULT_VIDEO_GOAL_PROFILE.desired));
 const hasAxesChoice=Boolean(profile&&
  JSON.stringify(profile.axes)!==JSON.stringify(DEFAULT_VIDEO_GOAL_PROFILE.axes));
 const profileCurrent=profile?.current?.length?profile.current.map(goalCurrentMeaningId):[current];
 const profileDesired=profile?.desired?.length?profile.desired.map(goalDesiredMeaningId):[desiredForGoal];
 // The user's chosen axes take priority; changing only an energy slider must
 // not silently replace the Goal's Love/relationship axis with default "meaning".
 const axesForSuggestions=hasAxesChoice
  ?[...new Set([...(profile?.axes??[]),...goalContext.axisIds])].slice(0,3):axesForGoal;
 const currentForSuggestions=hasCurrentChoice?profileCurrent:[current];
 const desiredForSuggestions=hasDesiredChoice?profileDesired:[desiredForGoal];
 const strengthForSuggestions=profile&&profile.desiredLevel!==DEFAULT_VIDEO_GOAL_PROFILE.desiredLevel
  ?profile.desiredLevel:stateScore;
 const energyForSuggestions=profile&&profile.energy!==DEFAULT_VIDEO_GOAL_PROFILE.energy
  ?profile.energy:energy;
 const signature=JSON.stringify([goalContext.key,axesForSuggestions,currentForSuggestions,
  desiredForSuggestions,strengthForSuggestions,energyForSuggestions,revision,profileKey]);
 const suggested=useMemo(()=>{
  const pool:string[]=[];
  for(let i=0;i<Math.max(currentForSuggestions.length,desiredForSuggestions.length);i++){
   const next=suggestVideoGoalPhrases({
    locale,request:requestText,theme,axisIds:axesForSuggestions,
    current:currentForSuggestions[i%currentForSuggestions.length],
    desired:desiredForSuggestions[i%desiredForSuggestions.length],
    strength:strengthForSuggestions,energy:energyForSuggestions,
    revision:revision+i,limit:7,
   });
   for(const line of next)if(!pool.includes(line))pool.push(line);
  }
  return pool.slice(0,7);
  // Personal answers are represented by their stable serialized values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[locale,requestText,theme,goalContext.key,profileKey,selectionGoalKey,
  selectedAxes,current,desired,stateScore,energy,revision]);

 // Keep the edited list in the parent's session state, the same source used by
 // Canvas and export. Mounting Ideas again must not replace saved user words.
 useEffect(()=>{
  if(!active||signature===lastApplied.current)return;
  lastApplied.current=signature;
  setMoreClicks(0);setEditing(null);setAdding(false);setFeedback("");
  const remembered=settings.ideasDraft;
  if(remembered&&isIdeaEditorSnapshot(remembered,signature)){
   setOptions(remembered.options);setChosen(remembered.chosen);
   return;
  }
  // A genuine change in Goal refinement deliberately starts new suggestions.
  const initial=planIdeaSelection(suggested,allFive,suggested,signature);
  setOptions(initial.editor.options);setChosen(initial.editor.chosen);
  onChange(old=>({...old,...initial.settingsPatch,ideasDraft:initial.editor,
   motion:"rise",visibility:old.visibility.length?old.visibility:["large"]}));
 },[active,signature,suggested,onChange,settings.ideasDraft]);

 const selectedCount=chosen.length;
 const textSizeIndex=Math.max(0,scaleValues.indexOf(settings.textScale??"medium"));
 const apply=(candidates:string[],indices:number[])=>{
  // Mark this signature initialized before a real click can be overwritten by
  // a delayed activation effect when iOS/WebKit enters Montage → Text.
  // Editing phrases always wins over stale automatic bootstrap suggestions.
  lastApplied.current=signature;
  // The editor and renderer receive a single projection of the selected text.
  // Stop an old playback frame before repainting at 0 with the new phrases.
  const plan=planIdeaSelection(candidates,indices,suggested,signature);
  onResetPreview();
  onChange(old=>({...old,...plan.settingsPatch,ideasDraft:plan.editor,motion:"rise",
   visibility:old.visibility.length?old.visibility:["large"]}));
  onPendingChange(false);
  setOptions(plan.editor.options);setChosen(plan.editor.chosen);setFeedback("");
 };
 const toggle=(index:number)=>{
  if(chosen.includes(index))apply(options,chosen.filter(i=>i!==index));
  else if(chosen.length>=10){
   // An explicit choice at the cap replaces the last selected phrase. This
   // keeps the hard maximum of ten while making the visible choice actionable.
   apply(options,[...chosen.slice(0,-1),index]);
   setFeedback(t.savedReplaced);
  }else apply(options,[...chosen,index]);
 };
 const saveDraft=(index:number)=>{
  const value=cleanPhrase(draft);
  if(!value)return;
  const next=[...options];next[index]=value;
  // Editing an unselected choice must also include it in the movie.
  // The maximum remains ten; replace the last choice only at that limit.
  const replaced=!chosen.includes(index)&&chosen.length>=10;
  const nextChosen=chosen.includes(index)?chosen:
   replaced?[...chosen.slice(0,-1),index]:[...chosen,index];
  apply(next,nextChosen);setEditing(null);setDraft("");
  setFeedback(replaced?t.savedReplaced:t.saved);
 };
 const moveDown=(index:number)=>{
  if(index>=options.length-1)return;
  const next=[...options];[next[index],next[index+1]]=[next[index+1],next[index]];
  apply(next,chosen.map(i=>i===index?index+1:i===index+1?index:i));
  setEditing(null);
 };
 const addOwn=()=>{
  const value=cleanPhrase(draft);
  if(!value||options.length>=14)return;
  const next=[...options,value];
  apply(next,chosen.length<10?[...chosen,options.length]:chosen);
  setDraft("");setAdding(false);
 };
 const moreOptions=()=>{
  if(options.length>=14)return;
  const candidates=suggestVideoGoalPhrases({
   locale,request:requestText,theme,axisIds:axesForSuggestions,
   current:currentForSuggestions[0],desired:desiredForSuggestions[0],
   strength:strengthForSuggestions,energy:energyForSuggestions,
   revision:revision+moreClicks,
   excluded:options,limit:Math.min(3,14-options.length),
  });
  setMoreClicks(n=>n+1);
  if(candidates.length)apply([...options,...candidates],chosen);
 };
 const toggleAxis=(id:string)=>{
  setSelectedAxes(old=>old.includes(id)?(old.length===1?old:old.filter(x=>x!==id)):[...old,id]);
  onPendingChange(false);
 };

 return <section className={css.ideas} data-video-ideas-compact data-video-ideas-goal-category={goalContext.categoryId||"neutral"} aria-label={t.select} hidden={!active}>
  <div className={css.sizeCard} data-video-ideas-size>
   <div className={css.sizeTitle}>
    <label htmlFor="video-ideas-text-size"><span className={css.sample} data-scale={scaleValues[textSizeIndex]}>Aa</span>{t.size}</label>
    <output htmlFor="video-ideas-text-size">{t.sizes[textSizeIndex]}</output>
   </div>
   <input id="video-ideas-text-size" data-video-ideas-text-size type="range" min={0} max={2} step={1}
    value={textSizeIndex} disabled={disabled}
    onChange={event=>{onResetPreview();onChange(old=>({...old,textScale:scaleValues[Number(event.currentTarget.value)]}));}}/>
   <div className={css.sizeHints} aria-hidden="true">{t.sizes.map(value=><span key={value}>{value}</span>)}</div>
  </div>

  <section className={css.phrases} data-video-ideas-phrases aria-labelledby="video-ideas-phrases-heading">
   <div className={css.phraseHeader}>
    <h3 id="video-ideas-phrases-heading"><Heart size={25} aria-hidden="true"/>{t.select}</h3>
    <span className={css.count} data-video-ideas-selected-count>{selectedCount} / {options.length} {t.selected}</span>
   </div>
   <p className={css.subtitle} id="ideas-choice-help">{t.pick}</p>
   <ol className={css.phraseList} data-video-ideas-scroll aria-describedby="ideas-choice-help" tabIndex={0}>
    {options.map((line,index)=><li key={index} data-video-idea-phrase={index} className={css.item}
      data-selected={chosen.includes(index)}>
     <button type="button" className={css.pick} data-video-idea-select={index}
      aria-pressed={chosen.includes(index)} aria-label={(chosen.includes(index)?t.unchoose:t.choose)+": "+line}
      disabled={disabled} onClick={()=>toggle(index)}>
      {chosen.includes(index)?<Check size={19} strokeWidth={3} aria-hidden="true"/>:null}
     </button>
     {editing===index?<input data-video-idea-edit={index} className={css.editInput}
       aria-label={t.edit} maxLength={36} value={draft} disabled={disabled}
       onChange={event=>setDraft(event.currentTarget.value)}
       onKeyDown={event=>{if(event.key==="Enter")saveDraft(index);if(event.key==="Escape")setEditing(null)}}/>:
       <span className={css.phraseText}>{line}</span>}
     <button type="button" className={css.play} data-video-idea-play={index}
      disabled={disabled} aria-label={editing===index?t.move:t.play}
      onClick={()=>editing===index?moveDown(index):onPreview()}>
      {editing===index?<ArrowDown size={21} aria-hidden="true"/>:<Play size={20} aria-hidden="true"/>}
     </button>
     <button type="button" className={css.edit} data-video-idea-edit-button={index}
      disabled={disabled} aria-label={editing===index?t.save:t.edit}
      onClick={()=>editing===index?saveDraft(index):(setDraft(line),setEditing(index),setAdding(false))}>
      {editing===index?<Check size={22} aria-hidden="true"/>:<Pencil size={20} aria-hidden="true"/>}
     </button>
    </li>)}
   </ol>
   {selectedCount<5?<p className={css.warning} data-video-ideas-minimum role="status">{t.full}</p>:null}
   {feedback?<p className={feedback===t.saved||feedback===t.savedReplaced?css.saved:css.warning}
     data-video-ideas-feedback role="status">{feedback}</p>:null}

   <div className={css.actions}>
    <button type="button" data-video-ideas-regenerate disabled={disabled||options.length>=14}
     onClick={moreOptions}><RefreshCw size={23} aria-hidden="true"/>
     <span><strong>{t.more}</strong><small>{t.moreHint}</small></span></button>
    <button type="button" data-video-ideas-own-phrase disabled={disabled||options.length>=14}
     aria-expanded={adding} onClick={()=>{setAdding(v=>!v);setDraft("");setEditing(null)}}>
     <Plus size={23} aria-hidden="true"/>
     <span><strong>{t.own}</strong><small>{t.ownHint}</small></span></button>
    <button type="button" data-video-ideas-record disabled={disabled}
     onClick={onRecord}><Mic size={23} aria-hidden="true"/>
     <span><strong>{t.record}</strong><small>{t.recordHint}</small></span></button>
   </div>
   {adding?<form className={css.addForm} data-video-ideas-custom-form onSubmit={event=>{event.preventDefault();addOwn()}}>
    <input aria-label={t.placeholder} placeholder={t.placeholder} value={draft} maxLength={36}
     disabled={disabled} onChange={event=>setDraft(event.currentTarget.value)}/>
    <button type="submit" disabled={disabled||!cleanPhrase(draft)}>{t.add}</button>
    <button type="button" onClick={()=>{setAdding(false);setDraft("")}}>{t.cancel}</button>
   </form>:null}
   <button type="button" className={css.clear} data-video-ideas-clear disabled={disabled||!chosen.length}
    onClick={()=>apply(options,[])}>{t.clear}</button>
  </section>

  <details className={css.refine} data-video-ideas-refine hidden={Boolean(profile)}>
   <summary><SlidersHorizontal size={19} aria-hidden="true"/>{t.refine}<ChevronDown size={18} aria-hidden="true"/></summary>
   <div className={css.stateCard} data-video-ideas-state>
    <h3 className={css.title}><Heart size={20} aria-hidden="true"/>{t.title}</h3>
    <div className={css.selectGrid}>
     <label className={css.selectField}><span>{t.current}</span>
      <select data-video-ideas-current disabled={disabled} value={current} onChange={event=>setCurrent(event.currentTarget.value)}>
       {currentOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
      </select></label>
     <label className={css.selectField}><span>{t.desired}</span>
      <select data-video-ideas-desired disabled={disabled} value={desiredForGoal} onChange={event=>setDesired(event.currentTarget.value)}>
       {desiredOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
      </select></label>
    </div>
    <div className={css.sliderGrid}>
     <label className={css.sliderField}>
      <span className={css.sliderTitle}><span><Target size={16} aria-hidden="true"/>{t.current}</span><output htmlFor="video-ideas-state-score">{stateScore}/10</output></span>
      <span className={css.scaleHint}>{t.scale}</span>
      <input id="video-ideas-state-score" data-video-ideas-state-score type="range" min={0} max={10} step={1}
       disabled={disabled} value={stateScore} onChange={event=>setStateScore(Number(event.currentTarget.value))}/>
     </label>
     <label className={css.sliderField}>
      <span className={css.sliderTitle}><span><Zap size={16} aria-hidden="true"/>{t.energy}</span><output htmlFor="video-ideas-energy-score">{energy}/10</output></span>
      <span className={css.scaleHint}>{t.scale}</span>
      <input id="video-ideas-energy-score" data-video-ideas-energy-score type="range" min={0} max={10} step={1}
       disabled={disabled} value={energy} onChange={event=>setEnergy(Number(event.currentTarget.value))}/>
     </label>
    </div>
   </div>
   <div className={css.wishCard} data-video-ideas-axes>
    <h3 className={css.title}><Sparkles size={20} aria-hidden="true"/>{t.want}</h3>
    <p className={css.subtitle}>{t.hint}</p>
    <div className={css.axisGrid} role="group" aria-label={t.want}>
     {axes.map(axis=><button key={axis.id} type="button" data-video-meaning-axis={axis.id}
      title={axis.description} aria-pressed={axesForGoal.includes(axis.id)} disabled={disabled}
      onClick={()=>toggleAxis(axis.id)}>{selectedAxes.includes(axis.id)?<Check size={16} aria-hidden="true"/>:null}{axis.label}</button>)}
    </div>
   </div>
  </details>

  <div className={css.stageActions} data-video-stage-actions="ideas">
  <button type="button" className={css.create} data-video-ideas-create
    disabled={disabled||selectedCount<5} onClick={onCreate}>
    <Sparkles size={19} aria-hidden="true"/>
    {locale==="ru"?"Проверить storyboard":locale==="es"?"Revisar storyboard":"Review storyboard"}
    <span aria-hidden="true">→</span>
  </button>
 </div>
 {status?<p className={css.stageStatus} role="status" aria-live="polite">{status}</p>:null}
 <p className={css.privacy}>{t.privacy}</p>
 </section>;
}
