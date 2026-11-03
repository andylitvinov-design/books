"use client";

import {Bookmark, RotateCcw, Search, Sparkles} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {rankDiscoveryVideos, VIDEO_GOALS} from "@/lib/video-discovery/ranker.mjs";
import {VIDEO_LIFE_AREAS,VIDEO_CONTENT_TYPES,VIDEO_DIRECTIONS,VIDEO_TRADITIONS,lifeAreasForIntent} from "@/lib/video-discovery/taxonomy.mjs";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {LibraryFeed, type LibraryFeedItem} from "@/components/library-feed";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./video-discovery.module.css";

type Order="for-you"|"series"|"newest";
const STORAGE_KEY="hh-public-video-favorites-v1";
const MYTUBE_CATEGORY_LEGACY_TAGS={
  "goals-money":["work","meaning"],
  "love-relationships":["relationships"],
  "energy-confidence":["energy","meaning"],
  "stress-recovery":["stress"],
} as const;
const MYTUBE_SUBCATEGORY_LEGACY_TAGS={
  "goals-discipline":["meaning","work"],"purpose-choice":["meaning"],
  "money-mindset":["work"],"business-career":["work"],
  "finding-love":["relationships"],"couple-relationships":["relationships"],
  "loneliness-breakups":["relationships"],"intimacy-family":["relationships"],
  "body-wellbeing":["energy"],"energy-fatigue":["energy"],"life-energy":["energy"],
  "confidence-worth":["meaning"],"sleep-rest":["stress"],
  "stress-burnout":["stress"],"anxiety-fears":["stress"],
  "trauma-childhood":["stress"],"depression-apathy":["stress"],
} as const;

const labels={
  ru:{
    title:"Видео для вашего развития",lead:"Выберите цель — мы подберём видео из проверенных публичных материалов, а не рекламной ленты.",
    goals:["Для меня","Спокойствие","Энергия","Отношения","Работа","Смысл","Практики"],
    areas:["Бизнес и деньги","Отношения","Энергия и здоровье","Развитие и смыслы"],
    areaTitle:"Сфера жизни",focusTitle:"Что хотите развить?",all:"Любой вариант",advanced:"Дополнительные фильтры",
    categoryTitle:"Выберите направление",subcategoryTitle:"Что именно вас интересует?",topicTitle:"Выберите тему",allCategories:"Все направления",allSubcategories:"Все подкатегории",allTopics:"Все темы",
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
    areaTitle:"Life area",focusTitle:"What would you like to develop?",all:"Any",advanced:"More filters",
    categoryTitle:"Choose a direction",subcategoryTitle:"What are you looking for?",topicTitle:"Choose a topic",allCategories:"All directions",allSubcategories:"All subcategories",allTopics:"All topics",
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
    areaTitle:"Área de vida",focusTitle:"¿Qué quieres desarrollar?",all:"Cualquiera",advanced:"Más filtros",
    categoryTitle:"Elige una dirección",subcategoryTitle:"¿Qué estás buscando?",topicTitle:"Elige un tema",allCategories:"Todas las direcciones",allSubcategories:"Todas las subcategorías",allTopics:"Todos los temas",
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
  const [myTubeCategory,setMyTubeCategory]=useState("all");
  const [myTubeSubcategory,setMyTubeSubcategory]=useState("all");
  const [myTubeTopic,setMyTubeTopic]=useState("all");
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
  const myTubeCategories=variant==="mytube"?listMyTubeCategories(locale):[];
  const myTubeSubcategories=variant==="mytube"&&myTubeCategory!=="all"
    ?listMyTubeSubcategories(myTubeCategory,locale):[];
  const myTubeTopics=variant==="mytube"&&myTubeCategory!=="all"&&myTubeSubcategory!=="all"
    ?listMyTubeTopics(myTubeCategory,myTubeSubcategory,locale):[];
  const myTubeScope=useMemo(()=>{
    if(variant!=="mytube"||myTubeCategory==="all")return [];
    if(myTubeTopic!=="all")return myTubeTopics.filter(item=>item.id===myTubeTopic);
    if(myTubeSubcategory!=="all")return myTubeTopics;
    return myTubeSubcategories.flatMap(sub=>listMyTubeTopics(myTubeCategory,sub.id,locale));
  },[variant,myTubeCategory,myTubeSubcategory,myTubeTopic,myTubeTopics,myTubeSubcategories,locale]);
  const myTubeLegacyTags=myTubeTopic!=="all"
    ?(MYTUBE_SUBCATEGORY_LEGACY_TAGS[myTubeSubcategory as keyof typeof MYTUBE_SUBCATEGORY_LEGACY_TAGS]||[])
    :myTubeSubcategory!=="all"
      ?(MYTUBE_SUBCATEGORY_LEGACY_TAGS[myTubeSubcategory as keyof typeof MYTUBE_SUBCATEGORY_LEGACY_TAGS]||[])
      :myTubeCategory!=="all"
        ?(MYTUBE_CATEGORY_LEGACY_TAGS[myTubeCategory as keyof typeof MYTUBE_CATEGORY_LEGACY_TAGS]||[]):[];
  const selectedTopic=myTubeTopics.find(item=>item.id===myTubeTopic);
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
      const searchable=[item.title,item.description,item.sourceLabel||"",item.author||"",item.seriesTitle||"",...(item.topicTags||[])].join(" ").toLocaleLowerCase(locale);
      if(needle && !searchable.includes(needle))return false;
      if(variant==="mytube"&&myTubeScope.length){
        const tags=Array.isArray(item.topicTags)?item.topicTags:[];
        const matches=myTubeScope.some(topic=>topic.searchTerms.some(term=>searchable.includes(term.toLocaleLowerCase(locale)))||searchable.includes(topic.id.toLocaleLowerCase(locale)))||
          myTubeLegacyTags.some(tag=>tags.includes(tag));
        if(!matches)return false;
      }
      if(source!=="all" && (item.sourceLabel||item.author||"")!==source)return false;
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
  },[videos,search,source,period,durationRange,locale,variant,myTubeScope,myTubeLegacyTags]);
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
      {variant==="mytube"?<>
        <div className={styles.areaSection}>
          <div className={styles.groupHeading}>
            <strong>{t.categoryTitle}</strong>
            {myTubeCategory!=="all"&&<button type="button" className={styles.areaReset}
              onClick={()=>{setMyTubeCategory("all");setMyTubeSubcategory("all");setMyTubeTopic("all");}}>{t.allCategories}</button>}
          </div>
          <div className={styles.lifeAreas} role="group" aria-label={t.categoryTitle} data-mytube-categories>
            {myTubeCategories.map(item=><button type="button" key={item.id}
              data-mytube-category={item.id} aria-pressed={myTubeCategory===item.id}
              onClick={()=>{setMyTubeCategory(current=>current===item.id?"all":item.id);setMyTubeSubcategory("all");setMyTubeTopic("all");setArea("all");setGoal("all");}}>
              {item.label}
            </button>)}
          </div>
        </div>
        {myTubeCategory!=="all"&&<div className={styles.areaSection}>
          <div className={styles.groupHeading}>
            <strong>{t.subcategoryTitle}</strong>
            <button type="button" className={styles.areaReset}
              onClick={()=>{setMyTubeSubcategory("all");setMyTubeTopic("all");}}>{t.allSubcategories}</button>
          </div>
          <div className={styles.goals} role="group" aria-label={t.subcategoryTitle} data-mytube-subcategories>
            {myTubeSubcategories.map(item=><button type="button" key={item.id}
              data-mytube-subcategory={item.id} aria-pressed={myTubeSubcategory===item.id}
              onClick={()=>{setMyTubeSubcategory(current=>current===item.id?"all":item.id);setMyTubeTopic("all");}}>
              {item.label}
            </button>)}
          </div>
        </div>}
        {myTubeSubcategory!=="all"&&<div className={styles.areaSection}>
          <div className={styles.groupHeading}>
            <strong>{t.topicTitle}</strong>
            <button type="button" className={styles.areaReset}
              onClick={()=>setMyTubeTopic("all")}>{t.allTopics}</button>
          </div>
          <div className={styles.goals} role="group" aria-label={t.topicTitle} data-mytube-topics>
            {myTubeTopics.map(item=><button type="button" key={item.id}
              data-mytube-topic={item.id} aria-pressed={myTubeTopic===item.id}
              onClick={()=>setMyTubeTopic(current=>current===item.id?"all":item.id)}>
              {item.label}
            </button>)}
          </div>
        </div>}
      </>:<>
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
      </>}
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
        onClick={()=>{setArea("all");setGoal("all");setMyTubeCategory("all");setMyTubeSubcategory("all");setMyTubeTopic("all");setContentType("all");setDirection("all");
          setTradition("all");setLanguage("all");setSource("all");setPeriod("all");
          setDurationRange("all");setSearch("");setSort("for-you");setSavedOnly(false);}}>
        <RotateCcw size={15} aria-hidden="true"/>{t.resetFilters}
      </button>}
      <p className={styles.note}>{t.note}</p>
    </section>
    <div className={styles.results} aria-live="polite">
      <span>{variant==="mytube"?(myTubeTopic!=="all"?myTubeTopics.find(x=>x.id===myTubeTopic)?.label:myTubeSubcategory!=="all"?myTubeSubcategories.find(x=>x.id===myTubeSubcategory)?.label:myTubeCategory!=="all"?myTubeCategories.find(x=>x.id===myTubeCategory)?.label:t.allResult):area!=="all"?t.areas[VIDEO_LIFE_AREAS.indexOf(area)]:index>0?t.result+": "+t.goals[index]:t.allResult}</span><span>{ordered.length}</span>
    </div>
    {ordered.length===0?<p className={styles.empty}>{t.empty}</p>:
      <LibraryFeed locale={locale} items={ordered} videosOnly preserveOrder
        videoLayout={variant==="mytube"?"mytube":"default"}
        savedVideoIds={savedIds} onToggleSaved={save} onDismissVideo={dismiss}
        saveText={t.save} unsaveText={t.unsave} dismissText={t.dismiss}/>}
  </div>;
}
