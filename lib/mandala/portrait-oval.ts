/**
 * Local-only, face-biased oval portrait. This is a geometric photograph mask:
 * it never identifies a person, guesses a diagnosis or sends image pixels out.
 * The same canvas painter is used for preview and recorded MP4/WebM frames.
 */
export type PortraitTone = "gold" | "mint" | "rose";

export type OvalPortraitCrop = {
  cx: number; cy: number; rx: number; ry: number;
  dx: number; dy: number; dw: number; dh: number;
};

/**
 * Keeps the original aspect ratio and covers the ellipse without stretching
 * faces. The default focal point is ABOVE the source image's centre (34%);
 * for a typical phone selfie this keeps eyes, hair and chin inside the oval.
 * A consistent crop avoids Safari object-fit and canvas disagreeing.
 */
export function ovalPortraitCrop(
  imageWidth: number, imageHeight: number,
  frameWidth: number, frameHeight: number,
): OvalPortraitCrop {
  if (![imageWidth,imageHeight,frameWidth,frameHeight].every(n=>Number.isFinite(n)&&n>0)) {
    throw new Error("INVALID_OVAL_PORTRAIT_DIMENSIONS");
  }
  const wide = frameWidth >= frameHeight;
  const ry = Math.min(frameHeight * (wide ? .28 : .245),
    frameWidth * (wide ? .23 : .41));
  const rx = Math.min(frameWidth * (wide ? .205 : .35), ry * .72);
  const cx = frameWidth * (wide ? .275 : .50);
  const cy = frameHeight * .50;
  const cover = Math.max(rx * 2 / imageWidth, ry * 2 / imageHeight) * 1.08;
  const dw = imageWidth * cover, dh = imageHeight * cover;
  const dx = Math.max(cx + rx - dw, Math.min(cx - rx, cx - dw * .50));
  const dy = Math.max(cy + ry - dh, Math.min(cy - ry, cy - dh * .34));
  return {cx,cy,rx,ry,dx,dy,dw,dh};
}

const tones: Record<PortraitTone, {rim:string;glow:string;shade:string}> = {
  gold: {rim:"rgba(255,233,176,.96)",glow:"rgba(255,208,120,.54)",shade:"rgba(28,29,20,.10)"},
  mint: {rim:"rgba(191,245,217,.95)",glow:"rgba(105,240,198,.42)",shade:"rgba(14,51,43,.12)"},
  rose: {rim:"rgba(255,211,224,.94)",glow:"rgba(253,161,193,.43)",shade:"rgba(52,21,42,.11)"},
};

export function paintOvalPortrait(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number, height: number,
  tone: PortraitTone = "mint",
): boolean {
  if (!image?.naturalWidth || !image.naturalHeight) return false;
  const {cx,cy,rx,ry,dx,dy,dw,dh}=ovalPortraitCrop(
    image.naturalWidth,image.naturalHeight,width,height);
  const palette=tones[tone];
  ctx.save();
  ctx.shadowColor=palette.glow;
  ctx.shadowBlur=Math.max(10,Math.min(width,height)*.03);
  ctx.fillStyle=palette.rim;
  ctx.beginPath();
  ctx.ellipse(cx,cy,rx+5,ry+5,0,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.beginPath();
  ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.clip();
  ctx.drawImage(image,dx,dy,dw,dh);
  const shade=ctx.createLinearGradient(0,cy-ry,0,cy+ry);
  shade.addColorStop(0,"rgba(0,0,0,0)");
  shade.addColorStop(.78,"rgba(0,0,0,0)");
  shade.addColorStop(1,palette.shade);
  ctx.fillStyle=shade;
  ctx.fillRect(cx-rx,cy-ry,rx*2,ry*2);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle=palette.rim;
  ctx.lineWidth=Math.max(2,Math.min(width,height)*.004);
  ctx.beginPath();
  ctx.ellipse(cx,cy,rx+4,ry+4,0,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
  return true;
}
