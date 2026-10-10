import Image from "next/image";
import Link from "next/link";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";

type Focus = "all" | "flight-to-sun" | "tantra-reiki" | "reiki-yggdrasil";

// English-language editorial paths only. Never pretend an unverified
// historical source is a playable meditation, or use a testimonial as one.
export function EnglishGuidedMeditations({ focus = "all" }: { focus?: Focus }) {
  const entries = englishGuidedMeditations.filter((item) => focus === "all" || focus === item.key);
  const isTantraVideo = focus === "tantra-reiki";
  return (
    <section className={"english-meditation-section" + (isTantraVideo ? " english-meditation-section--video" : "")} aria-labelledby={"english-guided-meditations-" + focus} id={"english-guided-meditations-" + focus}>
      <div className="english-meditation-heading">
        <p className="homeopathy-kicker">Original practices · English</p>
        <h2 id={"english-guided-meditations-" + focus}>{isTantraVideo ? "Tantra Reiki · Level 1 Guided Meditation" : "Guided meditation paths"}</h2>
        <p>{isTantraVideo ? "Follow Andrey’s Level 1 video practice at your own pace, noticing sensations and the rhythm of your breath." : "Explore Andrey’s original English-language guided practices. Videos appear when their YouTube sources are confirmed."}</p>
      </div>
      <div className="english-meditation-list">
        {entries.map((item) => (
          <article className="english-meditation-card" key={item.key}>
            <div className="english-meditation-card__visual">
              {item.youtubeId ? (
                <AcademyVideoPlayer youtubeId={item.youtubeId} title={isTantraVideo ? "Tantra Reiki — Level 1 Guided Meditation" : item.title} />
              ) : isTantraVideo ? (
                <div className="english-meditation-unavailable" role="status">
                  <span className="english-meditation-unavailable__play" aria-hidden="true">▶</span>
                  <strong>Original English meditation</strong>
                  <span>Video source not yet verified</span>
                </div>
              ) : (
                <Image src={item.image} alt="" width={480} height={270} sizes="(max-width: 680px) 100vw, 240px" loading="lazy" />
              )}
            </div>
            <div className="english-meditation-card__copy">
              {!isTantraVideo ? <p className="english-meditation-card__eyebrow">{item.youtubeId ? "Watch the original video" : "Explore the practice"}</p> : null}
              <h3>{isTantraVideo ? "Follow the practice when ready" : item.title}</h3>
              {!isTantraVideo ? <p>{item.description}</p> : null}
              {item.youtubeId && (isTantraVideo || item.key === "reiki-yggdrasil") ? (
                <a href={"https://www.youtube.com/watch?v=" + item.youtubeId} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>
              ) : !item.youtubeId && isTantraVideo ? (
                <a href="https://www.youtube.com/@aatapro/videos" target="_blank" rel="noreferrer">Andrey’s original English video channel ↗</a>
              ) : (
                <Link href={item.courseHref}>Learn about this practice <span aria-hidden="true">→</span></Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
