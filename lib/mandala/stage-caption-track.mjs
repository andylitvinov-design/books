/**
 * Local stage-caption track for the one approved four-shot Free montage.
 * Explicit client text stays in the ephemeral browser storyboard, never an AI
 * provider request, URL, CRM record, payment event or server-side log.
 */
export const STAGE_CAPTION_LIMIT=96;

/** Normalize Unicode and controls before drawing on Canvas. */
export function normalizeStageCaption(value) {
  if(typeof value!=="string")return "";
  return Array.from(value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g," ")
    .replace(/\s+/gu," ").trim()).slice(0,STAGE_CAPTION_LIMIT).join("");
}

/**
 * Pick exactly one authored caption from the rendered storyboard timestamp.
 * No caption is synthesized, generated, or displayed without client input.
 * @param {{shots?:readonly {startSeconds:number,durationSeconds:number,overlayText?:string}[]}|null} plan
 * @param {number} seconds
 */
export function stageCaptionAt(plan,seconds){
  if(!plan||!Array.isArray(plan.shots)||!Number.isFinite(seconds)||seconds<0)return null;
  const shot=plan.shots.find(s=>Number.isFinite(s.startSeconds)&&
    Number.isFinite(s.durationSeconds)&&s.durationSeconds>0&&
    seconds>=s.startSeconds&&seconds<s.startSeconds+s.durationSeconds);
  if(!shot)return null;
  const text=normalizeStageCaption(shot.overlayText);
  if(!text)return null;
  const localTime=seconds-shot.startSeconds;
  const fadeIn=Math.min(1,localTime/.25);
  const fadeOut=Math.min(1,Math.max(0,shot.durationSeconds-localTime)/.35);
  return Object.freeze({text,alpha:Math.max(0,Math.min(fadeIn,fadeOut)),
    localTime,durationSeconds:shot.durationSeconds});
}
