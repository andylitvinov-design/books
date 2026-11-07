"use client";

import {useState} from "react";
import type {ReactNode} from "react";
import {BookOpen, Check, ChevronDown, Clapperboard, Film, Mountain, Play, SlidersHorizontal, Sparkles, UsersRound} from "lucide-react";
import styles from "./mandala-pro-enhance.module.css";

type ProLocale = "ru" | "en" | "es";
const upgrades = [
  {id:"cinema", Icon:Film, poster:"/videos/holistic-house/film-collection-v3/clear-morning.jpg"},
  {id:"characters", Icon:UsersRound, poster:"/images/holistic-house/course-hero-mindful.svg"},
  {id:"worlds", Icon:Mountain, poster:"/videos/holistic-house/film-collection-v2/radiant-portal.jpg"},
  {id:"stories", Icon:BookOpen, poster:"/videos/holistic-house/film-collection-v2/lone-tree.jpg"},
  {id:"magic", Icon:Sparkles, poster:"/videos/holistic-house/film-collection-v2/wildflower-dance.jpg"},
  {id:"director", Icon:Clapperboard, poster:"/videos/holistic-house/film-collection-v2/mountain-air.jpg"},
] as const;
type UpgradeId = (typeof upgrades)[number]["id"];

const copy = {
  en:{
    title:"Choose an AI upgrade",
    selected:"Selected upgrade",
    estimate:"Price confirmed before payment",
    advanced:"More creative controls",
    primary:"Add selected upgrade and generate PRO video",
    free:"Generate video without AI effects",
    pending:"Premium AI generation is not connected yet. No payment or AI render was initiated. You can create the free local video below.",
    labels:{
      cinema:"Cinematic quality",characters:"Characters",worlds:"AI scenes",
      stories:"Stories",magic:"Visual magic",director:"AI Director",
    },
    benefits:{
      cinema:"Enhanced light, color and depth",
      characters:"An original guide or character",
      worlds:"Original AI-created scenery",
      stories:"A directed cinematic story",
      magic:"Artistic light and transitions",
      director:"A complete AI-directed video",
    },
  },
  ru:{
    title:"Выберите AI-улучшение",
    selected:"Выбранное улучшение",
    estimate:"Цена подтверждается до оплаты",
    advanced:"Другие творческие настройки",
    primary:"Добавить выбранный апгрейд и сгенерировать PRO-видео",
    free:"Сгенерировать видео без ИИ-эффектов",
    pending:"Платная AI-генерация пока не подключена. Списаний и рендера не было. Ниже можно создать обычное видео бесплатно.",
    labels:{
      cinema:"Кинокачество",characters:"Персонажи",worlds:"AI-сцены",
      stories:"Сюжеты",magic:"Магия света",director:"AI-режиссёр",
    },
    benefits:{
      cinema:"Больше света, цвета и глубины",
      characters:"Авторский персонаж или проводник",
      worlds:"Уникальные сгенерированные пейзажи",
      stories:"Кинематографический сюжет",
      magic:"Художественные эффекты и переходы",
      director:"Полноценная AI-режиссура",
    },
  },
  es:{
    title:"Elige una mejora con IA",
    selected:"Mejora seleccionada",
    estimate:"Precio confirmado antes de pagar",
    advanced:"Más ajustes creativos",
    primary:"Añadir mejora y generar vídeo PRO",
    free:"Generar vídeo sin efectos de IA",
    pending:"La generación premium con IA todavía no está conectada. No se ha cobrado ni generado nada. Puedes crear un vídeo local gratis.",
    labels:{
      cinema:"Calidad de cine",characters:"Personajes",worlds:"Escenas IA",
      stories:"Historias",magic:"Magia visual",director:"Director IA",
    },
    benefits:{
      cinema:"Mejor luz, color y profundidad",
      characters:"Un personaje o guía original",
      worlds:"Paisajes originales generados con IA",
      stories:"Una historia cinematográfica",
      magic:"Efectos de luz y transiciones",
      director:"Dirección integral del vídeo con IA",
    },
  },
} as const;

type Props = {
  locale:ProLocale;
  disabled:boolean;
  onGenerateFree:()=>void;
  children?:ReactNode;
};

export function MandalaProEnhance({locale,disabled,onGenerateFree,children}:Props){
  const [selected,setSelected]=useState<UpgradeId>("cinema");
  const [showUnavailable,setShowUnavailable]=useState(false);
  const t=copy[locale];
  return (
    <section className={styles.panel} data-workspace-section="pro"
      data-video-pro-enhance data-pro-selected-upgrade={selected}
      aria-labelledby="video-pro-upgrade-title">
      <h3 className={styles.heading} id="video-pro-upgrade-title">
        <Sparkles aria-hidden="true" size={22}/>{t.title}
      </h3>
      <div className={styles.grid} role="group" aria-label={t.title}>
        {upgrades.map(item=>{
          const Icon=item.Icon;
          return (
            <button key={item.id} type="button" className={styles.card}
              data-pro-upgrade-id={item.id} aria-pressed={selected===item.id}
              disabled={disabled} aria-label={t.labels[item.id]}
              onClick={()=>{setSelected(item.id);setShowUnavailable(false);}}>
              <span className={styles.poster}>
                {/* Existing licensed first-party imagery; no external model call. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.poster} alt="" loading="lazy" draggable={false}/>
                {selected===item.id?<span className={styles.tick}><Check size={15} strokeWidth={3}/></span>:null}
              </span>
              <span className={styles.cardTitle}>
                <Icon size={17} aria-hidden="true"/><span>{t.labels[item.id]}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.selection} role="status" aria-live="polite">
        <span className={styles.selectionImage}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={upgrades.find(item=>item.id===selected)!.poster} alt=""/>
        </span>
        <span className={styles.selectionText}>
          <strong>{t.selected}: {t.labels[selected]}</strong>
          <small>{t.benefits[selected]}</small>
        </span>
      </div>
      <details className={styles.advanced} data-video-pro-advanced-options>
        <summary><SlidersHorizontal size={17} aria-hidden="true"/>{t.advanced}<ChevronDown size={17} aria-hidden="true"/></summary>
        <div className={styles.legacy}>{children}</div>
      </details>
      {showUnavailable ? <p className={styles.pending} role="status" data-video-pro-unavailable>
        {t.pending}
      </p> : <p className={styles.estimate}>{t.estimate}</p>}
      <div className={styles.actions} data-video-pro-actions>
        <button className={styles.primary} type="button" data-video-generate-pro
          disabled={disabled} onClick={()=>setShowUnavailable(true)}>
          <Sparkles size={19} aria-hidden="true"/><span>{t.primary}</span>
        </button>
        <button className={styles.secondary} type="button" data-video-generate-without-ai
          disabled={disabled} onClick={()=>{setShowUnavailable(false);onGenerateFree();}}>
          <Play size={19} aria-hidden="true"/><span>{t.free}</span>
        </button>
      </div>
    </section>
  );
}
