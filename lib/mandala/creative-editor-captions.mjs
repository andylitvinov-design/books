/**
 * Authored SRT subtitles and real Canvas text motion presets.
 * Never claims transcription, AI captioning, cloud processing or music rights.
 */
import {normalizeStageCaption} from "./stage-caption-track.mjs";
export const CAPTION_STYLE_IDS=Object.freeze(["classic","cinema","minimal","glow"]);
export const CAPTION_MOTION_IDS=Object.freeze(["none","fade","slide_up","pop","move","grow","shrink","rotate","float","pulse","type"]);
export const CAPTION_POSITION_IDS=Object.freeze(["bottom","center","top"]);
export const CAPTION_CUE_LIMIT=16;
export const CAPTION_SRT_BYTES=64*1024;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const round=t=>Math.round(t*10)/10;
const valid=(v,options,fallback)=>options.includes(v)?v:fallback;

export function normalizeCaptionAppearance(clip={}){
  return {styleId:valid(clip.styleId,CAPTION_STYLE_IDS,"classic"),
    motionId:valid(clip.motionId,CAPTION_MOTION_IDS,"none"),
    positionId:valid(clip.positionId,CAPTION_POSITION_IDS,"bottom")};
}
export function captionAnimationFrame(clip,localTime,duration,baseAlpha=1){
  const {styleId,motionId,positionId}=normalizeCaptionAppearance(clip);
  const seconds=Math.max(.1,Number(duration)||.1);
  const at=clamp(Number.isFinite(localTime)?localTime:0,0,seconds);
  const entry=clamp(at/.45,0,1);
  const easing=1-Math.pow(1-entry,3);
  const exit=clamp((seconds-at)/.28,0,1);
  let alpha=clamp(baseAlpha,0,1);
  if(motionId!=="none")alpha*=exit;
  let translateY=0,translateX=0,rotation=0,scale=1,reveal=1;
  const speed=[.5,1,1.5,2].includes(clip.motionSpeed)?clip.motionSpeed:1;
  const direction=clip.motionDirection==="left"?-1:1;
  const progress=clamp((at/seconds)*speed,0,1);
  const phase=at*speed*2*Math.PI/seconds;
  if(motionId==="fade")alpha*=entry;
  if(motionId==="slide_up"){
    translateY=(1-easing)*.075;
    alpha*=entry;
  }
  if(motionId==="pop"){
    scale=.84+easing*.16;
    alpha*=clamp(at/.14,0,1);
  }
  if(motionId==="move")translateX=direction*(progress-.5)*.26;
  if(motionId==="grow")scale=.70+.55*progress;
  if(motionId==="shrink")scale=1.32-.54*progress;
  if(motionId==="rotate")rotation=direction*2*Math.PI*progress;
  if(motionId==="float"){translateY=Math.sin(phase*2)*.035;translateX=direction*Math.sin(phase)*.02;}
  if(motionId==="pulse")scale=1+.10*Math.sin(phase*3);
  if(motionId==="type")reveal=clamp(at*speed/Math.min(seconds,Math.max(.35,seconds*.65)),0,1);
  return {styleId,motionId,positionId,alpha,translateY,translateX,rotation,scale,reveal};
}
const stampToSeconds=stamp=>{
  const m=/^(\d{2}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(stamp);
  if(!m)return null;
  return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;
};
const secondsToStamp=value=>{
  const ms=Math.round(Math.max(0,value)*1000);
  const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),
        s=Math.floor(ms%60000/1000),frac=ms%1000;
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":")+
    ","+String(frac).padStart(3,"0");
};
export function importSrtCaptionClips(contents,seconds){
  if(typeof contents!=="string"||contents.length>CAPTION_SRT_BYTES||
    !Number.isFinite(seconds)||seconds<=0||seconds>3600)
    throw Error("invalid_srt_input");
  const blocks=contents.replace(/^\uFEFF/,"").replace(/\r/g,"").trim()
    .split(/\n\s*\n/g).filter(Boolean);
  if(!blocks.length||blocks.length>CAPTION_CUE_LIMIT)
    throw Error("srt_cue_count_limit");
  const cues=[];
  for(const block of blocks){
    const lines=block.split("\n").map(l=>l.trim()).filter(Boolean);
    const lineIndex=lines[0]?.includes("-->")?0:1;
    const timings=/^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[lineIndex]||"");
    if(!timings||lines.length<=lineIndex+1)throw Error("invalid_srt_timecode");
    const from=stampToSeconds(timings[1]),to=stampToSeconds(timings[2]);
    if(from===null||to===null||from>=seconds||to<=from||to-from<.15)
      throw Error("invalid_srt_range");
    const startSeconds=round(from),endSeconds=round(Math.min(seconds,to));
    const text=normalizeStageCaption(lines.slice(lineIndex+1).join(" "));
    if(!text||endSeconds-startSeconds<.1)throw Error("invalid_srt_caption");
    cues.push({id:"srt-"+(cues.length+1),text,startSeconds,
      durationSeconds:round(endSeconds-startSeconds)});
  }
  return cues;
}
export function exportSrtCaptionClips(clips,seconds){
  if(!Array.isArray(clips)||clips.length>CAPTION_CUE_LIMIT||
    !Number.isFinite(seconds)||seconds<=0)throw Error("invalid_srt_clips");
  return clips.filter(c=>typeof c.text==="string"&&c.text.trim()).map((c,i)=>{
    const from=clamp(Number(c.startSeconds),0,seconds);
    const to=clamp(from+Number(c.durationSeconds),from,seconds);
    if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)
      throw Error("invalid_srt_clip_time");
    return String(i+1)+"\n"+secondsToStamp(from)+" --> "+
      secondsToStamp(to)+"\n"+normalizeStageCaption(c.text);
  }).join("\n\n")+"\n";
}
