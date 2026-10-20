"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BookOpen, Menu } from 'lucide-react';
import { CartNavLink } from '@/components/commerce/cart-nav-link';
import { compactNavigationIcons } from './compact-navigation-icons';
import type { Locale } from '@/data/remedies';
import { localePath, saveUiLocale } from '@/lib/ui-locale';
import { hasSpanishCounterpart, publicCounterpart, savePublicLocale, type PublicLocale } from '@/lib/public-locales';
import { activeCompactNavigationId, activeNavigationId, getCompactNavigation, getSiteNavigation, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

type Props = { locale?: PublicLocale; onLocaleChange?: (locale: Locale) => void };

const libraryEntryCopy = {
  en: { full: 'Library', compact: 'Library', aria: 'Open library' },
  ru: { full: 'Библиотека', compact: 'Библиотека', aria: 'Открыть библиотеку' },
  es: { full: 'Biblioteca', compact: 'Biblioteca', aria: 'Abrir biblioteca' },
} as const;

const shopMenuCopy = { en: 'Shop', ru: 'Магазин', es: 'Tienda' } as const;

const siteMenuCopy = {
  en: { open: 'Open site menu', heading: 'Explore Holistic House', label: 'Menu', start: 'Start free', quick: 'Main sections', more: 'Explore more' },
  ru: { open: 'Открыть меню сайта', heading: 'Разделы Holistic House', label: 'Меню', start: 'Начать бесплатно', quick: 'Основные разделы', more: 'Другие разделы' },
  es: { open: 'Abrir menú del sitio', heading: 'Explorar Holistic House', label: 'Menú', start: 'Empezar gratis', quick: 'Secciones principales', more: 'Explorar más' },
} as const;

export function SiteNavigation({ locale, onLocaleChange }: Props) {
  const pathname = usePathname();
  const languageRef = useRef<HTMLDetailsElement>(null);
  const siteMenuRef = useRef<HTMLDetailsElement>(null);
  const preference = useNavigationLocale(locale);
  const activeLocale = locale ?? preference;
  const text = navigationCopy[activeLocale];
  const library = libraryEntryCopy[activeLocale];
  const siteMenu = siteMenuCopy[activeLocale];
  const current = activeNavigationId(pathname);
  const menuCurrent = activeCompactNavigationId(pathname);
  const localizedPath = /^\/(ru|en|es)(?=\/|$)/.test(pathname);
  const available = hasSpanishCounterpart(pathname);
  const languages: PublicLocale[] = available ? ['ru', 'en', 'es'] : ['ru', 'en'];
  const freeStartHref = `${activeLocale === 'en' ? '/' : `/${activeLocale}`}#free-start`;

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

  // One canonical six-item navigation, shared by the hamburger and bottom bar.
  // Additional editorial pages are grouped separately, never mixed into the bar.
  const mainMenuItems = getCompactNavigation(activeLocale);
  const extraMenuItems = getSiteNavigation(activeLocale).filter(
    item => item.id === 'library' || item.id === 'relationships' || item.id === 'courses' || item.id === 'events',
  );

  return <nav aria-label={text.navigation} className="site-navigation">
    <Link className="site-nav-free-entry" href={freeStartHref} prefetch={false}>{siteMenu.start}</Link>
    {getSiteNavigation(activeLocale).filter(item => item.id === 'services').map(item => item.external
      ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{item.label}</a>
      : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined}>{item.label}</Link>)}
    <Link className="site-nav-about-entry" href={`/${activeLocale}/about`} prefetch={false} aria-current={pathname === `/${activeLocale}/about` ? 'page' : undefined}>{text.about}</Link>
    <Link
      className="site-library-entry"
      href={`/${activeLocale}/library`}
      prefetch={false}
      data-nav-item="library"
      aria-current={current === 'library' ? 'page' : undefined}
      aria-label={library.aria}
    >
      <BookOpen aria-hidden="true" />
      <span className="site-library-entry__full">{library.full}</span>
      <span className="site-library-entry__compact">{library.compact}</span>
    </Link>
    <Link className="site-nav-shop-entry" data-nav-item="shop" href={"/" + activeLocale + "/shop"}
      prefetch={false} aria-current={pathname === "/" + activeLocale + "/shop" ? "page" : undefined}>
      {shopMenuCopy[activeLocale]}
    </Link>
    <CartNavLink locale={activeLocale} />
    <span className="site-language-switch"><details className="site-language-menu" ref={languageRef}>
      <summary className="site-language-menu-trigger" aria-label={text.language}>{activeLocale.toUpperCase()}</summary>
      <span className="site-language-menu-list">{languages.map(next => localizedPath || next === 'es' || !onLocaleChange
        ? <Link prefetch={false} aria-current={activeLocale === next ? 'true' : undefined} href={counterpart(next)} key={next} lang={next} onClick={() => selectLocale(next)}>{next.toUpperCase()}</Link>
        : <button aria-pressed={activeLocale === next} key={next} lang={next} onClick={() => selectLocale(next)} type="button">{next.toUpperCase()}</button>)}</span>
    </details></span>
    <details className="site-main-menu" ref={siteMenuRef}>
      <summary className="site-main-menu-trigger" aria-label={siteMenu.open} title={siteMenu.open}>
        <Menu aria-hidden="true" /><span className="site-main-menu-trigger__label">{siteMenu.label}</span>
      </summary>
      <div className="site-main-menu-panel">
        <p className="site-main-menu-heading">{siteMenu.heading}</p>
        <Link className="site-main-menu-free" href={freeStartHref} prefetch={false} onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}>{siteMenu.start}</Link>
        <p className="site-main-menu-group-label">{siteMenu.quick}</p>
        <div className="site-main-menu-grid" aria-label={siteMenu.quick}>
          {mainMenuItems.map(item => {
            const Icon = compactNavigationIcons[item.id as keyof typeof compactNavigationIcons];
            return <Link
              key={item.id}
              data-nav-item={item.id}
              href={item.href}
              aria-label={item.ariaLabel}
              prefetch={false}
              aria-current={menuCurrent === item.id ? 'page' : undefined}
              onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}
            ><Icon aria-hidden="true" /><span>{item.label}</span></Link>;
          })}
        </div>
        <p className="site-main-menu-group-label site-main-menu-group-label--more">{siteMenu.more}</p>
        <div className="site-main-menu-more">
          <Link href={"/" + activeLocale + "/shop"} prefetch={false} data-nav-item="shop"
            aria-current={pathname === "/" + activeLocale + "/shop" ? "page" : undefined}
            onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}>
            {shopMenuCopy[activeLocale]}
          </Link>
          <Link href={`/${activeLocale}/cart`} prefetch={false} data-nav-item="cart" onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}>
            {activeLocale === 'ru' ? 'Корзина' : activeLocale === 'es' ? 'Carrito' : 'Cart'}
          </Link>
          {extraMenuItems.map(item => (
            <Link
              key={item.id}
              data-nav-item={item.id}
              href={item.href}
              prefetch={false}
              aria-current={menuCurrent === item.id ? 'page' : undefined}
              onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}
            >{item.label}</Link>
          ))}
          <Link
            data-nav-item="about"
            href={`/${activeLocale}/about`}
            prefetch={false}
            aria-current={pathname === `/${activeLocale}/about` ? 'page' : undefined}
            onClick={() => { if (siteMenuRef.current) siteMenuRef.current.open = false; }}
          >{text.about}</Link>
        </div>
      </div>
    </details>
  </nav>;
}
