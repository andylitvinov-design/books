// Shared, browser-safe SMS composition and carrier segment estimate.
// Counts GSM-7 extension characters as two septets; Unicode is UCS-2.
export const SMS_PREFIX = 'Holistic House: '
export const SMS_FOOTER = '\nInfo: https://holistichouse.vercel.app\nReply STOP to unsubscribe.'
const GSM_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM_EXTENDED = '^{}\\[~]|€'
export const SMS_MAX_SEGMENTS = 4

export function smsSegments(value) {
  let units = 0
  let gsm = true
  for (const char of value) {
    if (GSM_BASIC.includes(char)) units += 1
    else if (GSM_EXTENDED.includes(char)) units += 2
    else { gsm = false; break }
  }
  if (!gsm) {
    units = 0
    for (const char of value) units += char.codePointAt(0) > 0xffff ? 2 : 1
  }
  return {
    encoding: gsm ? 'GSM-7' : 'UCS-2',
    segments: units <= (gsm ? 160 : 70) ? 1 : Math.ceil(units / (gsm ? 153 : 67)),
  }
}
export function formatSmsText(message) {
  return SMS_PREFIX + message + SMS_FOOTER
}
export function smsMessageEstimate(body) {
  const formatted = formatSmsText(String(body || '').trim())
  const result = smsSegments(formatted)
  return { ...result, valid: result.segments <= SMS_MAX_SEGMENTS,
    totalLength: [...formatted].length }
}
