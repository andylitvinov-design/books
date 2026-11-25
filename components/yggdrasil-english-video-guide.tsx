import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import type { PublicLocale } from "@/lib/public-locales";

// Ten archived English clips were confirmed as testimonials, NOT course lectures.
// The original course recordings in this section have Russian audio; keep them
// accessible in a clearly labeled, initially collapsed archive.
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
  const recordingCount = level.steps.filter((step) => step.video?.videos?.some((item) => Boolean(item.youtubeId))).length;

  return (
    <section className="yggdrasil-english-guide yggdrasil-course-video-library" id={scope === "all" ? "yggdrasil-english-guide" : "yggdrasil-level-video-guide"}>
      <details className="yggdrasil-russian-video-archive">
        <summary className="yggdrasil-russian-video-archive__summary">
          <span className="yggdrasil-russian-video-archive__copy">
            <span className="homeopathy-kicker">Video archive · Russian audio</span>
            <strong>{instructor ? "Instructor Course video lessons" : "Basic Course video lessons"}</strong>
            <small className="yggdrasil-russian-video-archive__collapsed">Collapsed · {recordingCount} Russian-language videos hidden · Tap to expand</small>
            <small className="yggdrasil-russian-video-archive__expanded">Expanded · Tap to collapse</small>
          </span>
          <span className="yggdrasil-russian-video-archive__toggle">
            <span className="yggdrasil-russian-video-archive__show">Show videos</span>
            <span className="yggdrasil-russian-video-archive__hide">Hide videos</span>
            <ChevronDown size={21} aria-hidden="true" />
          </span>
        </summary>
        <div className="yggdrasil-russian-video-archive__body">
          <p className="yggdrasil-course-video-intro">Original lesson recordings in Russian, with English level titles and descriptions. They are not English-language lessons.</p>
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
        </div>
      </details>
    </section>
  );
}
