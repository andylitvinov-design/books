/**
 * Symbolic money-flow scenes on an existing first-party, browser-local
 * mandala PNG. This module only paints Canvas pixels: no personal image
 * inputs, fetch, uploads, persistence, provider SDKs or financial claims.
 */
export const moneyScenes = [
  { id: "golden-rain", symbol: "✦", label: { en: "Golden rain", ru: "Золотой дождь", es: "Lluvia dorada" } },
  { id: "cosmic-flow", symbol: "✧", label: { en: "Cosmic flow", ru: "Поток из Вселенной", es: "Flujo del universo" } },
  { id: "abundance-tree", symbol: "♧", label: { en: "Abundance tree", ru: "Древо изобилия", es: "Árbol de abundancia" } },
  { id: "opportunity-falls", symbol: "≋", label: { en: "Opportunity falls", ru: "Водопад возможностей", es: "Cascada de oportunidades" } },
  { id: "money-magnet", symbol: "◎", label: { en: "Money magnet", ru: "Магнит денег", es: "Imán de prosperidad" } },
  { id: "path-to-goals", symbol: "⌁", label: { en: "Path to goals", ru: "Путь к целям", es: "Camino a tus metas" } },
  { id: "partners", symbol: "✳", label: { en: "People & opportunities", ru: "Партнёрство и клиенты", es: "Personas y oportunidades" } },
  { id: "infinite-flow", symbol: "∞", label: { en: "Infinite flow", ru: "Бесконечный поток", es: "Flujo infinito" } },
  { id: "golden-shield", symbol: "◇", label: { en: "Golden shield", ru: "Денежная защита", es: "Escudo dorado" } },
  { id: "abundance-circle", symbol: "◉", label: { en: "Circle of abundance", ru: "Круг изобилия", es: "Círculo de abundancia" } },
  { id: "life-gifts", symbol: "✻", label: { en: "Life's gifts", ru: "Подарки жизни", es: "Regalos de la vida" } },
  { id: "dreams", symbol: "☆", label: { en: "Dreams in focus", ru: "Воплощение мечты", es: "Sueños en perspectiva" } },
  { id: "wealth-sunrise", symbol: "☀", label: { en: "Prosperity sunrise", ru: "Рассвет процветания", es: "Amanecer próspero" } },
  { id: "golden-harvest", symbol: "✺", label: { en: "Golden harvest", ru: "Золотой урожай", es: "Cosecha dorada" } },
  { id: "radiant-portal", symbol: "◇", label: { en: "Radiant portal", ru: "Портал возможностей", es: "Portal radiante" } },
  { id: "prosperity-coast", symbol: "≋", label: { en: "Coast of abundance", ru: "Берег изобилия", es: "Costa de abundancia" } },
] as const;

export type MoneySceneId = (typeof moneyScenes)[number]["id"];

/** Draw an arc/line with ambient light, deliberately without real banknotes. */
function trace(
  ctx: CanvasRenderingContext2D,
  coords: ReadonlyArray<readonly [number, number]>,
  alpha = 0.46,
  strokeWidth = 3,
) {
  if (coords.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(coords[0][0], coords[0][1]);
  for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i][0], coords[i][1]);
  ctx.strokeStyle = "rgba(255,204,100," + alpha + ")";
  ctx.lineWidth = strokeWidth;
  ctx.stroke();
}

function glint(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha = 0.8) {
  ctx.strokeStyle = "rgba(255,232,152," + alpha + ")";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x, y + radius);
  ctx.stroke();
}

function coin(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha = 0.8) {
  ctx.fillStyle = "rgba(245,191,77," + Math.max(0, Math.min(1, alpha)) + ")";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,244,176," + alpha + ")";
  ctx.lineWidth = Math.max(1, radius * 0.18);
  ctx.stroke();
}

function loop(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  radiusX: number, radiusY: number, alpha: number, rotation: number,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = "rgba(255,211,129," + alpha + ")";
  ctx.stroke();
}

/**
 * All twelve looks use the same locally-composited PNG and never animate or
 * replace the client's actual face. An elliptical central safety mask keeps
 * overlays off the face and the main portion of the portrait.
 */
export function paintMoneyScene(
  ctx: CanvasRenderingContext2D,
  scene: MoneySceneId,
  seconds: number,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const t = Math.max(0, seconds);
  const tau = Math.PI * 2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  // Separate overlapping paths and mask off the central client portrait.
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.ellipse(cx, cy, w * 0.23, w * 0.23, 0, 0, tau, true);
  ctx.clip("evenodd");

  switch (scene) {
    case "golden-rain":
      for (let i = 0; i < 34; i++) {
        const x = (0.035 + ((i * 37) % 95) / 100) * w;
        const y = ((i * 83 + t * (28 + i % 4 * 8)) % (h + 120)) - 60;
        coin(ctx, x, y, 2.5 + i % 5, 0.36 + (i % 3) * 0.17);
        if (i % 4 === 0) glint(ctx, x, y - 10, 4 + i % 4, 0.5);
      }
      break;

    case "abundance-tree":
      for (const side of [-1, 1]) {
        const baseX = cx + side * w * 0.37;
        const trunkEndX = cx + side * w * 0.40;
        const trunkEndY = cy - w * 0.19;
        trace(ctx, [[baseX, cy + w * .48], [baseX, cy + w * .13], [trunkEndX, trunkEndY]], .7, 5);
        for (let branch = 0; branch < 7; branch++) {
          const y = cy + w * .13 - branch * w * .071;
          const fromX = baseX + side * Math.sin(branch * .8) * w * .017;
          const x = cx + side * (w * (.27 + .044 * (branch % 3)));
          trace(ctx, [[fromX, y], [x, y - w * .12]], .54, 2.2);
          for (let leaf = 0; leaf < 3; leaf++) {
            coin(ctx, x + side * leaf * 10, y - w * .12 - (leaf % 2) * 11 +
              Math.sin(t + leaf + branch) * 4, 3.4, .44);
          }
        }
      }
      break;

    case "money-magnet":
      for (let i = 0; i < 24; i++) {
        const side = i % 2 ? 1 : -1;
        const phase = (t * .19 + i * .13) % 1;
        const x = cx + side * w * (.49 - phase * .22);
        const y = cy + w * (.34 + Math.sin(i * 1.8 + t * .5) * .09);
        coin(ctx, x, y, 2.5 + i % 5, .42 + phase * .35);
      }
      loop(ctx, cx, cy + w * .39, w * .25, w * .095, .7, 0);
      break;

    case "infinite-flow": {
      const points: Array<readonly [number, number]> = [];
      for (let i = 0; i <= 160; i++) {
        const a = i / 160 * tau;
        points.push([cx + Math.sin(a) * w * .44, cy + Math.sin(2 * a) * w * .24]);
      }
      trace(ctx, points, .72, 4);
      for (let i = 0; i < 12; i++) {
        const a = t * .6 + i / 12 * tau;
        coin(ctx, cx + Math.sin(a) * w * .44, cy + Math.sin(2 * a) * w * .24, 3.5, .66);
      }
      break;
    }

    case "cosmic-flow":
      for (let i = 0; i < 6; i++) {
        loop(ctx, cx, cy, w * (.31 + i * .034), w * (.27 + i * .023),
          .13 + i * .06, .18 * Math.sin(t * .2 + i));
      }
      for (let i = 0; i < 19; i++) {
        const a = t * .25 + i * 2.39996;
        const radius = w * (.30 + (i % 8) * .023);
        glint(ctx, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius,
          2.5 + i % 4, .49);
      }
      break;

    case "opportunity-falls":
      for (let i = 0; i < 24; i++) {
        const side = i % 2 ? 1 : -1;
        const x = cx + side * w * (.30 + (i % 7) * .023);
        const offset = Math.sin(t * 1.6 + i * .4) * 12;
        const y = ((i * 61 + t * 45) % (h + 130)) - 65;
        trace(ctx, [[x, y - 20], [x + offset * .18, y + 30]], .2 + i % 4 * .1, 2);
        if (i % 3 === 0) coin(ctx, x, y, 3.8, .6);
      }
      break;

    case "path-to-goals": {
      const road: Array<readonly [number, number]> = [];
      for (let i = 0; i <= 30; i++) {
        const p = i / 30;
        road.push([cx + Math.sin(p * 5 + t * .24) * w * (.23 + p * .19),
          h * (.92 - p * .38)]);
      }
      trace(ctx, road, .68, 4);
      for (let i = 0; i < 11; i++) {
        const p = (i / 11 + t * .04) % 1;
        const x = cx + Math.sin(p * 5 + t * .24) * w * (.23 + p * .19);
        const y = h * (.92 - p * .38);
        glint(ctx, x, y, 3 + i % 3, .6);
      }
      break;
    }

    case "partners":
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * tau + .2;
        const x = cx + Math.cos(a) * w * .41;
        const y = cy + Math.sin(a) * w * .42;
        const b = ((i + 2) % 10) / 10 * tau + .2;
        trace(ctx, [[x, y], [cx + Math.cos(b) * w * .41,
          cy + Math.sin(b) * w * .42]], .22, 1.5);
        coin(ctx, x, y, 4.5 + Math.sin(t + i) * 1.6, .64);
      }
      break;

    case "golden-shield":
      for (let i = 0; i < 4; i++) {
        loop(ctx, cx, cy, w * (.31 + i * .042), w * (.32 + i * .034),
          .46 - i * .075, 0);
      }
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * tau + t * .14;
        glint(ctx, cx + Math.cos(a) * w * .46,
          cy + Math.sin(a) * w * .455, 5, .5);
      }
      break;

    case "abundance-circle":
      for (let i = 0; i < 5; i++) {
        loop(ctx, cx, cy, w * (.28 + i * .05), w * (.28 + i * .05),
          .62 - i * .08, t * .028);
      }
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * tau + t * .22;
        coin(ctx, cx + Math.cos(a) * w * .45,
          cy + Math.sin(a) * w * .45, 2.7, .6);
      }
      break;

    case "life-gifts":
      for (let i = 0; i < 11; i++) {
        const side = i % 2 ? -1 : 1;
        const x = cx + side * w * (.3 + ((i * 7) % 13) / 100);
        const y = ((i * 89 - t * 25 + h * 5) % (h + 80)) - 40;
        const s = 12 + i % 3 * 5;
        ctx.strokeStyle = "rgba(255,220,142,.66)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - s/2, y - s/2, s, s);
        trace(ctx, [[x, y - s/2], [x, y + s/2]], .55, 1.5);
        glint(ctx, x, y - s/2 - 3, 4, .6);
      }
      break;

    case "dreams":
      for (let i = 0; i < 17; i++) {
        const a = i * 2.39996 + t * .11;
        const radius = w * (.3 + i % 7 * .026);
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        loop(ctx, x, y, 9 + i % 4 * 4, 9 + i % 4 * 4, .23 + i % 3 * .09, 0);
        if (i % 2 === 0) glint(ctx, x, y, 5, .65);
      }
      break;
  }
  ctx.restore();
}
