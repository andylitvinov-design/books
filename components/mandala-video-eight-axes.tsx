"use client";
import type {Dispatch,SetStateAction} from "react";
import {ArrowLeft,ArrowRight,Check,Sparkles} from "lucide-react";
import {PERSONAL_EIGHT_AXES,axisGap,axisCompletedCount,axesFormComplete,isAxisRating} from "@/lib/mandala/personal-eight-axes.mjs";
import type {VideoGoalProfile} from "./mandala-video-personalization";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import styles from "./mandala-video-eight-axes.module.css";
const words={
 ru:{title:"8 смысловых осей",intro:"Оцените своё состояние сейчас и желаемое. Выберите одну главную ось для проработки.",
 now:"Сейчас",want:"Желаемо",gap:"Разница",focus:"Главная ось",rated:"заполнено",
 a:"Оцени сейчас",b:"Задай желаемое",c:"Выбери фокус",next:"Получить персональный сценарий",
 back:"Назад к персонализации",help:"Заполните обе оценки для каждой оси и выберите одну главную."},
 en:{title:"8 Meaning Axes",intro:"Rate your current and desired states. Choose one main focus for your video.",
 now:"Now",want:"Desired",gap:"Difference",focus:"Main focus",rated:"rated",
 a:"Rate now",b:"Set desired",c:"Choose focus",next:"Create my personal script",
 back:"Back to personalization",help:"Rate both scores on all eight axes and choose one main focus."},
 es:{title:"8 ejes de sentido",intro:"Evalúa tu estado actual y deseado. Elige un eje principal.",
 now:"Ahora",want:"Deseado",gap:"Diferencia",focus:"Enfoque principal",rated:"evaluados",
 a:"Evalúa ahora",b:"Define tu deseo",c:"Elige un enfoque",next:"Crear mi guion personal",
 back:"Volver a personalización",help:"Evalúa ambos valores en los ocho ejes y elige un enfoque."}
} as const;
export function MandalaVideoEightAxes({locale,value,onChange,onBack,onContinue,disabled}:{
 locale:VideoLocale;value:VideoGoalProfile;onChange:Dispatch<SetStateAction<VideoGoalProfile>>;
 onBack:()=>void;onContinue:()=>void;disabled:boolean;
}){
 const t=words[locale],complete=axesFormComplete(value.axisRatings,value.focusAxisId);
 const rate=(id:string,field:"now"|"desired",num:number)=>{
  if(disabled||!isAxisRating(num))return;
  onChange(old=>({...old,axisRatings:{...old.axisRatings,
   [id]:{...old.axisRatings?.[id],[field]:num}}}));
 };
 const choose=(axis:(typeof PERSONAL_EIGHT_AXES)[number])=>{
  if(disabled)return;
  onChange(old=>({...old,focusAxisId:axis.id,axes:[axis.legacy]}));
 };
 return <section className={styles.page} data-video-meaning-axes-screen aria-labelledby="video-axes-heading">
  <header className={styles.hero}><span className={styles.kicker}><Sparkles size={18}/> Personal · Personalization</span>
   <h2 id="video-axes-heading">{t.title}</h2><p>{t.intro}</p></header>
  <div className={styles.steps} aria-label={t.title}>
   <span><b>1</b>{t.a}</span><span><b>2</b>{t.b}</span><span><b><Check size={16}/></b>{t.c}</span>
  </div>
  <div className={styles.heading}><strong>{t.title}</strong>
   <span data-video-axes-progress>{axisCompletedCount(value.axisRatings)}/8 {t.rated}</span></div>
  <div className={styles.axes} role="radiogroup" aria-label={t.focus} data-video-axes-all-visible>
   {PERSONAL_EIGHT_AXES.map((axis,i)=>{
    const score=value.axisRatings?.[axis.id],gap=axisGap(score),selected=value.focusAxisId===axis.id;
    return <article className={styles.card} key={axis.id} data-video-meaning-axis={axis.id} data-selected={selected}>
     <div className={styles.top}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={"/videos/holistic-house/film-collection-v2/"+axis.image}
       className={styles.image} width={62} height={62} loading="lazy" alt="" aria-hidden="true"/>
      <span className={styles.num} aria-hidden="true">{i+1}</span>
      <div className={styles.label}><strong>{axis[locale][0]}</strong><small>{axis[locale][1]}</small></div>
      <button className={styles.radio} type="button" role="radio" disabled={disabled}
       aria-checked={selected} data-video-meaning-focus={axis.id}
       aria-label={t.focus+": "+axis[locale][0]} onClick={()=>choose(axis)}>
       {selected?<Check size={23} strokeWidth={3} aria-hidden="true"/>:null}
      </button>
     </div>
     <div className={styles.ratings}>
      {(["now","desired"] as const).map(field=>{
       const n=score?.[field],rated=isAxisRating(n);
       const label=field==="now"?t.now:t.want;
       return <label className={styles.slider} key={field} data-axis-slider={field} data-has-value={rated}>
        <span>{label}</span>
        <input type="range" min={1} max={10} step={1} disabled={disabled}
         value={isAxisRating(n)?n:5} aria-label={axis[locale][0]+": "+label}
         data-video-meaning-score={axis.id+"-"+field}
         onChange={event=>rate(axis.id,field,Number(event.currentTarget.value))}
         onPointerUp={event=>rate(axis.id,field,Number(event.currentTarget.value))}/>
        <output data-video-axis-rating={axis.id+"-"+field}>{rated?n:"—"}</output>
       </label>;
      })}
      <div className={styles.gap} data-video-meaning-difference={axis.id}>
       <small>{t.gap}</small><strong>{gap===null?"—":gap>0?"+"+gap:String(gap)}</strong>
      </div>
     </div>
    </article>;
   })}
  </div>
  {!complete?<p className={styles.help} role="status">{t.help}</p>:null}
  <button className={styles.cta} type="button" disabled={disabled||!complete}
   data-video-meaning-axes-continue onClick={onContinue}>
   <Sparkles size={22}/><span>{t.next}</span><ArrowRight size={23}/></button>
  <button className={styles.back} type="button" disabled={disabled}
   data-video-meaning-axes-back onClick={onBack}><ArrowLeft size={17}/>{t.back}</button>
 </section>;
}
