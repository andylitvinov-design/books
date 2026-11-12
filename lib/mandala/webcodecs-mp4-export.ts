/**
 * Browser-local Safari 26+ MP4 export without MediaRecorder / canvas.captureStream.
 * No customer audio, images, scenes or phrases are uploaded.
 */
import {
  AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat,
  Input, BlobSource, MP4, VideoSampleSink,
  Output, Quality, canEncodeVideo, canEncodeAudio,
} from "mediabunny";
import {presetAudioUrl} from "./local-video-music";
import type {AmbientMusic} from "./local-video-music";

const SAMPLE_RATE=48000;
const MAX_DURATION=60;
const MAX_BYTES=80*1024*1024;

export type BrowserMovieAudio={
  files: readonly ({
    file:File|Blob;loop:boolean;startSeconds?:number;gainPercent?:number;
    fadeInSeconds?:number;fadeOutSeconds?:number
  }|{
    preset:string;loop:true;startSeconds?:number;gainPercent?:number;
    fadeInSeconds?:number;fadeOutSeconds?:number
  })[];
  volume:number;
};
export type BrowserMovieOptions={
  canvas:HTMLCanvasElement;
  allowProceduralBrowser?:boolean;
  seconds:number;
  frameRate:number;
  renderFrame:(seconds:number)=>boolean;
  audio?:BrowserMovieAudio;
  shouldContinue:()=>boolean;
  onProgress?:(percent:number)=>void;
};

/** A silent Safari MP4 requires only the video encoder; an AAC movie
 * additionally needs an AudioEncoder and Web Audio's offline mixer.
 * Some real WebKit builds expose VideoEncoder but not AudioEncoder.
 */
export function supportsLocalWebCodecsMp4(needsAudio=false):boolean {
  if(typeof window==="undefined"||typeof navigator==="undefined")return false;
  const ua=navigator.userAgent;
  return /AppleWebKit/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua)&&
    supportsProceduralWebCodecsMp4(needsAudio);
}

function supportsProceduralWebCodecsMp4(needsAudio=false):boolean {
  return typeof VideoEncoder!=="undefined"&&
    typeof VideoEncoder.isConfigSupported==="function"&&
    typeof VideoFrame!=="undefined"&&
    (!needsAudio || (
      typeof AudioEncoder!=="undefined"&&
      typeof AudioEncoder.isConfigSupported==="function"&&
      typeof OfflineAudioContext!=="undefined"
    ));
}

async function prepareLocalAudio(audio:BrowserMovieAudio,seconds:number):Promise<AudioBuffer> {
  if(!audio.files.length||audio.files.length>3)throw new Error("unsupported_audio_count");
  if(!Number.isFinite(audio.volume)||audio.volume<0||audio.volume>100)
    throw new Error("invalid_audio_volume");
  const offline=new OfflineAudioContext(2,Math.ceil(SAMPLE_RATE*seconds),SAMPLE_RATE);
  const baseGain=(audio.volume/100)/Math.sqrt(audio.files.length);
  for(const entry of audio.files){
    // Independent voice/music lanes. Default paths preserve legacy volume.
    const lanePercent=entry.gainPercent===undefined?100:entry.gainPercent;
    if(!Number.isInteger(lanePercent)||lanePercent<0||lanePercent>100||
       (entry.fadeInSeconds!==undefined&&
        (!Number.isFinite(entry.fadeInSeconds)||entry.fadeInSeconds<0||entry.fadeInSeconds>2))||
       (entry.fadeOutSeconds!==undefined&&
        (!Number.isFinite(entry.fadeOutSeconds)||entry.fadeOutSeconds<0||entry.fadeOutSeconds>2)))
      throw new Error("invalid_audio_lane");
    const laneGain=baseGain*lanePercent/100;
    let file:File|Blob;
    if("preset" in entry){
      // First-party scored WAV only. No client text or external URL accepted.
      if(!/^[a-z0-9-]{1,96}$/.test(entry.preset))
        throw new Error("invalid_first_party_preset");
      // Scenario and classical masters are build-generated MP3 under
      // /audio/mandala/scenarios/; legacy presets remain WAV. Reuse exactly
      // the URL selected by the existing native preview and MediaRecorder.
      // Hardcoding *.wav here made all scenario soundtracks fail in Safari.
      const audioUrl=presetAudioUrl(entry.preset as Exclude<AmbientMusic,"none">);
      const response=await fetch(audioUrl,{
        credentials:"same-origin",cache:"force-cache",
      });
      if(!response.ok)throw new Error("first_party_audio_unavailable");
      file=await response.blob();
    }else file=entry.file;
    if(file.size<44||file.size>15*1024*1024)throw new Error("audio_size_invalid");
    const decoded=await offline.decodeAudioData(await file.arrayBuffer());
    if(!decoded.length||!Number.isFinite(decoded.duration)||decoded.duration>180)
      throw new Error("audio_decode_invalid");
    const startSeconds=Number.isFinite(entry.startSeconds)
      ?Math.max(0,Math.min(seconds-.1,entry.startSeconds||0)):0;
    if(!entry.loop && "file" in entry && decoded.duration > seconds-startSeconds + .10)
      throw new Error("narration_longer_than_video");
    const source=offline.createBufferSource();
    source.buffer=decoded;
    source.loop=entry.loop;
    const gain=offline.createGain();
    // Smooth music edges; narration's short fade-in preserves first syllables.
    const available=seconds-startSeconds;
    const fadeIn=Math.min(available,entry.fadeInSeconds??(entry.loop?.25:.035));
    const fadeOut=Math.min(available,entry.fadeOutSeconds??(entry.loop?.7:.10));
    gain.gain.setValueAtTime(0,0);
    gain.gain.setValueAtTime(0,startSeconds);
    if(fadeIn>0)gain.gain.linearRampToValueAtTime(laneGain,startSeconds+fadeIn);
    else gain.gain.setValueAtTime(laneGain,startSeconds);
    const fadeAt=Math.max(startSeconds+fadeIn,seconds-fadeOut);
    gain.gain.setValueAtTime(laneGain,fadeAt);
    if(fadeOut>0)gain.gain.linearRampToValueAtTime(0,seconds);
    else gain.gain.setValueAtTime(0,seconds);
    source.connect(gain).connect(offline.destination);
    source.start(startSeconds);
  }
  const rendered=await offline.startRendering();
  if(!rendered.length||rendered.duration<seconds-.01)
    throw new Error("audio_master_incomplete");
  return rendered;
}


/**
 * The ftyp signature and a non-empty Blob do not prove an MP4 is playable.
 * Verify actual AVC/AAC tracks and decode a real first frame locally before
 * handing this file to Safari or confirming an account credit reservation.
 */
async function verifyDecodableMp4Export(
  bytes:ArrayBuffer,
  expected:{width:number;height:number;seconds:number;withAudio:boolean;mime:string}
):Promise<void>{
  if(typeof document!=="undefined" &&
    !document.createElement("video").canPlayType(expected.mime))
    throw new Error("video_output_codec_unsupported");
  const input=new Input({
    source:new BlobSource(new Blob([bytes],{type:"video/mp4"})),
    formats:[MP4],
  });
  try{
    if(!(await input.canRead()))throw new Error("video_output_invalid_tracks");
    const track=await input.getPrimaryVideoTrack();
    if(!track)throw new Error("video_output_invalid_tracks");
    const [codec,width,height,duration]=await Promise.all([
      track.getCodec(),track.getCodedWidth(),track.getCodedHeight(),
      track.getDurationFromMetadata(),
    ]);
    if(codec!=="avc"||width!==expected.width||height!==expected.height||
      duration===null||!Number.isFinite(duration)||
      duration<expected.seconds-.75||duration>expected.seconds+1)
      throw new Error("video_output_invalid_tracks");
    if(expected.withAudio){
      const audioTrack=await input.getPrimaryAudioTrack();
      if(!audioTrack||await audioTrack.getCodec()!=="aac")
        throw new Error("video_output_invalid_tracks");
    }
    if(!(await track.canDecode()))throw new Error("video_output_decoder_failed");
    const sink=new VideoSampleSink(track);
    const frame=await sink.getSample(await track.getFirstTimestamp());
    if(!frame)throw new Error("video_output_decoder_failed");
    frame.close();
  }catch(error){
    if(error instanceof Error&&/^video_output_/.test(error.message))throw error;
    throw new Error("video_output_decoder_failed");
  }finally{
    input.dispose();
  }
}

/** A real H.264/AAC video/audio MP4. Rendering remains on the existing Canvas. */
export async function encodeLocalWebCodecsMp4(options:BrowserMovieOptions):Promise<Blob>{
  const {canvas,seconds,frameRate,renderFrame,audio,shouldContinue,onProgress}=options;
  if(!(supportsLocalWebCodecsMp4(Boolean(audio))||
    (options.allowProceduralBrowser&&supportsProceduralWebCodecsMp4(Boolean(audio)))))
    throw new Error("webcodecs_not_supported");
  if(!Number.isFinite(seconds)||seconds<3||seconds>MAX_DURATION||
    !Number.isFinite(frameRate)||frameRate<6||frameRate>25||
    canvas.width<160||canvas.height<160||canvas.width*canvas.height>1920*1080)
    throw new Error("invalid_video_dimensions_or_timing");
  if(!shouldContinue())throw new Error("export_cancelled");
  // Preflight BOTH actual codecs before waiting for the entire film. A failed
  // AAC codec must never produce a silent substitute for selected speech.
  // Probe with Mediabunny's own encoding configuration, not a fixed
  // avc1.42E01E (level 3.0) which cannot describe portrait Full HD.
  // The preflight must match the CanvasSource and AudioBufferSource codecs.
  const videoBitrate=Math.min(4_000_000,Math.max(1_200_000,canvas.width*canvas.height*2.8));
  const h264=await canEncodeVideo("avc",{
    width:canvas.width,height:canvas.height,frameRate,
    quality:new Quality({bitrate:videoBitrate}),
  });
  if(!h264)throw new Error("webcodecs_h264_unsupported");
  if(audio){
    const aac=await canEncodeAudio("aac",{
      sampleRate:SAMPLE_RATE,numberOfChannels:2,
      quality:new Quality({bitrate:128000}),
    });
    if(!aac)throw new Error("webcodecs_aac_unsupported");
  }
  if(!shouldContinue())throw new Error("export_cancelled");
  const target=new BufferTarget();
  // Put the finalized track index before media data. Safari's native Blob
  // decoder must discover codec metadata before accepting the MP4 source.
  // BufferTarget already retains the full bounded local movie in memory.
  const output=new Output({format:new Mp4OutputFormat({fastStart:"in-memory"}),target});
  const videoSource=new CanvasSource(canvas,{
    codec:"avc", quality:new Quality({bitrate:videoBitrate}),
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
    // An actual native WebKit video decoder can temporarily withhold the
    // NEXT licensed shot while seeking. Wait for its genuine decoded frame,
    // but never replace it with a stale/fake shot or drop the chosen sound.
    // Bound BOTH per-frame and whole-export decoder waits.
    let decoderHoldMs=0;
    const maxFrameDecoderWaitMs=1400;
    const maxTotalDecoderWaitMs=4800;
    // Safari's H.264 encoder can stall for more than one frame while still
    // producing every original Canvas frame at EXACT presentation timestamps.
    // A 750ms wall-clock cutoff misclassified valid 20s offline exports.
    // Bound short encoder scheduling stalls to 3s, independently from the
    // strict whole-export deadline and per-source decoder wait limits.
    const maxEncoderPresentationLagMs=3000;
    for(let i=0;i<frames;i++){
      if(!shouldContinue())throw new Error("export_cancelled");
      const remaining=startedAt+decoderHoldMs+(i*1000/frameRate)-performance.now();
      if(remaining>0)await new Promise<void>(resolve=>setTimeout(resolve,remaining));
      // MP4 presentation timestamps remain exact even when a native decoder
      // briefly buffers at the original four-scene shot boundary.
      const time=i/frameRate;
      if(performance.now()-startedAt > time*1000+decoderHoldMs+maxEncoderPresentationLagMs)
        throw new Error("video_encoder_timeline_drift");
      let decodedRealFrame=renderFrame(time);
      if(!decodedRealFrame){
        const waitStarted=performance.now();
        do{
          if(!shouldContinue())throw new Error("export_cancelled");
          if(performance.now()-waitStarted>=maxFrameDecoderWaitMs ||
             decoderHoldMs+performance.now()-waitStarted>=maxTotalDecoderWaitMs)break;
          await new Promise<void>(resolve=>setTimeout(resolve,40));
          decodedRealFrame=renderFrame(time);
        }while(!decodedRealFrame);
        decoderHoldMs+=performance.now()-waitStarted;
        if(!decodedRealFrame)throw new Error("licensed_scene_frame_unavailable");
      }
      await videoSource.add(time,1/frameRate,
        {keyFrame:i%Math.max(1,Math.floor(frameRate*2))===0});
      if((i%Math.max(1,Math.ceil(frameRate/3)))===0)
        onProgress?.(Math.min(99,Math.floor(i/frames*100)));
      if(performance.now()-startedAt>(seconds+20)*1000+decoderHoldMs)
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
    await verifyDecodableMp4Export(bytes,{
      width:canvas.width,height:canvas.height,seconds,
      withAudio:Boolean(audio),mime:await output.getMimeType(),
    });
    if(!shouldContinue())throw new Error("export_cancelled");
    onProgress?.(100);
    return new Blob([bytes],{type:"video/mp4"});
  }catch(error){
    if(output.state!=="canceled"&&output.state!=="finalized"){
      try{await output.cancel();}catch{/* Original error remains authoritative. */}
    }
    throw error;
  }
}

