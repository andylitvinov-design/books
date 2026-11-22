"use client";
import {ArrowRight,Check} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoGoalOptions} from "@/lib/mandala/video-personal-goal-composer.mjs";
import css from "./mandala-video-idea-goal.module.css";

const COPY={
 ru:{kicker:"Personal · Цель",title:"Выберите цель видео",intro:"Для чего вам это видео?",selected:"Выбрана цель",continue:"Перейти к персонализации",kinds:{leisure:"ОТДЫХ И УДОВОЛЬСТВИЕ",support:"ЭМОЦИОНАЛЬНАЯ ПОДДЕРЖКА",change:"ИЗМЕНЕНИЕ УСТАНОВОК"}},
 en:{kicker:"Personal · Goal",title:"Choose your goal",intro:"What would help you most?",selected:"Your goal",continue:"Personalize my video",kinds:{leisure:"REST & ENJOYMENT",support:"EMOTIONAL SUPPORT",change:"BELIEFS & MEANING"}},
 es:{kicker:"Personal · Objetivo",title:"Elige tu objetivo",intro:"¿Qué te ayudaría más?",selected:"Tu objetivo",continue:"Personalizar mi vídeo",kinds:{leisure:"DESCANSO Y DISFRUTE",support:"APOYO EMOCIONAL",change:"CAMBIO DE CREENCIAS"}}
} as const;
export function MandalaVideoIdeaGoal({locale,options,selectedId,onSelect,onContinue,disabled}:{
 locale:PublicLocale;options:VideoGoalOptions;selectedId:string|null;
 onSelect:(id:string)=>void;onContinue:()=>void;disabled:boolean;
}){
 const t=COPY[locale];
 const selected=options.goals.find(goal=>goal.id===selectedId)||null;
 const visible=options.goals;
 return <section className={css.picker} data-video-ideas-goal-picker
  data-video-ideas-goal-mode={options.mode} aria-labelledby="video-ideas-goal-heading">
  <header className={css.intro}><span className={css.kicker}>{t.kicker}</span>
   <h2 id="video-ideas-goal-heading">{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.cards} role="group" aria-label={t.title}
   data-video-ideas-goal-page={1} data-goal-context={options.version}>
   {visible.map(choice=>{
    const pressed=selectedId===choice.id,copy=choice.copy[locale];
    return <button key={choice.id} type="button" className={css.goalCard}
     data-video-ideas-goal-choice={choice.id} data-video-ideas-goal-type={choice.type}
     data-video-ideas-goal-mechanism={choice.mechanismId}
     disabled={disabled} aria-pressed={pressed} onClick={()=>onSelect(choice.id)}>
     <span className={css.photo} data-goal-photo={choice.photo} aria-hidden="true"/>
     <span className={css.wording}>
      <span className={css.kind}>{t.kinds[choice.type]}</span>
      <strong className={css.title}>{copy?.title||choice.id}</strong>
      <span className={css.detail}>{copy?.detail||""}</span>
     </span>
     <span className={css.checkbox} aria-hidden="true">{pressed?<Check size={21} strokeWidth={3}/>:null}</span>
    </button>;
   })}
  </div>
  {selected?<p className={css.selected} data-video-ideas-goal-selected role="status">{t.selected}: <strong>{selected.copy[locale]?.title}</strong></p>:null}
  <button type="button" className={css.continue} data-video-ideas-goal-next
   disabled={disabled||!selected} onClick={onContinue}>
   <span>{t.continue}</span><ArrowRight size={26} aria-hidden="true"/>
  </button>
 </section>;
}