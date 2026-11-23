/**
 * Strictly read a packaged, first-party soundtrack for a user-initiated
 * browser-local video export. This never uploads any client data, never
 * accepts a URL, and never sends credentials to an external endpoint.
 */
import {presetAudioUrl} from "./local-video-music";
import type {AmbientMusic} from "./local-video-music";

const PACKAGED_SOUNDTRACK=/^\/audio\/mandala\/(?:(?:curated|scenarios)\/[a-z0-9-]+\.mp3|[a-z0-9-]+\.wav)$/;
const MAX_PRESET_AUDIO_BYTES=15*1024*1024;

export async function loadFirstPartyPresetAudioBlob(
  preset:Exclude<AmbientMusic,"none">,
):Promise<Blob> {
  const audioUrl=presetAudioUrl(preset);
  if(!PACKAGED_SOUNDTRACK.test(audioUrl))throw new Error("invalid_first_party_audio");
  // A GET for static music assets is not a user-data transfer. No cookies,
  // redirects, cross-origin requests, POST body or user-supplied URL.
  const response=await fetch(audioUrl,{
    method:"GET",credentials:"omit",mode:"same-origin",
    redirect:"error",cache:"force-cache",
  });
  if(!response.ok)throw new Error("first_party_audio_unavailable");
  const length=Number(response.headers.get("content-length"));
  if(Number.isFinite(length)&&length>MAX_PRESET_AUDIO_BYTES)
    throw new Error("audio_size_invalid");
  const blob=await response.blob();
  if(blob.size<44||blob.size>MAX_PRESET_AUDIO_BYTES)
    throw new Error("audio_size_invalid");
  return blob;
}
