// Public navigation is deliberately separate from the EN/RU private-cabinet locale.
export type PublicLocale = 'en' | 'ru' | 'es';
export const publicLocaleCookie = 'holistic_house_public_locale';
export const publicLocales: readonly PublicLocale[] = ['ru', 'en', 'es'];
export function publicHomePath(locale: PublicLocale) {
  return locale === 'es' ? '/es' : `/?lang=${locale}`;
}
export function hasSpanishCounterpart(pathname: string) {
  return pathname === '/' || /^\/(en|ru|es)(?:\/(?:about|services(?:\/(?:free-situation-review|imagery-therapy|[a-z0-9-]+\/[a-z0-9-]+))?|books|library(?:\/distance-homeopathy)?|client(?:\/tests)?|masters(?:\/[a-z0-9-]+)?|academy(?:\/[a-z0-9-]+)*|wu-xing|homeopathy(?:\/remedies(?:\/[a-z0-9-]+)?)?))?\/?$/.test(pathname);
}
export function publicCounterpart(pathname: string, locale: PublicLocale) {
  if (pathname === '/' || /^\/(?:en|ru|es)\/?$/.test(pathname)) return publicHomePath(locale);
  if (!hasSpanishCounterpart(pathname)) return locale === 'es' ? '/es' : publicHomePath(locale);
  return pathname.replace(/^\/(en|ru|es)(?=\/|$)/, `/${locale}`);
}
export function savePublicLocale(locale: PublicLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${publicLocaleCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  document.documentElement.lang = locale;
}
