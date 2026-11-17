export type HomeAliMode = "self" | "business";
export type HomeAliLocale = "en" | "ru" | "es";
export type HomeAliHandoff = {
  v: 1;
  source: "home";
  text: string;
  locale: HomeAliLocale;
  mode: HomeAliMode;
  createdAt: number;
};
export declare const HOME_ALI_HANDOFF_KEY: string;
export declare const HOME_ALI_HANDOFF_MAX_AGE: number;
export declare function prepareHomeAliHandoff(
  input?: {text?:string;locale?:string;mode?:string;now?:number}
): HomeAliHandoff | null;
export declare function stageHomeAliHandoff(
  storage: Pick<Storage,"setItem"> | null,
  data: {text:string;locale:HomeAliLocale;mode:HomeAliMode;now?:number}
): boolean;
export declare function consumeHomeAliHandoff(
  storage: Pick<Storage,"getItem"|"removeItem"> | null,
  locale: HomeAliLocale,
  now?:number
): HomeAliHandoff | null;

export declare function peekHomeAliHandoff(
  storage: (Pick<Storage,"getItem"> & Partial<Pick<Storage,"removeItem">>) | null,
  locale: HomeAliLocale, now?:number
): HomeAliHandoff | null;
export declare function acknowledgeHomeAliHandoff(
  storage: Pick<Storage,"getItem"|"removeItem"> | null,
  received: HomeAliHandoff | null
): boolean;
