"use client";

import {ArrowRight, Clapperboard, Crown, Film, Image as ImageIcon, Layers3, Music2, Sparkles, UserRound} from "lucide-react";
import styles from "./mandala-montage-pro-offer.module.css";

type Locale = "en"|"ru"|"es";
type Props = {locale:Locale;disabled:boolean;onGoStory:()=>void;onExplorePro:()=>void};

// Prices describe the existing video formats, not new per-feature charges.
// Paid selection and checkout stay exclusively in the existing PRO workspace.
const copy = {
  en: {
    title:"Upgrade your montage",description:"Give your video a more professional presence with three creative upgrades.",
    features:[
      {id:"greeting",title:"AI greeting character",description:"Add a speaking presenter, coach or guide.",price:"€3"},
      {id:"cinematic",title:"Premium video generation",description:"Cinematic AI scenes and high-quality visuals.",price:"€5"},
      {id:"portrait",title:"My image in video",description:"Animate or include your own photo or likeness.",price:"€5"}
    ],
    benefits:["HD / Full HD","Voice & music","Your style","More creative freedom"],
    freeTitle:"Generate for free",freeText:"Create a story-based video with the basic editor.",
    proTitle:"Explore PRO",proText:"Choose professional options for your next video.",
    goStory:"Continue free",goPro:"Go to PRO",
    priceNote:"Prices indicate video formats. Review the final options and total in PRO."
  },
  ru: {
    title:"Улучшите ваше видео",description:"Добавьте профессиональные возможности и выразительную подачу.",
    features:[
      {id:"greeting",title:"AI-персонаж для приветствия",description:"Ведущий, коуч или гид озвучит вступление.",price:"€3"},
      {id:"cinematic",title:"Премиальная видеогенерация",description:"Кинематографичные AI-сцены и качественный видеоряд.",price:"€5"},
      {id:"portrait",title:"Мой образ в видео",description:"Анимируйте или добавьте собственное фото.",price:"€5"}
    ],
    benefits:["HD / Full HD","Голос и музыка","Ваш стиль","Больше свободы"],
    freeTitle:"Создать бесплатно",freeText:"Соберите сюжетное видео в обычном редакторе.",
    proTitle:"Выбрать PRO",proText:"Настройте профессиональный формат вашего видео.",
    goStory:"Продолжить бесплатно",goPro:"Перейти в PRO",
    priceNote:"Указаны цены форматов. Окончательный выбор и сумма — в PRO."
  },
  es: {
    title:"Mejora tu montaje",description:"Da a tu vídeo un aspecto profesional con tres mejoras creativas.",
    features:[
      {id:"greeting",title:"Personaje de bienvenida IA",description:"Añade un presentador, coach o guía con voz.",price:"€3"},
      {id:"cinematic",title:"Generación de vídeo premium",description:"Escenas cinematográficas y visuales de calidad.",price:"€5"},
      {id:"portrait",title:"Mi imagen en el vídeo",description:"Anima o incorpora tu propia foto o imagen.",price:"€5"}
    ],
    benefits:["HD / Full HD","Voz y música","Tu estilo","Más libertad creativa"],
    freeTitle:"Generar gratis",freeText:"Crea un vídeo con la historia y el editor básico.",
    proTitle:"Explorar PRO",proText:"Elige opciones profesionales para tu vídeo.",
    goStory:"Continuar gratis",goPro:"Ir a PRO",
    priceNote:"Precios de formatos de vídeo. Confirma las opciones y el total en PRO."
  }
} as const;

const benefitIcons=[Film,Music2,Layers3,Sparkles];

export function MandalaMontageProOffer({locale,disabled,onGoStory,onExplorePro}:Props){
  const t=copy[locale];
  return <section className={styles.root} data-video-montage-pro-offer aria-labelledby="montage-pro-offer-title">
    <header className={styles.header}>
      <div className={styles.eyebrow}><Sparkles size={15} aria-hidden="true"/> MONTAGE PRO</div>
      <h2 id="montage-pro-offer-title">{t.title}</h2>
      <p>{t.description}</p>
    </header>
    <div className={styles.features}>
      {t.features.map(item=>{
        const Icon=item.id==="greeting"?UserRound:item.id==="cinematic"?Clapperboard:ImageIcon;
        return <article className={styles.feature} key={item.id} data-video-pro-feature={item.id}>
          <div className={styles.thumb} data-feature={item.id} aria-hidden="true"><Icon size={23}/></div>
          <div className={styles.featureText}><h3>{item.title}</h3><p>{item.description}</p></div>
          <span className={styles.price} aria-label={item.price}>{item.price}</span>
        </article>;
      })}
    </div>
    <div className={styles.benefits} aria-label={locale==="ru"?"Возможности":locale==="es"?"Ventajas":"Benefits"}>
      {t.benefits.map((label,index)=>{
        const Icon=benefitIcons[index];
        return <span key={label}><Icon size={17} aria-hidden="true"/>{label}</span>;
      })}
    </div>
    <div className={styles.actions}>
      <section className={styles.freeCard}>
        <h3><Clapperboard size={22} aria-hidden="true"/>{t.freeTitle}</h3><p>{t.freeText}</p>
        <button type="button" data-video-montage-pro-free onClick={onGoStory} disabled={disabled}>{t.goStory}<ArrowRight size={17} aria-hidden="true"/></button>
      </section>
      <section className={styles.proCard}>
        <Crown className={styles.crown} size={27} aria-hidden="true"/>
        <h3><Sparkles size={22} aria-hidden="true"/>{t.proTitle}</h3><p>{t.proText}</p>
        <button type="button" data-video-montage-pro-explore onClick={onExplorePro} disabled={disabled}>{t.goPro}<ArrowRight size={17} aria-hidden="true"/></button>
      </section>
    </div>
    <p className={styles.priceNote}>{t.priceNote}</p>
  </section>;
}
