"use client";

import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,Play,Sparkles,X} from 'lucide-react';
import type {PublicLocale} from '@/lib/public-locales';
import {FREE_GREETING_CATALOG,FREE_GREETING_CATEGORIES,
  recommendGreeting,resolveGreetingCharacter} from '@/lib/mandala/free-greeting-catalog.mjs';
import {paintFreeGreeting} from '@/lib/mandala/free-greeting-overlay.mjs';
import type {FreeGreetingCategory,FreeGreetingCharacter,RenderableGreetingCharacter,GreetingGesture} from '@/lib/mandala/free-greeting-catalog.mjs';
import styles from './mandala-free-greeting.module.css';

type Filter = FreeGreetingCategory|'recommended'|'all';
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
  ru:{title:'Приветствие персонажа',hint:'Ваш герой появится внутри выбранного пейзажа в последние 3,5 секунды.',
    free:'Бесплатно · 0 дополнительных XP',none:'Без персонажа',auto:'Автоподбор',preview:'Посмотреть финал',
    previewWith:'Сейчас появится:',chosen:'Выбран:',categories:{recommended:'Подходят к сцене',all:'Все 30',fantasy:'Сказочные',animals:'Животные',people:'Люди',spiritual:'Мягкие',festive:'Праздничные'},
    gestures:{wave:'Машет',sparkle:'Создаёт искры',flap:'Машет крыльями',nod:'Кивает',bow:'Кланяется',dance:'Танцует',namaste:'Приветствует',heart:'Посылает сердечко'},
    privacy:'Без загрузки ваших данных и без платного AI.',choose:'Выбрать',close:'Закрыть'},
  en:{title:'Character greeting',hint:'Your character appears inside the selected scenery during the last 3.5 seconds.',
    free:'Free · 0 extra XP',none:'No character',auto:'Auto match',preview:'Preview ending',
    previewWith:'You will see:',chosen:'Selected:',categories:{recommended:'Matched to scenery',all:'All 30',fantasy:'Fantasy',animals:'Animals',people:'People',spiritual:'Gentle',festive:'Festive'},
    gestures:{wave:'Waves',sparkle:'Makes sparkles',flap:'Flaps wings',nod:'Nods',bow:'Bows',dance:'Dances',namaste:'Greets gently',heart:'Sends a heart'},
    privacy:'No personal-data upload or paid AI required.',choose:'Choose',close:'Close'},
  es:{title:'Saludo de personaje',hint:'Tu personaje aparece dentro del paisaje elegido durante los últimos 3,5 segundos.',
    free:'Gratis · 0 XP adicionales',none:'Sin personaje',auto:'Elegir automáticamente',preview:'Ver el final',
    previewWith:'Aparecerá:',chosen:'Elegido:',categories:{recommended:'Para el paisaje',all:'Los 30',fantasy:'Fantasía',animals:'Animales',people:'Personas',spiritual:'Suaves',festive:'Festivos'},
    gestures:{wave:'Saluda',sparkle:'Crea chispas',flap:'Bate las alas',nod:'Asiente',bow:'Hace una reverencia',dance:'Baila',namaste:'Saluda suavemente',heart:'Envía un corazón'},
    privacy:'Sin subir datos personales ni usar IA de pago.',choose:'Elegir',close:'Cerrar'},
} as const;
const quickIds = ['fairy','fox','cat','light-guide','dolphin','traveler'] as const;
// One painted frame from the actual Canvas renderer, not a remote stock icon.
// Only the visible category rail has mounted thumbnails at a time.
function CharacterThumbnail({id,sceneKey,theme}:{id:RenderableGreetingCharacter;sceneKey:string;theme:string}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=ref.current?.getContext('2d');if(!ctx)return;
    const grad=ctx.createLinearGradient(0,0,0,124);
    grad.addColorStop(0,'#b9d7e4');grad.addColorStop(.57,'#e4e2c3');grad.addColorStop(1,'#86a881');
    ctx.fillStyle=grad;ctx.fillRect(0,0,220,124);
    ctx.fillStyle='#83a77e';ctx.fillRect(0,108,220,16);
    paintFreeGreeting(ctx,28.25,30,id,'landscape',sceneKey,theme);
  },[id,sceneKey,theme]);
  return <canvas ref={ref} width={220} height={124} className={styles.thumbnail} aria-hidden="true"/>;
}

export function MandalaFreeGreeting({locale,selected,disabled,sceneKey,theme,onSelect,onPreview}:Props){
  const t=copy[locale];
  const [filter,setFilter]=useState<Filter>('recommended');
  const dialogRef=useRef<HTMLDialogElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(disabled&&dialogRef.current?.open)dialogRef.current.close();
  },[disabled]);
  const openDialog=()=>{if(!dialogRef.current?.open)dialogRef.current?.showModal();};
  const closeDialog=()=>dialogRef.current?.close();
  const recommendedId=recommendGreeting(sceneKey,theme);
  const effective=resolveGreetingCharacter(selected,sceneKey,theme);
  const effectiveEntry=FREE_GREETING_CATALOG.find(x=>x.id===effective);
  const entries=useMemo(()=>{
    if(filter==='all')return [...FREE_GREETING_CATALOG];
    if(filter!=='recommended')return FREE_GREETING_CATALOG.filter(x=>x.category===filter);
    const ids=[recommendedId,...quickIds];
    return [...new Set(ids)].map(id=>FREE_GREETING_CATALOG.find(x=>x.id===id))
      .filter((item):item is typeof FREE_GREETING_CATALOG[number]=>Boolean(item)).slice(0,6);
  },[filter,recommendedId]);
  return <section className={styles.root} data-video-free-greeting data-greeting-character={selected}
    data-greeting-resolved={effective} aria-label={t.title}>
    <div className={styles.launch}>
      <div className={styles.launchCopy}>
        <strong><Sparkles size={17} aria-hidden="true"/>{t.title}<small>{t.free}</small></strong>
        <span aria-live="polite">{selected==='none'?t.none:
          selected==='auto'?t.auto+' · '+effectiveEntry?.title[locale]:
            effectiveEntry?.emoji+' '+effectiveEntry?.title[locale]}</span>
      </div>
      <button ref={triggerRef} type="button" className={styles.openButton}
        data-greeting-open aria-haspopup="dialog" disabled={disabled}
        onClick={openDialog}>{t.choose}<ChevronDown size={15} aria-hidden="true"/></button>
    </div>
    <dialog ref={dialogRef} className={styles.dialog} onClose={()=>triggerRef.current?.focus({preventScroll:true})}
      data-greeting-modal aria-label={t.title}>
      <div className={styles.modalContent}>
        <div className={styles.head}>
          <div className={styles.title}><Sparkles aria-hidden="true" size={19}/><strong>{t.title}</strong></div>
          <button type="button" data-greeting-close onClick={closeDialog}
            aria-label={t.close} className={styles.closeButton}><X size={19} aria-hidden="true"/></button>
        </div>
        <span className={styles.free}>{t.free}</span>
        <p className={styles.hint}>{t.hint}</p>
        <div className={styles.primaryChoices} role="group" aria-label={t.title}>
          <button type="button" data-greeting-option="none" aria-pressed={selected==='none'}
            className={selected==='none'?styles.selectedSpecial:styles.special}
            disabled={disabled} onClick={()=>{onSelect('none');closeDialog();}}>
            {selected==='none'?<Check size={15}/>:null}{t.none}</button>
          <button type="button" data-greeting-option="auto" aria-pressed={selected==='auto'}
            className={selected==='auto'?styles.selectedSpecial:styles.special}
            disabled={disabled} onClick={()=>onSelect('auto')}>
            <span aria-hidden="true">✨</span>{t.auto} · {FREE_GREETING_CATALOG.find(x=>x.id===recommendedId)?.title[locale]}
          </button>
        </div>
        <div className={styles.filters} role="group" aria-label={t.title}>
          {(['recommended',...FREE_GREETING_CATEGORIES,'all'] as Filter[]).map(category=><button
            type="button" key={category} data-greeting-filter={category}
            className={filter===category?styles.activeFilter:styles.filter}
            aria-pressed={filter===category} disabled={disabled}
            onClick={()=>setFilter(category)}>{t.categories[category]}{category==='all'?<ChevronDown size={13}/>:null}</button>)}
        </div>
        <div className={styles.choices} data-greeting-choices={filter} role="group" aria-label={t.categories[filter]}>
          {entries.map(entry=><button type="button" key={entry.id} data-greeting-option={entry.id}
            className={selected===entry.id?styles.chosen:styles.choice}
            aria-pressed={selected===entry.id} disabled={disabled} onClick={()=>onSelect(entry.id)}>
            <span className={styles.avatar} aria-hidden="true"><CharacterThumbnail id={entry.id} sceneKey={sceneKey} theme={theme}/></span>
            <span className={styles.cardCopy}><strong>{entry.title[locale]}</strong>
              <small>{t.gestures[entry.gesture as GreetingGesture]}</small></span>
            {selected===entry.id?<Check className={styles.tick} size={15} aria-hidden="true"/>:null}
          </button>)}
        </div>
        {effectiveEntry?<div className={styles.bottom}>
          <div className={styles.selectedSummary} aria-live="polite">
            <strong>{t.chosen} {effectiveEntry.emoji} {effectiveEntry.title[locale]}</strong>
            <small>{t.gestures[effectiveEntry.gesture]}</small>
          </div>
          <button type="button" className={styles.preview} data-greeting-preview
            disabled={disabled} onClick={()=>{closeDialog();onPreview();}}>
            <Play size={16} aria-hidden="true"/>{t.preview}</button>
        </div>:null}
        <small className={styles.privacy}>{t.privacy}</small>
      </div>
    </dialog>
  </section>;
}
