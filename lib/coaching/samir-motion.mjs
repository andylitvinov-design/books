// Approved three-state natural motion for Holistic House's seventh AI coach.
// The states are decorative video choices only; no inference, audio, or client data.
export const SAMIR_MOTION_TAKES=Object.freeze(['idle','listening','encourage']);
const SPEAKING_ENCOURAGE=new Set(['encourage','action','insight','closure']);
const FILES=Object.freeze({
  idle:'genie-natural-idle-v1.mp4',
  listening:'genie-natural-listening-v1.mp4',
  encourage:'genie-natural-encourage-v2.mp4',
});
export function samirMotionTake(phase='idle',scene='calm'){
  // Real microphone activity takes precedence over all positive text cues.
  if(phase==='listening'||phase==='thinking')return 'listening';
  // A congratulation or agreed next step during an actual coach reply is
  // encouraging. The content cue is produced by the existing reviewed
  // selectCoachVisualScene; this helper never processes private transcripts.
  if(phase==='speaking'&&SPEAKING_ENCOURAGE.has(scene))return 'encourage';
  // Before Play, in pauses, during loading and ordinary explanations.
  return 'idle';
}
export function samirMotionFilename(take){
  return Object.hasOwn(FILES,take)?FILES[take]:null;
}
export function samirMotionPath(take){
  const filename=samirMotionFilename(take);
  return filename?'/images/holistic-house/my-coach-motion/'+filename:null;
}

// Ordered, bounded rotation; unavailable media are skipped without retry loops.
export function nextSamirMotionTake(current,failed=[]){
  const start=SAMIR_MOTION_TAKES.indexOf(current);
  for(let offset=1;offset<=SAMIR_MOTION_TAKES.length;offset++){
    const candidate=SAMIR_MOTION_TAKES[(start+offset)%SAMIR_MOTION_TAKES.length];
    if(!failed.includes(candidate))return candidate;
  }
  return null;
}
