/**
 * Short-turn conversational progression for the existing Holistic House rules
 * path. Pure and session-only: no profiling, diagnosis, persistence or offers.
 * Only explicitly stated words and the last six chat turns influence a reply.
 */
export const DIALOGUE_PROGRESSION_VERSION = 'hh-dialogue-progression-v1';
const languages = new Set(['ru', 'en', 'es']);
const norm = value => String(value ?? '').toLocaleLowerCase().normalize('NFKC')
  .replace(/[áàä]/g, 'a').replace(/[éèêë]/g, 'e')
  .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
  .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n').replace(/ё/g, 'е')
  .replace(/[’']/g, '').replace(/\s+/g, ' ').trim().slice(0, 900);
const sentence = (ru, en, es) => ({ru, en, es});
const prompts = {
  sad: [
    sentence('Слышу, что сейчас грустно. Хочешь рассказать, с чем это связано, или просто немного побудем в разговоре?',
      'I hear that you are feeling sad. Would you like to share what is behind it, or simply talk for a while?',
      'Veo que estás triste. ¿Te apetece contar qué hay detrás o simplemente conversar un rato?'),
    sentence('Похоже, грусть остаётся. Она связана с каким-то событием или пока трудно понять причину?',
      'It sounds like the sadness is lingering. Does something specific come to mind, or is the reason unclear?',
      'Parece que la tristeza sigue ahí. ¿La relacionas con algo concreto o no sabes todavía por qué?')
  ],
  love: sentence(
    'Слышу, что тема любви сейчас важна. Это больше про конкретного человека или про нехватку тепла и взаимности?',
    'Love sounds important right now. Is this about someone in particular, or missing warmth and mutual connection?',
    'El amor parece importante ahora. ¿Se trata de una persona en particular o de echar de menos el cariño y la reciprocidad?'),
  close: [
    sentence('Тебе сейчас особенно хочется близости. Её не хватает с конкретным человеком или в целом?',
      'It sounds like you long for closeness. Is it missing with someone specific, or more generally?',
      'Parece que echas de menos la cercanía. ¿Con una persona concreta o en general?'),
    sentence('Когда говоришь о близости, чего не хватает сильнее: душевного разговора, внимания или ощущения, что тебя понимают?',
      'When you say closeness, what do you miss most: talking openly, attention, or feeling understood?',
      'Cuando hablas de cercanía, ¿echas más de menos conversar, recibir atención o sentirte comprendido?'),
    sentence('Что для тебя сейчас было бы самым маленьким признаком близости со стороны другого человека?',
      'What small sign of closeness from another person would matter most to you right now?',
      '¿Qué pequeño gesto de cercanía de otra persona sería más importante para ti ahora?')
  ],
  person: sentence('Понимаю, речь о конкретном человеке. Вы ещё общаетесь, но между вами дистанция, или почти перестали общаться?',
    'I see, there is someone specific. Are you still in touch but feeling distant, or hardly speaking?',
    'Entiendo, hay alguien en concreto. ¿Seguís hablando pero sientes distancia, o casi no tenéis contacto?'),
  distance: sentence('Такая дистанция может ранить. Она появилась после какого-то события или нарастала постепенно?',
    'That distance can hurt. Did it follow something specific, or grow gradually?',
    'Esa distancia puede doler. ¿Apareció tras algo concreto o fue creciendo poco a poco?'),
  conflict: sentence('После ссоры бывает непросто снова сблизиться. Тебе сейчас важнее быть услышанным или понять, готов ли другой человек говорить?',
    'Reconnecting after an argument can be hard. Is it more important to be heard, or to know whether the other person is ready to talk?',
    'Después de una discusión puede costar acercarse. ¿Te importa más sentirte escuchado o saber si la otra persona quiere hablar?'),
  lonely: sentence('Похоже, не хватает человеческого тепла. Тебе сейчас больше хочется, чтобы кто-то выслушал, или чтобы в жизни стало больше общения?',
    'It sounds like you miss human warmth. Would you rather be heard now, or find more connection in daily life?',
    'Parece que falta calidez humana. ¿Prefieres que alguien te escuche ahora o tener más compañía en tu día a día?'),
  clarity: sentence('Что сейчас непонятнее: как к тебе относится этот человек или что тебе самому делать дальше?',
    'What feels less clear: how this person feels about you, or what you would like to do next?',
    '¿Qué te resulta menos claro: lo que siente esa persona por ti o qué hacer tú ahora?'),
  stress: sentence('Ты уже обозначил, чего хочешь. В какой момент это ощущение особенно сильное: в начале дня, среди дел или вечером?',
    'You have named what you need. When does this feeling show up most: morning, during the day, or evening?',
    'Ya has dicho qué necesitas. ¿Cuándo aparece más esa sensación: por la mañana, durante el día o por la noche?'),
  work: sentence('Чтобы понять ситуацию точнее: это связано с конкретным событием на работе или напряжение копится постепенно?',
    'To understand better: is there a specific event at work, or has the pressure been building up?',
    'Para entenderlo mejor: ¿se debe a algo concreto en el trabajo o la presión se ha acumulado?'),
  generic: [
    sentence('Похоже, я повторяюсь. Что в этой ситуации для тебя сейчас самое трудное?',
      'I was repeating myself. What feels hardest about this situation right now?',
      'Me estaba repitiendo. ¿Qué es lo más difícil de esta situación ahora mismo?'),
    sentence('Спасибо, что продолжаешь объяснять. Что ты хотел бы, чтобы я понял точнее?',
      'Thank you for explaining further. What would you like me to understand more precisely?',
      'Gracias por seguir explicándolo. ¿Qué te gustaría que entendiera mejor?')
  ]
};
const rx = {
  close: /^(?:близост[\p{L}]*|тепл[\p{L}]*|обнят[\p{L}]*|closeness|intimacy|connection|cercania|intimidad|carino)[.!? ]*$/u,
  love: /^(?:любов[\p{L}]*|love|amor)[.!? ]*$/u,
  person: /^(?:с (?:конкретн[\p{L}]*|одним|ним|ней|партнер[\p{L}]*|партнер[\p{L}]* человеком)|с конкретным человеком|with (?:a specific person|someone|my partner|him|her)|con (?:alguien|una persona|mi pareja)|конкретн[\p{L}]* человек[\p{L}]*)[.!? ]*$/u,
  distance: /(?:дистанц|отдалил|отдаля|игнорир|не общаем|не пишет|молчит|distance|distant|ignoring|not talking|distancia|alej|ignorando)/u,
  conflict: /(?:ссор|поруг|конфликт|обид|argument|fight|after a fight|conflict|discusion|pelea|conflicto)/u,
  lonely: /^(?:одинок[\p{L}]*|в целом|вообще|не хватает тепла|lonely|in general|generally|alone|en general|soledad|solo|sola)[.!? ]*$/u,
  clarity: /^(?:ясност[\p{L}]*|непонятно|clarity|clearer|claridad)[.!? ]*$/u,
  sadness: /(?:груст|тоск|одинок|печал|sad|lonely|feeling down|triste|soledad)/u,
  sadShort: /^(?:грустно|печально|мне грустно|тоскливо|sad|i feel sad|feeling sad|triste|estoy triste|me siento triste)[.!? ]*$/u,
  media: /(?:видео|медитац|видеоролик|\bvideo\b|\bmeditat|\bfilm\b|\bpelicula)/u,
  relationship: /(?:любов|близост|отношен|партнер|партнер|одинок|love|closeness|intimacy|relationship|partner|cercania|amor|pareja|relacion)/u,
  danger: /(?:хочу умереть|не хочу жить|суицид|самоубийств|боль в груди|не могу дышать|kill myself|suicid|chest pain|cant breathe|quiero morir|dolor en el pecho)/u,
  direct: /(?:создай|сделай|сгенерируй|запиши|закаж|оплат|create|generate|book|pay|reserv|pagar)/u
};
function unasked(pool, history, lang) {
  const prior = history.filter(x => x?.role === 'assistant').map(x => norm(x.text));
  return (Array.isArray(pool) ? pool : [pool])
    .map(x => x[lang])
    .find(x => !prior.includes(norm(x))) ?? null;
}
/**
 * Preserve trusted domain replies. Move to a new, more precise question only
 * after an explicit short answer, or when a candidate repeats a prior reply.
 */
export function progressDialogueReply({message = '', locale = 'en', history = [], reply = '', intent = ''} = {}) {
  if (typeof reply !== 'string' || !reply.trim() || typeof message !== 'string') return reply;
  const lang = languages.has(locale) ? locale : 'en';
  const text = norm(message);
  if (!text || rx.danger.test(text) || rx.direct.test(text) || text.length > 130) return reply;
  const recent = Array.isArray(history) ? history.slice(-6).filter(x =>
    x && ['user', 'assistant'].includes(x.role) && typeof x.text === 'string') : [];
  // Preserve an active media wizard, just as the short-turn progression does.
  if (rx.media.test(text) || recent.some(x => rx.media.test(norm(x.text)))) return reply;
  const lastAssistant = [...recent].reverse().find(x => x.role === 'assistant')?.text || '';
  const priorUser = recent.filter(x => x.role === 'user').map(x => norm(x.text));
  const lastText = norm(lastAssistant);
  const relationshipContext = intent === 'relationship' ||
    rx.relationship.test(text) || rx.conflict.test(text) || rx.distance.test(text) ||
    rx.person.test(text) || priorUser.some(x => rx.relationship.test(x)) ||
    /(?:близость, ясность|closeness, clarity|cercania, claridad|конкретным человеком|still in touch|distancia|между вами дистанция)/u.test(lastText);
  const selected = (key) => unasked(prompts[key], recent, lang);
  if (rx.sadShort.test(text)) return selected('sad') || reply;
  if (relationshipContext) {
    if (rx.close.test(text)) return selected('close') || reply;
    if (rx.clarity.test(text)) return selected('clarity') || reply;
    if (rx.person.test(text)) return selected('person') || reply;
    if (rx.lonely.test(text)) return selected('lonely') || reply;
    if (rx.conflict.test(text)) return selected('conflict') || reply;
    if (rx.distance.test(text)) return selected('distance') || reply;
    if (rx.love.test(text)) return selected('love') || reply;
  }
  // Catch canned or owned-model loops without inventing a personal explanation.
  const repeated = lastText && lastText === norm(reply);
  if (!repeated) return reply;
  if (relationshipContext) return selected('close') || selected('clarity') || selected('generic') || reply;
  if (['stress', 'sleep', 'tired'].includes(intent)) return selected('stress') || reply;
  if (intent === 'work') return selected('work') || reply;
  return selected('generic') || reply;
}

/**
 * Server and guest fast path for an explicit *conversation* (not a product search).
 * The user can continue naturally; no recommendation cards, model inference or
 * permanent storage are needed for these early clarification turns.
 */
export function progressConversationTurn({message = '', locale = 'en', history = []} = {}) {
  const text = norm(message);
  if (!text || text.length > 70 || rx.danger.test(text) || rx.direct.test(text)) return null;
  const recent = Array.isArray(history) ? history.slice(-6).filter(x =>
    x && ['user','assistant'].includes(x.role) && typeof x.text === 'string') : [];
  const priorUser = recent.filter(x=>x.role==='user').map(x=>norm(x.text));
  const lastAssistant = [...recent].reverse().find(x=>x.role==='assistant')?.text || '';
  // Do not hijack an active video/meditation wizard; only a fresh human
  // conversation or an already established relationship clarification.
  if (priorUser.some(x=>rx.media.test(x)) || rx.media.test(norm(lastAssistant))) return null;
  const isSad = rx.sadShort.test(text);
  const relationEstablished = priorUser.some(x=>rx.relationship.test(x)) ||
    /(?:близость|любовь|отношени|конкретным человеком|closeness|love|relationship|cercania|amor|pareja)/u.test(norm(lastAssistant));
  const isRelationshipAnswer = rx.close.test(text) || rx.love.test(text) ||
    (relationEstablished && (rx.person.test(text) || rx.lonely.test(text) ||
      rx.clarity.test(text) || rx.conflict.test(text) || rx.distance.test(text)));
  if (!isSad && !isRelationshipAnswer) return null;
  const language=languages.has(locale)?locale:'en';
  const seed=sentence('Расскажи, что для тебя сейчас важно.',
    'Tell me what feels most important right now.',
    'Cuéntame qué es lo más importante ahora.')[language];
  const reply=progressDialogueReply({message,locale:language,history:recent,
    reply:seed,intent:isRelationshipAnswer?'relationship':'generic'});
  return reply && reply!==seed ? {reply, status:'clarify', source:'reviewed-rules'} : null;
}
