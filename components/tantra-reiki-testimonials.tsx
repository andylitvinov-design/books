import type { PublicLocale } from "@/lib/public-locales";
import { TantraLearnerReviewCards } from "@/components/tantra-learner-review-cards";
import { TantraVideoTestimonials } from "@/components/tantra-video-testimonials";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";

// Learner accounts come from the same unabridged archive used in the Reiki
// Practitioner course. Video comments remain separate from written reviews.
const videoCopy = {
  en: { title: "Video testimonials · original Russian audio", language: "Original video · Russian audio", native: "Participant video", youtube: "Alena · Tantra Reiki testimonial · Russian audio" },
  ru: { title: "Видеоотзывы · оригинал на русском", language: "Видео из архива · русский язык", native: "Видеоотзыв участника", youtube: "Алёна · отзыв о Тантра Рейки" },
  es: { title: "Testimonios en vídeo · audio original en ruso", language: "Vídeo original · audio en ruso", native: "Vídeo de un participante", youtube: "Alena · testimonio de Tantra Reiki" },
} as const;

export function TantraReikiTestimonials({ locale }: { locale: PublicLocale }) {
  const v = videoCopy[locale];
  return (
    <section className="tantra-testimonials" id="tantra-testimonials" aria-labelledby="tantra-testimonials-heading">
      <TantraLearnerReviewCards locale={locale} headingId="tantra-testimonials-heading" />
      <TantraVideoTestimonials
        key={locale}
        initiallyOpen={locale !== "en"}
        summary={v.title}
        language={v.language}
        nativeLabel={v.native}
        nativeSuffix={locale === "en" ? " · Russian audio" : ""}
        youtubeTitle={v.youtube}
        videos={tantraReikiArchive.html5Videos.ru}
      />
    </section>
  );
}
