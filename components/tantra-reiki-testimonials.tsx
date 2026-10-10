import type { PublicLocale } from "@/lib/public-locales";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";
import englishSource from "@/data/academy/tantra-reiki-ru-en.generated.json";

// Text testimonials are shown once; archived screenshots of the same messages
// stay in the source JSON, while real festival photos appear in the level stories.
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
    eyebrow: "Words from our students",
    heading: "Tantra Reiki testimonials",
    intro: "Personal experiences shared by participants. Your experience may be different; these accounts are not promised outcomes.",
    quote: "Level 1 · participant reflections",
    video: "Video testimonials",
    language: "Original video · Russian audio",
    native: "Participant video",
    youtube: "Alena · Tantra Reiki testimonial",
  },
  ru: {
    eyebrow: "Впечатления участников",
    heading: "Отзывы участников Тантра Рейки",
    intro: "Личные впечатления участников. Опыт может отличаться, отзывы не являются гарантией результата.",
    quote: "1 ступень · личные впечатления",
    video: "Видеоотзывы",
    language: "Видео из архива · русский язык",
    native: "Видеоотзыв участника",
    youtube: "Алёна · отзыв о Тантра Рейки",
  },
  es: {
    eyebrow: "Experiencias de participantes",
    heading: "Experiencias con Tantra Reiki",
    intro: "Experiencias personales compartidas por participantes. Los resultados individuales pueden variar.",
    quote: "Etapa 1 · testimonios escritos",
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
