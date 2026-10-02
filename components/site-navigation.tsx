"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import type { Locale } from '@/data/remedies';
import { localePath, saveUiLocale } from '@/lib/ui-locale';
import { hasSpanishCounterpart, publicCounterpart, savePublicLocale, type PublicLocale } from '@/lib/public-locales';
import { activeNavigationId, getSiteNavigation, navigationCopy } from '@/lib/site-navigation-model';

import { useNavigationLocale } from './use-navigation-locale';

type Props = { locale?: PublicLocale; onLocaleChange?: (locale: Locale) => void };

export function SiteNavigation({ locale, onLocaleChange }: Props) {
  const pathname = usePathname();
  const preference = useNavigationLocale(locale);
  const activeLocale = locale ?? preference;
  const text = navigationCopy[activeLocale];
  const current = activeNavigationId(pathname);
  const localizedPath = /^\/(ru|en|es)(?=\/|$)/.test(pathname);
  const available = hasSpanishCounterpart(pathname);
  const languages: PublicLocale[] = available ? ['ru', 'en', 'es'] : ['ru', 'en'];

  useEffect(() => {
    if (!locale) return;
    savePublicLocale(locale);
    if (locale !== 'es') saveUiLocale(locale);
  }, [locale]);

  function selectLocale(next: PublicLocale) {
    savePublicLocale(next);
    if (next === 'es') return;
    saveUiLocale(next);
    window.dispatchEvent(new CustomEvent<Locale>('ui-locale-change', { detail: next }));
    onLocaleChange?.(next);
  }

  const counterpart = (next: PublicLocale) => available ? publicCounterpart(pathname, next) : localePath(pathname, next as Locale);

  return <nav aria-label={text.navigation} className="site-navigation">
    {getSiteNavigation(activeLocale).map(item => item.external
      ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{item.label}</a>
      : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined}>{item.label}</Link>)}
    <span aria-label={text.language} className="site-language-switch">{languages.map(next => localizedPath || next === 'es'
      ? <Link prefetch={false} aria-current={activeLocale === next ? 'true' : undefined} href={counterpart(next)} key={next} lang={next} onClick={() => selectLocale(next)}>{next.toUpperCase()}</Link>
      : <button aria-pressed={activeLocale === next} key={next} lang={next} onClick={() => selectLocale(next)} type="button">{next.toUpperCase()}</button>)}</span>
  </nav>;
}
