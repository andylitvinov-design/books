export type MyTubeDurationMode = "all" | "shorts" | "study";
export declare const MYTUBE_STUDY_MIN_SECONDS: 600;
export declare function matchesMyTubeDuration(verifiedSeconds: number | null | undefined,mode?:MyTubeDurationMode):boolean;
export declare function myTubeDurationCounts(items?:ReadonlyArray<{durationVerifiedSeconds?:number|null}>):{
 all:number;shorts:number;study:number;unknown:number
};
