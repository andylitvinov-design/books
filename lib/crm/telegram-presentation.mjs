// A pure, exact-publication allowlist. A private HeyGen preview, signed download,
// language mismatch, or arbitrary environment value must never become Telegram
// welcome media. This RU film is already owner-approved and unlisted on YouTube.
export const HOLISTIC_HOUSE_PRESENTATION_VIDEO = 'https://www.youtube.com/watch?v=G0Db6yOCMto'

export const APPROVED_HOLISTIC_HOUSE_PRESENTATIONS = Object.freeze({
  ru: Object.freeze({
    locale: 'ru',
    youtubeId: 'G0Db6yOCMto',
    url: HOLISTIC_HOUSE_PRESENTATION_VIDEO,
    durationSeconds: 96.862,
    title: '🎬 Holistic House — знакомство с нами (1:37)',
  }),
  // The 91-second English HeyGen film is a PRIVATE REVIEW, not a published
  // stable, QA-approved YouTube master. No corresponding approved ES movie.
  // Future activation requires a reviewed source change, never an env override.
  en: null,
  es: null,
})

export function approvedTelegramPresentation(locale) {
  return Object.hasOwn(APPROVED_HOLISTIC_HOUSE_PRESENTATIONS,locale)
    ? APPROVED_HOLISTIC_HOUSE_PRESENTATIONS[locale] : null
}

// Only a signed, first eligible /start or approved hhreview_{locale} command
// may cause a public preview. Other deep links, STOP and diagnostic callbacks
// are left with the existing CRM flow, including deduplication and consent.
export function telegramPresentationOnStart(rawText) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?(?:\s+hhreview_(?:en|ru|es))?$/i
    .test(String(rawText || '').trim())
}

// Telegram sends the preview ABOVE the existing text and buttons. It is a
// public YouTube link preview (not a native uploaded MP4, view or play receipt).
export function telegramPresentationMessage(text, locale, show = false) {
  const movie=show ? approvedTelegramPresentation(locale) : null
  if (!movie) return {text,linkPreview:null}
  const withVideo=movie.title+'\n'+movie.url+'\n\n'+text
  if(withVideo.length>1200)return {text,linkPreview:null}
  return {
    text:withVideo,
    linkPreview:{
      is_disabled:false,
      url:movie.url,
      prefer_large_media:true,
      show_above_text:true,
    },
  }
}
