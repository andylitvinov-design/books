import type {PublicLocale} from "@/lib/public-locales";
import standards from "@/data/video-catalog/standard-motion-films-v1.json";
import css from "./mandala-openmotion-picker.module.css";

type Master=(typeof standards.films)[number]["publishedMaster"];

export function getPublishedStandardMotionFilm(id:string,locale?:PublicLocale){
  const film=standards.films.find(entry=>entry.id===id);
  const master=film?.publishedMaster;
  if(!film||!master?.sha256||film.rightsPolicy!=="existing_approved_first_party_masters"||
    (locale&&master.locale!==locale))return undefined;
  return master;
}

const copy={
  en:{publishedFilm:"Ready filmed Anti-stress video",publishedNote:"Fixed 30-second film with English captions. No phone render, personalization or credit hold.",downloadPublished:"Download finished MP4"},
  ru:{publishedFilm:"Готовый видеофильм «Антистресс»",publishedNote:"30 секунд, английские титры. Без генерации на телефоне, персонализации и списания кредитов.",downloadPublished:"Скачать готовый MP4"},
  es:{publishedFilm:"Vídeo Antiestrés terminado",publishedNote:"Película de 30 s con subtítulos en inglés. Sin exportación móvil, personalización ni créditos.",downloadPublished:"Descargar MP4 listo"},
} as const;

export function PublishedStandardMotionFilm({locale,master}:{locale:PublicLocale;master:Master}){
  const text=copy[locale];
  return <div className={css.publishedMaster} data-openmotion-standard-master lang={locale}>
    <strong>{text.publishedFilm}</strong>
    <video controls playsInline preload="metadata" src={master.path}
      poster="/videos/holistic-house/film-collection-v2/mountain-air.jpg" aria-label={text.publishedFilm}/>
    <p>{text.publishedNote}</p>
    <a href={master.path} download>{text.downloadPublished}</a>
  </div>;
}
