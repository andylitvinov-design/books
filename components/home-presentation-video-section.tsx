import { SiteVideoPlayer } from "@/components/site-video-player";
import { videoKey, type PublishedSiteVideo } from "@/lib/site-videos/model";
import { getPublishedSiteVideo } from "@/lib/site-videos/public";

// This precise Russian film was approved by the owner and published as an
// Unlisted YouTube video on 2026-10-30. Never use a temporary HeyGen MP4 URL.
const approvedRussianPresentation: PublishedSiteVideo = {
  youtubeId: "G0Db6yOCMto",
  title: "Holistic House — Начните с себя",
  description: "Знакомство с Holistic House: энергия, отношения, работа, смысл и первый бесплатный личный тест.",
  language: "ru",
  durationSeconds: 96.862,
  transcript: [
    "Когда в жизни слишком много стресса, мы быстро устаём и теряем энергию. А ведь так хочется чувствовать спокойствие, внутреннюю силу и снова радоваться каждому дню.",
    "Не менее важны и наши отношения. Нам всем хочется любви, тепла, доверия и близости с дорогими людьми.",
    "В работе и финансах мы тоже стремимся к большему — раскрывать свои способности, увереннее двигаться к целям, находить новые возможности для роста и благополучия.",
    "И, конечно, хочется чувствовать, что жизнь наполнена смыслом, понимать своё призвание и двигаться к тому, что действительно вдохновляет.",
    "Именно для этого мы создали Holistic House — пространство, где всё начинается с вас.",
    "С личного анализа, понимания своих потребностей, поиска внутренней опоры и выбора пути к изменениям.",
    "Здесь вы можете подобрать персональную видеотерапию с образами и поддерживающими фразами, медитации и практики разных мастеров, энергетическую поддержку, индивидуальные сессии или обучающие курсы.",
    "И самое приятное — вам не нужно разбираться во всём самостоятельно.",
    "Начните с бесплатного личного теста. Он поможет лучше понять своё состояние, определить, что сейчас для вас важнее всего, и наметить собственный план развития.",
    "Добро пожаловать в Holistic House!",
    "Познайте себя, найдите свою опору и откройте новые возможности для своей жизни.",
  ].join("\n\n"),
};

const copy = {
  ru: { kicker: "Знакомство с Holistic House", title: "Начните с себя" },
  en: { kicker: "Discover Holistic House", title: "It starts with you" },
} as const;

/**
 * The previous 29-second EN "Deeper Personal Work" video was withdrawn from
 * the homepage. The translated 91-second EN narration exists but its actual
 * movie has NOT been assembled/published, so it must not be faked by showing
 * the Russian movie or the old short EN clip.
 *
 * Once the approved EN film is QA-cleared and published through the
 * existing admin slot, record its EXACT verified YouTube ID here in a reviewed
 * code change. Do not allow any arbitrary owner/admin edit to become a
 * substitute for the first full EN presentation. Publication is a separate
 * explicit gate.
 */
const approvedEnglishYoutubeId: string = "";

function isApprovedEnglishPresentation(video: PublishedSiteVideo | undefined): video is PublishedSiteVideo {
  return Boolean(
    approvedEnglishYoutubeId &&
    video?.language === "en" &&
    video.youtubeId === approvedEnglishYoutubeId &&
    !video.heygenId &&
    (video.durationSeconds ?? 0) >= 70,
  );
}

export async function HomePresentationVideoSection({ locale }: { locale: "en" | "ru" }) {
  // Do not even READ an old or arbitrary admin home-intro record before
  // the finished English film's identity has been explicitly approved.
  if (locale === "en" && !approvedEnglishYoutubeId) return null;
  let video: PublishedSiteVideo;
  if (locale === "ru") {
    video = approvedRussianPresentation;
  } else {
    const published = await getPublishedSiteVideo(videoKey("home-intro", "en"));
    if (!isApprovedEnglishPresentation(published)) return null;
    video = published;
  }

  const text = copy[locale];
  return (
    <section className="service-home-video home-presentation-video" aria-labelledby="home-presentation-video-title"
      data-video-slot="home-presentation" data-video-locale={locale}>
      <header>
        <p className="service-home-kicker">{text.kicker}</p>
        <h2 id="home-presentation-video-title">{text.title}</h2>
      </header>
      <SiteVideoPlayer video={video} locale={locale} />
    </section>
  );
}
