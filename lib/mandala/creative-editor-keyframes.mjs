/**
 * MyTube's original, local-only two-keyframe camera transform.
 * Executed by the SAME Canvas used for preview and browser MP4 recording.
 * No new media, API, subscription or device GPU dependency.
 */
export const MYTUBE_MOTION_PRESETS=Object.freeze([
  "none","push-in","pull-out","pan-left","pan-right","drift","tilt","custom"
]);
export const MYTUBE_MOTION_EASINGS=Object.freeze(["linear","smooth"]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const norm=(n)=>Math.round(n*1000)/1000;
const own=(o,keys)=>o!==null&&typeof o==="object"&&!Array.isArray(o)&&
  Object.getPrototypeOf(o)===Object.prototype&&
  Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const frame=(zoom=1.08,x=0,y=0,rotation=0)=>({
  zoom:norm(zoom),x:norm(x),y:norm(y),rotation:norm(rotation)
});
const pair=(preset,from,to,easing="smooth")=>({preset,from,to,easing});
const PRESET_FRAMES=Object.freeze({
  "push-in":pair("push-in",frame(1.05),frame(1.25)),
  "pull-out":pair("pull-out",frame(1.25),frame(1.05)),
  "pan-left":pair("pan-left",frame(1.2,.07),frame(1.2,-.07)),
  "pan-right":pair("pan-right",frame(1.2,-.07),frame(1.2,.07)),
  "drift":pair("drift",frame(1.16,.04,-.02),frame(1.2,-.04,.025)),
  "tilt":pair("tilt",frame(1.24,0,0,-3),frame(1.24,0,0,3))
});
export function motionPreset(id){
  if(id==="none")return null;
  if(id==="custom")return pair("custom",frame(1.08),frame(1.18));
  const value=PRESET_FRAMES[id];
  if(!value)throw Error("invalid_mytube_motion_preset");
  return {preset:value.preset,from:{...value.from},to:{...value.to},easing:value.easing};
}
const validFrame=value=>own(value,["zoom","x","y","rotation"])&&
  Number.isFinite(value.zoom)&&value.zoom>=1&&value.zoom<=1.6&&
  Number.isFinite(value.x)&&value.x>=-.16&&value.x<=.16&&
  Number.isFinite(value.y)&&value.y>=-.16&&value.y<=.16&&
  Number.isFinite(value.rotation)&&value.rotation>=-6&&value.rotation<=6;
/** Fail closed on imported motion values; never accept URLs or untrusted fields. */
export function validateMyTubeMotion(value){
  if(value===null)return null;
  if(!own(value,["preset","from","to","easing"])||
    !MYTUBE_MOTION_PRESETS.includes(value.preset)||value.preset==="none"||
    !MYTUBE_MOTION_EASINGS.includes(value.easing)||
    !validFrame(value.from)||!validFrame(value.to))
    throw Error("invalid_mytube_motion");
  return {
    preset:value.preset,easing:value.easing,
    from:{...value.from},to:{...value.to}
  };
}
/** One local source clock (0 to clip duration), independent of browser FPS. */
export function motionKeyframeAt(value,timeSeconds,durationSeconds){
  if(value===null)return frame(1,0,0,0);
  const motion=validateMyTubeMotion(value);
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0||
     !Number.isFinite(timeSeconds))throw Error("invalid_mytube_motion_clock");
  const progress=clamp(timeSeconds/durationSeconds,0,1);
  const t=motion.easing==="smooth"?progress*progress*(3-2*progress):progress;
  const from=motion.from,to=motion.to;
  return frame(
    from.zoom+(to.zoom-from.zoom)*t,
    from.x+(to.x-from.x)*t,
    from.y+(to.y-from.y)*t,
    from.rotation+(to.rotation-from.rotation)*t
  );
}
/** Camera motion around the video canvas center, not on top of title layers. */
export function paintMyTubeMotion(ctx,motion,localTime,durationSeconds,draw){
  if(typeof draw!=="function")throw Error("invalid_mytube_motion_draw");
  if(motion===null||motion===undefined){
    draw();return;
  }
  const key=motionKeyframeAt(motion,localTime,durationSeconds);
  const w=ctx?.canvas?.width,h=ctx?.canvas?.height;
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)
    throw Error("invalid_mytube_motion_canvas");
  ctx.save();
  try{
    // Dark backdrop avoids leaking the previous frame at the rotated corners.
    ctx.fillStyle="#10201d";ctx.fillRect(0,0,w,h);
    ctx.translate(w/2+key.x*w,h/2+key.y*h);
    ctx.rotate(key.rotation*Math.PI/180);
    ctx.scale(key.zoom,key.zoom);
    ctx.translate(-w/2,-h/2);
    draw();
  }finally{ctx.restore();}
}
