// Notification content is intentionally fixed: never show private test/health data.
const hosts = new Set(['web.push.apple.com','fcm.googleapis.com','fcm-xm.googleapis.com',
 'updates.push.services.mozilla.com','push.services.mozilla.com'])
export function trustedPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false
  try { const u = new URL(endpoint)
    return u.protocol === 'https:' && !u.username && !u.password && !u.hash &&
      (hosts.has(u.hostname) || u.hostname.endsWith('.push.apple.com') ||
       u.hostname.endsWith('.notify.windows.com'))
  } catch { return false }
}
function validKey(s,n) {
  if (typeof s !== 'string' || !/^[\w-]+={0,2}$/.test(s) || s.length>140) return false
  return Buffer.from(s,'base64url').length===n
}
export function validatePushSubscription(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s) ||
      !trustedPushEndpoint(s.endpoint) || !s.keys ||
      !validKey(s.keys.p256dh,65) || !validKey(s.keys.auth,16) ||
      Buffer.from(s.keys.p256dh,'base64url')[0]!==4)
    throw new Error('INVALID_PUSH_SUBSCRIPTION')
  return {endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth}
}
export function validPushTimezone(s) {
  if (typeof s!=='string'||s.length>90) return false
  try {return Boolean(new Intl.DateTimeFormat('en',{timeZone:s}).resolvedOptions().timeZone)}
  catch {return false}
}
export function coursePushPayload(locale='en') {
  const ru=locale==='ru'
  return {locale:ru?'ru':'en',tag:'hh-course-reminder',
    path:ru?'/ru/app/course':'/en/app/course',
    title:ru?'Holistic House · Мой курс':'Holistic House · My course',
    body:ru?'Небольшая практика на сегодня ждёт вас. 5–12 минут в удобном ритме.':
      'Your gentle daily practice is ready. Take 5–12 minutes when it suits you.'}
}

/** An arrival notice carries no confidential sender, message or clinical text. */
export function masterMessagePushPayload(locale='en',requestId) {
  return {...clientMessagePushPayload(locale,requestId),kind:'master-message'}
}
export function clientMessagePushPayload(locale='en',requestId) {
  if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
    throw new Error('INVALID_MESSAGE_REQUEST')
  return {kind:'client-message',locale:locale==='ru'?'ru':'en',requestId:requestId.toLowerCase()}
}
