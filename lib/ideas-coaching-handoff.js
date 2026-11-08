// An in-memory, one-use handoff between two client-side routes.
// No query strings, cookies, local/session storage, network requests or tracking.
// Reloads and opening a different tab intentionally lose this value.
let pendingQuestion = ''
export function stageIdeasCoachingQuestion(value) {
  pendingQuestion = typeof value === 'string' ? value.trim().slice(0, 500) : ''
}
export function takeIdeasCoachingQuestion() {
  const question = pendingQuestion
  pendingQuestion = ''
  return question
}
