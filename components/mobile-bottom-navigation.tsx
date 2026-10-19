"use client";
import { compactNavigationIcons } from './compact-navigation-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { PublicLocale } from '@/lib/public-locales';
import { activeCompactNavigationId, getCompactNavigation, isPublicTestDiscoveryPath, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

export function MobileBottomNavigation({ initialLocale = 'en' }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname();
  const locale = useNavigationLocale(initialLocale);
  const nav = useRef<HTMLElement>(null);
  // /client and /client/tests are public test-selection pages; other client
  // paths, private account routes and documents must keep the bar hidden.
  const clientRoute = /^\/(?:ru|en|es)\/client(?:\/|$)/.test(pathname);
  const hidden = /^\/(?:admin|document-preview)(?:\/|$)/.test(pathname)
    || /^\/(?:ru|en)\/(?:prescriptions|app)(?:\/|$)/.test(pathname)
    || (clientRoute && !isPublicTestDiscoveryPath(pathname) && !/^\/es\/client(?:\/tests)?\/?$/.test(pathname));
  useEffect(() => {
    const element = nav.current;
    const update = () => document.body.style.setProperty('--ia222-bottom-height', `${element?.getBoundingClientRect().height ?? 0}px`);
    update();
    const observer = element ? new ResizeObserver(update) : undefined;
    if (element) observer?.observe(element);
    return () => { observer?.disconnect(); document.body.style.removeProperty('--ia222-bottom-height'); };
  }, [hidden, locale]);
  if (hidden) return null;
  const current = activeCompactNavigationId(pathname);
  const mobileItems = getCompactNavigation(locale);
  return <nav ref={nav} aria-label={navigationCopy[locale].mobile} className="mobile-bottom-navigation ia222-bottom-navigation">
    {/* Keep six high-priority destinations on the bottom bar. Events is here;
        Library lives beside the language picker and in the expanded menu. */}
    {mobileItems.map(item => {
      const Icon = compactNavigationIcons[item.id as keyof typeof compactNavigationIcons];
      const content = <><Icon aria-hidden="true" /><span>{item.label}</span></>;
      return item.external
        ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{content}</a>
        : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined} data-home-active={item.id === 'home' && current === 'home' ? 'true' : undefined}>{content}</Link>;
    })}
  </nav>;
}
