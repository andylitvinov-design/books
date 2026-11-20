"use client";
import {useState} from "react";
import {ArrowRight,Check,ChevronLeft,ChevronRight} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoGoalOptions} from "@/lib/mandala/video-personal-goal-composer.mjs";
import css from "./mandala-video-idea-goal.module.css";

const COPY={
 ru:{kicker:"Идеи · Цель",title:"Выберите вашу цель",intro:"Три подходящих варианта по вашему запросу и ответам.",more:"Ещё 2 цели",back:"К основным целям",prev:"Предыдущие цели",next:"Другие цели",selected:"Ваша цель",continue:"Выбрать сценарий",kinds:{leisure:"Отдых и удовольствие",support:"Поддержка и стабилизация",change:"Психологическое изменение"}},
 en:{kicker:"Ideas · Goal",title:"Choose your goal",intro:"Three options chosen from your request and confirmed answers.",more:"2 more goals",back:"Main goals",prev:"Previous goals",next:"Other goals",selected:"Your goal",continue:"Choose scenario",kinds:{leisure:"Rest & enjoyment",support:"Support & stability",change:"Psychological change"}},
 es:{kicker:"Ideas · Objetivo",title:"Elige tu objetivo",intro:"Tres propuestas según tu petición y respuestas confirmadas.",more:"2 objetivos más",back:"Objetivos principales",prev:"Objetivos anteriores",next:"Otros objetivos",selected:"Tu objetivo",continue:"Elegir escenario",kinds:{leisure:"Descanso y disfrute",support:"Apoyo y estabilidad",change:"Cambio psicológico"}}
} as const;
export function MandalaVideoIdeaGoal({locale,options,selectedId,onSelect,onContinue,disabled}:{
 locale:PublicLocale;options:VideoGoalOptions;selectedId:string|null;
 onSelect:(id:string)=>void;onContinue:()=>void;disabled:boolean;
}){
 const [page,setPage]=useState(0),t=COPY[locale];
 const selected=options.goals.find(goal=>goal.id===selectedId)||null;
 const move=()=>setPage(current=>current===0?1:0);
 const visible=page===0?options.goals.slice(0,3):options.goals.slice(3,5);
 return <section className={css.picker} data-video-ideas-goal-picker
  data-video-ideas-goal-mode={options.mode} aria-labelledby="video-ideas-goal-heading">
  <header className={css.intro}><span className={css.kicker}>{t.kicker}</span>
   <h2 id="video-ideas-goal-heading">{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.cards} role="group" aria-label={t.title}
   data-video-ideas-goal-page={page+1} data-goal-context={options.version}>
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
  <div className={css.more}>
   <button type="button" data-video-ideas-more-goals disabled={disabled} onClick={move}>{page===0?t.more:t.back}</button>
   <span className={css.pageCount} aria-live="polite">{page+1} / 2</span>
   <button type="button" data-video-ideas-goals-prev aria-label={t.prev} disabled={disabled} onClick={move}><ChevronLeft size={24} aria-hidden="true"/></button>
   <button type="button" data-video-ideas-goals-next aria-label={t.next} disabled={disabled} onClick={move}><ChevronRight size={24} aria-hidden="true"/></button>
  </div>
  {selected?<p className={css.selected} data-video-ideas-goal-selected role="status">{t.selected}: <strong>{selected.copy[locale]?.title}</strong></p>:null}
  <button type="button" className={css.continue} data-video-ideas-goal-next
   disabled={disabled||!selected} onClick={onContinue}>
   <span>{t.continue}</span><ArrowRight size={26} aria-hidden="true"/>
  </button>
 </section>;
}