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
      lead: "Read students’ personal reflections and watch their original video reviews. Individual experiences are not guaranteed outcomes.",
      text: "Text reviews",
      video: "Video reviews",
      courseVideos: "Original course reviews",
      seriesVideos: "Eight-part student video diary",
      language: "Original review in English",
    },
    ru: {
      kicker: "Опыт учеников",
      title: "Отзывы о Reiki Yggdrasil",
      lead: "Личные впечатления учеников и видеоотзывы об обучении. Это индивидуальный опыт, а не гарантия результата.",
      text: "Текстовые отзывы",
      video: "Видеоотзывы",
      courseVideos: "Отзывы о курсе",
      seriesVideos: "Восемь частей личного видеоотзыва",
      language: "Оригинал отзыва — на английском",
    },
    es: {
      kicker: "Experiencia de estudiantes",
      title: "Testimonios sobre Reiki Yggdrasil",
      lead: "Lee las experiencias personales de estudiantes y mira sus videos. Los resultados no están garantizados.",
      text: "Testimonios escritos",
      video: "Testimonios en video",
      courseVideos: "Testimonios del curso",
      seriesVideos: "Diario en ocho partes de un estudiante",
      language: "Testimonio original en inglés",
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
    </section>
  );
}
