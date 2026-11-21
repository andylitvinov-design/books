import {CanvasSink, Input, MP4, UrlSource, type WrappedCanvas} from "mediabunny";
import {createPresetMotionProjectV3,importCatalogMotionGuideV3} from "./openmotion-preset-guide.mjs";
import {compileVideoProjectV3, resolveVideoFramesV3, type VideoProjectV3} from "./video-project-v3.mjs";
import {paintVideoProjectV3Frame} from "./video-project-v3-canvas.mjs";
import {paintVideoBrandStamp, type VideoExportVariant} from "./video-branding.mjs";
import {encodeLocalWebCodecsMp4, supportsProceduralWebCodecsMp4} from "./webcodecs-mp4-export";

export const canExportOpenMotionPresetMp4 = () => supportsProceduralWebCodecsMp4(true);

export async function exportOpenMotionPresetMp4(
  presetId: string,
  locale: VideoProjectV3["locale"],
  signal: AbortSignal,
  onProgress?: (percent: number) => void,
  brandVariant: VideoExportVariant = "none",
  markdown?:string,
): Promise<{blob:Blob;durationSeconds:number}> {
  signal.throwIfAborted();
  const {project, approvedAssets} = markdown
    ? importCatalogMotionGuideV3(markdown,presetId,locale)
    : createPresetMotionProjectV3(presetId, locale);
  const plan = compileVideoProjectV3(project, {approvedAssets});
  const paths = new Map(plan.rightsProof.map(asset => [asset.assetId,asset.sourcePath]));
  const canvas = document.createElement("canvas");
  [canvas.width,canvas.height] = plan.aspect === "portrait" ? [360,640] : plan.aspect==="square"?[480,480]:[640,360];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("motion_canvas_unavailable");

  const frameRate = 12;
  const activeInputs = new Map<string,{input:Input; frames:AsyncGenerator<WrappedCanvas|null>}>();
  const clocks = new Map<string,number[]>();
  for (let i=0; i<Math.ceil(plan.durationMs*frameRate/1000); i++) {
    for (const frame of resolveVideoFramesV3(plan,Math.round(i*1000/frameRate))) {
      const times = clocks.get(frame.clipId) ?? [];
      times.push(frame.sourceMs/1000);
      clocks.set(frame.clipId,times);
    }
  }
  const seconds=plan.durationMs/1000;
  let audioMaster:AudioBuffer|undefined;
  if(plan.audioTracks.length){
    const sampleRate=48000;
    const audio=new OfflineAudioContext(2,Math.ceil(sampleRate*seconds),sampleRate);
    const buffers=new Map<string,AudioBuffer>();
    for(const lane of plan.audioTracks){
      signal.throwIfAborted();
      let buffer=buffers.get(lane.assetId);
      if(!buffer){
        const path=paths.get(lane.assetId);
        if(!path)throw Error("motion_audio_source_missing");
        const response=await fetch(path,{signal});
        if(!response.ok)throw Error("motion_audio_unavailable");
        buffer=await audio.decodeAudioData(await response.arrayBuffer());
        buffers.set(lane.assetId,buffer);
      }
      const start=lane.startMs/1000,end=(lane.startMs+lane.durationMs)/1000;
      const offset=lane.sourceInMs/1000;
      if(offset>=buffer.duration)throw Error("motion_audio_offset_unavailable");
      const level=lane.gainPercent/100/Math.sqrt(plan.audioTracks.length);
      const source=audio.createBufferSource();
      source.buffer=buffer;
      source.loop=lane.loop;
      source.loopStart=offset;
      const gain=audio.createGain();
      gain.gain.setValueAtTime(lane.fadeInMs?0:level,start);
      if(lane.fadeInMs)gain.gain.linearRampToValueAtTime(level,start+lane.fadeInMs/1000);
      if(lane.fadeOutMs){
        gain.gain.setValueAtTime(level,end-lane.fadeOutMs/1000);
        gain.gain.linearRampToValueAtTime(0,end);
      }
      source.connect(gain).connect(audio.destination);
      source.start(start,offset);
      source.stop(end);
    }
    audioMaster=await audio.startRendering();
  }
  signal.throwIfAborted();

  let openingInput:Input|null=null;
  const disposeInputs = () => {
    openingInput?.dispose();
    openingInput=null;
    for (const {input} of activeInputs.values()) input.dispose();
    activeInputs.clear();
  };
  signal.addEventListener("abort",disposeInputs,{once:true});
  try {
    const blob = await encodeLocalWebCodecsMp4({
      canvas, allowProceduralBrowser:true, seconds:plan.durationMs/1000, frameRate, onProgress,
      // CanvasSink consumes exact source PTS; do not wait for real-time playback.
      frameSourceMode:"timestamp",
      shouldContinue:()=>!signal.aborted,
      audioMaster,
      renderFrame:async time=>{
        signal.throwIfAborted();
        const projectMs = Math.round(time*1000);
        const frames = resolveVideoFramesV3(plan,projectMs);
        const activeIds = new Set(frames.map(frame=>frame.clipId));
        for (const [id,{input}] of activeInputs) {
          if (!activeIds.has(id)) {
            input.dispose();
            activeInputs.delete(id);
          }
        }
        const decoded = new Map<string,WrappedCanvas>();
        for (const frame of frames) {
          let decoder = activeInputs.get(frame.clipId);
          if (!decoder) {
            const path = paths.get(frame.assetId);
            if (!path) throw new Error("motion_video_source_missing");
            const input = new Input({
              source:new UrlSource(new URL(path,location.origin),{
                maxCacheSize:4*1024*1024,
                parallelism:1,
                getRetryDelay:attempt=>attempt<2?0.25:null,
              }),
              formats:[MP4],
            });
            openingInput=input;
            try {
              const track = await input.getPrimaryVideoTrack();
              signal.throwIfAborted();
              if (!track) throw new Error("motion_video_track_missing");
              const sink = new CanvasSink(track,{width:canvas.width,height:canvas.height,fit:"cover",poolSize:2});
              decoder = {input,frames:sink.canvasesAtTimestamps(clocks.get(frame.clipId) ?? [])};
              activeInputs.set(frame.clipId,decoder);
            } catch (error) {
              input.dispose();
              throw error;
            } finally {
              openingInput=null;
            }
          }
          const {value} = await decoder.frames.next();
          if (!value) throw new Error("motion_video_frame_missing");
          decoded.set(frame.clipId,value);
        }
        const painted = paintVideoProjectV3Frame(ctx,plan,projectMs,(_id,_time,clipId)=>{
          const image = decoded.get(clipId)?.canvas;
          return image ? {image,width:image.width,height:image.height} : null;
        });
        if(painted)paintVideoBrandStamp(ctx,brandVariant);
        return painted;
      },
    });
    return {blob,durationSeconds:plan.durationMs/1000};
  } finally {
    signal.removeEventListener("abort",disposeInputs);
    disposeInputs();
    canvas.width = canvas.height = 0;
  }
}
