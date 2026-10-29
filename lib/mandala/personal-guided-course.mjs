// One local, reproducible guided-imagery course plan. This is NOT a clinical AI,
// diagnosis, treatment recommendation, or remotely generated video/audio.
export const COURSE_PLAN_VERSION = "resource-imagery-course-1";
export const COURSE_THEMES = Object.freeze(["energy","money","relationships","goals","life","health"]);
const safeTheme = value => COURSE_THEMES.includes(value) ? value : "energy";
const content = Object.freeze({
  en: {
    themes: { energy:"renewing energy",money:"work and financial clarity",relationships:"respectful connection",goals:"purpose and small steps",life:"everyday meaning",health:"rest and self-care" },
    begin:"Choose a comfortable position and notice what supports you. Keep your eyes open if you prefer. You can pause or stop at any time.",
    end:"Notice the room around you and the surface beneath you. There is no right way to imagine this. When ready, return to your day.",
    question:"What part of the scene feels supportive, or would you rather choose a different image?",
    gentle:"If this topic feels demanding, you can make the image smaller, slow down or simply rest.",
    strength:"If it fits, notice a resource or helpful choice you already have.",
    sessions: [
      ["A meadow of safety","A wide, welcoming meadow","Imagine a meadow in a season of your choice. You can stand at its edge and decide how far to go.","Notice its colours, the air and a place where you can rest."],
      ["A garden of resources","A growing garden","Imagine a quiet garden, with plants that need different amounts of care.","What helps this garden grow at its own pace? You may choose one small act of care."],
      ["A stream of flexibility","A small stream","Imagine a stream flowing at its own pace. You can watch from a comfortable place on the bank.","Find where the water moves freely; there is no need to force its direction."],
      ["A tree of support","A rooted tree","Imagine a tree with roots, a trunk and branches. You decide how close to be.","Which part of the tree represents a form of support you can access today?"],
      ["A house with kind boundaries","A peaceful house","Picture a simple house with doors and windows. You decide which spaces to enter.","Notice that you may open, close or leave any door. Your pace is your own."],
      ["A hillside path","A gentle hillside","Imagine a broad path up a low hill, with resting places and several possible routes.","You can choose one comfortable step or simply enjoy the view from here."],
      ["A bridge of choice","A safe bridge","Notice a bridge with a view of both sides. You do not have to cross it.","What would help you feel prepared for one voluntary change?"],
      ["A horizon to carry forward","An open horizon","Imagine a familiar place from this series and the horizon beyond it.","Take one resource, image or small action with you, only if it feels useful."]
    ]
  },
  ru: {
    themes: {energy:"восстановление сил",money:"ясность в работе и деньгах",relationships:"бережные отношения",goals:"цель и небольшие шаги",life:"смысл повседневной жизни",health:"отдых и заботу о себе"},
    begin:"Устройтесь удобно и заметьте, что вас поддерживает. Если комфортнее, оставьте глаза открытыми. Практику можно остановить в любой момент.",
    end:"Заметьте пространство вокруг и опору под собой. Нет единственно правильного образа. Когда будете готовы, возвращайтесь к своим делам.",
    question:"Что в этом образе помогает почувствовать опору? Возможно, вам больше подходит другой образ?",
    gentle:"Если сейчас эта тема даётся непросто, можно уменьшить образ, замедлиться или просто отдохнуть.",
    strength:"Если это вам подходит, заметьте уже доступную опору или полезный выбор.",
    sessions: [
      ["Поляна безопасности","Просторная поляна","Представьте поляну в приятное вам время года. Можно остаться на краю и самому выбрать, как далеко идти.","Обратите внимание на цвет, воздух и место, где приятно отдохнуть."],
      ["Сад ресурсов","Растущий сад","Представьте тихий сад, где разные растения требуют разной заботы.","Что помогает этому саду расти в своём ритме? Можно выбрать один небольшой жест заботы."],
      ["Ручей гибкости","Небольшой ручей","Представьте ручей, текущий в своём ритме. Вы можете наблюдать с удобного берега.","Заметьте, как вода находит путь, не требуя от себя усилия."],
      ["Дерево опоры","Дерево с корнями","Представьте дерево с корнями, стволом и ветвями. Вы сами выбираете расстояние до него.","Какая часть дерева напоминает о доступной сегодня поддержке?"],
      ["Дом и границы","Спокойный дом","Вообразите уютный дом с окнами и дверями. Вы сами решаете, куда входить.","Заметьте: каждую дверь можно открыть, закрыть или оставить нетронутой."],
      ["Тропа маленьких шагов","Пологий холм","Представьте широкую тропу на пологом холме с местами для отдыха и несколькими дорогами.","Можно выбрать один удобный шаг или просто посмотреть на пейзаж."],
      ["Мост выбора","Надёжный мост","Заметьте мост, с которого видны оба берега. Переходить по нему необязательно.","Что помогло бы вам подготовиться к одной добровольной перемене?"],
      ["Горизонт интеграции","Открытый горизонт","Вспомните приятный образ из этой серии и пространство за ним.","Возьмите с собой один ресурс, образ или маленькое действие — если оно полезно."]
    ]
  },
  es: {
    themes: {energy:"recuperar energía",money:"claridad en el trabajo y el dinero",relationships:"vínculos respetuosos",goals:"propósito y pequeños pasos",life:"sentido cotidiano",health:"descanso y autocuidado"},
    begin:"Busca una postura cómoda y observa qué te sostiene. Puedes mantener los ojos abiertos si lo prefieres. Puedes detenerte en cualquier momento.",
    end:"Observa el lugar donde estás y el apoyo bajo tu cuerpo. No hay una forma correcta de imaginar. Vuelve a tus actividades cuando quieras.",
    question:"¿Qué parte de esta imagen te ayuda o prefieres elegir otra?",
    gentle:"Si este tema resulta exigente, puedes imaginar menos, ir despacio o descansar.",
    strength:"Si te sirve, reconoce un recurso o una elección que ya tienes.",
    sessions: [
      ["Una pradera segura","Una pradera amplia","Imagina una pradera en la estación que prefieras. Puedes quedarte al borde y decidir hasta dónde ir.","Observa los colores, el aire y un lugar donde descansar."],
      ["Un jardín de recursos","Un jardín vivo","Imagina un jardín tranquilo; cada planta necesita cuidados diferentes.","¿Qué ayuda al jardín a crecer a su ritmo? Elige un gesto amable."],
      ["El arroyo flexible","Un pequeño arroyo","Imagina un arroyo que fluye a su ritmo. Puedes mirarlo desde una orilla cómoda.","Observa cómo el agua encuentra su camino sin forzarla."],
      ["Un árbol que sostiene","Un árbol con raíces","Imagina un árbol con raíces, tronco y ramas. Tú decides a qué distancia estar.","¿Qué parte del árbol representa un apoyo disponible hoy?"],
      ["Una casa con límites","Una casa serena","Imagina una casa sencilla con puertas y ventanas. Tú decides dónde entrar.","Puedes abrir, cerrar o dejar intacta cualquier puerta."],
      ["Un sendero amable","Una colina suave","Imagina un camino ancho por una colina con lugares para descansar.","Puedes dar un paso cómodo o quedarte admirando el paisaje."],
      ["Un puente de elección","Un puente seguro","Observa un puente desde el que ves ambas orillas. No necesitas cruzarlo.","¿Qué te ayudaría a elegir un cambio voluntario?"],
      ["Un horizonte abierto","Un horizonte luminoso","Recuerda una imagen agradable de esta serie y mira el horizonte.","Llévate un recurso o una pequeña acción, solo si te sirve."]
    ]
  }
});
// Storyboards reuse the site's existing verified film/Canvas scene IDs.
// Locked episodes are metadata only; no seven extra renders are triggered.
const visualStoryboards = Object.freeze([
  {videoTheme:"life",videoScene:"meadow-morning"},
  {videoTheme:"life",videoScene:"wildflower-dance"},
  {videoTheme:"health",videoScene:"mossy-stream"},
  {videoTheme:"life",videoScene:"lone-tree"},
  {videoTheme:"goals",videoScene:"open-door"},
  {videoTheme:"energy",videoScene:"mountain-air"},
  {videoTheme:"goals",videoScene:"light-path"},
  {videoTheme:"life",videoScene:"coastal-freedom"},
]);
const validAxes = new Set(["stress","anxiety","sleep","energy","embodiment","clarity","focus","functioning",
  "relationships","intimacy","boundaries","sexual_wellbeing","mood","emotional_regulation","resource","self_support","meaning"]);
const focusAxes = {
  energy:["energy","resource","sleep"], money:["clarity","focus","functioning"],
  relationships:["relationships","boundaries","self_support"], goals:["clarity","focus","meaning"],
  life:["meaning","resource","self_support"],health:["sleep","energy","embodiment"]
};
const cleanSource = x => typeof x === "string" ? x.replace(/[<>\r\n]/g," ").trim().slice(0,90) : "";
export function selectVerifiedCourseEvidence(portrait, goals, now = Date.now()) {
  const axes = portrait?.axes && typeof portrait.axes === "object" ? portrait.axes : {};
  const chosen = new Set(goals.flatMap(key => focusAxes[key] || []));
  return Object.entries(axes).flatMap(([axis,entry]) => {
    if(!chosen.has(axis) || !validAxes.has(axis) || !entry || entry.mode !== "directional" ||
      !Number.isFinite(entry.percent) || entry.percent < 0 || entry.percent > 100 ||
      !cleanSource(entry.resultId) || !cleanSource(entry.definitionKey) || !cleanSource(entry.sourceTitle))return [];
    const measured = Date.parse(entry.measuredAt || "");
    if(!Number.isFinite(measured) || measured > now + 86400000 || now-measured > 366*86400000)return [];
    return [{axis,sourceTitle:cleanSource(entry.sourceTitle),measuredAt:new Date(measured).toISOString(),
      resultId:cleanSource(entry.resultId),definitionKey:cleanSource(entry.definitionKey),percent:entry.percent}];
  }).slice(0,4);
}
// Only proposes topics that have RECENT, source-verified observations. Priority
// follows measurement recency, not comparisons of unlike test score values.
// Every proposal remains optional: the visitor must actively select it.
export function suggestGuidedGoalsFromProfile(portrait, now = Date.now()) {
  return COURSE_THEMES.map(theme => {
    const rows = selectVerifiedCourseEvidence(portrait, [theme], now);
    if(!rows.length) return null;
    const latest = rows.reduce((a,b)=>a.measuredAt>b.measuredAt?a:b);
    return {theme,at:latest.measuredAt};
  }).filter(Boolean).sort((a,b)=>b.at.localeCompare(a.at) ||
    COURSE_THEMES.indexOf(a.theme)-COURSE_THEMES.indexOf(b.theme))
    .slice(0,3).map(row=>row.theme);
}
// Explicit preferences always outrank a test score. The 1–10 header ratings
// are self-reports and never treated as validated instrument measurements.
/**
 * @param {{
 *   locale?: string,
 *   theme?: string,
 *   goals?: string[],
 *   selfRatings?: Partial<Record<string, number>>,
 *   evidence?: Array<{axis:string, sourceTitle:string, measuredAt:string, percent:number, definitionKey?:string}>
 * }} [options]
 */
export function buildPersonalImageryCourse({locale="en",theme="energy",goals=[],selfRatings={},evidence=[]} = {}) {
  const lang = ["ru","es"].includes(locale) ? locale : "en";
  const words = content[lang];
  const chosen = [...new Set((Array.isArray(goals)?goals:[]).filter(x=>COURSE_THEMES.includes(x)))].slice(0,3);
  if(!chosen.length)chosen.push(safeTheme(theme));
  const ratings = Object.fromEntries(Object.entries(selfRatings || {}).filter(([key,val])=>
    COURSE_THEMES.includes(key) && Number.isInteger(val) && val>=1 && val<=10));
  const sources = (Array.isArray(evidence) ? evidence : []).filter(row=>
    row && validAxes.has(row.axis) && chosen.some(g => focusAxes[g].includes(row.axis)) &&
    Number.isFinite(row.percent) && row.percent>=0 && row.percent<=100 &&
    cleanSource(row.sourceTitle) && Number.isFinite(Date.parse(row.measuredAt))).slice(0,4)
    .map(row=>({axis:row.axis,sourceTitle:cleanSource(row.sourceTitle),
      measuredAt:row.measuredAt,definitionKey:cleanSource(row.definitionKey)}));
  const sessions = words.sessions.map(([title,motif,scene,reflection],index)=>{
    const focus = chosen[index===7 ? 0 : index % chosen.length];
    const invitation = lang==="ru" ? "Сегодня можно уделить внимание теме: " + words.themes[focus] + "." :
      lang==="es" ? "Hoy puedes dedicar atención a " + words.themes[focus] + "." :
      "Today you may give some attention to " + words.themes[focus] + ".";
    // Use at most one goal-relevant, source-validated within-instrument reading.
    // Half-range only sets an OPTIONAL gentleness cue; never a clinical cutoff,
    // diagnosis or cross-test comparison. Self-checkins remain distinct.
    const matched = (Array.isArray(evidence)?evidence:[]).find(row=>
      row && focusAxes[focus]?.includes(row.axis) && Number.isFinite(row.percent) &&
      row.percent>=0 && row.percent<=100 && cleanSource(row.sourceTitle) &&
      Number.isFinite(Date.parse(row.measuredAt)));
    const cue = matched ? (matched.percent<50 ? words.gentle : words.strength) :
      Number.isInteger(ratings[focus]) ? (ratings[focus]<5 ? words.gentle : words.strength) : "";
    const script = [words.begin,invitation,scene,reflection,cue,words.question,words.end]
      .filter(Boolean).join("\n\n");
    return {number:index+1,id:"guided-imagery-"+(index+1),theme:focus,title,motif,
      scenes:[scene,reflection],script,affirmationTheme:focus,
      videoTheme:visualStoryboards[index].videoTheme,videoScene:visualStoryboards[index].videoScene,
      videoDurationSeconds:60,
      delivery:index===0?"free-local-preview":"requires-confirmed-package-and-review"};
  });
  return {version:COURSE_PLAN_VERSION,locale:lang,goals:chosen,selfRatings:ratings,
    evidence:sources,sessionCount:8,freeVideoCount:1,requiresPractitionerReview:true,
    narrationFileReady:false,paidAccessVerified:false,sessions};
}
