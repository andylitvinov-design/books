"use client";
import {useState} from "react";
import {ArrowRight,Check,ChevronLeft,ChevronRight} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {IDEA_GOAL_PAGES,getVideoIdeaGoal,type VideoIdeaGoalId} from "@/lib/mandala/video-idea-goals.mjs";
import css from "./mandala-video-idea-goal.module.css";

const COPY={
 ru:{kicker:"Идеи · Цель",title:"Выберите вашу цель",intro:"К какому результату вы хотите прийти с помощью видео?",more:"Ещё цели",prev:"Предыдущие цели",next:"Другие цели",selected:"Ваша цель",continue:"Выбрать сценарий"},
 en:{kicker:"Ideas · Goal",title:"Choose your goal",intro:"What would you like this video to help you move toward?",more:"More goals",prev:"Previous goals",next:"More goals",selected:"Your goal",continue:"Choose scenario"},
 es:{kicker:"Ideas · Objetivo",title:"Elige tu objetivo",intro:"¿Qué resultado quieres lograr con este vídeo?",more:"Más objetivos",prev:"Objetivos anteriores",next:"Más objetivos",selected:"Tu objetivo",continue:"Elegir escenario"}
} as const;
export function MandalaVideoIdeaGoal({locale,selectedId,onSelect,onContinue,disabled}:{
 locale:PublicLocale;selectedId:VideoIdeaGoalId|null;onSelect:(id:VideoIdeaGoalId)=>void;onContinue:()=>void;disabled:boolean;
}){
 const [page,setPage]=useState(0),t=COPY[locale];
 const selected=getVideoIdeaGoal(selectedId);
 const move=(direction:number)=>setPage(index=>(index+direction+IDEA_GOAL_PAGES.length)%IDEA_GOAL_PAGES.length);
 return <section className={css.picker} data-video-ideas-goal-picker aria-labelledby="video-ideas-goal-heading">
  <header className={css.intro}><span className={css.kicker}>{t.kicker}</span>
   <h2 id="video-ideas-goal-heading">{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.cards} role="group" aria-label={t.title} data-video-ideas-goal-page={page+1}>
   {IDEA_GOAL_PAGES[page].map(choice=>{
    const pressed=selectedId===choice.id;
    return <button key={choice.id} type="button" className={css.goalCard}
     data-video-ideas-goal-choice={choice.id} disabled={disabled} aria-pressed={pressed}
     onClick={()=>onSelect(choice.id)}>
     <span className={css.photo} data-goal-photo={choice.id} aria-hidden="true"/>
     <span className={css.wording}><strong className={css.title}>{choice.copy[locale].title}</strong>
      <span className={css.detail}>{choice.copy[locale].detail}</span></span>
     <span className={css.checkbox} aria-hidden="true">{pressed?<Check size={21} strokeWidth={3}/>:null}</span>
    </button>;
   })}
  </div>
  <div className={css.more}>
   <button type="button" data-video-ideas-more-goals disabled={disabled} onClick={()=>move(1)}>{t.more}</button>
   <span className={css.pageCount} aria-live="polite">{page+1} / {IDEA_GOAL_PAGES.length}</span>
   <button type="button" data-video-ideas-goals-prev aria-label={t.prev} disabled={disabled} onClick={()=>move(-1)}><ChevronLeft size={24} aria-hidden="true"/></button>
   <button type="button" data-video-ideas-goals-next aria-label={t.next} disabled={disabled} onClick={()=>move(1)}><ChevronRight size={24} aria-hidden="true"/></button>
  </div>
  {selected?<p className={css.selected} data-video-ideas-goal-selected role="status">{t.selected}: <strong>{selected.copy[locale].title}</strong></p>:null}
  <button type="button" className={css.continue} data-video-ideas-goal-next disabled={disabled||!selected} onClick={onContinue}><span>{t.continue}</span><ArrowRight size={26} aria-hidden="true"/></button>
 </section>;
}
