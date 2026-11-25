export type AcademySeoLocale = "en" | "ru" | "es";
export declare const academySeoRouteKeys: readonly string[];
export declare function seoMetaForAcademyRoute(locale: string, routeKey: string): { title: string; description: string } | null;
