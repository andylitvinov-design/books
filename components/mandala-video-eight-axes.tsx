"use client";
import {ArrowLeft,ArrowRight,Check,Sparkles} from "lucide-react";
import type {Dispatch,SetStateAction} from "react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import {PERSONAL_EIGHT_AXES,validAxisRating,axisDifference,completedAxisCount,completedPersonalAxes}
 from "@/lib/mandala/personal-eight-axes.mjs";
import type {VideoGoalProfile} from "./mandala-video-personalization";
import css from "./mandala-video-eight-axes.module.css";

const COPY={
 ru:{kicker:"Personal · Персонализация",title:"8 смысловых осей",
  intro:"Оцени своё состояние сейчас и желаемый уровень. Выбери одну главную ось для проработки.",
  now:"Сейчас",desired:"Желаемо",gap:"Разница",focus:"Выбрать фокус",
  steps:["Оцени сейчас","Задай желаемое","Выбери фокус"],done:"осей оценено",
  help:"Разница = желаемое − сейчас. Главный фокус выбираешь ты.",
  incomplete:"Оцени обе шкалы по всем 8 осям и отметь главный фокус.",
  next:"Получить персональный сценарий",back:"Вернуться к вопросам"},
 en:{kicker:"Personal · Personalization",title:"8 Meaning Axes",
  intro:"Rate your current and desired levels. Choose one main area to work on.",
  now:"Now",desired:"Desired",gap:"Gap",focus:"Choose focus",
  steps:["Rate now","Set desired","Choose focus"],done:"axes rated",
  help:"Gap = desired − now. You choose the main focus.",
  incomplete:"Rate both scales for all 8 axes and select one focus.",
  next:"Get my personalized script",back:"Back to questions"},
 es:{kicker:"Personal · Personalización",title:"8 ejes de sentido",
  intro:"Evalúa tu nivel actual y el deseado. Elige un área principal para trabajar.",
  now:"Ahora",desired:"Deseado",gap:"Diferencia",focus:"Elegir enfoque",
  steps:["Evalúa ahora","Define el deseo","Elige el enfoque"],done:"ejes evaluados",
  help:"Diferencia = deseado − actual. Tú eliges el enfoque.",
  incomplete:"Evalúa ambas escalas de los 8 ejes y elige un enfoque.",
  next:"Obtener mi guion personal",back:"Volver a las preguntas"}
} as const;

export function MandalaVideoEightAxes({locale,value,onChange,onContinue,onBack,disabled}:{
 locale:VideoLocale;value:VideoGoalProfile;onChange:Dispatch<SetStateAction<VideoGoalProfile>>;
 onContinue:()=>void;onBack:()=>void;disabled:boolean;
}){
 const t=COPY[locale];
 const count=completedAxisCount(value.axisRatings);
 const completed=completedPersonalAxes(value.axisRatings,value.focusAxisId);
 const rate=(id:string,side:"now"|"desired",n:number)=>{
  if(disabled||!validAxisRating(n))return;
  onChange(previous=>({...previous,axisRatings:{
   ...previous.axisRatings,[id]:{...previous.axisRatings?.[id],[side]:n}
  }}));
 };
 const focus=(axis:(typeof PERSONAL_EIGHT_AXES)[number])=>{
  if(disabled)return;
  onChange(previous=>({...previous,focusAxisId:axis.id,axes:[axis.meaningAxisId]}));
 };
 return <section className={css.screen} data-video-meaning-axes-screen
  aria-labelledby="video-meaning-axes-title">
  <header className={css.hero}>
   <span className={css.kicker}><Sparkles size={17} aria-hidden="true"/>{t.kicker}</span>
   <h2 id="video-meaning-axes-title">{t.title}</h2><p>{t.intro}</p>
  </header>
  <div className={css.steps} aria-label={t.title}>
   {t.steps.map((label,i)=><span key={label}>
    <b aria-hidden="true">{i===2?<Check size={18}/>:i+1}</b>{label}
   </span>)}
  </div>
  <div className={css.rowHeader}>
   <strong>{t.title}</strong><span data-video-meaning-progress>{count}/8 {t.done}</span>
  </div>
  <div className={css.axes} data-video-meaning-axes-list role="radiogroup" aria-label={t.focus}>
   {PERSONAL_EIGHT_AXES.map((axis,index)=>{
    const scores=value.axisRatings?.[axis.id];
    const difference=axisDifference(scores);
    const chosen=value.focusAxisId===axis.id;
    return <article key={axis.id} className={css.axis} data-video-meaning-axis={axis.id}
     data-selected={chosen?"true":"false"} data-rated={difference===null?"false":"true"}>
     <div className={css.identity}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={css.photo} loading="lazy" decoding="async" width={60} height={60}
       src={"/videos/holistic-house/film-collection-v2/"+axis.photo} alt="" aria-hidden="true"/>
      <span className={css.number} aria-hidden="true">{index+1}</span>
      <div className={css.name}><strong>{axis.labels[locale]}</strong>
       <span>{axis.descriptions[locale]}</span></div>
      <button type="button" role="radio" aria-checked={chosen}
       className={css.focus} data-video-meaning-focus={axis.id}
       aria-label={t.focus+": "+axis.labels[locale]} disabled={disabled}
       onClick={()=>focus(axis)}>
       {chosen?<Check size={24} strokeWidth={3} aria-hidden="true"/>:null}
      </button>
     </div>
     <div className={css.scoring}>
      <div className={css.scales}>
       {(["now","desired"] as const).map(side=>{
        const n=scores?.[side],isSet=validAxisRating(n);
        return <label className={css.scale} key={side} data-side={side}
         data-set={isSet?"true":"false"}>
         <span>{side==="now"?t.now:t.desired}</span>
         <input type="range" min={1} max={10} step={1} value={isSet?n:5}
          aria-label={axis.labels[locale]+": "+(side==="now"?t.now:t.desired)+" (1–10)"}
          data-video-meaning-score={axis.id+"-"+side} disabled={disabled}
          onChange={event=>rate(axis.id,side,Number(event.currentTarget.value))}
          onPointerUp={event=>rate(axis.id,side,Number(event.currentTarget.value))}/>
         <output data-video-meaning-score-value={axis.id+"-"+side}>{isSet?n:"—"}</output>
        </label>;
       })}
      </div>
      <div className={css.delta} data-video-meaning-difference={axis.id}>
       <small>{t.gap}</small>
       <strong>{difference===null?"—":difference>0?"+"+difference:String(difference)}</strong>
      </div>
     </div>
    </article>;
   })}
  </div>
  <p className={css.help}>{t.help}</p>
  {!completed?<p className={css.incomplete} role="status">{t.incomplete}</p>:null}
  <button type="button" className={css.next} data-video-meaning-axes-continue
   disabled={disabled||!completed} onClick={onContinue}>
   <Sparkles size={22} aria-hidden="true"/><span>{t.next}</span><ArrowRight size={22} aria-hidden="true"/>
  </button>
  <button type="button" className={css.back} data-video-meaning-axes-back
   disabled={disabled} onClick={onBack}><ArrowLeft size={18} aria-hidden="true"/>{t.back}</button>
 </section>;
}