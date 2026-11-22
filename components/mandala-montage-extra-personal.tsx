"use client";
import {ArrowRight,Heart,MessageCircleHeart,Type} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-personal-compact.module.css";

type Props={locale:PublicLocale;disabled:boolean;onSimple:()=>void;onSupport:()=>void;onPersonal:()=>void};
const copy={
 en:{title:"Choose text for your video",intro:"Choose one option, then continue with your film.",
  simple:["Make it simple","No text required","0 XP"],
  support:["Emotional Support","Standard phrases for the chosen theme","0 XP"],
  personal:["Personalized Video Therapy","Tailored phrases in Personal","+50 XP*"],
  note:"*Personalized +50 XP is a draft add-on. No credits are charged here; export requires a verified server price."},
 ru:{title:"Выберите текст для видео",intro:"Выберите вариант — затем продолжите создание.",
  simple:["Простое видео","Без надписей и фраз","0 XP"],
  support:["Эмоциональная поддержка","Базовые фразы по выбранной теме","0 XP"],
  personal:["Персональная видеотерапия","Индивидуальные фразы в Personal","+50 XP*"],
  note:"*Доплата +50 XP пока предварительная. При выборе XP не списываются; экспорт требует подтверждённой серверной цены."},
 es:{title:"Elige el texto del vídeo",intro:"Elige una opción para continuar con tu vídeo.",
  simple:["Vídeo sencillo","Sin texto ni frases","0 XP"],
  support:["Apoyo emocional","Frases básicas según tu tema","0 XP"],
  personal:["Videoterapia personalizada","Frases personales en Personal","+50 XP*"],
  note:"*El suplemento +50 XP es provisional. No se cobra al elegir; exportar requiere precio verificado por el servidor."}
} as const;
const cards=[
 {id:"simple",mode:"simple",image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg",Icon:Type},
 {id:"support",mode:"standard",image:"/videos/holistic-house/film-collection-v3/heart-flow.jpg",Icon:MessageCircleHeart},
 {id:"personal",mode:"personalized",image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg",Icon:Heart}
] as const;
// Reuse approved first-party photo/card assets; one selector in Extra only.
export function MandalaMontageExtraPersonal({locale,disabled,onSimple,onSupport,onPersonal}:Props){
 const t=copy[locale],actions={simple:onSimple,support:onSupport,personal:onPersonal};
 return <section className={css.extraRoot} data-video-montage-extra-personal aria-label={t.title}>
  <header className={css.extraHeading}><h2>{t.title}</h2><p>{t.intro}</p></header>
  <div className={css.extraChoices} role="group" aria-label={t.title}>
   {cards.map(card=>{
    const words=t[card.id];
    return <button type="button" key={card.id} className={css.extraPhotoCard}
      data-video-extra-text-option={card.id} data-video-text-mode={card.mode}
      aria-label={[words[0],words[1],words[2]].join(" · ")}
      disabled={disabled} onClick={actions[card.id]}>
     <span className={css.extraPoster}>
      {/* Original licensed local film-scene images; no AI or client photo upload. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.image} alt="" loading="lazy"/>
      <span className={css.extraPosterIcon}><card.Icon size={22} aria-hidden="true"/></span>
     </span>
     <span className={css.extraCopy}><strong>{words[0]}</strong><small>{words[1]}</small></span>
     <span className={css.extraChoiceRight}>
      <span className={card.id==="personal"?css.extraPricePersonal:css.extraPrice}>{words[2]}</span>
      <span className={css.extraArrow}><ArrowRight size={18} aria-hidden="true"/></span>
     </span>
    </button>;
   })}
  </div>
  <p className={css.extraNote} role="note">{t.note}</p>
 </section>;
}
