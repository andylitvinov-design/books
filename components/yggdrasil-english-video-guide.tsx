import { AcademyVideoPlayer } from "@/components/academy-video-player";
import {
  yggdrasilEnglishOverviewVideos,
  yggdrasilLegacyEnglishVideoSource,
} from "@/data/academy/yggdrasil-legacy-english-videos";
import type { PublicLocale } from "@/lib/public-locales";

export function YggdrasilEnglishVideoGuide({
  locale,
  compact = false,
}: {
  locale: PublicLocale;
  compact?: boolean;
}) {
  const copy = {
    en: {
      kicker: "Original English video archive",
      title: "Reiki Yggdrasil explained in English",
      lead: "English-language videos preserved from Andrii Litvinov’s earlier Reiki Yggdrasil site. They cover the system, the name Reiki Yggdrasil, personal experience with the method, attunements and course testimonials.",
      source: "Legacy source: PsiTrends · Master of Reiki Yggdrasil",
    },
    ru: {
      kicker: "Оригинальный английский видеоархив",
      title: "Reiki Yggdrasil — объяснения на английском",
      lead: "Англоязычные видео Андрея Литвинова, сохранённые с предыдущей страницы Reiki Yggdrasil: о системе, названии Reiki Yggdrasil, настройках и опыте курса.",
      source: "Архивный источник: PsiTrends · Master of Reiki Yggdrasil",
    },
    es: {
      kicker: "Archivo original de videos en inglés",
      title: "Reiki Yggdrasil explicado en inglés",
      lead: "Videos históricos en inglés de Andrii Litvinov sobre el sistema, las sintonizaciones y la experiencia del curso.",
      source: "Fuente histórica: PsiTrends · Master of Reiki Yggdrasil",
    },
  }[locale];

  const videos = compact
    ? yggdrasilEnglishOverviewVideos.filter((video) => video.kind !== "testimonial").slice(0, 4)
    : yggdrasilEnglishOverviewVideos;

  return (
    <section className={"yggdrasil-english-guide" + (compact ? " yggdrasil-english-guide--compact" : "")}>
      <div className="yggdrasil-english-guide__heading">
        <div>
          <p className="homeopathy-kicker">{copy.kicker}</p>
          <h2>{copy.title}</h2>
          <p>{copy.lead}</p>
        </div>
        <a href={yggdrasilLegacyEnglishVideoSource} target="_blank" rel="noreferrer">{copy.source}<span aria-hidden="true">↗</span></a>
      </div>
      <div className="yggdrasil-video-language-heading yggdrasil-video-language-heading--guide">
        <div>
          <span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span>
        </div>
        <small>{videos.length}</small>
      </div>
      <div className="yggdrasil-video-grid yggdrasil-video-grid--guide">
        {videos.map((video) => (
          <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId} title={"EN · " + video.title} />
        ))}
      </div>
    </section>
  );
}
