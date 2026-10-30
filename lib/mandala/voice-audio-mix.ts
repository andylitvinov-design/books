/**
 * Mix a generated short TTS WAV with first-party Holistic House nature audio.
 * Offline browser rendering, no server processing, external media or upload.
 */
import { presetAudioUrl } from "@/lib/mandala/local-video-music";
import { mixPcmWavs } from "@/lib/mandala/wav-pcm-mixer.mjs";
import type { AmbientMusic } from "@/lib/mandala/local-video-music";
export type NatureBed = Exclude<AmbientMusic,"none">;

function encodeWav(buffer: AudioBuffer): Blob {
  const frames = buffer.length;
  const samples = buffer.getChannelData(0);
  const data = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(data);
  const write = (offset:number,s:string) => {for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  write(0,"RIFF"); view.setUint32(4,36+frames*2,true);
  write(8,"WAVE"); write(12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,buffer.sampleRate,true);
  view.setUint32(28,buffer.sampleRate*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  write(36,"data");view.setUint32(40,frames*2,true);
  for(let i=0;i<frames;i++) {
    const value=Math.max(-1,Math.min(1,samples[i]));
    view.setInt16(44+i*2,Math.round(value<0?value*32768:value*32767),true);
  }
  return new Blob([data],{type:"audio/wav"});
}

export const VOICE_BED_PRESETS = [
  "ocean","rain","breeze","meditation","harmony","prosperity","energy",
  "love","focus","grounding","breath","sunrise","pulse",
] as const;

/** Sound levels are user-selected percentages; they never reach the TTS provider. */
export function voiceMixLevel(value: number | undefined, fallback: number): number {
  return typeof value==="number" && Number.isFinite(value)
    ? Math.min(100,Math.max(0,value))/100 : fallback/100;
}

export async function mixVoiceWithNature(
  voice: Blob,
  preset: "none" | NatureBed,
  minimumSeconds?: number,
  levels: {voiceLevel?:number;musicLevel?:number} = {},
): Promise<Blob> {
  if(preset!=="none" && !VOICE_BED_PRESETS.includes(preset))
    throw new Error("INVALID_BACKGROUND");
  if(typeof window==="undefined")throw new Error("BROWSER_AUDIO_REQUIRED");
  // The canonical Gemini and first-party WAVs are PCM16 mono: mix them
  // directly without an AudioContext unlock. This is reliable on iOS Safari.
  const [voiceBytes,natureBytes]=await Promise.all([
    voice.arrayBuffer(),
    preset==="none"?Promise.resolve(null):fetch(presetAudioUrl(preset),{cache:"force-cache"}).then(async response=>{
      if(!response.ok)throw new Error("BACKGROUND_UNAVAILABLE");
      return response.arrayBuffer();
    }),
  ]);
  const header=new Uint8Array(voiceBytes,0,Math.min(4,voiceBytes.byteLength));
  const riff=header.length===4&&header[0]===82&&header[1]===73&&header[2]===70&&header[3]===70;
  if(riff){
    try{
      const pcm=mixPcmWavs(voiceBytes,natureBytes,minimumSeconds,{
        voiceLevel:levels.voiceLevel??90,musicLevel:levels.musicLevel??12,
      });
      return new Blob([pcm],{type:"audio/wav"});
    }catch(error){
      // Float or stereo WAV can still use the browser codec. Invalid RIFF,
      // truncated or malformed files fail closed, not disguised as silence.
      if(!(error instanceof Error)||!["UNSUPPORTED_WAV_PCM","INVALID_WAV"].includes(error.message))
        throw error;
    }
  }
  // User-uploaded MP3/M4A/AAC/WebM and non-PCM WAVs need local Web Audio
  // decoding; they are never uploaded to Gemini or a third-party service.
  const AudioCtor=window.AudioContext ||
    (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor||typeof OfflineAudioContext==="undefined")throw new Error("OFFLINE_AUDIO_UNSUPPORTED");
  const decoder=new AudioCtor();
  let speech:AudioBuffer, background:AudioBuffer|null=null;
  try {
    speech=await decoder.decodeAudioData(voiceBytes.slice(0));
    if(natureBytes)background=await decoder.decodeAudioData(natureBytes.slice(0));
  } finally {
    await decoder.close().catch(()=>{});
  }
  if(speech.duration<=0 || speech.duration>180 ||
    (background!==null&&background.duration<1) ||
    speech.sampleRate<8000 || speech.length*2>12*1024*1024)
    throw new Error("AUDIO_OUT_OF_RANGE");
  const totalSeconds=minimumSeconds===undefined?speech.duration:
    Math.max(speech.duration,Math.min(65,Math.max(1,minimumSeconds)));
  const totalFrames=Math.ceil(totalSeconds*speech.sampleRate);
  const output=new OfflineAudioContext(1,totalFrames,speech.sampleRate);
  const voiceSource=output.createBufferSource();
  voiceSource.buffer=speech;
  const voiceGain=output.createGain();
  voiceGain.gain.value=voiceMixLevel(levels.voiceLevel,90);
  voiceSource.connect(voiceGain).connect(output.destination);
  if(background){
    const bedSource=output.createBufferSource();
    bedSource.buffer=background;
    bedSource.loop=true;
    const bedGain=output.createGain();
    const volume=voiceMixLevel(levels.musicLevel,12);
    const fade=Math.min(.65,totalSeconds/4);
    const fadeEnd=Math.max(fade,totalSeconds-Math.min(1.2,totalSeconds/3));
    bedGain.gain.setValueAtTime(0,0);
    bedGain.gain.linearRampToValueAtTime(volume,fade);
    bedGain.gain.setValueAtTime(volume,fadeEnd);
    bedGain.gain.linearRampToValueAtTime(0,totalSeconds);
    bedSource.connect(bedGain).connect(output.destination);
    bedSource.start(0);
  }
  voiceSource.start(0);
  const mixed=await output.startRendering();
  return encodeWav(mixed);
}
