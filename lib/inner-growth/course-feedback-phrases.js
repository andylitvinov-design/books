// Deliberately small, local-only phrase matcher. This is not AI, journal
// interpretation, diagnosis or a safety monitor. Never inspect text in the
// background or send drafts/excerpts/hashes to analytics or this preference API.
export const COURSE_FEEDBACK_PHRASE_VERSION = 'hh-course-feedback-phrases-v1'
export const COURSE_FEEDBACK_PHRASE_MAX_LENGTH = 240

const RULES = [
  { id: 'shorter-practice', patch: { length: 'quick' },
    phrases: { en: ['This exercise takes too long', 'This exercise is too long', 'The exercise is too long', 'I want a shorter exercise'], ru: ['Это упражнение занимает слишком много времени', 'Это упражнение слишком долгое', 'Упражнение слишком длинное', 'Хочу более короткое упражнение'] },
    label: { en: 'Use the shorter prepared practice', ru: 'Выбрать короткий подготовленный вариант' } },
  { id: 'simpler-focus', patch: { length: 'quick' },
    phrases: { en: ['It is hard to focus on this exercise', 'I find it hard to concentrate on this exercise'], ru: ['Мне трудно сосредоточиться на этом упражнении', 'Мне трудно удерживать внимание в этом упражнении'] },
    label: { en: 'Try the shorter prepared practice with fewer instructions', ru: 'Попробовать короткий вариант с меньшим числом инструкций' } },
  { id: 'external-attention', patch: { alternativeRequested: true },
    phrases: { en: ['I would like a different exercise format', 'I want another format for this exercise'], ru: ['Хочу другой формат этого упражнения', 'Я хочу попробовать другой формат упражнения'] },
    label: { en: 'Offer the prepared eyes-open practice', ru: 'Предлагать подготовленную практику с открытыми глазами' } },
  { id: 'pause-or-external-attention', patch: { length: 'quick', alternativeRequested: true, stopOffer: true },
    phrases: { en: ['Focusing on breathing in this exercise feels uncomfortable', 'Following my breath in this exercise feels uncomfortable'], ru: ['Мне некомфортно следить за дыханием в этом упражнении', 'Мне некомфортно концентрироваться на дыхании в этом упражнении'] },
    label: { en: 'Offer rest first, with an optional short eyes-open practice', ru: 'Сначала предложить отдых и необязательную короткую практику с открытыми глазами' } },
]

function normalizedWholeDraft(text, locale) {
  if (!['en', 'ru'].includes(locale) || typeof text !== 'string' || text.length > COURSE_FEEDBACK_PHRASE_MAX_LENGTH) return null
  // Normalize only ordinary surrounding/repeated spaces, case and one final
  // full stop. Extra sentences, controls, quotes, mixed scripts, negation and
  // all other wording fail the full-string allowlist rather than being guessed.
  if (/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(text)) return null
  return text.trim().replace(/ +/g, ' ').replace(/\.$/, '').toLocaleLowerCase(locale)
}

export function suggestCourseFeedbackAdjustment(text, locale) {
  const normalized = normalizedWholeDraft(text, locale)
  if (!normalized) return null
  const rule = RULES.find(rule => rule.phrases[locale].some(phrase => normalizedWholeDraft(phrase, locale) === normalized))
  if (!rule) return null
  // Return only static registered metadata, never any part or hash of the note.
  return { id: rule.id, ruleSetVersion: COURSE_FEEDBACK_PHRASE_VERSION, label: rule.label[locale], preferencePatch: { ...rule.patch } }
}

export function courseFeedbackAdjustmentAvailability(suggestion, preferences, lessonVariant = 'standard') {
  if (!suggestion || !preferences || !['standard', 'quick', 'grounding'].includes(lessonVariant)) return 'unavailable'
  // The current library's short option already uses the same eyes-open exercise.
  // A format request must not be presented as a distinct new alternative.
  if (suggestion.id === 'external-attention' && lessonVariant !== 'standard') return 'same-alternative'
  const next = { ...preferences, ...suggestion.preferencePatch }
  return ['length', 'alternativeRequested', 'stopOffer'].every(key => next[key] === preferences[key]) ? 'already-applied' : 'available'
}

export function confirmCourseFeedbackAdjustment({ text, locale, suggestionId, confirmed, preferences, lessonVariant = 'standard' } = {}) {
  if (confirmed !== true || !['quick', 'standard'].includes(preferences?.length) || typeof preferences?.alternativeRequested !== 'boolean' || typeof preferences?.stopOffer !== 'boolean') return null
  const suggestion = suggestCourseFeedbackAdjustment(text, locale)
  if (!suggestion || suggestion.id !== suggestionId || courseFeedbackAdjustmentAvailability(suggestion, preferences, lessonVariant) !== 'available') return null
  // Only existing reversible preference fields leave this module. Never turn
  // a duration/format preference into fabricated difficulty or comfort scores.
  return { length: preferences.length, alternativeRequested: preferences.alternativeRequested, stopOffer: preferences.stopOffer, ...suggestion.preferencePatch }
}
