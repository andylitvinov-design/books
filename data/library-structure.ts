import type { Locale } from "@/data/remedies";

export type MaterialRole = "foundation" | "theory" | "practice" | "reference" | "project";

const roleByBookId: Record<string, MaterialRole> = {
  "alchemy-homeopathy-foundations": "foundation",
  "alchemy-homeopathy-remedies": "reference",
  "alchemy-naturopathy-hormones": "reference",
  "alchemy-naturopathy-oils": "reference",
  "alchemy-bach-foundations": "foundation",
  "alchemy-bach-cards": "reference",
  "alchemy-brain-theory": "theory",
  "alchemy-brain-protocols": "practice",
  "alchemy-services-workflow": "project",
  "dao-alchemy-intro": "foundation",
  "dao-tradition-temples-symbols": "theory",
  "dao-magic-basics": "foundation",
  "dao-talismans-symbols": "reference",
  "dao-rituals-altars": "practice",
  "dao-yijing-predictions": "practice",
  "dao-healing-basics": "foundation",
  "dao-wuxing-five-elements": "theory",
  "dao-wuxing-model-steps": "theory",
  "dao-practicum-cases-remedies": "practice",
  "maya-egregor-gods": "theory",
  "maya-calendar": "reference",
  "maya-exorcism": "practice",
  "maya-mysteries": "theory",
};

const relatedByBookId: Record<string, string[]> = {
  "alchemy-homeopathy-foundations": ["alchemy-homeopathy-remedies"],
  "alchemy-homeopathy-remedies": ["alchemy-homeopathy-foundations"],
  "alchemy-naturopathy-hormones": ["alchemy-naturopathy-oils"],
  "alchemy-naturopathy-oils": ["alchemy-naturopathy-hormones"],
  "alchemy-bach-foundations": ["alchemy-bach-cards"],
  "alchemy-bach-cards": ["alchemy-bach-foundations"],
  "alchemy-brain-theory": ["alchemy-brain-protocols"],
  "alchemy-brain-protocols": ["alchemy-brain-theory"],
  "dao-alchemy-intro": ["dao-tradition-temples-symbols", "dao-magic-basics"],
  "dao-tradition-temples-symbols": ["dao-alchemy-intro", "dao-magic-basics"],
  "dao-magic-basics": ["dao-talismans-symbols", "dao-rituals-altars"],
  "dao-talismans-symbols": ["dao-magic-basics", "dao-rituals-altars"],
  "dao-rituals-altars": ["dao-talismans-symbols", "dao-yijing-predictions"],
  "dao-yijing-predictions": ["dao-rituals-altars"],
  "dao-healing-basics": ["dao-wuxing-five-elements", "dao-wuxing-model-steps"],
  "dao-wuxing-five-elements": ["dao-healing-basics", "dao-wuxing-model-steps", "dao-practicum-cases-remedies"],
  "dao-wuxing-model-steps": ["dao-wuxing-five-elements", "dao-practicum-cases-remedies"],
  "dao-practicum-cases-remedies": ["dao-wuxing-five-elements", "dao-wuxing-model-steps"],
  "maya-egregor-gods": ["maya-mysteries", "maya-calendar"],
  "maya-calendar": ["maya-egregor-gods", "maya-mysteries"],
  "maya-exorcism": ["maya-egregor-gods", "maya-mysteries"],
  "maya-mysteries": ["maya-egregor-gods", "maya-calendar", "maya-exorcism"],
};

export const recommendedReadingPath = [
  "alchemy-homeopathy-foundations",
  "alchemy-homeopathy-remedies",
  "dao-wuxing-five-elements",
  "dao-practicum-cases-remedies",
] as const;

export function getBookMaterialRole(bookId: string): MaterialRole {
  return roleByBookId[bookId] ?? "reference";
}

export function getRelatedBookIds(bookId: string): string[] {
  return relatedByBookId[bookId] ?? [];
}

export function materialRoleLabel(locale: Locale, role: MaterialRole) {
  const labels = {
    ru: {
      foundation: "Основы",
      theory: "Теория",
      practice: "Практика",
      reference: "Справочник",
      project: "О проекте",
    },
    en: {
      foundation: "Foundation",
      theory: "Theory",
      practice: "Practice",
      reference: "Reference",
      project: "Project guide",
    },
  } as const;
  return labels[locale][role];
}

export function readingStepLabel(locale: Locale, index: number) {
  const ru = ["Начать", "Справочник", "Модель", "Практика"];
  const en = ["Start", "Reference", "Model", "Practice"];
  return (locale === "ru" ? ru : en)[index] ?? String(index + 1);
}

export function bookToolLinks(bookId: string, locale: Locale) {
  const links: Array<{ href: string; label: string }> = [];
  if (bookId.startsWith("alchemy-homeopathy")) {
    links.push({
      href: `/${locale}/homeopathy/remedies`,
      label: locale === "ru" ? "Каталог препаратов" : "Remedy catalogue",
    });
  }
  if (bookId === "dao-wuxing-five-elements" || bookId === "dao-wuxing-model-steps" || bookId === "dao-practicum-cases-remedies") {
    links.push({
      href: `/${locale}/wu-xing`,
      label: locale === "ru" ? "Методичка У-Син" : "Wu Xing guide",
    });
  }
  return links;
}
