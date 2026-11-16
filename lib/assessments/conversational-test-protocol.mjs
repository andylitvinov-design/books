// Deterministic, channel-neutral conversation routing. It never rewrites
// assessment questions, supplies scores, or turns free text into a saved answer.
import { chatPermittedOptions, chatProgress } from './test-chat-flow.mjs'

const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase()
  .trim().replace(/[.!?¿¡]+$/gu, '').replace(/\s+/gu, ' ')

const COMMANDS = Object.freeze({
  previous: /^(?:назад|предыдущий вопрос|исправить ответ|back|previous|previous question|atrás|anterior|pregunta anterior)$/u,
  repeat: /^(?:повтори|повторить|повтори вопрос|repeat|repeat question|repite|repetir)$/u,
  explain: /^(?:поясни|объясни|что это значит|не понимаю вопрос|explain|what does it mean|i don't understand|explica|qué significa|no entiendo)$/u,
  pause: /^(?:пауза|приостановить тест|продолжить позже|pause|pause test|later|pausa|seguir más tarde)$/u,
  resume: /^(?:продолжить|возобновить тест|resume|continue|resume test|continuar|reanudar)$/u,
  cancel: /^(?:отменить тест|прекратить тест|cancel test|discard test|cancelar prueba|abandonar prueba)$/u,
  finish: /^(?:показать результат|завершить тест|view result|finish test|ver resultado|terminar prueba)$/u,
})

export function testControlFromText(raw) {
  const value = normalize(raw)
  if (!value || value.length > 80) return null
  return Object.keys(COMMANDS).find(key => COMMANDS[key].test(value)) || null
}

const UNSAFE = /(?:суицид|покончи.*собой|не хочу жить|хочу умереть|самоповрежд|suicid|self.harm|kill myself|quitarme la vida|hacerme daño)/u
const ASSESSMENT = /(?:\btest\b|\bquiz\b|\bquestionnaire\b|\bassessment\b|тест|опросник|провери(?:ть|м)|проверка состояния|cuestionario|prueba|evaluaci[oó]n)/u
const STATE = /(?:тревог|устал|устаю|усталость|стресс|напряжен|напряжён|выгор|мало сил|нет сил|\banxio|\bstress|\btired|\bfatig|\bburnout|\boverwhelm|ansiedad|estr[eé]s|cansad|agotad)/u
const PERSONALITY = /(?:личност|характер|темперамент|тип личности|personality|personalidad|car[aá]cter|traits)/u

// Propose only; the existing rights/age-gated registry must verify the key.
export function testOfferFromText(raw) {
  const value = normalize(raw)
  if (value.length < 3 || value.length > 500 || UNSAFE.test(value)) return null
  const explicit = ASSESSMENT.test(value)
  const state = STATE.test(value)
  const personality = PERSONALITY.test(value)
  if (!explicit && !state) return null
  return Object.freeze({
    kind:'test_offer', topic:personality ? 'personality' : state ? 'state' : 'general',
    requested:explicit,
  })
}

// Device dictation and typed text produce a proposal, not a saved response.
export function proposedTestAnswer(definition, question, answers, transcript) {
  const text = normalize(transcript)
  if (!text || text.length > 120) return null
  const choices = chatPermittedOptions(definition, question, answers)
  const matched = choices.filter(option => normalize(option.label) === text || String(option.value) === text)
  const unique = [...new Set(matched.map(item => item.value))]
  return unique.length === 1 ? choices.find(item => item.value === unique[0]) : null
}

// A corrected previous answer invalidates subsequent answers (and dependencies),
// using existing server-validated null tombstones; original scores are unchanged.
export function previousTestAnswerPayload(definition, run, operationId) {
  const state = chatProgress(definition, run)
  if (!run || state.index < 1 || !Array.isArray(definition?.questions)) throw Error('CHAT_NO_PREVIOUS_ANSWER')
  if (typeof operationId !== 'string' || operationId.length < 8) throw Error('CHAT_INVALID_OPERATION')
  return {
    answers: Object.fromEntries(definition.questions.slice(state.index - 1).map(q => [q.id, null])),
    context: run.context || {}, progress: state.index - 1,
    expectedRevision: run.revision, operationId,
  }
}
