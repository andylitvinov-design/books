import type {PublicLocale} from "./public-locales";
export declare const HOME_AI_HANDOFF_KEY:string;
export declare const HOME_AI_HANDOFF_MAX_AGE_MS:number;
export type HomeAiMode="self"|"business";
export type HomeAiHandoff={text:string;locale:PublicLocale;mode:HomeAiMode};
export declare function encodeHomeAiHandoff(value:{
  text:string;locale:PublicLocale;mode?:HomeAiMode;now?:number;
}):string|null;
export declare function parseHomeAiHandoff(raw:string|null|undefined,locale:PublicLocale,now?:number):HomeAiHandoff|null;
export declare function takeHomeAiHandoff(
 storage:Pick<Storage,"getItem"|"removeItem">|null|undefined,
 locale:PublicLocale,now?:number
):HomeAiHandoff|null;
