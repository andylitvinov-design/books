import { SiteVideoPlayer } from "@/components/site-video-player";
import { englishPsychotherapyLandingVideo, getServiceVideoMedia, type ServiceVideoLocale, type ServiceVideoTopic } from "@/data/service-video-library";
import { siteVideoWatchUrl } from "@/lib/site-videos/model";
import styles from "./service-video-showcase.module.css";

const copy = {
  en: {
    eyebrow: "Watch the approach",
    overview: {
      heading: "How I choose the right method",
      context: "A general introduction to my work. It explains how I approach a question, rather than detailing this particular free service.",
    },
    alchemy: {
      heading: "A closer look at systemic constellations",
      context: "Systemic constellations are one of the approaches offered in an Alchemy of the Soul session. The video explains that method, not the whole three-part service.",
    },
    hypnotherapy: {
      heading: "How I work with guided imagery",
      context: "A short explanation of the hypnotherapy and imagery approach used in individual sessions.",
    },
    constellations: {
      heading: "How systemic constellations work",
      context: "A short explanation of exploring roles, relationships and decisions through symbolic constellations.",
    },
    "constellation-case": {
      heading: "Constellations in practice",
      context: "Business Constellations is the owner-selected video for personal constellations, business mapping and the free express situation review. Symbolic reflections are not a clinical diagnosis.",
    },
    homeopathy: {
      heading: "My approach to homeopathy",
      context: "An educational overview of a complementary symbolic approach, not medical treatment or evidence of clinical effectiveness.",
    },
  },
  ru: {
    eyebrow: "Посмотреть видео",
    overview: {
      heading: "Как я выбираю подходящий метод",
      context: "Общее знакомство с моим подходом, а не отдельная инструкция по этой бесплатной услуге.",
    },
    alchemy: {
      heading: "Как я выбираю метод для личной сессии",
      context: "Это общее видео о сочетании методов. Отдельного русскоязычного ролика именно об «Алхимии души» пока нет.",
    },
    hypnotherapy: {
      heading: "Образная психотерапия — видео о подходе",
      context: "Русскоязычное видео о психотерапии перед выбором формата личной сессии.",
    },
    constellations: {
      heading: "О подходах к личной работе",
      context: "Это общий русскоязычный ролик. Подробное видео о системных расстановках пока доступно на английском.",
    },
    "constellation-case": {
      heading: "Расстановки на практике",
      context: "Видео, выбранное Андреем для знакомства с расстановками, бизнес-расстановками и экспресс-разбором ситуации. Это символический метод исследования запроса, а не медицинская диагностика.",
    },
    homeopathy: {
      heading: "Мой подход к гомеопатии",
      context: "Образовательное знакомство с дополнительной символической практикой, не заменяющей медицинскую помощь.",
    },
  },
  es: {
    eyebrow: "Vídeo · audio en inglés",
    overview: {
      heading: "Cómo elijo el método",
      context: "Introducción general a mi enfoque, no una explicación específica de este servicio gratuito. Audio en inglés.",
    },
    alchemy: {
      heading: "Introducción a las constelaciones sistémicas",
      context: "Las constelaciones son uno de los enfoques de la sesión. El vídeo está en inglés.",
    },
    hypnotherapy: {
      heading: "Cómo trabajo con imágenes e hipnoterapia",
      context: "Una breve explicación del trabajo individual; audio en inglés.",
    },
    constellations: {
      heading: "Constelaciones sistémicas",
      context: "Breve explicación del método, con audio en inglés.",
    },
    "constellation-case": {
      heading: "Constelaciones en la práctica",
      context: "Vídeo Business Constellations, elegido por Andrey para constelaciones personales, empresariales y revisión exprés. No constituye un diagnóstico clínico.",
    },
    homeopathy: {
      heading: "Mi enfoque de la homeopatía",
      context: "Vídeo educativo en inglés. No sustituye la atención médica.",
    },
  },
} as const;

export function ServiceVideoShowcase({
  topic, locale, id = "service-video", variant = "default",
}: {
  topic: ServiceVideoTopic;
  locale: ServiceVideoLocale;
  id?: string;
  variant?: "default" | "psychotherapy-en";
}) {
  const isEnglishPsychotherapy = variant === "psychotherapy-en" && locale === "en" && topic === "hypnotherapy";
  const video = isEnglishPsychotherapy ? englishPsychotherapyLandingVideo : getServiceVideoMedia(topic, locale);
  const t = copy[locale];
  const section = isEnglishPsychotherapy
    ? {heading: "Psychotherapy — a personal introduction", context: "Watch Andrey’s English-language introduction before deciding whether to request an individual session."}
    : t[topic];
  return (
    <section className={styles.section} id={id} data-service-video={topic}
      data-video-kind={video.general ? "general" : "method"} data-psychotherapy-video={isEnglishPsychotherapy ? "en" : undefined} aria-labelledby={id + "-title"} lang={locale}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={id + "-title"}>{section.heading}</h2>
        <p>{section.context}</p>
      </div>
      <div className={styles.player}>
        <SiteVideoPlayer video={video.video} locale={locale}
          textLanguage={video.video.language} compact fallbackPoster={video.poster} />
        {video.video.heygenId && (
          <a className={styles.original} href={siteVideoWatchUrl(video.video)}
            target="_blank" rel="noopener noreferrer">
            {locale === "ru" ? "Открыть оригинальное видео в HeyGen" : locale === "es" ? "Ver el vídeo original en HeyGen" : "Watch the original on HeyGen"}
          </a>
        )}
      </div>
    </section>
  );
}
