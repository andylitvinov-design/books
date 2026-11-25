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
    pending: "The original recording is temporarily unavailable. You can also view Andrey’s meditation on YouTube.",
    watch: "Watch the original on YouTube", language: "Original recording · English",
  },
  ru: {
    eyebrow: "ПОЗНАКОМЬТЕСЬ С ПРАКТИКОЙ",
    title: "Медитация Рейки Иггдрасиль",
    description: "Познакомьтесь с практикой через образ Мирового Древа, спокойное внимание и исследование внутреннего пространства.",
    pending: "Оригинальная запись временно недоступна. Медитацию также можно посмотреть на YouTube.",
    watch: "Смотреть оригинал на YouTube", language: "Оригинальная запись · английский",
  },
  es: {
    eyebrow: "EXPLORA LA PRÁCTICA",
    title: "Meditación Reiki Yggdrasil",
    description: "Conoce la práctica mediante el Árbol del Mundo, la atención serena y las imágenes del mundo interior.",
    pending: "La grabación original no está disponible temporalmente. También puedes verla en YouTube.",
    watch: "Ver el original en YouTube", language: "Grabación original · inglés",
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
      {recording.youtubeId ? <div className="yggdrasil-meditation-feature__source">
        <span>{c.language}</span>
        <a href={"https://www.youtube.com/watch?v=" + recording.youtubeId} target="_blank" rel="noopener noreferrer">{c.watch} ↗</a>
      </div> : null}
    </section>
  );
}
