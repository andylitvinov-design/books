"use client";

import Image from "next/image";
import {ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, Film, Play, X} from "lucide-react";
import {type ReactNode, useMemo, useState} from "react";
import type {LibraryFeedItem} from "@/components/library-feed";
import type {PublicLocale} from "@/lib/public-locales";
import {myTubeCourseInfo, sortMyTubeCourseLessons} from "@/lib/video-discovery/mytube-shelves.mjs";
import styles from "./mytube-course-playlists.module.css";

type Category="temple"|"reiki"|"energy"|"other";
type Group={id:string;sourceGroup:string;name:string;category:Category;topic:string;lessons:LibraryFeedItem[]};
const categoryOrder:Category[]=["temple","reiki","energy","other"];
const copy={
  ru:{direction:"Направления курсов",topicLabel:"Темы",courses:"Подборки курсов",all:"Все направления",allTopics:"Все темы",more:"Показать другие подборки",less:"Свернуть",videos:"видео",lesson:"Урок",watch:"Смотреть урок",close:"Закрыть видео",original:"Открыть на YouTube",save:"Сохранить видео",unsave:"Убрать из сохранённого",none:"По выбранной теме опубликованных курсов пока нет.",hint:"Выберите направление, затем тему. Откройте подборку, чтобы увидеть уроки.",categories:{temple:"Храмовые традиции",reiki:"Рейки",energy:"Энергетические практики",other:"Другие курсы"},topics:{greek:"Греческая традиция",egyptian:"Египетская традиция",maya:"Традиция майя",otherTemple:"Другие традиции",tantra:"Тантра Рейки",kundalini:"Кундалини Рейки",yggdrasil:"Рейки Иггдрасиль",otherReiki:"Другие школы Рейки",planets:"Планеты и Солнце",protection:"Сила и защита",generalEnergy:"Энергетические практики",psychology:"Психология",somatic:"Телесные практики",general:"Другие темы"}},
  en:{direction:"Course areas",topicLabel:"Topics",courses:"Course collections",all:"All areas",allTopics:"All topics",more:"Show more collections",less:"Show fewer",videos:"videos",lesson:"Lesson",watch:"Watch lesson",close:"Close video",original:"Watch on YouTube",save:"Save video",unsave:"Remove saved video",none:"No published courses in this selection yet.",hint:"Choose an area, then a topic. Open a collection to view its lessons.",categories:{temple:"Temple traditions",reiki:"Reiki",energy:"Energy practices",other:"Other courses"},topics:{greek:"Greek tradition",egyptian:"Egyptian tradition",maya:"Maya tradition",otherTemple:"Other traditions",tantra:"Tantra Reiki",kundalini:"Kundalini Reiki",yggdrasil:"Yggdrasil Reiki",otherReiki:"Other Reiki traditions",planets:"Planets & Sun",protection:"Strength & protection",generalEnergy:"Energy practices",psychology:"Psychology",somatic:"Body practices",general:"Other topics"}},
  es:{direction:"Áreas de cursos",topicLabel:"Temas",courses:"Colecciones de cursos",all:"Todas las áreas",allTopics:"Todos los temas",more:"Ver más colecciones",less:"Mostrar menos",videos:"vídeos",lesson:"Lección",watch:"Ver lección",close:"Cerrar vídeo",original:"Ver en YouTube",save:"Guardar vídeo",unsave:"Quitar vídeo guardado",none:"Todavía no hay cursos publicados para esta selección.",hint:"Elige un área y un tema. Abre una colección para ver las lecciones.",categories:{temple:"Tradiciones del templo",reiki:"Reiki",energy:"Prácticas energéticas",other:"Otros cursos"},topics:{greek:"Tradición griega",egyptian:"Tradición egipcia",maya:"Tradición maya",otherTemple:"Otras tradiciones",tantra:"Tantra Reiki",kundalini:"Kundalini Reiki",yggdrasil:"Reiki Yggdrasil",otherReiki:"Otras tradiciones Reiki",planets:"Planetas y Sol",protection:"Fuerza y protección",generalEnergy:"Prácticas energéticas",psychology:"Psicología",somatic:"Prácticas corporales",general:"Otros temas"}},
} as const;
const localizedSeries:Record<string,Record<PublicLocale,string>>={
  "videos/greek-mysteries-dionysus":{ru:"Канал Диониса",en:"Dionysus teachings",es:"Enseñanzas de Dioniso"},
  "videos/greek-mysteries-demeter":{ru:"Канал Деметры",en:"Demeter teachings",es:"Enseñanzas de Deméter"},
  "videos/egypt-osiris":{ru:"Египет — Осирис",en:"Egypt — Osiris",es:"Egipto — Osiris"},
  "videos/maya-archetypes":{ru:"Архетипы майя",en:"Maya archetypes",es:"Arquetipos mayas"},
  "mysteries/archetypes-of-gods":{ru:"Большие мистерии: архетипы богов",en:"Great Mysteries: Archetypes of the Gods",es:"Grandes misterios: Arquetipos de los dioses"},
  "tantra-reiki":{ru:"Тантра Рейки",en:"Tantra Reiki",es:"Tantra Reiki"},
  "reiki-yggdrasil":{ru:"Рейки Иггдрасиль",en:"Yggdrasil Reiki",es:"Reiki Yggdrasil"},
  "kundalini-reiki":{ru:"Кундалини Рейки",en:"Kundalini Reiki",es:"Reiki Kundalini"},
  "videos/planetary-power":{ru:"Сила планет",en:"Planetary Power",es:"El poder de los planetas"},
  "videos/strength-protection":{ru:"Сила и защита",en:"Strength & Protection",es:"Fuerza y protección"},
  "videos/energy-pump-ups":{ru:"Энергетические подкачки",en:"Energy Boosting",es:"Potenciación energética"},
  "videos/sun-meditations":{ru:"Солнечные медитации",en:"Sun Meditations",es:"Meditaciones solares"},
  "mysteries/guidance-of-gods":{ru:"Мистерии богов",en:"Guidance of the Gods",es:"Guía de los dioses"},
  "symbolic/artifacts-talismans":{ru:"Артефакты и талисманы",en:"Sacred Artifacts & Talismans",es:"Artefactos y talismanes"},
  "reiki/master-shamanic-healing":{ru:"Шаманское исцеление Рейки",en:"Shamanic Reiki Healing",es:"Sanación chamánica Reiki"},
  "reiki/yggdrasil/faq":{ru:"Рейки Иггдрасиль: вопросы",en:"Yggdrasil Reiki: Questions",es:"Reiki Yggdrasil: Preguntas"},
};
function categoryOf(item:LibraryFeedItem):Category{
  const info=myTubeCourseInfo(item);
  if(info?.type==="temple")return "temple";
  if(info?.type==="reiki")return "reiki";
  if(info?.type==="psychology"||info?.type==="somatic")return "other";
  return /planetary|sun-meditations|strength-protection|energy-pump-ups|energy|энерги/iu.test(item.sourceGroup||"")?"energy":"other";
}
function topicOf(item:LibraryFeedItem,category:Category):keyof typeof copy.en.topics{
  const info=myTubeCourseInfo(item);
  const group=(item.sourceGroup||"").toLowerCase();
  if(category==="temple")return info?.tradition==="greek"?"greek":info?.tradition==="egyptian"?"egyptian":info?.tradition==="maya"?"maya":"otherTemple";
  if(category==="reiki")return /tantra/.test(group)?"tantra":/kundalini/.test(group)?"kundalini":/yggdrasil/.test(group)?"yggdrasil":"otherReiki";
  if(category==="energy")return /planet|sun/.test(group)?"planets":/strength|protection/.test(group)?"protection":"generalEnergy";
  return info?.type==="psychology"?"psychology":info?.type==="somatic"?"somatic":"general";
}
function groupedPlaylists(items:LibraryFeedItem[]):Group[]{
  const found=new Map<string,Group>();
  for(const item of items){
    const info=myTubeCourseInfo(item);
    if(!info)continue; // The parent supplies only reviewed public videos.
    // A generic publication bucket is not a real course: never merge unrelated
    // independently published lessons into one misleading playlist.
    const id=item.seriesId||(["owner-library","site-introduction"].includes(item.sourceGroup||"")
      ?"standalone:"+(item.youtubeId||item.id):info.id);
    let group=found.get(id);
    if(!group){
      const category=categoryOf(item);
      group={id,sourceGroup:item.sourceGroup||"",name:item.seriesTitle||item.title||info.id,
        category,topic:topicOf(item,category),lessons:[]};
      found.set(id,group);
    }
    group.lessons.push(item);
  }
  return [...found.values()].map(group=>({...group,lessons:sortMyTubeCourseLessons(group.lessons)}));
}

export function MyTubeCoursePlaylists({locale,items,savedVideoIds,onToggleSaved,afterAllVisible}:{
  locale:PublicLocale;items:LibraryFeedItem[];savedVideoIds:string[];onToggleSaved:(id:string)=>void;
  afterAllVisible?:ReactNode;
}){
  const t=copy[locale];
  const [category,setCategory]=useState<Category|null>(null);
  const [topic,setTopic]=useState<string|null>(null);
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const [playingId,setPlayingId]=useState<string|null>(null);
  const [showAll,setShowAll]=useState(false);
  const groups=useMemo(()=>groupedPlaylists(items),[items]);
  // Keep the owner's four primary areas stable even when an area is empty.
  const categories=categoryOrder;
  const topics=category?[...new Set(groups.filter(group=>group.category===category).map(group=>group.topic))]:[];
  const filtered=groups.filter(group=>(!category||group.category===category)&&(!topic||group.topic===topic));
  const visible=showAll?filtered:filtered.slice(0,6);
  const selectedGroup=filtered.find(group=>group.id===expandedId);
  const selectedLesson=selectedGroup?.lessons.find(item=>item.id===playingId && /^[A-Za-z0-9_-]{11}$/.test(item.youtubeId||""));
  const chooseCategory=(next:Category|null)=>{setCategory(next);setTopic(null);setExpandedId(null);setPlayingId(null);setShowAll(false);};
  const chooseTopic=(next:string|null)=>{setTopic(next);setExpandedId(null);setPlayingId(null);setShowAll(false);};
  return <section className={styles.catalog} data-mytube-course-navigation aria-label={t.courses}>
    <div className={styles.filters}>
      <div className={styles.heading}><strong>{t.direction}</strong>
        {category&&<button type="button" className={styles.clear} onClick={()=>chooseCategory(null)}>{t.all}</button>}
      </div>
      <div className={styles.categories} role="group" aria-label={t.direction}>
        {categories.map(value=><button type="button" key={value} data-mytube-course-type={value}
          aria-pressed={category===value} onClick={()=>chooseCategory(category===value?null:value)}>
          {t.categories[value]}
        </button>)}
      </div>
      {category&&topics.length>0&&<div className={styles.topicSection}>
        <div className={styles.heading}><strong>{t.topicLabel}</strong>
          {topic&&<button type="button" className={styles.clear} onClick={()=>chooseTopic(null)}>{t.allTopics}</button>}
        </div>
        <div className={styles.topics} role="group" aria-label={t.topicLabel}>
          {topics.map(value=><button type="button" key={value} data-mytube-course-tradition={value}
            aria-pressed={topic===value} onClick={()=>chooseTopic(topic===value?null:value)}>
            {t.topics[value as keyof typeof t.topics]}
          </button>)}
        </div>
      </div>}
    </div>
    <div className={styles.collections} data-mytube-course-collections>
      <div className={styles.collectionTitle}><strong>{t.courses}</strong><span>{filtered.length}</span></div>
      {groups.length>0&&!category&&<p className={styles.hint}>{t.hint}</p>}
      {filtered.length===0&&<p className={styles.empty} role="status">{t.none}</p>}
      <div className={styles.grid}>{visible.map((group,index)=>{
        const isOpen=expandedId===group.id;
        const cover=group.lessons[0];
        const poster=cover?.image||(cover?.youtubeId?"https://i.ytimg.com/vi/"+encodeURIComponent(cover.youtubeId)+"/hqdefault.jpg":"");
        const title=localizedSeries[group.sourceGroup]?.[locale]||group.name;
        return <article className={[styles.playlist,isOpen&&styles.open].filter(Boolean).join(" ")}
          key={group.id} data-mytube-course-heading={group.id}>
          <button type="button" className={styles.playlistButton}
            data-mytube-course-series={group.id} aria-expanded={isOpen} aria-controls={"course-lessons-"+index}
            onClick={()=>{setExpandedId(isOpen?null:group.id);setPlayingId(null);}}>
            <span className={styles.cover}>{poster?<Image src={poster} alt="" fill unoptimized sizes="(max-width: 640px) 128px, 220px"/>:<Film size={27} aria-hidden="true"/>}
              <span className={styles.playlistCount}><Film size={14} aria-hidden="true"/>{group.lessons.length}</span>
            </span>
            <span className={styles.courseText}><strong>{title}</strong>
              <span>{t.topics[group.topic as keyof typeof t.topics]} · {group.lessons.length} {t.videos}</span>
            </span>
            <ChevronDown className={styles.arrow} size={19} aria-hidden="true"/>
          </button>
          {isOpen&&<div className={styles.lessons} id={"course-lessons-"+index} data-mytube-course-lessons>
            {selectedLesson&&<div className={styles.player} data-mytube-course-player>
              <iframe title={selectedLesson.title} loading="lazy"
                src={"https://www.youtube-nocookie.com/embed/"+selectedLesson.youtubeId+"?rel=0&playsinline=1"}
                allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin" />
              <div className={styles.playerActions}>
                <button type="button" className={styles.closeVideo} onClick={()=>setPlayingId(null)}>
                  <X size={15} aria-hidden="true"/>{t.close}
                </button>
                <a className={styles.originalLink} href={selectedLesson.href||"https://www.youtube.com/watch?v="+selectedLesson.youtubeId}
                  target="_blank" rel="noopener noreferrer" aria-label={t.original+": "+selectedLesson.title}>
                  <ArrowUpRight size={16} aria-hidden="true"/>{t.original}
                </a>
              </div>
            </div>}
            {group.lessons.map((item,lessonIndex)=>{
              const canPlay=/^[A-Za-z0-9_-]{11}$/.test(item.youtubeId||"");
              const thumb=item.image||(canPlay?"https://i.ytimg.com/vi/"+encodeURIComponent(item.youtubeId!)+"/mqdefault.jpg":"");
              const isPlaying=playingId===item.id;
              const saved=savedVideoIds.includes(item.youtubeId||item.id);
              return <div className={styles.lesson} key={item.id} data-mytube-course-lesson={lessonIndex+1}>
                <button type="button" className={styles.lessonWatch} disabled={!canPlay}
                  aria-pressed={isPlaying} aria-label={t.watch+": "+item.title}
                  onClick={()=>setPlayingId(isPlaying?null:item.id)}>
                  <span className={styles.lessonNumber}>{lessonIndex+1}</span>
                  <span className={styles.lessonThumb}>{thumb?<Image src={thumb} alt="" fill unoptimized sizes="86px"/>:<Play size={18} aria-hidden="true"/>}</span>
                  <span className={styles.lessonText}><span>{item.title}</span>
                    <small>{t.lesson} {lessonIndex+1}{item.audioLanguage?" · "+item.audioLanguage.toUpperCase():""}</small>
                  </span>
                  <Play className={styles.lessonPlay} size={17} aria-hidden="true"/>
                </button>
                <button type="button" className={styles.save} onClick={()=>onToggleSaved(item.youtubeId||item.id)}
                  aria-pressed={saved} aria-label={(saved?t.unsave:t.save)+": "+item.title}>
                  {saved?<BookmarkCheck size={18} aria-hidden="true"/>:<Bookmark size={18} aria-hidden="true"/>}
                </button>
              </div>;
            })}
          </div>}
        </article>;
      })}</div>
      {filtered.length>6&&<button type="button" className={styles.more}
        onClick={()=>setShowAll(value=>!value)}>{showAll?t.less:t.more}
        <ChevronDown size={17} aria-hidden="true" className={showAll?styles.rotated:""}/>
      </button>}
    </div>
    {(filtered.length<=6||showAll)&&afterAllVisible}
  </section>;
}