// Public editorial destinations. Keep private account state out of navigation.
export const navigationCopy = {
  en: { temple: 'Holistic Support', profile: 'My Profile', coaching: 'Coaching', alchemy: 'Psychic Alchemy', insights: 'Temple Insights', support: 'Holistic Support', home: 'Home', analysis: 'Free Analysis', energy: 'Body and Energy', love: 'Stress and Relationships', business: 'Money and Business', pro: 'Pro', tests: 'Tests', library: 'Library', books: 'Tests & Coaching', house: 'My Space', services: 'Services', events: 'Events', relationships: 'Love & intimacy', academy: 'Academy', about: 'About', courses: 'Courses', cabinet: 'My Space', navigation: 'Primary navigation', mobile: 'Mobile navigation', language: 'Interface language' },
  ru: { temple: 'Холистическая поддержка', profile: 'Мой профиль', coaching: 'Коучинг', alchemy: 'Алхимия души', insights: 'Храмовые подсказки', support: 'Холистическая поддержка', home: 'Главная', analysis: 'Бесплатный разбор', energy: 'Тело и энергия', love: 'Стресс и отношения', business: 'Деньги и бизнес', pro: 'Pro', tests: 'Тесты', library: 'Библиотека', books: 'Тесты и коучинг', house: 'Моё пространство', services: 'Услуги', events: 'События', relationships: 'Любовь и близость', academy: 'Академия', about: 'Обо мне', courses: 'Курсы', cabinet: 'Моё пространство', navigation: 'Основная навигация', mobile: 'Мобильная навигация', language: 'Язык интерфейса' },
  es: { temple: 'Apoyo holístico', profile: 'Mi perfil', coaching: 'Coaching', alchemy: 'Alquimia del Alma', insights: 'Guía del templo', support: 'Apoyo holístico', home: 'Inicio', analysis: 'Análisis gratis', energy: 'Cuerpo y energía', love: 'Estrés y relaciones', business: 'Dinero y negocios', pro: 'Pro', tests: 'Tests', library: 'Biblioteca', books: 'Tests y coaching', house: 'Mi espacio', services: 'Servicios', events: 'Eventos', relationships: 'Amor e intimidad', academy: 'Academia', about: 'Sobre mí', courses: 'Cursos', cabinet: 'Mi espacio', navigation: 'Navegación principal', mobile: 'Navegación móvil', language: 'Idioma de la página' },
}
// Three visitor needs replace the service-format tabs; original catalog routes survive in the More menu.
export const primaryNavigationIds = ['home', 'energy', 'love', 'business', 'library', 'events', 'courses', 'pro', 'temple', 'cabinet']
const publicRoutes = { energy: 'explore/energy', love: 'explore/love', business: 'explore/business', courses: 'academy', temple: 'holistic-support' }
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
// Seven visitor journeys share the mobile bar and the first row of the site menu.
// Legacy topic destinations stay in the expanded menu, without deleting their routes.
export const compactNavigationIds = ['profile', 'courses', 'home', 'analysis', 'alchemy', 'pro', 'temple']
const compactRoutes = { analysis: 'services/free-situation-review', alchemy: 'services/alchemy-of-soul' }
export function getCompactNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  const publicLinks = new Map(getSiteNavigation(selected).map(item => [item.id, item]))
  // My Profile opens the same authenticated page as the Cabinet; keep the public builder route available separately.
  return compactNavigationIds.map(id => id === 'profile'
    ? { id, href: '/' + (selected === 'es' ? 'en' : selected) + '/app/portrait', label: text[id], ariaLabel: text[id], external: false }
    : compactRoutes[id]
      ? { id, href: '/' + selected + '/' + compactRoutes[id], label: text[id], ariaLabel: text[id], external: false }
      : publicLinks.get(id))
}
export function activeCompactNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (/^\/(en|ru|es)\/services\/free-situation-review(?:\/|$)/.test(path)) return 'analysis'
  if (/^\/(en|ru|es)\/(?:academy|courses)(?:\/|$)/.test(path)) return 'courses'
  if (/^\/(en|ru|es)\/(?:personality-profiles|tests|client(?:\/tests)?)(?:\/|$)/.test(path)) return 'profile'
  if (/^\/(en|ru|es)\/services\/(?:alchemy-of-soul|psychohomeopathy)(?:\/|$)/.test(path)) return 'alchemy'
  if (/^\/(en|ru|es)\/(?:temple-insights|temple-support|holistic-support|services\/remote-energy-support)(?:\/|$)/.test(path)) return 'temple'
  if (/^\/(en|ru|es)\/pro(?:\/|$)/.test(path)) return 'pro'
  return activeNavigationId(path) === 'home' ? 'home' : undefined
}
export function activeNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/' || /^\/(en|ru|es)$/.test(path)) return 'home'
  if (/^\/(?:en|ru|es)\/(library|books|coaching|homeopathy)(?:\/|$)/.test(path) || /^\/books(?:\/|$)/.test(path)) return 'library'
  if (/^\/(en|ru|es)\/(?:relationships|explore\/(?:relationships|love))(?:\/|$)/.test(path)) return 'love'
  if (/^\/(en|ru|es)\/explore\/(?:energy|stress)(?:\/|$)/.test(path)) return 'energy'
  if (/^\/(en|ru|es)\/explore\/(?:business|effectiveness)(?:\/|$)/.test(path)) return 'business'
  if (/^\/(en|ru|es)\/(?:holistic-support|temple-support)(?:\/|$)/.test(path)) return 'temple'
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
