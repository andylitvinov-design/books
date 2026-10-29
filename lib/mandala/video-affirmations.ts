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
  presetOverride?: string[];
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
  "en": {
    "energy": [
      "I feel calm",
      "I renew my energy",
      "I breathe with ease",
      "I allow myself rest",
      "Step by step"
    ],
    "money": [
      "I value my work",
      "I choose clarity",
      "I welcome options",
      "I plan with care",
      "I request fair pay"
    ],
    "life": [
      "I enjoy this moment",
      "I am here now",
      "I welcome change",
      "I choose balance",
      "Joy is possible"
    ],
    "health": [
      "I listen to myself",
      "I rest when needed",
      "I care for myself",
      "I move gently",
      "I ask for support"
    ],
    "relationships": [
      "I respect boundaries",
      "I welcome kindness",
      "I choose honesty",
      "I listen with care",
      "I express my needs"
    ],
    "goals": [
      "I see my goal",
      "I take action",
      "I keep moving",
      "I focus on today",
      "I learn and grow"
    ]
  },
  "ru": {
    "energy": [
      "Я спокоен",
      "Я полон сил",
      "Я дышу свободно",
      "Я выбираю отдых",
      "Я в равновесии"
    ],
    "money": [
      "Я ценю свой труд",
      "Я открыт возможностям",
      "Я уверен в выборе",
      "Я создаю достаток",
      "Я действую разумно"
    ],
    "life": [
      "Я люблю жизнь",
      "Я здесь и сейчас",
      "Я открыт переменам",
      "Я выбираю радость",
      "Я вижу хорошее"
    ],
    "health": [
      "Я берегу себя",
      "Я слышу тело",
      "Я отдыхаю",
      "Я выбираю заботу",
      "Я прошу поддержку"
    ],
    "relationships": [
      "Я открыт любви",
      "Я уважаю границы",
      "Я достоин заботы",
      "Я слышу другого",
      "Я говорю о важном"
    ],
    "goals": [
      "Я вижу цель",
      "Я делаю шаг",
      "Я могу действовать",
      "Я иду вперёд",
      "Я выбираю главное"
    ]
  },
  "es": {
    "energy": [
      "Estoy en calma",
      "Renuevo mi energía",
      "Respiro con calma",
      "Me permito descansar",
      "Avanzo poco a poco"
    ],
    "money": [
      "Valoro mi trabajo",
      "Elijo con claridad",
      "Veo oportunidades",
      "Planifico con calma",
      "Pido un pago justo"
    ],
    "life": [
      "Disfruto el presente",
      "Estoy aquí y ahora",
      "Acepto los cambios",
      "Elijo la alegría",
      "Veo lo bueno"
    ],
    "health": [
      "Me cuido",
      "Escucho a mi cuerpo",
      "Me permito descansar",
      "Elijo hábitos sanos",
      "Puedo pedir apoyo"
    ],
    "relationships": [
      "Respeto mis límites",
      "Me abro al cariño",
      "Elijo la honestidad",
      "Escucho con cuidado",
      "Expreso lo que siento"
    ],
    "goals": [
      "Veo mi meta",
      "Doy el primer paso",
      "Sigo avanzando",
      "Me centro en hoy",
      "Aprendo y crezco"
    ]
  }
};


export const MAX_AFFIRMATION_LENGTH = 36;

// Five concise personal lines; no persistence or network requests.
export function compactCustomAffirmationInput(value: string): string {
  return value.split(/\r?\n/).slice(0, 5)
    .map(line => Array.from(line).slice(0, MAX_AFFIRMATION_LENGTH).join(""))
    .join("\n");
}

function cleanLine(text: string): string {
  return Array.from(text.replace(/\s+/g, " ").replace(/[<>]/g, "").trim())
    .slice(0, MAX_AFFIRMATION_LENGTH).join("");
}

export function linesForVideoAffirmations(
  locale: VideoLocale, theme: VideoTheme, settings: AffirmationSettings,
): string[] {
  const options = Array.isArray(settings.presetOverride) && settings.presetOverride.length === 5 &&
    settings.presetOverride.every(text => typeof text === "string" && text.trim().length && text.length <= MAX_AFFIRMATION_LENGTH && !/[<>]/.test(text))
    ? settings.presetOverride : suggestedVideoAffirmations[locale][theme];
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


// Owner-approved editing topics are not clinical recommendations or outcomes.
// Keep phrases non-clinical, optional, revisable and local to the editor.
export type VideoAffirmationGoal =
  "recovery" | "rhythm" | "strength" | "value" | "planning" | "stability" |
  "connection" | "boundaries" | "dialogue" | "clarity" | "progress" | "meaning";
type GoalCopy = { id: VideoAffirmationGoal; label: string; sentence: string };
export const affirmationGoalCatalog: Record<VideoLocale, GoalCopy[]> = {
  en: [
    {id:"recovery",label:"Rest & recovery",sentence:"I recharge gently"},
    {id:"rhythm",label:"Calmer rhythm",sentence:"I slow down"},
    {id:"strength",label:"My energy",sentence:"I support my energy"},
    {id:"value",label:"Value my work",sentence:"My work matters"},
    {id:"planning",label:"Money planning",sentence:"I plan my finances"},
    {id:"stability",label:"Financial choices",sentence:"I choose wisely"},
    {id:"connection",label:"Warm connection",sentence:"I welcome connection"},
    {id:"boundaries",label:"My boundaries",sentence:"I respect my limits"},
    {id:"dialogue",label:"Open dialogue",sentence:"I speak honestly"},
    {id:"clarity",label:"My direction",sentence:"I see my priorities"},
    {id:"progress",label:"Steady progress",sentence:"I move forward"},
    {id:"meaning",label:"Meaning & purpose",sentence:"I follow my values"},
  ],
  ru: [
    {id:"recovery",label:"Отдых и восстановление",sentence:"Я восстанавливаю силы"},
    {id:"rhythm",label:"Спокойный ритм",sentence:"Я замедляюсь"},
    {id:"strength",label:"Моя энергия",sentence:"Я берегу энергию"},
    {id:"value",label:"Ценность моего труда",sentence:"Мой труд важен"},
    {id:"planning",label:"Планирование денег",sentence:"Я планирую бюджет"},
    {id:"stability",label:"Финансовые решения",sentence:"Я выбираю разумно"},
    {id:"connection",label:"Тёплые отношения",sentence:"Я открыт близости"},
    {id:"boundaries",label:"Личные границы",sentence:"Я сохраняю границы"},
    {id:"dialogue",label:"Открытый диалог",sentence:"Я говорю искренне"},
    {id:"clarity",label:"Ясность направления",sentence:"Я вижу главное"},
    {id:"progress",label:"Движение к цели",sentence:"Я продвигаюсь вперёд"},
    {id:"meaning",label:"Смысл и ценности",sentence:"Я следую ценностям"},
  ],
  es: [
    {id:"recovery",label:"Descanso y recuperación",sentence:"Recupero mis fuerzas"},
    {id:"rhythm",label:"Ritmo tranquilo",sentence:"Bajo el ritmo"},
    {id:"strength",label:"Mi energía",sentence:"Cuido mi energía"},
    {id:"value",label:"Valorar mi trabajo",sentence:"Mi trabajo importa"},
    {id:"planning",label:"Planificación económica",sentence:"Planifico mis finanzas"},
    {id:"stability",label:"Decisiones financieras",sentence:"Elijo con cuidado"},
    {id:"connection",label:"Conexión cálida",sentence:"Me abro al encuentro"},
    {id:"boundaries",label:"Mis límites",sentence:"Respeto mis límites"},
    {id:"dialogue",label:"Diálogo sincero",sentence:"Hablo con sinceridad"},
    {id:"clarity",label:"Claridad de rumbo",sentence:"Veo mis prioridades"},
    {id:"progress",label:"Avanzar con calma",sentence:"Sigo avanzando"},
    {id:"meaning",label:"Sentido y valores",sentence:"Sigo mis valores"},
  ],
};

const measuredAxisCopy: Record<VideoLocale, Record<string, string>> = {
  "en": {
    "stress": "I can slow down",
    "anxiety": "I breathe calmly",
    "sleep": "I welcome rest",
    "energy": "I notice my energy",
    "embodiment": "I hear my body",
    "mood": "I accept my feelings",
    "emotional_regulation": "I pause first",
    "resource": "I find support",
    "self_support": "I am kind to myself",
    "clarity": "I seek clarity",
    "focus": "I focus on one task",
    "functioning": "I take small steps",
    "meaning": "I choose what matters",
    "relationships": "I connect gently",
    "boundaries": "I keep my boundaries"
  },
  "ru": {
    "stress": "Я снижаю темп",
    "anxiety": "Я дышу спокойно",
    "sleep": "Я выбираю отдых",
    "energy": "Я берегу силы",
    "embodiment": "Я слышу тело",
    "mood": "Я принимаю чувства",
    "emotional_regulation": "Я делаю паузу",
    "resource": "Я нахожу поддержку",
    "self_support": "Я добр к себе",
    "clarity": "Я ищу ясность",
    "focus": "Я держу фокус",
    "functioning": "Я действую по шагам",
    "meaning": "Я выбираю важное",
    "relationships": "Я открыт контакту",
    "boundaries": "Я уважаю границы"
  },
  "es": {
    "stress": "Puedo bajar el ritmo",
    "anxiety": "Respiro con calma",
    "sleep": "Elijo descansar",
    "energy": "Cuido mi energía",
    "embodiment": "Escucho a mi cuerpo",
    "mood": "Acepto mis emociones",
    "emotional_regulation": "Hago una pausa",
    "resource": "Encuentro apoyo",
    "self_support": "Me trato con cariño",
    "clarity": "Busco claridad",
    "focus": "Me concentro",
    "functioning": "Doy pequeños pasos",
    "meaning": "Elijo lo importante",
    "relationships": "Conecto con calma",
    "boundaries": "Respeto mis límites"
  }
};

export function personalizedVideoAffirmations(
  locale: VideoLocale, theme: VideoTheme, measuredAxes: readonly string[] = [],
  priorities: readonly VideoAffirmationGoal[] = [],
): string[] {
  const catalog = affirmationGoalCatalog[locale];
  const chosen = [...new Set(priorities)].slice(0,3).flatMap(id => catalog.filter(item => item.id === id));
  const axes = [...new Set(measuredAxes)].filter(axis => Object.hasOwn(measuredAxisCopy[locale],axis)).slice(0,3);
  const phrases = [
    ...chosen.map(item => item.sentence),
    ...axes.map(axis => measuredAxisCopy[locale][axis]),
    ...suggestedVideoAffirmations[locale][theme],
    ...suggestedVideoAffirmations[locale].goals,
  ];
  return [...new Set(phrases.map(cleanLine).filter(Boolean))].slice(0,5);
}
