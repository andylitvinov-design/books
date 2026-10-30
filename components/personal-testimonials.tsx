import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

import { SiteVideoPlayer } from "@/components/site-video-player";
import { HomeTestimonialMore } from "@/components/home-testimonial-more";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./personal-testimonials.module.css";

// Existing public first-party About-page testimonials and previously published,
// provenance-checked PsiTrends review videos. Do not invent quotations or outcomes.
// Source list: /en/about, /ru/about, sales/integrations/psitrends-client/reviews.mjs.
// Videos retain their actual audio language and link to the published originals.
// Exact first-party video stills from the publicly reviewed PsiTrends testimonial archive.
// A poster is used only for the matching YouTube ID; never swap in unrelated illustrations.
// Two legacy PsiMaster RU clips have no verified archived still and use the normal
// YouTube thumbnail path until a genuine image is available.
export const locallyArchivedVideoPosterIds = new Set([
  "Dk0LBmOivQo", "aUJde6A-9p0", "fE6sD1zr1Js", "itjo2_z2NGk",
  "4NrryHcEF1A", "hYwRNMxIMjc", "MIVLm1GUTtM", "ttQxUHopaUM",
  "VABgpmn4ZYA", "muOnIHllI7E",
]);

export const testimonialVideos = {
  ru: [
    { id: "m9RfDgK76PU", title: "Антон Корчинский — отзыв о работе", language: "ru" },
    { id: "MIVLm1GUTtM", title: "Юрий Гончаренко — отзыв клиента", language: "ru" },
    { id: "ttQxUHopaUM", title: "Бизнес-расстановки — отзыв", language: "ru" },
    { id: "VABgpmn4ZYA", title: "Татьяна Разумовская — отзыв о бизнес-консультации", language: "ru" },
    { id: "muOnIHllI7E", title: "Экспресс-диагностика — отзыв", language: "ru" },
    { id: "5oj0BIbLT4w", title: "Елена Бахтина — отзыв клиента", language: "ru" },
  ],
  en: [
    { id: "Dk0LBmOivQo", title: "Business Constellation — testimonial", language: "en" },
    { id: "aUJde6A-9p0", title: "Business consulting — testimonial", language: "en" },
    { id: "fE6sD1zr1Js", title: "Claire — testimonial", language: "en" },
    { id: "itjo2_z2NGk", title: "Experience of working together", language: "en" },
    { id: "4NrryHcEF1A", title: "Psychic Alchemy — testimonial", language: "en" },
    { id: "hYwRNMxIMjc", title: "Family constellations — testimonial", language: "en" },
  ],
  es: [
    { id: "Dk0LBmOivQo", title: "Constelaciones empresariales — testimonio (en inglés)", language: "en" },
    { id: "aUJde6A-9p0", title: "Consultoría de negocios — testimonio (en inglés)", language: "en" },
    { id: "fE6sD1zr1Js", title: "Claire — testimonio (en inglés)", language: "en" },
    { id: "itjo2_z2NGk", title: "Experiencia de trabajo personal (en inglés)", language: "en" },
    { id: "4NrryHcEF1A", title: "Alquimia psíquica — testimonio (en inglés)", language: "en" },
    { id: "hYwRNMxIMjc", title: "Constelaciones familiares — testimonio (en inglés)", language: "en" },
  ],
} as const;

// Spanish descriptions identify the same source videos; their audio remains Russian.
const spanishRussianVideoTitles: Record<string, string> = {
  m9RfDgK76PU: "Anton Korchinsky — testimonio sobre su experiencia",
  MIVLm1GUTtM: "Yuri Goncharenko — testimonio de cliente",
  ttQxUHopaUM: "Constelaciones empresariales — testimonio",
  VABgpmn4ZYA: "Tatiana Razumovskaya — testimonio de consultoría empresarial",
  muOnIHllI7E: "Diagnóstico breve — testimonio",
  "5oj0BIbLT4w": "Elena Bakhtina — testimonio de cliente",
};

const copy = {
  ru: {
    eyebrow: "Реальные истории",
    title: "Что говорят о работе со мной",
    lead: "Отзывы о личных сессиях, расстановках и обучении. Здесь собраны ранее опубликованные видео и новая история клиента, которой поделились с разрешения автора.",
    serviceTitle: "Личный опыт клиентов",
    serviceLead: "Несколько настоящих отзывов о разных форматах индивидуальной работы — от образных сессий до расстановок.",
    storyEyebrow: "После сессии образной терапии",
    storyQuote: "В сеансе с тобой вылезла тема, что я хочу студию свою для психологии и трансформационных игр. ... Сегодня муж купил мне именно такую студию. ... Не понимаю как это работает, но спасибо тебе.",
    storySource: "Из личного сообщения клиента · опубликовано с разрешения автора · сокращено",
    videoHeading: "Видеоотзывы",
    videoLanguage: "Видео на русском",
    disclaimer: "Каждый отзыв — личный опыт конкретного человека. Внешние события и результаты нельзя приписывать работе на сессии; похожий результат не гарантируется. Отзывы не являются доказательством эффективности лечения.",
    moreLink: "Полный архив отзывов",
    moreToggle: "Смотреть больше отзывов",
    sameLanguageMore: "Ещё видеоотзывы на русском",
    otherLanguageMore: "Отзывы на английском · EN audio",
    ctaLink: "Обсудить мой запрос",
  },
  en: {
    eyebrow: "Real experiences",
    title: "What people share about working with me",
    lead: "Personal experiences with sessions, constellations and learning. These include previously published videos and a new client story shared with permission.",
    serviceTitle: "Experiences of personal work",
    serviceLead: "A few authentic reflections on different ways of working together, including imagery sessions and constellations.",
    storyEyebrow: "After a guided imagery session",
    storyQuote: "During our session, the idea came up that I wanted my own studio for psychology and transformational games. ... Today my husband bought exactly that kind of studio for me. ... I don't understand how it works, but thank you.",
    storySource: "Client's private message · shared with permission · abridged and translated from Russian",
    videoHeading: "Video testimonials",
    videoLanguage: "Audio in English",
    disclaimer: "These are individual experiences, not typical or guaranteed outcomes. An external event cannot be attributed to the session. Testimonials are not evidence of medical treatment effectiveness.",
    moreLink: "Complete testimonial archive",
    moreToggle: "Watch more testimonials",
    sameLanguageMore: "More testimonials in English",
    otherLanguageMore: "Testimonials in Russian · RU audio",
    ctaLink: "Discuss my situation",
  },
  es: {
    eyebrow: "Experiencias reales",
    title: "Lo que comparten quienes han trabajado conmigo",
    lead: "Experiencias de sesiones individuales, constelaciones y formación. Incluye vídeos publicados anteriormente y un testimonio escrito compartido con permiso.",
    serviceTitle: "Experiencias del trabajo personal",
    serviceLead: "Testimonios auténticos sobre diversas formas de trabajo, desde las imágenes guiadas hasta las constelaciones.",
    storyEyebrow: "Después de una sesión con imágenes guiadas",
    storyQuote: "Durante nuestra sesión surgió el deseo de tener mi propio estudio de psicología y juegos transformacionales. ... Hoy mi esposo me compró precisamente ese estudio. ... No entiendo cómo funciona, pero gracias.",
    storySource: "Mensaje privado de una clienta · compartido con permiso · abreviado y traducido del ruso",
    videoHeading: "Testimonios en vídeo",
    videoLanguage: "Audio original en inglés",
    disclaimer: "Estas son experiencias individuales, no resultados habituales ni garantizados. No es posible atribuir acontecimientos externos a una sesión. Los testimonios no demuestran eficacia médica.",
    moreLink: "Archivo completo de testimonios",
    moreToggle: "Ver más testimonios",
    sameLanguageMore: "Más testimonios en inglés",
    otherLanguageMore: "Testimonios en ruso · audio en ruso",
    ctaLink: "Consultar mi situación",
  },
} as const;

export function PersonalTestimonials({
  locale,
  variant = "home",
}: {
  locale: PublicLocale;
  variant?: "home" | "services" | "all" | "about";
}) {
  const current = copy[locale];
  const isHome = variant === "home";
  const isAbout = variant === "about";
  const isFullArchive = isAbout || variant === "all";
  const videos = isHome ? testimonialVideos[locale].slice(0, 4) : testimonialVideos[locale].slice(0, 4);
  // Full consultation landing: show all 12 provenance-checked videos, not the compact home/services subset.
  const presentedVideos = isFullArchive
    ? [...testimonialVideos[locale], ...testimonialVideos[locale === "ru" ? "en" : "ru"]]
    : videos;
  // On About, use only genuine, matching local video stills. Never render a blank archived photo.
  const visibleVideos = (isAbout ? presentedVideos.filter((item) => locallyArchivedVideoPosterIds.has(item.id)) : presentedVideos)
    .map(item => locale === "es" && item.language === "ru"
      ? { ...item, title: spanishRussianVideoTitles[item.id] ?? item.title }
      : item);
  // Home shows four matching-audio originals, with every other archived clip available in-place.
  const remainingHomeVideos = isHome ? testimonialVideos[locale].slice(4) : [];
  const otherLanguageVideos = isHome ? testimonialVideos[locale === "ru" ? "en" : "ru"] : [];
  const titleId = isAbout ? "testimonials-title" : isHome ? "home-testimonials-title" : "services-testimonials-title";

  const renderVideoCards = (
    items: ReadonlyArray<{ id: string; title: string; language: "en" | "ru" }>,
    showLanguage = false,
  ) => items.map((item) => (
    <div className={styles.videoItem} key={item.id} data-testimonial-video-id={item.id}>
      {showLanguage ? (
        <p className={styles.videoLanguageTag}>
          {item.language === "ru"
            ? locale === "ru" ? "Русский · RU" : locale === "es" ? "Ruso · RU" : "Russian · RU"
            : locale === "ru" ? "Английский · EN" : locale === "es" ? "Inglés · EN" : "English · EN"}
        </p>
      ) : null}
      <SiteVideoPlayer
        video={{ youtubeId: item.id, language: item.language, title: item.title }}
        locale={locale}
        compact
        minimal={isAbout}
        internalOnly={isAbout}
        fallbackPoster={locallyArchivedVideoPosterIds.has(item.id) ? `/images/holistic-house/testimonial-posters/${item.id}.webp` : undefined}
      />
    </div>
  ));

  const story = (
      <figure className={styles.quoteCard}>
        <span className={styles.quoteIcon} aria-hidden="true"><Quote size={28} strokeWidth={1.4}/></span>
        <div>
          <p className={styles.quoteEyebrow}>{current.storyEyebrow}</p>
          <blockquote className={styles.quoteText}>“{current.storyQuote}”</blockquote>
          <figcaption className={styles.source}>{current.storySource}</figcaption>
        </div>
      </figure>
  );

  return (
    <section
      className={styles.section}
      aria-labelledby={titleId}
      id={isHome ? "testimonials" : isAbout ? "about-testimonials" : "client-experiences"}
      data-personal-testimonials={variant}
      lang={locale}
    >
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{current.eyebrow}</p>
        <h2 id={titleId}>{isHome || isFullArchive ? current.title : current.serviceTitle}</h2>
        <p>{isAbout ? (locale === "ru" ? "Письменный отзыв, опубликованный с разрешения автора, и 10 оригинальных видеоотзывов — здесь, на Holistic House." : locale === "es" ? "Un testimonio escrito compartido con permiso y 10 testimonios reales en vídeo, disponibles aquí en Holistic House." : "A written client story shared with permission and 10 original video reviews — all here on Holistic House.") : variant === "all" ? (locale === "ru" ? "12 настоящих видеоотзывов на русском и английском. История клиента — по нажатию." : locale === "es" ? "12 testimonios reales en vídeo, con audio en inglés y ruso. Pulsa para leer una historia personal." : "12 authentic video testimonials in English and Russian. Tap to read a client story.") : isHome ? current.lead : current.serviceLead}</p>
      </header>

      {variant === "all" ? (
        <details className={styles.storyDisclosure}>
          <summary>{locale === "ru" ? "Прочитать личную историю клиента" : locale === "es" ? "Leer una historia personal" : "Read a personal client story"}</summary>
          {story}
        </details>
      ) : story}

      <div className={styles.videoHeader}>
        <h3>{current.videoHeading}</h3>
        <span>{isAbout ? (locale === "ru" ? "10 видео · RU/EN" : locale === "es" ? "10 vídeos · audio RU/EN" : "10 videos · RU/EN audio") : variant === "all" ? (locale === "ru" ? "12 видео · русский и английский" : locale === "es" ? "12 vídeos · audio en inglés y ruso" : "12 videos · English and Russian audio") : current.videoLanguage}</span>
      </div>
      {isAbout && <p className={styles.swipeHint}>{locale === "ru" ? "Листайте видеоотзывы в сторону →" : locale === "es" ? "Desliza para ver más testimonios →" : "Swipe or scroll to see all video reviews →"}</p>}
      <div className={styles.videoGrid}
        data-vertical-review-list={variant === "all" ? "" : undefined}
        role={isFullArchive ? "region" : undefined}
        aria-label={isFullArchive ? (locale === "ru" ? `Все ${visibleVideos.length} видеоотзывов` : locale === "es" ? `Los ${visibleVideos.length} testimonios en vídeo` : `All ${visibleVideos.length} video testimonials`) : undefined}
        tabIndex={isAbout ? 0 : undefined}>
        {renderVideoCards(visibleVideos, isFullArchive)}
      </div>

      {isHome && (
        <HomeTestimonialMore
          locale={locale}
          title={current.moreToggle}
          sameLanguageTitle={current.sameLanguageMore}
          otherLanguageTitle={current.otherLanguageMore}
          remainingVideos={remainingHomeVideos.map((item) => ({
            ...item,
            fallbackPoster: locallyArchivedVideoPosterIds.has(item.id)
              ? "/images/holistic-house/testimonial-posters/" + item.id + ".webp"
              : undefined,
          }))}
          otherLanguageVideos={otherLanguageVideos.map((item) => ({
            ...item,
            fallbackPoster: locallyArchivedVideoPosterIds.has(item.id)
              ? "/images/holistic-house/testimonial-posters/" + item.id + ".webp"
              : undefined,
          }))}
        />
      )}

      {variant === "services" && (
        <details className={styles.moreVideos} data-more-services-testimonials>
          <summary>{current.moreToggle}
            <span>+{testimonialVideos[locale].length - videos.length}</span>
          </summary>
          <div className={styles.videoGrid} role="region"
            aria-label={locale === "ru" ? "Дополнительные видеоотзывы" : "Additional video testimonials"} tabIndex={0}>
            {renderVideoCards(testimonialVideos[locale].slice(4))}
          </div>
        </details>
      )}

      <p className={styles.disclaimer}>{current.disclaimer}</p>
      <div className={styles.actions}>
        {!isAbout && <Link prefetch={false} className={styles.more} href={"/" + locale + "/about#testimonials-title"}>
          {current.moreLink}<ArrowRight aria-hidden="true" size={17}/>
        </Link>}
        <Link prefetch={false} className={styles.contact} href={variant === "all" ? "#request-free-review" : "/" + locale + "/services/free-situation-review"}>
          {current.ctaLink}<ArrowRight aria-hidden="true" size={17}/>
        </Link>
      </div>
    </section>
  );
}
