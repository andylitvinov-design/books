/**
 * Local-only, portable MyTube montage metadata (not a raw media or paid export).
 * Import has a strict allowlist boundary and returns newly allocated plain values:
 * no user-owned paths, URLs, images, provider prompts, rights overrides or audio bytes.
 */
import {normalizeStageCaption} from "./stage-caption-track.mjs";
import {CAPTION_STYLE_IDS,CAPTION_MOTION_IDS,CAPTION_POSITION_IDS} from "./creative-editor-captions.mjs";
import {validateMyTubeMotion} from "./creative-editor-keyframes.mjs";
import {validateLicensedSourcePlayback} from "./free-film-source-clock.mjs";
import {validateMyTubeMusicBed} from "./creative-editor-audio-lanes.mjs";

export const MYTUBE_DRAFT_FORMAT="hh-mytube-editor-draft";
export const MYTUBE_DRAFT_VERSION=1;
export const MYTUBE_DRAFT_MAX_BYTES=32768;
const ALLOWED_DURATIONS=new Set([10,15,20,30,60]);
const ALLOWED_ASPECTS=new Set(["portrait","landscape","square"]);
const TRANSITIONS=new Set(["soft","cut","fade_black","flash_white"]);
const LOOKS=new Set(["original","warm","cool","dream"]);
const ID=/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const fail=(reason)=>{throw new Error("mytube_draft_"+reason)};
const record=value=>value!==null&&typeof value==="object"&&!Array.isArray(value)&&
  Object.getPrototypeOf(value)===Object.prototype;
const only=(value,keys)=>record(value)&&Object.keys(value).every(key=>keys.includes(key));
const decimal=value=>typeof value==="number"&&Number.isFinite(value)&&
  Math.abs(value*10-Math.round(value*10))<.00001;
const allowedId=value=>typeof value==="string"&&value.length<=96&&ID.test(value);
const isValidPlayback=shot=>{
  try{
    validateLicensedSourcePlayback(shot.sourcePhasePercent===undefined?0:shot.sourcePhasePercent,
      shot.sourceSpeed===undefined?1:shot.sourceSpeed);
    return true;
  }catch{return false}
};
const isValidMotion=value=>{
  try{validateMyTubeMotion(value);return true}catch{return false}
};

function strictDraft(draft,{approvedSceneIds,approvedPresetIds,approvedAudioIds}={}){
  if(!only(draft,["format","version","presetId","aspect","durationSeconds","shots",
    "captions","audioStartSeconds","musicBed"])||draft.format!==MYTUBE_DRAFT_FORMAT||
    draft.version!==MYTUBE_DRAFT_VERSION)fail("format");
  if(!allowedId(draft.presetId)||!Array.isArray(approvedPresetIds)||
     !approvedPresetIds.includes(draft.presetId))fail("preset");
  if(!ALLOWED_ASPECTS.has(draft.aspect)||!ALLOWED_DURATIONS.has(draft.durationSeconds))
    fail("duration_aspect");
  if(!Array.isArray(approvedSceneIds)||!Array.isArray(draft.shots)||
     draft.shots.length!==4)fail("shots");
  const registered=new Set(approvedSceneIds);
  const used=new Set();
  let cursor=0;
  const shots=draft.shots.map((shot,i)=>{
    if(!only(shot,["sceneId","startSeconds","durationSeconds","captionText",
      "transitionIn","colorLook","motion","sourcePhasePercent","sourceSpeed"])||
       !allowedId(shot.sceneId)||!registered.has(shot.sceneId)||used.has(shot.sceneId)||
       !Number.isInteger(shot.startSeconds)||shot.startSeconds!==cursor||
       !Number.isInteger(shot.durationSeconds)||shot.durationSeconds<2||
       typeof shot.captionText!=="string"||
       normalizeStageCaption(shot.captionText)!==shot.captionText||
       !TRANSITIONS.has(shot.transitionIn)||!LOOKS.has(shot.colorLook)||
       (shot.motion!==undefined&&!isValidMotion(shot.motion))||!isValidPlayback(shot))
      fail("shot_"+i);
    used.add(shot.sceneId);cursor+=shot.durationSeconds;
    return {sceneId:shot.sceneId,startSeconds:shot.startSeconds,
      durationSeconds:shot.durationSeconds,captionText:shot.captionText,
      transitionIn:shot.transitionIn,colorLook:shot.colorLook,
      ...(shot.motion!==undefined?{motion:validateMyTubeMotion(shot.motion)}:{}),
      ...(shot.sourcePhasePercent!==undefined?{sourcePhasePercent:shot.sourcePhasePercent}:{}),
      ...(shot.sourceSpeed!==undefined?{sourceSpeed:shot.sourceSpeed}:{})};
  });
  if(cursor!==draft.durationSeconds)fail("timeline");
  let captions=null;
  if(draft.captions!==null){
    if(!Array.isArray(draft.captions)||draft.captions.length>16)fail("captions");
    const seen=new Set();
    captions=draft.captions.map((caption,i)=>{
      if(!only(caption,["id","text","startSeconds","durationSeconds",
        "styleId","motionId","positionId","motionSpeed","motionDirection"])||
         !allowedId(caption.id)||seen.has(caption.id)||
         typeof caption.text!=="string"||!caption.text||
         normalizeStageCaption(caption.text)!==caption.text||
         !decimal(caption.startSeconds)||!decimal(caption.durationSeconds)||
         caption.startSeconds<0||caption.durationSeconds<.1||
         caption.startSeconds+caption.durationSeconds>draft.durationSeconds+.00001||
         (caption.styleId!==undefined&&!CAPTION_STYLE_IDS.includes(caption.styleId))||
         (caption.motionId!==undefined&&!CAPTION_MOTION_IDS.includes(caption.motionId))||
         (caption.positionId!==undefined&&!CAPTION_POSITION_IDS.includes(caption.positionId))||
         (caption.motionSpeed!==undefined&&![.5,1,1.5,2].includes(caption.motionSpeed))||
         (caption.motionDirection!==undefined&&!["left","right"].includes(caption.motionDirection)))
        fail("caption_"+i);
      seen.add(caption.id);
      return {id:caption.id,text:caption.text,
        startSeconds:caption.startSeconds,durationSeconds:caption.durationSeconds,
        ...(caption.styleId?{styleId:caption.styleId}:{}),
        ...(caption.motionId?{motionId:caption.motionId}:{}),
        ...(caption.positionId?{positionId:caption.positionId}:{}),
        ...(caption.motionSpeed!==undefined?{motionSpeed:caption.motionSpeed}:{}),
        ...(caption.motionDirection?{motionDirection:caption.motionDirection}:{})};
    });
  }
  if(!decimal(draft.audioStartSeconds)||draft.audioStartSeconds<0||
     draft.audioStartSeconds>=draft.durationSeconds)fail("audio_offset");
  let musicBed;
  if(draft.musicBed!==undefined){
    try{
      musicBed=validateMyTubeMusicBed(draft.musicBed);
      if(musicBed.id!=="none"&&(!Array.isArray(approvedAudioIds)||
         !approvedAudioIds.includes(musicBed.id)))fail("music_bed");
    }catch{fail("music_bed")}
  }
  return {format:MYTUBE_DRAFT_FORMAT,version:MYTUBE_DRAFT_VERSION,
    presetId:draft.presetId,aspect:draft.aspect,durationSeconds:draft.durationSeconds,
    shots,captions,audioStartSeconds:draft.audioStartSeconds,
    ...(musicBed!==undefined?{musicBed}:{})};
}
export function parseMyTubeEditorDraft(source,allowlists){
  if(typeof source!=="string"||source.length>MYTUBE_DRAFT_MAX_BYTES)fail("size");
  let value;
  try{value=JSON.parse(source)}catch{fail("json")}
  return strictDraft(value,allowlists);
}
export function createMyTubeEditorDraft({presetId,aspect,durationSeconds,shots,
  captions,audioStartSeconds,musicBed},allowlists){
  if(!Array.isArray(shots))fail("shots");
  const draft={format:MYTUBE_DRAFT_FORMAT,version:MYTUBE_DRAFT_VERSION,
    presetId,aspect,durationSeconds,
    shots:shots.map(shot=>({
      sceneId:shot.sceneId,startSeconds:shot.startSeconds,
      durationSeconds:shot.durationSeconds,
      captionText:normalizeStageCaption(shot.overlayText||""),
      transitionIn:shot.transitionIn??"soft",colorLook:shot.colorLook??"original",
      ...(shot.motion!==undefined?{motion:shot.motion}:{}),
      ...(shot.sourcePhasePercent!==undefined?{sourcePhasePercent:shot.sourcePhasePercent}:{}),
      ...(shot.sourceSpeed!==undefined?{sourceSpeed:shot.sourceSpeed}:{}),
    })),
    captions:captions===null?null:captions?.map(clip=>({
      id:clip.id,text:clip.text,startSeconds:clip.startSeconds,
      durationSeconds:clip.durationSeconds,
      ...(clip.styleId?{styleId:clip.styleId}:{}),
      ...(clip.motionId?{motionId:clip.motionId}:{}),
      ...(clip.positionId?{positionId:clip.positionId}:{}),
      ...(clip.motionSpeed!==undefined?{motionSpeed:clip.motionSpeed}:{}),
      ...(clip.motionDirection?{motionDirection:clip.motionDirection}:{}),
    })),
    audioStartSeconds,
    ...(musicBed!==undefined?{musicBed}:{}),
  };
  return JSON.stringify(strictDraft(draft,allowlists),null,2);
}
