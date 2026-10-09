import Image from "next/image";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import type { PublicLocale } from "@/lib/public-locales";

const recording = englishGuidedMeditations.find((item) => item.key === "reiki-yggdrasil")!;

const copy = {
  en: {
    eyebrow: "EXPLORE THE PRACTICE",
    title: "Reiki Yggdrasil Meditation",
    description: "Before choosing a course, discover the feeling of the practice. Make room for stillness, follow the image of the World Tree, and explore how attention and imagination can work together.",
    pending: "The original English meditation recording is being verified. It will appear here as a playable video once its exact source is confirmed.",
  },
  ru: {
    eyebrow: "ПОЗНАКОМЬТЕСЬ С ПРАКТИКОЙ",
    title: "Медитация Рейки Иггдрасиль",
    description: "Познакомьтесь с практикой через образ Мирового Древа, спокойное внимание и исследование внутреннего пространства.",
    pending: "Исходное видео медитации проверяется. Когда точная запись будет подтверждена, здесь появится проигрыватель.",
  },
  es: {
    eyebrow: "EXPLORA LA PRÁCTICA",
    title: "Meditación Reiki Yggdrasil",
    description: "Conoce la práctica mediante el Árbol del Mundo, la atención serena y las imágenes del mundo interior.",
    pending: "Se está verificando la grabación original en inglés. El reproductor aparecerá aquí cuando se confirme la fuente.",
  },
} as const;

export function YggdrasilMeditationFeature({ locale }: { locale: PublicLocale }) {
  const c = copy[locale];
  return (
    <section className="yggdrasil-meditation-feature" id="yggdrasil-meditation" aria-labelledby="yggdrasil-meditation-title">
      <div className="yggdrasil-meditation-feature__copy">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="yggdrasil-meditation-title">{c.title}</h2>
        <p>{c.description}</p>
      </div>
      <div className="yggdrasil-meditation-feature__media">
        {recording.youtubeId ? (
          <AcademyVideoPlayer youtubeId={recording.youtubeId} title={recording.title} />
        ) : (
          <div className="yggdrasil-meditation-feature__pending">
            <Image src={recording.image} alt="" fill sizes="(max-width: 767px) 100vw, 800px" loading="lazy" />
            <p>{c.pending}</p>
          </div>
        )}
      </div>
    </section>
  );
}
