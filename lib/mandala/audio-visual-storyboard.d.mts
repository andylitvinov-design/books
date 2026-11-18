export type TimedSpeechSegment={
  startSeconds:number;endSeconds:number;text:string;
};
export type TimedSpeechTranscript={
  text:string;durationSeconds:number;segments:TimedSpeechSegment[];
  /** Device speech uses approximate event-clock positions, not verified word-level timestamps. */
  timingSource?:"estimated"|"verified";
};
export type TimedVisualShot={
  sceneId:string;startSeconds:number;durationSeconds:number;endSeconds:number;
  spokenText:string;concepts:string[];matchedConcepts:string[];
  visualLabel:string;needsReview:boolean;
};
export type AudioVisualPlan={
  version:string;status:string;canExport:boolean;durationSeconds:number;
  audioSeconds?:number;shots:TimedVisualShot[];prompt:string;
  excludedMotifs?:string[];needsReview?:boolean;conceptAware?:boolean;
  edit:{clipIds:string[];durationSecondsByStage:number[];
    captionTexts:string[];excludedMotifs:string[]}|null;
};
export declare const AUDIO_VISUAL_STORYBOARD_VERSION:string;
export declare function normalizeTimedTranscript(wire:unknown):TimedSpeechTranscript|null;
export declare function planAudioVisualStoryboard(options?:{
  transcript:TimedSpeechTranscript;scenes:readonly unknown[];
  aspect?:"landscape"|"portrait"|"square";theme?:string;locale?:"ru"|"en"|"es";
  // Runtime validates every optional semantic field against canonical registries.
  // Editorial proposals may be intentionally partial; do not force inferred fields.
  concept?:object|null;
}):AudioVisualPlan;
