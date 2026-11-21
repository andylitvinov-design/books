import { createHash } from 'node:crypto'

export const coachContextRecipients = Object.freeze(['groq', 'gemini_free', 'gemini_paid', 'openrouter'])

export function coachContextPolicy(provider, env) {
  if (!coachContextRecipients.includes(provider)) return null
  const prefix = 'HH_COACH_CONTEXT_' + provider.toUpperCase()
  const label = env[prefix + '_POLICY']?.trim()
  if (!label || label.length > 40) return null

  const notices = {}
  for (const locale of ['en', 'ru', 'es']) {
    const notice = env[prefix + '_NOTICE_' + locale.toUpperCase()]?.trim()
    if (!notice || notice.length > 1200) return null
    notices[locale] = notice
  }
  const digest = createHash('sha256').update(JSON.stringify(notices)).digest('hex').slice(0, 32)
  return { version: label + ':' + digest, label, notices }
}
