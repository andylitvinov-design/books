"use client";
import {Bookmark,BookmarkCheck,Clapperboard,ExternalLink,Filter,Play,RotateCcw,Search,ThumbsDown,X} from "lucide-react";
import {useEffect,useMemo,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import type {LibraryFeedItem} from "@/components/library-feed";
import {VIDEO_GOALS,rankDiscoveryVideos} from "@/lib/video-discovery/ranker.mjs";
import {VIDEO_CONTENT_TYPES,VIDEO_DIRECTIONS,VIDEO_LIFE_AREAS,VIDEO_TRADITIONS,lifeAreasForIntent} from "@/lib/video-discovery/taxonomy.mjs";
import css from "./mytube-feed.module.css";

type Order="for-you"|"newest"|"series";
const KEY="hh-public-video-favorites-v1";
const validId=(id:unknown):id is string=>typeof id==="string"&&/^[A-Za-z0-9_-]{11}$/.test(id);
const safeId=(id:unknown):id is string=>typeof id==="string"&&id.length>0&&id.length<=180;
const selectOptions=(videos:LibraryFeedItem[],field:"seriesTitle"|"sourceLabel")=>
 [...new Set(videos.map(v=>v[field]).filter((v):v is string=>typeof v==="string"&&v.trim().length>0))].sort((a,b)=>a.localeCompare(b));
const words={
 ru:{lead:"Видео для вашего развития",search:"Найти видео, медитацию или практику",area:"Сфера жизни",goal:"Моя цель",all:"Все",advanced:"Расширенные фильтры",saved:"Сохранённое",
 areas:["Деньги и работа","Отношения","Тело и энергия","Развитие"],goals:["Для меня","Спокойствие","Энергия","Отношения","Работа","Смыслы","Практики"],
 types:["Медитация","Энергопрактика","Объяснение","Урок курса"],directions:["Символическое","Храмовое","Психологическое","Рейки / энергия","Телесное"],traditions:["Египетская","Греческая","Майя","Ацтекская","Северная","Славянская","Римская","Восточная","Другая"],
 type:"Тип видео",direction:"Направление",tradition:"Традиция",audio:"Язык аудио",source:"Канал / источник",series:"Серия",sort:"Порядок",forYou:"Для меня",newest:"Новые",bySeries:"По сериям",
 videos:"Видео",reset:"Сбросить",restore:"Вернуть скрытые",empty:"Ничего не найдено. Выберите другую тему или сбросьте фильтры.",watch:"Смотреть",close:"Закрыть",original:"Открыть на YouTube",save:"Сохранить",unsave:"Убрать из сохранённого",dismiss:"Не интересно",create:"Создать видео",
 note:"Рекомендации используют только темы и сохранённые видео, не результаты тестов. Избранное хранится в браузере. Плеер YouTube подключается только после нажатия."},
 en:{lead:"Videos for personal growth",search:"Search videos, meditations or practices",area:"Life area",goal:"My goal",all:"All",advanced:"Advanced filters",saved:"Saved",
 areas:["Work & money","Relationships","Body & energy","Personal growth"],goals:["For you","Calm","Energy","Relationships","Work","Meaning","Practices"],
 types:["Meditation","Energy practice","Explanation","Course lesson"],directions:["Symbolic","Temple","Psychological","Reiki / energy","Somatic"],traditions:["Egyptian","Greek","Maya","Aztec","Northern","Slavic","Roman","Eastern","Other"],
 type:"Video type",direction:"Approach",tradition:"Tradition",audio:"Audio language",source:"Channel / source",series:"Series",sort:"Sort",forYou:"For you",newest:"Newest",bySeries:"By series",
 videos:"Videos",reset:"Reset",restore:"Restore hidden",empty:"No matching videos. Try another topic or reset the filters.",watch:"Watch",close:"Close",original:"Open on YouTube",save:"Save",unsave:"Remove saved",dismiss:"Not interested",create:"Create video",
 note:"Recommendations use only chosen topics and saved videos, never test results. Favorites stay in this browser. The YouTube player loads only after you choose to watch."},
 es:{lead:"Vídeos para el desarrollo personal",search:"Buscar vídeos, meditaciones o prácticas",area:"Área de vida",goal:"Mi objetivo",all:"Todo",advanced:"Filtros avanzados",saved:"Guardados",
 areas:["Trabajo y dinero","Relaciones","Cuerpo y energía","Desarrollo"],goals:["Para mí","Calma","Energía","Relaciones","Trabajo","Sentido","Prácticas"],
 types:["Meditación","Práctica energética","Explicación","Lección"],directions:["Simbólico","Templo","Psicológico","Reiki / energía","Somático"],traditions:["Egipcia","Griega","Maya","Azteca","Nórdica","Eslava","Romana","Oriental","Otra"],
 type:"Tipo de vídeo",direction:"Enfoque",tradition:"Tradición",audio:"Idioma de audio",source:"Canal / fuente",series:"Serie",sort:"Orden",forYou:"Para mí",newest:"Recientes",bySeries:"Por series",
 videos:"Vídeos",reset:"Restablecer",restore:"Restaurar ocultos",empty:"No hay vídeos. Prueba otro tema o restablece los filtros.",watch:"Ver",close:"Cerrar",original:"Abrir en YouTube",save:"Guardar",unsave:"Quitar guardado",dismiss:"No me interesa",create:"Crear vídeo",
 note:"Las sugerencias solo usan los temas elegidos y vídeos guardados, nunca resultados de pruebas. Los favoritos quedan en este navegador. YouTube se carga solo cuando pulses Ver."}
} as const;

export function MyTubeFeed({locale,videos}:{locale:PublicLocale;videos:LibraryFeedItem[]}){
 const t=words[locale];
 const [query,setQuery]=useState("");
 const [area,setArea]=useState("all"),[goal,setGoal]=useState("all");
 const [contentType,setContentType]=useState("all"),[direction,setDirection]=useState("all"),[tradition,setTradition]=useState("all");
 const [language,setLanguage]=useState("all"),[source,setSource]=useState("all"),[series,setSeries]=useState("all");
 const [sort,setSort]=useState<Order>("for-you"),[savedOnly,setSavedOnly]=useState(false);
 const [saved,setSaved]=useState<string[]>([]),[hidden,setHidden]=useState<string[]>([]);
 const [playing,setPlaying]=useState<string|null>(null),[advanced,setAdvanced]=useState(false);
 useEffect(()=>{try{const item:unknown=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(item))setSaved([...new Set(item.filter(safeId))].slice(0,200));}catch{}},[]);
 const toggleSaved=(id:string)=>{setSaved(current=>{const next=current.includes(id)?current.filter(x=>x!==id):[id,...current.filter(x=>x!==id)].slice(0,200);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;});};
 const hide=(id:string)=>{setHidden(current=>[id,...current.filter(x=>x!==id)].slice(0,200));if(playing===id)setPlaying(null);};
 const reset=()=>{setQuery("");setArea("all");setGoal("all");setContentType("all");setDirection("all");setTradition("all");setLanguage("all");setSource("all");setSeries("all");setSavedOnly(false);setSort("for-you");setPlaying(null);};
 const sources=useMemo(()=>selectOptions(videos,"sourceLabel"),[videos]);
 const seriesOptions=useMemo(()=>selectOptions(videos,"seriesTitle"),[videos]);
 const availableGoals=VIDEO_GOALS.filter(x=>x==="all"||x==="practices"||area==="all"||lifeAreasForIntent(x).includes(area));
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase(locale);
  return rankDiscoveryVideos(videos,{area,goal,contentType,direction,tradition,language,savedOnly,savedIds:saved,hiddenIds:hidden,sort})
   .filter((v:LibraryFeedItem)=>validId(v.youtubeId)&&
    (source==="all"||v.sourceLabel===source)&&(series==="all"||v.seriesTitle===series)&&
    (!q||[v.title,v.description,v.seriesTitle,v.sourceLabel].filter(Boolean).join(" ").toLocaleLowerCase(locale).includes(q)));
 },[videos,area,goal,contentType,direction,tradition,language,savedOnly,saved,hidden,sort,query,locale,source,series]);
 const count=[contentType,direction,tradition,language,source,series].filter(x=>x!=="all").length+(savedOnly?1:0);
 const select=(label:string,value:string,change:(v:string)=>void,options:readonly string[],labels:readonly string[])=>
  <label className={css.field}>{label}<select value={value} onChange={event=>change(event.currentTarget.value)}>
   <option value="all">{t.all}</option>{options.map((v,i)=><option key={v} value={v}>{labels[i]||v}</option>)}
  </select></label>;
 return <main className={css.shell} lang={locale} data-mytube-screen>
  <div className={css.brandRow}>
   <div className={css.brand}><span className={css.logo}><Play size={22} fill="currentColor" aria-hidden="true"/></span>
    <div><h1>MyTube</h1><p>{t.lead}</p></div></div>
   <a className={css.create} href={"/"+locale+"/holistic-support/mandala"}><Clapperboard size={16} aria-hidden="true"/>{t.create}</a>
  </div>
  <section className={css.filterPanel} data-mytube-filters aria-label={t.advanced}>
   <label className={css.search}><Search size={21} aria-hidden="true"/><input type="search" placeholder={t.search}
    aria-label={t.search} autoComplete="off" value={query} onChange={event=>setQuery(event.currentTarget.value)}/>
    {query&&<button type="button" aria-label={t.reset} onClick={()=>setQuery("")}><X size={19}/></button>}
   </label>
   <div className={css.group}><strong>{t.area}</strong><div className={css.areas} role="group" aria-label={t.area}>
    {VIDEO_LIFE_AREAS.map((id,i)=><button key={id} type="button" aria-pressed={area===id}
     onClick={()=>{setArea(current=>current===id?"all":id);setGoal("all");}}>{t.areas[i]}</button>)}
   </div></div>
   <div className={css.group}><strong>{t.goal}</strong><div className={css.goals} role="group" aria-label={t.goal}>
    {availableGoals.map(id=><button key={id} type="button" aria-pressed={goal===id}
     onClick={()=>setGoal(id)}>{t.goals[VIDEO_GOALS.indexOf(id)]}</button>)}
   </div></div>
   <div className={css.controls}>
    <button type="button" aria-expanded={advanced} aria-controls="mytube-advanced" onClick={()=>setAdvanced(v=>!v)}>
     <Filter size={19} aria-hidden="true"/>{t.advanced}{count?" · "+count:""}</button>
    <button type="button" aria-pressed={savedOnly} onClick={()=>setSavedOnly(v=>!v)}>
     <Bookmark size={18} aria-hidden="true"/>{t.saved}{saved.length?" · "+saved.length:""}</button>
   </div>
   {advanced&&<div className={css.advanced} id="mytube-advanced" data-mytube-advanced>
    {select(t.type,contentType,setContentType,VIDEO_CONTENT_TYPES,t.types)}
    {select(t.direction,direction,v=>{setDirection(v);setTradition("all");},VIDEO_DIRECTIONS,t.directions)}
    {(direction==="temple"||direction==="magical")&&select(t.tradition,tradition,setTradition,VIDEO_TRADITIONS,t.traditions)}
    <label className={css.field}>{t.audio}<select value={language} onChange={event=>setLanguage(event.currentTarget.value)}>
     <option value="all">{t.all}</option><option value="ru">Русский</option><option value="en">English</option><option value="es">Español</option>
    </select></label>
    {sources.length>0&&select(t.source,source,setSource,sources,sources)}
    {seriesOptions.length>0&&select(t.series,series,setSeries,seriesOptions,seriesOptions)}
    <label className={css.field}>{t.sort}<select value={sort} onChange={event=>setSort(event.currentTarget.value as Order)}>
     <option value="for-you">{t.forYou}</option><option value="newest">{t.newest}</option><option value="series">{t.bySeries}</option>
    </select></label>
    <div className={css.resetButtons}><button type="button" onClick={reset}><RotateCcw size={16}/>{t.reset}</button>
    {hidden.length>0&&<button type="button" onClick={()=>setHidden([])}>{t.restore} · {hidden.length}</button>}</div>
   </div>}
  </section>
  <div className={css.result}><h2>{t.videos}</h2><span aria-live="polite">{filtered.length}</span>
   {(query||area!=="all"||goal!=="all"||count>0)&&<button type="button" onClick={reset}>{t.reset}</button>}
  </div>
  {filtered.length===0?<div className={css.empty}><Clapperboard size={36} aria-hidden="true"/><p>{t.empty}</p><button type="button" onClick={reset}>{t.reset}</button></div>:
   <div className={css.grid} data-mytube-feed>{filtered.map(video=>{
    const id=video.youtubeId;
    if(!validId(id))return null;
    const active=playing===id, favorite=saved.includes(id);
    const poster=video.image||"https://i.ytimg.com/vi/"+encodeURIComponent(id)+"/hqdefault.jpg";
    return <article key={id} className={css.card} data-mytube-video={id}>
     <div className={css.poster}>{active?<div className={css.player}>
      <iframe title={video.title} loading="lazy" src={"https://www.youtube-nocookie.com/embed/"+id+"?rel=0&playsinline=1"}
       referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>
      <button type="button" onClick={()=>setPlaying(null)} aria-label={t.close}><X size={18}/>{t.close}</button>
     </div>:<button type="button" className={css.playButton} aria-label={t.watch+": "+video.title} onClick={()=>setPlaying(id)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" loading="lazy" decoding="async"/><span><Play size={27} fill="currentColor" aria-hidden="true"/></span>
     </button>}</div>
     <div className={css.details}><div className={css.channel}><Clapperboard size={21} aria-hidden="true"/></div>
      <div className={css.information}><h3>{video.title}</h3><p>{video.sourceLabel||"Holistic House"}{video.audioLanguage?" · "+video.audioLanguage.toUpperCase():""}</p>
       {video.seriesTitle&&<p>{video.seriesTitle}{video.seriesOrder?" · "+video.seriesOrder:""}</p>}
       {video.description&&<p className={css.description}>{video.description}</p>}
      </div>
      <div className={css.actions}>
       <button type="button" aria-pressed={favorite} onClick={()=>toggleSaved(id)} title={favorite?t.unsave:t.save}
        aria-label={(favorite?t.unsave:t.save)+": "+video.title}>{favorite?<BookmarkCheck size={20}/>:<Bookmark size={20}/>}</button>
       <button type="button" onClick={()=>hide(id)} title={t.dismiss} aria-label={t.dismiss+": "+video.title}><ThumbsDown size={20}/></button>
       <a href={"https://www.youtube.com/watch?v="+encodeURIComponent(id)} target="_blank" rel="noopener noreferrer"
        title={t.original} aria-label={t.original+": "+video.title}><ExternalLink size={19}/></a>
      </div></div>
    </article>;
   })}</div>}
  <p className={css.note}>{t.note}</p>
 </main>;
}
