import type { VideoLocale, VideoTheme } from "./holistic-video-themes";

// This is editorial copy, not generated therapy, and never leaves the browser.
export type AffirmationDensity = "low" | "medium" | "high";
export type AffirmationFrequency = 1 | 2 | 3;
export type AffirmationVisibility = "small" | "large" | "frame";
export type AffirmationSettings = {
  enabled: boolean;
  selected: number[];
  custom: string;
  density: AffirmationDensity;
  frequency: AffirmationFrequency;
  visibility: AffirmationVisibility[];
};

export const defaultAffirmations: AffirmationSettings = {
  enabled: false,
  selected: [0, 1, 2],
  custom: "",
  density: "medium",
  frequency: 2,
  visibility: ["large"],
};

export const suggestedVideoAffirmations: Record<VideoLocale, Record<VideoTheme, readonly string[]>> = {
  en: {
    energy: [
      "I make space for rest and renewal",
      "I can return to a calm rhythm",
      "I listen to what my body needs",
      "I have permission to take a pause",
      "One gentle step is enough for now",
    ],
    money: [
      "I notice opportunities with clarity",
      "I value my work and my time",
      "I can make thoughtful money choices",
      "I move toward financial stability step by step",
      "I am learning to ask for fair payment",
    ],
    life: [
      "I welcome the rhythm of everyday life",
      "I can appreciate small moments",
      "I make time for what nourishes me",
      "I adapt gently to change",
      "I can create space for joy",
    ],
    health: [
      "I care for myself with patience",
      "I notice what helps me rest",
      "I choose gentle supportive habits",
      "I make room for balance and movement",
      "I ask for support when I need it",
    ],
    relationships: [
      "I can be open while keeping my boundaries",
      "I deserve kindness and mutual respect",
      "I listen to myself and others",
      "I choose honest, caring connections",
      "I can express my needs calmly",
    ],
    goals: [
      "I take one meaningful step today",
      "My direction can become clearer with practice",
      "I can learn from each attempt",
      "I give attention to what matters to me",
      "I build confidence through small actions",
    ],
  },
  ru: {
    energy: [
      "Я могу восстанавливать силы постепенно",
      "Я возвращаюсь к спокойному ритму",
      "Я внимателен к потребностям своего тела",
      "Я разрешаю себе отдыхать",
      "Сегодня достаточно одного бережного шага",
    ],
    money: [
      "Я замечаю новые возможности",
      "Я ценю свой труд и своё время",
      "Я принимаю финансовые решения осознанно",
      "Я иду к устойчивости небольшими шагами",
      "Я учусь просить достойную оплату за труд",
    ],
    life: [
      "Я замечаю хорошие моменты каждого дня",
      "Я могу радоваться простым вещам",
      "Я уделяю время тому, что наполняет меня",
      "Я бережно принимаю перемены",
      "Я создаю пространство для радости",
    ],
    health: [
      "Я отношусь к себе терпеливо и внимательно",
      "Я замечаю, что помогает мне отдыхать",
      "Я выбираю бережные повседневные привычки",
      "Я нахожу время для движения и равновесия",
      "Я могу обращаться за поддержкой",
    ],
    relationships: [
      "Я открыт общению и сохраняю границы",
      "Я достоин доброты и взаимного уважения",
      "Я прислушиваюсь к себе и другим",
      "Я выбираю честные и тёплые отношения",
      "Я могу спокойно выражать свои потребности",
    ],
    goals: [
      "Сегодня я делаю один важный шаг",
      "Я постепенно проясняю своё направление",
      "Каждая попытка помогает мне учиться",
      "Я уделяю внимание тому, что мне важно",
      "Моя уверенность растёт благодаря действиям",
    ],
  },
  es: {
    energy: [
      "Puedo recuperar fuerzas paso a paso",
      "Vuelvo a un ritmo tranquilo",
      "Escucho las necesidades de mi cuerpo",
      "Me permito descansar",
      "Hoy basta con un pequeño paso amable",
    ],
    money: [
      "Observo nuevas oportunidades con claridad",
      "Valoro mi trabajo y mi tiempo",
      "Tomo decisiones económicas conscientes",
      "Avanzo hacia la estabilidad poco a poco",
      "Aprendo a pedir una remuneración justa",
    ],
    life: [
      "Aprecio los pequeños momentos cotidianos",
      "Puedo disfrutar de las cosas sencillas",
      "Dedico tiempo a lo que me nutre",
      "Me adapto al cambio con amabilidad",
      "Creo espacio para la alegría",
    ],
    health: [
      "Me cuido con paciencia y atención",
      "Observo lo que me ayuda a descansar",
      "Elijo hábitos suaves que me apoyan",
      "Encuentro tiempo para moverme y equilibrarme",
      "Puedo pedir ayuda cuando la necesito",
    ],
    relationships: [
      "Puedo abrirme sin perder mis límites",
      "Merezco amabilidad y respeto mutuo",
      "Me escucho y escucho a otras personas",
      "Elijo relaciones honestas y afectuosas",
      "Expreso mis necesidades con calma",
    ],
    goals: [
      "Hoy doy un paso importante",
      "Mi rumbo se aclara con la práctica",
      "Aprendo de cada intento",
      "Dedico atención a lo que me importa",
      "Construyo confianza con acciones pequeñas",
    ],
  },
};

function cleanLine(text: string): string {
  return Array.from(text.replace(/\s+/g, " ").replace(/[<>]/g, "").trim()).slice(0, 90).join("");
}

export function linesForVideoAffirmations(
  locale: VideoLocale, theme: VideoTheme, settings: AffirmationSettings,
): string[] {
  const options = suggestedVideoAffirmations[locale][theme];
  const selected = [...new Set(settings.selected)]
    .filter(index => Number.isInteger(index) && index >= 0 && index < options.length)
    .slice(0, 5)
    .map(index => options[index]);
  const custom = settings.custom.slice(0, 500).split(/\r?\n/)
    .map(cleanLine).filter(Boolean).slice(0, 5);
  return [...selected, ...custom].slice(0, 10);
}

// All three effects use the SAME overlay function on preview and exported video.
// The experimental "25th frame" option is a short, disclosed 40 ms text exposure,
// NOT an invisible or scientifically established mind-control technique.
export function paintVideoAffirmations(
  ctx: CanvasRenderingContext2D,
  seconds: number,
  lines: readonly string[],
  settings: AffirmationSettings,
): void {
  if (!settings.enabled || !lines.length || !settings.visibility.length) return;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  if (!width || !height) return;
  const safeSeconds = Math.max(0, seconds);
  const period = settings.frequency === 1 ? 8 : settings.frequency === 3 ? 3 : 5;
  const cycle = Math.floor(safeSeconds / period);
  const phase = safeSeconds % period;
  const count = settings.density === "high" ? 3 : settings.density === "low" ? 1 : 2;
  const baseIndex = cycle % lines.length;
  const size = Math.min(width, height);
  const fade = Math.max(0.22, Math.min(1, phase / 0.5, (period - phase) / 0.55));

  function write(phrase: string, y: number, fontSize: number, opacity: number, plate: boolean) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + fontSize + "px Arial, Helvetica, sans-serif";
    if (plate) {
      ctx.fillStyle = "rgba(12,47,38,0.38)";
      ctx.fillRect(width * 0.055, y - fontSize * 1.05, width * 0.89, fontSize * 2.1);
    }
    ctx.shadowColor = "rgba(3,20,17,0.95)";
    ctx.shadowBlur = Math.max(4, fontSize * 0.25);
    ctx.fillStyle = "rgba(255,252,243," + opacity.toFixed(3) + ")";
    ctx.fillText(phrase, width * 0.5, y, width * 0.82);
    ctx.restore();
  }

  if (settings.visibility.includes("small")) {
    for (let i = 0; i < count; i++) {
      write(lines[(baseIndex + i) % lines.length], height * (0.26 + i * 0.095),
        Math.max(15, size * 0.025), 0.48 * fade, false);
    }
  }

  if (settings.visibility.includes("large")) {
    for (let i = 0; i < count; i++) {
      write(lines[(baseIndex + i) % lines.length], height * (0.6 + i * 0.075),
        Math.max(24, size * (count === 3 ? 0.038 : 0.045)), 0.93 * fade, true);
    }
  }

  // A brief sentence, not a full-screen flash. Exact frame persistence depends
  // on device, browser cadence and codec and is never promised to the visitor.
  if (settings.visibility.includes("frame") && phase >= 1 && phase < 1 + 1 / 25) {
    write(lines[baseIndex], height * 0.52, Math.max(22, size * 0.042), 0.7, true);
  }
}
