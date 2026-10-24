// The existing guest test plan remains the sole source of completion truth.
// This helper only turns its server-verified counts into presentation metrics.
export function guestTestJourneyMetrics(plan, { answeredCount = 0, questionCount = 0, phase = 'questions' } = {}) {
  const total = Math.max(1, Math.min(12, Array.isArray(plan?.definitionIds) ? plan.definitionIds.length : 1))
  const actualCompleted = Array.isArray(plan?.completedRunIds)
    ? plan.completedRunIds.length
    : Number.isInteger(plan?.currentIndex) ? plan.currentIndex : 0
  const completed = phase === 'summary' || plan?.status === 'completed'
    ? total
    : plan ? Math.min(total, Math.max(0, actualCompleted))
      : phase === 'result' ? 1 : 0
  const questions = Math.max(0, Number(questionCount) || 0)
  const answered = Math.min(questions, Math.max(0, Number(answeredCount) || 0))
  const partial = phase === 'questions' && completed < total && questions
    ? answered / questions : 0
  const percent = Math.max(0, Math.min(100, Math.round(100 * (completed + partial) / total)))
  const position = completed >= total || phase === 'result'
    ? Math.max(0, completed - 1) : completed
  return Object.freeze({ total, completed, position, percent })
}
