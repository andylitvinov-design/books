/**
 * Wave Magic Director — bounded, first-party orchestration for a single chat.
 * Advice only. The authenticated caller owns safety, consent, verified services,
 * appointments, CRM, memory persistence and any external side effect.
 * The context is a short, user-authored window, never a client diagnosis.
 */
export const WAVE_MAGIC_DIRECTOR_VERSION = 'wave-magic-director-v1';
export const WAVE_DIALOGUE_STAGES = Object.freeze([
  'situation', 'desired_change', 'obstacle', 'approach', 'next_step',
]);
const LANGS = new Set(['ru', 'en', 'es']);
const normalize = v => String(v ?? '').toLocaleLowerCase().replace(/ё/gu, 'е')
  .normalize('NFD').replace(/и\u0306/giu, 'й').replace(/[\u0300-\u036f]/gu, '')
  .replace(/[’']/gu, '').replace(/\s+/gu, ' ').trim();
const SAFE = /(?:суицид|самоубийств|не хочу жить|умереть|не могу дышать|боль в груди|насили|suicid|kill myself|want to die|cannot breathe|chest pain|violence|quiero morir|dolor en el pecho|no puedo respirar|violencia)/iu;
const ACTION = /(?:запиши меня|оформи заявку|оплати|удали|создай|сгенерируй|отправь|загрузи|забронируй|book me|please book|pay now|send my|delete my|create a|generate a|upload|reserve my|paga|envia|borra|genera|reserva mi)/iu;
const DIRECT = /(?:сколько стоит|стоимость|цена|записаться|оплата|платеж|приложени|ссылка|не работает|где найти|how much|what price|what does it cost|how to book|how do i pay|payment|not working|where can i find|cuanto cuesta|cuál es el precio|como reservar|precio|pago|no funciona)/iu;
const SERVICES = /(?:какую услугу|подбери (?:услугу|консультаци)|нужна консультация|нужен специалист|ищу специалиста|рекомендуй (?:услугу|консультаци)|recommend (?:a )?(?:service|session)|which service|looking for a (?:therapist|session)|need a consultation|busco (?:un profesional|una consulta)|que servicio recomiendas|necesito una consulta)/iu;
const NO_SALES = /(?:не предлагай услуги|без продаж|не хочу услуг|не хочу консультац|no sales|dont offer services|do not offer services|no quiero servicios|sin ofertas)/iu;
const NO_ADVICE = /(?:не хочу советов|без советов|просто выслушай|не советуй|no advice|without advice|just listen|sin consejos|solo escuchame)/iu;
const STOP = /^(?:стоп|хватит|закончим|пока|stop|end chat|goodbye|basta|terminar|adios)[.!\s]*$/iu;
const CHANGE = /(?:сменим тему|сменить тему|новая тема|давай о другом|не об этом|change the topic|new topic|something else|cambiar de tema|otro tema)/iu;
const UNSURE = /^(?:не знаю|не уверен(?:а)?|сложно сказать|i dont know|not sure|hard to say|no se|no estoy segur[oa])(?:[.!?\s]*)$/iu;
const SKIP = /^(?:пропустить|пропускаем|не хочу отвечать|skip|pass|rather not say|omitir|prefiero no responder)[.!\s]*$/iu;
const RESUME_ADVICE = /(?:теперь (?:можно|хочу) совет|дай совет|теперь давай совет|now i want advice|give me advice|ahora quiero consejos)/iu;
const HELP = /(?:помоги|помогите|хочу разобраться|не знаю (?:как|что|с чего)|мне сложно|мне трудно|у меня проблема|беспокоит|как мне быть|need help|help me|struggling|i feel stuck|i dont know (?:how|what)|having trouble|quiero entender|ayudame|me cuesta|tengo un problema|no se como)/iu;
const SELF = /(?:^|[\s,.;!?])(?:я|мне|меня|мой|моя|хочу|нужно|нас|мы|у меня|i|my|me|we|our|im|ive|yo|mi|nosotros|quiero|necesito)(?=[\s,;.!?]|$)/iu;
const GOAL = /(?:хочу (?:чтобы|стать|изменить|наладить|добиться|понять|разобраться|справиться|вернуть|найти|поговорить|[а-яa-z])|мне важно|хотелось бы|моя цель|нужно (?:решить|понять)|i want (?:to|a)|id like|my goal|i need to|hope to|quiero (?:que|ser|cambiar|entender|lograr|hablar)|mi objetivo|me gustaria)/iu;
const OBSTACLE = /(?:но не|не получается|не могу|мешает|препятств|боюсь|сложно|трудно|застрял|не хватает|все время|постоянно|but i cant|cant seem|cannot|hard to|afraid|stuck|what stops|difficult|no puedo|me impide|me cuesta|tengo miedo|es dificil)/iu;
const APPROACH = /(?:пробовал|пробовала|помогало|помогает|получалось|предпочитаю|лучше (?:онлайн|очно)|бесплатно|самостоятельно|с психологом|хочу (?:сессию|курс)|i tried|has helped|helps me|i prefer|online|in person|free only|self guided|he probado|me ayuda|prefiero|gratis|por mi cuenta)/iu;
const CHOICE = /(?:выбираю|подходит|давай так|хочу этот вариант|начну с|запишусь|решил|решила|i choose|that works|ill start|i decided|lets do that|elijo|me sirve|voy a empezar|decidi)/iu;
const CORRECTION = /(?:не (?:о|про) .{2,100}?[, \s]+а (?:о|про) |not about .{2,100}? but |no (?:sobre|de) .{2,100}? sino )/iu;
const DETAILS = /(?:когда|после|вчера|сегодня|каждый раз|неделю|месяц|на работе|дома|с партнер|с мам|с коллег|в отношени|when|after|yesterday|today|every time|at work|at home|with my|during|cuando|despues|ayer|hoy|cada vez|en el trabajo|en casa|con mi)/iu;
const TOPIC = Object.freeze([
  ['relationships',/(?:отношен|любов|партнер|семь|ссор|разрыв|relationship|partner|family|breakup|argument|amor|pareja|familia|relacion)/iu],
  ['work',/(?:работ|бизнес|деньг|карьер|доход|work|business|money|career|job|trabajo|negocio|dinero)/iu],
  ['energy',/(?:тревог|стресс|устал|выгора|страх|напряж|stress|anxious|exhaust|fear|tired|burnout|ansiedad|estres|cansad|agotad|miedo)/iu],
  ['meaning',/(?:смысл|предназначен|призван|purpose|meaning|direction in life|sentido|proposito)/iu],
  ['goals',/(?:цель|прокрастинац|мотивац|планир|goal|procrastinat|motivat|plan|objetivo|meta|motivacion)/iu],
]);
const COPY = Object.freeze({
  ru: {
    situation: ['С какой конкретной ситуации вы хотели бы начать?', 'Что произошло — можете привести один пример?'],
    desired_change: ['Что вам хотелось бы изменить или получить в результате?', 'Если ситуация станет немного лучше, что изменится первым?'],
    obstacle: ['Что сейчас больше всего мешает этому?', 'В какой момент становится особенно трудно?'],
    approach: ['Что уже пробовали и что хотя бы немного помогало?', 'Вам ближе сначала разобраться вместе или попробовать небольшую самостоятельную практику?'],
    next_step: ['Какой из обсуждённых вариантов вам ближе?', 'Что будет для вас удобным следующим шагом?'],
    unsure: 'Не обязательно знать ответ сразу. Что вам ближе сейчас: разобраться в ситуации или подумать о следующем шаге?',
    skipped: 'Хорошо, этот вопрос можно пропустить. Что для вас сейчас важнее?',
    noAdvice: 'Понял, без советов. Могу просто выслушать. Что хотите рассказать?',
    selected: 'Вы уже выбрали вариант. Что именно о нём хотите уточнить?',
    complete: 'Вы обозначили ситуацию, цель и следующий шаг. Хотите уточнить детали или завершить разговор?',
  },
  en: {
    situation: ['What specific situation would you like to start with?', 'Could you share one example of what happened?'],
    desired_change: ['What would you most like to change or achieve?', 'If things got a little better, what would change first?'],
    obstacle: ['What seems to be getting in the way right now?', 'At which moment does it become hardest?'],
    approach: ['What have you already tried, and what helped even a little?', 'Would you rather explore it together or try a small self-guided practice?'],
    next_step: ['Which of the options we discussed feels closer to you?', 'What would be a comfortable next step for you?'],
    unsure: 'You do not need to know yet. Would you rather explore the situation or think about a next step?',
    skipped: 'We can skip that. What feels more important now?',
    noAdvice: 'Understood, no advice. I can listen. What would you like to share?',
    selected: 'You already chose an option. What would you like to clarify about it?',
    complete: 'You have described the situation, goal and next step. Would you like to clarify anything or finish here?',
  },
  es: {
    situation: ['¿Con qué situación concreta te gustaría empezar?', '¿Puedes compartir un ejemplo de lo que ocurrió?'],
    desired_change: ['¿Qué te gustaría cambiar o conseguir?', 'Si la situación mejorara un poco, ¿qué cambiaría primero?'],
    obstacle: ['¿Qué parece impedírtelo ahora?', '¿En qué momento se vuelve más difícil?'],
    approach: ['¿Qué has probado y qué te ayudó, aunque fuera un poco?', '¿Prefieres explorarlo en conversación o probar una práctica sencilla?'],
    next_step: ['¿Cuál de las opciones que vimos te encaja más?', '¿Cuál sería un siguiente paso cómodo para ti?'],
    unsure: 'No necesitas saberlo ya. ¿Prefieres comprender la situación o pensar en un siguiente paso?',
    skipped: 'Podemos saltarnos esta pregunta. ¿Qué es más importante ahora?',
    noAdvice: 'Entendido, sin consejos. Puedo escucharte. ¿Qué te gustaría contar?',
    selected: 'Ya elegiste una opción. ¿Qué te gustaría aclarar sobre ella?',
    complete: 'Has descrito la situación, la meta y el siguiente paso. ¿Quieres aclarar algo o terminar aquí?',
  },
});
const safeTurn = row => row && (row.role === 'user' || row.role === 'assistant') &&
  typeof row.text === 'string' && row.text.length <= 1200;
function activeTurns(history, current) {
  const turns = (Array.isArray(history) ? history : []).slice(-20).filter(safeTurn);
  // An explicit reset invalidates earlier claims; no assistant-authored facts.
  const lastReset = turns.reduce((idx, row, i) => row.role === 'user' &&
    (STOP.test(normalize(row.text)) || CHANGE.test(normalize(row.text))) ? i : idx, -1);
  return [...turns.slice(lastReset + 1), {role: 'user', text: current}];
}
function observedFacts(turns) {
  const users = turns.filter(row => row.role === 'user').map(row => normalize(row.text));
  // Latest explicit correction wins, rather than keeping a negated old topic.
  let topic = null;
  for (const original of users) {
    const text = original.replace(/^(?:нет[,\s]+|no[,\s]+|en realidad[,\s]+)/u, '');
    const affirmed = text.split(/(?:[,\s]+а\s+(?:про|о)\s+|\s+but\s+(?:about\s+)?|\s+sino\s+(?:sobre|de)\s+)/u).at(-1);
    const found = TOPIC.find(([, rx]) => rx.test(affirmed));
    if (found) topic = found[0];
    else if (CHANGE.test(text)) topic = null;
  }
  const correctionIndex = users.findLastIndex(text => CORRECTION.test(text));
  const all = users.slice(correctionIndex >= 0 ? correctionIndex : 0)
    .filter(text => !STOP.test(text) && !CHANGE.test(text));
  const recent = all.at(-1) || '';
  // A negative statement does not assert an opposite goal or preference.
  const valid = t => !NO_ADVICE.test(t) && !NO_SALES.test(t) &&
    !/^(?:не хочу|не нужно|dont want|do not want|no quiero|no necesito)/u.test(t);
  const personal = t => SELF.test(t) && valid(t);
  const situation = all.some(t => personal(t) && t.length >= 24 && (DETAILS.test(t) ||
    (OBSTACLE.test(t) && t.length >= 37)));
  const goal = all.some(t => personal(t) && GOAL.test(t));
  const obstacle = all.some(t => personal(t) && OBSTACLE.test(t));
  const approach = all.some(t => valid(t) && APPROACH.test(t) &&
    (personal(t) || /^(?:раньше|пробовал|пробовала|помогало|помогает|i tried|it helped|he probado|me ayudo)/u.test(t)));
  const decided = all.some(t => valid(t) && CHOICE.test(t) &&
    (personal(t) || /^(?:выбираю|подходит|начну с|i choose|i decided|elijo|me sirve)/u.test(t)));
  const stageEvidence = [situation, goal, obstacle, approach, decided];
  const completeness = Math.round(100 * stageEvidence.filter(Boolean).length / stageEvidence.length);
  return {topic, situation, goal, obstacle, approach, decided, completeness,
    stageEvidence, lastUser: recent};
}
/**
 * A five-stage FIRST-CONTACT plan. Completion is only a narrow evidence
 * checklist, not a measure of therapy quality or confidence about a person.
 * Pass selectedChoiceId from the verified server session ONLY; never from
 * browser history, assistant assertions or an unsigned client parameter.
 */
export function planWaveMagicDirector({message = '', locale = 'ru', history = [],
  selectedChoiceId = null, psychologistModeConsented = false,
  safety = {status: 'unknown'}} = {}) {
  const language = LANGS.has(locale) ? locale : 'en';
  if (safety?.status !== 'clear' || typeof message !== 'string' ||
      !message.trim() || message.length > 1200 || SAFE.test(message) ||
      /^\//u.test(message)) return null;
  const msg = normalize(message);
  if (STOP.test(msg) || CHANGE.test(msg)) return {route: 'handoff', reason: 'boundary'};
  if (ACTION.test(msg) || DIRECT.test(msg)) return {route: 'handoff', reason: 'trusted_action_or_faq'};
  const turns = activeTurns(history, message);
  const facts = observedFacts(turns);
  const selected = typeof selectedChoiceId === 'string' &&
    /^service:[a-z][a-z0-9_-]{0,50}$/u.test(selectedChoiceId) ? selectedChoiceId : null;
  const adviceEvents = turns.filter(t => t.role === 'user').map(t => normalize(t.text))
    .filter(t => NO_ADVICE.test(t) || RESUME_ADVICE.test(t));
  const noAdvice = adviceEvents.length > 0 && NO_ADVICE.test(adviceEvents.at(-1));
  const intent = SERVICES.test(msg) ? 'service' : noAdvice ? 'listen' :
    psychologistModeConsented === true ? 'psychologist' : 'explore';
  const stageIndex = facts.stageEvidence.findIndex(done => !done);
  const index = stageIndex < 0 ? 4 : stageIndex;
  const stage = WAVE_DIALOGUE_STAGES[index];
  const meta = {version: WAVE_MAGIC_DIRECTOR_VERSION, role: intent === 'psychologist'
      ? 'secretary_psychologist' : intent === 'service' ? 'secretary' : 'coach',
    stage, stageIndex: index, stageCount: WAVE_DIALOGUE_STAGES.length,
    completeness: facts.completeness, selectedChoiceId: selected,
    topic: facts.topic, evidence: facts.stageEvidence,
    source: 'explicit_user_turns_only', noAction: true};
  if (intent === 'listen') return {...meta, route: 'listen', reply: COPY[language].noAdvice};
  if (intent === 'service') return {...meta, route: 'service', reply: null};
  if (facts.completeness === 100) return {...meta, route: 'complete', reply: COPY[language].complete};
  if (selected && /(?:эт(?:от|им) вариант(?:ом)?|об этой услуге|what about (?:it|that)|this service|esta opcion)/iu.test(msg))
    return {...meta, route: 'clarify', reply: COPY[language].selected};
  const oldUsers = turns.slice(0, -1).filter(t => t.role === 'user');
  const eligible = psychologistModeConsented || HELP.test(msg) ||
    oldUsers.some(t => HELP.test(t.text));
  if (!eligible || !(SELF.test(msg) || /^(?:помоги|помогите|help me|ayudame)(?:\s|$)/u.test(msg) ||
    oldUsers.some(t => SELF.test(t.text) || /^(?:помоги|help me|ayudame)/u.test(normalize(t.text)))))
    return {...meta, route: 'abstain', reply: null};
  if (SKIP.test(msg)) return {...meta, route: 'clarify', reply: COPY[language].skipped};
  if (UNSURE.test(msg)) return {...meta, route: 'clarify', reply: COPY[language].unsure};
  const alternatives = COPY[language][stage];
  const lastAssistant = turns.filter(t => t.role === 'assistant').at(-1)?.text || '';
  const reply = alternatives.find(question => !lastAssistant.includes(question));
  if (!reply) return {...meta, route: 'abstain', reply: null};
  return {...meta, route: 'clarify', reply};
}
