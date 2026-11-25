"use client";
import {ArrowRight, Clapperboard, Film, Sparkles, UserRound} from "lucide-react";
import styles from "./mandala-montage-pro-offer.module.css";

type Locale = "en"|"ru"|"es";
type Props={locale:Locale;disabled:boolean;onChooseFree:()=>void;onChooseCharacter:()=>void;onChooseCinematic:()=>void;};

// Free opens Ready without rendering. Only the explicit Ready Generate action
// starts the guarded encoder; €3/€5 retain their existing protected routes.
const copy={
 en:{title:"Choose your video type",hint:"Free opens Ready; premium choices open their editors.",options:[
  {id:"free",title:"Free video",description:"A simple story-based video.",price:"Free",button:"Generate"},
  {id:"character",title:"Video + AI character",description:"A generated character for your story.",price:"€3",button:"Choose"},
  {id:"cinematic",title:"Premium cinematic video",description:"High-quality scenes with cinematic effects.",price:"€5",button:"Choose"}]},
 ru:{title:"Выберите формат видео",hint:"Бесплатный вариант откроет Ready; платные — свои редакторы.",options:[
  {id:"free",title:"Бесплатное видео",description:"Простой ролик с сюжетом.",price:"0 €",button:"Создать"},
  {id:"character",title:"Видео + AI-персонаж",description:"Сгенерированный персонаж по запросу.",price:"3 €",button:"Выбрать"},
  {id:"cinematic",title:"Кинематографическое видео",description:"Качественные сцены с киноэффектами.",price:"5 €",button:"Выбрать"}]},
 es:{title:"Elige el tipo de vídeo",hint:"Gratis abre Ready; las opciones premium abren sus editores.",options:[
  {id:"free",title:"Vídeo gratis",description:"Un vídeo sencillo con historia.",price:"Gratis",button:"Generar"},
  {id:"character",title:"Vídeo + personaje IA",description:"Un personaje generado para tu historia.",price:"3 €",button:"Elegir"},
  {id:"cinematic",title:"Vídeo cinematográfico",description:"Escenas de calidad con efecto cine.",price:"5 €",button:"Elegir"}]}
} as const;

export function MandalaMontageProOffer({locale,disabled,onChooseFree,onChooseCharacter,onChooseCinematic}:Props){
 const t=copy[locale];
 return <section className={styles.root} data-video-montage-pro-offer aria-labelledby="montage-pro-offer-title">
  <header className={styles.header}>
   <h2 id="montage-pro-offer-title"><Sparkles size={20} aria-hidden="true"/>{t.title}</h2>
   <p>{t.hint}</p>
  </header>
  <div className={styles.options}>
   {t.options.map(item=>{
    const Icon=item.id==="free"?Clapperboard:item.id==="character"?UserRound:Film;
    const onChoose=item.id==="free"?onChooseFree:item.id==="character"?onChooseCharacter:onChooseCinematic;
    return <article className={styles.option} key={item.id} data-video-pro-feature={item.id}>
     <div className={styles.thumb} data-feature={item.id} aria-hidden="true">
      <span className={styles.thumbIcon}><Icon size={19}/></span>
     </div>
     <div className={styles.optionText}><h3>{item.title}</h3><p>{item.description}</p></div>
     <div className={styles.optionAction}>
      <span className={styles.price}>{item.price}</span>
      <button type="button" data-video-montage-pro-choice={item.id}
       aria-label={[item.button,item.title,item.price].join(" · ")}
       disabled={disabled} onClick={onChoose}>
       {item.button}<ArrowRight size={15} aria-hidden="true"/>
      </button>
     </div>
    </article>;
   })}
  </div>
 </section>;
}
