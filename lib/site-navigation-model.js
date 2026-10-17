// Shared public destinations. No private identifiers or account state belongs here.
export const navigationCopy = {
  en: { home: 'Home', library: 'Library', services: 'Services', relationships: 'Love & intimacy', academy: 'Academy', about: 'About', courses: 'My courses', cabinet: 'My tests', tests: 'Tests', house: 'My House', navigation: 'Primary navigation', mobile: 'Mobile navigation', language: 'Interface language' },
  ru: { home: 'Главная', library: 'Библиотека', services: 'Услуги', relationships: 'Любовь и близость', academy: 'Академия', about: 'Обо мне', courses: 'Мои курсы', cabinet: 'Мои тесты', tests: 'Тесты', house: 'Мой дом', navigation: 'Основная навигация', mobile: 'Мобильная навигация', language: 'Язык интерфейса' },
  es: { home: 'Inicio', library: 'Biblioteca', services: 'Servicios', relationships: 'Amor e intimidad', academy: 'Academia', about: 'Sobre mí', courses: 'Mis cursos', cabinet: 'Mis pruebas', tests: 'Tests', house: 'Mi Casa', navigation: 'Navegación principal', mobile: 'Navegación móvil', language: 'Idioma de la página' },
}
export const primaryNavigationIds = ['home', 'library', 'services', 'relationships', 'academy', 'tests', 'house']
export function getSiteNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  return primaryNavigationIds.filter(id => id !== "relationships" || selected !== "es").map(id => ({
    id, label: text[id],
    href: id === 'home' ? (selected === 'en' ? '/' : `/${selected}`)
      : id === 'tests' ? `/${selected}/client/tests`
      : id === 'house' ? `/${selected === 'es' ? 'en' : selected}/app`
      : `/${selected}/${id}`,
    external: false,
    ariaLabel: text[id],
  }))
}
export function activeNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/' || /^\/(en|ru|es)$/.test(path)) return 'home'
  if (/^\/(?:en|ru|es)\/(library|books|homeopathy)(?:\/|$)/.test(path) || /^\/books(?:\/|$)/.test(path)) return 'library'
  if (/^\/(en|ru)\/relationships(?:\/|$)/.test(path)) return 'relationships'
  if (/^\/(en|ru|es)\/academy(?:\/|$)/.test(path)) return 'academy'
  if (/^\/(en|ru|es)\/client(?:\/|$)/.test(path)) return 'tests'
  if (/^\/(en|ru)\/app(?:\/|$)/.test(path)) return 'house'
  if (/^\/(en|ru|es)\/services(?:\/|$)/.test(path)) return 'services'
  if (/^\/(en|ru|es)\/courses(?:\/|$)/.test(path)) return 'academy'
  if (/^\/(en|ru|es)\/about(?:\/|$)/.test(path)) return 'services'
  return undefined
}
export function routeLocale(pathname) { return pathname?.match(/^\/(en|ru|es)(?:\/|$)/)?.[1] }

// The guest catalog is public; legacy client selectors and guest sessions are not.
export function isPublicTestDiscoveryPath(pathname) {
  return /^\/(?:en|ru|es)\/client(?:\/tests)?\/?$/.test(pathname || '')
}
