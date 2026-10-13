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
    const href = `/${locale === 'ru' ? 'ru' : 'en'}/app/course`
    event.waitUntil(self.registration.showNotification('Holistic House', {
      body: copy[locale], icon: '/course-icon/192', tag: 'hh-course-reminder',
      data: { href }, requireInteraction: false,
    }))
  })
  self.addEventListener('notificationclick', event => {
    event.notification.close()
    const requested = event.notification.data?.href
    const href = /^\/(en|ru)\/app\/course$/.test(requested || '') ? requested : '/en/app/course'
    const destination = new URL(href, self.location.origin).href
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
      // Do not navigate away from an in-progress assessment in another tab.
      const existing = clients.find(client => client.url === destination)
      if (existing) return existing.focus()
      return self.clients.openWindow(destination)
    }))
  })
})()
