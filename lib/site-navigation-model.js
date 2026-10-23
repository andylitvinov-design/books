// Public editorial destinations. Keep private account state out of navigation.
export const navigationCopy = {
  en: { home: 'Home', energy: 'Energy', love: 'Love', business: 'Business', pro: 'Pro', tests: 'Tests', library: 'Library', books: 'Ideas', house: 'My Space', services: 'Services', events: 'Events', relationships: 'Love & intimacy', academy: 'Academy', about: 'About', courses: 'Courses', cabinet: 'My Space', navigation: 'Primary navigation', mobile: 'Mobile navigation', language: 'Interface language' },
  ru: { home: 'Главная', energy: 'Энергия', love: 'Любовь', business: 'Бизнес', pro: 'Профи', tests: 'Тесты', library: 'Библиотека', books: 'Идеи', house: 'Моё пространство', services: 'Услуги', events: 'События', relationships: 'Любовь и близость', academy: 'Академия', about: 'Обо мне', courses: 'Курсы', cabinet: 'Моё пространство', navigation: 'Основная навигация', mobile: 'Мобильная навигация', language: 'Язык интерфейса' },
  es: { home: 'Inicio', energy: 'Energía', love: 'Amor', business: 'Negocios', pro: 'Pro', tests: 'Tests', library: 'Biblioteca', books: 'Ideas', house: 'Mi espacio', services: 'Servicios', events: 'Eventos', relationships: 'Amor e intimidad', academy: 'Academia', about: 'Sobre mí', courses: 'Cursos', cabinet: 'Mi espacio', navigation: 'Navegación principal', mobile: 'Navegación móvil', language: 'Idioma de la página' },
}
// Three visitor needs replace the service-format tabs; original catalog routes survive in the More menu.
export const primaryNavigationIds = ['home', 'energy', 'love', 'business', 'library', 'events', 'courses', 'pro', 'cabinet']
const publicRoutes = { energy: 'explore/energy', love: 'explore/love', business: 'explore/business', courses: 'academy' }
export function getSiteNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  return primaryNavigationIds.map(id => ({
    id, label: text[id],
    href: id === 'home' ? (selected === 'en' ? '/' : '/' + selected)
      : '/' + selected + '/' + (publicRoutes[id] || (id === 'cabinet' ? 'client' : id)),
    external: false,
    ariaLabel: text[id],
  }))
}
// The bottom bar and the six main menu shortcuts share this order. Tests remain available from Pro.
export const compactNavigationIds = ['home', 'energy', 'love', 'business', 'books', 'pro']
export function getCompactNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  const publicLinks = new Map(getSiteNavigation(selected).map(item => [item.id, item]))
  return compactNavigationIds.map(id => {
    if (id === 'books') return { id, href: '/' + selected + '/books', label: text.books, ariaLabel: text.books, external: false }
    return publicLinks.get(id)
  })
}
export function activeCompactNavigationId(pathname) {
  // Tests moved off the six-slot bar. The public test chooser belongs under Pro.
  if (/^\/(?:en|ru|es)\/client(?:\/tests)?\/?$/.test(pathname || '')) return 'pro'
  const active = activeNavigationId(pathname)
  return active === 'library' ? 'books' : active
}
export function activeNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/' || /^\/(en|ru|es)$/.test(path)) return 'home'
  if (/^\/(?:en|ru|es)\/(library|books|homeopathy)(?:\/|$)/.test(path) || /^\/books(?:\/|$)/.test(path)) return 'library'
  if (/^\/(en|ru|es)\/(?:relationships|explore\/(?:relationships|love))(?:\/|$)/.test(path)) return 'love'
  if (/^\/(en|ru|es)\/explore\/(?:energy|stress)(?:\/|$)/.test(path)) return 'energy'
  if (/^\/(en|ru|es)\/explore\/(?:business|effectiveness)(?:\/|$)/.test(path)) return 'business'
  if (/^\/(en|ru|es)\/pro(?:\/|$)/.test(path)) return 'pro'
  if (/^\/(en|ru|es)\/academy(?:\/|$)/.test(path)) return 'courses'
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
