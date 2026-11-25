export type ReikiPricingCourse = "tantra" | "yggdrasil";
export type ReikiPricingLocale = "en" | "ru" | "es";
export type ReikiLevelPrice = { readonly amountEur: number; readonly durationMinutes: number };
export declare const REIKI_LEVEL_PRICES: Readonly<Record<ReikiPricingCourse, ReikiLevelPrice>>;
export declare function getReikiLevelPrice(course: ReikiPricingCourse): ReikiLevelPrice;
export declare function formatReikiLevelPrice(course: ReikiPricingCourse, locale?: ReikiPricingLocale): string;
