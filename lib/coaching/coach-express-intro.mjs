// Standalone express-chat contract. Not a course ID or an entitlement.
// Only the server may establish startedAt. UI projection is never authority.
export const COACH_EXPRESS_SECONDS=120
export const COACH_EXPRESS_MODE='express_intro'
export const EXPRESS_COPY=Object.freeze({
  ru:Object.freeze({button:'Free chat: 2 min.',title:'Приятно познакомиться!',ended:'Ваши две минуты общения завершены.',start:'Начать коуч-сессию с этим коучем',other:'Выбрать другого коуча',opening:'Спасибо, что зашли. О чём вам интересно поговорить сегодня?'}),
  en:Object.freeze({button:'Free chat: 2 min.',title:'Lovely to meet you!',ended:'Your two-minute chat is complete.',start:'Start a coaching session with this coach',other:'Choose another coach',opening:'Thanks for dropping by. What would you like to talk about today?'}),
  es:Object.freeze({button:'Free chat: 2 min.',title:'¡Un gusto conocerte!',ended:'Tu chat de dos minutos ha terminado.',start:'Iniciar una sesión con este coach',other:'Elegir otro coach',opening:'Gracias por venir. ¿De qué te gustaría hablar hoy?'})
})
const profiles=Object.freeze({
  "mira": {
    "style": "Warm, grounded, attentive; gently notice the resource or what could make the situation lighter. Never infer hidden emotions.",
    "ru": "Мне здесь важна одна вещь: где у вас уже есть опора?",
    "en": "One thing matters to me here: where is there already some solid ground?",
    "es": "Me importa algo aquí: ¿dónde hay ya un punto de apoyo?"
  },
  "max": {
    "style": "Energetic, candid, action-oriented; name a concrete lever or trade-off, then ask one practical question. Never command.",
    "ru": "Я бы искал точку, где можно реально сдвинуть дело.",
    "en": "I'd look for the lever that can actually move this forward.",
    "es": "Buscaría la palanca que realmente puede mover esto."
  },
  "sofia": {
    "style": "Warm, nuanced, relational; notice the human impact or need without assuming feelings; distinguish perspective from fact.",
    "ru": "Мне хочется посмотреть на человеческую сторону этого.",
    "en": "I'd like to look at the human side of this.",
    "es": "Me gustaría mirar el lado humano de esto."
  },
  "alex": {
    "style": "Analytical, curious, structured; distinguish facts, assumptions and choices, offer a useful criterion.",
    "ru": "Я бы сначала отделил факты от предположений.",
    "en": "I'd first separate the facts from the assumptions.",
    "es": "Primero separaría los hechos de las suposiciones."
  },
  "merlin": {
    "style": "Reflective, imaginative, wise; use one brief grounded metaphor to illuminate a perspective, no mystical factual claims.",
    "ru": "Иногда полезнее посмотреть на карту, чем искать ответ наугад.",
    "en": "Sometimes the map matters more than guessing the answer.",
    "es": "A veces vale más mirar el mapa que adivinar la respuesta."
  },
  "harry": {
    "style": "Playful, lively, curious; use gentle situational humor or an imaginative reframe, never joke about suffering.",
    "ru": "А что, если здесь есть ход, который мы пока не заметили?",
    "en": "What if there's a move we haven't spotted yet?",
    "es": "¿Y si hay una jugada que aún no hemos visto?"
  },
  "genie": {
    "style": "Warm, theatrical and playful; offer an unexpected possibility or a light what-if, no magical promises.",
    "ru": "Хм, интересный поворот! Какую возможность мы ещё не рассмотрели?",
    "en": "Hmm, an interesting twist! What possibility haven't we considered?",
    "es": "¡Mmm, qué giro interesante! ¿Qué posibilidad no hemos considerado?"
  },
  "caesar": {
    "style": "Measured, dignified, strategic; assess priorities, costs and what is under control; never authoritarian.",
    "ru": "Я бы начал с того, что действительно в вашей власти.",
    "en": "I'd start with what is genuinely within your control.",
    "es": "Empezaría por lo que realmente está bajo tu control."
  }
})
export function expressPersona(personaId){return profiles[personaId==='samir'?'genie':personaId]||null}
export function expressCopy(locale){return EXPRESS_COPY[locale]||EXPRESS_COPY.en}
export function expressClock(startedAt,now){
  if(!Number.isSafeInteger(startedAt)||startedAt<0||!Number.isSafeInteger(now)||now<startedAt)throw Error('EXPRESS_CLOCK_INVALID')
  const elapsedMs=Math.min(COACH_EXPRESS_SECONDS*1000,now-startedAt)
  const remainingMs=COACH_EXPRESS_SECONDS*1000-elapsedMs
  return {elapsedMs,remainingMs,remainingSeconds:Math.ceil(remainingMs/1000),
    phase:remainingMs===0?'ended':elapsedMs>=100000?'closing':elapsedMs>=45000?'dialogue':elapsedMs>=15000?'contact':'opening',
    mayOpenNewQuestion:elapsedMs<100000,mayTransport:remainingMs>0}
}
// Compose AFTER the registered persona and approved voice instructions, not
// after the mandatory full-course opening or session Director instructions.
export function expressInstruction(personaId,locale){
  const language={en:'English',ru:'Russian',es:'Spanish'}[locale]
  if(!language||typeof personaId!=='string'||!personaId)throw Error('EXPRESS_INPUT_INVALID')
  return [
    'EXPRESS INTRO CHAT ONLY. This is not a coaching course, therapy, assessment, or intake.',
    'Use the selected registered AI character and its locked voice. '+(expressPersona(personaId)?.style||'Follow the registered character style.'),
    'Character signature example (adapt naturally to the actual subject, never recite mechanically): '+(expressPersona(personaId)?.[locale]||expressCopy(locale).opening),
    'Speak in '+language+'. The first turn is a short characterful greeting and ONE broad topic question. Example: '+expressCopy(locale).opening,
    'Use a confirmed preferred name only if available and authorized. Otherwise do not ask for a name merely to complete a profile.',
    'First substantive reply: immediately give a distinctive, topic-specific character reaction AND a brief reason or useful perspective, then at most one relevant question. Do not merely echo the person or say generic praise. Assess the situation, trade-off, idea or options, not the worth of the person. Mark opinions and uncertainty; do not invent facts or diagnose.',
    'For any general nonpersonal topic the client chooses, answer the actual question first, then add your character lens. If a subject is unfamiliar or requires current verification, say so briefly; do not pretend to know. If asked for personal, sensitive or confidential details, redirect to a nonpersonal example. Never ask for intimate history.',
    'Opening 0–15s: one short distinctive greeting and broad question. First contact 15–45s: respond to the chosen topic with an individual stance. Dialogue 45–100s: offer one useful perspective, practical idea or reframing in your own style and one follow-up where useful. Closing 100–120s: brief actual takeaway and thanks, no new topic. Timing is approximate; never force a stage over the human answer.',
    'Keep each spoken turn short, natural and varied, generally 12–28 words. Do not repeat the same catchphrase, give a lecture, sell a course, or launch a questionnaire, rating wheel, personal profile or homework.',
    'The application owns the clock. Before 100 seconds keep the conversation forward-moving; at 100 seconds briefly reflect one actual point and thank the person, without a new question. At 120 seconds the application closes the transport.',
    'Never suggest a pause or postponement during ordinary dialogue. Respect explicit stop, refusal and safety. For imminent danger follow the existing safety policy. No diagnosis, promises, or pressure to start a course.',
    'Do not claim to save a course, complete a stage, change a profile, or create results. A separate UI action and explicit consent are required to start full coaching.'
  ].join('\n')
}
