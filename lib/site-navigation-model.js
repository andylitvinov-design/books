// Shared public destinations. No private identifiers or account state belongs here.
export const navigationCopy = {
  en: { home: 'Home', tests: 'Tests', library: 'Library', books: 'Ideas', house: 'Cabinet', services: 'Services', energy: 'Energy', love: 'Love', events: 'Events', business: 'Business', relationships: 'Love & intimacy', academy: 'Academy', about: 'About', courses: 'My courses', cabinet: 'My tests', navigation: 'Primary navigation', mobile: 'Mobile navigation', language: 'Interface language' },
  ru: { home: 'Главная', tests: 'Тесты', library: 'Библиотека', books: 'Идеи', house: 'Кабинет', services: 'Услуги', energy: 'Энергия', love: 'Любовь', events: 'События', business: 'Бизнес', relationships: 'Любовь и близость', academy: 'Академия', about: 'Обо мне', courses: 'Мои курсы', cabinet: 'Мои тесты', navigation: 'Основная навигация', mobile: 'Мобильная навигация', language: 'Язык интерфейса' },
  es: { home: 'Inicio', tests: 'Tests', library: 'Biblioteca', books: 'Ideas', house: 'Gabinete', services: 'Servicios', energy: 'Energía', love: 'Amor', events: 'Eventos', business: 'Negocios', relationships: 'Amor e intimidad', academy: 'Academia', about: 'Sobre mí', courses: 'Mis cursos', cabinet: 'Mis pruebas', navigation: 'Navegación principal', mobile: 'Navegación móvil', language: 'Idioma de la página' },
}
export const primaryNavigationIds = ['home', 'library', 'services', 'events', 'relationships', 'academy', 'courses', 'cabinet']
export function getSiteNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  return primaryNavigationIds.map(id => ({
    id, label: text[id],
    href: id === 'home' ? (selected === 'en' ? '/' : `/${selected}`)
      : `/${selected}/${id === 'cabinet' ? 'client' : id}`,
    external: false,
    ariaLabel: text[id],
  }))
}
// The bottom bar and the first six entries of the expanded menu MUST share
// exactly this order, labels and destinations in all three public languages.
export const compactNavigationIds = ['home', 'energy', 'love', 'business', 'tests', 'books']
export function getCompactNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  const publicLinks = new Map(getSiteNavigation(selected).map(item => [item.id, item]))
  return compactNavigationIds.map(id => {
    if (id === 'energy') return { id, href: `/${selected}/explore/energy`, label: text[id], ariaLabel: text[id], external: false }
    if (id === 'love') return { id, href: `/${selected}/explore/love`, label: text[id], ariaLabel: text[id], external: false }
    // Business is a public topic journey promoted to the compact bar, not a duplicate primary-menu entry.
    if (id === 'business') return { id, href: `/${selected}/explore/business`, label: text[id], ariaLabel: text[id], external: false }
    if (id === 'books') return { id, href: `/${selected}/books`, label: text.books, ariaLabel: text.books, external: false }
    if (id === 'tests') return { id, href: `/${selected}/client/tests`, label: text.tests, ariaLabel: text.tests, external: false }
    return publicLinks.get(id)
  })
}
export function activeCompactNavigationId(pathname) {
  if (/^\/(?:en|ru|es)\/client(?:\/|$)/.test(pathname || '')) return 'tests'
  const active = activeNavigationId(pathname)
  return active === 'library' ? 'books' : active === 'relationships' ? 'love' : active
}

export function activeNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/' || /^\/(en|ru|es)$/.test(path)) return 'home'
  if (/^\/(?:en|ru|es)\/(library|books|homeopathy)(?:\/|$)/.test(path) || /^\/books(?:\/|$)/.test(path)) return 'library'
  if (/^\/(en|ru|es)\/(?:relationships|explore\/relationships)(?:\/|$)/.test(path)) return 'relationships'
  if (/^\/(en|ru|es)\/explore\/energy(?:\/|$)/.test(path)) return 'energy'
  if (/^\/(en|ru|es)\/explore\/love(?:\/|$)/.test(path)) return 'love'
  if (/^\/(en|ru|es)\/explore\/business(?:\/|$)/.test(path)) return 'business'
  if (/^\/(en|ru|es)\/academy(?:\/|$)/.test(path)) return 'academy'
  if (/^\/(en|ru|es)\/client(?:\/|$)/.test(path) || /^\/(en|ru)\/app(?:\/|$)/.test(path)) return 'cabinet'
  if (/^\/(en|ru|es)\/services(?:\/|$)/.test(path)) return 'services'
  if (/^\/(en|ru|es)\/courses(?:\/|$)/.test(path)) return 'courses'
  if (/^\/(en|ru|es)\/events(?:\/|$)/.test(path)) return 'events'
  if (/^\/(en|ru|es)\/about(?:\/|$)/.test(path)) return 'about'
  return undefined
}
export function routeLocale(pathname) { return pathname?.match(/^\/(en|ru|es)(?:\/|$)/)?.[1] }

// The guest catalog is public; legacy client selectors and guest sessions are not.
export function isPublicTestDiscoveryPath(pathname) {
  return /^\/(?:en|ru)\/client(?:\/tests)?\/?$/.test(pathname || '')
}
