"use client";

import {Bookmark, RotateCcw, Search, SlidersHorizontal, Sparkles} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {rankDiscoveryVideos, VIDEO_GOALS} from "@/lib/video-discovery/ranker.mjs";
import {VIDEO_LIFE_AREAS,VIDEO_CONTENT_TYPES,VIDEO_DIRECTIONS,VIDEO_TRADITIONS,lifeAreasForIntent} from "@/lib/video-discovery/taxonomy.mjs";
import {LibraryFeed, type LibraryFeedItem} from "@/components/library-feed";
import type {PublicLocale} from "@/lib/public-locales";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,listMyTubeScenarios,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeScenarioMotifs,listMyTubeStyles,videoMatchesMyTubeVisualFilter} from "@/lib/mandala/mytube-creative-choices.mjs";
import {matchesMyTubeShelf,myTubeCourseInfo,listMyTubeCourseTypes,listMyTubeCourseTraditions,listMyTubeCourseSeries,sortMyTubeCourseLessons} from "@/lib/video-discovery/mytube-shelves.mjs";
import styles from "./video-discovery.module.css";

type Order="for-you"|"series"|"newest";
type MyTubeFormat="practices"|"courses"|"masters";
const STORAGE_KEY="hh-public-video-favorites-v1";
const labels={
  ru:{
    title:"Видео для вашего развития",lead:"Выберите цель — мы подберём видео из проверенных публичных материалов, а не рекламной ленты.",
    goals:["Для меня","Спокойствие","Энергия","Отношения","Работа","Смысл","Практики"],
    areas:["Бизнес и деньги","Отношения","Энергия и здоровье","Развитие и смыслы"],
    areaTitle:"Сфера жизни",focusTitle:"Что хотите развить?",all:"Любой вариант",advanced:"Дополнительные фильтры",refine:"Фильтры",collapse:"Скрыть фильтры",mytubeCategoryTitle:"Выберите направление",mytubeSubcategoryTitle:"Уточните потребность",mytubeTopicTitle:"Выберите конкретную тему",mytubeScenarioTitle:"Подходящий сценарий (предварительно)",mytubeAllScenarios:"Все сценарии",mytubeAny:"Все направления",mytubeAllSubcategories:"Все подкатегории",mytubeAllTopics:"Все темы",mytubeCategoryShort:"Категория",mytubeTopicShort:"Тема",mytubeCourses:"Курсы",mytubePractices:"Практики",mytubeMasters:"Мастера",courseTypeLabel:"Тип курса",courseTraditionLabel:"Традиция",courseSeriesLabel:"Выберите курс",courseSelectType:"Выберите тип курса, чтобы открыть уроки.",courseSelectTradition:"Выберите традицию, чтобы открыть курсы.",courseNone:"Нет опубликованных курсов по выбранному направлению.",practiceNone:"Пока нет проверенных практик медитации длительностью до 10 минут.",masterNone:"Пока нет опубликованных видеопрезентаций мастеров.",courseTypes:{temple:"Храмовые традиции",reiki:"Рейки и энергия",psychology:"Психология",somatic:"Телесные практики",other:"Другие курсы"},courseTraditions:{greek:"Греческая традиция",egyptian:"Египетская традиция",maya:"Традиция майя",other:"Другие традиции"},
    searchLabel:"Поиск видео",searchPlaceholder:"Поиск по названию, теме или автору…",
    sourceTitle:"Автор / источник",sourceAll:"Все источники",
    periodTitle:"Дата публикации",periodOptions:["За год","2020-е","2010-е","2000-е"],
    durationTitle:"Длительность",durationOptions:["До 4 минут","До 10 минут","4–20 минут","20–60 минут","Больше часа"],resetFilters:"Сбросить фильтры",durationAll:"Все",formatTitle:"Формат видео",shortFormat:"Краткие",studyFormat:"Обучение",shortsHint:"Короткие введения и анонсы",studyHint:"Уроки, занятия и практики",
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
    areaTitle:"Life area",focusTitle:"What would you like to develop?",all:"Any",advanced:"More filters",refine:"Filters",collapse:"Hide filters",mytubeCategoryTitle:"Choose a direction",mytubeSubcategoryTitle:"Choose a need",mytubeTopicTitle:"Choose a specific topic",mytubeScenarioTitle:"Suggested story approach (provisional)",mytubeAllScenarios:"All scenarios",mytubeAny:"All directions",mytubeAllSubcategories:"All subcategories",mytubeAllTopics:"All topics",mytubeCategoryShort:"Category",mytubeTopicShort:"Topic",mytubeCourses:"Courses",mytubePractices:"Practices",mytubeMasters:"Masters",courseTypeLabel:"Course type",courseTraditionLabel:"Tradition",courseSeriesLabel:"Choose a course",courseSelectType:"Choose a course type to see the lessons.",courseSelectTradition:"Choose a tradition to open its courses.",courseNone:"No published courses in this selection.",practiceNone:"No approved meditation practices under 10 minutes are available yet.",masterNone:"No published master introductions are available yet.",courseTypes:{temple:"Temple traditions",reiki:"Reiki & energy",psychology:"Psychology",somatic:"Body practices",other:"Other courses"},courseTraditions:{greek:"Greek tradition",egyptian:"Egyptian tradition",maya:"Maya tradition",other:"Other traditions"},
    searchLabel:"Search videos",searchPlaceholder:"Search by title, topic or creator…",
    sourceTitle:"Creator / source",sourceAll:"All sources",
    periodTitle:"Upload date",periodOptions:["Past year","2020s","2010s","2000s"],
    durationTitle:"Duration",durationOptions:["Under 4 minutes","Up to 10 minutes","4–20 minutes","20–60 minutes","Over 1 hour"],resetFilters:"Reset filters",durationAll:"All",formatTitle:"Video format",shortFormat:"Shorts",studyFormat:"Study",shortsHint:"Brief introductions and previews",studyHint:"Lessons, learning and guided practices",
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
    areaTitle:"Área de vida",focusTitle:"¿Qué quieres desarrollar?",all:"Cualquiera",advanced:"Más filtros",refine:"Filtros",collapse:"Ocultar filtros",mytubeCategoryTitle:"Elige un área",mytubeSubcategoryTitle:"Elige una necesidad",mytubeTopicTitle:"Elige un tema concreto",mytubeScenarioTitle:"Enfoque narrativo sugerido (provisional)",mytubeAllScenarios:"Todos los guiones",mytubeAny:"Todas las áreas",mytubeAllSubcategories:"Todas las subcategorías",mytubeAllTopics:"Todos los temas",mytubeCategoryShort:"Categoría",mytubeTopicShort:"Tema",mytubeCourses:"Cursos",mytubePractices:"Prácticas",mytubeMasters:"Maestros",courseTypeLabel:"Tipo de curso",courseTraditionLabel:"Tradición",courseSeriesLabel:"Elige un curso",courseSelectType:"Elige un tipo de curso para ver las lecciones.",courseSelectTradition:"Elige una tradición para ver los cursos.",courseNone:"No hay cursos publicados para esta selección.",practiceNone:"Todavía no hay meditaciones aprobadas de hasta 10 minutos.",masterNone:"Todavía no hay presentaciones publicadas de maestros.",courseTypes:{temple:"Tradiciones del templo",reiki:"Reiki y energía",psychology:"Psicología",somatic:"Prácticas corporales",other:"Otros cursos"},courseTraditions:{greek:"Tradición griega",egyptian:"Tradición egipcia",maya:"Tradición maya",other:"Otras tradiciones"},
    searchLabel:"Buscar vídeos",searchPlaceholder:"Buscar por título, tema o autor…",
    sourceTitle:"Autor / fuente",sourceAll:"Todas las fuentes",
    periodTitle:"Fecha de publicación",periodOptions:["Último año","Década de 2020","Década de 2010","Década de 2000"],
    durationTitle:"Duración",durationOptions:["Menos de 4 minutos","Hasta 10 minutos","4–20 minutos","20–60 minutos","Más de 1 hora"],resetFilters:"Restablecer filtros",durationAll:"Todos",formatTitle:"Formato de vídeo",shortFormat:"Breves",studyFormat:"Clases",shortsHint:"Introducciones y avances",studyHint:"Lecciones, formación y prácticas",
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
export function VideoDiscovery({locale,videos,variant="library",subtitle}:{locale:PublicLocale;videos:LibraryFeedItem[];variant?:"library"|"mytube";subtitle?:string}){
  const t=labels[locale];
  const [area,setArea]=useState("all");
  const [goal,setGoal]=useState("all");
  // Public guest-chat referrals can preselect only a reviewed category.
  useEffect(()=>{
    if(variant!=="mytube")return;
    const requested=new URLSearchParams(window.location.search).get("goal");
    if(requested&&VIDEO_GOALS.includes(requested))setGoal(requested);
  },[variant]);
  const [contentType,setContentType]=useState("all");
  const [direction,setDirection]=useState("all");
  const [tradition,setTradition]=useState("all");
  const [language,setLanguage]=useState("all");
  const [sort,setSort]=useState<Order>("for-you");
  const [savedOnly,setSavedOnly]=useState(false);
  const [savedIds,setSavedIds]=useState<string[]>([]);
  const [hiddenIds,setHiddenIds]=useState<string[]>([]);
  const [search,setSearch]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [source,setSource]=useState("all");
  const [period,setPeriod]=useState("all");
  const [durationRange,setDurationRange]=useState("all");
  const [formatMode,setFormatMode]=useState<MyTubeFormat>("practices");
  const [courseType,setCourseType]=useState("all");
  const [courseTradition,setCourseTradition]=useState("all");
  const [courseSeriesId,setCourseSeriesId]=useState("all");
  // The choices reflect only existing, verified public assets in the active audio language.
  const courseVideos=useMemo(()=>videos.filter(item=>matchesMyTubeShelf(item,"courses")&&
    (language==="all"||item.audioLanguage===language)),[videos,language]);
  const courseTypes=listMyTubeCourseTypes(courseVideos);
  const courseTraditions=courseType==="temple"?listMyTubeCourseTraditions(courseVideos,courseType):[];
  const courseSeries=listMyTubeCourseSeries(courseVideos,courseType,courseTradition);
  const activeCourseSeries=courseSeries.some(item=>item.id===courseSeriesId)
    ?courseSeriesId:"all";
  const [mytubeCategoryId,setMyTubeCategoryId]=useState("all");
  const [mytubeSubcategoryId,setMyTubeSubcategoryId]=useState("all");
  const [mytubeTopicId,setMyTubeTopicId]=useState("all");
  const [mytubeScenarioId,setMyTubeScenarioId]=useState("all");
  const [mytubeMotifId,setMyTubeMotifId]=useState("all");
  const [mytubeStyleId,setMyTubeStyleId]=useState("all");
  const mytubeCategories=listMyTubeCategories(locale);
  const mytubeSubcategories=mytubeCategoryId==="all"?[]:listMyTubeSubcategories(mytubeCategoryId,locale);
  const mytubeTopics=mytubeCategoryId==="all"||mytubeSubcategoryId==="all"?[]:listMyTubeTopics(mytubeCategoryId,mytubeSubcategoryId,locale);
  const mytubeScenarios=mytubeTopicId==="all"?[]:listMyTubeScenarios(mytubeTopicId,locale);
  const mytubeMotifs=mytubeScenarioId==="all"?[]:listMyTubeScenarioMotifs(mytubeScenarioId,locale);
  const mytubeStyles=mytubeScenarioId==="all"?[]:listMyTubeStyles(locale);
  const motifCoverage=Object.fromEntries(mytubeMotifs.map(motif=>[
    motif.id,videos.filter(video=>video.mytubeVisualTagEvidence==="explicit_human_review"&&
      video.mytubeMotifIds?.includes(motif.id)).length]));
  const styleCoverage=Object.fromEntries(mytubeStyles.map(style=>[
    style.id,videos.filter(video=>video.mytubeVisualTagEvidence==="explicit_human_review"&&
      video.mytubeStyleIds?.includes(style.id)).length]));
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
      // Editorial format uses published video intent; unknown length is eligible.
      if(variant==="mytube"){
        if(!matchesMyTubeShelf(item,formatMode))return false;
        if(formatMode==="courses"){
          const course=myTubeCourseInfo(item);
          if(!course||(courseType!=="all"&&course.type!==courseType)||
            (courseType==="temple"&&courseTradition!=="all"&&course.tradition!==courseTradition)||
            (activeCourseSeries!=="all"&&course.id!==activeCourseSeries))return false;
        }
      }
      if(needle && ![item.title,item.description,item.sourceLabel||"",item.author||"",item.seriesTitle||"",item.topicTags?.join(" ")||""]
          .join(" ").toLocaleLowerCase(locale).includes(needle))return false;
      if(source!=="all" && (item.sourceLabel||item.author||"")!==source)return false;

      if(mytubeCategoryId!=="all"||mytubeSubcategoryId!=="all"||mytubeTopicId!=="all"||mytubeScenarioId!=="all"){
        const rankTags=item.mytubeRankings;
        const categories=item.mytubeCategoryCandidates;
        if(Array.isArray(rankTags)&&Array.isArray(categories)){
          // Canonical ranked tags take precedence over coarse legacy words.
          if(mytubeCategoryId!=="all"&&!categories.some(x=>x.categoryId===mytubeCategoryId&&x.score>=40))return false;
          if(mytubeSubcategoryId!=="all"&&!rankTags.some(x=>x.subcategoryId===mytubeSubcategoryId&&x.score>=65))return false;
          if(mytubeTopicId!=="all"&&!rankTags.some(x=>x.topicId===mytubeTopicId&&x.score>=65))return false;
          if(mytubeScenarioId!=="all"&&!rankTags.some(x=>
            x.topicId===mytubeTopicId&&x.scenarios.some(s=>s.scenarioId===mytubeScenarioId&&s.score>=65)))return false;
        }else{
          if(mytubeScenarioId!=="all")return false;
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
        }
      }

      if(!videoMatchesMyTubeVisualFilter(item,{
        motifId:mytubeMotifId==="all"?null:mytubeMotifId,
        styleId:mytubeStyleId==="all"?null:mytubeStyleId,
      }))return false;
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
        if(durationRange==="under10" && seconds>600)return false;
        if(durationRange==="4to20" && (seconds<240||seconds>1200))return false;
        if(durationRange==="20to60" && (seconds<=1200||seconds>3600))return false;
        if(durationRange==="over60" && seconds<=3600)return false;
      }
      return true;
    });
  },[videos,search,source,period,durationRange,formatMode,courseType,courseTradition,activeCourseSeries,variant,locale,mytubeCategoryId,mytubeSubcategoryId,mytubeTopicId,mytubeScenarioId,mytubeMotifId,mytubeStyleId]);
  const ordered=useMemo(()=>{
    const matches=rankDiscoveryVideos(sourceVideos,{
      goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort,
    });
    if(variant==="mytube"&&formatMode==="courses")return sortMyTubeCourseLessons(matches);
    if(variant!=="mytube"||[mytubeCategoryId,mytubeSubcategoryId,mytubeTopicId,mytubeScenarioId].every(id=>id==="all"))return matches;
    const score=(video:LibraryFeedItem)=>{
      if(mytubeScenarioId!=="all")return Math.max(0,...(video.mytubeRankings||[]).flatMap(topic=>
        topic.scenarios.filter(s=>s.scenarioId===mytubeScenarioId).map(s=>s.score)));
      if(mytubeTopicId!=="all")return Math.max(0,...(video.mytubeRankings||[]).filter(t=>t.topicId===mytubeTopicId).map(t=>t.score));
      if(mytubeSubcategoryId!=="all")return Math.max(0,...(video.mytubeRankings||[]).filter(t=>t.subcategoryId===mytubeSubcategoryId).map(t=>t.score));
      return Math.max(0,...(video.mytubeCategoryCandidates||[]).filter(t=>t.categoryId===mytubeCategoryId).map(t=>t.score));
    };
    return matches.map((item,index)=>({item,index,score:score(item)}))
      .sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
  },[sourceVideos,goal,area,contentType,direction,tradition,language,savedIds,hiddenIds,savedOnly,sort,
    variant,formatMode,mytubeCategoryId,mytubeSubcategoryId,mytubeTopicId,mytubeScenarioId]);
  // The compact bar displays the current 4-level editorial path without
  // occupying space needed by the video thumbnails. Only approved public
  // videos are filtered; the 256 scenario concepts are not playable assets.
  const activeMyTubePath=[
    mytubeCategories.find(item=>item.id===mytubeCategoryId)?.label,
    mytubeSubcategories.find(item=>item.id===mytubeSubcategoryId)?.label,
    mytubeTopics.find(item=>item.id===mytubeTopicId)?.label,
    mytubeScenarios.find(item=>item.id===mytubeScenarioId)?.label,
    mytubeMotifs.find(item=>item.id===mytubeMotifId)?.label,
    mytubeStyles.find(item=>item.id===mytubeStyleId)?.label,
  ].filter(Boolean).join(" › ")||t.mytubeAny;
  const index=VIDEO_GOALS.indexOf(goal);
  return <div className={[styles.wrapper,variant==="mytube"&&styles.mytube].filter(Boolean).join(" ")} data-hh-video-discovery="v1" data-discovery-variant={variant}>
    {variant==="mytube"&&<>
      <div className={styles.mytubeIntroBar}>
        <p>{subtitle||t.lead}</p>
        <div className={styles.mytubeLanguages} data-mytube-language-control
          role="group" aria-label={t.original}>
          {(["all","en","ru","es"] as const).map(value=><button key={value}
            type="button" data-mytube-audio-language={value} aria-pressed={language===value}
            onClick={()=>setLanguage(value)}>
            {value==="all"?t.durationAll:value.toUpperCase()}
          </button>)}
        </div>
      </div>
      <div className={styles.mytubeSearchRow} data-mytube-toolbar>
        <label className={styles.topSearch}>
          <Search size={20} aria-hidden="true"/>
          <span className={styles.visuallyHidden}>{t.searchLabel}</span>
          <input type="search" data-mytube-search maxLength={120} value={search}
            placeholder={t.searchPlaceholder} onChange={event=>setSearch(event.target.value)}/>
          {search&&<button type="button" onClick={()=>setSearch("")} aria-label={t.resetFilters}>×</button>}
        </label>
        <button type="button" data-mytube-filter-toggle className={styles.compactMoreButton}
          aria-label={t.advanced+" · "+activeMyTubePath}
          aria-expanded={filtersOpen} aria-controls="mytube-refine-controls mytube-more-controls"
          onClick={()=>setFiltersOpen(value=>!value)}>
          <SlidersHorizontal size={18} aria-hidden="true"/>
        </button>
      </div>
      <div className={styles.mytubeFormatTabs} data-mytube-format-tabs role="group"
        aria-label={t.formatTitle}>
        {(["practices","courses","masters"] as const).map(mode=><button type="button" key={mode}
          data-mytube-format-mode={mode} aria-pressed={formatMode===mode}
          onClick={()=>{setFormatMode(mode);setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");
            setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");
            setMyTubeStyleId("all");setContentType("all");setDirection("all");setTradition("all");
            setDurationRange("all");setCourseType("all");setCourseTradition("all");setCourseSeriesId("all");
            // A filter from the previous shelf must not silently hide course episodes.
            setGoal("all");setArea("all");setLanguage("all");setSource("all");setPeriod("all");
            setSearch("");setSavedOnly(false);setHiddenIds([]);
            setSort(mode==="courses"?"series":"for-you");}}>
          {mode==="practices"?t.mytubePractices:mode==="courses"?t.mytubeCourses:t.mytubeMasters}
        </button>)}
      </div>
      {formatMode==="practices"&&<>
      <div className={styles.mytubeCategoryRail} data-mytube-category-row
        data-mytube-category-rail data-mytube-categories role="group" aria-label={t.mytubeCategoryTitle}>
        <button type="button" data-mytube-category="all" aria-pressed={mytubeCategoryId==="all"}
          onClick={()=>{setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>
          {t.durationAll}
        </button>
        {mytubeCategories.map(item=><button key={item.id} type="button"
          data-mytube-category={item.id} aria-pressed={mytubeCategoryId===item.id}
          onClick={()=>{setMyTubeCategoryId(item.id);setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>
          {item.label}
        </button>)}
      </div>
      {mytubeCategoryId!=="all"&&<div className={styles.mytubeSubcategoryRail}
        data-mytube-subcategory-row data-mytube-subcategory-rail data-mytube-subcategories
        role="group" aria-label={t.mytubeSubcategoryTitle}>
        <button type="button" data-mytube-subcategory="all" aria-pressed={mytubeSubcategoryId==="all"}
          onClick={()=>{setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>
          {t.durationAll}
        </button>
        {mytubeSubcategories.map(item=><button key={item.id} type="button"
          data-mytube-subcategory={item.id} aria-pressed={mytubeSubcategoryId===item.id}
          title={item.chooseWhen}
          onClick={()=>{setMyTubeSubcategoryId(item.id);setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>
          {item.label}
        </button>)}
      </div>}
      </>}
      {formatMode==="courses"&&<div className={styles.mytubeCourseNavigation}
        data-mytube-course-navigation>
        <div className={styles.mytubeCourseLevel}>
          <strong>{t.courseTypeLabel}</strong>
          <div className={styles.mytubeCourseChoices} role="group" aria-label={t.courseTypeLabel}>
            <button type="button" data-mytube-course-type="all"
              aria-pressed={courseType==="all"}
              onClick={()=>{setCourseType("all");setCourseTradition("all");setCourseSeriesId("all");}}>
              {t.durationAll}
            </button>
            {courseTypes.map(type=><button key={type} type="button"
              data-mytube-course-type={type} aria-pressed={courseType===type}
              onClick={()=>{setCourseType(type);setCourseTradition("all");setCourseSeriesId("all");}}>
              {t.courseTypes[type as keyof typeof t.courseTypes]}
            </button>)}
          </div>
        </div>
        {courseType==="temple"&&<div className={styles.mytubeCourseLevel}>
          <strong>{t.courseTraditionLabel}</strong>
          <div className={styles.mytubeCourseChoices} role="group" aria-label={t.courseTraditionLabel}>
            <button type="button" data-mytube-course-tradition="all"
              aria-pressed={courseTradition==="all"}
              onClick={()=>{setCourseTradition("all");setCourseSeriesId("all");}}>
              {t.durationAll}
            </button>
            {courseTraditions.map(traditionId=><button key={traditionId} type="button"
              data-mytube-course-tradition={traditionId}
              aria-pressed={courseTradition===traditionId}
              onClick={()=>{setCourseTradition(traditionId);setCourseSeriesId("all");}}>
              {t.courseTraditions[traditionId as keyof typeof t.courseTraditions]}
            </button>)}
          </div>
        </div>}
        {courseSeries.length>0&&<div className={styles.mytubeCourseLevel}>
          <strong>{t.courseSeriesLabel}</strong>
          <div className={styles.mytubeCourseChoices} role="group" aria-label={t.courseSeriesLabel}>
            <button type="button" data-mytube-course-series="all"
              aria-pressed={activeCourseSeries==="all"} onClick={()=>setCourseSeriesId("all")}>
              {locale==="ru"?"Все курсы":locale==="es"?"Todos los cursos":"All courses"}
            </button>
            {courseSeries.map(series=><button key={series.id} type="button"
              data-mytube-course-series={series.id}
              aria-pressed={activeCourseSeries===series.id}
              onClick={()=>setCourseSeriesId(series.id)}>
              {series.label} · {series.count}
            </button>)}
          </div>
        </div>}
      </div>}

    </>}
    <section className={styles.panel} aria-label={t.title}>
      {variant!=="mytube"&&<div className={styles.intro}>
        <h2><Sparkles size={23} aria-hidden="true"/>{t.title}</h2>
        <p>{t.lead}</p>
      </div>}
      <div className={styles.areaSection} data-mytube-taxonomy="v2">
        {variant!=="mytube"&&<>
          <div className={styles.groupHeading}><strong>{t.mytubeCategoryTitle}</strong></div>
          <div className={styles.taxonomyPrimary}>
            <div className={styles.lifeAreas} data-mytube-categories role="group" aria-label={t.mytubeCategoryTitle}>
              <button type="button" data-mytube-category="all" aria-pressed={mytubeCategoryId==="all"}
                onClick={()=>{setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{t.mytubeAny}</button>
              {mytubeCategories.map(item=><button type="button" key={item.id} data-mytube-category={item.id}
                aria-pressed={mytubeCategoryId===item.id}
                onClick={()=>{setMyTubeCategoryId(item.id);setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{item.label}</button>)}
            </div>
          </div>
        </>}
        <div id={variant==="mytube"?"mytube-refine-controls":undefined}
          className={styles.refine} hidden={variant==="mytube"&&!filtersOpen}>
        {mytubeCategoryId!=="all"&&variant!=="mytube"?<>
          <div className={styles.groupHeading}><strong>{t.mytubeSubcategoryTitle}</strong></div>
          <div className={styles.goals} data-mytube-subcategories role="group" aria-label={t.mytubeSubcategoryTitle}>
            <button type="button" data-mytube-subcategory="all" aria-pressed={mytubeSubcategoryId==="all"}
              onClick={()=>{setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{t.mytubeAllSubcategories}</button>
            {mytubeSubcategories.map(item=><button type="button" key={item.id} data-mytube-subcategory={item.id}
              aria-pressed={mytubeSubcategoryId===item.id} title={item.chooseWhen}
              onClick={()=>{setMyTubeSubcategoryId(item.id);setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{item.label}</button>)}
          </div>
        </>:null}
        {mytubeSubcategoryId!=="all"?<>
          <div className={styles.groupHeading}><strong>{t.mytubeTopicTitle}</strong></div>
          <div className={styles.goals} data-mytube-topics role="group" aria-label={t.mytubeTopicTitle}>
            <button type="button" data-mytube-topic="all" aria-pressed={mytubeTopicId==="all"}
              onClick={()=>{setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{t.mytubeAllTopics}</button>
            {mytubeTopics.map(item=><button type="button" key={item.id} data-mytube-topic={item.id}
              aria-pressed={mytubeTopicId===item.id} onClick={()=>{setMyTubeTopicId(item.id);setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{item.label}</button>)}
          </div>
        </>:null}
        {mytubeTopicId!=="all"?<>
          <div className={styles.groupHeading}><strong>{t.mytubeScenarioTitle}</strong></div>
          <div className={styles.goals} data-mytube-scenarios role="group" aria-label={t.mytubeScenarioTitle}>
            <button type="button" data-mytube-scenario="all" aria-pressed={mytubeScenarioId==="all"}
              onClick={()=>{setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{t.mytubeAllScenarios}</button>
            {mytubeScenarios.map(item=><button type="button" key={item.id} data-mytube-scenario={item.id}
              aria-pressed={mytubeScenarioId===item.id} title={item.creativeBrief}
              onClick={()=>{setMyTubeScenarioId(item.id);setMyTubeMotifId("all");setMyTubeStyleId("all");}}>{item.label}</button>)}
          </div>
        </>:null}
        {mytubeScenarioId!=="all"&&mytubeMotifs.length===5?<div data-mytube-visual-filter-extension>
          <div className={styles.groupHeading}><strong>{locale==="ru"?"Мотив — центральный образ":locale==="es"?"Motivo — imagen central":"Motif — central image"}</strong></div>
          <div className={styles.goals} data-mytube-motifs role="group"
            aria-label={locale==="ru"?"Мотив сценария":locale==="es"?"Motivo de la historia":"Story motif"}>
            <button type="button" data-mytube-motif="all" aria-pressed={mytubeMotifId==="all"}
              onClick={()=>setMyTubeMotifId("all")}>{t.all}</button>
            {mytubeMotifs.map(motif=><button type="button" key={motif.id}
              data-mytube-motif={motif.id} aria-pressed={mytubeMotifId===motif.id}
              disabled={!motifCoverage[motif.id]}
              title={motif.meaning} onClick={()=>setMyTubeMotifId(motif.id)}>
              {motif.label} ({motifCoverage[motif.id]||0})
            </button>)}
          </div>
          <div className={styles.groupHeading}><strong>{locale==="ru"?"Визуальный стиль (необязательно)":locale==="es"?"Estilo visual (opcional)":"Visual style (optional)"}</strong></div>
          <div className={styles.goals} data-mytube-styles role="group"
            aria-label={locale==="ru"?"Визуальный стиль":locale==="es"?"Estilo visual":"Visual style"}>
            <button type="button" data-mytube-style="all" aria-pressed={mytubeStyleId==="all"}
              onClick={()=>setMyTubeStyleId("all")}>{t.all}</button>
            {mytubeStyles.map(style=><button type="button" key={style.id}
              data-mytube-style={style.id} aria-pressed={mytubeStyleId===style.id}
              disabled={!styleCoverage[style.id]} title={style.description}
              onClick={()=>setMyTubeStyleId(style.id)}>{style.label} ({styleCoverage[style.id]||0})</button>)}
          </div>
          <p className={styles.note} data-mytube-visual-media-warning>{
            locale==="ru"?"Здесь показаны только видео с проверенной визуальной разметкой. Редакционные мотивы не означают, что подходящие MP4 уже есть.":
            locale==="es"?"Solo vídeos con etiquetas visuales revisadas; los motivos no garantizan que existan MP4 adecuados.":
            "Only videos with reviewed visual annotations are filterable; editorial motifs do not imply available MP4."
          }</p>
        </div>:null}
        </div>
      </div>
      <div className={styles.moreControls} id={variant==="mytube"?"mytube-more-controls":undefined}
        hidden={variant==="mytube"&&!filtersOpen}>
      <div className={styles.controls}>
        {variant!=="mytube"&&<label>{t.original}
          <select value={language} onChange={event=>setLanguage(event.target.value)}>
            <option value="all">{t.allAudio}</option><option value="ru">Русский</option>
            <option value="en">English</option><option value="es">Español</option>
          </select>
        </label>}
        {!(variant==="mytube"&&formatMode==="courses")&&<label>{t.order}
          <select value={sort} onChange={event=>setSort(event.target.value as Order)}>
            <option value="for-you">{t.forYou}</option>
            <option value="series">{t.series}</option>
            <option value="newest">{t.newest}</option>
          </select>
        </label>}
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
          {(variant==="mytube"||durationsAvailable) && <label>{t.durationTitle}
            <select data-mytube-duration value={durationRange} disabled={!durationsAvailable}
              onChange={event=>setDurationRange(event.target.value)}>
              <option value="all">{t.all}</option>
              {["under4","under10","4to20","20to60","over60"].map((id,i)=>
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
        onClick={()=>{setArea("all");setGoal("all");setMyTubeCategoryId("all");setMyTubeSubcategoryId("all");setMyTubeTopicId("all");setMyTubeScenarioId("all");setMyTubeMotifId("all");setMyTubeStyleId("all");setContentType("all");setDirection("all");
          setTradition("all");setLanguage("all");setSource("all");setPeriod("all");
          setDurationRange("all");setFormatMode("practices");setCourseType("all");setCourseTradition("all");setCourseSeriesId("all");setSearch("");setSort("for-you");setSavedOnly(false);}}>
        <RotateCcw size={15} aria-hidden="true"/>{t.resetFilters}
      </button>}
      <p className={styles.note}>{t.note}</p>
      </div>
    </section>
    <div className={styles.results} aria-live="polite">
      <span>{variant==="mytube"?(formatMode==="practices"?t.mytubePractices:formatMode==="courses"?t.mytubeCourses:t.mytubeMasters):area!=="all"?t.areas[VIDEO_LIFE_AREAS.indexOf(area)]:index>0?t.result+": "+t.goals[index]:t.allResult}</span><span data-mytube-result-count={variant==="mytube"?"true":undefined}>{ordered.length}</span>
    </div>
    {ordered.length===0?<p className={styles.empty} data-mytube-empty={variant==="mytube"?"true":undefined}>
      {variant==="mytube"&&formatMode==="courses"?t.courseNone:
        variant==="mytube"&&formatMode==="masters"?t.masterNone:
        variant==="mytube"&&formatMode==="practices"?t.practiceNone:t.empty}</p>:
      <LibraryFeed locale={locale} items={ordered} videosOnly preserveOrder
        videoLayout={variant==="mytube"?"mytube":"default"}
        mytubeShelf={variant==="mytube"?formatMode:undefined}
        mytubeFocus={variant==="mytube"?{
          categoryId:mytubeCategoryId,subcategoryId:mytubeSubcategoryId,
          topicId:mytubeTopicId,scenarioId:mytubeScenarioId,
        }:undefined}
        savedVideoIds={savedIds} onToggleSaved={save} onDismissVideo={dismiss}
        saveText={t.save} unsaveText={t.unsave} dismissText={t.dismiss}/>}
  </div>;
}
