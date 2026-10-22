// Original, locally generated and intentionally quiet 96-second ambient composition.
// The evolving 12-chord / 48-note score is NOT a repeated 15- or 20-second sample.
// Native HTML audio (rather than WebAudio) preserves iPhone playback reliability.
// Usage: node scripts/generate-soft-ocean-melody.mjs
// The browser uses a static WAV (not WebAudio) for iPhone media reliability.
import { writeFileSync } from "node:fs";

function synthSoftMelody() {
  // Uncompressed 24 kHz PCM is used for reliable iPhone Safari HTMLMediaElement playback.
  // The built-in asset stays gently mixed even if iOS ignores audio.volume.
  const SR=24000, DURATION=96, FRAMES=SR*DURATION, TAU=2*Math.PI;
  // Twelve eight-second harmonic changes provide a developing piece, not a short loop.
  const chords=[
    [146.832,185.000,220.000,277.183,329.628], // Dmaj9
    [123.471,185.000,246.942,293.665,369.994], // Bm7
    [195.998,246.942,293.665,369.994,440.000], // Gmaj9
    [164.814,220.000,261.626,329.628,391.995], // Em7
    [146.832,185.000,220.000,277.183,369.994], // D6
    [138.591,185.000,220.000,277.183,329.628], // C# half-diminished colour
    [123.471,185.000,246.942,293.665,440.000], // Bm add11
    [220.000,277.183,329.628,369.994,493.883], // Aadd9
    [195.998,246.942,293.665,369.994,493.883], // Gmaj7
    [164.814,195.998,246.942,293.665,369.994], // Em9
    [220.000,261.626,329.628,391.995,493.883], // A7sus
    [146.832,185.000,220.000,277.183,329.628], // Dmaj9 resolution
  ];
  // One fresh melodic event every two seconds; the entire sequence lasts 96 s.
  const melody=[
    440,493.883,587.330,659.255,587.330,493.883,440,369.994,
    369.994,440,493.883,587.330,659.255,587.330,493.883,440,
    493.883,587.330,739.989,659.255,587.330,493.883,440,493.883,
    440,369.994,440,554.365,493.883,440,369.994,329.628,
    369.994,440,493.883,587.330,739.989,659.255,587.330,493.883,
    440,493.883,554.365,493.883,440,369.994,329.628,293.665,
  ];
  const tones=[...new Set([...chords.flat(),...melody])];
  // Integer cycle counts minimize clicks; opening and closing envelopes bring the full 96 s to silence.
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
    const t=i/SR, section=Math.min(chords.length-1,Math.floor(t/8)), sectionTime=t%8;
    const next=(section+1)%chords.length, mix=smooth((sectionTime-6.1)/1.9);
    const chord=(1-mix)*chordSignal(chords[section],t)+mix*chordSignal(chords[next],t);
    const breath=0.94+0.06*Math.cos(TAU*t/11);
    const noteIndex=Math.min(melody.length-1,Math.floor(t/2));
    const age=t-noteIndex*2;
    const rise=1-Math.exp(-age/0.12), fall=Math.exp(-age/1.3);
    const phrase=0.86+0.14*Math.cos(TAU*noteIndex/melody.length);
    const rad=TAU*cycleFrequencies.get(melody[noteIndex])*t;
    const bell=phrase*rise*fall*(sin(rad)+0.16*sin(2*rad));
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=2*(seed/4294967296)-1;
    low=low*0.83+white*0.17;
    lower=lower*0.979+white*0.021;
    const swell=Math.pow(0.5+0.5*Math.sin(TAU*t/8.7+0.17*Math.sin(t/23)),2);
    const waveGain=0.16+0.84*swell;
    const seamFade=smooth(Math.min(t/1.0,(DURATION-t)/1.1,1));
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

const output = new URL("../public/audio/holistic-house-soft-melody-gentle-waves-96s.wav", import.meta.url);
const result = synthSoftMelody();
writeFileSync(output, result.pcm);
console.log("Generated", output.pathname, "RMS", result.rms.toFixed(4), "peak", result.peak.toFixed(4), "seam", result.seamDiff);
