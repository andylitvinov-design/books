"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Check, ChevronDown, Pause, Play, RefreshCw, Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import {buildFreeVideoPlan,FREE_VIDEO_EXAMPLES,FREE_VIDEO_FAMILIES,
  FREE_VIDEO_PALETTES} from "@/lib/mandala/free-video-generator.mjs";
import {paintFreeVideoFrame} from "@/lib/mandala/free-video-renderer";
import type {FreeVideoPlan} from "@/lib/mandala/free-video-renderer";
import css from "./mandala-free-video-generator.module.css";

type Aspect="portrait"|"landscape"|"square";
type Family="auto"|"mandala"|"light"|"lotus";
type Palette="auto"|"gold"|"ocean"|"violet";
type Motion="auto"|"calm"|"flow"|"dynamic";
type Props={
  locale:PublicLocale;theme:VideoTheme;aspect:Aspect;duration:10|20|30|60;
  disabled:boolean;localPortrait?:HTMLImageElement|null;
  onPlanChange:(plan:FreeVideoPlan)=>void;
  onVisualDescriptionChange?:(text:string)=>void;
};
const copy={
  ru:{
    title:"Создайте новые движущиеся образы",tag:"НОВОЕ · БЕСПЛАТНО",
    intro:"Опишите картину — мы создадим новую анимацию из света, форм и движения прямо на вашем устройстве.",
    description:"Что должно происходить в кадре?",types:"Что рисовать?",
    families:{auto:"Определить по описанию",mandala:"Мандала",light:"Свет и энергия",lotus:"Лотос и вода"},
    palettes:{auto:"По описанию",gold:"Золото",ocean:"Океан",violet:"Сиреневый"},
    motions:{auto:"По описанию",calm:"Очень плавно",flow:"Плавное течение",dynamic:"Динамично"},
    options:"Цвета и движение",palette:"Палитра",motion:"Скорость",
    play:"Посмотреть движение",pause:"Остановить",variant:"Другой вариант",
    seed:"Вариант",local:"Новые кадры · не из каталога MP4 · без оплаты",
    limit:"Генерируются символические анимации, не реалистичные люди и съёмки.",
    fallback:"Этот образ пока нельзя нарисовать буквально. Показываем доступную символическую композицию. Выберите мандалу, свет или лотос.",
    photo:"Фото добавляется только после отдельного разрешения в настройках ниже.",
  },
  en:{
    title:"Create original moving artwork",tag:"NEW · FREE",
    intro:"Describe a visual scene. Generate original light, shape and motion locally on your device.",
    description:"What should happen on screen?",types:"What to draw?",
    families:{auto:"Detect from description",mandala:"Mandala",light:"Light & energy",lotus:"Lotus & water"},
    palettes:{auto:"From description",gold:"Gold",ocean:"Ocean",violet:"Violet"},
    motions:{auto:"From description",calm:"Very gentle",flow:"Slow flowing",dynamic:"Dynamic"},
    options:"Colors & motion",palette:"Palette",motion:"Motion",
    play:"Preview motion",pause:"Pause",variant:"Another variation",
    seed:"Variation",local:"Original frames · no stock MP4 · no fees",
    limit:"Symbolic animation, not realistic people or filmed scenes.",
    fallback:"That exact motif is not supported yet. Showing available symbolic art. Try mandala, light or lotus.",
    photo:"A personal photo appears only with the separate permission below.",
  },
  es:{
    title:"Crea imágenes animadas originales",tag:"NUEVO · GRATIS",
    intro:"Describe una escena. Generamos luz, formas y movimiento originales en tu dispositivo.",
    description:"¿Qué debería suceder en el vídeo?",types:"¿Qué dibujar?",
    families:{auto:"Detectar descripción",mandala:"Mandala",light:"Luz y energía",lotus:"Loto y agua"},
    palettes:{auto:"Según descripción",gold:"Dorado",ocean:"Océano",violet:"Violeta"},
    motions:{auto:"Según descripción",calm:"Muy suave",flow:"Fluido",dynamic:"Dinámico"},
    options:"Colores y movimiento",palette:"Paleta",motion:"Movimiento",
    play:"Ver movimiento",pause:"Pausar",variant:"Otra variación",
    seed:"Variación",local:"Fotogramas nuevos · sin clips MP4 · gratis",
    limit:"Animaciones simbólicas, no personas ni escenas fotorrealistas.",
    fallback:"Aún no podemos dibujar literalmente ese motivo. Prueba mandala, luz o loto.",
    photo:"Tu foto solo se incluye con el consentimiento por separado más abajo.",
  },
} as const;

export function MandalaFreeVideoGenerator({
  locale,theme,aspect,duration,disabled,localPortrait,onPlanChange,onVisualDescriptionChange,
}:Props){
  const t=copy[locale];
  const [description,setDescription]=useState<string>(FREE_VIDEO_EXAMPLES[locale]);
  const [family,setFamily]=useState<Family>("auto");
  const [palette,setPalette]=useState<Palette>("auto");
  const [motion,setMotion]=useState<Motion>("auto");
  const [variation,setVariation]=useState(0);
  const [playing,setPlaying]=useState(false);
  const previewRef=useRef<HTMLCanvasElement|null>(null);
  const plan=useMemo(()=>buildFreeVideoPlan({
    description,theme,locale,family,palette,motion,variation,durationSeconds:duration,
  }) as FreeVideoPlan,[description,theme,locale,family,palette,motion,variation,duration]);
  useEffect(()=>{onPlanChange(plan);},[onPlanChange,plan]);
  useEffect(()=>{onVisualDescriptionChange?.(description);},[onVisualDescriptionChange,description]);
  const size=aspect==="portrait"?[252,448]:aspect==="square"?[352,352]:[480,270];
  useEffect(()=>{
    const canvas=previewRef.current;
    if(!canvas)return;
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)return;
    let raf=0,last=-1000,initial=0,stopped=false;
    const paint=(seconds:number)=>{
      paintFreeVideoFrame(ctx,plan,seconds,localPortrait||null);
    };
    paint(0);
    if(!playing||disabled)return;
    const tick=(now:number)=>{
      if(stopped)return;
      if(!initial)initial=now;
      if(now-last>1000/18 && !document.hidden){
        paint((now-initial)/1000);
        last=now;
      }
      raf=window.requestAnimationFrame(tick);
    };
    raf=window.requestAnimationFrame(tick);
    return()=>{stopped=true;window.cancelAnimationFrame(raf);};
  },[plan,playing,disabled,localPortrait,aspect]);
  return <section className={css.root} data-free-video-generator
    data-free-video-renderer="local-procedural" aria-label={t.title}>
    <header className={css.heading}>
      <div className={css.emblem}><Sparkles size={22} aria-hidden="true"/></div>
      <div><span className={css.tag}>{t.tag}</span>
        <h3>{t.title}</h3><p>{t.intro}</p></div>
    </header>
    <label className={css.prompt}>
      <span>{t.description}</span>
      <textarea rows={3} maxLength={280} data-free-video-prompt
        disabled={disabled} value={description}
        onChange={event=>{setDescription(event.currentTarget.value);setVariation(0);}}/>
    </label>
    <div className={css.family} role="group" aria-label={t.types}>
      {( ["auto",...FREE_VIDEO_FAMILIES] as Family[] ).map(id=>
        <button type="button" key={id} data-free-video-family={id}
          aria-pressed={family===id} disabled={disabled}
          onClick={()=>{setFamily(id);setVariation(0);}}>{t.families[id]}</button>)}
    </div>
    <details className={css.options}>
      <summary><ChevronDown size={16} aria-hidden="true"/>{t.options}</summary>
      <div className={css.filters}>
        <label>{t.palette}<select data-free-video-palette value={palette}
          disabled={disabled} onChange={event=>{setPalette(event.target.value as Palette);setVariation(0);}}>
          {(["auto",...FREE_VIDEO_PALETTES] as Palette[]).map(id=>
            <option key={id} value={id}>{t.palettes[id]}</option>)}
        </select></label>
        <label>{t.motion}<select data-free-video-motion value={motion}
          disabled={disabled} onChange={event=>{setMotion(event.target.value as Motion);setVariation(0);}}>
          {(["auto","calm","flow","dynamic"] as Motion[]).map(id=>
            <option key={id} value={id}>{t.motions[id]}</option>)}
        </select></label>
      </div>
    </details>
    <div className={css.preview} data-free-video-preview>
      <canvas ref={previewRef} width={size[0]} height={size[1]}
        aria-label={t.title} role="img" data-free-video-canvas/>
      <div className={css.controls}>
        <button type="button" onClick={()=>setPlaying(value=>!value)}
          disabled={disabled} data-free-video-play>
          {playing?<Pause size={17} aria-hidden="true"/>:<Play size={17} aria-hidden="true"/>}
          {playing?t.pause:t.play}
        </button>
        <button type="button" data-free-video-variant disabled={disabled}
          onClick={()=>setVariation(value=>(value+1)%10000)}>
          <RefreshCw size={17} aria-hidden="true"/>{t.variant}
        </button>
        <small data-free-video-variation>{t.seed} {variation+1}</small>
      </div>
    </div>
    <p className={css.local}><Check size={16} aria-hidden="true"/>{t.local}</p>
    <p className={css.limit}>{t.limit} {t.photo}</p>
    {!plan.hasRecognizedMotif && family==="auto"?
      <p role="status" className={css.fallback} data-free-video-fallback>{t.fallback}</p>:null}
  </section>;
}
