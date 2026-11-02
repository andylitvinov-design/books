/**
 * One deterministic film-to-source clock for the licensed four-MP4 montage.
 *
 * Works only with the caller's existing approved storyboard and locally
 * decoded source. No external media, client text, network access or new player.
 *
 * `HTMLVideoElement.currentTime` is the playback clock, NOT proof that the
 * compositor has presented a fresh decoded frame. Final browser/ffprobe video
 * verification remains a separate release gate.
 */
const EPSILON=0.025;
export const LICENSED_SOURCE_MAX_DRIFT_SECONDS=0.65;
const invalid=()=>{throw Error("invalid_licensed_source_clock");};

/**
 * Map project seconds to the correct source time (including native clip loop).
 * Optional in/out are reserved for already verified local source trims.
 */
export function resolveLicensedSourceFrame(plan,projectSeconds,sourceDurationSeconds){
  if(!plan||!Array.isArray(plan.shots)||plan.shots.length!==4||
    !Number.isFinite(plan.durationSeconds)||plan.durationSeconds<=0||
    plan.durationSeconds>600||!Number.isFinite(projectSeconds)||
    projectSeconds<0||!Number.isFinite(sourceDurationSeconds)||
    sourceDurationSeconds<=0)invalid();
  let cursor=0;
  const seen=new Set();
  for(const shot of plan.shots){
    if(!shot||typeof shot.sceneId!=="string"||!shot.sceneId||
       seen.has(shot.sceneId)||!Number.isFinite(shot.startSeconds)||
       !Number.isFinite(shot.durationSeconds)||shot.durationSeconds<=0||
       Math.abs(shot.startSeconds-cursor)>EPSILON)invalid();
    seen.add(shot.sceneId);
    cursor+=shot.durationSeconds;
  }
  if(Math.abs(cursor-plan.durationSeconds)>EPSILON)invalid();
  const projectTimeSeconds=projectSeconds%plan.durationSeconds;
  const shotIndex=plan.shots.findIndex(shot=>
    projectTimeSeconds>=shot.startSeconds&&
    projectTimeSeconds<shot.startSeconds+shot.durationSeconds);
  if(shotIndex<0)invalid();
  const shot=plan.shots[shotIndex];
  const sourceInSeconds=shot.sourceInSeconds===undefined?0:shot.sourceInSeconds;
  const sourceOutSeconds=shot.sourceOutSeconds===undefined?sourceDurationSeconds:shot.sourceOutSeconds;
  if(!Number.isFinite(sourceInSeconds)||!Number.isFinite(sourceOutSeconds)||
    sourceInSeconds<0||sourceOutSeconds>sourceDurationSeconds+EPSILON||
    sourceOutSeconds-sourceInSeconds<0.1)invalid();
  const sourceSpanSeconds=sourceOutSeconds-sourceInSeconds;
  const stageSeconds=Math.max(0,projectTimeSeconds-shot.startSeconds);
  const expectedSourceSeconds=sourceInSeconds+(stageSeconds%sourceSpanSeconds);
  return Object.freeze({
    shotIndex,sceneId:shot.sceneId,projectTimeSeconds,stageSeconds,
    sourceInSeconds,sourceOutSeconds,sourceSpanSeconds,expectedSourceSeconds,
  });
}

/** Reject decoder lag or old preview frames rather than silently recording them. */
export function assessLicensedSourceFrame(video,frame,maxDriftSeconds=LICENSED_SOURCE_MAX_DRIFT_SECONDS){
  if(!frame||typeof frame.sceneId!=="string"||
    !Number.isFinite(frame.expectedSourceSeconds)||
    !Number.isFinite(frame.sourceSpanSeconds)||frame.sourceSpanSeconds<0.1||
    !Number.isFinite(maxDriftSeconds)||maxDriftSeconds<=0||maxDriftSeconds>2)invalid();
  if(!video||video.error||video.readyState<2||
     video.videoWidth<=0||video.videoHeight<=0)
    return Object.freeze({status:"unavailable",driftSeconds:null});
  if(video.seeking)return Object.freeze({status:"waiting",driftSeconds:null});
  const current=video.currentTime;
  if(!Number.isFinite(current)||current<0)
    return Object.freeze({status:"invalid",driftSeconds:null});
  const span=frame.sourceSpanSeconds;
  // A valid looping clip is continuous across sourceOut -> sourceIn.
  const offset=current-frame.sourceInSeconds;
  const expected=frame.expectedSourceSeconds-frame.sourceInSeconds;
  const driftSeconds=Math.min(Math.abs(offset-expected),
    Math.abs(offset-expected+span),Math.abs(offset-expected-span));
  const tolerance=Math.min(maxDriftSeconds,Math.max(0.15,span/3));
  return Object.freeze({
    status:offset < -EPSILON || offset>span+EPSILON || driftSeconds>tolerance
      ?"drift":"ready",
    driftSeconds,
  });
}
