/**
 * A fully browser-local PNG export for the public personal mandala.
 * No image, intention, or canvas pixels are posted to the server.
 * The visual source is the same rendered Power Place geometry in the editor.
 */
export type MandalaExportOptions = {
  stage: HTMLElement;
  stone: boolean;
  background: string;
  border: string;
  photoUrl: string | null;
  intention: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  squarePhoto: boolean;
};

const SIZE = 1200;
const CENTRE = SIZE / 2;
const FRAME = SIZE * 0.37;
const BORDER = 14;

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => image.naturalWidth > 0 ? resolve(image) : reject(new Error("Invalid image dimensions"));
    image.onerror = () => reject(new Error("The image cannot be decoded"));
    image.src = src;
  });
}

function framePath(ctx: CanvasRenderingContext2D, square: boolean) {
  const origin = CENTRE - FRAME / 2;
  const radius = square ? FRAME * 0.17 : FRAME / 2;
  const x = origin;
  const y = origin;
  const edge = FRAME;
  ctx.beginPath();
  if (!square) {
    ctx.arc(CENTRE, CENTRE, FRAME / 2, 0, 2 * Math.PI);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + edge - radius, y);
  ctx.quadraticCurveTo(x + edge, y, x + edge, y + radius);
  ctx.lineTo(x + edge, y + edge - radius);
  ctx.quadraticCurveTo(x + edge, y + edge, x + edge - radius, y + edge);
  ctx.lineTo(x + radius, y + edge);
  ctx.quadraticCurveTo(x, y + edge, x, y + edge - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawIntention(ctx: CanvasRenderingContext2D, intention: string) {
  const text = intention.trim().slice(0, 140);
  if (!text) return;
  ctx.fillStyle = "rgba(37,32,28,.82)";
  ctx.fillRect(115, 1046, 970, 76);
  ctx.fillStyle = "#fffaf1";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = "600 32px Georgia,serif";
  ctx.fillText(text, CENTRE, 1084, 900);
}

/**
 * Reconstructs the visible mandala/personal-photo composition as a real,
 * downloadable PNG. Using Canvas directly avoids HTML screenshot libraries,
 * third-party network services and unsafe cross-origin image requests.
 */
export async function renderMandalaPng(options: MandalaExportOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (options.stone) {
    // This is a first-party SVG copied from the original constructor.
    const stone = await decode("/mandalas/legacy-stone-mosaic.svg");
    ctx.drawImage(stone, 0, 0, SIZE, SIZE);
  } else {
    const source = options.stage.querySelector("svg");
    if (!(source instanceof SVGElement)) throw new Error("Mandala geometry is missing");
    const svg = source.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(SIZE));
    svg.setAttribute("height", String(SIZE));
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const illustration = await decode(svgUrl);
      ctx.drawImage(illustration, 0, 0, SIZE, SIZE);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  const photo = options.photoUrl ? await decode(options.photoUrl) : null;
  ctx.save();
  framePath(ctx, options.squarePhoto);
  ctx.clip();
  ctx.fillStyle = "#eadfd1";
  ctx.fillRect(CENTRE - FRAME / 2, CENTRE - FRAME / 2, FRAME, FRAME);

  if (photo) {
    const inner = FRAME - 2 * BORDER;
    const scale = Math.max(inner / photo.naturalWidth, inner / photo.naturalHeight);
    const baseWidth = photo.naturalWidth * scale;
    const baseHeight = photo.naturalHeight * scale;
    ctx.save();
    ctx.translate(CENTRE, CENTRE);
    ctx.scale(options.zoom, options.zoom);
    ctx.drawImage(
      photo,
      -inner / 2 + (inner - baseWidth) * options.offsetX / 100,
      -inner / 2 + (inner - baseHeight) * options.offsetY / 100,
      baseWidth,
      baseHeight,
    );
    ctx.restore();
  } else {
    const text = (options.intention.trim() || "✦").slice(0, 120);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6e5546";
    ctx.font = "600 38px Georgia,serif";
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    for (const word of words) {
      const current = lines[lines.length - 1] || "";
      const proposal = current ? current + " " + word : word;
      if (current && ctx.measureText(proposal).width > 360) lines.push(word);
      else if (lines.length) lines[lines.length - 1] = proposal;
      else lines.push(proposal);
    }
    const shown = lines.slice(0, 5);
    shown.forEach((line, i) => {
      ctx.fillText(line, CENTRE, CENTRE + (i - (shown.length - 1) / 2) * 48, 370);
    });
  }
  ctx.restore();
  framePath(ctx, options.squarePhoto);
  ctx.strokeStyle = options.border;
  ctx.lineWidth = BORDER * 2;
  ctx.stroke();
  if (photo) drawIntention(ctx, options.intention);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"),
  );
}
