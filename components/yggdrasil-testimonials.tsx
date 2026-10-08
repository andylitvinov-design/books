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
      lead: "Text excerpts and video reviews preserved from the earlier public Reiki Yggdrasil pages. Text excerpts are short quotations from the original testimonial screenshots.",
      text: "Text reviews",
      video: "Video reviews",
      original: "View original review",
      language: "Original review in English",
    },
    ru: {
      kicker: "Опыт учеников",
      title: "Отзывы о Reiki Yggdrasil",
      lead: "Текстовые выдержки и видеоотзывы, сохранённые с предыдущих публичных страниц Reiki Yggdrasil. Текстовые отзывы показаны как короткие цитаты из исходных скриншотов.",
      text: "Текстовые отзывы",
      video: "Видеоотзывы",
      original: "Открыть оригинал",
      language: "Оригинал отзыва — на английском",
    },
    es: {
      kicker: "Experiencia de estudiantes",
      title: "Testimonios sobre Reiki Yggdrasil",
      lead: "Extractos escritos y testimonios en video conservados de las páginas públicas anteriores de Reiki Yggdrasil.",
      text: "Testimonios escritos",
      video: "Testimonios en video",
      original: "Ver original",
      language: "Testimonio original en inglés",
    },
  }[locale];
  const featuredVideos = yggdrasilVideoTestimonials.slice(0, 2);
  const additionalVideos = yggdrasilVideoTestimonials.slice(2);

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
              <span className="yggdrasil-testimonial-card__quote" aria-hidden="true">“</span>
              <blockquote>{item.quote[locale]}</blockquote>
              <footer>
                <span>{locale === "ru" ? "Отзыв ученика" : locale === "es" ? "Testimonio de estudiante" : "Student review"} {index + 1}</span>
                <small>{copy.language}</small>
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
          {featuredVideos.map((video) => (
            <div className="yggdrasil-testimonial-video" key={video.youtubeId}>
              <span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span>
              <AcademyVideoPlayer youtubeId={video.youtubeId} title={video.title[locale]} />
            </div>
          ))}
        </div>
        {additionalVideos.length ? (
          <details className="yggdrasil-more-testimonials">
            <summary>
              {locale === "ru" ? "Показать дополнительные видеоотзывы" : locale === "es" ? "Ver más testimonios en video" : "More English video reviews"}
              <span>{additionalVideos.length}</span>
            </summary>
            <div className="yggdrasil-video-grid yggdrasil-testimonial-video-grid">
              {additionalVideos.map((video) => (
                <div className="yggdrasil-testimonial-video" key={video.youtubeId}>
                  <span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span>
                  <AcademyVideoPlayer youtubeId={video.youtubeId} title={video.title[locale]} />
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </section>
  );
}
