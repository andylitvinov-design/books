import type { Locale } from "@/data/remedies";

export type CoreServiceId = "situation" | "dao" | "alchemy" | "hypnotherapy";

export type CoreServiceOffer = {
  id: CoreServiceId;
  label: string;
  title: string;
  promise: string;
  benefit: string;
  image: string;
  href: string;
  action: string;
};

const images = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  alchemy: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  hypnotherapy: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
} as const;

const offers = {
  en: [
    {
      id: "situation",
      label: "Free · Written review",
      title: "Free Situation Review",
      promise: "See your question, obstacles and possible next steps from a fresh perspective.",
      benefit: "Personal written reflection",
      image: images.situation,
      route: "free-situation-review",
      action: "Start free review",
    },
    {
      id: "dao",
      label: "Free · DAO / Wu Xing",
      title: "Free Wu Xing Resource Profile",
      promise: "Explore personal resource patterns through an author-led symbolic Daoist model.",
      benefit: "Personal resource overview, not a medical diagnosis",
      image: images.dao,
      route: "dao-health-profile",
      action: "Explore free resource profile",
    },
    {
      id: "alchemy",
      label: "Personal session · 3 approaches",
      title: "Alchemy of the Soul",
      promise: "Understand a difficult situation through personal analysis and systemic constellations.",
      benefit: "Situation analysis · constellations · complementary remedy selection",
      image: images.alchemy,
      route: "alchemy-of-soul",
      action: "Explore the session",
    },
    {
      id: "hypnotherapy",
      label: "Individual course",
      title: "Guided Imagery Hypnotherapy",
      promise: "Explore subconscious imagery and questions that feel hard to resolve through thinking alone.",
      benefit: "Inner resources · emotional patterns · personal answers",
      image: images.hypnotherapy,
      route: "hypnotherapy-course",
      action: "Explore the course",
    },
  ],
  ru: [
    {
      id: "situation",
      label: "Бесплатно · Письменный разбор",
      title: "Диагностика ситуации",
      promise: "По-новому взглянуть на проблему, препятствия и возможные решения.",
      benefit: "Личный письменный отчёт",
      image: images.situation,
      route: "free-situation-review",
      action: "Начать бесплатно",
    },
    {
      id: "dao",
      label: "Бесплатно · Дао / У-Син",
      title: "Бесплатный профиль ресурсов У-Син",
      promise: "Исследовать жизненный ресурс и баланс в авторской символической модели Дао.",
      benefit: "Профиль ресурсов, не медицинский диагноз",
      image: images.dao,
      route: "dao-health-profile",
      action: "Открыть профиль ресурсов",
    },
    {
      id: "alchemy",
      label: "Личная сессия · 3 подхода",
      title: "Алхимия души",
      promise: "Увидеть ситуацию глубже через личный анализ и системные расстановки.",
      benefit: "Анализ · расстановка · дополнительный подбор средств",
      image: images.alchemy,
      route: "alchemy-of-soul",
      action: "О сессии",
    },
    {
      id: "hypnotherapy",
      label: "Индивидуальный курс",
      title: "Курс гипнотерапии",
      promise: "Искать ответы и внутреннюю опору через работу с образами подсознания.",
      benefit: "Ресурс · эмоции · личные ответы",
      image: images.hypnotherapy,
      route: "hypnotherapy-course",
      action: "О курсе",
    },
  ],
} as const satisfies Record<Locale, readonly (Omit<CoreServiceOffer, "href"> & { route: string })[]>;

export function coreServiceOffers(locale: Locale): CoreServiceOffer[] {
  return offers[locale].map((item) => ({
    ...item,
    href: "/" + locale + "/services/" + item.route,
  }));
}
