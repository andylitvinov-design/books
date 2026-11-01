/**
 * Browser-local Safari 26+ MP4 export without MediaRecorder / canvas.captureStream.
 * No customer audio, images, scenes or phrases are uploaded.
 */
import {
  AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat,
  Output, Quality,
} from "mediabunny";

const SAMPLE_RATE=48000;
const MAX_DURATION=60;
const MAX_BYTES=80*1024*1024;

export type BrowserMovieAudio={
  files: readonly ({file:File|Blob;loop:boolean}|{preset:string;loop:true})[];
  volume:number;
};
export type BrowserMovieOptions={
  canvas:HTMLCanvasElement;
  seconds:number;
  frameRate:number;
  renderFrame:(seconds:number)=>boolean;
  audio?:BrowserMovieAudio;
  shouldContinue:()=>boolean;
  onProgress?:(percent:number)=>void;
};

export function supportsLocalWebCodecsMp4():boolean {
  if(typeof window==="undefined"||typeof navigator==="undefined")return false;
  const ua=navigator.userAgent;
  return /AppleWebKit/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua)&&
    typeof VideoEncoder!=="undefined"&&typeof AudioEncoder!=="undefined"&&
    typeof OfflineAudioContext!=="undefined";
}

async function prepareLocalAudio(audio:BrowserMovieAudio,seconds:number):Promise<AudioBuffer> {
  if(!audio.files.length||audio.files.length>3)throw new Error("unsupported_audio_count");
  if(!Number.isFinite(audio.volume)||audio.volume<0||audio.volume>100)
    throw new Error("invalid_audio_volume");
  const offline=new OfflineAudioContext(1,Math.ceil(SAMPLE_RATE*seconds),SAMPLE_RATE);
  const gainValue=(audio.volume/100)/Math.sqrt(audio.files.length);
  for(const entry of audio.files){
    let file:File|Blob;
    if("preset" in entry){
      // First-party scored WAV only. No client text or external URL accepted.
      if(!/^[a-z0-9-]{1,40}$/.test(entry.preset))
        throw new Error("invalid_first_party_preset");
      const response=await fetch("/audio/mandala/"+entry.preset+".wav",{
        credentials:"same-origin",cache:"force-cache",
      });
      if(!response.ok)throw new Error("first_party_audio_unavailable");
      file=await response.blob();
    }else file=entry.file;
    if(file.size<44||file.size>15*1024*1024)throw new Error("audio_size_invalid");
    const decoded=await offline.decodeAudioData(await file.arrayBuffer());
    if(!decoded.length||!Number.isFinite(decoded.duration)||decoded.duration>180)
      throw new Error("audio_decode_invalid");
    if(!entry.loop && "file" in entry && decoded.duration > seconds + .10)
      throw new Error("narration_longer_than_video");
    const source=offline.createBufferSource();
    source.buffer=decoded;
    source.loop=entry.loop;
    const gain=offline.createGain();
    // Smooth music edges; narration's short fade-in preserves first syllables.
    const fadeIn=entry.loop?.25:.035, fadeOut=entry.loop?.7:.10;
    gain.gain.setValueAtTime(0,0);
    gain.gain.linearRampToValueAtTime(gainValue,fadeIn);
    gain.gain.setValueAtTime(gainValue,Math.max(fadeIn,seconds-fadeOut));
    gain.gain.linearRampToValueAtTime(0,seconds);
    source.connect(gain).connect(offline.destination);
    source.start(0);
  }
  const rendered=await offline.startRendering();
  if(!rendered.length||rendered.duration<seconds-.01)
    throw new Error("audio_master_incomplete");
  return rendered;
}

/** A real H.264/AAC video/audio MP4. Rendering remains on the existing Canvas. */
export async function encodeLocalWebCodecsMp4(options:BrowserMovieOptions):Promise<Blob>{
  const {canvas,seconds,frameRate,renderFrame,audio,shouldContinue,onProgress}=options;
  if(!supportsLocalWebCodecsMp4())throw new Error("webcodecs_not_supported");
  if(!Number.isFinite(seconds)||seconds<3||seconds>MAX_DURATION||
    !Number.isFinite(frameRate)||frameRate<6||frameRate>25||
    canvas.width<160||canvas.height<160||canvas.width*canvas.height>1920*1080)
    throw new Error("invalid_video_dimensions_or_timing");
  if(!shouldContinue())throw new Error("export_cancelled");
  const target=new BufferTarget();
  const output=new Output({format:new Mp4OutputFormat(),target});
  const videoSource=new CanvasSource(canvas,{
    codec:"avc", quality:new Quality({bitrate:Math.min(4_000_000,
      Math.max(1_200_000,canvas.width*canvas.height*2.8))}),
    keyFrameInterval:2,
  });
  output.addVideoTrack(videoSource);
  let audioSource:AudioBufferSource|undefined;
  let audioBuffer:AudioBuffer|undefined;
  try{
    if(audio){
      audioBuffer=await prepareLocalAudio(audio,seconds);
      if(!shouldContinue())throw new Error("export_cancelled");
      audioSource=new AudioBufferSource({codec:"aac",quality:new Quality({bitrate:128000})});
      output.addAudioTrack(audioSource);
    }
    await output.start();
    let audioFailure:unknown;
    const audioTask=audioBuffer&&audioSource
      ?audioSource.add(audioBuffer).catch(error=>{audioFailure=error;}).finally(()=>audioSource?.close())
      :Promise.resolve();
    // Pace native first-party video playback while encoding the same drawn
    // Canvas frames, stage captions, phrases and actual source scenes.
    const frames=Math.ceil(seconds*frameRate);
    const startedAt=performance.now();
    for(let i=0;i<frames;i++){
      if(!shouldContinue())throw new Error("export_cancelled");
      const remaining=startedAt+(i*1000/frameRate)-performance.now();
      if(remaining>0)await new Promise<void>(resolve=>setTimeout(resolve,remaining));
      // The same logical timestamp must drive shot selection and MP4 PTS.
      // A stalled encoder must fail rather than speed up the story or drift
      // across approved cut boundaries.
      const time=i/frameRate;
      if(performance.now()-startedAt > time*1000+750)
        throw new Error("video_encoder_timeline_drift");
      if(!renderFrame(time))throw new Error("licensed_scene_frame_unavailable");
      await videoSource.add(time,1/frameRate,
        {keyFrame:i%Math.max(1,Math.floor(frameRate*2))===0});
      if((i%Math.max(1,Math.ceil(frameRate/3)))===0)
        onProgress?.(Math.min(99,Math.floor(i/frames*100)));
      if(performance.now()-startedAt>(seconds+20)*1000)
        throw new Error("video_encoder_too_slow");
    }
    videoSource.close();
    await audioTask;
    if(audioFailure)throw audioFailure;
    await output.finalize();
    const bytes=target.buffer;
    if(!bytes||bytes.byteLength<4096||bytes.byteLength>MAX_BYTES)
      throw new Error("video_output_size_invalid");
    const header=new Uint8Array(bytes,0,12);
    if(header[4]!==0x66||header[5]!==0x74||header[6]!==0x79||header[7]!==0x70)
      throw new Error("video_output_not_mp4");
    onProgress?.(100);
    return new Blob([bytes],{type:"video/mp4"});
  }catch(error){
    if(output.state!=="canceled"&&output.state!=="finalized"){
      try{await output.cancel();}catch{/* Original error remains authoritative. */}
    }
    throw error;
  }
}

