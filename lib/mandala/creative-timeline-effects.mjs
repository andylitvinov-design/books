/**
 * Creative Timeline visual finishing on the same first-party Canvas used for
 * preview and recording. No CapCut assets, external URLs, uploads or new render
 * provider. Optional clip properties preserve all existing storyboard plans.
 */
export const CREATIVE_TRANSITIONS=Object.freeze(["soft","cut","fade_black","flash_white"]);
export const CREATIVE_LOOKS=Object.freeze(["original","warm","cool","dream"]);
export const CREATIVE_EDGE_SECONDS=.35;

const valid=(value,choices,fallback)=>choices.includes(value)?value:fallback;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const transitionFade=(mode,proximity)=>{
  const factor=clamp(proximity,0,1);
  if(mode==="cut")return {color:"17,36,30",alpha:0};
  if(mode==="fade_black")return {color:"0,0,0",alpha:factor};
  if(mode==="flash_white")return {color:"255,255,255",alpha:factor*.85};
  return {color:"17,36,30",alpha:factor*.25};
};

/**
 * Adjacent shots share the same edit at their junction: the incoming shot's
 * transitionIn controls both ends. "soft" matches the legacy edge darkening.
 */
export function creativeShotFrameAt(shots,index,localSeconds){
  if(!Array.isArray(shots)||!Number.isInteger(index)||index<0||
     index>=shots.length||!Number.isFinite(localSeconds)){
    return {look:"original",color:"17,36,30",alpha:0};
  }
  const shot=shots[index],duration=Number(shot?.durationSeconds);
  if(!Number.isFinite(duration)||duration<=0)
    return {look:"original",color:"17,36,30",alpha:0};
  const look=valid(shot.colorLook,CREATIVE_LOOKS,"original");
  const current=clamp(localSeconds,0,duration);
  const incoming=index===0?"soft":valid(shot.transitionIn,CREATIVE_TRANSITIONS,"soft");
  const next=index===shots.length-1?"soft":
    valid(shots[index+1]?.transitionIn,CREATIVE_TRANSITIONS,"soft");
  const start=transitionFade(incoming,1-current/CREATIVE_EDGE_SECONDS);
  const end=transitionFade(next,1-(duration-current)/CREATIVE_EDGE_SECONDS);
  const overlay=start.alpha>=end.alpha?start:end;
  return {look,...overlay};
}
const LOOK_TINTS=Object.freeze({
  warm:"rgba(244,168,71,.16)",
  cool:"rgba(39,137,178,.17)",
  dream:"rgba(139,104,213,.18)",
});

/** Shared Canvas effect implementation: preview and the actual encoded frame. */
export function paintCreativeTimelineShot(ctx,shots,index,localSeconds){
  const frame=creativeShotFrameAt(shots,index,localSeconds);
  if(!ctx||typeof ctx.fillRect!=="function")return frame;
  const w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.save();
  const tint=LOOK_TINTS[frame.look];
  if(tint){ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);}
  if(frame.alpha>0){
    ctx.fillStyle="rgba("+frame.color+","+frame.alpha.toFixed(3)+")";
    ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
  return frame;
}
