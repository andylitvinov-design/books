import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

import { SiteVideoPlayer } from "@/components/site-video-player";
import type { Locale } from "@/data/remedies";
import styles from "./personal-testimonials.module.css";

// Existing public first-party About-page testimonials and previously published,
// provenance-checked PsiTrends review videos. Do not invent quotations or outcomes.
// Source list: /en/about, /ru/about, sales/integrations/psitrends-client/reviews.mjs.
// Videos retain their actual audio language and link to the published originals.
const testimonialVideos = {
  ru: [
    { id: "m9RfDgK76PU", title: "Антон Корчинский — отзыв о работе", language: "ru" },
    { id: "5oj0BIbLT4w", title: "Елена Бахтина — отзыв клиента", language: "ru" },
    { id: "MIVLm1GUTtM", title: "Юрий Гончаренко — отзыв клиента", language: "ru" },
    { id: "ttQxUHopaUM", title: "Бизнес-расстановки — отзыв", language: "ru" },
    { id: "VABgpmn4ZYA", title: "Татьяна Разумовская — отзыв о бизнес-консультации", language: "ru" },
    { id: "muOnIHllI7E", title: "Экспресс-диагностика — отзыв", language: "ru" },
  ],
  en: [
    { id: "Dk0LBmOivQo", title: "Business Constellation — testimonial", language: "en" },
    { id: "aUJde6A-9p0", title: "Business consulting — testimonial", language: "en" },
    { id: "fE6sD1zr1Js", title: "Claire — testimonial", language: "en" },
    { id: "itjo2_z2NGk", title: "Experience of working together", language: "en" },
    { id: "4NrryHcEF1A", title: "Psychic Alchemy — testimonial", language: "en" },
    { id: "hYwRNMxIMjc", title: "Family constellations — testimonial", language: "en" },
  ],
} as const;

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
    moreLink: "Больше видео и архивных отзывов",
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
    moreLink: "More videos and archived reviews",
    ctaLink: "Discuss my situation",
  },
} as const;

export function PersonalTestimonials({
  locale,
  variant = "home",
}: {
  locale: Locale;
  variant?: "home" | "services";
}) {
  const current = copy[locale];
  const isHome = variant === "home";
  const videos = isHome ? testimonialVideos[locale] : testimonialVideos[locale].slice(0, 3);
  const titleId = isHome ? "home-testimonials-title" : "services-testimonials-title";

  return (
    <section
      className={styles.section}
      aria-labelledby={titleId}
      id={isHome ? "testimonials" : "client-experiences"}
      data-personal-testimonials={variant}
      lang={locale}
    >
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{current.eyebrow}</p>
        <h2 id={titleId}>{isHome ? current.title : current.serviceTitle}</h2>
        <p>{isHome ? current.lead : current.serviceLead}</p>
      </header>

      <figure className={styles.quoteCard}>
        <span className={styles.quoteIcon} aria-hidden="true"><Quote size={28} strokeWidth={1.4}/></span>
        <div>
          <p className={styles.quoteEyebrow}>{current.storyEyebrow}</p>
          <blockquote className={styles.quoteText}>“{current.storyQuote}”</blockquote>
          <figcaption className={styles.source}>{current.storySource}</figcaption>
        </div>
      </figure>

      <div className={styles.videoHeader}>
        <h3>{current.videoHeading}</h3>
        <span>{current.videoLanguage}</span>
      </div>
      <div className={styles.videoGrid}>
        {videos.map((item) => (
          <div className={styles.videoItem} key={item.id}>
            <SiteVideoPlayer
              video={{ youtubeId: item.id, language: item.language, title: item.title }}
              locale={locale}
              compact
            />
          </div>
        ))}
      </div>

      <p className={styles.disclaimer}>{current.disclaimer}</p>
      <div className={styles.actions}>
        <Link className={styles.more} href={"/" + locale + "/about#testimonials-title"}>
          {current.moreLink}<ArrowRight aria-hidden="true" size={17}/>
        </Link>
        <Link className={styles.contact} href={"/" + locale + "/services/free-situation-review"}>
          {current.ctaLink}<ArrowRight aria-hidden="true" size={17}/>
        </Link>
      </div>
    </section>
  );
}
