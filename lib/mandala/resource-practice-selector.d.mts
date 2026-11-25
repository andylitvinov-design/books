export type ResourcePracticeKind="ritual"|"exercise"|"practice";
export type ResourcePracticeFocus={difficulty?:string;goal?:string;goals?:readonly string[];details?:readonly string[]};
export type ResourcePracticeResult={
  status:"ready";locale:string;kind:ResourcePracticeKind;theme:string;id:string;
  title:string;topic:string;description:string;durationMinutes:number;
  steps:string[];transfer:string;source:string;clinicalClearance:false;
}|{status:"blocked";locale:string;message:string;source:string};
export declare const RESOURCE_PRACTICE_VERSION:string;
export declare const RESOURCE_PRACTICE_KINDS:ReadonlyArray<ResourcePracticeKind>;
export declare function selectResourcePractice(options?:{
  locale?:string;theme?:string;focus?:ResourcePracticeFocus;
  kind?:ResourcePracticeKind;revision?:number;
}):ResourcePracticeResult;
