"use client";

/** Owner-approved 31 Oct mobile panel; one existing video renderer, no second editor. */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, CircleHelp, Gem, MapPinned, Plus, RotateCcw, Sparkles, UserRound, WandSparkles } from "lucide-react";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import type { StoryAddonKind, StoryLocale, StorySelection } from "@/lib/mandala/story-addon-catalog";
import { STORY_ADDONS, STORY_KIND_ORDER, findStoryAddon, storyDraftEstimate } from "@/lib/mandala/story-addon-catalog";
import {SAVED_STORY_CHARACTERS_KEY,parseSavedStoryCharacters,addSavedStoryCharacter,removeSavedStoryCharacter,serializeSavedStoryCharacters} from "@/lib/mandala/saved-story-characters.mjs";
import styles from "./mandala-stories-characters.module.css";

type Props={
  locale:StoryLocale;
  theme:VideoTheme;
  disabled:boolean;
  applied:StorySelection;
  onApply:(next:StorySelection)=>void;
  requestedKind?:StoryAddonKind;
};
const copy={
  ru:{
    heading:"Сюжеты и персонажи",
    subtitle:"Добавьте героев, места и историю к вашему видео",
    my:"Мой персонаж",
    tabs:["Персонажи","Сюжеты","Места","Символы","События"],
    headings:["Персонажи","Быстрые сюжеты","Места силы","Символы и объекты","События истории"],
    all:"Все варианты",free:"Бесплатно",soon:"Скоро",from:"от",xp:"XP",
    apply:"Применить к моему видео",blocked:"Для AI-опций требуется подключение",
    blockedHint:"Удалите помеченные «Скоро» опции, чтобы применить бесплатные сцены сейчас.",
    draft:"Предварительная стоимость",zero:"0 XP · без списаний",
    clear:"Очистить",savedTitle:"Мои персонажи",savedEmpty:"Пока нет сохранённых персонажей.",
    savedDevice:"Сохраняется только на этом устройстве. Фото и личные данные не сохраняются.",saveCharacter:"Сохранить персонажа",useCharacter:"Выбрать",removeCharacter:"Удалить",storageError:"Браузер не разрешил сохранить выбор.",
    current:"В этом видео",none:"Персонаж пока не выбран",close:"Скрыть",
    note:"Готовые лицензированные сцены бесплатны. Новые AI-персонажи и уникальные сцены пока только в каталоге; XP не списываются.",
    ready:"Доступно сейчас",selected:"Выбрано",concept:"Концепт · пока недоступен",
    applied:"Выбор применён к видеопроекту",noSelection:"Вы можете оставить ролик без дополнений.",
    recommend:"Подходит к вашей теме"
  },
  en:{
    heading:"Stories & characters",subtitle:"Add guides, places and a story to your video",
    my:"My character",tabs:["Characters","Stories","Places","Symbols","Events"],
    headings:["Characters","Quick stories","Places to explore","Symbols & objects","Story events"],
    all:"See all",free:"Free",soon:"Coming soon",from:"from",xp:"XP",
    apply:"Apply to my video",blocked:"AI options are not connected yet",
    blockedHint:"Remove Coming soon options to apply the free scenes now.",
    draft:"Estimated future price",zero:"0 XP · no charge",clear:"Clear",
    savedTitle:"My characters",savedEmpty:"No saved characters on this device yet.",
    savedDevice:"Stored on this device only. No personal photos or information are saved.",saveCharacter:"Save character",useCharacter:"Choose",removeCharacter:"Remove",storageError:"Your browser blocked saving this choice.",
    current:"In this video",none:"No character selected",close:"Hide",
    note:"Licensed ready-made scenes are free. New AI characters and custom scenes are previews only; no XP is charged.",
    ready:"Available now",selected:"Selected",concept:"Concept · not available yet",
    applied:"Selection applied to video project",noSelection:"You can keep your video without add-ons.",
    recommend:"Suggested for your theme"
  },
  es:{
    heading:"Historias y personajes",subtitle:"Añade guías, lugares e historias a tu vídeo",
    my:"Mi personaje",tabs:["Personajes","Historias","Lugares","Símbolos","Eventos"],
    headings:["Personajes","Historias rápidas","Lugares especiales","Símbolos y objetos","Eventos"],
    all:"Ver todos",free:"Gratis",soon:"Próximamente",from:"desde",xp:"XP",
    apply:"Aplicar a mi vídeo",blocked:"Las opciones de IA aún no están conectadas",
    blockedHint:"Elimina las opciones Próximamente para aplicar las escenas gratuitas.",
    draft:"Precio futuro estimado",zero:"0 XP · sin cargos",clear:"Borrar",
    savedTitle:"Mis personajes",savedEmpty:"Aún no hay personajes guardados en este dispositivo.",
    savedDevice:"Guardado solo en este dispositivo. No se guardan fotos ni datos personales.",saveCharacter:"Guardar personaje",useCharacter:"Elegir",removeCharacter:"Eliminar",storageError:"El navegador bloqueó el almacenamiento.",
    current:"En este vídeo",none:"Aún no hay personaje",close:"Ocultar",
    note:"Las escenas con licencia ya disponibles son gratuitas. Los personajes y escenas nuevas con IA aún son conceptos; no se cobra XP.",
    ready:"Disponible ahora",selected:"Elegido",concept:"Concepto · aún no disponible",
    applied:"Selección aplicada al vídeo",noSelection:"Puedes crear el vídeo sin complementos.",
    recommend:"Sugerido para tu tema"
  }
} as const;

const icons={character:UserRound,story:BookOpen,place:MapPinned,symbol:Gem,event:WandSparkles};
const recommended:Record<VideoTheme,readonly string[]>={
  energy:["C01","S01","L03"],
  health:["C01","S02","L01"],
  relationships:["C01","S02","L01"],
  money:["C01","S01","L03"],
  goals:["C01","S01","L03"],
  life:["C01","S02","L02"]
};
const CHARACTER_IDS=STORY_ADDONS.filter(item=>item.kind==="character").map(item=>item.id);

export function MandalaStoriesCharacters({locale,theme,disabled,applied,onApply,requestedKind}:Props){
  const t=copy[locale];
  const [draft,setDraft]=useState<StorySelection>({});
  const [active,setActive]=useState<StoryAddonKind>(requestedKind??"character");
  useEffect(()=>{if(requestedKind)setActive(requestedKind);},[requestedKind]);
  const [showAll,setShowAll]=useState<Partial<Record<StoryAddonKind,boolean>>>({});
  const [showMy,setShowMy]=useState(false);
  const [hasApplied,setHasApplied]=useState(false);
  const [savedCharacters,setSavedCharacters]=useState<string[]>([]);
  const [storageError,setStorageError]=useState(false);
  // Public catalogue IDs only. Never persist a private portrait, prompt, or paid capability.
  useEffect(()=>{
    try{
      setSavedCharacters(parseSavedStoryCharacters(
        window.localStorage.getItem(SAVED_STORY_CHARACTERS_KEY),CHARACTER_IDS));
    }catch{setStorageError(true);}
  },[]);
  const persistSavedCharacters=(ids:string[])=>{
    try{
      window.localStorage.setItem(SAVED_STORY_CHARACTERS_KEY,
        serializeSavedStoryCharacters(ids,CHARACTER_IDS));
      setSavedCharacters(ids);
      setStorageError(false);
    }catch{setStorageError(true);}
  };
  const quote=useMemo(()=>storyDraftEstimate(draft),[draft]);
  const hasPending=quote.unavailable.length>0;
  const selectedCount=quote.items.length;
  const suggested=recommended[theme];
  const arranged=(kind:StoryAddonKind)=>[...STORY_ADDONS.filter(item=>item.kind===kind)].sort(
    (a,b)=>Number(suggested.includes(b.id))-Number(suggested.includes(a.id))
  );
  const toggle=(kind:StoryAddonKind,id:string)=>{
    setHasApplied(false);
    setDraft(current=>({...current,[kind]:current[kind]===id?undefined:id}));
  };
  const renderRail=(kind:StoryAddonKind,compact=false)=>{
    const index=STORY_KIND_ORDER.indexOf(kind);
    const Icon=icons[kind];
    const entries=arranged(kind);
    const visible=compact&&!showAll[kind]?entries.slice(0,5):entries;
    return <section key={kind} className={styles.group} data-story-addon-group={kind} aria-label={t.headings[index]}>
      <div className={styles.groupHead}>
        <h4><Icon size={19} aria-hidden="true"/>{t.headings[index]}</h4>
        <button type="button" className={styles.more} onClick={()=>{setActive(kind);setShowAll(s=>({...s,[kind]:!s[kind]}));}}>
          {showAll[kind]?t.close:t.all}<ChevronRight size={16} aria-hidden="true"/>
        </button>
      </div>
      <div className={styles.rail} role="group" aria-label={t.headings[index]}>
        {visible.map(item=>{
          const chosen=draft[kind]===item.id;
          const isReady=item.capability==="local";
          return <button key={item.id} type="button" className={styles.card}
            data-story-addon-id={item.id} data-story-addon-capability={item.capability}
            aria-label={item.title[locale]+". "+(isReady?t.free:t.concept)}
            aria-pressed={chosen} disabled={disabled} onClick={()=>toggle(kind,item.id)}>
            <span className={styles.poster}>
              {/* First-party published art only; no uploaded photos or remote imagery. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.poster} alt="" loading="lazy"/>
              <span className={styles.glyph} aria-hidden="true">{item.marker}</span>
              {chosen?<span className={styles.chosen}><Check size={16} strokeWidth={3}/></span>:null}
            </span>
            <span className={styles.cardBody}>
              <span className={styles.itemTitle}>{item.title[locale]}</span>
              <span className={styles.cardBottom}>
                <span className={isReady?styles.free:styles.xp}>
                  {isReady?t.free:t.from+" "+item.estimatedXp+" "+t.xp}
                </span>
                <span className={styles.plus} aria-hidden="true">{chosen?<Check size={17}/>:<Plus size={17}/>}</span>
              </span>
              {!isReady?<span className={styles.planned}>{t.soon}</span>:null}
            </span>
          </button>;
        })}
      </div>
    </section>;
  };
  const currentCharacter=findStoryAddon(applied.character);
  const selectedCharacter=findStoryAddon(draft.character||applied.character);
  return <section id="video-stories-characters" className={styles.panel} data-video-stories-characters aria-labelledby="video-stories-characters-title">
    <div className={styles.header}>
      <div className={styles.headerText}>
        <h3 id="video-stories-characters-title">{t.heading}<CircleHelp size={18} aria-hidden="true"/></h3>
        <p>{t.subtitle}</p>
      </div>
      <button type="button" className={styles.myCharacter} onClick={()=>setShowMy(v=>!v)} aria-expanded={showMy}>
        <UserRound size={18} aria-hidden="true"/>{t.my}
      </button>
    </div>
    {showMy?<div className={styles.myPanel} data-story-my-character data-local-character-library>
      <strong>{t.savedTitle}</strong>
      <p>{currentCharacter?t.current+": "+currentCharacter.title[locale]:t.none}</p>
      <small>{t.savedDevice}</small>
      {selectedCharacter?.kind==="character"?<button type="button" className={styles.saveCharacter}
        disabled={disabled} data-character-library-save
        onClick={()=>persistSavedCharacters(addSavedStoryCharacter(
          savedCharacters,selectedCharacter.id,CHARACTER_IDS))}>
        <Plus size={15} aria-hidden="true"/>{t.saveCharacter}
      </button>:null}
      {savedCharacters.length?<ul className={styles.savedCharacterList} data-saved-character-list>
        {savedCharacters.map(id=>{
          const item=findStoryAddon(id);
          return item?.kind==="character"?<li key={id} data-saved-character-id={id}>
            <span className={styles.savedCharacterIcon} aria-hidden="true">{item.marker}</span>
            <span className={styles.savedCharacterName}>{item.title[locale]}
              {item.capability!=="local"?<small>{t.soon}</small>:null}</span>
            <span className={styles.savedCharacterActions}>
              <button type="button" disabled={disabled} onClick={()=>{
                setDraft(previous=>({...previous,character:id}));
                setHasApplied(false);setActive("character");setShowMy(false);
              }}>{t.useCharacter}</button>
              <button type="button" disabled={disabled} aria-label={t.removeCharacter+": "+item.title[locale]}
                onClick={()=>persistSavedCharacters(removeSavedStoryCharacter(
                  savedCharacters,id,CHARACTER_IDS))}>{t.removeCharacter}</button>
            </span>
          </li>:null;
        })}
      </ul>:<p className={styles.savedEmpty}>{t.savedEmpty}</p>}
      {storageError?<small role="status">{t.storageError}</small>:null}
    </div>:null}
    <div className={styles.tabs} role="group" aria-label={t.heading}>
      {STORY_KIND_ORDER.map((kind,index)=><button key={kind} type="button"
        aria-pressed={active===kind} data-story-addon-tab={kind}
        className={active===kind?styles.activeTab:styles.tab}
        onClick={()=>{setActive(kind);setShowAll(s=>({...s,[kind]:false}));}}>{t.tabs[index]}</button>)}
    </div>
    <p className={styles.recommend}><Sparkles size={15}/>{t.recommend}</p>
    <div className={styles.rails}>
      {active==="character"?<>
        {renderRail("character",true)}
        {renderRail("story",true)}
        {renderRail("place",true)}
      </>:renderRail(active,false)}
    </div>
    <p className={styles.honestNote} role="note">{t.note}</p>
    {selectedCount>0?<div className={styles.selectionSummary} data-story-addons-selected>
      <div><strong>{selectedCount} · {t.selected}</strong>
      <button type="button" onClick={()=>{setHasApplied(false);setDraft({});}} disabled={disabled}><RotateCcw size={14}/>{t.clear}</button></div>
      <ul>{quote.items.map(item=><li key={item.id}>{item.title[locale]}</li>)}</ul>
    </div>:<small className={styles.noSelection}>{t.noSelection}</small>}
    <div className={styles.bottom}>
      <div className={styles.total}>
        <span>{hasPending?t.draft:t.ready}</span>
        <strong>{hasPending?t.from+" "+quote.estimatedXp+" "+t.xp:t.zero}</strong>
      </div>
      {hasPending?<p className={styles.blockedHint} role="status">{t.blockedHint}</p>:null}
      <button type="button" data-video-story-addons-apply disabled={disabled||hasPending}
        onClick={()=>{onApply(draft);setHasApplied(true);}}>
        <Sparkles size={19} aria-hidden="true"/>
        <span>{hasPending?t.blocked:t.apply}</span>
        <ChevronRight size={20} aria-hidden="true"/>
      </button>
      {hasApplied&&!hasPending?<small className={styles.applied} role="status"><Check size={14}/>{t.applied}</small>:null}
    </div>
  </section>;
}
