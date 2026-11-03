import type { Metadata } from "next";

const homeCopy = {
  en: {
    title: "Personal Sessions in Toronto & Online | Holistic House",
    description: "Explore relationships, work and decisions with Andrey Litvinov through systemic constellations. Toronto and online sessions from €50; free written review.",
  },
  ru: {
    title: "Личные консультации в Торонто и онлайн | Holistic House",
    description: "Личные сессии Андрея Литвинова в Торонто и онлайн: отношения, работа, важные решения. От €50; бесплатный письменный разбор — по желанию.",
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
