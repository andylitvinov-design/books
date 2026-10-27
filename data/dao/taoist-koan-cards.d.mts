export type TaoistKoanLocale = "en" | "ru" | "es";
export type TaoistKoanCard = {
  readonly id: string;
  readonly stage: number;
  readonly title: Readonly<Record<TaoistKoanLocale, string>>;
  readonly text: Readonly<Record<TaoistKoanLocale, string>>;
};
export declare const taoistKoanCards: readonly TaoistKoanCard[];
export declare function nextKoanIndex(previousIndex?: number, random?: () => number): number;
