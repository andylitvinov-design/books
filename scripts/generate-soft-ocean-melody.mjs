// Rebuild the original, royalty-free and intentionally quiet 20-second ambient loop.
// Usage: node scripts/generate-soft-ocean-melody.mjs
// The browser uses a static WAV (not WebAudio) for iPhone media reliability.
import { writeFileSync } from "node:fs";

function synthSoftMelody() {
  // Uncompressed 24 kHz PCM is used for reliable iPhone Safari HTMLMediaElement playback.
  // The built-in asset stays gently mixed even if iOS ignores audio.volume.
  const SR=24000, DURATION=20, FRAMES=SR*DURATION, TAU=2*Math.PI;
  const chords=[
    [261.626,329.628,391.995,493.883], // Cmaj7
    [220.000,261.626,329.628,391.995], // Am7
    [174.614,220.000,261.626,329.628], // Fmaj7
    [195.998,246.942,293.665,329.628], // G6
  ];
  const melody=[659.255,783.991,659.255,523.251,440.000,659.255,493.883,587.330];
  const tones=[...new Set([...chords.flat(),...melody])];
  // Integer cycle counts keep music continuous where the soundtrack loops.
  const cycleFrequencies=new Map(tones.map(f=>[f,Math.round(f*DURATION)/DURATION]));
  const samples=new Float32Array(FRAMES);
  let seed=0x2c149621, low=0, lower=0;
  const smooth=x=>{let y=Math.max(0,Math.min(1,x));return y*y*(3-2*y)};
  const sin=Math.sin;
  function chordSignal(chord,t){
    let sum=0;
    for(let j=0;j<chord.length;j++){
      const rad=TAU*cycleFrequencies.get(chord[j])*t;
      sum+=sin(rad)+0.13*sin(2*rad)+0.04*sin(3*rad);
    }
    return sum/chord.length;
  }
  for(let i=0;i<FRAMES;i++){
    const t=i/SR, section=Math.floor(t/5), sectionTime=t%5;
    const next=(section+1)%4, mix=smooth((sectionTime-3.5)/1.5);
    const chord=(1-mix)*chordSignal(chords[section],t)+mix*chordSignal(chords[next],t);
    const breath=0.94+0.06*Math.cos(TAU*t/10);
    let bell=0;
    for(let s=0;s<8;s++){
      const age=(t-s*2.5+DURATION)%DURATION;
      if(age>=3.2)continue;
      const rise=1-Math.exp(-age/0.12);
      const fall=Math.exp(-age/1.3);
      const tail=1-smooth((age-2.5)/0.7);
      const rad=TAU*cycleFrequencies.get(melody[s])*t;
      bell+=rise*fall*tail*(sin(rad)+0.16*sin(2*rad));
    }
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=2*(seed/4294967296)-1;
    low=low*0.83+white*0.17;
    lower=lower*0.979+white*0.021;
    const swell=Math.pow(0.5+0.5*Math.sin(TAU*t*3/DURATION-1),2);
    const waveGain=0.16+0.84*swell;
    const seamFade=smooth(Math.min(t/0.6,(DURATION-t)/0.6,1));
    // A quiet wash of filtered surf sits well behind the melody, not on top of it.
    const surf=(0.78*low+0.22*lower)*0.075*waveGain*seamFade;
    samples[i]=0.142*chord*breath+0.043*bell+surf;
  }
  const pcm=new Uint8Array(44+FRAMES*2);
  const dv=new DataView(pcm.buffer);
  const writeTag=(at,s)=>{for(let k=0;k<s.length;k++)pcm[at+k]=s.charCodeAt(k)};
  writeTag(0,'RIFF');dv.setUint32(4,36+FRAMES*2,true);writeTag(8,'WAVE');
  writeTag(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);
  dv.setUint16(22,1,true);dv.setUint32(24,SR,true);dv.setUint32(28,SR*2,true);
  dv.setUint16(32,2,true);dv.setUint16(34,16,true);
  writeTag(36,'data');dv.setUint32(40,FRAMES*2,true);
  let rms=0,peak=0;
  for(let i=0;i<FRAMES;i++){
    const x=Math.max(-1,Math.min(1,samples[i]));
    rms+=x*x;peak=Math.max(peak,Math.abs(x));
    dv.setInt16(44+i*2,Math.round(x*32767),true);
  }
  return {pcm,rms:Math.sqrt(rms/FRAMES),peak,seamDiff:Math.abs(dv.getInt16(44,true)-dv.getInt16(pcm.length-2,true))};
}

const output = new URL("../public/audio/holistic-house-soft-melody-gentle-waves-20s.wav", import.meta.url);
const result = synthSoftMelody();
writeFileSync(output, result.pcm);
console.log("Generated", output.pathname, "RMS", result.rms.toFixed(4), "peak", result.peak.toFixed(4), "seam", result.seamDiff);
