/**
 * Holistic House generated narration and first-party nature audio.
 * Deterministic PCM mixer works on mobile Safari without Web Audio unlock.
 */
import {presetAudioUrl} from "@/lib/mandala/local-video-music";
import {mixPcmWavs} from "@/lib/mandala/wav-pcm-mixer.mjs";
export type NatureBed="ocean"|"rain"|"breeze";
export async function mixVoiceWithNature(voice:Blob,preset:NatureBed,minimumSeconds?:number):Promise<Blob>{
  if(!["ocean","rain","breeze"].includes(preset))throw Error("INVALID_NATURE");
  if(typeof window==="undefined")throw Error("BROWSER_AUDIO_REQUIRED");
  const nature=await fetch(presetAudioUrl(preset),{cache:"force-cache"});
  if(!nature.ok)throw Error("NATURE_AUDIO_UNAVAILABLE");
  const [voiceBytes,natureBytes]=await Promise.all([voice.arrayBuffer(),nature.arrayBuffer()]);
  return new Blob([mixPcmWavs(voiceBytes,natureBytes,minimumSeconds)],{type:"audio/wav"});
}
