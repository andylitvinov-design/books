import type { Metadata } from "next";

const homeCopy = {
  en: {
    title: "Holistic House — free self-checks and personal guidance in Toronto",
    description: "Explore free self-check tests, a written situation review or a Wu Xing resource profile. Optional personal sessions with Andrey Litvinov in Toronto and online.",
  },
  ru: {
    title: "Holistic House — бесплатные тесты и личная работа в Торонто",
    description: "Начните с бесплатных тестов, письменного разбора ситуации или профиля ресурсов У-Син. Личные консультации Андрея Литвинова в Торонто и онлайн — по желанию.",
  },
} as const;

const image = "/images/holistic-house/andy-about.png";
export function homeMetadataFor(locale: "en" | "ru"): Metadata {
  const copy = homeCopy[locale];
  const path = locale === "ru" ? "/ru" : "/";
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: path,
      languages: { en: "/", ru: "/ru", es: "/es", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "Holistic House",
      locale: locale === "ru" ? "ru_RU" : "en_CA",
      url: path,
      title: copy.title,
      description: copy.description,
      images: [{ url: image, alt: "Andrey Litvinov — Holistic House" }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [image],
    },
  };
}
