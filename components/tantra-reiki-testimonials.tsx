import type { PublicLocale } from "@/lib/public-locales";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";
import englishSource from "@/data/academy/tantra-reiki-ru-en.generated.json";

// Original Russian visitor screenshots and the archive images formerly
// presented alongside individual levels. Keep them out of the curriculum.
const reviewImages = [2, 3, 17, 18, 11, 20, 10, 15, 21, 22] as const;

const sourceReviewGroups = [
  [56, 57],
  [61, 62, 63, 64],
] as const;

const spanishReviewText = [
  [
    "Me siento relajada y descansada. Me miro al espejo y me admiro. En la calle disfruto del viento y del sol. ¡Una sensación de amor incondicional!",
    "¡Gracias, Andrey! Como siempre, todo muy bonito.",
  ],
  [
    "Un flujo parecido a un trance. Entras en otro estado de conciencia y puedes permanecer inmersa en él.",
    "Un flujo suave y cuidadoso que, en mi experiencia, disuelve algunas tensiones al trabajar con una situación.",
    "Durante la activación de la energía sexual sentí pulsaciones y un suave despertar de sensaciones en los centros inferiores.",
    "No llegué a comprender la parte de la atracción. Sentí sensaciones más arriba, en Anahata y Vishuddha, como una apertura y expansión…",
  ],
];

const labels = {
  en: {
    eyebrow: "Participant experiences",
    heading: "Tantra Reiki reviews",
    intro: "Personal experiences shared by participants. Your experience may be different; these accounts are not promised outcomes.",
    quote: "What participants shared",
    photo: "Original photo testimonials",
    video: "Video testimonials",
    language: "Original video · Russian audio",
    native: "Participant video",
    youtube: "Alena · Tantra Reiki testimonial",
  },
  ru: {
    eyebrow: "Впечатления участников",
    heading: "Отзывы о Тантра Рейки",
    intro: "Личные впечатления участников. Опыт может отличаться, отзывы не являются гарантией результата.",
    quote: "Отзывы участников",
    photo: "Фотографии отзывов из архива",
    video: "Видеоотзывы",
    language: "Видео из архива · русский язык",
    native: "Видеоотзыв участника",
    youtube: "Алёна · отзыв о Тантра Рейки",
  },
  es: {
    eyebrow: "Experiencias de participantes",
    heading: "Testimonios de Tantra Reiki",
    intro: "Experiencias personales compartidas por participantes. Los resultados individuales pueden variar.",
    quote: "Lo que compartieron",
    photo: "Testimonios en imágenes",
    video: "Testimonios en vídeo",
    language: "Vídeo original · audio en ruso",
    native: "Vídeo de un participante",
    youtube: "Alena · testimonio de Tantra Reiki",
  },
} as const;

export function TantraReikiTestimonials({ locale }: { locale: PublicLocale }) {
  const l = labels[locale];
  return (
    <section className="tantra-testimonials" id="tantra-testimonials" aria-labelledby="tantra-testimonials-heading">
      <div className="tantra-testimonials__heading">
        <p className="homeopathy-kicker">{l.eyebrow}</p>
        <h2 id="tantra-testimonials-heading">{l.heading}</h2>
        <p>{l.intro}</p>
      </div>

      <h3 className="tantra-testimonials__subheading">{l.quote}</h3>
      <div className="tantra-review-quotes">
        {sourceReviewGroups.map((indices, i) => (
          <blockquote className="tantra-review-quote" key={i}>
            <p className="tantra-review-quote__label">
              {locale === "ru" ? "Тантра Рейки · 1 ступень" : locale === "es" ? "Tantra Reiki · etapa 1" : "Tantra Reiki · Level 1"}
            </p>
            {indices.map((sourceIndex, j) => (
              <p key={sourceIndex}>
                {locale === "ru"
                  ? tantraReikiArchive.blocks.ru[sourceIndex].text
                  : locale === "en"
                    ? englishSource.blocks[sourceIndex].text
                    : spanishReviewText[i][j]}
              </p>
            ))}
          </blockquote>
        ))}
      </div>

      {locale === "ru" ? (
        <div className="tantra-review-archive">
          <h3 className="tantra-testimonials__subheading">{l.photo}</h3>
          <div className="tantra-review-gallery">
            {reviewImages.map((index) => (
              <a href={tantraReikiArchive.images.ru[index]} key={index} target="_blank" rel="noreferrer" aria-label={"Открыть архивное изображение " + index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tantraReikiArchive.images.ru[index]} alt={"Изображение из архива отзывов и практик Тантра Рейки"} loading="lazy" decoding="async" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="tantra-review-video-section">
        <h3 className="tantra-testimonials__subheading">{l.video}</h3>
        <p className="tantra-review-video-note">{l.language}</p>
        <div className="tantra-review-videos">
          {tantraReikiArchive.html5Videos.ru.map((video, i) => (
            <figure className="tantra-review-video" key={video.src}>
              <video controls playsInline preload="none" poster={video.poster ?? undefined}>
                <source src={video.src} type={video.type} />
              </video>
              <figcaption>{l.native} {i + 1}</figcaption>
            </figure>
          ))}
          <figure className="tantra-review-video">
            <AcademyVideoPlayer youtubeId="qM_nFUkYJ1k" title={l.youtube} />
            <figcaption>{l.youtube}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
