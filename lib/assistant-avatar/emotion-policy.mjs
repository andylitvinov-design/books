/** Device-only, non-diagnostic editorial expression cues. Never persist outcomes. */
const normalize = value => String(value ?? '').slice(0, 2000).toLocaleLowerCase()
  .replace(/ё/g, 'е').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').trim();
const has = (text, pattern) => pattern.test(text);
const unsafe = /самоуб|покончить с собой|убить себя|не хочу жить|суицид|suicid|kill myself|end my life|do not want to live|dont want to live|no quiero vivir|matarme|hacerme dano/u;
const notBetter = /(?:(?<![а-я])не\s+(?:стало\s+)?(?:лучше|хорошо|радостно|спокойно)|(?<![а-я])не\s+чувствую\s+себя\s+лучше|\bnot\s+(?:feeling\s+|getting\s+|any\s+)?(?:better|happy|good|calm)|\bdo(?:n't| not) feel better|\bno\s+(?:me\s+siento\s+|estoy\s+|voy\s+)?(?:mejor|bien|feliz|tranquil[oa]))/u;
const distressed = /(?:мне\s+(?:сегодня\s+)?(?:очень\s+|так\s+)?(?:тяжело|плохо|страшно|тревожно)|страшно|тревож|одинок|больно|устал(?:а|о)?\b|\boverwhelm|\bscared\b|\bafraid\b|\banxious\b|\bstruggl|\bhard time\b|\bfeel (?:terrible|awful|sad|down)|\btengo miedo\b|\bme siento (?:mal|triste|solo|sola)|\bestoy (?:triste|agotad[oa]|asustad[oa])|\bme cuesta\b|\bansied|\bmiedo\b)/u;
const positive = /(?:мне\s+(?:немного\s+|гораздо\s+|сегодня\s+)?лучше|стало (?:немного )?лучше|радостн|счастлив|спокойно|\bfeel (?:a little |much )?better\b|\bfeeling better\b|\bhapp(?:y|ier)\b|\bglad\b|\breliev|\bi am better\b|\bme siento mejor\b|\bestoy mejor\b|\bmas feliz\b|\balegr|\bfeliz\b|\bcontent[oa]\b|\bmejorando\b)/u;
const anger = /(?:злюсь|злость|раздраж|бесит|\bangry\b|\banger\b|\bfurious\b|\bmad at\b|\brabia\b|\benojad[oa]\b|\benfadad[oa]\b|\bfurios[oa]\b)/u;
const curiosity = /(?:хочу\s+(?:сделать|создать|придумать|записать|подобрать)|созда(?:й|ть)\s+(?:медитац|видео|ролик)|помоги\s+(?:создать|придумать)|\bi (?:want|would like|wish) to (?:create|make|record|try|explore)\b|\b(?:create|make|record) (?:a |my )?(?:meditation|video|message)\b|\bquiero (?:crear|hacer|grabar|probar|explorar)\b|\b(?:crear|hacer|grabar) (?:una? )?(?:meditacion|video|mensaje)\b)/u;
const success = /(?:у меня получилось|мне удалось|я справил(?:ся|ась)\b|\bi (?:did it|made it|managed)\b|\bi succeeded\b|\blo logre\b|\blo consegui\b|\bpude hacerlo\b)/u;
const grounding = /(?:хочу успокоиться|помоги успокоиться|хочу выдохнуть|помоги заземлиться|\bneed grounding\b|\bhelp me (?:breathe|ground|settle)\b|\bquiero calmarme\b|\bayudame a (?:respirar|calmarme)\b)/u;
const negatedDistress = /(?:(?<![а-я])не\s+(?:страшно|тяжело|тревожно|плохо)|\bnot\s+(?:afraid|scared|anxious|sad)\b|\bno\s+tengo\s+miedo\b|\bno\s+estoy\s+(?:triste|asustad[oa])\b)/u;
const contrast = /(?:одновременно|и\s+радостн[а-я]*\s+и\s+страшн|но|\bboth\b|\bbut\b|\band\b|\ba la vez\b|\bpero\b|\by\b)/u;
const result = (emotion='neutral', confidence=0, intensity=0) => ({emotion, confidence, intensity});

/** Pure function. These cues are for illustration only, never a health assessment. */
export function classifyAvatarEmotion(raw, locale='en') {
  if (!['ru','en','es'].includes(locale)) return result();
  const text = normalize(raw);
  if (text.length < 3 || has(text, unsafe)) return result();
  const negativePositive = has(text, notBetter);
  const bad = has(text, distressed) && !has(text, negatedDistress);
  const good = has(text, positive) && !negativePositive;
  if (negativePositive) return result('concerned', .91, 1);
  if (bad && good && has(text, contrast)) return result('attentive', .91, 1);
  if (has(text, anger)) return result('attentive', .91, 1);
  if (bad) return result('concerned', .85, 1);
  if (has(text, success)) return result('encouraging', .90, 1);
  if (good) return result('warm', .86, 1);
  if (has(text, grounding)) return result('grounded', .86, 1);
  if (has(text, curiosity)) return result('curious', .88, 1);
  return result();
}
