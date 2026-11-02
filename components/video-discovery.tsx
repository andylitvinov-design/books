"use client";

import {Bookmark, Clapperboard, RotateCcw, Search, Sparkles} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {rankDiscoveryVideos, VIDEO_GOALS} from "@/lib/video-discovery/ranker.mjs";
import {VIDEO_LIFE_AREAS,VIDEO_CONTENT_TYPES,VIDEO_DIRECTIONS,VIDEO_TRADITIONS,lifeAreasForIntent} from "@/lib/video-discovery/taxonomy.mjs";
import {LibraryFeed, type LibraryFeedItem} from "@/components/library-feed";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./video-discovery.module.css";

type Order="for-you"|"series"|"newest";
const STORAGE_KEY="hh-public-video-favorites-v1";
const labels={
  ru:{
    title:"Видео для вашего развития",lead:"Выберите цель — мы подберём видео из проверенных публичных материалов, а не рекламной ленты.",
    myTubeTitle:"MyTube",myTubeLead:"Ваш видеоканал: медитации, практики и уроки. Выберите тему или настройте точный подбор.",
    search:"Поиск видео",searchPlaceholder:"Найти видео, практику или урок…",seriesTitle:"Серия или курс",allSeries:"Все серии",sourceTitle:"Источник",allSources:"Все источники",
    goals:["Для меня","Спокойствие","Энергия","Отношения","Работа","Смысл","Практики"],
    areas:["Бизнес и деньги","Отношения","Энергия и здоровье","Развитие и смыслы"],
    areaTitle:"Сфера жизни",focusTitle:"Что хотите развить?",all:"Любой вариант",advanced:"Дополнительные фильтры",
    contentTitle:"Тип видео",directionTitle:"Направление",traditionTitle:"Традиция",
    types:["Мягкая медитация","Практика-подкачка","Объяснение","Урок курса"],
    directions:["Магическое","Храмовое","Психологическое","Рейки / энергия","Телесное"],
    traditions:["Египетская","Греческая","Майя","Ацтекская","Северная","Славянская","Римская","Зороастрийская и восточная","Другая"],
    areaReset:"Все сферы",
    original:"Язык оригинала",allAudio:"Все языки",order:"Порядок",forYou:"Для меня",series:"По сериям",newest:"Новые",
    saved:"Сохранённое",save:"Сохранить",unsave:"Убрать",dismiss:"Не подходит",
    restore:"Вернуть скрытые",reset:"Очистить сохранённое",
    note:"Подбор учитывает выбранную тему и сохранённые видео. Результаты тестов не используются. Сохранённое хранится только в этом браузере.",
    result:"Подбор по теме",allResult:"Видеоподборка",empty:"Видео по выбранным фильтрам пока нет. Попробуйте другую цель.",
  },
  en:{
    title:"Videos for your growth",lead:"Choose a goal to discover reviewed public videos, not an advertising-driven feed.",
    myTubeTitle:"MyTube",myTubeLead:"Your video channel for meditations, practices and lessons. Explore a topic or fine-tune your discovery.",
    search:"Search videos",searchPlaceholder:"Find a video, practice or lesson…",seriesTitle:"Series or course",allSeries:"All series",sourceTitle:"Source",allSources:"All sources",
    goals:["For you","Calm","Energy","Relationships","Work","Meaning","Practices"],
    areas:["Business & Money","Relationships","Energy & Health","Personal Growth"],
    areaTitle:"Life area",focusTitle:"What would you like to develop?",all:"Any",advanced:"More filters",
    contentTitle:"Video type",directionTitle:"Approach",traditionTitle:"Tradition",
    types:["Soft meditation","Energy practice","Explanation","Course lesson"],
    directions:["Symbolic / magical","Temple practice","Psychological","Reiki / energy","Somatic"],
    traditions:["Egyptian","Greek","Maya","Aztec","Northern","Slavic","Roman","Zoroastrian & Eastern","Other"],
    areaReset:"All life areas",
    original:"Original audio",allAudio:"All languages",order:"Sort",forYou:"For you",series:"By series",newest:"Newest",
    saved:"Saved",save:"Save",unsave:"Unsave",dismiss:"Not for me",
    restore:"Restore hidden",reset:"Clear saved",
    note:"Recommendations use your topic and saved public videos, never test results. Saved IDs stay in this browser.",
    result:"Selected topic",allResult:"Video picks",empty:"No videos match these filters. Choose another goal.",
  },
  es:{
    title:"Vídeos para tu crecimiento",lead:"Elige un objetivo para descubrir vídeos públicos revisados, no una lista impulsada por anuncios.",
    myTubeTitle:"MyTube",myTubeLead:"Tu canal de meditaciones, prácticas y clases. Explora un tema o afina la búsqueda.",
    search:"Buscar vídeos",searchPlaceholder:"Buscar un vídeo, práctica o clase…",seriesTitle:"Serie o curso",allSeries:"Todas las series",sourceTitle:"Fuente",allSources:"Todas las fuentes",
    goals:["Para mí","Calma","Energía","Relaciones","Trabajo","Sentido","Prácticas"],
    areas:["Negocios y dinero","Relaciones","Energía y salud","Crecimiento personal"],
    areaTitle:"Área de vida",focusTitle:"¿Qué quieres desarrollar?",all:"Cualquiera",advanced:"Más filtros",
    contentTitle:"Tipo de vídeo",directionTitle:"Enfoque",traditionTitle:"Tradición",
    types:["Meditación suave","Práctica energética","Explicación","Lección de curso"],
    directions:["Simbólico / mágico","Práctica del templo","Psicológico","Reiki / energía","Somático"],
    traditions:["Egipcia","Griega","Maya","Azteca","Nórdica","Eslava","Romana","Zoroastriana y oriental","Otra"],
    areaReset:"Todas las áreas",
    original:"Audio original",allAudio:"Todos los idiomas",order:"Orden",forYou:"Para mí",series:"Por series",newest:"Recientes",
    saved:"Guardados",save:"Guardar",unsave:"Quitar",dismiss:"No me interesa",
    restore:"Restaurar ocultos",reset:"Borrar guardados",
    note:"Recomendamos por objetivo y vídeos guardados, nunca por resultados de pruebas. Los ID guardados permanecen en este navegador.",
    result:"Tema elegido",allResult:"Vídeos sugeridos",empty:"No hay vídeos con estos filtros. Prueba otro objetivo.",
  },
} as const;
const safeId=(x:unknown):x is string=>typeof x==="string"&&x.length>0&&x.length<=180;
export function VideoDiscovery({locale,videos,variant="library"}:{locale:PublicLocale;videos:LibraryFeedItem[];variant?:"library"|"mytube"}){
  const t=labels[locale];
  const myTube=variant==="mytube";
  const [area,setArea]=useState("all");
  const [goal,setGoal]=useState("all");
  const [query,setQuery]=useState("");
  const [series,setSeries]=useState("all");
  const [source,setSource]=useState("all");
  const [contentType,setContentType]=useState("all");
  const [direction,setDirection]=useState("all");
  const [tradition,setTradition]=useState("all");
  const [language,setLanguage]=useState("all");
  const [sort,setSort]=useState<Order>("for-you");
  const [savedOnly,setSavedOnly]=useState(false);
  const [savedIds,setSavedIds]=useState<string[]>([]);
  const [hiddenIds,setHiddenIds]=useState<string[]>([]);
  useEffect(()=>{
    try{
      const value:unknown=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||"[]");
      if(Array.isArray(value))setSavedIds(value.filter(safeId).slice(0,200));
    }catch{ /* Private mode may disallow storage; public catalog still works. */ }
  },[]);
  const save=(id:string)=>{
    if(!safeId(id))return;
    setSavedIds(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[...current.filter(x=>x!==id),id].slice(-200);
      try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}
      return next;
    });
  };
  const reset=()=>{
    setSavedIds([]);setSavedOnly(false);
    try{window.localStorage.removeItem(STORAGE_KEY);}catch{}
  };
  const dismiss=(id:string)=>{
    if(safeId(id))setHiddenIds(current=>[...current.filter(x=>x!==id),id].slice(-200));
  };
  const allowedGoals=VIDEO_GOALS.filter(id=>id==="all"||id==="practices"||
    area==="all"||lifeAreasForIntent(id).includes(area));
  const sourceChoices=useMemo(()=>[...new Set(videos.map(video=>video.sourceLabel||"Holistic House"))]
    .sort((a,b)=>a.localeCompare(b,locale)),[videos,locale]);
  const seriesChoices=useMemo(()=>{
    const unique=new Map<string,string>();
    for(const video of videos)if(video.seriesId&&!unique.has(video.seriesId))
      unique.set(video.seriesId,video.seriesTitle||video.seriesId);
    return [...unique].map(([id,title])=>({id,title}))
      .sort((a,b)=>a.title.localeCompare(b.title,locale));
  },[videos,locale]);
  const ordered=useMemo(()=>{
    const ranked=rankDiscoveryVideos(videos,{
      goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort,
    });
    if(!myTube)return ranked;
    const needle=query.trim().toLocaleLowerCase(locale);
    return ranked.filter(video=>{
      if(series!=="all"&&video.seriesId!==series)return false;
      if(source!=="all"&&(video.sourceLabel||"Holistic House")!==source)return false;
      return !needle||[video.title,video.description,video.seriesTitle||"",video.sourceLabel||""]
        .join(" ").toLocaleLowerCase(locale).includes(needle);
    });
  },[videos,goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort,myTube,query,series,source,locale]);
  const index=VIDEO_GOALS.indexOf(goal);
  return <div className={[styles.wrapper,myTube&&styles.myTube].filter(Boolean).join(" ")} data-hh-video-discovery={myTube?"mytube-v1":"v1"}>
    <section className={styles.panel} aria-label={t.title}>
      <div className={styles.intro}>
        {myTube?<h1><Clapperboard size={27} aria-hidden="true"/>{t.myTubeTitle}</h1>:
          <h2><Sparkles size={23} aria-hidden="true"/>{t.title}</h2>}
        <p>{myTube?t.myTubeLead:t.lead}</p>
      </div>
      {myTube&&<label className={styles.myTubeSearch}>
        <Search size={21} aria-hidden="true"/>
        <span className={styles.screenReaderOnly}>{t.search}</span>
        <input type="search" aria-label={t.search} value={query} maxLength={100}
          onChange={event=>setQuery(event.target.value)} placeholder={t.searchPlaceholder}/>
      </label>}
      <div className={styles.areaSection}>
        <div className={styles.groupHeading}>
          <strong>{t.areaTitle}</strong>
          {area!=="all"&&<button type="button" className={styles.areaReset}
            onClick={()=>{setArea("all");setGoal("all");}}>{t.areaReset}</button>}
        </div>
        <div className={styles.lifeAreas} role="group" aria-label={t.areaTitle}>
          {VIDEO_LIFE_AREAS.map((id,i)=><button type="button" key={id}
            data-video-life-area={id} aria-pressed={area===id}
            onClick={()=>{setArea(a=>a===id?"all":id);setGoal("all");}}>
            {t.areas[i]}
          </button>)}
        </div>
      </div>
      <div className={styles.areaSection}>
        <div className={styles.groupHeading}><strong>{t.focusTitle}</strong></div>
        <div className={styles.goals} role="group" aria-label={t.focusTitle}>
          {allowedGoals.map(id=><button type="button" key={id} aria-pressed={goal===id}
            onClick={()=>setGoal(id)}>{t.goals[VIDEO_GOALS.indexOf(id)]}</button>)}
        </div>
      </div>
      <div className={styles.controls}>
        <label>{t.original}
          <select value={language} onChange={event=>setLanguage(event.target.value)}>
            <option value="all">{t.allAudio}</option><option value="ru">Русский</option>
            <option value="en">English</option><option value="es">Español</option>
          </select>
        </label>
        <label>{t.order}
          <select value={sort} onChange={event=>setSort(event.target.value as Order)}>
            <option value="for-you">{t.forYou}</option>
            <option value="series">{t.series}</option>
            <option value="newest">{t.newest}</option>
          </select>
        </label>
        <button type="button" className={styles.saved} aria-pressed={savedOnly}
          onClick={()=>setSavedOnly(value=>!value)}>
          <Bookmark size={16} aria-hidden="true"/>{t.saved}{savedIds.length?" ("+savedIds.length+")":""}
        </button>
      </div>
      <details className={styles.advanced}>
        <summary>{myTube?t.advanced+" · "+t.contentTitle+", "+t.directionTitle+", "+t.seriesTitle:t.advanced}</summary>
        <div className={styles.advancedControls}>
          <label>{t.contentTitle}
            <select value={contentType} onChange={event=>setContentType(event.target.value)}>
              <option value="all">{t.all}</option>
              {VIDEO_CONTENT_TYPES.map((id,i)=><option key={id} value={id}>{t.types[i]}</option>)}
            </select>
          </label>
          <label>{t.directionTitle}
            <select value={direction} onChange={event=>{
              setDirection(event.target.value);setTradition("all");
            }}>
              <option value="all">{t.all}</option>
              {VIDEO_DIRECTIONS.map((id,i)=><option key={id} value={id}>{t.directions[i]}</option>)}
            </select>
          </label>
          {(direction==="temple"||direction==="magical")&&<label>{t.traditionTitle}
            <select value={tradition} onChange={event=>setTradition(event.target.value)}>
              <option value="all">{t.all}</option>
              {VIDEO_TRADITIONS.map((id,i)=><option key={id} value={id}>{t.traditions[i]}</option>)}
            </select>
          </label>}
          {myTube&&seriesChoices.length>0&&<label>{t.seriesTitle}
            <select value={series} onChange={event=>setSeries(event.target.value)}>
              <option value="all">{t.allSeries}</option>
              {seriesChoices.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>}
          {myTube&&sourceChoices.length>0&&<label>{t.sourceTitle}
            <select value={source} onChange={event=>setSource(event.target.value)}>
              <option value="all">{t.allSources}</option>
              {sourceChoices.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>}
        </div>
      </details>
      {(hiddenIds.length>0||savedIds.length>0)&&<div className={styles.reset}>
        {hiddenIds.length>0&&<button type="button" onClick={()=>setHiddenIds([])}>
          <RotateCcw size={15} aria-hidden="true"/>{t.restore} ({hiddenIds.length})
        </button>}
        {savedIds.length>0&&<button type="button" onClick={reset}>{t.reset}</button>}
      </div>}
      <p className={styles.note}>{t.note}</p>
    </section>
    <div className={styles.results} aria-live="polite">
      <span>{area!=="all"?t.areas[VIDEO_LIFE_AREAS.indexOf(area)]:index>0?t.result+": "+t.goals[index]:t.allResult}</span><span>{ordered.length}</span>
    </div>
    {ordered.length===0?<p className={styles.empty}>{t.empty}</p>:
      <LibraryFeed locale={locale} items={ordered} videosOnly preserveOrder youtubeLayout={myTube}
        savedVideoIds={savedIds} onToggleSaved={save} onDismissVideo={dismiss}
        saveText={t.save} unsaveText={t.unsave} dismissText={t.dismiss}/>}
  </div>;
}
