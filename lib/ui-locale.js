export const uiLocaleCookie = 'holistic_house_ui_locale'

export function isUiLocale(value) {
  return value === 'ru' || value === 'en'
}

export function localePath(pathname, locale) {
  const path = pathname || '/'
  return /^\/(ru|en)(?=\/|$)/.test(path) ? `/${locale}${path.slice(3)}` : path
}

export function readUiLocale(cookieValue = '') {
  const value = cookieValue.split('; ').find((item) => item.startsWith(`${uiLocaleCookie}=`))?.split('=')[1]
  return isUiLocale(value) ? value : 'ru'
}

export function saveUiLocale(locale) {
  if (typeof document === 'undefined' || !isUiLocale(locale)) return
  document.cookie = `${uiLocaleCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  document.documentElement.lang = locale
  window.dispatchEvent(new CustomEvent('holistic-house-ui-locale', { detail: locale }))
}
