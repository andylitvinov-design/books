/** Private, deterministic intent extraction for the first Video Director Chat.
 * No remote AI, private text upload, billing, or invented scene identifiers.
 */
export const CHAT_DURATIONS = Object.freeze([10, 15, 20, 30, 60]);
const clean = value => String(value || '').trim().slice(0, 800);
const matches = (s, pattern) => pattern.test(s);

export function parseVideoChatIntent(input) {
  const text = clean(input);
  const s = text.toLocaleLowerCase();
  let aspect = null;
  if (matches(s, /(?:9\s*[:xх×]\s*16|вертикал|портрет|сторис|рилс|reels?|stories|shorts?|vertical|portrait|verticale|retrato|historia)/iu)) aspect = 'portrait';
  else if (matches(s, /(?:16\s*[:xх×]\s*9|горизонтал|широк|landscape|horizontal|widescreen|panor[aá]mic)/iu)) aspect = 'landscape';
  else if (matches(s, /(?:1\s*[:xх×]\s*1|квадрат|square|cuadrad)/iu)) aspect = 'square';
  let duration = null;
  const seconds = s.match(/(?:^|[^\p{L}\d])(10|15|20|30|60)\s*(?:сек\p{L}*|seconds?|secs?|s\b|segundos?)(?!\p{L})/iu);
  if (seconds) duration = Number(seconds[1]);
  else if (matches(s, /(?:одн[ау]\s+минут|one minute|un minuto|1\s*(?:мин|minute|minuto))/iu)) duration = 60;
  let mood = null;
  if (matches(s, /(?:динами|бодр|актив|energ[yié]|dynamic|fast|active|r[aá]pid)/iu)) mood = 'dynamic';
  else if (matches(s, /(?:спокой|нежн|мягк|медлен|relax|gentle|soft|slow|calm|suave|tranquil)/iu)) mood = 'slow';
  let music = null;
  if (matches(s, /(?:без\s+(?:музык|звука)|тишин|silent|without music|no music|sin m[uú]sica|silencio)/iu)) music = 'none';
  else if (matches(s, /(?:медитативн.*музык|медитац.*музык|meditation music|meditative|m[uú]sica de meditaci[oó]n)/iu)) music = 'meditation';
  else if (matches(s, /(?:музык|мелод|soundtrack|music|melody|m[uú]sica)/iu)) music = 'harmony';
  let phrases = null;
  if (matches(s, /(?:без\s+(?:фраз|текст|надпис|аффирмац)|no (?:captions|text|affirmations)|without (?:captions|text)|sin (?:frases|texto))/iu)) phrases = false;
  else if (matches(s, /(?:с\s+(?:фраз|текст|надпис|аффирмац)|добавь\s+(?:фраз|текст|надпис)|фраз[а-яё]*|афирмац|аффирмац|on.screen text|with captions|affirmations|con frases|con texto)/iu)) phrases = true;
  // These subjects are not represented by corresponding licensed MP4 footage.
  // Offer the separate procedural illustration/editor or an explicitly symbolic montage.
  const specificVisual = matches(s, /(?:волк|ор[её]л|дракон|девочк|девушк|женщин|мужчин|мальчик|реб[её]нок|собак|кошк|еда|еды|еду|едой|пищ|блюд|готовк|кулинар|пицц|wolf|eagle|dragon|cat\b|dog\b|child|people|woman|person|man\b|girl|boy|cooking|food|pizza|lobo|[aá]guila|comida|mujer|hombre|persona|niñ[oa])/iu);
  return {text, aspect, duration, mood, music, phrases, specificVisual};
}

/** A bare media-type request needs a topic question, not an arbitrary theme. */
export function isGenericVideoRequest(value) {
  const s=clean(value).toLocaleLowerCase();
  return /^(?:(?:я|мне|i|yo)\s+)?(?:(?:хочу|сделай|создай|нужен|нужно|давай|want|need|make|create|please|quiero|necesito|haz|crea)\s+)*(?:an?\s+|un\s+|una\s+)?(?:видео(?:ролик)?|ролик|video|vídeo|reel|reels|story|сторис)(?:\s+(?:пожалуйста|please|por favor))?[.!?]*$/iu.test(s);
}

/** Only explicit, short user imperatives can approve a story or start rendering. */
export function parseVideoChatAction(input,stage) {
  const s=clean(input).toLocaleLowerCase().replace(/[.!?]+$/u,'').trim();
  if(stage==='review' && /^(?:подтверждаю|подтвердить|да[, ]+подходит|всё подходит|все подходит|confirm|confirm story|yes[, ]+confirm|confirmar|confirmar historia|sí[, ]+confirmar)$/iu.test(s))return 'confirm';
  if(stage==='ready' && /^(?:создай(?: видео| ролик)?|создать видео|сгенерируй(?: видео)?|начинай|запускай|create(?: video| the video)?|generate(?: video)?|start|go|crear(?: vídeo| video)?|generar(?: vídeo| video)?)$/iu.test(s))return 'create';
  if(stage==='done' && /^(?:открой(?: видео| результат)?|показать видео|скачать видео|open(?: video| result)?|download(?: video)?|abrir(?: vídeo| video)?|descargar(?: vídeo| video)?)$/iu.test(s))return 'open';
  return null;
}

export const VIDEO_CHAT_STEPS = Object.freeze(['goal', 'mood', 'aspect', 'duration', 'music', 'phrases']);
export function nextVideoChatStep(draft) {
  for (const key of VIDEO_CHAT_STEPS) {
    if (key === 'goal' ? !draft.goal?.trim() : draft[key] === null || draft[key] === undefined) return key;
  }
  return 'review';
}

export function parseVideoChatStepChoice(step, value) {
  const s = clean(value).toLocaleLowerCase();
  const parsed = parseVideoChatIntent(value);
  if (step === 'goal') return s ? parsed.text : null;
  if (step === 'aspect') return parsed.aspect;
  if (step === 'duration') return CHAT_DURATIONS.includes(Number(s)) ? Number(s) : parsed.duration;
  if (step === 'mood') {
    if (/^(calm|slow|спокойно|мягко|tranquilo|suave)$/.test(s)) return 'slow';
    if (/^(dynamic|быстро|динамично|energ[eé]tico)$/.test(s)) return 'dynamic';
    return parsed.mood;
  }
  if (step === 'music') {
    if (/^(none|без музыки|тишина|silent|silencio)$/.test(s)) return 'none';
    if (/^(love|любовь|amor)$/.test(s)) return 'love';
    if (/^(meditation|медитация|meditaci[oó]n)$/.test(s)) return 'meditation';
    if (/^(harmony|гармония|armon[ií]a)$/.test(s)) return 'harmony';
    return parsed.music;
  }
  if (step === 'phrases') {
    if (/^(да|yes|s[ií]|on|включить)$/.test(s)) return true;
    if (/^(нет|no|off|выключить)$/.test(s)) return false;
    return parsed.phrases;
  }
  return null;
}

export function mergeVideoChatPreferences(draft, input) {
  const parsed = parseVideoChatIntent(input);
  return {
    ...draft,
    aspect: parsed.aspect ?? draft.aspect,
    duration: parsed.duration ?? draft.duration,
    mood: parsed.mood ?? draft.mood,
    music: parsed.music ?? draft.music,
    phrases: parsed.phrases ?? draft.phrases,
  };
}

/** Fill only missing filters; keep every explicit choice exactly as entered.
 * The default path needs no cloud AI, CRM or client details.
 */
export function suggestVideoChatDefaults(draft, theme='energy') {
  const soundtrack=theme==='relationships'?'love':theme==='health'?'meditation':'harmony';
  return {
    ...draft,
    mood:draft.mood??'slow',
    aspect:draft.aspect??'portrait',
    duration:draft.duration??30,
    music:draft.music??soundtrack,
    phrases:draft.phrases??false,
  };
}
/**
 * Convert a meaningful goal straight into a ready-to-review storyboard.
 * Explicit user choices always beat defaults. Bare generic requests ask
 * for a goal; no API, paid provider or private profile is involved.
 */
export function goalFirstVideoChatDraft(goal, theme='energy') {
  const parsed=parseVideoChatIntent(goal);
  if(!parsed.text || isGenericVideoRequest(parsed.text))return null;
  return suggestVideoChatDefaults({
    goal:parsed.text,mood:parsed.mood,aspect:parsed.aspect,
    duration:typeof parsed.duration==='number'&&CHAT_DURATIONS.includes(parsed.duration)
      ?parsed.duration:null,
    music:parsed.music,phrases:parsed.phrases,
  },theme);
}
/** Returns true if the message changes at least one recognized production filter. */
export function hasVideoChatFilter(input) {
  const fields=parseVideoChatIntent(input);
  return fields.aspect!==null||fields.duration!==null||fields.mood!==null||
    fields.music!==null||fields.phrases!==null;
}