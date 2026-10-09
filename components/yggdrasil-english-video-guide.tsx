import Link from "next/link";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import type { PublicLocale } from "@/lib/public-locales";

// Ten archived English clips were confirmed as testimonials, NOT course lectures.
// Keep the authentic level video recordings below, clearly marked as RU audio,
// until individually verified English recordings can replace them.
export function YggdrasilEnglishVideoGuide({
  locale,
  scope,
}: {
  locale: PublicLocale;
  scope: "all" | "basic" | "instructor";
}) {
  if (locale !== "en") return null;
  const instructor = scope === "instructor";
  const level = curriculum.levels.find((item) => item.id === (instructor ? 2 : 1));
  if (!level) return null;
  const slug = instructor ? "instructor-course" : "basic-course";
  return (
    <section className="yggdrasil-english-guide yggdrasil-course-video-library" id={scope === "all" ? "yggdrasil-english-guide" : "yggdrasil-level-video-guide"}>
      <p className="homeopathy-kicker">{instructor ? "Instructor Course · Recorded classes" : "Basic Course · Learn through video"}</p>
      <h2>{instructor ? "Watch the Instructor Course" : "Explore all five Basic Course levels on video"}</h2>
      <p className="yggdrasil-course-video-intro">Watch original recordings alongside the English descriptions of each level. These verified archive lessons currently have Russian audio. English-language recordings are being checked separately and will only be added when their sources are confirmed.</p>
      <div className="yggdrasil-course-video-grid">
        {level.steps.map((step) => {
          const recording = step.video?.videos?.find((item) => Boolean(item.youtubeId));
          return (
            <article className="yggdrasil-course-video-card" key={step.id}>
              <div className="yggdrasil-course-video-card__heading">
                <span>LEVEL {String(step.number).padStart(2, "0")}</span>
                <span>RU audio · Original class</span>
              </div>
              {recording?.youtubeId ? <AcademyVideoPlayer youtubeId={recording.youtubeId} title={"Level " + step.number + " · " + step.title.en + " · Russian original"} /> : <div className="yggdrasil-course-video-empty">Recording unavailable</div>}
              <div className="yggdrasil-course-video-card__copy">
                <h3>{step.title.en}</h3>
                <Link href={"/en/academy/reiki/yggdrasil/" + slug + "#" + step.id.toLowerCase()}>Read the English level guide <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
