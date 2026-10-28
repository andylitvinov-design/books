/**
 * Royalty-free ambient sound generated locally with Web Audio oscillators.
 * No external music or microphone capture; never touches the network.
 * Only started from an explicit user Create click and attached to that export.
 */
export type AmbientMusic = "none" | "harmony" | "prosperity" | "energy" | "love" | "meditation";
export type AmbientSession = { track: MediaStreamTrack; close: () => void; fadeOut: () => void };
const NOTES: Record<Exclude<AmbientMusic,"none">, readonly [number,number,number,number]> = {
  harmony:[174.61,261.63,349.23,523.25],
  prosperity:[196.00,246.94,392.00,493.88],
  energy:[164.81,246.94,329.63,493.88],
  love:[174.61,220.00,349.23,440.00],
  meditation:[130.81,196.00,261.63,392.00],
};

export async function startAmbientMusic(
  preset: AmbientMusic, volume = 30, audible = false,
): Promise<AmbientSession | null> {
  if (preset === "none" || typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext;
  if (!AudioCtor) return null;
  const context = new AudioCtor();
  try {
    const destination = context.createMediaStreamDestination();
    const master = context.createGain();
    // 30% reproduces the original quiet mix. Never blast headphones.
    const normalized = Number.isFinite(volume) ? Math.min(100,Math.max(0,volume)) : 30;
    const level = Math.min(.11, .045 * (normalized / 30));
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
    const track=destination.stream.getAudioTracks()[0];
    if (!track) throw new Error("No browser audio track");
    let closed=false, faded=false;
    return {
      track,
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
      }
    };
  } catch {
    void context.close().catch(()=>{});
    return null;
  }
}
