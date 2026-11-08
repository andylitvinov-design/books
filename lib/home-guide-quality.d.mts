export declare const GUIDE_QUALITY_CATEGORIES: readonly ("energy" | "love" | "business" | "courses" | "site" | "other")[];
export declare const GUIDE_QUALITY_SIGNALS: readonly ("clarified" | "unresolved" | "helpful" | "unhelpful")[];
export declare const GUIDE_QUALITY_LOCALES: readonly ("en" | "ru" | "es")[];
export declare function validateGuideQualityFeedback(value: unknown): {
  category: "energy" | "love" | "business" | "courses" | "site" | "other";
  signal: "clarified" | "unresolved" | "helpful" | "unhelpful";
  locale: "en" | "ru" | "es";
} | null;
export declare function validateGuideQualityPriorities(value: unknown): ("energy" | "love" | "business" | "courses" | "site")[];
export declare function orderGuideClarificationChoices<T extends { id: string }>(
  choices: T[], categories: string[]
): T[];
