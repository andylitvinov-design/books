/** Private, deterministic intent extraction for the first Video Director Chat.
 * No remote AI, private text upload, billing, or invented scene identifiers.
 */
export const CHAT_DURATIONS = Object.freeze([10, 15, 20, 30, 60]);
const clean = value => String(value || '').trim().slice(0, 160);
const matches = (s, pattern) => pattern.test(s);

export function parseVideoChatIntent(input) {
  const text = clean(input);
  const s = text.toLocaleLowerCase();
  let aspect = null;
  if (matches(s, /(?:9\s*[:xх×]\s*16|вертикал|портрет|сторис|рилс|reels?|stories|shorts?|vertical|portrait|verticale|retrato|historia)/iu)) aspect = 'portrait';
  else if (matches(s, /(?:16\s*[:xх×]\s*9|горизонтал|широк|landscape|horizontal|widescreen|panor[aá]mic)/iu)) aspect = 'landscape';
  else if (matches(s, /(?:1\s*[:xх×]\s*1|квадрат|square|cuadrad)/iu)) aspect = 'square';
  let duration = null;
  const seconds = s.match(/\b(10|15|20|30|60)\s*(?:сек\w*|seconds?|secs?|s\b|segundos?)?/iu);
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
  const specificVisual = matches(s, /(?:волк|ор[её]л|дракон|девочк|мальчик|реб[её]нок|собак|кошк|еда|готовк|кулинар|пицц|wolf|eagle|dragon|cat\b|dog\b|child|people|cooking|food|pizza|lobo|[aá]guila|comida)/iu);
  return {text, aspect, duration, mood, music, phrases, specificVisual};
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