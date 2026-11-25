// Channel-neutral presentation helpers. Server-verified versions, saved answers and
// scoring always remain authoritative; this module never interprets a score.
export const CHAT_TEST_LOCALES = Object.freeze(['en', 'ru', 'es'])

export function chatAnswerOptions(definition, question) {
  if (!definition || !question) return []
  const min = question.min ?? definition.answerScale?.min
  const max = question.max ?? definition.answerScale?.max
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max || max - min > 100) return []
  const anchors = question.responseAnchors || definition.responseAnchors
  return Array.from({ length: max - min + 1 }, (_, offset) => ({
    value: min + offset,
    label: Array.isArray(anchors) && typeof anchors[offset] === 'string'
      ? anchors[offset] : String(min + offset),
  }))
}

export function chatProgress(definition, run) {
  const questions = definition?.questions || []
  const answers = run?.answers || {}
  const saved = Math.max(0, Math.min(questions.length, Number(run?.progress) || 0))
  const firstMissing = questions.findIndex(item => !Object.prototype.hasOwnProperty.call(answers, item.id))
  // An older or interrupted run may have a stale progress cursor. Never skip
  // unanswered questions or reinterpret a stored answer as a completed item.
  const index = firstMissing < 0 ? saved : Math.min(saved, firstMissing)
  return {
    index,
    answeredCount: questions.filter(q => Object.prototype.hasOwnProperty.call(answers, q.id)).length,
    total: questions.length,
    complete: questions.length > 0 && firstMissing < 0 && saved >= questions.length,
  }
}

export function chatPermittedOptions(definition, question, answers = {}) {
  const options = chatAnswerOptions(definition, question)
  // CDC HRQOL-4: when both unhealthy-day counts are 0 the activity-limit
  // count must also be 0. Mirror the existing guest runner guidance.
  if (definition?.key === 'cdc-hrqol-4' && question?.id === 'hrqol4.04'
      && answers['hrqol4.02'] === 0 && answers['hrqol4.03'] === 0)
    return options.filter(item => item.value === 0)
  return options
}

export function chatAnswerLabel(definition, question, value) {
  const found = chatAnswerOptions(definition, question).find(option => option.value === value)
  return found ? found.label : ''
}

export function chatChoosePayload(definition, run, value, operationId) {
  const { index, total, complete } = chatProgress(definition, run)
  if (complete || index >= total) throw Error('CHAT_TEST_COMPLETED')
  const question = definition.questions[index]
  const options = chatPermittedOptions(definition, question, run.answers || {})
  if (!options.some(option => option.value === value)) throw Error('CHAT_INVALID_OPTION')
  if (typeof operationId !== 'string' || operationId.length < 8) throw Error('CHAT_INVALID_OPERATION')
  return {
    answers: { [question.id]: value },
    context: run.context || {},
    progress: index + 1,
    expectedRevision: run.revision,
    operationId,
  }
}
