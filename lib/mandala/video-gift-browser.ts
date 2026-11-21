"use client";
import {encodeLocalWebCodecsMp4,supportsProceduralWebCodecsMp4,
  normalizeNativeSafariMp4ForPlayback,verifyNativeSafariMp4Tracks} from "./webcodecs-mp4-export";
import {acquirePlaybackSession} from "./local-video-music";
import {VIDEO_GIFT_DURATION,videoGiftStage} from "./video-gift-contract.mjs";
import type {VideoGiftManifest} from "./video-gift-contract.mjs";
import {Input,MP4,UrlSource,CanvasSink} from "mediabunny";
import {giftApprovedSceneById} from "./video-gift-clip-catalog.mjs";
import type {GiftScene} from "./video-gift-clip-catalog.mjs";

const COLORS={
  sunrise:["#3b5366","#f0bf92","#fff9ef"],
  rose:["#553948","#edb3b6","#fff9f3"],
  ocean:["#193d52","#8ac5cf","#f5ffff"],
  forest:["#1f4d43","#b7c9a1","#fffef0"],
} as const;
const FRAME_RATE=12;
export const VIDEO_GIFT_SIZES={portrait:[360,640],landscape:[640,360]} as const;
export type GiftSound={music:"none"|"forest"|"breeze"|"crystal";voice:File|null};

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const radius=Math.max(0,Math.min(r,w/2,h/2));
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+radius);ctx.lineTo(x+w,y+h-radius);
  ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);ctx.lineTo(x+radius,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-radius);ctx.lineTo(x,y+radius);
  ctx.quadraticCurveTo(x,y,x+radius,y);ctx.closePath();
}
function textLines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){
  const words=text.split(/\s+/).filter(Boolean);
  const out:string[]=[];let line="";
  for(const word of words){
    const proposed=line?line+" "+word:word;
    if(ctx.measureText(proposed).width<=maxWidth){line=proposed;continue;}
    if(line)out.push(line);
    // Avoid a single long unbroken word/URL escaping the frame.
    if(ctx.measureText(word).width>maxWidth){
      let fragment="";
      for(const ch of Array.from(word)){
        if(fragment&&ctx.measureText(fragment+ch).width>maxWidth){out.push(fragment);fragment=ch;}
        else fragment+=ch;
      }
      line=fragment;
    }else line=word;
  }
  if(line)out.push(line);
  return out;
}
function drawTitle(ctx:CanvasRenderingContext2D,text:string,y:number,font:number,maxLines=3){
  const w=ctx.canvas.width,maxWidth=w-48;
  ctx.font="700 "+font+"px system-ui, -apple-system, sans-serif";
  let lines=textLines(ctx,text,maxWidth);
  while(lines.length>maxLines&&font>18){
    font-=2;ctx.font="700 "+font+"px system-ui, -apple-system, sans-serif";
    lines=textLines(ctx,text,maxWidth);
  }
  ctx.textAlign="center";ctx.textBaseline="middle";
  const step=font*1.27;
  lines.slice(0,maxLines).forEach((line,i)=>ctx.fillText(line,w/2,y+(i-(lines.length-1)/2)*step,maxWidth));
}
function paintPhoto(ctx:CanvasRenderingContext2D,image:HTMLImageElement,t:number,motion:string){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  if(!image.naturalWidth||!image.naturalHeight)throw new Error("gift_photo_not_decoded");
  const portrait=w<h;
  const margin=portrait?18:26;
  const x=margin,y=portrait?72:23,fw=w-2*margin,fh=portrait?h-154:h-46;
  ctx.save();rounded(ctx,x,y,fw,fh,portrait?22:18);ctx.clip();
  const base=Math.max(fw/image.naturalWidth,fh/image.naturalHeight);
  const phase=Math.max(0,Math.min(1,t/VIDEO_GIFT_DURATION));
  const zoom=motion==="zoom"?1.02+.095*phase:motion==="float"?1.07:1.045;
  const dx=motion==="pan"?(phase-.5)*Math.min(18,fw*.04):
    motion==="float"?Math.sin(t*.7)*4:0;
  const dy=motion==="float"?Math.sin(t*.52)*5:0;
  const dw=image.naturalWidth*base*zoom,dh=image.naturalHeight*base*zoom;
  ctx.drawImage(image,x+(fw-dw)/2+dx,y+(fh-dh)/2+dy,dw,dh);
  const shade=ctx.createLinearGradient(0,y+fh*.38,0,y+fh);
  shade.addColorStop(0,"rgba(9,21,24,0)");shade.addColorStop(1,"rgba(8,20,25,.71)");
  ctx.fillStyle=shade;ctx.fillRect(x,y,fw,fh);
  ctx.restore();
}
function paintGiftScene(ctx:CanvasRenderingContext2D,source:CanvasImageSource){
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const margin=w<h?18:26,x=margin,y=w<h?72:23;
  const fw=w-margin*2,fh=w<h?h-154:h-46;
  const sw=Number("videoWidth" in source?source.videoWidth:
    (source as HTMLCanvasElement).width);
  const sh=Number("videoHeight" in source?source.videoHeight:
    (source as HTMLCanvasElement).height);
  if(!Number.isFinite(sw)||!Number.isFinite(sh)||sw<100||sh<100)
    throw new Error("gift_scene_frame_unavailable");
  ctx.save();rounded(ctx,x,y,fw,fh,w<h?22:18);ctx.clip();
  const scale=Math.max(fw/sw,fh/sh);
  const dw=sw*scale,dh=sh*scale;
  ctx.drawImage(source,x+(fw-dw)/2,y+(fh-dh)/2,dw,dh);
  const shade=ctx.createLinearGradient(0,y+fh*.38,0,y+fh);
  shade.addColorStop(0,"rgba(9,21,24,0)");shade.addColorStop(1,"rgba(8,20,25,.74)");
  ctx.fillStyle=shade;ctx.fillRect(x,y,fw,fh);
  ctx.restore();
}
function stageOpacity(t:number,start:number,end:number){
  return Math.max(0,Math.min(1,(t-start)/.55,(end-t)/.55));
}
/** Used identically for live preview, local H.264/AAC export and retries. */
export function paintVideoGiftFrame(ctx:CanvasRenderingContext2D,
  image:HTMLImageElement,manifest:VideoGiftManifest,seconds:number,
  sceneFrame:CanvasImageSource|null=null,sceneCredit:string|null=null){
  const w=ctx.canvas.width,h=ctx.canvas.height,t=Math.max(0,Math.min(24.999,seconds));
  const [dark,bright,white]=COLORS[manifest.palette];
  const bg=ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,dark);bg.addColorStop(.72,bright);bg.addColorStop(1,dark);
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.fillStyle="rgba(255,255,255,.08)";
  for(let i=0;i<13;i++){
    const x=(i*79+t*4)%w,y=(i*123+t*2)%h;
    ctx.beginPath();ctx.arc(x,y,(i%3)+1.8,0,2*Math.PI);ctx.fill();
  }
  // AI facial motion is never faked: paid motion modes require an actual
  // consented provider clip, not this free-photo compositor.
  if(manifest.requiresPaidAnimation)throw new Error("gift_paid_fragment_required");
  if(t>=14&&t<19&&sceneFrame)paintGiftScene(ctx,sceneFrame);
  else paintPhoto(ctx,image,t,manifest.motion);
  const portrait=w<h;
  const captionY=portrait?h-160:h-74;
  ctx.textAlign="center";ctx.fillStyle=white;
  ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=10;
  const stage=videoGiftStage(t);
  if(stage==="intro"){
    ctx.globalAlpha=stageOpacity(t,0,3);
    drawTitle(ctx,manifest.recipient,portrait?h*.74:h*.73,portrait?37:33,2);
  }else if(stage==="portrait"){
    ctx.globalAlpha=stageOpacity(t,3,8);
    drawTitle(ctx,manifest.recipient,captionY,portrait?26:23,2);
  }else if(stage==="message"){
    ctx.globalAlpha=stageOpacity(t,8,19);
    const font=portrait?22:19;
    ctx.font="600 "+font+"px system-ui, -apple-system, sans-serif";
    const lines=textLines(ctx,manifest.message,w-52);
    const pageSize=portrait?4:3;
    const pages=Math.max(1,Math.ceil(lines.length/pageSize));
    const index=Math.min(pages-1,Math.floor(((t-8)/11)*pages));
    const page=lines.slice(index*pageSize,(index+1)*pageSize);
    ctx.textAlign="center";ctx.textBaseline="middle";
    const lineHeight=font*1.35;
    const y=captionY-(page.length-1)*lineHeight/2;
    page.forEach((line,i)=>ctx.fillText(line,w/2,y+i*lineHeight,w-52));
  }else{
    ctx.globalAlpha=stageOpacity(t,19,25);
    drawTitle(ctx,manifest.finalWish,portrait?h*.75:h*.76,portrait?26:24,3);
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  if(t>=14&&t<19&&sceneFrame&&sceneCredit){
    ctx.save();
    ctx.font="500 9px system-ui, -apple-system, sans-serif";
    ctx.fillStyle="#f4eee3";ctx.textBaseline="bottom";ctx.textAlign="left";
    ctx.shadowColor="rgba(0,0,0,.85)";ctx.shadowBlur=4;
    ctx.fillText(sceneCredit,24,h-14,w-48);
    ctx.restore();
  }
  const trim=ctx.createLinearGradient(0,h-38,0,h);
  trim.addColorStop(0,"rgba(2,17,18,0)");trim.addColorStop(1,"rgba(2,17,18,.28)");
  ctx.fillStyle=trim;ctx.fillRect(0,h-38,w,38);
}
async function localAudioMaster(sound:GiftSound,signal:AbortSignal):Promise<AudioBuffer|undefined>{
  if(sound.music==="none"&&!sound.voice)return undefined;
  signal.throwIfAborted();
  const rate=48000;
  const ctx=new OfflineAudioContext(2,rate*VIDEO_GIFT_DURATION,rate);
  const tracks:{data:AudioBuffer;gain:number;start:number;loop:boolean}[]=[];
  if(sound.music!=="none"){
    const response=await fetch("/audio/mandala/"+sound.music+".wav",{
      credentials:"omit",mode:"same-origin",redirect:"error",signal,
    });
    if(!response.ok)throw new Error("gift_soundtrack_unavailable");
    const data=await response.arrayBuffer();
    if(data.byteLength>15_000_000)throw new Error("gift_soundtrack_too_large");
    tracks.push({data:await ctx.decodeAudioData(data),gain:.43,start:0,loop:true});
  }
  if(sound.voice){
    const file=sound.voice;
    if(file.size<128||file.size>15_000_000||!file.type.startsWith("audio/"))
      throw new Error("gift_voice_invalid");
    tracks.push({data:await ctx.decodeAudioData(await file.arrayBuffer()),
      gain:.93,start:3,loop:false});
  }
  for(const track of tracks){
    signal.throwIfAborted();
    const node=ctx.createBufferSource(),gain=ctx.createGain();
    node.buffer=track.data;node.loop=track.loop;
    gain.gain.setValueAtTime(0,0);
    gain.gain.linearRampToValueAtTime(track.gain,.4+track.start);
    gain.gain.setValueAtTime(track.gain,22.3);
    gain.gain.linearRampToValueAtTime(0,VIDEO_GIFT_DURATION-.06);
    node.connect(gain).connect(ctx.destination);
    node.start(track.start);
    node.stop(VIDEO_GIFT_DURATION);
  }
  const audio=await ctx.startRendering();
  signal.throwIfAborted();
  return audio;
}
function nativeMime(hasAudio:boolean){
  if(typeof MediaRecorder==="undefined"||typeof HTMLCanvasElement==="undefined"||
    !HTMLCanvasElement.prototype.captureStream)return null;
  const options=hasAudio
    ?['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4']
    :['video/mp4;codecs="avc1.42E01E"','video/mp4'];
  return options.find(mime=>MediaRecorder.isTypeSupported(mime))??null;
}
async function nativeGiftMp4(canvas:HTMLCanvasElement,
  image:HTMLImageElement,manifest:VideoGiftManifest,audio:AudioBuffer|undefined,
  signal:AbortSignal,onProgress:(p:number)=>void,mime:string,
  preactivatedContext:AudioContext|null=null,
  sceneVideo:HTMLVideoElement|null=null,sceneCredit:string|null=null):Promise<Blob>{
  const stream=canvas.captureStream(FRAME_RATE);
  const tracks:MediaStreamTrack[]=[...stream.getVideoTracks()];
  let context:AudioContext|null=null;
  let source:AudioBufferSourceNode|null=null;
  let restoreAudio=()=>{};
  let animation=0,watchdog=0;
  try{
    if(audio){
      restoreAudio=acquirePlaybackSession();
      context=preactivatedContext??new AudioContext();
      await context.resume();
      const destination=context.createMediaStreamDestination();
      source=context.createBufferSource();source.buffer=audio;
      source.connect(destination);
      tracks.push(...destination.stream.getAudioTracks());
    }
    const combined=new MediaStream(tracks);
    let scenePlaybackFailed=false;
    let sceneStarted=false;
    let recorder:MediaRecorder;
    try{recorder=new MediaRecorder(combined,{
      mimeType:mime,videoBitsPerSecond:2200000,audioBitsPerSecond:128000,
    });}catch{throw new Error("gift_mp4_codec_unavailable");}
    const chunks:Blob[]=[];
    const done=new Promise<Blob>((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>reject(new Error("gift_mp4_recording_failed"));
      recorder.onstop=()=>resolve(new Blob(chunks,{type:"video/mp4"}));
    });
    signal.throwIfAborted();
    const started=performance.now();
    const abort=()=>{
      if(recorder.state!=="inactive")recorder.stop();
    };
    signal.addEventListener("abort",abort,{once:true});
    try{
      paintVideoGiftFrame(canvas.getContext("2d")!,image,manifest,0);
      recorder.start(1000);
      source?.start();
      await new Promise<void>((resolve,reject)=>{
        const step=()=>{
          if(signal.aborted){reject(new Error("gift_export_cancelled"));return;}
          if(scenePlaybackFailed){reject(new Error("gift_scene_playback_failed"));return;}
          try{
            const elapsed=(performance.now()-started)/1000;
            const inScene=Boolean(sceneVideo&&elapsed>=14&&elapsed<19);
            if(inScene&&sceneVideo&&!sceneStarted){
              sceneStarted=true;
              sceneVideo.currentTime=0;
              void sceneVideo.play().catch(()=>{scenePlaybackFailed=true;});
            }
            if(sceneStarted&&sceneVideo&&elapsed>=19&&!sceneVideo.paused)
              sceneVideo.pause();
            const visual=inScene&&sceneVideo?.readyState&&sceneVideo.readyState>=2
              ?sceneVideo:null;
            if(inScene&&!visual)throw new Error("gift_scene_frame_unavailable");
            paintVideoGiftFrame(canvas.getContext("2d")!,image,manifest,elapsed,
              visual,sceneCredit);
            onProgress(Math.min(99,Math.round(elapsed/VIDEO_GIFT_DURATION*100)));
            if(elapsed>=VIDEO_GIFT_DURATION){resolve();return;}
            animation=requestAnimationFrame(step);
          }catch(error){reject(error);}
        };
        step();
        watchdog=window.setTimeout(()=>reject(new Error("gift_export_timed_out")),
          (VIDEO_GIFT_DURATION+20)*1000);
      });
      if(recorder.state!=="inactive")recorder.stop();
      const raw=await Promise.race([
        done,
        new Promise<never>((_,reject)=>window.setTimeout(
          ()=>reject(new Error("gift_finalize_timed_out")),10000)),
      ]);
      signal.throwIfAborted();
      await verifyNativeSafariMp4Tracks(raw,Boolean(audio));
      const final=await normalizeNativeSafariMp4ForPlayback(raw,Boolean(audio),VIDEO_GIFT_DURATION);
      onProgress(100);
      return final;
    }finally{
      signal.removeEventListener("abort",abort);
      if(recorder.state!=="inactive")recorder.stop();
    }
  }finally{
    cancelAnimationFrame(animation);clearTimeout(watchdog);
    try{source?.stop();}catch{/* Source may not have started. */}
    sceneVideo?.pause();
    tracks.forEach(track=>track.stop());stream.getTracks().forEach(track=>track.stop());
    await context?.close().catch(()=>{});
    restoreAudio();
  }
}

async function prepareNativeGiftScene(scene:GiftScene,signal:AbortSignal):Promise<HTMLVideoElement>{
  const video=document.createElement("video");
  video.preload="auto";video.muted=true;video.playsInline=true;
  video.crossOrigin="anonymous";video.src=scene.video;
  try{
    await new Promise<void>((resolve,reject)=>{
      let done=false;
      const cleanup=()=>{
        video.removeEventListener("canplay",ready);
        video.removeEventListener("error",fail);
        signal.removeEventListener("abort",cancel);
        clearTimeout(timer);
      };
      const finish=(error?:Error)=>{
        if(done)return;done=true;cleanup();error?reject(error):resolve();
      };
      const ready=()=>video.videoWidth>100&&video.videoHeight>100&&video.readyState>=2
        ?finish():undefined;
      const fail=()=>finish(new Error("gift_scene_decode_failed"));
      const cancel=()=>finish(new Error("gift_export_cancelled"));
      const timer=setTimeout(()=>finish(new Error("gift_scene_load_timed_out")),12000);
      video.addEventListener("canplay",ready);
      video.addEventListener("error",fail);
      signal.addEventListener("abort",cancel,{once:true});
      video.load();
      if(video.readyState>=2)ready();
    });
    if(!Number.isFinite(video.duration)||video.duration<4.4)
      throw new Error("gift_scene_too_short");
    return video;
  }catch(error){
    video.pause();video.removeAttribute("src");video.load();
    throw error;
  }
}
async function createDecodedGiftScene(scene:GiftScene,signal:AbortSignal,
  width:number,height:number){
  const url=new URL(scene.video,location.origin);
  if(url.origin!==location.origin||
    !url.pathname.startsWith("/videos/holistic-house/film-collection-v3/"))
    throw new Error("gift_scene_origin_invalid");
  const input=new Input({source:new UrlSource(url,{
    maxCacheSize:4*1024*1024,parallelism:1,
    getRetryDelay:attempt=>attempt<2?0.25:null,
  }),formats:[MP4]});
  try{
    const track=await input.getPrimaryVideoTrack();
    if(!track||await track.getCodec()!=="avc"||!(await track.canDecode()))
      throw new Error("gift_scene_invalid_video");
    signal.throwIfAborted();
    const sink=new CanvasSink(track,{width,height,fit:"cover",poolSize:2});
    const count=5*FRAME_RATE;
    const timestamps=Array.from({length:count},(_,i)=>i/FRAME_RATE);
    return {input,frames:sink.canvasesAtTimestamps(timestamps)};
  }catch(error){input.dispose();throw error;}
}
/** Shared Video Studio MP4 exporter. Optional reviewed source is an actual 5s
 * moving shot on the 14-19s timeline, never a Drive link or static substitute. */
export async function exportVideoGiftMp4({image,manifest,sound,sceneId,signal,onProgress}:{
  image:HTMLImageElement;manifest:VideoGiftManifest;sound:GiftSound;
  sceneId?:string|null;
  signal:AbortSignal;onProgress:(percent:number)=>void;
}):Promise<Blob>{
  if(manifest.requiresPaidAnimation)throw new Error("gift_paid_fragment_required");
  if(!image.naturalWidth||!image.naturalHeight)throw new Error("gift_photo_not_decoded");
  signal.throwIfAborted();
  const scene=sceneId?giftApprovedSceneById(sceneId):null;
  if(sceneId&&!scene)throw new Error("gift_scene_not_approved");
  const canvas=document.createElement("canvas");
  const [width,height]=VIDEO_GIFT_SIZES[manifest.aspect];
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw new Error("gift_canvas_unavailable");
  const needsAudio=sound.music!=="none"||Boolean(sound.voice);
  const mobileApple=/iPhone|iPad|iPod/.test(navigator.userAgent);
  const mime=nativeMime(needsAudio);
  const nativeFirst=Boolean(mobileApple&&mime);
  let preactivatedContext:AudioContext|null=null;
  let nativeScene:HTMLVideoElement|null=null;
  let decoded:Awaited<ReturnType<typeof createDecodedGiftScene>>|null=null;
  try{
    if(nativeFirst&&needsAudio){
      preactivatedContext=new AudioContext();
      void preactivatedContext.resume().catch(()=>{});
    }
    const audio=await localAudioMaster(sound,signal);
    signal.throwIfAborted();
    if(nativeFirst&&mime){
      if(scene)nativeScene=await prepareNativeGiftScene(scene,signal);
      const readyContext=preactivatedContext;
      preactivatedContext=null;
      return await nativeGiftMp4(canvas,image,manifest,audio,signal,onProgress,mime,
        readyContext,nativeScene,scene?.credit??null);
    }
    if(supportsProceduralWebCodecsMp4(needsAudio)){
      if(scene)decoded=await createDecodedGiftScene(scene,signal,width,height);
      return await encodeLocalWebCodecsMp4({
        canvas,allowProceduralBrowser:true,seconds:VIDEO_GIFT_DURATION,
        frameRate:FRAME_RATE,audioMaster:audio,
        sourceFrameClock:"timestamp-decoded",
        shouldContinue:()=>!signal.aborted,onProgress,
        renderFrame:async second=>{
          signal.throwIfAborted();
          let visual:CanvasImageSource|null=null;
          if(decoded&&second>=14&&second<19){
            const {value}=await decoded.frames.next();
            if(!value)throw new Error("gift_scene_frame_unavailable");
            visual=value.canvas;
          }
          paintVideoGiftFrame(ctx,image,manifest,second,visual,scene?.credit??null);
          return true;
        },
      });
    }
    if(mime){
      if(scene)nativeScene=await prepareNativeGiftScene(scene,signal);
      return await nativeGiftMp4(canvas,image,manifest,audio,signal,onProgress,mime,
        null,nativeScene,scene?.credit??null);
    }
    throw new Error("gift_mp4_not_supported_on_device");
  }finally{
    if(preactivatedContext)await preactivatedContext.close().catch(()=>{});
    decoded?.input.dispose();
    if(nativeScene){
      nativeScene.pause();nativeScene.removeAttribute("src");nativeScene.load();
    }
  }
}
