"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { routeLocale } from '@/lib/site-navigation-model';
import type { PublicLocale } from '@/lib/public-locales';

export function useNavigationLocale(initialLocale: PublicLocale = 'en') {
  const pathname = usePathname();
  const [preference, setPreference] = useState<PublicLocale>(initialLocale);
  useEffect(() => {
    function sync(event?: Event) {
      const explicit = routeLocale(window.location.pathname);
      const query = new URL(window.location.href).searchParams.get('lang');
      const detail = (event as CustomEvent<PublicLocale> | undefined)?.detail;
      const next = explicit ?? detail ?? (['en', 'ru', 'es'].includes(query ?? '') ? query : document.documentElement.lang);
      setPreference(next === 'ru' || next === 'es' ? next : 'en');
    }
    sync();
    window.addEventListener('ui-locale-change', sync);
    window.addEventListener('holistic-house-ui-locale', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('ui-locale-change', sync);
      window.removeEventListener('holistic-house-ui-locale', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [pathname, initialLocale]);
  return routeLocale(pathname) ?? preference;
}
