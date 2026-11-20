"use client";

import {useMemo,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {
  OPENMOTION_REFERENCE_COLLECTIONS,OPENMOTION_REFERENCE_COUNT,OPENMOTION_GUIDE_COUNT,
  listOpenMotionReferences,planOpenMotionReferenceSelection,
  type OpenMotionLocalSelection,
} from "@/lib/mandala/openmotion-reference.mjs";
import css from "./mandala-openmotion-picker.module.css";

type Props={
  locale:PublicLocale;
  disabled:boolean;
  onPick:(selection:OpenMotionLocalSelection)=>void;
};

const words={
  en:{
    title:"OpenMotion ideas",intro:"Explore external video references, then make your own original film using Holistic House's free scenes and editor.",
    caution:"These are video references, not licensed footage or guaranteed editable templates. Local results adapt the rhythm and format, not the original brand visuals.",
    search:"Find a video style",searchHint:"Search title, movement or creator",
    choose:"Make my version",watch:"Watch reference",none:"No matching references",all:"All",
    groups:{reference:"Reference",moment:"Short moments",example:"Examples",block:"Blocks",component:"Components"},
    previous:"Previous",next:"Next",of:"of",guide:"Motion.md guides",guideLink:"Browse guides at OpenMotion",
    external:"External video — original rights holder",source:"Original source",count:"public reference entries",approx:"Local adaptation",
  },
  ru:{
    title:"Идеи OpenMotion",intro:"Посмотрите внешние видеореференсы и создайте собственный ролик из наших бесплатных сцен в редакторе Holistic House.",
    caution:"Это примеры движения, а не лицензированные исходники и не обязательно редактируемые проекты. Локальное видео повторяет общий ритм и формат, а не чужой бренд.",
    search:"Найти стиль видео",searchHint:"Название, анимация или автор",
    choose:"Создать свою версию",watch:"Смотреть пример",none:"Ничего не найдено",all:"Все",
    groups:{reference:"Референсы",moment:"Короткие моменты",example:"Примеры",block:"Блоки",component:"Компоненты"},
    previous:"Назад",next:"Дальше",of:"из",guide:"Гайды Motion.md",guideLink:"Смотреть гайды OpenMotion",
    external:"Внешнее видео — права у автора",source:"Источник",count:"видеореференсов",approx:"Локальная адаптация",
  },
  es:{
    title:"Ideas OpenMotion",intro:"Explora vídeos externos y crea tu propia película con escenas originales en el editor gratuito de Holistic House.",
    caution:"Son referencias, no material con licencia para reutilizar ni proyectos editables garantizados. La versión local adapta el ritmo y el formato, no la marca.",
    search:"Buscar estilo de vídeo",searchHint:"Título, movimiento o creador",
    choose:"Crear mi versión",watch:"Ver referencia",none:"Sin resultados",all:"Todos",
    groups:{reference:"Referencias",moment:"Momentos",example:"Ejemplos",block:"Bloques",component:"Componentes"},
    previous:"Anterior",next:"Siguiente",of:"de",guide:"Guías Motion.md",guideLink:"Ver guías OpenMotion",
    external:"Vídeo externo — derechos de autor",source:"Origen",count:"referencias",approx:"Adaptación local",
  },
} as const;

export function MandalaOpenMotionPicker({locale,disabled,onPick}:Props){
  const t=words[locale];
  const [query,setQuery]=useState("");
  const [collection,setCollection]=useState("all");
  const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const perPage=12;
  const {items,total}=useMemo(
    ()=>listOpenMotionReferences({query,collection,offset:page*perPage,limit:perPage}),
    [query,collection,page],
  );
  const pages=Math.max(1,Math.ceil(total/perPage));
  return <section className={css.library} data-openmotion-library-loaded aria-label={t.title}>
    <div className={css.intro}>
      <h4>{t.title}</h4>
      <p>{t.intro}</p>
      <small>{OPENMOTION_REFERENCE_COUNT} {t.count} · {OPENMOTION_GUIDE_COUNT} {t.guide}</small>
    </div>
    <label className={css.searchLabel} htmlFor="openmotion-library-search">{t.search}</label>
    <input id="openmotion-library-search" className={css.search} type="search" value={query}
      placeholder={t.searchHint} maxLength={100}
      onChange={event=>{setQuery(event.currentTarget.value);setPage(0);}}/>
    <div className={css.filters} role="group" aria-label={t.search}>
      {OPENMOTION_REFERENCE_COLLECTIONS.map(group=>
        <button key={group} type="button" aria-pressed={collection===group}
          onClick={()=>{setCollection(group);setPage(0);}} disabled={disabled}
          className={collection===group?css.active:""}>
          {group==="all"?t.all:t.groups[group as keyof typeof t.groups]}
        </button>)}
    </div>
    <p className={css.notice}>{t.caution}</p>
    {items.length?<div className={css.grid} role="list">
      {items.map(item=>{
        const choice=planOpenMotionReferenceSelection(item.id,locale);
        return <article key={item.id} role="listitem" className={css.card} data-motion-reference={item.id}>
          <strong>{item.title}</strong>
          <div className={css.meta}>
            <span>{item.seconds>0?item.seconds+"s · ":""}{item.ratio||"16/9"}</span>
            {item.source?<span>{item.source}</span>:null}
          </div>
          {item.description?<p className={css.description}>{item.description}</p>:null}
          {item.mechanics.length?<p className={css.mechanics}>{item.mechanics.slice(0,3).map(x=>x.replaceAll("_"," ")).join(" · ")}</p>:null}
          <div className={css.actions}>
            {item.preview?<a href={item.preview} target="_blank" rel="noopener noreferrer"
              referrerPolicy="no-referrer" aria-label={t.watch+": "+item.title}
              title={t.external}>{t.watch}</a>:null}
            <button type="button" disabled={disabled||!choice}
              aria-pressed={selected===item.id}
              onClick={()=>{if(choice){setSelected(item.id);onPick(choice);}}}>
              {t.choose}
            </button>
          </div>
        </article>;
      })}
    </div>:<p role="status" className={css.notice}>{t.none}</p>}
    <div className={css.paging}>
      <button type="button" disabled={page===0}
        onClick={()=>setPage(i=>Math.max(0,i-1))}>{t.previous}</button>
      <span aria-live="polite">{total?Math.min(page+1,pages):0} {t.of} {total?pages:0}</span>
      <button type="button" disabled={page+1>=pages}
        onClick={()=>setPage(i=>Math.min(pages-1,i+1))}>{t.next}</button>
    </div>
    <p className={css.footer}>{t.guide}: <a target="_blank" rel="noopener noreferrer"
      href="https://github.com/nexu-io/openmotion/tree/main/library/templates/catalog">
      {t.guideLink}</a> · {t.approx}</p>
  </section>;
}
