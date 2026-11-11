export declare const MYTUBE_MUSIC_BEDS:readonly [
  "warm-morning","wings-of-light","heart-harmony","quiet-stars","bright-path"
];
export declare const MYTUBE_BED_FADES:readonly [0,0.5,1,2];
export type MyTubeMusicBed={
  id:"none"|"warm-morning"|"wings-of-light"|"heart-harmony"|"quiet-stars"|"bright-path";
  volumePercent:number;
  fadeSeconds:number;
};
export declare function validateMyTubeMusicBed(value:unknown):MyTubeMusicBed;
export declare function myTubeAudioLaneGains(masterVolume:number,bedVolume:number,bedActive:boolean):
  {primary:number;bed:number};
