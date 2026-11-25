export type TrigramKey = "heaven" | "earth" | "water" | "thunder" | "wind" | "fire" | "mountain" | "lake";
export type HexagramLocale = "ru" | "en" | "es";
export interface Hexagram {
  readonly number: number;
  readonly hanzi: string;
  readonly ru: string;
  readonly en: string;
  readonly es: string;
  readonly upper: TrigramKey;
  readonly lower: TrigramKey;
  readonly essenceRu: string;
  readonly essenceEn: string;
  readonly unicode: string;
}
export declare const trigramInfo: Record<TrigramKey, {
  ru: string; en: string; es: string; lines: readonly boolean[];
}>;
export declare const hexagrams: readonly Hexagram[];
export declare function getHexagram(number: number | string): Hexagram | null;
export declare function hexagramLines(hexagram: Pick<Hexagram, "upper" | "lower">): boolean[];
export declare const daoAuthorHexagramNumbers: readonly number[];
export declare function archivePhotoFor(hexagram: Hexagram, authorPhoto?: string | null): string;
export declare function hexagramTitle(hexagram: Hexagram, locale: HexagramLocale): string;
export declare function hexagramEssence(hexagram: Hexagram, locale: HexagramLocale): string;
