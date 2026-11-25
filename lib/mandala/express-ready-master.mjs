/**
 * Free Video Studio: fail-closed selection of an already finished, verified MP4.
 * This is NOT a renderer or a promise of personalized media. The index must
 * be emitted by the offline FFmpeg+ffprobe verifier, never by client input.
 * A fixed pre-rendered master is eligible ONLY for the identical immutable
 * render-plan fingerprint, scene order, language, duration, aspect and audio.
 */
import {videoRenderFingerprint} from "./render-plan-v2.mjs";
export const EXPRESS_READY_INDEX_VERSION="hh-express-ready-index-v1";
export const EXPRESS_READY_PATH="/videos/holistic-house/express-v1/";
const SHA256=/^[a-f0-9]{64}$/;
const PLAN_HASH=/^fnv64-[0-9a-f]{16}$/;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALES=new Set(["en","ru","es"]);
const ASPECTS={portrait:[720,1280],landscape:[1280,720],square:[720,720]};
const MAX_MASTER_BYTES=25*1024*1024;

const reject=(reason)=>Object.freeze({strategy:"render_required",reason,master:null});
const same=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&
  left.length===right.length&&left.every((value,i)=>value===right[i]);

/** Pure structural check only; offline build MUST verify SHA and actual decode. */
export function isVerifiedExpressMaster(entry){
  if(!entry||entry.status!=="verified"||!ID.test(entry.id||"")||
     !LOCALES.has(entry.locale)||!PLAN_HASH.test(entry.planHash||"")||
     !ID.test(entry.presetId||"")||!SHA256.test(entry.sha256||"")||
     entry.path!==EXPRESS_READY_PATH+entry.id+".mp4"||
     !Number.isInteger(entry.bytes)||entry.bytes<4096||entry.bytes>MAX_MASTER_BYTES||
     !Number.isInteger(entry.durationMs)||![10000,15000,20000,30000,60000].includes(entry.durationMs)||
     !Object.hasOwn(ASPECTS,entry.aspect)||
     !Number.isFinite(entry.verifiedDurationMs)||
     Math.abs(entry.verifiedDurationMs-entry.durationMs)>500||
     !Number.isInteger(entry.fps)||entry.fps<23||entry.fps>30||
     entry.videoCodec!=="h264"||entry.pixelFormat!=="yuv420p"||
     entry.audioCodec!=="aac"&&entry.audioCodec!=="none"||
     !Array.isArray(entry.sceneIds)||entry.sceneIds.length<4||entry.sceneIds.length>6||
     new Set(entry.sceneIds).size!==entry.sceneIds.length||
     entry.sceneIds.some(id=>!ID.test(id))||
     !Array.isArray(entry.audioIds)||entry.audioIds.some(id=>!ID.test(id))||
     typeof entry.captioned!=="boolean"||
     typeof entry.proofVersion!=="string"||entry.proofVersion!=="ffprobe-ffmpeg-verified-v1")return false;
  const dimensions=ASPECTS[entry.aspect];
  return entry.width===dimensions[0]&&entry.height===dimensions[1]&&
    (entry.audioIds.length>0?entry.audioCodec==="aac":entry.audioCodec==="none");
}

/**
 * @param {{plan:object,locale:'en'|'ru'|'es',index:{version:string,masters:object[]}}} options
 * @returns {{strategy:'ready_master'|'render_required', reason:string,master:null|object}}
 * Invalid, missing, user-customized or stale video never becomes catalog MP4.
 */
export function chooseExactExpressReadyMaster({plan,locale,index}={}){
  if(!plan||!PLAN_HASH.test(plan.planHash||"")||
     plan.version!=="hh-render-plan-v2"||plan.projectId!=="guest-preview"||
     plan.projectRevision!==0||plan.privacy?.localOnly!==true||
     !LOCALES.has(locale)||!Object.hasOwn(ASPECTS,plan.requestedTarget?.aspect)||
     !Array.isArray(plan.shots)||plan.shots.length<4||plan.shots.length>6||
     !Array.isArray(plan.audioTracks)||!Array.isArray(plan.captions)||
     !Number.isInteger(plan.durationMs))return reject("PLAN_NOT_EXPRESS_CANONICAL");
  // planHash includes every render-affecting field; a caller cannot keep the
  // old hash after editing caption, audio, filters or other plan metadata.
  const {planHash,...renderBody}=plan;
  if(videoRenderFingerprint(renderBody)!==planHash)
    return reject("PLAN_FINGERPRINT_STALE");
  const sceneIds=plan.shots.map(shot=>shot?.sceneAssetId);
  if(sceneIds.some(id=>!ID.test(id||""))||new Set(sceneIds).size!==sceneIds.length)
    return reject("PLAN_SOURCES_INVALID");
  if(!index||index.version!==EXPRESS_READY_INDEX_VERSION||
     !Array.isArray(index.masters)||index.masters.length>30)
    return reject("NO_VERIFIED_MASTERS");
  const master=index.masters.find(entry=>
    isVerifiedExpressMaster(entry)&&entry.planHash===plan.planHash&&
    entry.presetId===plan.presetId&&entry.locale===locale&&
    entry.aspect===plan.requestedTarget.aspect&&
    entry.durationMs===plan.durationMs&&
    entry.width===plan.requestedTarget.width&&entry.height===plan.requestedTarget.height&&
    same(entry.sceneIds,sceneIds)&&
    same(entry.audioIds,plan.audioTracks.map(track=>track?.assetId))&&
    entry.captioned===(plan.captions.length>0));
  if(!master)return reject("NO_EXACT_FINISHED_MASTER");
  // No XP/credits are handled here. The existing ledger and consent gates
  // remain the single authoritative source of order/account settlement.
  return Object.freeze({strategy:"ready_master",reason:"EXACT_VERIFIED_MASTER",
    master:Object.freeze({url:master.path,mime:"video/mp4",sha256:master.sha256,
      bytes:master.bytes,sourceIds:Object.freeze([...master.sceneIds]),
      durationMs:master.durationMs,locale:master.locale})});
}
