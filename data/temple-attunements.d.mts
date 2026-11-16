/** Public archival model. Unverified locations must be shown as author-described. */
export type TempleLocale = "ru" | "en" | "es";
export type TempleText = Record<TempleLocale, string>;
export type TempleChannel = { id: string; name: TempleText; aliases: string[] };
export type TempleTradition = { id: string; name: TempleText; channels: TempleChannel[] };
export type TemplePhoto = { src: string; alt: TempleText };
export type TemplePlace = {
  city: TempleText; site: TempleText; country: TempleText;
  note: TempleText | null; verification: "author-described";
};
export type TempleAttunement = {
  id: string; traditionId: string; channelId: string; title: TempleText;
  format: "verse" | "practice" | "meditation" | "ritual";
  language: "ru"; textRu: string; place: TemplePlace; photos: TemplePhoto[];
  source: { id: string; title: string; type: "author-archive" | "telegram-export" };
  sortOrder: number; visibility: "public" | "draft"; photoContext: string;
};
export declare const templeTraditions: readonly TempleTradition[];
export declare const templeAttunements: readonly TempleAttunement[];
export declare function normalizeTempleSearch(value: unknown): string;
export declare function getTempleChannel(traditionId: string, channelId: string): TempleChannel | null;
export declare function findTempleAttunements(filters?: {
  traditionId?: string; channelId?: string; query?: string;
}): TempleAttunement[];
