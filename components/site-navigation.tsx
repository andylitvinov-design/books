"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Locale } from '@/data/remedies';
import { localePath, saveUiLocale } from '@/lib/ui-locale';
import { hasSpanishCounterpart, publicCounterpart, savePublicLocale, type PublicLocale } from '@/lib/public-locales';
import { activeNavigationId, getSiteNavigation, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

type Props = { locale?: PublicLocale; onLocaleChange?: (locale: Locale) => void };

export function SiteNavigation({ locale, onLocaleChange }: Props) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
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

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && !menu!.contains(event.target)) menu!.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menu!.open) return;
      event.preventDefault();
      menu!.open = false;
      menu!.querySelector<HTMLElement>("summary")?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname, activeLocale]);

  function selectLocale(next: PublicLocale) {
    if (menuRef.current) menuRef.current.open = false;
    savePublicLocale(next);
    if (next === 'es') return;
    saveUiLocale(next);
    window.dispatchEvent(new CustomEvent<Locale>('ui-locale-change', { detail: next }));
    onLocaleChange?.(next);
  }

  function counterpart(next: PublicLocale) {
    if (pathname === "/books/maya-tradition") return `${pathname}?lang=${next}`;
    return available ? publicCounterpart(pathname, next) : localePath(pathname, next as Locale);
  }

  return <nav aria-label={text.navigation} className="site-navigation">
    {getSiteNavigation(activeLocale).map(item => item.external
      ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{item.label}</a>
      : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined}>{item.label}</Link>)}
    <span className="site-language-switch"><details className="site-language-menu" ref={menuRef}>
      <summary className="site-language-menu-trigger" aria-label={text.language}>{activeLocale.toUpperCase()}</summary>
      <span className="site-language-menu-list">{languages.map(next => localizedPath || next === 'es' || !onLocaleChange
        ? <Link prefetch={false} aria-current={activeLocale === next ? 'true' : undefined} href={counterpart(next)} key={next} lang={next} onClick={() => selectLocale(next)}>{next.toUpperCase()}</Link>
        : <button aria-pressed={activeLocale === next} key={next} lang={next} onClick={() => selectLocale(next)} type="button">{next.toUpperCase()}</button>)}</span>
    </details></span>
  </nav>;
}
