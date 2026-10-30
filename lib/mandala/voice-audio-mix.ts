/**
 * Mix a generated short TTS WAV with first-party Holistic House nature audio.
 * Offline browser rendering, no server processing, external media or upload.
 */
import { presetAudioUrl } from "@/lib/mandala/local-video-music";
export type NatureBed = "ocean" | "rain" | "breeze";

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

export async function mixVoiceWithNature(voice:Blob,preset:NatureBed):Promise<Blob> {
  if(!["ocean","rain","breeze"].includes(preset))throw new Error("INVALID_NATURE");
  if(typeof window==="undefined")throw new Error("BROWSER_AUDIO_REQUIRED");
  const AudioCtor=window.AudioContext ||
    (window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor||typeof OfflineAudioContext==="undefined")throw new Error("OFFLINE_AUDIO_UNSUPPORTED");
  const decoder=new AudioCtor();
  let speech:AudioBuffer, background:AudioBuffer;
  try {
    const nature=await fetch(presetAudioUrl(preset),{cache:"force-cache"});
    if(!nature.ok)throw new Error("NATURE_AUDIO_UNAVAILABLE");
    const [voiceBytes,natureBytes]=await Promise.all([voice.arrayBuffer(),nature.arrayBuffer()]);
    speech=await decoder.decodeAudioData(voiceBytes);
    background=await decoder.decodeAudioData(natureBytes);
  } finally {
    await decoder.close().catch(()=>{});
  }
  if(speech.duration<=0 || speech.duration>180 ||
    background.duration<1 || speech.sampleRate<8000 || speech.length*2>12*1024*1024)
    throw new Error("AUDIO_OUT_OF_RANGE");
  const output=new OfflineAudioContext(1,speech.length,speech.sampleRate);
  const voiceSource=output.createBufferSource();
  voiceSource.buffer=speech;
  const voiceGain=output.createGain();
  voiceGain.gain.value=0.88;
  voiceSource.connect(voiceGain).connect(output.destination);
  const bedSource=output.createBufferSource();
  bedSource.buffer=background;
  bedSource.loop=true;
  const bedGain=output.createGain();
  bedGain.gain.setValueAtTime(0.0,0);
  bedGain.gain.linearRampToValueAtTime(0.11,Math.min(0.65,speech.duration/4));
  bedGain.gain.setValueAtTime(0.11,Math.max(.65,speech.duration-1.2));
  bedGain.gain.linearRampToValueAtTime(0,Math.max(.66,speech.duration));
  bedSource.connect(bedGain).connect(output.destination);
  voiceSource.start(0);bedSource.start(0);
  const mixed=await output.startRendering();
  return encodeWav(mixed);
}
