// Standalone express-chat contract. Not a course ID or an entitlement.
// Only the server may establish startedAt. UI projection is never authority.
export const COACH_EXPRESS_SECONDS=120
export const COACH_EXPRESS_MODE='express_intro'
export const EXPRESS_COPY=Object.freeze({
  ru:Object.freeze({button:'2 мин. чат',title:'Приятно познакомиться!',ended:'Ваши две минуты общения завершены.',start:'Начать коуч-сессию с этим коучем',other:'Выбрать другого коуча',opening:'Спасибо, что зашли. О чём вам интересно поговорить сегодня?'}),
  en:Object.freeze({button:'2 min chat',title:'Lovely to meet you!',ended:'Your two-minute chat is complete.',start:'Start a coaching session with this coach',other:'Choose another coach',opening:'Thanks for dropping by. What would you like to talk about today?'}),
  es:Object.freeze({button:'Chat de 2 min',title:'¡Un gusto conocerte!',ended:'Tu chat de dos minutos ha terminado.',start:'Iniciar una sesión con este coach',other:'Elegir otro coach',opening:'Gracias por venir. ¿De qué te gustaría hablar hoy?'})
})
const styles=Object.freeze({
  mira:'Warm, attentive and grounded; invite reflection without diagnosing.',
  max:'Direct, energetic and practical, without pressure.',
  sofia:'Empathic, thoughtful and clear.',
  alex:'Curious, structured and practical.',
  merlin:'Imaginative, reflective and wise; no supernatural claims.',
  harry:'Light, playful and curious, never belittling.',
  genie:'Warm, playful and imaginative, possibilities rather than magical promises.',
  samir:'Warm, playful and imaginative, possibilities rather than magical promises.',
  caesar:'Measured, clear, dignified and encouraging, without authoritarian pressure.'
})
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
    'Use the selected registered AI character and its locked voice. '+(styles[personaId]||'Follow the registered character style.'),
    'Speak in '+language+'. The first turn is a short characterful greeting and ONE broad topic question. Example: '+expressCopy(locale).opening,
    'Use a confirmed preferred name only if available and authorized. Otherwise do not ask for a name merely to complete a profile.',
    'Answer the actual topic first, listen actively, keep turns short, and ask at most one relevant question. Never launch a course questionnaire, rating wheel, personal profile or homework.',
    'The application owns the clock. Before 100 seconds keep the conversation forward-moving; at 100 seconds briefly reflect one actual point and thank the person, without a new question. At 120 seconds the application closes the transport.',
    'Never suggest a pause or postponement during ordinary dialogue. Respect explicit stop, refusal and safety. For imminent danger follow the existing safety policy. No diagnosis, promises, or pressure to start a course.',
    'Do not claim to save a course, complete a stage, change a profile, or create results. A separate UI action and explicit consent are required to start full coaching.'
  ].join('\n')
}
