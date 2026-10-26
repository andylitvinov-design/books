import assert from 'node:assert/strict'

// Deliberately independent of the runtime navigation model and component copy.
// Seven compact bottom/menu journeys are not the six-link Home hero carousel
// or six expanded topic filters; those have different selectors and owners.
// These literals preserve the public editorial routes and short/full translated
// labels at canonical 78cae809 (tree 410dee90), independently of runtime code.
const ids = ['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple']
const paths = ['', 'services/free-situation-review', 'academy', 'personality-profiles', 'services/alchemy-of-soul', 'pro', 'holistic-support']
const labels = {
  en: ['Home', 'Free Analysis', 'Courses', 'My Profile', 'Psychic Alchemy', 'Pro', 'Holistic Support'],
  ru: ['Главная', 'Бесплатный разбор', 'Курсы', 'Мой профиль', 'Алхимия души', 'Pro', 'Холистическая поддержка'],
  es: ['Inicio', 'Análisis gratis', 'Cursos', 'Mi perfil', 'Alquimia del Alma', 'Pro', 'Apoyo holístico'],
}
const visibleLabels = {
  en: ['Home', 'Free Analysis', 'Courses', 'My Profile', 'Psychic Alchemy', 'Pro', 'Holistic Support'],
  ru: ['Домой', 'Разбор', 'Курсы', 'Профиль', 'Алхимия души', 'Pro', 'Поддержка'],
  es: ['Inicio', 'Análisis', 'Cursos', 'Mi perfil', 'Alquimia del Alma', 'Pro', 'Apoyo holístico'],
}

export function expectedPublicNavigation(locale) {
  assert.ok(Object.hasOwn(labels, locale), 'Declare a supported public locale')
  return ids.map((id, index) => ({
    id,
    href: index === 0 ? locale === 'en' ? '/' : '/' + locale : '/' + locale + '/' + paths[index],
    label: labels[locale][index], ariaLabel: labels[locale][index], external: false,
    visibleLabel: visibleLabels[locale][index],
  }))
}

export const publicSurfaceActive = Object.freeze({
  home: 'home', energy: undefined, love: undefined, business: undefined, library: undefined,
  client: 'profile', 'client/tests': 'profile', 'personality-profiles': 'profile',
  coaching: undefined, 'services/alchemy-of-soul': 'alchemy', 'services/psychohomeopathy': 'alchemy', 'temple-insights': 'temple', 'holistic-support': 'temple',
  'services/free-situation-review': 'analysis', academy: 'courses', pro: 'pro',
})

export function expectedPrivateNavigation(locale, { mobile, current }) {
  assert.ok(['en', 'ru'].includes(locale), 'Private account supports English and Russian')
  const names = locale === 'ru'
    ? ['Профиль', 'Тесты', 'Отчёты', 'Курсы', 'Практика']
    : ['Profile', 'Tests', 'Reports', 'Courses', 'Practice']
  const routes = ['portrait', 'tests', 'portfolio', 'course?view=courses', 'practice']
  const result = routes.map((route, index) => ({
    href: '/' + locale + '/app/' + route, label: names[index],
    current: route.split('?')[0] === current ? 'page' : null, ariaLabel: null,
  }))
  if (mobile) result.push({
    href: locale === 'ru' ? '/ru' : '/', label: locale === 'ru' ? 'Главная' : 'Home', current: null,
    ariaLabel: locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage',
  })
  return result
}
