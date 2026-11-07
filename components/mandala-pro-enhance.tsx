"use client";

import {useState} from "react";
import type {ReactNode} from "react";
import {BookOpen, Check, Clapperboard, Film, Mountain, Play, SlidersHorizontal, Sparkles, UsersRound} from "lucide-react";
import styles from "./mandala-pro-enhance.module.css";

type ProLocale="ru"|"en"|"es";
const gallery="/images/holistic-house/pro-enhance-gallery.webp";
const upgrades=[
  {id:"cinema",Icon:Film,position:"0% 0%"},
  {id:"characters",Icon:UsersRound,position:"50% 0%"},
  {id:"worlds",Icon:Mountain,position:"100% 0%"},
  {id:"stories",Icon:BookOpen,position:"0% 100%"},
  {id:"magic",Icon:Sparkles,position:"50% 100%"},
  {id:"director",Icon:Clapperboard,position:"100% 100%"},
] as const;
type UpgradeId=(typeof upgrades)[number]["id"];
const copy={
  en:{
    title:"Choose an AI upgrade",selected:"Selected upgrade",
    advanced:"More creative controls",primary:"Add selected upgrade and generate PRO video",
    free:"Generate video without AI effects",
    pending:"Premium AI generation is not connected yet. No payment or AI render was initiated. You can create a free video instead.",
    labels:{cinema:"Cinematic quality",characters:"Characters",worlds:"AI scenes",
      stories:"Stories",magic:"Visual magic",director:"AI Director"},
    benefits:{cinema:"Better light, color and depth",characters:"A unique character or guide",
      worlds:"Unique imagined scenery",stories:"A meaningful cinematic story",
      magic:"Artistic light and transitions",director:"Full AI-directed movie"},
  },
  ru:{
    title:"Выберите AI-улучшение",selected:"Выбрано",
    advanced:"Другие творческие настройки",
    primary:"Добавить выбранный апгрейд и сгенерировать PRO-видео",
    free:"Сгенерировать видео без ИИ-эффектов",
    pending:"Платная AI-генерация пока не подключена. Списаний и рендера не было. Вместо этого можно создать бесплатное видео.",
    labels:{cinema:"Кинокачество",characters:"Персонажи",worlds:"AI-сцены",
      stories:"Сюжеты",magic:"Магия света",director:"AI-режиссёр"},
    benefits:{cinema:"Лучше свет, цвет и глубина",characters:"Особый персонаж или проводник",
      worlds:"Уникальные фантастические пейзажи",stories:"Кинематографический сюжет",
      magic:"Художественный свет и переходы",director:"Полная AI-режиссура"},
  },
  es:{
    title:"Elige una mejora con IA",selected:"Mejora elegida",
    advanced:"Más ajustes creativos",primary:"Añadir mejora y generar vídeo PRO",
    free:"Generar vídeo sin efectos de IA",
    pending:"La generación premium con IA aún no está conectada. No se ha cobrado ni generado nada. Puedes crear un vídeo gratis.",
    labels:{cinema:"Calidad de cine",characters:"Personajes",worlds:"Escenas IA",
      stories:"Historias",magic:"Magia visual",director:"Director IA"},
    benefits:{cinema:"Mejor luz, color y profundidad",characters:"Un personaje o guía único",
      worlds:"Paisajes originales de fantasía",stories:"Una historia cinematográfica",
      magic:"Luz artística y transiciones",director:"Dirección completa con IA"},
  },
} as const;
type Props={locale:ProLocale;disabled:boolean;onGenerateFree:()=>void;children?:ReactNode};

export function MandalaProEnhance({locale,disabled,onGenerateFree,children}:Props){
  const [selected,setSelected]=useState<UpgradeId>("cinema");
  const [showUnavailable,setShowUnavailable]=useState(false);
  const t=copy[locale],current=upgrades.find(item=>item.id===selected)!;
  return <section className={styles.panel} data-workspace-section="pro"
    data-video-pro-enhance data-pro-selected-upgrade={selected}
    aria-labelledby="video-pro-upgrade-title">
    <div className={styles.headingRow}>
      <h3 className={styles.heading} id="video-pro-upgrade-title">
        <Sparkles aria-hidden="true" size={23}/>{t.title}
      </h3>
      <details className={styles.advanced} data-video-pro-advanced-options>
        <summary title={t.advanced} aria-label={t.advanced}>
          <SlidersHorizontal size={20} aria-hidden="true"/>
          <span className={styles.screenReader}>{t.advanced}</span>
        </summary>
        <div className={styles.legacy}>{children}</div>
      </details>
    </div>
    <div className={styles.grid} role="group" aria-label={t.title}>
      {upgrades.map(item=>{
        const Icon=item.Icon;
        return <button key={item.id} type="button" className={styles.card}
          data-pro-upgrade-id={item.id} aria-pressed={selected===item.id}
          disabled={disabled} aria-label={t.labels[item.id]}
          onClick={()=>{setSelected(item.id);setShowUnavailable(false);}}>
          <span className={styles.poster} data-pro-artwork={item.id}>
            <span className={styles.posterArt} aria-hidden="true"
              style={{backgroundImage:'url("'+gallery+'")',backgroundPosition:item.position}}/>
            {selected===item.id?<span className={styles.tick}>
              <Check size={15} strokeWidth={3} aria-hidden="true"/>
            </span>:null}
          </span>
          <span className={styles.cardTitle}>
            <Icon size={18} aria-hidden="true"/><span>{t.labels[item.id]}</span>
          </span>
        </button>;
      })}
    </div>
    <div className={styles.selection} role="status" aria-live="polite"
      data-pro-selected-summary>
      <span className={styles.selectionImage} aria-hidden="true"
        style={{backgroundImage:'url("'+gallery+'")',backgroundPosition:current.position}}/>
      <span className={styles.selectionText}>
        <strong>{t.selected}: {t.labels[selected]}</strong>
        <small>{t.benefits[selected]}</small>
      </span>
    </div>
    {showUnavailable?<p className={styles.pending} role="status"
      data-video-pro-unavailable>{t.pending}</p>:null}
    <div className={styles.actions} data-video-pro-actions>
      <button className={styles.primary} type="button" data-video-generate-pro
        disabled={disabled} onClick={()=>setShowUnavailable(true)}>
        <Sparkles size={21} aria-hidden="true"/><span>{t.primary}</span>
      </button>
      <button className={styles.secondary} type="button" data-video-generate-without-ai
        disabled={disabled} onClick={()=>{setShowUnavailable(false);onGenerateFree();}}>
        <Play size={21} aria-hidden="true"/><span>{t.free}</span>
      </button>
    </div>
  </section>;
}
