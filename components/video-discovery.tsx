"use client";

import {Bookmark, RotateCcw, Search, Sparkles} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {rankDiscoveryVideos, VIDEO_GOALS} from "@/lib/video-discovery/ranker.mjs";
import {VIDEO_LIFE_AREAS,VIDEO_CONTENT_TYPES,VIDEO_DIRECTIONS,VIDEO_TRADITIONS,lifeAreasForIntent} from "@/lib/video-discovery/taxonomy.mjs";
import {LibraryFeed, type LibraryFeedItem} from "@/components/library-feed";
import type {PublicLocale} from "@/lib/public-locales";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import styles from "./video-discovery.module.css";

type Order="for-you"|"series"|"newest";
const STORAGE_KEY="hh-public-video-favorites-v1";
const labels={
  ru:{
    title:"Видео для вашего развития",lead:"Выберите цель — мы подберём видео из проверенных публичных материалов, а не рекламной ленты.",
    goals:["Для меня","Спокойствие","Энергия","Отношения","Работа","Смысл","Практики"],
    areas:["Бизнес и деньги","Отношения","Энергия и здоровье","Развитие и смыслы"],
    areaTitle:"Сфера жизни",focusTitle:"Что хотите развить?",all:"Любой вариант",advanced:"Дополнительные фильтры",mytubeCategoryTitle:"Выберите направление",mytubeSubcategoryTitle:"Уточните потребность",mytubeTopicTitle:"Выберите конкретную тему",mytubeAny:"Все направления",mytubeAllSubcategories:"Все подкатегории",mytubeAllTopics:"Все темы",
    searchLabel:"Поиск видео",searchPlaceholder:"Поиск по названию, теме или автору…",
    sourceTitle:"Автор / источник",sourceAll:"Все источники",
    periodTitle:"Дата публикации",periodOptions:["За год","2020-е","2010-е","2000-е"],
    durationTitle:"Длительность",durationOptions:["До 4 минут","4–20 минут","20–60 минут","Больше часа"],resetFilters:"Сбросить фильтры",
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
    goals:["For you","Calm","Energy","Relationships","Work","Meaning","Practices"],
    areas:["Business & Money","Relationships","Energy & Health","Personal Growth"],
    areaTitle:"Life area",focusTitle:"What would you like to develop?",all:"Any",advanced:"More filters",mytubeCategoryTitle:"Choose a direction",mytubeSubcategoryTitle:"Choose a need",mytubeTopicTitle:"Choose a specific topic",mytubeAny:"All directions",mytubeAllSubcategories:"All subcategories",mytubeAllTopics:"All topics",
    searchLabel:"Search videos",searchPlaceholder:"Search by title, topic or creator…",
    sourceTitle:"Creator / source",sourceAll:"All sources",
    periodTitle:"Upload date",periodOptions:["Past year","2020s","2010s","2000s"],
    durationTitle:"Duration",durationOptions:["Under 4 minutes","4–20 minutes","20–60 minutes","Over 1 hour"],resetFilters:"Reset filters",
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
    goals:["Para mí","Calma","Energía","Relaciones","Trabajo","Sentido","Prácticas"],
    areas:["Negocios y dinero","Relaciones","Energía y salud","Crecimiento personal"],
    areaTitle:"Área de vida",focusTitle:"¿Qué quieres desarrollar?",all:"Cualquiera",advanced:"Más filtros",mytubeCategoryTitle:"Elige un área",mytubeSubcategoryTitle:"Elige una necesidad",mytubeTopicTitle:"Elige un tema concreto",mytubeAny:"Todas las áreas",mytubeAllSubcategories:"Todas las subcategorías",mytubeAllTopics:"Todos los temas",
    searchLabel:"Buscar vídeos",searchPlaceholder:"Buscar por título, tema o autor…",
    sourceTitle:"Autor / fuente",sourceAll:"Todas las fuentes",
    periodTitle:"Fecha de publicación",periodOptions:["Último año","Década de 2020","Década de 2010","Década de 2000"],
    durationTitle:"Duración",durationOptions:["Menos de 4 minutos","4–20 minutos","20–60 minutos","Más de 1 hora"],resetFilters:"Restablecer filtros",
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
  const [area,setArea]=useState("all");
  const [goal,setGoal]=useState("all");
  const [contentType,setContentType]=useState("all");
  const [direction,setDirection]=useState("all");
  const [tradition,setTradition]=useState("all");
  const [language,setLanguage]=useState("all");
  const [sort,setSort]=useState<Order>("for-you");
  const [savedOnly,setSavedOnly]=useState(false);
  const [savedIds,setSavedIds]=useState<string[]>([]);
  const [hiddenIds,setHiddenIds]=useState<string[]>([]);
  const [search,setSearch]=useState("");
  const [source,setSource]=useState("all");
  const [period,setPeriod]=useState("all");
  const [durationRange,setDurationRange]=useState("all");
  const [mytubeCategoryId,setMyTubeCategoryId]=useState("all");
  const [mytubeSubcategoryId,setMyTubeSubcategoryId]=useState("all");
  const [mytubeTopicId,setMyTubeTopicId]=useState("all");
  const mytubeCategories=listMyTubeCategories(locale);
  const mytubeSubcategories=mytubeCategoryId==="all"?[]:listMyTubeSubcategories(mytubeCategoryId,locale);
  const mytubeTopics=mytubeCategoryId==="all"||mytubeSubcategoryId==="all"?[]:listMyTubeTopics(mytubeCategoryId,mytubeSubcategoryId,locale);
  const activeMyTubeSubcategory=mytubeCategoryId!=="all"&&mytubeSubcategoryId!=="all"?mytubeSubcategories.find(item=>item.id===mytubeSubcategoryId):null;
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
  const sources=useMemo(()=>[...new Set(videos
    .map(item=>item.sourceLabel||item.author||"").filter(Boolean))].sort((a,b)=>a.localeCompare(b,locale)),
    [videos,locale]);
  const durationsAvailable=videos.some(item=>Number.isFinite(item.durationVerifiedSeconds) &&
    (item.durationVerifiedSeconds??0)>0);
  const periodsAvailable=videos.some(item=>Boolean(item.publishedAt));
  const sourceVideos=useMemo(()=>{
    const needle=search.trim().toLocaleLowerCase(locale);
    const cutoff=Date.now()-365*24*60*60*1000;
    return videos.filter(item=>{
      if(needle && ![item.title,item.description,item.sourceLabel||"",item.author||"",item.seriesTitle||""]
          .join(" ").toLocaleLowerCase(locale).includes(needle))return false;
      if(source!=="all" && (item.sourceLabel||item.author||"")!==source)return false;

      if(mytubeCategoryId!=="all"||mytubeSubcategoryId!=="all"||mytubeTopicId!=="all"){
        const taxonomyItem=item as LibraryFeedItem & {mytubeCategoryIds?:string[];mytubeSubcategoryIds?:string[];mytubeTopicIds?:string[]};
        const tags=Array.isArray(item.topicTags)?item.topicTags:[];
        const text=[item.title,item.description||"",item.seriesTitle||""].join(" ").toLocaleLowerCase(locale);
        const categoryTags:Record<string,string[]> = {
          "goals-money":["business","money","goals","meaning","work","personal_growth"],
          "love-relationships":["relationships","love","connection","family"],
          "energy-confidence":["energy","health","body","meaning","recovery","confidence"],
          "stress-anxiety":["stress","health","emotions","recovery","anxiety","trauma"],
        };
        const subcategoryTags:Record<string,string[]> = {
          "purpose-development":["meaning","goals","life","personal_growth"],
          "goal-achievement":["goals","work","meaning"],
          "money-abundance":["money","business"],
          "business-career":["business","work"],
          "loneliness-breakups":["relationships","love","connection"],
          "finding-love":["relationships","love"],
          "couple-relationships":["relationships","love","connection"],
          "intimacy-family":["relationships","love","family","connection"],
          "stress-fatigue":["energy","health","recovery","body"],
          "body-health":["health","body","energy"],
          "vital-energy":["energy","recovery"],
          "confidence-calm":["confidence","meaning","goals","relationships"],
          "stress-burnout":["stress","emotions","recovery","health"],
          "anxiety-fears":["stress","emotions","health"],
          "psychological-trauma":["emotions","relationships","meaning","health"],
          "depression-apathy":["emotions","recovery","health"],
        };
        if(mytubeCategoryId!=="all"){
          const explicit=Array.isArray(taxonomyItem.mytubeCategoryIds)?taxonomyItem.mytubeCategoryIds:[];
          const allowed=categoryTags[mytubeCategoryId]||[];
          if(!explicit.includes(mytubeCategoryId)&&!tags.some(tag=>allowed.includes(tag)))return false;
        }
        if(mytubeSubcategoryId!=="all"){
          const explicit=Array.isArray(taxonomyItem.mytubeSubcategoryIds)?taxonomyItem.mytubeSubcategoryIds:[];
          const allowed=subcategoryTags[mytubeSubcategoryId]||[];
          if(!explicit.includes(mytubeSubcategoryId)&&!tags.some(tag=>allowed.includes(tag)))return false;
        }
        if(mytubeTopicId!=="all"){
          const explicit=Array.isArray(taxonomyItem.mytubeTopicIds)?taxonomyItem.mytubeTopicIds:[];
          const found=getMyTubeTopic(mytubeTopicId);
          const terms=found?[found.topic.label[locale],...found.topic.searchIntent[locale]]:[];
          const legacyTags=found?.topic.legacyTags||[];
          const tagMatch=tags.some(tag=>legacyTags.includes(tag));
          if(!explicit.includes(mytubeTopicId)&&!tagMatch&&!terms.some(term=>text.includes(term.toLocaleLowerCase(locale))))return false;
        }
      }

      if(period!=="all"){
        const date=item.publishedAt?Date.parse(item.publishedAt):NaN;
        if(!Number.isFinite(date))return false;
        const year=new Date(date).getUTCFullYear();
        if(period==="past-year" && date<cutoff)return false;
        if(period==="2020s" && (year<2020||year>=2030))return false;
        if(period==="2010s" && (year<2010||year>=2020))return false;
        if(period==="2000s" && (year<2000||year>=2010))return false;
      }
      if(durationRange!=="all"){
        const seconds=item.durationVerifiedSeconds;
        if(!Number.isFinite(seconds)||!seconds||seconds<=0)return false;
        if(durationRange==="under4" && seconds>=240)return false;
        if(durationRange==="4to20" && (seconds<240||seconds>1200))return false;
        if(durationRange==="20to60" && (seconds<=1200||seconds>3600))return false;
        if(durationRange==="over60" && seconds<=3600)return false;
      }
      return true;
    });
  },[videos,search,source,period,durationRange,locale,mytubeCategoryId,mytubeSubcategoryId,mytubeTopicId]);
  const ordered=useMemo(()=>rankDiscoveryVideos(sourceVideos,{
    goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort,
  }),[sourceVideos,goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort]);
  const index=VIDEO_GOALS.indexOf(goal);
  return <div className={[styles.wrapper,variant==="mytube"&&styles.mytube].filter(Boolean).join(" ")} data-hh-video-discovery="v1" data-discovery-variant={variant}>
    {variant==="mytube" && <label className={styles.topSearch}>
      <Search size={21} aria-hidden="true"/>
      <span className={styles.visuallyHidden}>{t.searchLabel}</span>
      <input type="search" data-mytube-search maxLength={120} value={search}
        placeholder={t.searchPlaceholder} onChange={event=>setSearch(event.target.value)}/>
      {search && <button type="button" onClick={()=>setSearch("")} aria-label={t.resetFilters}>×</button>}
    </label>}
    <section className={styles.panel} aria-label={t.title}>
      <div className={styles.intro}>
        <h2><Sparkles size={23} aria-hidden="true"/>{t.title}</h2>
        <p>{t.lead}</p>
      </div>
      <div className={styles.areaSection} data-mytube-taxonomy="v2">
        <div className={styles.groupHeading}><strong>{t.mytubeCategoryTitle}</strong></div>
        <div className={styles.lifeAreas} data-mytube-categories role="group" aria-label={t.mytubeCategoryTitle}>
          <button type="button" data-mytube-category="all" aria-pressed={mytubeCategoryId==="all"}
            onClick={()=>{setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");setMyTubeTopicId("all");}}>{t.mytubeAny}</button>
          {mytubeCategories.map(item=><button type="button" key={item.id} data-mytube-category={item.id}
            aria-pressed={mytubeCategoryId===item.id}
            onClick={()=>{setMyTubeCategoryId(item.id);setMyTubeSubcategoryId("all");setMyTubeTopicId("all");}}>{item.label}</button>)}
        </div>
        {mytubeCategoryId!=="all"?<>
          <div className={styles.groupHeading}><strong>{t.mytubeSubcategoryTitle}</strong></div>
          <div className={styles.goals} data-mytube-subcategories role="group" aria-label={t.mytubeSubcategoryTitle}>
            <button type="button" data-mytube-subcategory="all" aria-pressed={mytubeSubcategoryId==="all"}
              onClick={()=>{setMyTubeSubcategoryId("all");setMyTubeTopicId("all");}}>{t.mytubeAllSubcategories}</button>
            {mytubeSubcategories.map(item=><button type="button" key={item.id} data-mytube-subcategory={item.id}
              aria-pressed={mytubeSubcategoryId===item.id} title={item.chooseWhen}
              onClick={()=>{setMyTubeSubcategoryId(item.id);setMyTubeTopicId("all");}}>{item.label}</button>)}
          </div>
          {activeMyTubeSubcategory?<p className={styles.note} data-mytube-choice-hint>{activeMyTubeSubcategory.chooseWhen}</p>:null}
        </>:null}
        {mytubeSubcategoryId!=="all"?<>
          <div className={styles.groupHeading}><strong>{t.mytubeTopicTitle}</strong></div>
          <div className={styles.goals} data-mytube-topics role="group" aria-label={t.mytubeTopicTitle}>
            <button type="button" data-mytube-topic="all" aria-pressed={mytubeTopicId==="all"}
              onClick={()=>setMyTubeTopicId("all")}>{t.mytubeAllTopics}</button>
            {mytubeTopics.map(item=><button type="button" key={item.id} data-mytube-topic={item.id}
              aria-pressed={mytubeTopicId===item.id} onClick={()=>setMyTubeTopicId(item.id)}>{item.label}</button>)}
          </div>
        </>:null}
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
        <summary>{t.advanced}</summary>
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
          {variant==="mytube" && sources.length>0 && <label>{t.sourceTitle}
            <select data-mytube-source value={source} onChange={event=>setSource(event.target.value)}>
              <option value="all">{t.sourceAll}</option>
              {sources.map(value=><option key={value} value={value}>{value}</option>)}
            </select>
          </label>}
          {variant==="mytube" && periodsAvailable && <label>{t.periodTitle}
            <select data-mytube-period value={period} onChange={event=>setPeriod(event.target.value)}>
              <option value="all">{t.all}</option>
              {["past-year","2020s","2010s","2000s"].map((id,i)=>
                <option key={id} value={id}>{t.periodOptions[i]}</option>)}
            </select>
          </label>}
          {variant==="mytube" && durationsAvailable && <label>{t.durationTitle}
            <select data-mytube-duration value={durationRange} onChange={event=>setDurationRange(event.target.value)}>
              <option value="all">{t.all}</option>
              {["under4","4to20","20to60","over60"].map((id,i)=>
                <option key={id} value={id}>{t.durationOptions[i]}</option>)}
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
      {variant==="mytube" && <button type="button" className={styles.clearFilters}
        onClick={()=>{setArea("all");setGoal("all");setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setContentType("all");setDirection("all");
          setTradition("all");setLanguage("all");setSource("all");setPeriod("all");
          setDurationRange("all");setSearch("");setSort("for-you");setSavedOnly(false);}}>
        <RotateCcw size={15} aria-hidden="true"/>{t.resetFilters}
      </button>}
      <p className={styles.note}>{t.note}</p>
    </section>
    <div className={styles.results} aria-live="polite">
      <span>{area!=="all"?t.areas[VIDEO_LIFE_AREAS.indexOf(area)]:index>0?t.result+": "+t.goals[index]:t.allResult}</span><span>{ordered.length}</span>
    </div>
    {ordered.length===0?<p className={styles.empty} data-mytube-empty={variant==="mytube"?"true":undefined}>{t.empty}</p>:
      <LibraryFeed locale={locale} items={ordered} videosOnly preserveOrder
        videoLayout={variant==="mytube"?"mytube":"default"}
        savedVideoIds={savedIds} onToggleSaved={save} onDismissVideo={dismiss}
        saveText={t.save} unsaveText={t.unsave} dismissText={t.dismiss}/>}
  </div>;
}
