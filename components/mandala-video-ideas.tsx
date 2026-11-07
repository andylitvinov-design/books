"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import type {Dispatch,SetStateAction} from "react";
import {ArrowDown,Check,Heart,Pencil,Play,Plus,RefreshCw,Sparkles} from "lucide-react";
import {listMeaningAxes} from "@/lib/mandala/meaning-emotion/idea-engine.mjs";
import {listCurrentEmotionClusters,listDesiredEmotionClusters} from "@/lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import {suggestMeaningPhrases} from "@/lib/mandala/video-meaning-phrases.mjs";
import {linesForVideoAffirmations} from "@/lib/mandala/video-affirmations";
import type {AffirmationSettings} from "@/lib/mandala/video-affirmations";
import type {VideoLocale,VideoTheme} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-ideas.module.css";
type Axis={id:string;label:string;description:string};
type Cluster={id:string;label:string};
type Props={locale:VideoLocale;theme:VideoTheme;active:boolean;clarify:boolean;disabled:boolean;settings:AffirmationSettings;
 generating:boolean;onChange:Dispatch<SetStateAction<AffirmationSettings>>;
 onPendingChange:Dispatch<SetStateAction<boolean>>;onPreview:()=>void;onCreate:()=>void};
const wording={
 ru:{title:"Моё состояние и желание",current:"Состояние сейчас",desired:"Желаемое состояние",energy:"Энергия сейчас",scale:"по 10-балльной шкале",want:"Что бы мне хотелось",hint:"Выберите одно или несколько направлений",phrases:"Ваши фразы",regenerate:"Новые варианты",clear:"Очистить",own:"Добавить свою фразу",edit:"Изменить фразу",save:"Сохранить фразу",preview:"Посмотреть фразу в видео",down:"Переместить вниз",create:"Сгенерировать видео",empty:"Выберите направление, чтобы получить фразы",privacy:"Фразы подбираются автоматически, без передачи ответов внешним сервисам."},
 en:{title:"My state and intention",current:"How I feel now",desired:"How I want to feel",energy:"Energy now",scale:"on a 0–10 scale",want:"What I would like",hint:"Choose one or more directions",phrases:"Your phrases",regenerate:"New options",clear:"Clear",own:"Write my own phrase",edit:"Edit phrase",save:"Save phrase",preview:"Preview phrase in video",down:"Move down",create:"Generate video",empty:"Choose a direction for phrases",privacy:"Phrases update automatically without sending your answers to providers."},
 es:{title:"Mi estado y deseo",current:"Cómo me siento ahora",desired:"Cómo quiero sentirme",energy:"Energía actual",scale:"en una escala de 0 a 10",want:"Qué me gustaría",hint:"Elige una o varias direcciones",phrases:"Tus frases",regenerate:"Nuevas opciones",clear:"Borrar",own:"Escribir mi propia frase",edit:"Editar frase",save:"Guardar frase",preview:"Ver frase en vídeo",down:"Mover abajo",create:"Generar vídeo",empty:"Elige una dirección para las frases",privacy:"Las frases cambian automáticamente sin enviar tus respuestas a proveedores."}
} as const;
const allFive=[0,1,2,3,4];
export function MandalaVideoIdeas({locale,theme,active,clarify,disabled,settings,generating,
 onChange,onPendingChange,onPreview,onCreate}:Props){
 const t=wording[locale];
 const currentOptions=useMemo<Cluster[]>(()=>listCurrentEmotionClusters(locale),[locale]);
 const desiredOptions=useMemo<Cluster[]>(()=>listDesiredEmotionClusters(locale),[locale]);
 const axes=useMemo<Axis[]>(()=>listMeaningAxes(locale),[locale]);
 const [clarifyHost,setClarifyHost]=useState<HTMLElement|null>(null);
 useEffect(()=>setClarifyHost(document.querySelector<HTMLElement>("[data-video-goal-refinement-host]")),[]);
 const [currentMood,setCurrentMood]=useState<"sad"|"neutral"|"happy">("neutral");
 const [desiredMood,setDesiredMood]=useState<"sad"|"neutral"|"happy">("neutral");
 const [currentPicked,setCurrentPicked]=useState<string[]>(["fatigue"]);
 const [desiredPicked,setDesiredPicked]=useState<string[]>(["calm"]);
 const current=currentPicked[0]||"fatigue",desired=desiredPicked[0]||"calm";
 const [stateScore,setStateScore]=useState(6);
 const [energy,setEnergy]=useState(4);
 const [selectedAxes,setSelectedAxes]=useState<string[]>(["anchor"]);
 const [revision,setRevision]=useState(0);
 const [editing,setEditing]=useState<number|null>(null);
 const [draft,setDraft]=useState("");
 const [cleared,setCleared]=useState(false);
 const lastApplied=useRef("");
 const signature=JSON.stringify([locale,selectedAxes,currentPicked,desiredPicked,stateScore,energy,revision]);
 const suggested=useMemo(()=>{
  const primary=suggestMeaningPhrases(locale,selectedAxes,current,desired,stateScore,energy,revision);
  const extra=desiredPicked.slice(1,3).map(id=>suggestMeaningPhrases(locale,selectedAxes,current,id,stateScore,energy,revision)[2]);
  return [...new Set([...primary.slice(0,2),...extra,...primary])].slice(0,5);
 },[locale,selectedAxes,current,desired,desiredPicked,stateScore,energy,revision]);
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
 const moods=["sad","neutral","happy"] as const;
 const icons={sad:"😔",neutral:"😌",happy:"😊"} as const;
 const moodsText={
  ru:{sad:"Грустно",neutral:"Спокойно",happy:"Радостно"},
  en:{sad:"Sad",neutral:"Calm",happy:"Happy"},
  es:{sad:"Triste",neutral:"En calma",happy:"Feliz"}
 } as const;
 const copy={
  ru:{heading:"Давайте выберем цель для видео",sub:"Уточните, как вы себя чувствуете и что хотите поддержать.",
   now:"Как я себя чувствую сейчас?",want:"Как я хочу себя чувствовать?",focus:"Что я хочу укрепить?",
   energy:"Моя энергия сейчас",level:"Мой желаемый уровень",next:"Перейти к фразам поддержки",hint:"Выберите до трёх · прокрутите для других"},
  en:{heading:"Choose a goal for your video",sub:"Explore how you feel and what you want to strengthen.",
   now:"How do I feel now?",want:"How would I like to feel?",focus:"What would I like to strengthen?",
   energy:"My energy level now",level:"My desired level",next:"Go to support phrases",hint:"Choose up to three · scroll for more"},
  es:{heading:"Elige un objetivo para tu vídeo",sub:"Explora cómo te sientes y qué quieres fortalecer.",
   now:"¿Cómo me siento ahora?",want:"¿Cómo quiero sentirme?",focus:"¿Qué quiero fortalecer?",
   energy:"Mi energía actual",level:"Mi nivel deseado",next:"Ir a frases de apoyo",hint:"Elige hasta tres · desliza para ver más"}
 }[locale];
 const positiveNow={
  ru:["Спокойно","С надеждой","С интересом","Энергично","В контакте","Уверенно","С благодарностью","Вдохновлённо"],
  en:["Present","Hopeful","Curious","Energetic","Connected","Confident","Grateful","Inspired"],
  es:["Presente","Esperanza","Curiosidad","Energía","Conexión","Confianza","Gratitud","Inspiración"]
 }[locale];
 const moodCurrentOrder={
  sad:["sadness","fatigue","anxiety","helplessness","loneliness","shame","anger","confusion"],
  neutral:["fatigue","anxiety","sadness","helplessness","confusion","anger","loneliness","shame"]
 };
 const moodDesiredOrder={
  sad:["calm","self_acceptance","connection","vitality","hope","confidence","boundaries","clarity"],
  neutral:["calm","self_acceptance","vitality","clarity","connection","hope","confidence","boundaries"],
  happy:["hope","confidence","vitality","connection","boundaries","clarity","self_acceptance","calm"]
 };
 const nowWords={
  ru:{sad:["Грусть","Измотанность","Тревога","Бессилие","Одиночество","Стыд","Раздражение","Растерянность"],
   neutral:["Усталость","Напряжение","Грусть","Перегрузка","Неясность","Раздражение","Отдалённость","Самокритика"]},
  en:{sad:["Sad","Drained","Anxious","Stuck","Lonely","Self-critical","Irritated","Lost"],
   neutral:["Tired","Tense","Down","Overwhelmed","Uncertain","Restless","Distant","Self-doubting"]},
  es:{sad:["Triste","Agotado/a","Ansioso/a","Bloqueado/a","Solo/a","Autocrítica","Irritado/a","Perdido/a"],
   neutral:["Cansancio","Tensión","Desánimo","Agobio","Incertidumbre","Inquietud","Distancia","Dudas"]}
 };
 const wantWords={
  ru:{sad:["Покой","Принятие","Близость","Силы","Надежда","Уверенность","Свобода","Ясность"],
   neutral:["Спокойствие","Безопасность","Энергия","Равновесие","Контакт","Радость","Уверенность","Свобода"],
   happy:["Радость","Уверенность","Вдохновение","Близость","Свобода","Ясность","Любовь к себе","Покой"]},
  en:{sad:["Calm","Accepted","Connected","Rested","Hopeful","Confident","Free","Clear"],
   neutral:["Calm","Safe","Energetic","Balanced","Connected","Joyful","Confident","Free"],
   happy:["Joyful","Confident","Inspired","Connected","Free","Clear","Self-kindness","Peaceful"]},
  es:{sad:["Calma","Aceptación","Conexión","Descanso","Esperanza","Confianza","Libertad","Claridad"],
   neutral:["Calma","Seguridad","Energía","Equilibrio","Conexión","Alegría","Confianza","Libertad"],
   happy:["Alegría","Confianza","Inspiración","Conexión","Libertad","Claridad","Autoestima","Paz"]}
 };
 const nowChoices=currentMood==="happy"?positiveNow.map((label,index)=>({id:"positive-"+index,label})):
  moodCurrentOrder[currentMood].map((id,index)=>({
   id,label:nowWords[locale][currentMood][index]||currentOptions.find(x=>x.id===id)?.label||id
  }));
 const wantChoices=moodDesiredOrder[desiredMood].map((id,index)=>({
  id,label:wantWords[locale][desiredMood][index]||desiredOptions.find(x=>x.id===id)?.label||id
 }));
 const choose=(id:string,setter:Dispatch<SetStateAction<string[]>>)=>{
  setter(old=>old.includes(id)?(old.length===1?old:old.filter(v=>v!==id)):
   [id,...old.filter(value=>value!==id)].slice(0,3));
  onPendingChange(false);
 };
 const moodFilter=(side:"current"|"desired",value:typeof moods[number],change:(value:typeof moods[number])=>void)=>
  <div className={css.moodFilter} role="group" aria-label={side==="current"?copy.now:copy.want}>
   {moods.map(m=><button type="button" key={m} data-video-goal-mood={side+"-"+m}
    disabled={disabled} aria-pressed={value===m} title={moodsText[locale][m]}
    aria-label={moodsText[locale][m]} onClick={()=>change(m)}>
    <span aria-hidden="true">{icons[m]}</span></button>)}
  </div>;
 const goalCards=<div className={css.goalJourney} data-video-goal-journey>
  <header className={css.goalIntro}><h2>{copy.heading}</h2><p>{copy.sub}</p></header>
  <section className={[css.choiceCard,css.currentCard].join(" ")} data-video-ideas-state>
   <div className={css.choiceHeader}><h3><Heart size={23} aria-hidden="true"/>{copy.now}</h3>
    {moodFilter("current",currentMood,setCurrentMood)}</div>
   <p className={css.choiceHint}>{copy.hint}</p>
   <div className={css.choiceScroller} data-video-goal-current-options role="group" aria-label={copy.now} tabIndex={0}>
    {nowChoices.map(option=><button key={option.id} type="button" className={css.choiceButton}
     data-video-goal-current-choice={option.id} disabled={disabled}
     aria-pressed={currentPicked.includes(option.id)} onClick={()=>choose(option.id,setCurrentPicked)}>
     {currentPicked.includes(option.id)?<Check size={16} aria-hidden="true"/>:null}{option.label}
    </button>)}
   </div>
   <label className={css.levelLine} htmlFor="video-goal-energy"><strong>{copy.energy}</strong>
    <input id="video-goal-energy" data-video-ideas-energy-score type="range" min={0} max={10} step={1}
     value={energy} disabled={disabled} onChange={event=>{setEnergy(Number(event.currentTarget.value));onPendingChange(false)}}/>
    <output htmlFor="video-goal-energy">{energy}/10</output></label>
  </section>
  <section className={[css.choiceCard,css.desiredCard].join(" ")} data-video-ideas-desired-state>
   <div className={css.choiceHeader}><h3><Sparkles size={23} aria-hidden="true"/>{copy.want}</h3>
    {moodFilter("desired",desiredMood,setDesiredMood)}</div>
   <p className={css.choiceHint}>{copy.hint}</p>
   <div className={css.choiceScroller} data-video-goal-desired-options role="group" aria-label={copy.want} tabIndex={0}>
    {wantChoices.map(option=><button key={option.id} type="button" className={css.choiceButton}
     data-video-goal-desired-choice={option.id} disabled={disabled}
     aria-pressed={desiredPicked.includes(option.id)} onClick={()=>choose(option.id,setDesiredPicked)}>
     {desiredPicked.includes(option.id)?<Check size={16} aria-hidden="true"/>:null}{option.label}
    </button>)}
   </div>
   <label className={css.levelLine} htmlFor="video-goal-desired"><strong>{copy.level}</strong>
    <input id="video-goal-desired" data-video-ideas-state-score type="range" min={0} max={10} step={1}
     value={stateScore} disabled={disabled} onChange={event=>{setStateScore(Number(event.currentTarget.value));onPendingChange(false)}}/>
    <output htmlFor="video-goal-desired">{stateScore}/10</output></label>
  </section>
  <section className={[css.choiceCard,css.directionCard].join(" ")} data-video-ideas-axes>
   <h3 className={css.title}><Heart size={23} aria-hidden="true"/>{copy.focus}</h3>
   <p className={css.subtitle}>{t.hint}</p>
   <div className={css.axisGrid} role="group" aria-label={copy.focus}>
    {axes.map(axis=><button key={axis.id} type="button" className={css.axisButton}
     data-video-meaning-axis={axis.id} title={axis.description}
     aria-pressed={selectedAxes.includes(axis.id)} disabled={disabled}
     onClick={()=>toggleAxis(axis.id)}>{selectedAxes.includes(axis.id)?
      <Check size={16} aria-hidden="true"/>:null}{axis.label}</button>)}
   </div>
  </section>
 </div>;
 return <>
  {clarifyHost&&clarify?createPortal(goalCards,clarifyHost):null}
  <section className={css.ideas} data-video-ideas-compact aria-label={t.want} hidden={!active}>
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
 </section></>;
}
