import { approvedTelegramPresentation } from './crm/telegram-presentation.mjs'

// Use stable public identities only, never temporary media download URLs.
// The English 91-second HeyGen master has no verified YouTube mirror; this
// owner-approved My Space placement does not alter home/Telegram publish gates.
const EN_PROFILE_PRESENTATION = Object.freeze({
  youtubeId: '',
  heygenId: '8d998c778af3b563aa63233aa4fb4a06',
  title: 'Holistic House — It Starts With You',
  language: 'en',
  durationSeconds: 91.2457,
})

export function profilePresentationForLocale(locale) {
  if (locale === 'en') return EN_PROFILE_PRESENTATION
  if (locale !== 'ru') return null
  const approved = approvedTelegramPresentation('ru')
  if (!approved?.youtubeId) return null
  return {
    youtubeId: approved.youtubeId,
    title: 'Holistic House — Начните с себя',
    language: 'ru',
    durationSeconds: approved.durationSeconds,
  }
}
