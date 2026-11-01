/**
 * Same-device H.264/AAC export for approved Canvas / four-source films when
 * native MediaRecorder is absent. Keeps the verified shot clock and overlays;
 * refuses to replace an audio selection with a silent movie.
 *
 * No private content is uploaded. Licensed MP4 sources remain local players;
 * only first-party static WAV presets are fetched from this origin.
 */
import { isSupportedLocalAudio, presetAudioUrl } from "./local-video-music";
import type { AmbientMusic } from "./local-video-music";

type Preset = Exclude<AmbientMusic, "none">;
export type CanvasWebCodecsAudio =
  | { kind: "file"; file: File; narration?: true; nonLoop?: true }
  | { kind: "preset"; id: Preset }
  | { kind: "presets"; ids: Preset[] };

export type CanvasWebCodecsOptions = {
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  framesPerSecond: number;
  paint: (timeSeconds: number) => void;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  bitrate?: number;
  /** Source-backed MP4s must be decoded in real time, not sampled offline. */
  realtime?: boolean;
  /** A pre-rendered PCM mix, already aligned to the video duration. */
  audioBuffer?: AudioBuffer | null;
};

function checkCanceled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
}

export function supportsCanvasWebCodecs(): boolean {
  return typeof VideoEncoder !== "undefined" &&
    typeof VideoEncoder.isConfigSupported === "function" &&
    typeof VideoFrame !== "undefined";
}

/**
 * Decode first-party melodies or an explicitly approved local File into one
 * short mono soundtrack. File-based speech never loops. A voice longer than
 * the movie is rejected rather than being cut off without explanation.
 * This does NOT start playback or record the microphone.
 */
export async function prepareCanvasWebCodecsAudio(
  selected: CanvasWebCodecsAudio | null,
  durationSeconds: number,
  volumePercent = 80,
  signal?: AbortSignal,
): Promise<AudioBuffer | null> {
  if (!selected) return null;
  if (typeof window === "undefined" || typeof OfflineAudioContext === "undefined" ||
      !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 60 ||
      !Number.isFinite(volumePercent) || volumePercent < 0 || volumePercent > 100)
    throw new Error("webcodecs_soundtrack_unsupported");
  checkCanceled(signal);
  const AudioCtor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("webcodecs_audio_decode_unavailable");
  const fileMode = selected.kind === "file";
  let blobs: Blob[];
  if (fileMode) {
    if (!isSupportedLocalAudio(selected.file))
      throw new Error("webcodecs_audio_file_invalid");
    blobs = [selected.file];
  } else {
    const ids = selected.kind === "preset" ? [selected.id] : selected.ids;
    if (!ids.length || ids.length > 3 || new Set(ids).size !== ids.length)
      throw new Error("webcodecs_audio_presets_invalid");
    blobs = await Promise.all(ids.map(async id => {
      checkCanceled(signal);
      const response = await fetch(presetAudioUrl(id), {
        cache: "force-cache", credentials: "same-origin", signal,
      });
      if (!response.ok) throw new Error("webcodecs_first_party_audio_unavailable");
      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength || buffer.byteLength > 15 * 1024 * 1024)
        throw new Error("webcodecs_audio_size_invalid");
      return new Blob([buffer], { type: "audio/wav" });
    }));
  }
  checkCanceled(signal);
  const decoder = new AudioCtor();
  let tracks: AudioBuffer[];
  try {
    tracks = await Promise.all(blobs.map(async blob => {
      checkCanceled(signal);
      return decoder.decodeAudioData(await blob.arrayBuffer());
    }));
  } finally {
    await decoder.close().catch(() => {});
  }
  checkCanceled(signal);
  if (!tracks.length || tracks.some(track =>
      !track.length || !Number.isFinite(track.duration) || track.duration > 180))
    throw new Error("webcodecs_audio_decode_invalid");
  if (fileMode && (selected.narration || selected.nonLoop) &&
      tracks[0].duration > durationSeconds + 0.05)
    throw new Error("webcodecs_narration_exceeds_video");

  const rate = 44100;
  const context = new OfflineAudioContext(1, Math.round(durationSeconds * rate), rate);
  const level = Math.min(1, volumePercent / 100) * .9 / Math.sqrt(tracks.length);
  for (const buffer of tracks) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    // Original first-party music loops. Local recordings and generated TTS don't.
    source.loop = !fileMode;
    const gain = context.createGain();
    gain.gain.setValueAtTime(level, 0);
    const fade = Math.min(.75, durationSeconds / 3);
    gain.gain.setValueAtTime(level, Math.max(0, durationSeconds - fade));
    gain.gain.linearRampToValueAtTime(0, durationSeconds);
    source.connect(gain).connect(context.destination);
    source.start(0);
  }
  const mixed = await context.startRendering();
  checkCanceled(signal);
  if (mixed.length < rate || mixed.duration < durationSeconds - .05)
    throw new Error("webcodecs_audio_mix_invalid");
  return mixed;
}

export async function encodeCanvasMp4WithWebCodecs({
  canvas, durationSeconds, framesPerSecond, paint, signal, onProgress,
  bitrate = 1_400_000, realtime = false, audioBuffer = null,
}: CanvasWebCodecsOptions): Promise<Blob> {
  if (!supportsCanvasWebCodecs() || !canvas || canvas.width < 2 || canvas.height < 2 ||
      !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 60 ||
      !Number.isInteger(framesPerSecond) || framesPerSecond < 8 || framesPerSecond > 25)
    throw new Error("webcodecs_canvas_unsupported");
  checkCanceled(signal);
  const supported = await VideoEncoder.isConfigSupported({
    codec: "avc1.42E01E", width: canvas.width, height: canvas.height,
    framerate: framesPerSecond, bitrate, hardwareAcceleration: "prefer-software",
  });
  if (!supported.supported) throw new Error("webcodecs_h264_unsupported");
  if (audioBuffer) {
    if (typeof AudioEncoder === "undefined" ||
        typeof AudioEncoder.isConfigSupported !== "function")
      throw new Error("webcodecs_aac_unsupported");
    const audioOk = await AudioEncoder.isConfigSupported({
      codec: "mp4a.40.2", sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels, bitrate: 128_000,
    });
    if (!audioOk.supported) throw new Error("webcodecs_aac_unsupported");
    if (audioBuffer.duration < durationSeconds - .05 ||
        audioBuffer.duration > durationSeconds + .05)
      throw new Error("webcodecs_soundtrack_duration_mismatch");
  }
  checkCanceled(signal);

  // Lazy import keeps the normal native recorder path and initial load small.
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, Quality } =
    await import("mediabunny");
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, {
    codec: "avc", quality: new Quality({ bitrate }),
    hardwareAcceleration: "prefer-software",
  });
  output.addVideoTrack(source);
  const audioSource = audioBuffer ? new AudioBufferSource({
    codec: "aac", quality: new Quality({ bitrate: 128_000 }),
  }) : null;
  if (audioSource) output.addAudioTrack(audioSource);
  const total = Math.round(durationSeconds * framesPerSecond);
  let finalized = false;
  try {
    await output.start();
    // Encode the smaller AAC track first: bounded <=60s, to avoid an
    // unbounded full-resolution video queue during multi-track muxing.
    if (audioBuffer && audioSource) await audioSource.add(audioBuffer);
    const startedAt = performance.now();
    for (let index = 0; index < total; index++) {
      checkCanceled(signal);
      const second = index / framesPerSecond;
      if (realtime) {
        // The four licensed HTMLVideoElement decoders must actually play;
        // fast offline sampling would otherwise encode repeated/stale frames.
        while (true) {
          checkCanceled(signal);
          const remaining = startedAt + second * 1000 - performance.now();
          if (remaining <= 1) break;
          await new Promise<void>(resolve => window.setTimeout(resolve, Math.min(40, remaining)));
        }
      }
      paint(second);
      await source.add(second, 1 / framesPerSecond, {
        keyFrame: index % (framesPerSecond * 2) === 0,
      });
      if (index % Math.max(1, Math.floor(framesPerSecond / 2)) === 0)
        onProgress?.(Math.min(99, Math.floor(index * 100 / total)));
      if (!realtime && index % framesPerSecond === 0)
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
    checkCanceled(signal);
    await output.finalize();
    finalized = true;
    const buffer = target.buffer;
    if (!buffer || buffer.byteLength < 1024)
      throw new Error("webcodecs_empty_mp4");
    const header = new Uint8Array(buffer, 0, 8);
    if (header[4] !== 0x66 || header[5] !== 0x74 ||
        header[6] !== 0x79 || header[7] !== 0x70)
      throw new Error("webcodecs_invalid_mp4");
    onProgress?.(100);
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    if (!finalized && (output.state === "started" || output.state === "pending"))
      await output.cancel().catch(() => {});
  }
}
