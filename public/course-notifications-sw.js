/* Course push handler. Deliberately no personal content, fetches or caching. */
(() => {
  const copy = {
    en: 'Your optional course reminder. Open Holistic House when it suits you.',
    ru: 'Ваше необязательное напоминание о курсе. Откройте Holistic House в удобное время.',
    es: 'Tu recordatorio opcional del curso. Abre Holistic House cuando te venga bien.',
  }
  self.addEventListener('push', event => {
    let payload
    try { payload = event.data?.json() } catch { payload = null }
    const locale = ['en', 'ru', 'es'].includes(payload?.locale) ? payload.locale : 'en'
    // Never render a supplied title, body, result, diagnosis, URL or record identifier.
    const message = payload?.kind === 'client-message'
    const requestId = payload?.requestId
    if (message && (typeof requestId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))) return
    const href = message
      ? `/${locale === 'ru' ? 'ru' : 'en'}/app/consultations?request=${requestId.toLowerCase()}`
      : `/${locale === 'ru' ? 'ru' : 'en'}/app/course`
    event.waitUntil(self.registration.showNotification('Holistic House', {
      body: message
        ? (locale === 'ru' ? 'Вам новое личное сообщение. Нажмите, чтобы прочитать его в кабинете.' :
          locale === 'es' ? 'Tienes un mensaje privado nuevo. Abre Holistic House para leerlo.' :
          'You have a new private message. Open your cabinet to read it.')
        : copy[locale], icon: '/icons/holistic-house-teal.svg', badge: '/icons/holistic-house-teal.svg',
      renotify: false, tag: message ? 'hh-client-message-' + requestId.toLowerCase() : 'hh-course-reminder',
      data: { href }, requireInteraction: false,
    }))
  })
  self.addEventListener('notificationclick', event => {
    event.notification.close()
    const requested = event.notification.data?.href
    const href = /^\/(en|ru)\/app\/course$/.test(requested || '') ||
      /^\/(en|ru)\/app\/consultations\?request=[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requested || '')
      ? requested : '/en/app/course'
    const destination = new URL(href, self.location.origin).href
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
      // Do not navigate away from an in-progress assessment in another tab.
      const existing = clients.find(client => client.url === destination)
      if (existing) return existing.focus()
      return self.clients.openWindow(destination)
    }))
  })
})()
