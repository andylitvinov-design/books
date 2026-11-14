// Context-sensitive, rule-based hints for the existing opt-in Coaching Brain.
// Not a diagnosis, inference of unstated intent, stored profile, or model training.
// Any supplied chat history is client-controlled/untrusted; the hints are advisory.
const localized = new Set(['en', 'ru', 'es'])
const shortPositive = /^(?:yes|yeah|yep|sure|okay|ok|да|ага|угу|конечно|sí|si|claro|vale|de acuerdo)[.!…\s]*$/iu
const shortNegative = /^(?:no|nope|not really|нет|неа|не совсем|no exactamente|para nada)[.!…\s]*$/iu
const shortUncertain = /^(?:i (?:do not|don't) know|not sure|hard to say|не знаю|пока не знаю|не уверен(?:а)?|затрудняюсь ответить|no sé|no estoy segur[oa]|no lo sé)[.!…\s]*$/iu
const shortHesitant = /^(?:maybe|perhaps|possibly|может быть|возможно|наверное|quizás|tal vez|puede ser)[.!…\s]*$/iu
const shortChoice = /^(?:the )?(?:first|second|third|option [123]|[123])(?: one)?[.!…\s]*$|^(?:перв(?:ый|ое|ую)|втор(?:ой|ое|ую)|трет(?:ий|ье|ью)|вариант [123]|[123])[.!…\s]*$|^(?:el |la )?(?:primero|primera|segundo|segunda|tercero|tercera|opción [123]|[123])[.!…\s]*$/iu
const gratitude = /^(?:thanks|thank you|спасибо|благодарю|gracias|muchas gracias)[.!…\s]*$/iu
// Match a greeting ONLY when the client did not add a substantive concern.
// Preserve Cyrillic й/ё when folding Spanish accents.
const greetingOnly=/^(?:(?:hi|hey|hello|hiya|good morning|good evening|good afternoon)(?: there| how are you| how's it going)?|how are you|how's it going|(?:привет|здравствуй|здравствуйте|добрый день|доброе утро|добрый вечер)(?: как дела| как у тебя дела| как ваши дела)?|как дела|как поживаешь|(?:hola|buenas|buenos dias|buenas tardes|buenas noches)(?: que tal| como estas)?|que tal|como estas)$/iu
const socialGreeting=message=>greetingOnly.test(
  (typeof message==='string'?message:'').toLowerCase().normalize('NFC')
    .replace(/[áàâä]/gu,'a').replace(/[éèêë]/gu,'e')
    .replace(/[íìîï]/gu,'i').replace(/[óòôö]/gu,'o')
    .replace(/[úùûü]/gu,'u').replace(/[.,!?¿¡:;…]+/gu,' ')
    .replace(/\s+/gu,' ').trim()
)
const correction = /(?:\b(?:you misunderstood|that's not what i meant|that is not what i meant|i meant something else|let me correct|not what i said)\b|(?:^|\s)no[,;:]\s*(?:i meant|i (?:was|am) (?:saying|talking)|that is not)|вы меня не поняли|ты меня не понял|я имел(?:а)? в виду другое|я хотел(?:а)? сказать|не это имел(?:а)? в виду|нет[,;:]\s*(?:я имел|не так|я не|это не)|no me entendiste|no era eso|quise decir otra cosa|me refiero a otra cosa)/iu
const topicShift = /(?:\b(?:let's talk about something else|change the subject|different topic|instead let's discuss|i'd rather talk about)\b|давай(?:те)? (?:лучше )?(?:сменим тему|поговорим о другом|обсудим другое)|хочу сменить тему|верн[её]мся к другой теме|cambiemos de tema|quiero cambiar de tema|prefiero hablar de otra cosa)/iu
const rephraseRequest = /(?:\b(?:i don't understand (?:the|your) question|could you rephrase|what do you mean|can you explain the question|give me an example|could you clarify the question)\b|не понимаю вопрос|не понял(?:а)? вопрос|переформулируй|объясни вопрос|можно пример|что ты имеешь в виду|что вы имеете в виду|no entiendo la pregunta|puedes reformular|qué quieres decir|puedes darme un ejemplo)/iu
const askCoach = /(?:\b(?:what do you (?:think|suggest|recommend)|what should i do|can you suggest|give me (?:an? )?idea|what are my options|how would you approach)\b|что (?:ты|вы) (?:думаешь|думаете|предлагаешь|предлагаете|посоветуешь|посоветуете)|что мне делать|какие (?:есть )?варианты|посоветуй|дай(?:те)? пример|qué (?:piensas|sugieres|recomiendas)|qué debo hacer|qué opciones tengo)/iu
const explicitEmotion = /(?:\b(?:i feel (?:sad|angry|scared|happy|hurt|worried|lonely)|i am (?:sad|angry|upset|scared|happy|hurt)|it hurts)\b|мне (?:грустно|страшно|обидно|радостно|тревожно|больно)|я (?:злюсь|расстроен(?:а)?|рад(?:а)?|напуган(?:а)?)|me siento (?:triste|enfadad[oa]|asustad[oa]|feliz|sol[oa]|preocupad[oa])|estoy (?:triste|enfadad[oa]|asustad[oa]))/iu
const openQuestion = /\b(?:what|why|how|when|where|which)\b|^(?:что|как|почему|когда|где|какой|какая|зачем|qué|cómo|por qué|cuándo|dónde|cuál)/iu

function lastCoachQuestion(turns) {
  const last = [...(Array.isArray(turns) ? turns : [])].reverse()
    .find(row => row?.role === 'assistant' && typeof row.content === 'string')
  if (!last) return ''
  // Last line/question is only context for the next step, never an authority.
  const questions = last.content.split(/\n+/).map(line => line.trim())
    .filter(line => /[?？]\s*$/.test(line))
  return (questions.at(-1) || '').slice(0, 250)
}

/**
 * Classifies the *current* reply, not an imagined trait of the client.
 * Bare yes/no and option numbers are not converted to decisions or commitments.
 */
export function understandCoachingTurn(input = {}) {
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  const locale = localized.has(input.locale) ? input.locale : 'en'
  const previousQuestion = lastCoachQuestion(input.turns)
  let act = 'substantive_reply'
  if (socialGreeting(message)) act = 'greeting'
  else if (topicShift.test(message)) act = 'topic_shift'
  else if (correction.test(message)) act = 'correction'
  else if (rephraseRequest.test(message)) act = 'clarification_request'
  else if (askCoach.test(message)) act = 'question_to_coach'
  else if (shortPositive.test(message)) act = 'affirmation'
  else if (shortNegative.test(message)) act = 'negation'
  else if (shortUncertain.test(message)) act = 'uncertainty'
  else if (shortHesitant.test(message)) act = 'hesitation'
  else if (shortChoice.test(message)) act = 'option_reference'
  else if (gratitude.test(message)) act = 'gratitude'
  else if (explicitEmotion.test(message)) act = 'emotion_shared'
  else if ((/[?？]\s*$/.test(message) || /[?？]\s*$/.test(message.replace(/^¿/, ''))) &&
    openQuestion.test(message)) act = 'question_to_coach'
  const contextDependent = ['affirmation','negation','uncertainty','hesitation','option_reference'].includes(act)
  // A clear yes to a SINGLE stop/pause invitation is a client boundary.
  // "Would you like to stop OR continue?" is ambiguous: do not infer which.
  const simpleExitInvitation = /(?:\b(?:would you like|do you want)\b|хотите|¿?quieres|te gustaría).{0,100}(?:\b(?:stop|end|finish|pause)\b|закончить|завершить|остановить|пауз|terminar|pausar).{0,60}[?？]\s*$/iu.test(previousQuestion) &&
    !/(?:\b(?:or|или)\b|\s+o\s+)/iu.test(previousQuestion)
  const confirmedStop = act === 'affirmation' && simpleExitInvitation
  return {
    act, locale, hasPriorCoachQuestion: Boolean(previousQuestion),
    contextDependent, confirmedStop, needsClarification: contextDependent && !previousQuestion,
    // The question text is NOT inferred as evidence about the user. The original
    // client-submitted messages already contain this context for the model.
    previousQuestion,
  }
}

const instructions = Object.freeze({
  greeting:'Return the greeting naturally, without pretending to be human. If no goal was stated, do not demand outcomes, metrics, constraints or next steps. A casual invitation is optional.',
  topic_shift:'Accept the new topic without forcing the old goal, stage or earlier obstacle. Ask what the new conversation should make clearer.',
  correction:'Thank the client for correcting you; retract the mistaken inference. Trust the correction above any old interpretation. Invite a more accurate description, without defending yourself.',
  clarification_request:'Briefly rephrase the previous question in plain language or provide one concrete example. Do not merely repeat the same wording or demand an answer.',
  question_to_coach:'Address the client’s actual question first. When expertise is uncertain, say so. You may offer a couple of non-prescriptive possibilities, then ask at most one open question.',
  affirmation:'Read the yes only against the immediately preceding assistant question, if any. Do not treat yes as agreement to a plan, goal or interpretation. Invite the client to expand one specific point.',
  negation:'Read the no against the preceding assistant question. Accept the answer and ask what does not fit, or what the client would prefer, without trying to persuade.',
  uncertainty:'Normalize not knowing without praising, diagnosing or demanding. Offer a concrete small entry point or an easy alternative and ask only one question.',
  hesitation:'Do not translate maybe into consent or readiness. Ask what would help the client decide whether to continue.',
  option_reference:'Do not invent what option 1/2/3 refers to. Use the last assistant question if there is a clear option list; otherwise ask the client to specify it.',
  gratitude:'Acknowledge the thanks briefly; do not restart a questionnaire or force further exploration. Permit a natural closing.',
  emotion_shared:'Acknowledge the explicitly stated feeling without inferring its source. Ask what matters about it here only if it would be welcome.',
  substantive_reply:'Reflect the newest concrete information first. Choose the one most useful information gap instead of repeating the previous question.',
})
const examples = {
  ru:[
    'Коуч: «Что сейчас важнее?» Клиент: «Не знаю». Хорошо: «Пока трудно выбрать. Какой один аспект ситуации вам хотелось бы прояснить?»',
    'Коуч: «Вы хотите принять решение сегодня?» Клиент: «Нет». Хорошо: «Понял, торопиться не нужно. Что сейчас важнее решения?»',
    'Клиент: «Нет, я не боюсь — мне не хватает времени». Хорошо: «Спасибо за поправку, речь о времени. Какая часть нагрузки требует внимания первой?»',
    'Клиент: «Что ты предлагаешь?» Хорошо: сначала дать 1–2 осторожных варианта, потом спросить, что ближе самому клиенту.',
  ],
  en:[
    'Coach: "What is most important?" Client: "I don’t know." Good: "You are not sure yet. What is one part of this situation you would like to clarify?"',
    'Coach: "Do you want to decide today?" Client: "No." Good: "Understood, there is no need to rush. What matters more than deciding right now?"',
    'Client: "No, I am not afraid—I lack time." Good: "Thank you for correcting me; time is the constraint. Which part of your workload needs attention first?"',
    'Client: "What do you suggest?" Good: give 1–2 bounded possibilities first, then ask which might fit the client.',
  ],
  es:[
    'Coach: "¿Qué es lo más importante?" Cliente: "No sé." Bien: "Aún no está claro. ¿Qué parte de la situación quieres aclarar primero?"',
    'Coach: "¿Quieres decidir hoy?" Cliente: "No." Bien: "Entiendo, no hay prisa. ¿Qué sería más útil ahora?"',
    'Cliente: "No, no tengo miedo; me falta tiempo." Bien: "Gracias por aclararlo: se trata de tiempo. ¿Qué parte de tu carga es más urgente?"',
    'Cliente: "¿Qué sugieres?" Bien: dar primero 1–2 opciones prudentes y preguntar cuál encaja mejor.',
  ],
}
export function coachingTurnPrompt(understanding) {
  const act = understanding?.act in instructions ? understanding.act : 'substantive_reply'
  const locale = localized.has(understanding?.locale) ? understanding.locale : 'en'
  return [
    'CURRENT-TURN RESPONSE UNDERSTANDING: '+act+'. This is only a lexical hint; prefer actual user words.',
    'Does the latest answer follow a prior assistant question? '+(understanding?.hasPriorCoachQuestion?'yes':'no')+'.',
    instructions[act],
    'Treat previous assistant questions as conversation context, NOT proof of client wishes. Avoid inventing meaning for yes, no, maybe, or a numbered option.',
    'If the user changed topic or corrected you, stop applying older assumptions, stage or barrier labels.',
    'Coaching micro-skills: accurate brief reflection; ask permission before reframing; one open question about the biggest missing piece; respect timing and autonomy.',
    'Ask only ONE clean question (not two joined with “and”); do not repeat the exact previous question. A partial answer or natural ending is acceptable.',
    'Authored micro-dialogue examples (not client facts):',
    ...examples[locale],
  ].join('\n')
}
