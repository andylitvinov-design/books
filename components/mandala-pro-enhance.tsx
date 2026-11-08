"use client";
import {useState} from "react";
import type {ReactNode} from "react";
import {ArrowRight,AudioLines,Check,Clapperboard,Film,House,Leaf,Mountain,SlidersHorizontal,Sparkles,UsersRound,WandSparkles,X} from "lucide-react";
import {STORY_ADDONS} from "@/lib/mandala/story-addon-catalog";
import type {StoryAddonKind} from "@/lib/mandala/story-addon-catalog";
import styles from "./mandala-pro-enhance.module.css";

type Locale="en"|"ru"|"es";
type Panel="effects"|"audio";
const gallery="/images/holistic-house/pro-enhance-gallery.webp";
const tabs=[
  {id:"montage",Icon:Film,pos:"0% 0%"},
  {id:"greeting",Icon:UsersRound,pos:"50% 0%"},
  {id:"cinema",Icon:Clapperboard,pos:"100% 0%"},
  {id:"place",Icon:Mountain,pos:"0% 0%"},
  {id:"home",Icon:House,pos:"0% 100%"},
  {id:"quality",Icon:SlidersHorizontal,pos:"50% 100%"}
] as const;
type TabId=(typeof tabs)[number]["id"];
// Curated examples from the EXISTING verified catalog. Items marked "planned"
// are illustrative only: only the original catalog can actually apply a scene.
const examples={
  greeting:["C01","C02","C03"],
  cinema:["S02","S04","S05"],
  place:["L01","L02","L03"],
  home:["L05","L01","L11"]
} as const;
const copy={
 ru:{
  title:"PRO-монтаж и улучшение",next:"К монтажу",generate:"Создать видео",
  generateHelp:"Сгенерировать видео без ИИ-эффектов",free:"Бесплатные",paid:"PRO-варианты",
  pending:"Платные AI-эффекты пока недоступны. Списаний и рендера не было.",
  showCatalog:"Выбрать из каталога",closeCatalog:"Свернуть каталог",available:"Доступно",soon:"Скоро",
  montageIntro:"Меняйте сцены, переходы и звуковые дорожки в существующем редакторе.",
  qualityIntro:"Настройте изображение и звук в существующем редакторе.",
  editScenes:"Сцены и монтаж",editSound:"Звук и музыка",director:"AI-режиссёр",
  enhance:"AI-улучшения",details:"Выберите нужный вариант",
  top:{montage:"Монтаж",greeting:"Персонаж",cinema:"Киносцена",place:"Место силы",home:"Дом",quality:"Качество"},
  cards:{
   greeting:{title:"Приветствие персонажа",desc:"Выберите образ для вашего ролика"},
   cinema:{title:"Киносцена (портал)",desc:"Переходы, история и атмосфера"},
   place:{title:"Место силы",desc:"Природа, энергия и вдохновение"},
   home:{title:"Дом (уютное пространство)",desc:"Тепло, гармония и безопасность"}
  }
 },
 en:{
  title:"PRO montage & enhancement",next:"Montage",generate:"Generate video",
  generateHelp:"Generate video without AI effects",free:"Free options",paid:"PRO options",
  pending:"Paid AI effects are not connected yet. No payment or render was initiated.",
  showCatalog:"Choose from catalog",closeCatalog:"Close catalog",available:"Available",soon:"Coming soon",
  montageIntro:"Edit scenes, transitions and audio tracks in the existing editor.",
  qualityIntro:"Adjust picture and sound in the existing editor.",
  editScenes:"Scenes & montage",editSound:"Sound & music",director:"AI Director",
  enhance:"AI enhancement",details:"Choose an option",
  top:{montage:"Montage",greeting:"Character",cinema:"Film scene",place:"Power place",home:"Home",quality:"Quality"},
  cards:{
   greeting:{title:"Character greeting",desc:"Choose a character for your film"},
   cinema:{title:"Cinema scene (portal)",desc:"Transitions, story and atmosphere"},
   place:{title:"Place of power",desc:"Nature and inspiration"},
   home:{title:"Home (cozy space)",desc:"Warmth, harmony and safety"}
  }
 },
 es:{
  title:"Montaje y mejoras PRO",next:"Montaje",generate:"Generar vídeo",
  generateHelp:"Generar vídeo sin efectos de IA",free:"Opciones gratis",paid:"Opciones PRO",
  pending:"Los efectos de IA de pago no están conectados. Sin cobro ni render.",
  showCatalog:"Elegir del catálogo",closeCatalog:"Cerrar catálogo",available:"Disponible",soon:"Próximamente",
  montageIntro:"Edita escenas, transiciones y audio en el editor actual.",
  qualityIntro:"Ajusta la imagen y el sonido en el editor actual.",
  editScenes:"Escenas y montaje",editSound:"Sonido y música",director:"Director IA",
  enhance:"Mejoras IA",details:"Elige una opción",
  top:{montage:"Montaje",greeting:"Personaje",cinema:"Escena",place:"Lugar",home:"Casa",quality:"Calidad"},
  cards:{
   greeting:{title:"Saludo del personaje",desc:"Elige un personaje para tu vídeo"},
   cinema:{title:"Escena de cine (portal)",desc:"Transiciones e historia"},
   place:{title:"Lugar especial",desc:"Naturaleza e inspiración"},
   home:{title:"Casa acogedora",desc:"Armonía y seguridad"}
  }
 }
} as const;
type Props={
 locale:Locale;disabled:boolean;onGenerateFree:()=>void;
 onGoToMontage:(panel:Panel)=>void;onChooseCatalog:(kind:StoryAddonKind)=>void;
 children?:ReactNode;
};
export function MandalaProEnhance({locale,disabled,onGenerateFree,onGoToMontage,onChooseCatalog,children}:Props){
 const [selected,setSelected]=useState<TabId>("greeting");
 const [catalogOpen,setCatalogOpen]=useState(false);
 const [showUnavailable,setShowUnavailable]=useState(false);
 const t=copy[locale];
 const activeTab=tabs.find(item=>item.id===selected)!;
 const kind:StoryAddonKind=selected==="greeting"?"character":selected==="cinema"?"story":"place";
 const hasGallery=selected==="greeting"||selected==="cinema"||selected==="place"||selected==="home";
 const previewIds:readonly string[]=selected==="greeting"?examples.greeting:
  selected==="cinema"?examples.cinema:
  selected==="place"?examples.place:
  selected==="home"?examples.home:[];
 const previews=previewIds.flatMap(id=>{const item=STORY_ADDONS.find(entry=>entry.id===id);return item?[item]:[];});
 const heading=selected==="montage"?t.top.montage:
  selected==="quality"?t.top.quality:t.cards[selected].title;
 const intro=selected==="montage"?t.montageIntro:
  selected==="quality"?t.qualityIntro:t.cards[selected].desc;
 const chooseTab=(id:TabId)=>{
   setSelected(id);setCatalogOpen(false);setShowUnavailable(false);
 };
 const openCatalog=()=>{
   onChooseCatalog(kind);
   setCatalogOpen(true);
   setShowUnavailable(false);
 };
 return <section className={styles.panel} data-video-pro-enhance data-workspace-section="pro"
   data-pro-selected-upgrade={selected} aria-label={t.title}>
  <nav className={styles.top} data-video-pro-shortcuts aria-label={t.title}>
   {tabs.map(item=>{
     const Icon=item.Icon;
     return <button type="button" key={item.id} data-pro-shortcut={item.id}
       disabled={disabled} aria-pressed={selected===item.id}
       onClick={()=>chooseTab(item.id)}>
       <Icon size={19} aria-hidden="true"/><span>{t.top[item.id]}</span>
     </button>;
   })}
  </nav>
  <div className={styles.section} data-video-pro-dynamic-panel role="region" aria-label={heading}>
   <header className={styles.heading}>
    <span className={styles.headingArtwork} aria-hidden="true"><span
      style={{backgroundImage:'url("'+gallery+'")',backgroundPosition:activeTab.pos}}/></span>
    <span className={styles.headingText}><h3>{heading}</h3><p>{intro}</p></span>
   </header>
   {hasGallery?<div className={styles.gallery} data-video-pro-feature-grid
     role="group" aria-label={t.details}>
     {previews.map(item=><button type="button" key={item.id} disabled={disabled}
        data-pro-catalog-preview={item.id} data-pro-catalog-capability={item.capability}
        onClick={()=>item.capability==="local"?openCatalog():setShowUnavailable(true)}>
       <span className={styles.poster} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.poster} alt="" loading="lazy"/>
       </span>
       <strong>{item.title[locale]}</strong>
       <small className={item.capability==="local"?styles.free:styles.planned}>
         {item.capability==="local"?t.available:t.soon}
       </small>
       {item.capability==="local"?<ArrowRight size={14} aria-hidden="true"/>:null}
     </button>)}
   </div>:<div className={styles.tools} data-video-pro-edit-actions>
     <button type="button" disabled={disabled} onClick={()=>onGoToMontage("effects")}>
      <Clapperboard size={21} aria-hidden="true"/><span>{t.editScenes}</span><ArrowRight size={17} aria-hidden="true"/>
     </button>
     <button type="button" disabled={disabled} onClick={()=>onGoToMontage("audio")}>
      <AudioLines size={21} aria-hidden="true"/><span>{t.editSound}</span><ArrowRight size={17} aria-hidden="true"/>
     </button>
     <button type="button" disabled={disabled} onClick={()=>setShowUnavailable(true)}>
      <WandSparkles size={21} aria-hidden="true"/><span>{selected==="montage"?t.director:t.enhance}</span>
      <small>{t.soon}</small>
     </button>
   </div>}
   {hasGallery?<div className={styles.optionButtons}>
    <button type="button" disabled={disabled} data-video-pro-free-option
      aria-expanded={catalogOpen} onClick={()=>catalogOpen?setCatalogOpen(false):openCatalog()}>
      <Leaf size={17} aria-hidden="true"/>{catalogOpen?t.closeCatalog:t.showCatalog}
    </button>
    <button type="button" disabled={disabled} data-video-pro-paid-option
      onClick={()=>setShowUnavailable(true)}>
      <Sparkles size={17} aria-hidden="true"/>{t.paid}
    </button>
   </div>:null}
   {catalogOpen&&hasGallery?<div className={styles.catalogScroll}
      data-video-pro-advanced-options data-video-pro-catalog-open>
     <button className={styles.closeCatalog} type="button" onClick={()=>setCatalogOpen(false)}>
       <X size={17} aria-hidden="true"/>{t.closeCatalog}
     </button>
     <div className={styles.legacy}>{children}</div>
   </div>:null}
   {showUnavailable?<p role="status" className={styles.notice} data-video-pro-unavailable>{t.pending}</p>:null}
  </div>
  <div className={styles.actions} data-video-pro-actions>
   <button type="button" className={styles.montageButton} disabled={disabled}
     data-video-pro-to-montage onClick={()=>onGoToMontage("effects")}>
     <Clapperboard size={18} aria-hidden="true"/><span>{t.next}</span>
   </button>
   <button type="button" className={styles.continueButton} disabled={disabled}
     data-video-generate-without-ai aria-label={t.generateHelp} onClick={onGenerateFree}>
     <Film size={19} aria-hidden="true"/><span>{t.generate}</span><ArrowRight size={19} aria-hidden="true"/>
   </button>
  </div>
 </section>;
}