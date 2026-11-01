// Public navigation is deliberately separate from the EN/RU private-cabinet locale.
export type PublicLocale = 'en' | 'ru' | 'es';
export const publicLocaleCookie = 'holistic_house_public_locale';
export const publicLocales: readonly PublicLocale[] = ['ru', 'en', 'es'];
export function publicHomePath(locale: PublicLocale) {
  return locale === 'en' ? '/' : `/${locale}`;
}
export function hasSpanishCounterpart(pathname: string) {
  if (/^\/(?:en|ru|es)\/install\/?$/.test(pathname)) return true;
  if (/^\/(?:en|ru|es)\/holistic-support\/mandala\/?$/.test(pathname)) return true;
  if (/^\/(?:en|ru|es)\/pro\/?$/.test(pathname)) return true;
  if (/^\/(?:en|ru|es)\/(?:holistic-support|temple-support|temple-insights|personality-profiles|tests)\/?$/.test(pathname)) return true;
  if (/^\/(?:en|ru|es)\/dao\/hexagrams(?:\/(?:[1-9]|[1-5]\d|6[0-4]))?\/?$/.test(pathname)) return true;
  if (/^\/(?:en|ru|es)\/events\/?$/.test(pathname)) return true;
  return pathname === '/' || /^\/(?:en|ru|es)\/courses\/antistress\/?$/.test(pathname) || /^\/(en|ru|es)(?:\/(?:shop|about|contact|toronto|courses(?:\/methodology)?|services(?:\/(?:free-situation-review|free-consultation|imagery-therapy|business-consulting|psychohomeopathy|systemic-constellations|remote-energy-support|dao-health-profile|alchemy-of-soul|hypnotherapy-course|[a-z0-9-]+\/[a-z0-9-]+))?|explore\/(?:relationships|love|business|stress|energy|effectiveness)|relationships|books|coaching|library(?:\/distance-homeopathy)?|client(?:\/tests)?|masters(?:\/[a-z0-9-]+)?|academy(?:\/[a-z0-9-]+)*|wu-xing|homeopathy(?:\/remedies(?:\/[a-z0-9-]+)?)?))?\/?$/.test(pathname);
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
