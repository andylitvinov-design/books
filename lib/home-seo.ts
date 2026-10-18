import type { Metadata } from "next";

const homeCopy = {
  en: {
    title: "Personal Sessions in Toronto & Online | Holistic House",
    description: "Explore one real question with Andrey Litvinov through guided imagery and systemic constellations. Personal consultations in Toronto or online, from €50. Free written review available.",
  },
  ru: {
    title: "Личные консультации в Торонто и онлайн | Holistic House",
    description: "Личные консультации Андрея Литвинова по вопросам отношений, работы и жизненных решений в Торонто и онлайн, от €50. Можно начать с бесплатного письменного разбора.",
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
