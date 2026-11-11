export type VideoEffectLocale='ru'|'en'|'es';
export type VideoEffectArea={readonly id:string;readonly label:Readonly<Record<VideoEffectLocale,string>>};
export type VideoEffectRow={id:string;before:number;after:number;delta:number};
export type VideoEffectComparison={
  rows:VideoEffectRow[];improved:number;unchanged:number;decreased:number;
  meanBefore:number;meanAfter:number;meanDelta:number;
};
export declare const VIDEO_EFFECT_AREAS:readonly VideoEffectArea[];
export declare function isVideoEffectScore(value:unknown):value is number;
export declare function completeVideoEffectScores(scores:unknown):scores is number[];
export declare function compareVideoEffectScores(before:unknown,after:unknown):VideoEffectComparison;
