/**
 * First-party, local-only two-lane soundtrack policy.
 * Voice/file is primary. A separate optional licensed original melody loops
 * underneath it. This has no provider URLs, storage or remote AI calls.
 */
export const MYTUBE_MUSIC_BEDS=Object.freeze([
  "warm-morning","wings-of-light","heart-harmony","quiet-stars","bright-path"
]);
export const MYTUBE_BED_FADES=Object.freeze([0,.5,1,2]);
const allowed=Object.freeze(["none",...MYTUBE_MUSIC_BEDS]);
export function validateMyTubeMusicBed(value){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype||
     Object.keys(value).some(k=>!["id","volumePercent","fadeSeconds"].includes(k))||
     !allowed.includes(value.id)||
     !Number.isInteger(value.volumePercent)||value.volumePercent<0||
     value.volumePercent>60||value.volumePercent%5!==0||
     !MYTUBE_BED_FADES.includes(value.fadeSeconds))
    throw Error("invalid_mytube_music_bed");
  return {id:value.id,volumePercent:value.volumePercent,fadeSeconds:value.fadeSeconds};
}
export function myTubeAudioLaneGains(masterVolume,bedVolume,bedActive){
  if(!Number.isFinite(masterVolume)||masterVolume<0||masterVolume>100||
     !Number.isInteger(bedVolume)||bedVolume<0||bedVolume>60||
     bedVolume%5!==0||typeof bedActive!=="boolean")
    throw Error("invalid_mytube_audio_lane_gains");
  // The same per-lane normalization is used in MediaRecorder and WebCodecs.
  const headroom=bedActive?Math.sqrt(2):1;
  return {primary:masterVolume/100/headroom,
    bed:bedActive?masterVolume/100*(bedVolume/100)/headroom:0};
}
