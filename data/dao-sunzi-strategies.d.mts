export type SunTzuLocale = "ru" | "en" | "es";
export type SunTzuStrategy = { number: number; chapter: number; original: string; quote: string; strategy: string; source: string };
export declare const sunTzuPassages: Readonly<Record<string, {chapter: number; original: string; translation: Record<SunTzuLocale,string>}>>;
export declare const sunTzuHexagramStrategies: readonly {number:number; quote:string; strategy:Record<SunTzuLocale,string>}[];
export declare function getSunTzuStrategy(number: number, locale?: SunTzuLocale): SunTzuStrategy | null;
