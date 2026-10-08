import { AcademyVideoPlayer } from "@/components/academy-video-player";
import {
  yggdrasilEnglishOverviewVideos,
  yggdrasilEnglishStepVideos,
  yggdrasilLegacyEnglishVideoSource,
  type YggdrasilLegacyVideo,
} from "@/data/academy/yggdrasil-legacy-english-videos";
import type { PublicLocale } from "@/lib/public-locales";

type GuideScope = "all" | "basic" | "instructor";

type VideoTopic = {
  key: string;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
  videos: YggdrasilLegacyVideo[];
};

const overviewVideos = yggdrasilEnglishOverviewVideos.filter((video) => video.kind === "overview");
const attunementOverview = yggdrasilEnglishOverviewVideos.filter((video) => video.kind === "attunement");

const topics: VideoTopic[] = [
  {
    key: "general",
    title: {
      en: "General introduction",
      ru: "Общее описание системы",
      es: "Introducción general",
    },
    description: {
      en: "What Reiki Yggdrasil is, why the system uses the word Reiki, and how Andrii compares it with other modalities.",
      ru: "Что такое Reiki Yggdrasil, почему система называется Reiki и чем Андрей отличает её от других подходов.",
      es: "Qué es Reiki Yggdrasil, por qué usa el nombre Reiki y cómo se compara con otros métodos.",
    },
    videos: overviewVideos,
  },
  {
    key: "basic-level-1",
    title: {
      en: "Basic Course · Level 1 · Healing",
      ru: "Базовый курс · 1 ступень · Лечение",
      es: "Curso básico · Nivel 1 · Sanación",
    },
    description: {
      en: "English explanation of the Healing attunement from the first level of the Basic Course.",
      ru: "Английское объяснение настройки «Лечение» из первой ступени Базового курса.",
      es: "Explicación en inglés de la sintonización Healing del primer nivel del Curso Básico.",
    },
    videos: yggdrasilEnglishStepVideos["RY-L01-S01"] ?? [],
  },
  {
    key: "instructor-healing",
    title: {
      en: "Instructor Course · Healing",
      ru: "Инструкторский курс · Целительство",
      es: "Curso de instructor · Sanación",
    },
    description: {
      en: "How Reiki Yggdrasil attunements are used inside the Healing block of the Instructor Course.",
      ru: "Как настройки Reiki Yggdrasil используются внутри блока «Целительство» Инструкторского курса.",
      es: "Cómo se usan las sintonizaciones Reiki Yggdrasil dentro del bloque de Sanación.",
    },
    videos: yggdrasilEnglishStepVideos["RY-L02-S01"] ?? [],
  },
  {
    key: "instructor-business",
    title: {
      en: "Instructor Course · Golden Calf · Business",
      ru: "Инструкторский курс · Золотой Телец · Бизнес",
      es: "Curso de instructor · Becerro de Oro · Negocios",
    },
    description: {
      en: "English video about attunements connected with business and increasing energy flow in practical work.",
      ru: "Английское видео о настройках, связанных с бизнесом и усилением энергетического потока в практической работе.",
      es: "Video en inglés sobre sintonizaciones relacionadas con negocios y flujo de energía.",
    },
    videos: yggdrasilEnglishStepVideos["RY-L02-S02"] ?? [],
  },
  {
    key: "instructor-relationships",
    title: {
      en: "Instructor Course · Man & Woman · Relationships",
      ru: "Инструкторский курс · Мужчина и Женщина · Отношения",
      es: "Curso de instructor · Hombre y Mujer · Relaciones",
    },
    description: {
      en: "English explanation of attunements used for relationship themes, connection and partner work.",
      ru: "Английское объяснение настроек для тем отношений, контакта и работы с партнёром.",
      es: "Explicación en inglés de sintonizaciones para relaciones, conexión y trabajo en pareja.",
    },
    videos: yggdrasilEnglishStepVideos["RY-L02-S03"] ?? [],
  },
  {
    key: "attunements-overview",
    title: {
      en: "Attunements across the system",
      ru: "Настройки системы в целом",
      es: "Sintonizaciones del sistema",
    },
    description: {
      en: "A broader English overview of some of Andrii’s favourite Reiki Yggdrasil attunements.",
      ru: "Более общий английский обзор некоторых любимых настроек Reiki Yggdrasil Андрея.",
      es: "Una visión general en inglés de algunas sintonizaciones favoritas de Reiki Yggdrasil.",
    },
    videos: attunementOverview,
  },
];

function topicsForScope(scope: GuideScope) {
  if (scope === "basic") return topics.filter((topic) => ["general", "basic-level-1", "attunements-overview"].includes(topic.key));
  if (scope === "instructor") return topics.filter((topic) => ["general", "instructor-healing", "instructor-business", "instructor-relationships", "attunements-overview"].includes(topic.key));
  return topics;
}

export function YggdrasilEnglishVideoGuide({
  locale,
  scope = "all",
}: {
  locale: PublicLocale;
  scope?: GuideScope;
}) {
  const copy = {
    en: {
      kicker: "English video guide",
      title: "Reiki Yggdrasil explained in English",
      lead: "The original English videos are organised by the part of the system they explain, rather than shown as one undifferentiated video wall.",
      source: "Legacy source: PsiTrends · Master of Reiki Yggdrasil",
    },
    ru: {
      kicker: "Видео на английском",
      title: "Reiki Yggdrasil — объяснения на английском",
      lead: "Оригинальные англоязычные видео распределены по темам и ступеням системы, а не собраны одним большим блоком.",
      source: "Архивный источник: PsiTrends · Master of Reiki Yggdrasil",
    },
    es: {
      kicker: "Guía de videos en inglés",
      title: "Reiki Yggdrasil explicado en inglés",
      lead: "Los videos originales en inglés están organizados por temas y etapas del sistema.",
      source: "Fuente histórica: PsiTrends · Master of Reiki Yggdrasil",
    },
  }[locale];

  const visibleTopics = topicsForScope(scope).filter((topic) => topic.videos.length);

  return (
    <section className="yggdrasil-english-guide" id="yggdrasil-english-guide">
      <div className="yggdrasil-english-guide__heading">
        <div>
          <p className="homeopathy-kicker">{copy.kicker}</p>
          <h2>{copy.title}</h2>
          <p>{copy.lead}</p>
        </div>
        <a href={yggdrasilLegacyEnglishVideoSource} target="_blank" rel="noreferrer">{copy.source}<span aria-hidden="true">↗</span></a>
      </div>

      <div className="yggdrasil-video-topic-list">
        {visibleTopics.map((topic) => (
          <section className="yggdrasil-video-topic" key={topic.key}>
            <div className="yggdrasil-video-topic__heading">
              <div>
                <span className="yggdrasil-language-badge yggdrasil-language-badge--en">EN · English</span>
                <h3>{topic.title[locale]}</h3>
              </div>
              <p>{topic.description[locale]}</p>
            </div>
            <div className="yggdrasil-video-grid yggdrasil-video-grid--topic">
              {topic.videos.map((video) => (
                <AcademyVideoPlayer key={video.youtubeId} youtubeId={video.youtubeId} title={"EN · " + video.title} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
