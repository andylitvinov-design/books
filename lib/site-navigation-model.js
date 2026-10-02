// Shared public destinations. No private identifiers or account state belongs here.
export const navigationCopy = {
  en: { home: 'Home', library: 'Library', services: 'Services', academy: 'Academy', about: 'About', cabinet: 'Cabinet', navigation: 'Primary navigation', mobile: 'Mobile navigation', language: 'Interface language', academyHint: 'PsiTrends Academy — opens another site' },
  ru: { home: 'Главная', library: 'Библиотека', services: 'Услуги', academy: 'Академия', about: 'Обо мне', cabinet: 'Кабинет', navigation: 'Основная навигация', mobile: 'Мобильная навигация', language: 'Язык интерфейса', academyHint: 'Академия PsiTrends — переход на другой сайт' },
  es: { home: 'Inicio', library: 'Biblioteca', services: 'Servicios', academy: 'Academia', about: 'Sobre mí', cabinet: 'Área personal', navigation: 'Navegación principal', mobile: 'Navegación móvil', language: 'Idioma de la página', academyHint: 'Academia PsiTrends — abre otro sitio' },
}
export const primaryNavigationIds = ['home', 'library', 'services', 'academy', 'about', 'cabinet']
export const academyUrl = 'https://psitrends.com/academy'
export function getSiteNavigation(locale = 'en') {
  const selected = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const text = navigationCopy[selected]
  return primaryNavigationIds.map(id => ({
    id, label: text[id],
    href: id === 'home' ? (selected === 'es' ? '/es' : `/?lang=${selected}`)
      : id === 'academy' ? academyUrl : `/${selected}/${id === 'cabinet' ? 'client' : id}`,
    external: id === 'academy',
    ariaLabel: id === 'academy' ? text.academyHint : text[id],
  }))
}
export function activeNavigationId(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (path === '/' || /^\/(en|ru|es)$/.test(path)) return 'home'
  if (/^\/(?:en|ru|es)\/(library|books|homeopathy)(?:\/|$)/.test(path) || /^\/books(?:\/|$)/.test(path)) return 'library'
  if (/^\/(en|ru|es)\/client(?:\/|$)/.test(path)) return 'cabinet'
  if (/^\/(en|ru|es)\/services(?:\/|$)/.test(path)) return 'services'
  if (/^\/(en|ru|es)\/about(?:\/|$)/.test(path)) return 'about'
  return undefined
}
export function routeLocale(pathname) { return pathname?.match(/^\/(en|ru|es)(?:\/|$)/)?.[1] }
