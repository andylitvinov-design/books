"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Check,Heart,Hand,Play,Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import {FREE_GREETING_CATALOG,recommendGreeting,resolveGreetingCharacter} from "@/lib/mandala/free-greeting-catalog.mjs";
import {paintFreeGreeting} from "@/lib/mandala/free-greeting-overlay.mjs";
import type {FreeGreetingCharacter,RenderableGreetingCharacter} from "@/lib/mandala/free-greeting-catalog.mjs";
import styles from "./mandala-free-greeting.module.css";

type Purpose="greeting"|"support";
type Props={
  locale:PublicLocale;
  selected:FreeGreetingCharacter;
  disabled:boolean;
  sceneKey:string;
  theme:string;
  onSelect:(character:FreeGreetingCharacter)=>void;
  onPreview:()=>void;
};
const copy={
  ru:{
    title:"Выберите персонажа",hint:"Приветствие или поддержка в вашем видео",
    greeting:"Приветствие",support:"Поддержка",free:"Бесплатно · 0 дополнительных XP",
    none:"Без персонажа",auto:"Автоподбор",preview:"Финал",chosen:"Выбран:",
    scroll:"Листайте персонажей в сторону — все 30 доступны здесь",
  },
  en:{
    title:"Choose a character",hint:"Greeting or personal support in your video",
    greeting:"Greeting",support:"Support",free:"Free · 0 extra XP",
    none:"No character",auto:"Auto match",preview:"Preview",chosen:"Selected:",
    scroll:"Swipe for more — all 30 characters are right here",
  },
  es:{
    title:"Elige un personaje",hint:"Saludo o apoyo personal para tu vídeo",
    greeting:"Saludo",support:"Apoyo",free:"Gratis · 0 XP adicionales",
    none:"Sin personaje",auto:"Automático",preview:"Vista previa",chosen:"Elegido:",
    scroll:"Desliza para ver los 30 personajes aquí mismo",
  }
} as const;

// One genuine frame of the existing Canvas export renderer, never a stock
// portrait that would differ from the character appearing in the finished MP4.
function CharacterThumbnail({id,sceneKey,theme}:{id:RenderableGreetingCharacter;sceneKey:string;theme:string}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;
    if(!canvas)return;
    const paint=()=>{
      const ctx=canvas.getContext("2d");
      if(!ctx)return;
      const gradient=ctx.createLinearGradient(0,0,0,188);
      gradient.addColorStop(0,"#e5ede8");gradient.addColorStop(.65,"#f8e3c7");
      gradient.addColorStop(1,"#91ae94");
      ctx.fillStyle=gradient;ctx.fillRect(0,0,180,188);
      ctx.fillStyle="#b4c4a1";ctx.fillRect(0,168,180,20);
      ctx.save();
      // The real video compositor locates the character near a scenic edge;
      // shift only this thumbnail to keep the illustrated figure centered.
      ctx.translate(58,0);
      paintFreeGreeting(ctx,28.25,30,id,"portrait",sceneKey,theme);
      ctx.restore();
    };
    if(typeof IntersectionObserver==="undefined"){paint();return;}
    const observer=new IntersectionObserver(records=>{
      if(records.some(entry=>entry.isIntersecting)){paint();observer.disconnect();}
    },{rootMargin:"160px"});
    observer.observe(canvas);
    return ()=>observer.disconnect();
  },[id,sceneKey,theme]);
  return <canvas ref={ref} width={180} height={188}
    className={styles.thumbnail} aria-hidden="true"/>;
}
const featured:Record<Purpose,readonly string[]>={
  greeting:["host","woman","traveler","man","fairy","child","dancer"],
  support:["light-guide","sage","guardian","yogi","heart-messenger","angel","elf"],
};

export function MandalaFreeGreeting({locale,selected,disabled,sceneKey,theme,onSelect,onPreview}:Props){
  const t=copy[locale];
  const [mode,setMode]=useState<Purpose>("greeting");
  const railRef=useRef<HTMLDivElement>(null);
  const recommendedId=recommendGreeting(sceneKey,theme);
  const effective=resolveGreetingCharacter(selected,sceneKey,theme);
  const chosen=FREE_GREETING_CATALOG.find(entry=>entry.id===effective);
  const entries=useMemo(()=>{
    const priorities=featured[mode];
    return [...FREE_GREETING_CATALOG].sort((a,b)=>{
      const left=priorities.indexOf(a.id),right=priorities.indexOf(b.id);
      return (left<0?99:left)-(right<0?99:right);
    });
  },[mode]);
  return <section className={styles.root} data-video-free-greeting
    data-greeting-purpose={mode} data-greeting-character={selected}
    data-greeting-resolved={effective} aria-label={t.title}>
    <header className={styles.header}>
      <div className={styles.heading}>
        <h3><Sparkles size={19} aria-hidden="true"/>{t.title}</h3>
        <p>{t.hint} <span className={styles.free}>{t.free}</span></p>
      </div>
      <div className={styles.modes} role="group" aria-label={t.hint}>
        <button type="button" data-greeting-mode="greeting"
          aria-pressed={mode==="greeting"} disabled={disabled}
          onClick={()=>{setMode("greeting");railRef.current?.scrollTo({left:0});}}>
          <Hand size={15} aria-hidden="true"/>{t.greeting}
        </button>
        <button type="button" data-greeting-mode="support"
          aria-pressed={mode==="support"} disabled={disabled}
          onClick={()=>{setMode("support");railRef.current?.scrollTo({left:0});}}>
          <Heart size={15} aria-hidden="true"/>{t.support}
        </button>
      </div>
    </header>
    <div className={styles.rail} ref={railRef} role="group"
      data-greeting-choices={mode} aria-label={t.title} tabIndex={0}>
      {entries.map(entry=><button key={entry.id} type="button"
        data-greeting-option={entry.id} aria-pressed={selected===entry.id}
        aria-label={entry.title[locale]+" · "+t.free}
        className={selected===entry.id?styles.chosen:styles.choice}
        disabled={disabled} onClick={()=>onSelect(entry.id)}>
        <span className={styles.avatar}>
          <CharacterThumbnail id={entry.id} sceneKey={sceneKey} theme={theme}/>
          {selected===entry.id?<span className={styles.tick}><Check size={15} strokeWidth={3} aria-hidden="true"/></span>:null}
        </span>
        <strong>{entry.title[locale]}</strong>
      </button>)}
    </div>
    <div className={styles.controls}>
      <div className={styles.quickChoices} role="group" aria-label={t.title}>
        <button type="button" data-greeting-option="none"
          aria-pressed={selected==="none"} disabled={disabled}
          onClick={()=>onSelect("none")}>{t.none}</button>
        <button type="button" data-greeting-option="auto"
          aria-pressed={selected==="auto"} disabled={disabled}
          onClick={()=>onSelect("auto")}>{t.auto}</button>
      </div>
      <button type="button" className={styles.preview} data-greeting-preview
        disabled={disabled||selected==="none"} onClick={onPreview}>
        <Play size={15} aria-hidden="true"/>{t.preview}
      </button>
    </div>
    <div className={styles.selectionLine} aria-live="polite">
      {chosen?t.chosen+" "+chosen.emoji+" "+chosen.title[locale]:
        selected==="none"?t.none:t.auto+" · "+recommendedId}
      <span className={styles.scrollHint}>{t.scroll}</span>
    </div>
  </section>;
}
