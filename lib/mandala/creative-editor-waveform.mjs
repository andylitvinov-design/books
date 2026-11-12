/**
 * Small-memory waveform for the visitor's explicitly attached local audio.
 * UI visualization only: never edits/loops/mixes a sound source. No network,
 * fake waveforms, analytics, paid model, server or cached private samples.
 */
export const MYTUBE_WAVEFORM_PEAKS=48;
export const MYTUBE_WAVEFORM_MAX_FILE_BYTES=8*1024*1024;
export const MYTUBE_WAVEFORM_MAX_AUDIO_SECONDS=180;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
export function extractMyTubeWaveform(samples,columns=MYTUBE_WAVEFORM_PEAKS){
  if(!(samples instanceof Float32Array)||
     !Number.isInteger(columns)||columns<8||columns>128||
     samples.length<columns||samples.length>40_000_000)
    throw Error("invalid_mytube_waveform");
  const out=new Array(columns).fill(0);
  const step=Math.max(1,Math.floor(samples.length/(columns*768)));
  let max=0;
  for(let i=0;i<columns;i++){
    const from=Math.floor(i*samples.length/columns);
    const to=Math.floor((i+1)*samples.length/columns);
    let energy=0,n=0;
    for(let j=from;j<to;j+=step){
      const sample=samples[j];
      if(finite(sample)){const clipped=Math.min(1,Math.abs(sample));energy+=clipped*clipped;n++;}
    }
    const rms=n?Math.sqrt(energy/n):0;
    out[i]=rms;
    if(rms>max)max=rms;
  }
  // Do not invent bars for silence, quiet speech or undecodable audio.
  if(max<1e-7)return out.map(()=>0);
  return out.map(v=>Math.round((v/max)*1000)/1000);
}
export function validateMyTubeWaveform(peaks){
  if(!Array.isArray(peaks)||peaks.length<8||peaks.length>128||
     peaks.some(v=>!finite(v)||v<0||v>1))throw Error("invalid_mytube_waveform");
  return [...peaks];
}
