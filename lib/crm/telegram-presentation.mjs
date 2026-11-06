// The owner-approved Russian Holistic House introduction is published as unlisted.
// Reuse the permanent YouTube video URL, not a short-lived signed HeyGen MP4.
// The public URL contains no recipient, token, consent status or private client data.
export const HOLISTIC_HOUSE_PRESENTATION_VIDEO = 'https://www.youtube.com/watch?v=G0Db6yOCMto'

const titles = Object.freeze({
  ru: '🎬 Holistic House — знакомство с нами (1:37)',
  en: '🎬 Holistic House introduction (Russian audio, 1:37)',
  es: '🎬 Conoce Holistic House (audio en ruso, 1:37)',
})

// Only the public diagnostic Start command can display the film. Other
// deep-link payloads belong to different signed flows and must be untouched.
export function telegramPresentationOnStart(rawText) {
  return /^\/start(?:@[A-Za-z0-9_]{5,32})?(?:\s+hhreview_(?:en|ru|es))?$/i
    .test(String(rawText || '').trim())
}

// The first greeting renders a large video preview ABOVE the message body,
// keeping the consent button(s) on the same message. It is not a Telegram
// native sendVideo upload. Telegram may vary previews across its clients.
export function telegramPresentationMessage(text, locale, show = false) {
  if (!show || !Object.hasOwn(titles, locale))
    return {text, linkPreview: null}
  const withVideo = titles[locale] + '\n' +
    HOLISTIC_HOUSE_PRESENTATION_VIDEO + '\n\n' + text
  if (withVideo.length > 1200) return {text, linkPreview: null}
  return {
    text: withVideo,
    linkPreview: {
      is_disabled: false,
      url: HOLISTIC_HOUSE_PRESENTATION_VIDEO,
      prefer_large_media: true,
      show_above_text: true,
    },
  }
}
