/** Strict full RIFF/PCM validation of fixed public voice demos. */
import {readPcmWav} from "./wav-pcm-mixer.mjs";
export function validatedPublicVoiceSampleDuration(bytes){
  if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<48||bytes.byteLength>8*1024*1024)return null;
  try{
    const pcm=readPcmWav(bytes),seconds=pcm.frames/pcm.rate;
    return Number.isFinite(seconds)&&seconds>=.2&&seconds<=60?seconds:null;
  }catch{return null;}
}
