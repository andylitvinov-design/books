import { SiteVideoPlayer } from "@/components/site-video-player";
import { getServiceVideoMedia, type ServiceVideoLocale, type ServiceVideoTopic } from "@/data/service-video-library";
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
      heading: "О подходах к личной работе",
      context: "Это общий русскоязычный ролик о выборе метода. Специальное объяснение гипнотерапии доступно на английском.",
    },
    constellations: {
      heading: "О подходах к личной работе",
      context: "Это общий русскоязычный ролик. Подробное видео о системных расстановках пока доступно на английском.",
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
    homeopathy: {
      heading: "Mi enfoque de la homeopatía",
      context: "Vídeo educativo en inglés. No sustituye la atención médica.",
    },
  },
} as const;

export function ServiceVideoShowcase({
  topic, locale, id = "service-video",
}: {
  topic: ServiceVideoTopic;
  locale: ServiceVideoLocale;
  id?: string;
}) {
  const video = getServiceVideoMedia(topic, locale);
  const t = copy[locale];
  const section = t[topic];
  return (
    <section className={styles.section} id={id} data-service-video={topic}
      data-video-kind={video.general ? "general" : "method"} aria-labelledby={id + "-title"} lang={locale}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={id + "-title"}>{section.heading}</h2>
        <p>{section.context}</p>
      </div>
      <div className={styles.player}>
        <SiteVideoPlayer video={video.video} locale={locale}
          textLanguage={video.video.language} compact fallbackPoster={video.poster} />
      </div>
    </section>
  );
}
