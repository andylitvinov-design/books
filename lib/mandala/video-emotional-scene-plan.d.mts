/**
 * Strict public contract for local scene compilation.
 * Strings are editorial IDs, not sensitive user or clinical records.
 * This declaration resolves the matching .mjs in TypeScript/bundler builds.
 */
export type EmotionalVideoAspect = "landscape"|"portrait"|"square";
export type EmotionalVideoLocale = "ru"|"en"|"es";
export type EmotionalPace = "gentle"|"steady";
export type EmotionalStrategyId = "S01"|"S02"|"S03"|"S04"|"S05"|"S06"|"S07"|"S08";

export interface EmotionalVideoInput {
  topicId?:string;
  meaningAxisId?:string;
  motifId?:string;
  scenarioId?:string;
  plot?:{beats?:readonly string[];visualCues?:readonly string[]}|null;
  emotional?:{
    currentStateId?:string;desiredStateId?:string;
    currentClusterId?:string;desiredClusterId?:string;
    intensity?:number|"low"|"medium"|"high";
    energy?:number|"low"|"moderate"|"high";
    activation?:number|"low"|"medium"|"high";
    feltSafety?:number|"low"|"medium"|"high";
    pace?:EmotionalPace;
  }|null;
  durationSeconds?:number;
  aspect?:EmotionalVideoAspect;
  locale?:EmotionalVideoLocale;
  scenes?:readonly object[];
  excludedMotifs?:readonly string[];
  styleId?:string|null;
  allowAbstractMotion?:boolean;
}
export interface EmotionalVideoBeat {
  beatIndex:number;
  beatText:string;
  strategyId:EmotionalStrategyId;
  role:"orientation"|"safety"|"development"|"integration";
  targetVisualTags:string[];
  emotionalTags:string[];
}
export interface EmotionalVideoCut {
  number:number;
  beatIndex:number;
  emotionalStageId:EmotionalStrategyId;
  role:string;
  requiredTags:string[];
  emotionalTags:string[];
  matchedTags:string[];
  sceneId:string;
  sourceMasterKey:string;
  assetPath:string;
  sourceDurationSeconds:number;
  startSeconds:number;
  durationSeconds:number;
  sourceKind:string;
  rightsKind:string;
  matchingEvidence:string;
  depictedEventVerified:false;
  loopRequired:false;
}
export interface EmotionalVideoStrategyStage {
  stage:number;
  strategyId:EmotionalStrategyId;
  startT:number;
  endT:number;
  targetTags:string[];
}
export interface EmotionalVideoPlan {
  version:string;
  topicId?:string;
  meaningAxisId?:string;
  motifId?:string;
  scenarioId?:string;
  durationSeconds:number;
  aspect:EmotionalVideoAspect;
  locale:EmotionalVideoLocale;
  sceneCount:number|null;
  videoBasis:string;
  mediaFidelity:string;
  exportEvidence:string;
  publishAuthorized:false;
  ok:boolean;
  status:string;
  renderReady:boolean;
  clipIds:string[];
  shots:EmotionalVideoCut[];
  pathId?:string;
  emotionalAxisId?:string;
  emotionalEnvelope?:{
    pace:EmotionalPace;
    contrastCeiling:"low"|"moderate";
    avoidForcedChallenge:boolean;
    allowNegativeDramaticDip:false;
  };
  reliefShapeIds?:string[];
  strategySequence?:EmotionalVideoStrategyStage[];
  stages?:EmotionalVideoBeat[];
  availableUniqueMasters?:number;
  reasonCodes?:string[];
  missingMediaCount?:number;
  missingStage?:number;
  missingShot?:number;
  plannedShots?:number;
  matchedMediaCount?:number;
  stageCoverage?:Array<{beatIndex:number;assignedShots:number}>;
  verifiedLiteralScenario?:false;
}

export declare const EMOTIONAL_SCENE_DIRECTOR_VERSION:string;
export declare const FILM_SHOT_LENGTHS:readonly number[];
export declare const EMOTIONAL_STRATEGY_TAGS:Readonly<Record<EmotionalStrategyId,readonly string[]>>;
export declare function emotionalFilmShotCount(durationSeconds:number):number|null;
export declare function planEmotionDrivenVideo(input?:EmotionalVideoInput):EmotionalVideoPlan;
