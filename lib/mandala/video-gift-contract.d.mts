import type {GiftEmotionCategoryId,GiftEmotionMessageId,GiftEmotionStyleId} from "./video-gift-emotions.mjs";
export type VideoGiftLocale="ru"|"en"|"es";
export type VideoGiftOccasion="birthday"|"love"|"thanks"|"support"|"anniversary"|"custom";
export type VideoGiftMotion="zoom"|"pan"|"float"|"smile"|"blink"|"turn"|"wave";
export type VideoGiftAspect="portrait"|"landscape";
export type VideoGiftPalette="sunrise"|"rose"|"ocean"|"forest";
export type VideoGiftSoundtrack="none"|"forest"|"breeze"|"crystal"|"voice";
export type VideoGiftSubject="self"|"other"|"minor";
export type VideoGiftDraft={
  locale:VideoGiftLocale;occasion:VideoGiftOccasion;recipient:string;
  giftCategoryId?:GiftEmotionCategoryId;giftMessageId?:GiftEmotionMessageId;giftStyleId?:GiftEmotionStyleId;
  sourceOwner:VideoGiftSubject;rightsConfirmed:boolean;
  subjectConsent:boolean;guardianConsent:boolean;
  motion:VideoGiftMotion;palette:VideoGiftPalette;aspect:VideoGiftAspect;
  requestMusic:VideoGiftSoundtrack;message:string;finalWish:string;
};
export type VideoGiftManifest=Omit<VideoGiftDraft,"rightsConfirmed"|"subjectConsent"|"guardianConsent"> & {
  durationSeconds:25;requiresPaidAnimation:boolean;
};
export declare const VIDEO_GIFT_DURATION:25;
export declare const VIDEO_GIFT_BEATS:readonly {readonly id:string;readonly from:number;readonly to:number}[];
export declare const VIDEO_GIFT_OCCASIONS:readonly VideoGiftOccasion[];
export declare const VIDEO_GIFT_FREE_MOTIONS:readonly ("zoom"|"pan"|"float")[];
export declare const VIDEO_GIFT_AI_MOTIONS:readonly ("smile"|"blink"|"turn"|"wave")[];
export declare const VIDEO_GIFT_PALETTES:readonly VideoGiftPalette[];
export declare const VIDEO_GIFT_SOUNDTRACKS:readonly VideoGiftSoundtrack[];
export declare function suggestVideoGiftText(locale:VideoGiftLocale,occasion:VideoGiftOccasion):{intro:string;message:string;finalWish:string};
export declare function videoGiftStage(second:number):"intro"|"portrait"|"message"|"outro";
export declare function validateVideoGiftDraft(input:VideoGiftDraft):VideoGiftManifest;
