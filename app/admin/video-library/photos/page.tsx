import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PrescriptionAdminHeader} from "@/components/prescription-admin-header";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {uiLocaleCookie} from "@/lib/ui-locale";
import {auditStoryPhotoCoverage} from "@/lib/video-library/story-photo-audit.mjs";
import styles from "../video-library.module.css";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"Photo coverage by storyboard scene — Holistic House",robots:{index:false,follow:false}};

const words={
 ru:{title:"Фото и видеокадры по сюжетам",intro:"Инвентаризация 120 сюжетов и очередь поиска фотографий к 480 сценам",
  back:"Видеобиблиотека",json:"Полный план 480 кадров (JSON)",stories:"Сюжеты",beats:"Кадры",
  films:"Локальные видеокомпозиции",stills:"JPG-постеры из видео",photos:"Внешние фотоссылки",
  missing:"Без подходящего фото-кандидата",notReady:"Проверено для окончательного монтажа",
  category:"Покрытие по направлениям",queue:"Какие фотографии нужны",
  currently:"Что уже имеется",ref:"Отдельных фотоссылок",local:"Кадров из реального видео",
  hasVideo:"С подсказкой MP4",hasStill:"С подсказкой фото",need:"Требуют поиска",
  search:"Искать",prompt:"Или сгенерировать",plan:"В полном JSON есть запись для каждого кадра с ID сюжета, мотивом, MP4-кандидатами и очередью фотографий.",
  caveat:"Соответствие сюжету, декодирование JPG, права и пригодность для монтажа пока не проверены. JPG-постер не является отдельной исходной фотографией."},
 en:{title:"Photos and video frames by story",intro:"120 storyboards and a shot-level photo sourcing queue for 480 beats",
  back:"Video library",json:"Full 480-shot plan (JSON)",stories:"Stories",beats:"Beats",
  films:"Local MP4 compositions",stills:"JPG stills from videos",photos:"External photo links",
  missing:"No matching photo candidate",notReady:"Approved final shot bindings",
  category:"Coverage by category",queue:"Photographs to source",currently:"Existing photo references",
  ref:"External photo references",local:"Stills from filmed video",hasVideo:"With MP4 suggestion",
  hasStill:"With photo suggestion",need:"Needs sourcing",search:"Search for",prompt:"Or generate",
  plan:"The full JSON lists every storyboard beat, its motif, video candidates and the photo sourcing brief.",
  caveat:"Story fit, image decoding, specific rights and export readiness have not been checked. A video JPG poster is not an independent source photograph."},
 es:{title:"Fotos y fotogramas por historia",intro:"120 historias y una cola de fotos para 480 escenas",
  back:"Videoteca",json:"Plan completo de 480 escenas (JSON)",stories:"Historias",beats:"Escenas",
  films:"Composiciones MP4 locales",stills:"Fotogramas JPG de vídeos",photos:"Referencias externas",
  missing:"Sin foto candidata",notReady:"Escenas verificadas para exportar",
  category:"Cobertura por categoría",queue:"Fotos que faltan",currently:"Referencias disponibles",
  ref:"Referencias externas",local:"Fotogramas de vídeos",hasVideo:"Con MP4 candidato",
  hasStill:"Con foto candidata",need:"Hay que buscar",search:"Buscar",prompt:"O generar",
  plan:"El JSON incluye cada escena, motivo, candidatos MP4 y sugerencias de fotos.",
  caveat:"No se han verificado los píxeles, los derechos de cada escena ni la exportación. Un fotograma de vídeo no es una fotografía original."}
} as const;
type Locale=keyof typeof words;

export default async function VideoLibraryPhotosPage(){
 if(!await requireAdminRequest())redirect("/admin/login");
 const raw=(await cookies()).get(uiLocaleCookie)?.value;
 const locale:Locale=raw==="en"?"en":raw==="es"?"es":"ru";
 const t=words[locale],report=auditStoryPhotoCoverage(),s=report.summary;
 const stats=[
  {name:t.stories,count:s.scenarios},{name:t.beats,count:s.storyboardBeats},
  {name:t.films,count:s.cataloguedVideoCompositions},
  {name:t.stills,count:s.localCameraSourcePosterReferences},
  {name:t.photos,count:s.externalPhotoSourceReferences},
  {name:t.missing,count:s.beatsWithoutPhotoCandidate},
  {name:t.notReady,count:s.verifiedPhotoBindings},
 ];
 return <main className={styles.page} data-hh-design="holistic-light" lang={locale}>
  <PrescriptionAdminHeader
   title={{ru:words.ru.title,en:words.en.title}}
   description={{ru:words.ru.intro,en:words.en.intro}}/>
  <div className={styles.content}>
   <nav className={styles.links} aria-label={t.title}>
    <Link href="/admin/video-library">{t.back}</Link>
    <Link href="/api/admin/video-library/photos">{t.json}</Link>
   </nav>
   <div className={styles.stats}>{stats.map(item=>
    <div key={item.name} className={styles.stat}>
     <strong>{item.count}</strong><span>{item.name}</span>
    </div>)}</div>
   <p className={styles.disclaimer}>{t.caveat}</p>
   <section className={styles.section}>
    <h1>{t.category}</h1>
    <div className={styles.siteRows}>{report.categories.map(category=>
     <div className={styles.siteRow} key={category.id}>
      <strong>{category.labels[locale]}</strong>
      <span>{category.scenarios} {t.stories.toLowerCase()} · {category.beats} {t.beats.toLowerCase()}</span>
      <small>{t.hasVideo}: {category.beatsWithVideoTagCandidate} · {t.hasStill}: {category.beatsWithLocalStillCandidate+category.beatsWithExternalPhotoReference} · {t.need}: {category.beatsMissingPhotoCandidate}</small>
     </div>)}</div>
   </section>
   <section className={styles.section}>
    <h2>{t.queue} · {s.acquisitionMotifCategoryGroups}</h2>
    <p className={styles.subtle}>{t.plan}</p>
    <ol className={styles.queue}>{report.priorityQueue.slice(0,36).map(item=>
     <li key={item.id}>
      <strong>{item.visualHint[locale]}</strong>
      <span>{report.categories.find(c=>c.id===item.categoryId)?.labels[locale]}</span>
      <small>{item.priority} · {item.missingBeats} {t.beats.toLowerCase()} · {item.exampleScenarioId} #{item.exampleShot}</small>
      <small>{t.search}: {item.searchQuery}</small>
      <small>{t.prompt}: {item.generationBrief}</small>
     </li>)}</ol>
   </section>
   <section className={styles.section}>
    <h2>{t.currently}</h2>
    <p className={styles.subtle}>{s.localCameraSourcePosterReferences} {t.local.toLowerCase()} · {s.externalPhotoSourceReferences} {t.ref.toLowerCase()}.</p>
    <ol className={styles.queue}>{report.sources.localVideoFrameStills.slice(0,9).map(item=>
     <li key={item.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.poster} alt={item.labels[locale]} loading="lazy" width="320" height="180"
       style={{width:"100%",height:"auto",aspectRatio:"16 / 9",objectFit:"cover",borderRadius:"10px"}}/>
      <span>{item.labels[locale]}</span>
      <small>{item.sourceKind} · {item.originEvidence}</small>
     </li>)}</ol>
    <p className={styles.subtle}>{t.ref}: {report.sources.externalPhotoReferences.length} (Pexels; {t.caveat})</p>
   </section>
  </div>
 </main>;
}
