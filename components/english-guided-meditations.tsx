import Image from "next/image";
import Link from "next/link";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";

type Focus = "all" | "flight-to-sun" | "tantra-reiki" | "reiki-yggdrasil";

// English-language editorial paths only. Never pretend an unverified
// historical source is a playable meditation, or use a testimonial as one.
export function EnglishGuidedMeditations({ focus = "all" }: { focus?: Focus }) {
  const entries = englishGuidedMeditations.filter((item) => focus === "all" || focus === item.key);
  return (
    <section className="english-meditation-section" aria-labelledby={"english-guided-meditations-" + focus} id={"english-guided-meditations-" + focus}>
      <div className="english-meditation-heading">
        <p className="homeopathy-kicker">Original practices · English</p>
        <h2 id={"english-guided-meditations-" + focus}>Guided meditation paths</h2>
        <p>Explore the ideas behind Andrey’s guided meditations. Original recordings are displayed here only when their English-language YouTube sources are verified.</p>
      </div>
      <div className="english-meditation-list">
        {entries.map((item) => (
          <article className="english-meditation-card" key={item.key}>
            <div className="english-meditation-card__visual">
              {item.youtubeId ? (
                <AcademyVideoPlayer youtubeId={item.youtubeId} title={item.title} />
              ) : (
                <Image src={item.image} alt="" width={480} height={270} sizes="(max-width: 680px) 100vw, 240px" loading="lazy" />
              )}
            </div>
            <div className="english-meditation-card__copy">
              <p className="english-meditation-card__eyebrow">{item.youtubeId ? "Watch the original meditation" : "Explore the practice"}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link href={item.courseHref}>Learn about this practice <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
