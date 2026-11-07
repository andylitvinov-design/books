"use client";
import {useState} from "react";
import type {ReactNode} from "react";
import {ArrowRight,AudioLines,Check,Clapperboard,Film,House,Leaf,Mountain,Play,Plus,SlidersHorizontal,Sparkles,UsersRound,WandSparkles} from "lucide-react";
import type {StoryAddonKind} from "@/lib/mandala/story-addon-catalog";
import styles from "./mandala-pro-enhance.module.css";

type Locale="en"|"ru"|"es";
type Panel="effects"|"audio";
const gallery="/images/holistic-house/pro-enhance-gallery.webp";
const cards=[
  {id:"greeting",Icon:UsersRound,pos:"50% 0%",kind:"character"},
  {id:"cinema",Icon:Clapperboard,pos:"100% 0%",kind:"story"},
  {id:"place",Icon:Mountain,pos:"0% 0%",kind:"place"},
  {id:"home",Icon:House,pos:"0% 100%",kind:"place"},
  {id:"director",Icon:WandSparkles,pos:"100% 100%",kind:"story"},
  {id:"quality",Icon:SlidersHorizontal,pos:"50% 100%",kind:"symbol"}
] as const;
type CardId=(typeof cards)[number]["id"];
const top=[
 {id:"montage",Icon:Film},{id:"greeting",Icon:UsersRound},
 {id:"cinema",Icon:Clapperboard},{id:"place",Icon:Mountain},
 {id:"home",Icon:House},{id:"quality",Icon:SlidersHorizontal}
] as const;
const additions=[
 {id:"scenes",Icon:Film,pos:"0% 0%",kind:"story"},
 {id:"characters",Icon:UsersRound,pos:"50% 0%",kind:"character"},
 {id:"cinema",Icon:Clapperboard,pos:"100% 0%",kind:"story"},
 {id:"places",Icon:Mountain,pos:"0% 100%",kind:"place"},
 {id:"homes",Icon:House,pos:"0% 100%",kind:"place"},
 {id:"audio",Icon:AudioLines,pos:"50% 100%",kind:"audio"}
] as const;
const copy={
 ru:{
  title:"PRO-монтаж и улучшение",desc:"Профессиональная сборка, кинематографичность и качество",
  add:"Добавить в видео",next:"Перейти к монтажу",more:"Другие творческие настройки",
  free:"Бесплатные варианты",paid:"PRO-варианты",choose:"Выберите вариант",
  freeHint:"Откроется существующий каталог. Бесплатны только проверенные готовые материалы.",
  pending:"Платная AI-генерация пока не подключена. Списаний и рендера не было.",
  noAi:"Сгенерировать видео без ИИ-эффектов",ai:"Добавить AI PRO и создать видео",
  top:{montage:"Монтаж",greeting:"Персонаж",cinema:"Киносцена",place:"Место силы",home:"Дом",quality:"Качество"},
  cards:{
   greeting:{title:"Приветствие персонажа",desc:"Вступление, настрой, контакт"},
   cinema:{title:"Киносцена (портал)",desc:"Переход, эффект, глубина"},
   place:{title:"Место силы",desc:"Природа, энергия, вдохновение"},
   home:{title:"Дом (уютное пространство)",desc:"Гармония, тепло, безопасность"},
   director:{title:"AI-режиссёр",desc:"Автоулучшение и умный монтаж"},
   quality:{title:"Качество",desc:"Цвет, чёткость, звук и стиль"}
  },
  addNames:{scenes:"Сцены",characters:"Персонажи",cinema:"Киносцены",places:"Места силы",homes:"Дома",audio:"Аудиофразы"}
 },
 en:{
  title:"PRO montage & enhancement",desc:"Professional editing, cinematic style and quality",
  add:"Add to video",next:"Continue to montage",more:"More creative controls",
  free:"Free options",paid:"PRO options",choose:"Choose an option",
  freeHint:"Opens the existing catalog. Only verified available media is free.",
  pending:"Paid AI generation is not connected. No payment or render was initiated.",
  noAi:"Generate video without AI effects",ai:"Add AI PRO and generate video",
  top:{montage:"Montage",greeting:"Character",cinema:"Film scene",place:"Power place",home:"Home",quality:"Quality"},
  cards:{
   greeting:{title:"Character greeting",desc:"Welcome, warmth and connection"},
   cinema:{title:"Cinema scene (portal)",desc:"Transition, effects and depth"},
   place:{title:"Place of power",desc:"Nature and inspiration"},
   home:{title:"Home (cozy space)",desc:"Warmth and safety"},
   director:{title:"AI Director",desc:"Smart editing and improvements"},
   quality:{title:"Quality",desc:"Color, clarity, sound and style"}
  },
  addNames:{scenes:"Scenes",characters:"Characters",cinema:"Cinema scenes",places:"Power places",homes:"Homes",audio:"Spoken phrases"}
 },
 es:{
  title:"Montaje y mejoras PRO",desc:"Edición profesional, estilo cinematográfico y calidad",
  add:"Añadir al vídeo",next:"Ir al montaje",more:"Más ajustes creativos",
  free:"Opciones gratis",paid:"Opciones PRO",choose:"Elige una opción",
  freeHint:"Abre el catálogo actual. Solo los materiales verificados son gratis.",
  pending:"La generación de IA de pago todavía no está conectada. No hubo cobro ni render.",
  noAi:"Generar vídeo sin efectos de IA",ai:"Añadir IA PRO y generar vídeo",
  top:{montage:"Montaje",greeting:"Personaje",cinema:"Escena",place:"Lugar",home:"Casa",quality:"Calidad"},
  cards:{
   greeting:{title:"Saludo del personaje",desc:"Introducción y conexión"},
   cinema:{title:"Escena de cine (portal)",desc:"Transición, efectos y profundidad"},
   place:{title:"Lugar especial",desc:"Naturaleza e inspiración"},
   home:{title:"Casa acogedora",desc:"Armonía y seguridad"},
   director:{title:"Director IA",desc:"Montaje y mejoras inteligentes"},
   quality:{title:"Calidad",desc:"Color, nitidez, sonido y estilo"}
  },
  addNames:{scenes:"Escenas",characters:"Personajes",cinema:"Escenas de cine",places:"Lugares",homes:"Casas",audio:"Frases de voz"}
 }
} as const;
type Props={
 locale:Locale;disabled:boolean;onGenerateFree:()=>void;
 onGoToMontage:(panel:Panel)=>void;onChooseCatalog:(kind:StoryAddonKind)=>void;
 children?:ReactNode;
};
export function MandalaProEnhance({locale,disabled,onGenerateFree,onGoToMontage,onChooseCatalog,children}:Props){
 const [selected,setSelected]=useState<CardId>("greeting");
 const [shortcut,setShortcut]=useState<string>("montage");
 const [showOptions,setShowOptions]=useState(false);
 const [advancedOpen,setAdvancedOpen]=useState(false);
 const [showUnavailable,setShowUnavailable]=useState(false);
 const t=copy[locale];
 const choose=(id:CardId)=>{setSelected(id);setShortcut(id);setShowOptions(true);setShowUnavailable(false);};
 const openFree=(kind:StoryAddonKind)=>{onChooseCatalog(kind);setAdvancedOpen(true);setShowUnavailable(false);};
 const openAdd=(id:(typeof additions)[number]["id"])=>{
   if(id==="audio"){onGoToMontage("audio");return;}
   const match=additions.find(item=>item.id===id);
   if(match&&match.kind!=="audio")openFree(match.kind as StoryAddonKind);
 };
 const chosen=cards.find(item=>item.id===selected)!;
 return <section className={styles.panel} data-video-pro-enhance data-workspace-section="pro"
    data-pro-selected-upgrade={selected} aria-labelledby="video-pro-upgrade-title">
   <nav className={styles.top} data-video-pro-shortcuts aria-label={t.title}>
    {top.map(item=>{
      const Icon=item.Icon;
      return <button type="button" key={item.id} disabled={disabled} data-pro-shortcut={item.id}
       aria-pressed={shortcut===item.id} onClick={()=>{
        if(item.id==="montage"){
          setShortcut("montage");setShowOptions(false);setShowUnavailable(false);
        }else choose(item.id);
       }}>
       <Icon size={21} aria-hidden="true"/><span>{t.top[item.id]}</span>
      </button>;
    })}
   </nav>
   <div className={styles.section}>
    <header className={styles.heading}>
      <span className={styles.headingIcon}><Sparkles size={23} aria-hidden="true"/></span>
      <span className={styles.headingText}><h3 id="video-pro-upgrade-title">{t.title}</h3><p>{t.desc}</p></span>
    </header>
    <div className={styles.grid} role="group" aria-label={t.title} data-video-pro-feature-grid>
      {cards.map(item=>{
        return <button type="button" key={item.id} disabled={disabled}
          className={styles.card} data-pro-upgrade-id={item.id}
          aria-pressed={selected===item.id} onClick={()=>choose(item.id)}>
          <span className={styles.poster} aria-hidden="true"><span
           style={{backgroundImage:'url("'+gallery+'")',backgroundPosition:item.pos}}/></span>
          <span className={styles.cardText}><strong>{t.cards[item.id].title}</strong>
             <small>{t.cards[item.id].desc}</small></span>
          <span className={styles.cardAction} aria-hidden="true">
            {selected===item.id?<Check size={16}/>:<Play size={14} fill="currentColor"/>}
          </span>
        </button>;
      })}
    </div>
    {showOptions?<div className={styles.options} role="region" data-video-pro-options
      aria-label={t.cards[selected].title}>
      <strong>{t.choose}: {t.cards[selected].title}</strong>
      <div className={styles.optionButtons}>
       <button type="button" disabled={disabled} data-video-pro-free-option
         onClick={()=>selected==="quality"?onGoToMontage("effects"):openFree(chosen.kind)}>
         <Leaf size={18} aria-hidden="true"/>{t.free}
       </button>
       <button type="button" disabled={disabled} data-video-pro-paid-option
         onClick={()=>setShowUnavailable(true)}><Sparkles size={18} aria-hidden="true"/>{t.paid}</button>
      </div>
      <small>{t.freeHint}</small>
    </div>:null}
    {showUnavailable?<p role="status" className={styles.notice} data-video-pro-unavailable>{t.pending}</p>:null}
   </div>
   <div className={styles.section} data-video-pro-add-panel>
     <h3 className={styles.addTitle}><Plus size={23} aria-hidden="true"/>{t.add}</h3>
     <div className={styles.addRail} role="group" aria-label={t.add}>
       {additions.map(item=>{
         const Icon=item.Icon;
         return <button type="button" key={item.id} data-pro-add-kind={item.id}
           disabled={disabled} onClick={()=>openAdd(item.id)}>
           <span className={styles.addPoster} aria-hidden="true"><span
             style={{backgroundImage:'url("'+gallery+'")',backgroundPosition:item.pos}}/>
             <Icon size={19}/></span>
           <strong>{t.addNames[item.id]}</strong>
         </button>;
       })}
     </div>
   </div>
   <button className={styles.continueButton} type="button" data-video-pro-to-montage
     disabled={disabled} onClick={()=>onGoToMontage("effects")}>
       <Clapperboard size={24} aria-hidden="true"/><span>{t.next}</span>
       <ArrowRight size={25} aria-hidden="true"/>
   </button>
   <details className={styles.advanced} data-video-pro-advanced-options open={advancedOpen}
      onToggle={event=>setAdvancedOpen(event.currentTarget.open)}>
      <summary><SlidersHorizontal size={16} aria-hidden="true"/>{t.more}</summary>
      <div className={styles.legacy}>{children}</div>
      <div className={styles.legacyActions} data-video-pro-actions>
       <button type="button" data-video-generate-pro disabled={disabled}
         onClick={()=>setShowUnavailable(true)}>{t.ai}</button>
       <button type="button" data-video-generate-without-ai disabled={disabled}
         onClick={onGenerateFree}>{t.noAi}</button>
      </div>
      {showUnavailable?<p className={styles.notice} role="status">{t.pending}</p>:null}
   </details>
 </section>;
}
