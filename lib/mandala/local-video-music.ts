/**
 * Royalty-free ambient sound generated locally with Web Audio oscillators.
 * No external music or microphone capture; never touches the network.
 * Only started from an explicit user Create click and attached to that export.
 */
export type AmbientMusic = "none" | "harmony" | "prosperity" | "energy" | "love" | "meditation" |
  "rain" | "ocean" | "breeze" | "focus" | "grounding" | "breath" | "sunrise" | "pulse";
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


/** Audio export uses the same deterministic PCM bytes as the checked-in
 * HTTPS WAV files. Do not use generated blob: URLs for iPhone preview:
 * the original screenshot showed native media "Error" for that source.
 */
export function createAmbientPreviewWav(preset: Exclude<AmbientMusic, "none">): Blob {
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
  if (!/\.(mp3|m4a|wav|aac|mp4)$/i.test(file.name)) return false;
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
