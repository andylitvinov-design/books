export type MyTubeMotionPoint={
  zoom:number;x:number;y:number;rotation:number;
};
export type MyTubeMotionPreset="push-in"|"pull-out"|"pan-left"|"pan-right"|
  "drift"|"tilt"|"custom";
export type MyTubeMotion={
  preset:MyTubeMotionPreset;
  from:MyTubeMotionPoint;
  to:MyTubeMotionPoint;
  easing:"linear"|"smooth";
};
export declare const MYTUBE_MOTION_PRESETS:readonly string[];
export declare const MYTUBE_MOTION_EASINGS:readonly string[];
export declare function motionPreset(id:string):MyTubeMotion|null;
export declare function validateMyTubeMotion(value:unknown):MyTubeMotion|null;
export declare function motionKeyframeAt(value:MyTubeMotion|null,timeSeconds:number,durationSeconds:number):MyTubeMotionPoint;
export declare function paintMyTubeMotion(ctx:CanvasRenderingContext2D,
  motion:MyTubeMotion|null|undefined,localTime:number,durationSeconds:number,draw:()=>void):void;
