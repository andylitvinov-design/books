/**
 * Royalty-free ambient sound generated locally with Web Audio oscillators.
 * No external music or microphone capture; never touches the network.
 * Only started from an explicit user Create click and attached to that export.
 */
export type ExpandedAudioPreset = "soft-piano" | "kalimba" | "harp" | "flute" | "celesta" | "strings" | "marimba" | "lullaby" | "handpan" | "forest" | "stream" | "waterfall" | "fireplace" | "night" | "birdsong" | "singing-bowl" | "wind-chimes" | "crystal" | "cosmos" | "soft-beat" | "earth-drum";
export type AmbientMusic = "none" | "harmony" | "prosperity" | "energy" | "love" | "meditation" |
  "rain" | "ocean" | "breeze" | "focus" | "grounding" | "breath" | "sunrise" | "pulse" | ExpandedAudioPreset;
/** Cacheable first-party files: Safari in-app browsers cannot reliably open
 * synthetic blob: audio, even when WAV bytes are valid.
 * HTTPS /audio/mandala/*.wav lets WebKit request the actual media using Range.
 */
export function presetAudioUrl(preset: Exclude<AmbientMusic, "none">): string {
  return "/audio/mandala/" + preset + ".wav";
}
export type AmbientSession = {
  track: MediaStreamTrack;
  close: () => void;
  fadeOut: () => void;
  setVolume: (value: number) => void;
};
const NOTES: Record<Exclude<AmbientMusic,"none">, readonly [number,number,number,number]> = {
  harmony:[174.61,261.63,349.23,523.25],
  prosperity:[196.00,246.94,392.00,493.88],
  energy:[164.81,246.94,329.63,493.88],
  love:[174.61,220.00,349.23,440.00],
  meditation:[130.81,196.00,261.63,392.00],
  rain:[130.81,196.00,261.63,392.00],
  ocean:[110.00,164.81,220.00,329.63],
  breeze:[146.83,220.00,293.66,440.00],
  focus:[174.61,261.63,349.23,523.25],
  grounding:[98.00,146.83,196.00,293.66],
  breath:[130.81,196.00,261.63,349.23],
  sunrise:[196.00,293.66,392.00,587.33],
  pulse:[164.81,246.94,329.63,493.88],
  "soft-piano":[196.00,294.00,392.00,588.00],
  "kalimba":[220.00,330.00,440.00,660.00],
  "harp":[174.61,261.92,349.22,523.83],
  "flute":[261.63,392.44,523.26,784.89],
  "celesta":[293.66,440.49,587.32,880.98],
  "strings":[146.83,220.25,293.66,440.49],
  "marimba":[196.00,294.00,392.00,588.00],
  "lullaby":[174.61,261.92,349.22,523.83],
  "handpan":[164.81,247.22,329.62,494.43],
  "forest":[110.00,165.00,220.00,330.00],
  "stream":[98.00,147.00,196.00,294.00],
  "waterfall":[87.31,130.97,174.62,261.93],
  "fireplace":[130.81,196.22,261.62,392.43],
  "night":[146.83,220.25,293.66,440.49],
  "birdsong":[196.00,294.00,392.00,588.00],
  "singing-bowl":[130.81,196.22,261.62,392.43],
  "wind-chimes":[261.63,392.44,523.26,784.89],
  "crystal":[220.00,330.00,440.00,660.00],
  "cosmos":[110.00,165.00,220.00,330.00],
  "soft-beat":[130.81,196.22,261.62,392.43],
  "earth-drum":[98.00,147.00,196.00,294.00],
};

// On iOS a Web Audio graph uses the ringer-silenced "ambient" session by
// default, even when an HTML video would be audible. iOS 17+ exposes the
// audioSession API. Change it only for a user-initiated preview or export.
export function acquirePlaybackSession(): () => void {
  if (typeof navigator === "undefined") return () => {};
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!session) return () => {};
  const previous = session.type;
  try {
    session.type = "playback";
  } catch {
    return () => {};
  }
  return () => {
    try {
      if (previous !== "playback" && session.type === "playback") session.type = previous;
    } catch { /* Device audio routing is controlled by iOS. */ }
  };
}

function outputGain(volume: number): number {
  const normalized = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 30;
  // The former 30%-setting was almost inaudible (~-38 dB RMS).
  // Keep a bounded mix even with four oscillators at 100%.
  return 0.5 * normalized / 100;
}

export async function startAmbientMusic(
  preset: AmbientMusic, volume = 30, audible = false,
): Promise<AmbientSession | null> {
  if (preset === "none" || typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  const restoreSession = acquirePlaybackSession();
  let context: AudioContext;
  try {
    context = new AudioCtor();
  } catch {
    restoreSession();
    return null;
  }
  try {
    const destination = context.createMediaStreamDestination();
    const master = context.createGain();
    const level = outputGain(volume);
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(level, context.currentTime + .5);
    master.connect(destination);
    // Browser speaker output is exclusively from an explicit Preview click.
    if (audible) master.connect(context.destination);
    const voices: OscillatorNode[] = [];
    const frequencies = NOTES[preset];
    for(let i=0;i<frequencies.length;i++) {
      const tone=context.createOscillator();
      tone.type=i===0?"sine":"triangle";
      tone.frequency.value=frequencies[i];
      const gain=context.createGain();
      gain.gain.value=i===0?.27:.1;
      const lfo=context.createOscillator();
      lfo.type="sine";lfo.frequency.value=.08+i*.035;
      const depth=context.createGain();
      depth.gain.value=i===0?.13:.045;
      lfo.connect(depth);depth.connect(gain.gain);
      tone.connect(gain);gain.connect(master);
      tone.start();lfo.start();voices.push(tone,lfo);
    }
    await context.resume();
    if (context.state !== "running") throw new Error("AudioContext is suspended");
    const track=destination.stream.getAudioTracks()[0];
    if (!track) throw new Error("No browser audio track");
    let closed=false, faded=false;
    return {
      track,
      setVolume: (value: number) => {
        if (closed || faded) return;
        const at = context.currentTime;
        master.gain.cancelScheduledValues(at);
        master.gain.setTargetAtTime(outputGain(value), at, .035);
      },
      fadeOut: () => {
        if (closed || faded) return;
        faded = true;
        const at = context.currentTime;
        master.gain.cancelScheduledValues(at);
        master.gain.setValueAtTime(master.gain.value, at);
        master.gain.linearRampToValueAtTime(0, at + .7);
      },
      close: () => {
        if (closed) return;
        closed=true;
        voices.forEach(voice => {try{voice.stop();}catch{} voice.disconnect();});
        master.disconnect();
        track.stop();
        void context.close().catch(()=>{});
        restoreSession();
      }
    };
  } catch {
    void context.close().catch(()=>{});
    restoreSession();
    return null;
  }
}


// NEW_AUDIO_EXPANSION_START
// 21 original, deterministic 16-second PCM soundscapes. These are SYNTHETIC
// instrument-like timbres / nature-like textures, not field recordings or
// imitations of copyrighted melodies. The HTTPS masters are generated by
// this same function; no network calls or runtime downloading are needed.
const EXPANDED_AUDIO_SCORES = {
  "soft-piano":{kind:"melody",root:196,seq:[0,4,7,9,7,4,2,0],variant:0,seed:101},
  "kalimba":{kind:"melody",root:220,seq:[0,7,5,3,0,5,7,10],variant:1,seed:103},
  "harp":{kind:"melody",root:174.61,seq:[0,3,7,12,7,3,5,0],variant:2,seed:107},
  "flute":{kind:"melody",root:261.63,seq:[0,2,5,7,5,3,2,0],variant:3,seed:109},
  "celesta":{kind:"melody",root:293.66,seq:[0,4,9,12,9,7,4,2],variant:4,seed:113},
  "strings":{kind:"melody",root:146.83,seq:[0,5,9,7,4,5,2,0],variant:5,seed:127},
  "marimba":{kind:"melody",root:196,seq:[0,7,4,11,9,7,4,2],variant:6,seed:131},
  "lullaby":{kind:"melody",root:174.61,seq:[0,4,7,5,2,4,0,-3],variant:7,seed:137},
  "handpan":{kind:"melody",root:164.81,seq:[0,7,10,12,10,7,5,3],variant:8,seed:139},
  "forest":{kind:"nature",root:110,seq:[0,2,4,5,2,0,5,4],variant:0,seed:149},
  "stream":{kind:"nature",root:98,seq:[0,4,7,5,2,4,7,9],variant:1,seed:151},
  "waterfall":{kind:"nature",root:87.31,seq:[0,3,7,5,2,0,7,3],variant:2,seed:157},
  "fireplace":{kind:"nature",root:130.81,seq:[0,2,5,2,4,0,3,0],variant:3,seed:163},
  "night":{kind:"nature",root:146.83,seq:[0,2,4,7,5,3,2,0],variant:4,seed:167},
  "birdsong":{kind:"nature",root:196,seq:[0,4,7,5,4,9,7,2],variant:5,seed:173},
  "singing-bowl":{kind:"tones",root:130.81,seq:[0,0,7,0,5,0,7,0],variant:0,seed:179},
  "wind-chimes":{kind:"tones",root:261.63,seq:[0,7,12,9,5,14,7,12],variant:1,seed:181},
  "crystal":{kind:"tones",root:220,seq:[0,5,12,7,9,12,5,7],variant:2,seed:191},
  "cosmos":{kind:"tones",root:110,seq:[0,7,5,12,2,9,7,5],variant:3,seed:193},
  "soft-beat":{kind:"pulse",root:130.81,seq:[0,4,7,4,0,5,7,2],variant:0,seed:197},
  "earth-drum":{kind:"pulse",root:98,seq:[0,7,5,3,0,5,7,10],variant:1,seed:199},
} satisfies Record<ExpandedAudioPreset,{
  kind:"melody"|"nature"|"tones"|"pulse";root:number;seq:readonly number[];variant:number;seed:number
}>;

function createExpandedSoundWav(preset: ExpandedAudioPreset): Blob {
  const score=EXPANDED_AUDIO_SCORES[preset];
  const sampleRate=22050,duration=16,length=sampleRate*duration;
  const bytes=new ArrayBuffer(44+length*2),view=new DataView(bytes);
  const ascii=(offset:number,value:string)=>{
    for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));
  };
  ascii(0,"RIFF");view.setUint32(4,36+length*2,true);
  ascii(8,"WAVE");ascii(12,"fmt ");view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  ascii(36,"data");view.setUint32(40,length*2,true);

  let noiseSeed=score.seed>>>0,low=0,mid=0,slow=0;
  const TAU=Math.PI*2;
  let lastStep=-1,frequency=score.root;
  for(let i=0;i<length;i++){
    const t=i/sampleRate;
    const step=Math.floor(t/2)%score.seq.length;
    if(step!==lastStep){
      frequency=score.root*Math.pow(2,score.seq[step]/12);
      lastStep=step;
    }
    const phase=t-step*2;
    noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
    const white=noiseSeed/2147483648-1;
    low+=(white-low)*.0028;
    mid+=(white-mid)*.034;
    slow+=(white-slow)*.00065;
    let sound=0;

    if(score.kind==="melody"){
      const variant=score.variant;
      const attack=variant===3||variant===5||variant===7?.21:.028;
      const decay=variant===3||variant===5||variant===7?.30:variant===8?.96:1.45;
      const envelope=Math.min(1,phase/attack)*Math.exp(-phase*decay)*
        Math.min(1,(2-phase)/.14);
      const vibrato=variant===3?.0024*Math.sin(TAU*5.1*t):0;
      const note=frequency*(1+vibrato);
      const primary=Math.sin(TAU*note*t);
      const second=Math.sin(TAU*note*(variant===1?2.94:2)*t);
      const third=Math.sin(TAU*note*(variant===4?3.92:3)*t);
      const brightness=variant===3||variant===5?.08:variant===4?.30:.17;
      const melodic=(primary*.68+second*brightness+third*.10)*envelope;
      const under=variant===5?.20:variant===7?.13:.075;
      sound=melodic*.82+under*Math.sin(TAU*score.root*.5*t)*
        (.72+.28*Math.sin(TAU*.0625*t));
      if(variant===8) sound+=.12*Math.sin(TAU*frequency*1.502*t)*
        Math.exp(-phase*1.7)*Math.min(1,phase/.02);
    } else if(score.kind==="nature"){
      const kind=score.variant;
      if(kind===0){ // Imaginary forest wind with a restrained insect-like chirp
        const chirp=Math.pow(Math.max(0,Math.sin(TAU*.41*t)),6);
        sound=low*1.95+mid*.24+white*.08+
          chirp*.1*Math.sin(TAU*(720+95*Math.sin(TAU*.7*t))*t);
      } else if(kind===1){ // Stream: narrower moving-water band
        sound=(mid*1.35+white*.16+low*.95)*
          (.77+.23*Math.sin(TAU*.14*t));
      } else if(kind===2){ // Waterfall: wider rushing synthetic texture
        sound=(white*.28+mid*1.15+low*2.1)*
          (.9+.1*Math.sin(TAU*.055*t));
      } else if(kind===3){ // Fireplace: gentle filtered noise and intermittent crackles
        const crackle=Math.max(0,(Math.abs(white)-.945)*7);
        sound=low*1.5+mid*.34+crackle*.46;
      } else if(kind===4){ // Night: slow wind, gentle synthetic crickets
        const chirp=Math.pow(Math.max(0,Math.sin(TAU*1.2*t)),8);
        sound=low*1.3+white*.035+chirp*.13*
          Math.sin(TAU*(870+38*Math.sin(TAU*2.6*t))*t);
      } else { // Birdlike tones; not an actual bird recording
        const chirp=Math.pow(Math.max(0,Math.sin(TAU*.71*t)),9);
        sound=mid*.56+low*.8+chirp*.22*
          Math.sin(TAU*(640+170*Math.sin(TAU*5*t))*t);
      }
    } else if(score.kind==="tones"){
      const variant=score.variant;
      const envelope=.35+.65*Math.exp(-phase*(variant===3?.2:variant===0?.8:1.6));
      const base=score.root;
      if(variant===0){
        sound=(Math.sin(TAU*base*t)*.52+
          Math.sin(TAU*base*2.008*t)*.22+Math.sin(TAU*base*3.12*t)*.08)*envelope;
      }else if(variant===1){
        sound=(Math.sin(TAU*frequency*t)*.52+
          Math.sin(TAU*frequency*2.73*t)*.16)*envelope*.95+
          .06*Math.sin(TAU*score.root*.5*t);
      }else if(variant===2){
        sound=(Math.sin(TAU*frequency*t)*.48+
          Math.sin(TAU*frequency*3.99*t)*.28)*envelope+
          .09*Math.sin(TAU*score.root*.5*t);
      }else{
        sound=.28*Math.sin(TAU*base*t)+
          .22*Math.sin(TAU*base*1.507*t)+
          .16*Math.sin(TAU*base*.5*t)+low*.2;
        sound*=.78+.22*Math.sin(TAU*.071*t);
      }
    } else { // Soft original pulses; no drum samples/field recordings
      const beatPeriod=score.variant===0?.8:1.12;
      const beat=t%beatPeriod;
      const beatEnv=Math.exp(-beat*(score.variant===0?10:7));
      const kick=Math.sin(TAU*(score.variant===0?110:78)*beat+
        1.4*(1-Math.exp(-beat*24)))*beatEnv;
      const shaker=white*Math.exp(-((t+beatPeriod/2)%beatPeriod)*23);
      sound=kick*(score.variant===0?.55:.71)+shaker*.12+
        .12*Math.sin(TAU*score.root*.5*t);
    }
    const fade=Math.min(1,t/.23,(duration-t)/.34);
    const sample=Math.round(Math.max(-1,Math.min(1,sound*.68*Math.max(0,fade)))*32767);
    view.setInt16(44+i*2,sample,true);
  }
  return new Blob([bytes],{type:"audio/wav"});
}
// NEW_AUDIO_EXPANSION_END

/** Audio export uses the same deterministic PCM bytes as the checked-in
 * HTTPS WAV files. Do not use generated blob: URLs for iPhone preview:
 * the original screenshot showed native media "Error" for that source.
 */
export function createAmbientPreviewWav(preset: Exclude<AmbientMusic, "none">): Blob {
  if (preset in EXPANDED_AUDIO_SCORES) return createExpandedSoundWav(preset as ExpandedAudioPreset);
  // Original five presets retain byte-for-byte identical 44.1kHz masters.
  // Additional first-party loops use 22.05kHz mono for mobile download size.
  const sampleRate = ["harmony","prosperity","energy","love","meditation"].includes(preset) ? 44100 : 22050;
  const duration = 8;
  const length = sampleRate * duration;
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  function ascii(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  }
  ascii(0, "RIFF"); view.setUint32(4, 36 + length * 2, true);
  ascii(8, "WAVE"); ascii(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); ascii(36, "data");
  view.setUint32(40, length * 2, true);
  const frequencies = NOTES[preset];
  let seed = 0x12345678, low = 0, mid = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const fade = Math.min(1, t / .3, (duration - t) / .4);
    const tone = frequencies.reduce((sum, hz, index) =>
      sum + Math.sin(2 * Math.PI * hz * t) * (index === 0 ? .4 : .13)
        * (1 + .12 * Math.sin(2 * Math.PI * (.09 + index * .03) * t)), 0);
    let sound = tone;
    // These three nature-like textures are synthesized, not field recordings.
    // Deterministic filtered noise prevents external assets or license issues.
    if (preset === "rain" || preset === "ocean" || preset === "breeze") {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      low += (white - low) * .006;
      mid += (white - mid) * .038;
      if (preset === "rain") sound = white * .28 + mid * .6 + Math.sin(2*Math.PI*110*t)*.025;
      if (preset === "ocean") sound = (white*.13 + mid*.9 + low*1.6) *
        (.72 + .23*Math.sin(t*.68)) + Math.sin(2*Math.PI*65*t)*.09;
      if (preset === "breeze") sound = (white*.17 + mid*.48 + low) *
        (.73 + .2*Math.sin(t*.42)) + tone*.1;
    } else if (preset === "breath") {
      sound = tone * (.7 + .3*Math.sin(2*Math.PI*.13*t));
    } else if (preset === "sunrise") {
      sound = tone * (.82 + .18*Math.sin(2*Math.PI*.32*t));
    } else if (preset === "pulse") {
      sound = tone * (.52 + .48*Math.pow(Math.sin(2*Math.PI*1.1*t),2));
    } else if (preset === "grounding") {
      sound = tone*.8;
    }
    view.setInt16(44 + i * 2, Math.round(
      Math.max(-1, Math.min(1, sound * .62 * Math.max(0, fade))) * 32767,
    ), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export const LOCAL_AUDIO_MAX_BYTES = 15 * 1024 * 1024;
export function isSupportedLocalAudio(file: Pick<File, "name" | "size" | "type">): boolean {
  if (file.size < 1 || file.size > LOCAL_AUDIO_MAX_BYTES) return false;
  if (!/\.(mp3|m4a|wav|aac|mp4|webm)$/i.test(file.name)) return false;
  // iOS Files may provide an empty MIME even for a playable audio file.
  return !file.type || file.type.startsWith("audio/") || file.type === "application/octet-stream";
}

/** Record exactly the same PCM wave the visitor can hear in native preview.
 * This avoids a different timbre when the video is exported.
 */
export function startPresetAudio(
  preset: Exclude<AmbientMusic, "none">, volume = 75,
): Promise<AmbientSession | null> {
  const wave = createAmbientPreviewWav(preset);
  const file = new File([wave], "holistic-house-" + preset + ".wav", { type: "audio/wav" });
  return startUploadedAudio(file, volume);
}

/** Export one user-supplied audio recording alongside the canvas stream.
 * Decode locally using Web Audio because audio.captureStream() is unavailable
 * on many iPhones. This graph deliberately does not connect to speakers.
 */
export async function startUploadedAudio(
  file: File, volume = 80,
): Promise<AmbientSession | null> {
  if (typeof window === "undefined" || !isSupportedLocalAudio(file)) return null;
  const AudioCtor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  const restoreSession = acquirePlaybackSession();
  let context: AudioContext;
  try { context = new AudioCtor(); }
  catch { restoreSession(); return null; }
  let source: AudioBufferSourceNode | null = null;
  try {
    // Must call resume inside the Create button's activation, before awaits.
    const resumed = context.resume();
    const data = await file.arrayBuffer();
    await resumed;
    const buffer = await context.decodeAudioData(data);
    if (!buffer.length || !Number.isFinite(buffer.duration) || buffer.duration > 180) {
      throw new Error("Audio is empty or too long to decode on a phone");
    }
    if (context.state !== "running") await context.resume();
    if (context.state !== "running") throw new Error("Audio is still suspended");
    const destination = context.createMediaStreamDestination();
    const master = context.createGain();
    master.gain.setValueAtTime(Math.max(0, Math.min(100, volume)) / 100, context.currentTime);
    master.connect(destination);
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(master);
    const track = destination.stream.getAudioTracks()[0];
    if (!track) throw new Error("No decoded audio output track");
    source.start();
    let closed = false, faded = false;
    return {
      track,
      setVolume: (value: number) => {
        if (closed || faded) return;
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(Math.max(0, Math.min(100, value)) / 100, now, .035);
      },
      fadeOut: () => {
        if (closed || faded) return;
        faded = true;
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + .7);
      },
      close: () => {
        if (closed) return;
        closed = true;
        try { source?.stop(); } catch { /* Source may already have ended. */ }
        source?.disconnect();
        master.disconnect();
        track.stop();
        void context.close().catch(() => {});
        restoreSession();
      },
    };
  } catch {
    try { source?.stop(); } catch { /* Ignore. */ }
    source?.disconnect();
    void context.close().catch(() => {});
    restoreSession();
    return null;
  }
}
