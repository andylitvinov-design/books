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
  position?: "top" | "center" | "bottom";
  textScale?: "small" | "medium" | "large";
  presetOverride?: string[];
};

export const defaultAffirmations: AffirmationSettings = {
  enabled: false,
  selected: [0, 1, 2],
  custom: "",
  density: "medium",
  frequency: 2,
  visibility: ["large"],
  position: "center",
  textScale: "medium",
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
      "Мне спокойно",
      "У меня есть силы",
      "Я дышу свободно",
      "Я выбираю отдых",
      "Я в равновесии"
    ],
    "money": [
      "Я ценю свой труд",
      "Я вижу возможности",
      "Я выбираю осознанно",
      "Я создаю достаток",
      "Я действую разумно"
    ],
    "life": [
      "Я люблю жизнь",
      "Я здесь и сейчас",
      "Я принимаю перемены",
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
      "Я выбираю любовь",
      "Я уважаю границы",
      "Я принимаю заботу",
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
  const position = settings.position === "top" ? 0.35 : settings.position === "bottom" ? 0.76 : 0.6;
  const textScale = settings.textScale === "small" ? 0.78 : settings.textScale === "large" ? 1.22 : 1;
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
      write(lines[(baseIndex + i) % lines.length], height * (position - 0.29 + i * 0.095),
        Math.max(15, size * 0.025 * textScale), 0.48 * fade, false);
    }
  }

  if (settings.visibility.includes("large")) {
    for (let i = 0; i < count; i++) {
      write(lines[(baseIndex + i) % lines.length], height * Math.min(0.92, position + i * 0.075),
        Math.max(24, size * (count === 3 ? 0.038 : 0.045) * textScale), 0.93 * fade, true);
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
    {id:"connection",label:"Тёплые отношения",sentence:"Я выбираю близость"},
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
    "self_support": "Я берегу себя",
    "clarity": "Я ищу ясность",
    "focus": "Я держу фокус",
    "functioning": "Я действую по шагам",
    "meaning": "Я выбираю важное",
    "relationships": "Я выбираю контакт",
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


// Compact Hypnoaffirmations editor: a small, first-party, fully local request
// vocabulary. Narrative text stays private in the form and is not interpreted
// as a diagnosis or sent to an AI service. Selected options drive this shortlist.
export const hypnoRequestProblems: Record<VideoLocale, Record<VideoTheme, readonly {label:string;phrase:string}[]>> = {
  en: {
    energy:[{label:"Tension",phrase:"I can pause"},{label:"Fatigue",phrase:"I allow myself rest"},{label:"Rushing",phrase:"I choose my pace"}],
    money:[{label:"Fear of pricing",phrase:"My work has value"},{label:"Uncertainty",phrase:"I can seek clarity"},{label:"Self-doubt",phrase:"I can take a step"}],
    relationships:[{label:"Fear of rejection",phrase:"My needs matter"},{label:"Boundaries",phrase:"I can say no"},{label:"Difficult conversations",phrase:"I can speak gently"}],
    goals:[{label:"Unclear direction",phrase:"I can choose one step"},{label:"Procrastination",phrase:"A small step counts"},{label:"Fear of mistakes",phrase:"I am allowed to learn"}],
    life:[{label:"Change",phrase:"I can move gradually"},{label:"Uncertainty",phrase:"I can pause and choose"},{label:"Lack of joy",phrase:"I notice small moments"}],
    health:[{label:"Overload",phrase:"I can ask for help"},{label:"Low energy",phrase:"Rest is allowed"},{label:"Tension",phrase:"I can slow down"}],
  },
  ru: {
    energy:[{label:"Напряжение",phrase:"Мне можно замедлиться"},{label:"Усталость",phrase:"Я выбираю отдых"},{label:"Спешка",phrase:"Я выбираю свой ритм"}],
    money:[{label:"Страх назвать цену",phrase:"Мой труд ценен"},{label:"Неопределённость",phrase:"Я могу искать ясность"},{label:"Сомнения в себе",phrase:"Я могу сделать шаг"}],
    relationships:[{label:"Страх отказа",phrase:"Мои потребности важны"},{label:"Личные границы",phrase:"Я могу сказать нет"},{label:"Трудный разговор",phrase:"Я могу говорить мягко"}],
    goals:[{label:"Нет ясного пути",phrase:"Я могу выбрать шаг"},{label:"Откладываю дела",phrase:"Даже малый шаг важен"},{label:"Страх ошибки",phrase:"Мне можно учиться"}],
    life:[{label:"Перемены",phrase:"Я могу идти постепенно"},{label:"Неопределённость",phrase:"Я могу сделать паузу"},{label:"Мало радости",phrase:"Я замечаю хорошее"}],
    health:[{label:"Перегрузка",phrase:"Я могу попросить помощь"},{label:"Мало сил",phrase:"Мне можно отдыхать"},{label:"Напряжение",phrase:"Я могу снизить темп"}],
  },
  es: {
    energy:[{label:"Tensión",phrase:"Puedo hacer una pausa"},{label:"Cansancio",phrase:"Me permito descansar"},{label:"Prisa",phrase:"Elijo mi ritmo"}],
    money:[{label:"Miedo a cobrar",phrase:"Mi trabajo tiene valor"},{label:"Incertidumbre",phrase:"Puedo buscar claridad"},{label:"Dudas",phrase:"Puedo dar un paso"}],
    relationships:[{label:"Miedo al rechazo",phrase:"Mis necesidades importan"},{label:"Límites",phrase:"Puedo decir que no"},{label:"Conversación difícil",phrase:"Puedo hablar con calma"}],
    goals:[{label:"Sin rumbo",phrase:"Puedo elegir un paso"},{label:"Posponer tareas",phrase:"Un paso pequeño cuenta"},{label:"Miedo al error",phrase:"Puedo aprender"}],
    life:[{label:"Cambios",phrase:"Puedo ir poco a poco"},{label:"Incertidumbre",phrase:"Puedo parar y elegir"},{label:"Poca alegría",phrase:"Noto lo bueno"}],
    health:[{label:"Sobrecarga",phrase:"Puedo pedir apoyo"},{label:"Poca energía",phrase:"Me permito descansar"},{label:"Tensión",phrase:"Puedo bajar el ritmo"}],
  },
};

export function buildHypnoRequestPhrases(
  locale: VideoLocale, theme: VideoTheme, problemIndex: number, goal: VideoAffirmationGoal,
): string[] {
  const issues = hypnoRequestProblems[locale][theme];
  const issue = issues[Number.isInteger(problemIndex) && problemIndex>=0 && problemIndex<issues.length ? problemIndex : 0];
  const chosenGoal = affirmationGoalCatalog[locale].find(item=>item.id===goal);
  const base = suggestedVideoAffirmations[locale][theme];
  return [...new Set([issue.phrase,chosenGoal?.sentence,...base].filter((value):value is string=>Boolean(value))
    .map(cleanLine).filter(Boolean))].slice(0,5);
}


/** Curated short variants: all filters act on the actual text, never on clinical claims. */
export type HypnoPhraseTone="gentle"|"balanced"|"uplifting";
export type HypnoPhraseKind="support"|"possibility"|"action";
export type HypnoPhraseFocus="support"|"confidence"|"action";
export type HypnoPhraseLength="short"|"medium";
const hypnoPhraseStyles:Record<VideoLocale,Record<VideoTheme,{short:string[];medium:string[]}>>={
 ru:{
  energy:{short:["Мне можно сделать паузу","Я выбираю свой темп","Я начну с малого"],medium:["Я могу беречь силы сегодня","Я выбираю спокойный темп дня","Я могу двигаться без спешки"]},
  money:{short:["Мой труд имеет ценность","Я могу обсудить условия","Я выбираю ясный шаг"],medium:["Мне можно назвать свою цену","Я могу спокойно обсудить оплату","Я уважаю ценность своего труда"]},
  relationships:{short:["Мне можно сказать нет","Я могу говорить открыто","Я выбираю свои границы"],medium:["Мои потребности имеют значение","Я могу сохранять свои границы","Мне можно взять время на ответ"]},
  goals:{short:["Мне можно начать с малого","Я вижу следующий шаг","Я могу попробовать снова"],medium:["Один посильный шаг уже важен","Я выбираю ясную задачу сейчас","Мне можно учиться на ошибках"]},
  life:{short:["Мне можно выбирать","Я замечаю важное","Я ищу собственный путь"],medium:["Я могу выбирать свой путь","Мне можно замечать радость в малом","Я двигаюсь в своём ритме"]},
  health:{short:["Мне можно отдыхать","Я берегу свои силы","Я могу просить помощь"],medium:["Забота о себе может быть мягкой","Я выбираю бережный режим","Мне можно сделать паузу для отдыха"]},
 },
 en:{
  energy:{short:["I can take a gentle pause","I choose my own pace","I can start with one step"],medium:["I can care for my energy today","I choose a calmer daily pace","I can move without rushing"]},
  money:{short:["My work has value","I can discuss my terms","I choose a clear next step"],medium:["I may discuss my fair price","I can talk about payment calmly","I respect the value of my work"]},
  relationships:{short:["I can say no kindly","I can speak openly","I can keep my boundaries"],medium:["My needs deserve attention","I can keep respectful boundaries","I may take time before I respond"]},
  goals:{short:["I can start small","I see the next step","I can try once more"],medium:["One manageable step still matters","I choose a clear task today","It is okay to learn from mistakes"]},
  life:{short:["I can choose my path","I notice what matters","I explore my own direction"],medium:["I can choose what matters to me","Small moments may hold meaning","I can move at my own pace"]},
  health:{short:["I may take a rest","I can care for myself","I can ask for support"],medium:["Care can begin with a gentle step","I choose a manageable rhythm","I may pause and rest when needed"]},
 },
 es:{
  energy:{short:["Puedo hacer una pausa","Elijo mi ritmo","Puedo empezar con un paso"],medium:["Puedo cuidar mi energía hoy","Elijo un ritmo más tranquilo","Puedo avanzar sin tanta prisa"]},
  money:{short:["Mi trabajo tiene valor","Puedo hablar de mis tarifas","Elijo un paso claro"],medium:["Puedo hablar de un precio justo","Puedo conversar con calma","Respeto el valor de mi trabajo"]},
  relationships:{short:["Puedo decir que no","Puedo hablar con sinceridad","Puedo cuidar mis límites"],medium:["Mis necesidades son importantes","Puedo cuidar mis propios límites","Puedo tomar tiempo para responder"]},
  goals:{short:["Puedo empezar poco a poco","Veo el próximo paso","Puedo intentarlo de nuevo"],medium:["Un paso pequeño tiene valor","Elijo una tarea clara hoy","Puedo aprender de mis errores"]},
  life:{short:["Puedo elegir mi camino","Noto lo importante","Exploro mi dirección"],medium:["Puedo elegir lo que me importa","Un momento pequeño tiene sentido","Puedo avanzar a mi propio ritmo"]},
  health:{short:["Puedo descansar","Puedo cuidarme","Puedo pedir apoyo"],medium:["Cuidarme puede ser algo sencillo","Elijo un ritmo más amable","Puedo pausar para descansar"]},
 },
};

const hypnoUpliftingStyles:Record<VideoLocale,Record<VideoTheme,readonly string[]>>={
 ru:{
  energy:["Я могу начать с хорошего шага","Во мне есть место для нового","Я могу действовать без спешки"],
  money:["Мои идеи достойны обсуждения","Я могу открыто говорить о работе","Я пробую новые решения"],
  relationships:["Я могу говорить чуть свободнее","Я могу делать выбор в диалоге","Мне доступны новые способы общения"],
  goals:["Мой следующий шаг мне доступен","Я могу пробовать новые пути","Сегодня я могу начать с малого"],
  life:["Я открываю для себя новые пути","Я могу замечать возможности","Маленькие шаги приносят опыт"],
  health:["Я могу выбирать заботу о себе","Я замечаю свои возможности","Сегодня есть место для отдыха"],
 },
 en:{
  energy:["I can take a positive first step","I can explore new possibilities","I can act without rushing"],
  money:["My ideas deserve discussion","I can discuss work openly","I can explore better choices"],
  relationships:["I can speak a little more freely","I can make choices in dialogue","I can explore new ways to talk"],
  goals:["My next step is within reach","I can explore other ways forward","I can begin with a small step"],
  life:["I can explore different paths","I can notice new possibilities","Small steps help me learn"],
  health:["I can choose gentle self-care","I notice what I can manage","Today I can make room for rest"],
 },
 es:{
  energy:["Puedo empezar con un buen paso","Puedo explorar posibilidades","Puedo actuar sin tanta prisa"],
  money:["Mis ideas merecen escucharse","Puedo hablar de mi trabajo","Puedo explorar mejores opciones"],
  relationships:["Puedo hablar con más libertad","Puedo elegir cómo dialogar","Puedo probar nuevas formas de hablar"],
  goals:["Mi próximo paso está cerca","Puedo explorar otros caminos","Puedo empezar por algo pequeño"],
  life:["Puedo explorar distintos caminos","Puedo notar nuevas posibilidades","Los pasos pequeños me enseñan"],
  health:["Puedo elegir cuidarme con calma","Puedo ver lo que está a mi alcance","Hoy puedo darme tiempo para descansar"],
 }
};

export function buildHypnoFilteredPhrases(
 locale:VideoLocale,theme:VideoTheme,problemIndex:number,goal:VideoAffirmationGoal,
 tone:HypnoPhraseTone="gentle",kind:HypnoPhraseKind="support",
 focus:HypnoPhraseFocus="support",length:HypnoPhraseLength="medium",round=0
):string[]{
 const styles=hypnoPhraseStyles[locale][theme];
 const targetLength=length==="short"?"short":"medium";
 const gentle=styles[targetLength];
 const balanced=styles[targetLength==="short"?"medium":"short"];
 const uplifting=hypnoUpliftingStyles[locale][theme];
 const toneRows=tone==="balanced"?balanced:tone==="uplifting"?uplifting:gentle;
 const roleIdx=kind==="action"?2:kind==="possibility"?1:0;
 const focusIdx=focus==="action"?2:focus==="confidence"?1:0;
 const variant=Math.max(0,Math.floor(round))%3;
 const base=buildHypnoRequestPhrases(locale,theme,problemIndex,goal);
 const goalText=affirmationGoalCatalog[locale].find(g=>g.id===goal)?.sentence;
 const candidates=[base[0],goalText].filter((x):x is string=>Boolean(x));
 // Keep two source-backed anchors, then different role/tone/focus words.
 const roleOptions=[toneRows[roleIdx],toneRows[(roleIdx+1)%3],toneRows[(roleIdx+2)%3]];
 const roleLine=roleOptions.find(s=>!candidates.includes(s));
 if(roleLine)candidates.push(roleLine);
 const focusOptions=focus==="support"
   ?styles.short
   :focus==="confidence"?[uplifting[0],uplifting[1],...styles.short]
   :[uplifting[2],uplifting[1],...styles.short];
 const focusLine=focusOptions.find(s=>!candidates.includes(s));
 if(focusLine)candidates.push(focusLine);
 // A new request for variants introduces a genuinely different authored line.
 const variationOptions=variant===0
   ?[toneRows[(roleIdx+1)%3],toneRows[(roleIdx+2)%3],...gentle]
   :variant===1?[uplifting[1],uplifting[2],...toneRows]
   :[balanced[2],balanced[1],...uplifting];
 const extraLine=variationOptions.find(s=>!candidates.includes(s));
 if(extraLine)candidates.push(extraLine);
 const fallbacks=[...toneRows,...styles.short,...styles.medium,...uplifting,...base,...suggestedVideoAffirmations[locale][theme]];
 return [...new Set([...candidates,...fallbacks].map(x=>cleanLine(x||"")).filter(Boolean))]
   .filter(x=>Array.from(x).length<= (length==="short"?26:MAX_AFFIRMATION_LENGTH)).slice(0,5);
}
