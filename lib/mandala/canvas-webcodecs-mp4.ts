/**
 * Browser-only fallback for original Canvas storyboards when MediaRecorder is
 * unavailable (notably Linux WebKit). H.264 MP4 is encoded entirely on-device
 * with WebCodecs; Mediabunny only muxes the browser's encoded frames.
 *
 * NO uploaded photos, client wishes, network requests, external AI or XP.
 * Audio is explicitly excluded and must be gated by the calling editor.
 */
export type CanvasWebCodecsOptions = {
  canvas: HTMLCanvasElement;
  durationSeconds: number;
  framesPerSecond: number;
  paint: (timeSeconds: number) => void;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  bitrate?: number;
};

export function supportsCanvasWebCodecs(): boolean {
  return typeof VideoEncoder !== "undefined" &&
    typeof VideoEncoder.isConfigSupported === "function" &&
    typeof VideoFrame !== "undefined";
}

export async function encodeCanvasMp4WithWebCodecs({
  canvas, durationSeconds, framesPerSecond, paint, signal, onProgress,
  bitrate = 1_400_000,
}: CanvasWebCodecsOptions): Promise<Blob> {
  if (!supportsCanvasWebCodecs() || !canvas || canvas.width < 2 || canvas.height < 2 ||
      !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 60 ||
      !Number.isInteger(framesPerSecond) || framesPerSecond < 8 || framesPerSecond > 25) {
    throw new Error("webcodecs_canvas_unsupported");
  }
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
  const supported = await VideoEncoder.isConfigSupported({
    codec: "avc1.42E01E", width: canvas.width, height: canvas.height,
    framerate: framesPerSecond, bitrate, hardwareAcceleration: "prefer-software",
  });
  if (!supported.supported) throw new Error("webcodecs_h264_unsupported");

  // Dynamic import keeps the standard MediaRecorder bundle unchanged.
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality } =
    await import("mediabunny");
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, {
    codec: "avc", quality: new Quality({ bitrate }),
    hardwareAcceleration: "prefer-software",
  });
  output.addVideoTrack(source);
  const total = Math.round(durationSeconds * framesPerSecond);
  let finalized = false;
  try {
    await output.start();
    for (let index = 0; index < total; index++) {
      if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
      const second = index / framesPerSecond;
      paint(second);
      await source.add(second, 1 / framesPerSecond, {
        keyFrame: index % (framesPerSecond * 2) === 0,
      });
      if (index % Math.max(1, Math.floor(framesPerSecond / 2)) === 0) {
        onProgress?.(Math.min(99, Math.floor(index * 100 / total)));
      }
      if (index % framesPerSecond === 0) {
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      }
    }
    if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
    await output.finalize();
    finalized = true;
    const buffer = target.buffer;
    if (!buffer || buffer.byteLength < 1024) throw new Error("webcodecs_empty_mp4");
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
