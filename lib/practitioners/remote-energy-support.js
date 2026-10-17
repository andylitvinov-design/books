// The public booking wizard stores only non-sensitive scheduling preferences in
// sessionStorage until the signed-in Cabinet can create an encrypted request.
// Never put the visitor's personal situation or contact information in a URL.
export const REMOTE_SUPPORT_DRAFT_KEY = 'hh:remote-energy-support:draft:v1'
export const REMOTE_SUPPORT_DRAFT_TTL = 24 * 60 * 60 * 1000

export function readRemoteSupportDraft(storage, serviceId, now = Date.now()) {
  try {
    if (!storage || typeof serviceId !== 'string') return null
    const raw = storage.getItem(REMOTE_SUPPORT_DRAFT_KEY)
    if (!raw || raw.length > 3000) return null
    const value = JSON.parse(raw)
    if (!value || value.version !== 1 || value.serviceId !== serviceId) return null
    if (!Number.isSafeInteger(value.savedAt) || now < value.savedAt - 60000 ||
        now - value.savedAt > REMOTE_SUPPORT_DRAFT_TTL) return null
    if (!['asynchronous', 'live'].includes(value.format)) return null
    if (![20, 30, 60].includes(value.duration)) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time)) return null
    const safeText = (str, max = 100) => typeof str === 'string' && str.length <= max && !/[\r\n<>]/.test(str)
    if (!safeText(value.goal) || !safeText(value.method) ||
        !safeText(value.practitioner, 120) || !safeText(value.timezone, 80)) return null
    return value
  } catch {
    return null
  }
}

export function formatRemoteSupportDraft(draft) {
  if (!draft) return ''
  return [
    'Remote energy support — booking request (not confirmed)',
    'Practitioner: ' + draft.practitioner,
    'Focus: ' + draft.goal,
    'Method: ' + draft.method,
    'Format: ' + (draft.format === 'live' ? 'Live online session' : 'Remote support without a video call'),
    'Requested duration: ' + draft.duration + ' minutes',
    'Preferred date/time: ' + draft.date + ' ' + draft.time + ' (' + draft.timezone + ')',
    'Please confirm availability and price before any payment.',
  ].join('\n')
}
