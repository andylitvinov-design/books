/**
 * Free, deterministic audio-aware cuts over exactly four allowlisted scenes.
 * Uses a user's locally decoded PCM array only; never fetches/uploads voice.
 * Boundary changes always keep full project duration and 2s minimum clip.
 */
import {allocateAdaptiveFilmTimeline} from "./free-film-timeline.mjs";
export const SMART_CUT_MAX_AUDIO_SECONDS=60;
export const SMART_CUT_MAX_AUDIO_BYTES=20*1024*1024;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/** A low-memory 100ms transient envelope extracted from browser-decoded audio. */
export function audioTransientScores(channel,sampleRate,seconds){
  if(!(channel instanceof Float32Array)||!Number.isFinite(sampleRate)||
    sampleRate<8000||sampleRate>192000||!Number.isInteger(seconds)||
    seconds<10||seconds>SMART_CUT_MAX_AUDIO_SECONDS)
    throw Error("invalid_smart_cut_audio");
  const count=Math.min(channel.length,Math.floor(sampleRate*seconds));
  if(count<sampleRate*2)throw Error("smart_cut_audio_too_short");
  const binSize=Math.max(1,Math.floor(sampleRate/10));
  const stride=Math.max(1,Math.floor(sampleRate/5000));
  const bins=Math.ceil(count/binSize);
  const rms=new Float32Array(bins);
  for(let bin=0;bin<bins;bin++){
    const from=bin*binSize,to=Math.min(count,from+binSize);
    let energy=0,samples=0;
    for(let i=from;i<to;i+=stride){
      const v=channel[i];
      if(Number.isFinite(v)){energy+=v*v;samples++;}
    }
    rms[bin]=samples?Math.sqrt(energy/samples):0;
  }
  const pulses=Array(seconds).fill(0);
  let globalMax=0;
  for(let second=1;second<seconds;second++){
    let peak=0;
    const around=second*10;
    for(let k=Math.max(1,around-3);k<Math.min(rms.length,around+4);k++){
      const rise=Math.max(0,rms[k]-rms[k-1]);
      if(rise>peak)peak=rise;
    }
    pulses[second]=peak;
    globalMax=Math.max(globalMax,peak);
  }
  if(globalMax<.015)return pulses;
  return pulses.map((v,i)=>i===0?0:
    v/globalMax<.16?0:Math.round(v/globalMax*1000)/1000);
}

/**
 * Keep the director's adaptive pacing and select up to three nearest credible
 * musical attacks, never attempting voice semantics or invisible source cuts.
 */
export function recommendSmartAudioCuts(durationSeconds,shots,pulseLevels){
  if(!Array.isArray(shots)||shots.length!==4||
     ![10,15,20,30,60].includes(durationSeconds)||
     shots.some(shot=>typeof shot.sceneId!=="string"||!shot.sceneId)||
     new Set(shots.map(shot=>shot.sceneId)).size!==4||
     !Array.isArray(pulseLevels)||pulseLevels.length<durationSeconds||
     pulseLevels.some(n=>!Number.isFinite(n)||n<0||n>1))
    throw Error("invalid_smart_cut_plan");
  const defaultShots=allocateAdaptiveFilmTimeline(durationSeconds,shots.map(s=>s.sceneId));
  const baseline=defaultShots.slice(1).map(s=>s.startSeconds);
  const isRhythmic=pulseLevels.some(v=>v>=.16);
  if(!isRhythmic)return {status:"no_clear_beats",shots:shots.map(s=>({...s})),cuts:[],confidence:0};
  const radius=clamp(Math.round(durationSeconds*.15),2,5);
  let best=null,bestScore=-Infinity;
  const [a,b,c]=baseline;
  const bounds=(v)=>[Math.max(2,v-radius),Math.min(durationSeconds-2,v+radius)];
  const [aMin,aMax]=bounds(a),[bMin,bMax]=bounds(b),[cMin,cMax]=bounds(c);
  const score=(point,target)=>4*pulseLevels[point]-.32*Math.abs(point-target);
  for(let x=aMin;x<=aMax;x++)for(let y=bMin;y<=bMax;y++){
    if(y-x<2)continue;
    for(let z=cMin;z<=cMax;z++){
      if(z-y<2||durationSeconds-z<2)continue;
      const total=score(x,a)+score(y,b)+score(z,c);
      if(total>bestScore+1e-8){
        bestScore=total;best=[x,y,z];
      }
    }
  }
  if(!best)return {status:"no_valid_timing",shots:shots.map(s=>({...s})),cuts:[],confidence:0};
  const [x,y,z]=best;
  const times=[0,x,y,z,durationSeconds];
  const aligned=shots.map((shot,i)=>({
    ...shot,startSeconds:times[i],durationSeconds:times[i+1]-times[i]
  }));
  const meaningful=best.some((at,i)=>pulseLevels[at]>=.16&&at!==baseline[i]);
  if(!meaningful)return {status:"no_better_cuts",shots:shots.map(s=>({...s})),cuts:best,confidence:0};
  const confidence=Math.round((pulseLevels[x]+pulseLevels[y]+pulseLevels[z])/3*100)/100;
  return {status:"audio_aligned",shots:aligned,cuts:best,confidence};
}
