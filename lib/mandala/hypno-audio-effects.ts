/**
 * Local renderer for optional hypno audio layers.
 * Reuses a user-approved narration file and adds low-level repeated speech
 * and/or a quiet stereo beat. It makes one real WAV for the existing video
 * audio attachment pipeline; it does not claim clinical or subliminal effects.
 */
export type HypnoAudioMixOptions = {
  speechFile?: File | null;
  durationSeconds: number;
  whisperEnabled: boolean;
  binauralEnabled: boolean;
  beatHz?: number;
  repeatEverySeconds?: number;
  whisperGain?: number;
};

function encodePcmWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  const input = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, input[channel][frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return bytes;
}

export async function createHypnoAudioEffectFile(options: HypnoAudioMixOptions): Promise<File> {
  const duration = Math.max(1, Math.min(180, Math.round(options.durationSeconds)));
  if (!options.whisperEnabled && !options.binauralEnabled) {
    throw new Error("SELECT_AN_AUDIO_EFFECT");
  }
  if (options.whisperEnabled && !options.speechFile) {
    throw new Error("SPEECH_TRACK_REQUIRED");
  }
  const OfflineContext = typeof OfflineAudioContext !== "undefined" ? OfflineAudioContext : null;
  if (!OfflineContext) throw new Error("OFFLINE_AUDIO_UNAVAILABLE");
  const sampleRate = 16000;
  const context = new OfflineContext(2, duration * sampleRate, sampleRate);

  if (options.speechFile) {
    const encoded = await options.speechFile.arrayBuffer();
    const decoded = await context.decodeAudioData(encoded.slice(0));
    // Never trim the final spoken phrase to fit the clip. The caller must
    // choose a video duration that can hold the complete source voice track.
    if (decoded.duration > duration - 0.35) throw new Error("SPEECH_TRACK_EXCEEDS_DURATION");
    const playVoice = (startAt: number, gainValue: number) => {
      if (startAt + decoded.duration > duration) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = decoded;
      gain.gain.setValueAtTime(gainValue, startAt);
      source.connect(gain);
      gain.connect(context.destination);
      source.start(startAt, 0, decoded.duration);
    };
    if (options.whisperEnabled) {
      const pause = Math.max(4, Math.min(20, options.repeatEverySeconds ?? 7));
      const interval = decoded.duration + pause;
      const level = Math.max(0.04, Math.min(0.3, options.whisperGain ?? 0.16));
      for (let at = 0; at + decoded.duration <= duration; at += interval) playVoice(at, level);
    } else {
      playVoice(0, 1);
    }
  }

  if (options.binauralEnabled) {
    const beatHz = Math.max(1, Math.min(12, options.beatHz ?? 4));
    const carrierHz = 180;
    const merger = context.createChannelMerger(2);
    const addTone = (frequency: number, channel: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(0.04, Math.min(2, duration / 4));
      if (duration > 4) gain.gain.setValueAtTime(0.04, duration - 2);
      gain.gain.linearRampToValueAtTime(0, duration);
      oscillator.connect(gain);
      gain.connect(merger, 0, channel);
      oscillator.start(0);
      oscillator.stop(duration);
    };
    addTone(carrierHz, 0);
    addTone(carrierHz + beatHz, 1);
    merger.connect(context.destination);
  }

  const rendered = await context.startRendering();
  const wav = encodePcmWav(rendered);
  if (wav.byteLength > 15 * 1024 * 1024) throw new Error("AUDIO_EFFECT_TOO_LARGE");
  return new File([wav], "holistic-house-hypno-audio.wav", { type: "audio/wav" });
}
