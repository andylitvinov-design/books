"use client";

import {useState} from "react";
import {Check,Clapperboard} from "lucide-react";
import {listMyTubePlotChoices} from "@/lib/mandala/mytube-scenario-plots.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./mytube-scenario-plot-picker.module.css";

type Props={locale:PublicLocale;scenarioId:string;context?:"catalog"|"director"};
const messages={
  ru:{
    title:"4 сюжета на выбор",
    intro:"Четыре разные истории для выбранного сценария. Нажмите на интересный сюжет, чтобы увидеть его четыре кадра.",
    preview:"Покадровая история",
    direction:"Как снимать",
    select:"Выбрать сюжет",
    selected:"Выбран",
    note:"Это сюжетная концепция, не готовое видео. Для создания именно такого ролика ещё нужно подобрать и проверить четыре лицензированных кадра.",
    directorNote:"Готовый символический монтаж ниже существует отдельно и пока не воспроизводит этот сюжет автоматически.",
  },
  en:{
    title:"Choose from 4 story plots",
    intro:"Four different stories for the selected scenario. Select one to see its four-shot outline.",
    preview:"Four-shot storyboard",
    direction:"Camera direction",
    select:"Select plot",
    selected:"Selected",
    note:"This is an editorial outline, not a finished film. The four matching licensed clips still need to be sourced and reviewed.",
    directorNote:"The ready-made symbolic montage below is separate; it does not yet reproduce this selected plot.",
  },
  es:{
    title:"Elige entre 4 tramas",
    intro:"Cuatro historias distintas para el guion elegido. Selecciona una para ver sus cuatro escenas.",
    preview:"Guion gráfico de cuatro planos",
    direction:"Dirección de cámara",
    select:"Elegir trama",
    selected:"Elegido",
    note:"Es una propuesta narrativa, no un vídeo terminado. Aún deben seleccionarse y verificarse cuatro clips con licencia.",
    directorNote:"El montaje simbólico disponible abajo es independiente y no reproduce aún esta trama.",
  },
} as const;

export function MyTubeScenarioPlotPicker({locale,scenarioId,context="catalog"}:Props){
  const plots=listMyTubePlotChoices(scenarioId,locale);
  const [selectedId,setSelectedId]=useState("");
  const selected=plots.find(plot=>plot.id===selectedId)||null;
  const t=messages[locale];
  if(plots.length!==4)return null;
  return <section className={styles.root} data-mytube-plot-picker={scenarioId}
    data-selected-plot={selected?.id||""}>
    <div className={styles.head}>
      <Clapperboard size={21} aria-hidden="true"/>
      <div><h3>{t.title}</h3><p>{t.intro}</p></div>
    </div>
    <div className={styles.choices} role="group" aria-label={t.title} data-mytube-plot-options>
      {plots.map((plot,i)=><button key={plot.id} type="button"
        data-mytube-plot={plot.id} aria-pressed={selected?.id===plot.id}
        onClick={()=>setSelectedId(plot.id)}>
        <span className={styles.number}>{i+1}{selected?.id===plot.id?<Check size={15} aria-hidden="true"/>:null}</span>
        <span className={styles.kind}>{plot.plotTypeLabel}</span>
        <strong>{plot.label}</strong>
        <small>{plot.storyboard[0].visualHint}</small>
        <span className={styles.action}>{selected?.id===plot.id?t.selected:t.select}</span>
      </button>)}
    </div>
    {selected?<div className={styles.preview} data-mytube-plot-preview={selected.id} aria-live="polite">
      <h4>{t.preview}: {selected.label}</h4>
      <ol className={styles.shots}>
        {selected.storyboard.map(shot=><li key={shot.shot}>
          <span className={styles.shotNumber}>{shot.shot}</span>
          <div><strong>{shot.phase}</strong><p>{shot.visualHint}</p>
            <small>{t.direction}: {shot.directorNote}</small>
          </div>
        </li>)}
      </ol>
    </div>:null}
    <p className={styles.note}>{t.note}</p>
    {context==="director"&&selected?<p className={styles.note}>{t.directorNote}</p>:null}
  </section>;
}
