"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CircleUserRound, Menu } from 'lucide-react';
import type { Locale } from '@/data/remedies';
import { localePath, saveUiLocale } from '@/lib/ui-locale';
import { hasSpanishCounterpart, publicCounterpart, savePublicLocale, type PublicLocale } from '@/lib/public-locales';
import { activeNavigationId, getSiteNavigation, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

type Props = { locale?: PublicLocale; onLocaleChange?: (locale: Locale) => void };

const cabinetEntryCopy = {
  en: { full: 'My cabinet', compact: 'Cabinet', aria: 'Open personal cabinet' },
  ru: { full: 'Личный кабинет', compact: 'Кабинет', aria: 'Открыть личный кабинет' },
  es: { full: 'Mi espacio', compact: 'Espacio', aria: 'Abrir mi espacio personal (en inglés)' },
} as const;

const siteMenuCopy = {
  en: { open: 'Open site menu', heading: 'Explore Holistic House' },
  ru: { open: 'Открыть меню сайта', heading: 'Разделы Holistic House' },
  es: { open: 'Abrir menú del sitio', heading: 'Explorar Holistic House' },
} as const;

export function SiteNavigation({ locale, onLocaleChange }: Props) {
  const pathname = usePathname();
  const languageRef = useRef<HTMLDetailsElement>(null);
  const siteMenuRef = useRef<HTMLDetailsElement>(null);
  const preference = useNavigationLocale(locale);
  const activeLocale = locale ?? preference;
  const text = navigationCopy[activeLocale];
  const cabinet = cabinetEntryCopy[activeLocale];
  const siteMenu = siteMenuCopy[activeLocale];
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
    const menus = [languageRef.current, siteMenuRef.current].filter(
      (entry): entry is HTMLDetailsElement => entry !== null,
    );
    if (!menus.length) return;
    function dismiss(event: Event) {
      if (!(event.target instanceof Node)) return;
      for (const menu of menus) {
        if (!menu.contains(event.target)) menu.open = false;
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const openMenu = menus.find(menu => menu.open);
      if (!openMenu) return;
      event.preventDefault();
      for (const menu of menus) menu.open = false;
      openMenu.querySelector<HTMLElement>('summary')?.focus();
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    if (languageRef.current) languageRef.current.open = false;
    if (siteMenuRef.current) siteMenuRef.current.open = false;
  }, [pathname, activeLocale]);

  function selectLocale(next: PublicLocale) {
    if (languageRef.current) languageRef.current.open = false;
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
    {getSiteNavigation(activeLocale).filter(item => item.id !== 'cabinet').map(item => item.external
      ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{item.label}</a>
      : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined}>{item.label}</Link>)}
    <Link
      className="site-cabinet-entry"
      href={`/${activeLocale === 'es' ? 'en' : activeLocale}/app`}
      prefetch={false}
      data-nav-item="cabinet"
      aria-current={current === 'cabinet' ? 'page' : undefined}
      aria-label={cabinet.aria}
    >
      <CircleUserRound aria-hidden="true" />
      <span className="site-cabinet-entry__full">{cabinet.full}</span>
      <span className="site-cabinet-entry__compact">{cabinet.compact}</span>
    </Link>
    <span className="site-language-switch"><details className="site-language-menu" ref={languageRef}>
      <summary className="site-language-menu-trigger" aria-label={text.language}>{activeLocale.toUpperCase()}</summary>
      <span className="site-language-menu-list">{languages.map(next => localizedPath || next === 'es' || !onLocaleChange
        ? <Link prefetch={false} aria-current={activeLocale === next ? 'true' : undefined} href={counterpart(next)} key={next} lang={next} onClick={() => selectLocale(next)}>{next.toUpperCase()}</Link>
        : <button aria-pressed={activeLocale === next} key={next} lang={next} onClick={() => selectLocale(next)} type="button">{next.toUpperCase()}</button>)}</span>
    </details></span>
    <details className="site-main-menu" ref={siteMenuRef}>
      <summary className="site-main-menu-trigger" aria-label={siteMenu.open} title={siteMenu.open}>
        <Menu aria-hidden="true" />
      </summary>
      <div className="site-main-menu-panel">
        <p className="site-main-menu-heading">{siteMenu.heading}</p>
        {getSiteNavigation(activeLocale).map(item => (
          <Link
            key={item.id}
            href={item.id === 'cabinet' ? `/${activeLocale === 'es' ? 'en' : activeLocale}/app` : item.href}
            prefetch={false}
            aria-current={current === item.id ? 'page' : undefined}
            onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}
          >{item.label}</Link>
        ))}
        <Link
          href={`/${activeLocale}/about`}
          prefetch={false}
          aria-current={pathname === `/${activeLocale}/about` ? 'page' : undefined}
          onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}
        >{text.about}</Link>
      </div>
    </details>
  </nav>;
}
