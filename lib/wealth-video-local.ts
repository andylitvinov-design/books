/**
 * Local, silent 9:16 owner-portrait affirmation. No Kling API, no server upload,
 * no charge, no microphone and no changes to publishing or client records.
 * A browser MediaRecorder is required; unsupported browsers fail explicitly.
 */
export type WealthClipLanguage = "en" | "ru" | "es";

export function preferredWealthMime(isSupported: (mime: string) => boolean): string | null {
  return ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp8", "video/webm"]
    .find(mime => isSupported(mime)) ?? null;
}

const CAPTION: Record<WealthClipLanguage, [string, string]> = {
  en: ["I welcome opportunities", "and fair payment for my work"],
  ru: ["Я замечаю возможности", "и принимаю достойную оплату"],
  es: ["Recibo nuevas oportunidades", "y una remuneración justa"],
};

export async function createFreeWealthClip(
  language: WealthClipLanguage,
  onProgress: (percent: number) => void,
): Promise<{ blob: Blob; extension: "mp4" | "webm" }> {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined" ||
      typeof HTMLCanvasElement === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function") throw new Error("unsupported");
  const mimeType = preferredWealthMime(mime => MediaRecorder.isTypeSupported(mime));
  if (!mimeType) throw new Error("unsupported");

  // Only the existing, approved public owner portrait is used.
  const photo = new window.Image();
  photo.decoding = "async";
  photo.src = "/images/holistic-house/andy-about.png";
  try { await photo.decode(); } catch { throw new Error("photo"); }
  if (!photo.naturalWidth || !photo.naturalHeight) throw new Error("photo");

  // 540x960, 20 fps keeps iPhone CPU/memory use reasonable.
  const canvas = document.createElement("canvas");
  const width = canvas.width = 540;
  const height = canvas.height = 960;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("unsupported");
  const durationMs = 12000;
  const [lineOne, lineTwo] = CAPTION[language];

  function render(progress: number): void {
    if (!ctx) return;
    const sec = progress * durationMs / 1000;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#2c302b");
    bg.addColorStop(.55, "#76543c");
    bg.addColorStop(1, "#bc9462");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    // Atmospheric gold light, without covering the owner's face.
    const halo = ctx.createRadialGradient(width/2, 515, 30, width/2, 515, 430);
    halo.addColorStop(0, "rgba(250,203,116,.54)");
    halo.addColorStop(1, "rgba(250,203,116,0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);

    // Preserve full portrait aspect ratio (contain, not stretch or face crop).
    const boxX = 57, boxY = 168, boxW = 426, boxH = 467;
    const naturalRatio = photo.naturalWidth / photo.naturalHeight;
    const fittedW = Math.min(boxW, boxH * naturalRatio);
    const fittedH = fittedW / naturalRatio;
    const scale = 1 + .025 * Math.sin(sec / 12 * Math.PI);
    ctx.save();
    ctx.translate(width/2, boxY + boxH/2);
    ctx.scale(scale,scale);
    ctx.fillStyle = "#d2bca0";
    ctx.fillRect(-fittedW/2-5,-fittedH/2-5,fittedW+10,fittedH+10);
    ctx.drawImage(photo, -fittedW/2, -fittedH/2, fittedW, fittedH);
    ctx.restore();

    // Abstract gold coins flow from both sides TOWARDS the lower portrait;
    // their final position stays below the face.
    for (let i = 0; i < 18; i++) {
      const delay = (i % 8) * .4;
      const motion = Math.max(0, Math.min(1, (sec - delay) / 8));
      const eased = 1 - Math.pow(1 - motion, 2);
      const fromX = i % 2 === 0 ? -48 : width + 48;
      const toX = width/2 + Math.sin(i * 2.4) * 155;
      const fromY = 65 + ((i * 113) % 720);
      const toY = 655 + ((i * 37) % 85);
      const x = fromX + (toX-fromX) * eased;
      const y = fromY + (toY-fromY) * eased;
      if (motion === 0) continue;
      const radius = 8 + (i % 4) * 3;
      ctx.globalAlpha = Math.min(.85, motion * 2) * (1 - Math.max(0, sec - 10) / 3);
      ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2);
      ctx.fillStyle = "#f8dc8d"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle="#a46a24"; ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,radius*.55,0,Math.PI*2);
      ctx.strokeStyle="#ca973f";ctx.lineWidth=1.5;ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const footer = ctx.createLinearGradient(0, 745, 0, 930);
    footer.addColorStop(0,"rgba(34,35,28,0)");
    footer.addColorStop(1,"rgba(34,35,28,.83)");
    ctx.fillStyle=footer;ctx.fillRect(0,730,width,230);
    ctx.textAlign="center";
    ctx.fillStyle="#fff5de";
    ctx.font="600 29px Arial, sans-serif";
    ctx.fillText(lineOne,width/2,835,490);
    ctx.font="25px Arial, sans-serif";
    ctx.fillText(lineTwo,width/2,882,490);
  }

  render(0);
  const stream = canvas.captureStream(20);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream,{mimeType,videoBitsPerSecond:1800000});
  } catch {
    stream.getTracks().forEach(track => track.stop());
    throw new Error("unsupported");
  }
  const recorded = new Promise<Blob>((resolve,reject) => {
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error("recording"));
    recorder.onstop = () => {
      const blob = new Blob(chunks,{type:mimeType});
      blob.size ? resolve(blob) : reject(new Error("recording"));
    };
  });
  let frame = 0;
  let watchdog = 0;
  let lastPercent = -1;
  try {
    recorder.start(1000);
    let startedAt = 0;
    function draw(timestamp:number) {
      if (!startedAt) startedAt=timestamp;
      const progress = Math.max(0,Math.min(1,(timestamp-startedAt)/durationMs));
      render(progress);
      const percent = Math.floor(progress*100);
      if (percent !== lastPercent) { lastPercent=percent;onProgress(percent); }
      if (progress < 1 && recorder.state === "recording") frame=window.requestAnimationFrame(draw);
      else if (recorder.state === "recording") recorder.stop();
    }
    frame=window.requestAnimationFrame(draw);
    // Prevent a stuck recorder from consuming resources indefinitely.
    watchdog=window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); },durationMs+3000);
    const blob=await recorded;
    return {blob,extension:mimeType.includes("mp4")?"mp4":"webm"};
  } finally {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(watchdog);
    if (recorder.state === "recording") recorder.stop();
    stream.getTracks().forEach(track=>track.stop());
  }
}
