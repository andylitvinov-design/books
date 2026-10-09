import { Fragment } from "react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import {
  yggdrasilTextTestimonials,
  yggdrasilVideoTestimonials,
} from "@/data/academy/yggdrasil-testimonials";
import type { PublicLocale } from "@/lib/public-locales";

export function YggdrasilTestimonials({ locale }: { locale: PublicLocale }) {
  const copy = {
    en: {
      kicker: "Student experience",
      title: "Reviews from Reiki Yggdrasil students",
      lead: "What was the learning journey like for others? Explore their own words and watch every original video reflection.",
      text: "Text reviews",
      video: "Video reviews",
      courseVideos: "Original course reviews",
      seriesVideos: "Eight-part student video diary",
      original: "View original review",
      language: "Original review in English",
      historical: "More student accounts in the original SuperSkills archive",
      historicalNote: "Older student reports are personal experiences, not guaranteed outcomes. Read the complete sources in their original context.",
      archiveOne: "Historical student reports · Part 1",
      archiveTwo: "Historical student reports · Part 2",
    },
    ru: {
      kicker: "Опыт учеников",
      title: "Отзывы о Reiki Yggdrasil",
      lead: "Каким оказался этот путь для учеников? Прочитайте их собственные слова и посмотрите все оригинальные видеоотзывы.",
      text: "Текстовые отзывы",
      video: "Видеоотзывы",
      courseVideos: "Отзывы о курсе",
      seriesVideos: "Восемь частей личного видеоотзыва",
      original: "Открыть оригинал",
      language: "Оригинал отзыва — на английском",
      historical: "Другие отзывы из исходного архива SuperSkills",
      historicalNote: "Это личные свидетельства учеников, а не гарантия результата. Полные версии доступны на сайте-источнике.",
      archiveOne: "Исторические отзывы · Часть 1",
      archiveTwo: "Исторические отзывы · Часть 2",
    },
    es: {
      kicker: "Experiencia de estudiantes",
      title: "Testimonios sobre Reiki Yggdrasil",
      lead: "Descubre las reflexiones personales de estudiantes y mira todos sus testimonios en video.",
      text: "Testimonios escritos",
      video: "Testimonios en video",
      courseVideos: "Testimonios del curso",
      seriesVideos: "Diario en ocho partes de un estudiante",
      original: "Ver original",
      language: "Testimonio original en inglés",
      historical: "Más experiencias en el archivo original SuperSkills",
      historicalNote: "Son experiencias personales históricas, no resultados garantizados. Lee las fuentes completas.",
      archiveOne: "Experiencias originales · Parte 1",
      archiveTwo: "Experiencias originales · Parte 2",
    },
  }[locale];
  return (
    <section className="yggdrasil-testimonials" id="yggdrasil-testimonials">
      <div className="yggdrasil-testimonials__heading">
        <p className="homeopathy-kicker">{copy.kicker}</p>
        <h2>{copy.title}</h2>
        <p>{copy.lead}</p>
      </div>

      <section className="yggdrasil-testimonials__text-group" aria-labelledby="yggdrasil-text-reviews">
        <div className="yggdrasil-testimonials__section-title">
          <h3 id="yggdrasil-text-reviews">{copy.text}</h3>
          <span>{yggdrasilTextTestimonials.length}</span>
        </div>
        <div className="yggdrasil-testimonial-grid">
          {yggdrasilTextTestimonials.map((item, index) => (
            <article className="yggdrasil-testimonial-card" key={item.id}>
              <div className="yggdrasil-testimonial-card__top"><span>{locale === "ru" ? "Слова ученика" : locale === "es" ? "La voz del estudiante" : "In their own words"}</span><span>{String(index + 1).padStart(2, "0")} / {String(yggdrasilTextTestimonials.length).padStart(2, "0")}</span></div>
              <span className="yggdrasil-testimonial-card__quote" aria-hidden="true">“</span>
              <blockquote>{item.quote[locale]}</blockquote>
              <footer>
                <span>{locale === "ru" ? "Участник курса" : locale === "es" ? "Participante del curso" : "Course participant"}</span>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">{copy.original}<span aria-hidden="true">↗</span></a>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="yggdrasil-testimonials__video-group" aria-labelledby="yggdrasil-video-reviews">
        <div className="yggdrasil-testimonials__section-title">
          <h3 id="yggdrasil-video-reviews">{copy.video}</h3>
          <span>{yggdrasilVideoTestimonials.length}</span>
        </div>
        <div className="yggdrasil-video-grid yggdrasil-testimonial-video-grid">
          {yggdrasilVideoTestimonials.map((video, index) => (
            <Fragment key={video.youtubeId}>
              {index === 0 ? <h4 className="yggdrasil-review-series-heading">{copy.courseVideos}</h4> : null}
              {index === 2 ? <h4 className="yggdrasil-review-series-heading">{copy.seriesVideos}</h4> : null}
              <div className="yggdrasil-testimonial-video">
                <span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span>
                <AcademyVideoPlayer youtubeId={video.youtubeId} title={video.title[locale]} />
              </div>
            </Fragment>
          ))}
        </div>
      </section>
      <div className="yggdrasil-testimonials__historical-links">
        <div>
          <strong>{copy.historical}</strong>
          <p>{copy.historicalNote}</p>
        </div>
        <div className="yggdrasil-testimonials__historical-actions">
          <a href="https://superskills.vip/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/testimonials-1.html" target="_blank" rel="noopener noreferrer">{copy.archiveOne} ↗</a>
          <a href="https://superskills.vip/shamanic-energy-healing-free-program/free-trial-runic-reiki-energy-healing-class/testimonials-2.html" target="_blank" rel="noopener noreferrer">{copy.archiveTwo} ↗</a>
        </div>
      </div>
    </section>
  );
}
