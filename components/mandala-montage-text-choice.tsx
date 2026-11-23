"use client";
import {ArrowRight,Check,Feather,Flower2,Heart,Sparkles} from "lucide-react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-montage-text-choice.module.css";

export type MontageTextMode="simple"|"standard"|"personalized";
const copy={
 en:{title:"Choose Your Text Type",intro:"Add a meaningful message — or keep your film simple.",
  simple:["Make it Simple","No text required.","A beautiful video with visuals, music and atmosphere."],
  standard:["Emotional Support","Basic AI standard phrases.","Warm classic phrases to choose and edit."],
  personalized:["Personalized Video Therapy","A message just for you.","Describe your goal and refine a supportive personal message."],
  edit:"Continue to Text Editor",skip:"Continue to Story",
  note:"No XP is charged here. The +50 XP add-on needs verified server pricing before paid export."},
 ru:{title:"Выберите тип текста",intro:"Добавьте пожелание или оставьте красивое видео без слов.",
  simple:["Просто видео","Текст не нужен.","Видеоряд, музыка и атмосфера без надписей."],
  standard:["Эмоциональная поддержка","Готовые стандартные фразы.","Тёплые классические фразы, которые можно выбрать и изменить."],
  personalized:["Персональная видеотерапия","Послание для вашей ситуации.","Опишите цель и уточните индивидуальные фразы поддержки."],
  edit:"К редактированию текста",skip:"Далее · Сюжет",
  note:"На выборе XP не списываются. Доплата +50 XP требует серверного тарифа перед экспортом."},
 es:{title:"Elige el tipo de texto",intro:"Añade un mensaje a tu vídeo o disfruta de uno sin palabras.",
  simple:["Vídeo sencillo","No necesita texto.","Imágenes, música y ambiente sin frases."],
  standard:["Apoyo emocional","Frases estándar de apoyo.","Palabras amables que puedes elegir y editar."],
  personalized:["Videoterapia personalizada","Un mensaje para tu situación.","Describe tu objetivo y ajusta tus frases de apoyo."],
  edit:"Continuar a editar texto",skip:"Continuar al guion",
  note:"No se cobran XP ahora. El suplemento +50 XP requiere precio confirmado por el servidor."}
} as const;
const cards=[
 {id:"simple",image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg",Icon:Feather},
 {id:"standard",image:"/videos/holistic-house/film-collection-v3/heart-flow.jpg",Icon:Heart},
 {id:"personalized",image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg",Icon:Flower2}
] as const;
export function MandalaMontageTextChoice({locale,mode,disabled,onChange,onContinue}:{
 locale:VideoLocale;mode:MontageTextMode;disabled:boolean;
 onChange:(mode:MontageTextMode)=>void;onContinue:()=>void;
}){
 const t=copy[locale];
 return <section className={css.screen} data-video-text-choice aria-label={t.title}>
  <header className={css.hero} data-video-text-choice-hero>
   {/* First-party landscape, not the generated screenshot. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg" alt="" loading="lazy"/>
   <div className={css.heroCopy}>
    <span><Sparkles size={17} aria-hidden="true"/> TEXT · STEP 3</span>
    <h2>{t.title}</h2><p>{t.intro}</p>
   </div>
  </header>
  <div className={css.cards} role="group" aria-label={t.title}>
   {cards.map(card=>{
    const active=mode===card.id, [name,subtitle,detail]=t[card.id];
    return <button type="button" key={card.id} className={css.card} data-video-text-mode={card.id}
      data-selected={active} aria-pressed={active} disabled={disabled}
      onClick={()=>onChange(card.id)}>
     <span className={css.poster}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.image} alt="" loading="lazy"/>
      <span className={css.posterIcon}><card.Icon size={23} aria-hidden="true"/></span>
     </span>
     <span className={css.cardText}><strong>{name}</strong><b>{subtitle}</b><small>{detail}</small></span>
     <span className={css.cardRight}>
      <span className={card.id==="personalized"?css.plus:css.zero}>
       {card.id==="personalized"?<Sparkles size={15} aria-hidden="true"/>:null}
       {card.id==="personalized"?"+50 XP":"0 XP"}
      </span>
      <span className={css.radio} aria-hidden="true">{active?<Check size={17} strokeWidth={3}/>:null}</span>
     </span>
    </button>;
   })}
  </div>
  <button type="button" className={css.primary} data-video-text-choice-continue
   disabled={disabled} onClick={onContinue}>
   <Sparkles size={22} aria-hidden="true"/><span>{mode==="simple"?t.skip:t.edit}</span>
   <ArrowRight size={23} aria-hidden="true"/>
  </button>
  <p className={css.note} role="note">{t.note}</p>
 </section>;
}
