"use client";
import { BookOpen, House, Sparkles, UserRound, NotebookPen, GraduationCap, CircleUserRound, ClipboardList, HousePlus, Heart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { PublicLocale } from '@/lib/public-locales';
import { activeNavigationId, getSiteNavigation, isPublicTestDiscoveryPath, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

const mobileCopy: Record<PublicLocale, { tests: string; house: string }> = {
  en: { tests: 'Tests', house: 'My House' },
  ru: { tests: 'Тесты', house: 'Мой дом' },
  es: { tests: 'Tests', house: 'Mi Casa' },
};

const icons = { home: House, library: BookOpen, services: Sparkles, relationships: Heart, academy: GraduationCap, about: UserRound, courses: NotebookPen, cabinet: CircleUserRound, tests: ClipboardList, house: HousePlus };

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
  const current = /^\/(?:en|ru|es)\/client(?:\/|$)/.test(pathname) ? 'tests'
    : /^\/(?:en|ru)\/app(?:\/|$)/.test(pathname) ? 'house'
    : activeNavigationId(pathname);
  const publicItems = getSiteNavigation(locale).filter(item => ['home', 'library', 'services', 'academy'].includes(item.id));
  const localized = mobileCopy[locale];
  const mobileItems = [...publicItems,
    { id: 'tests', href: `/${locale}/client/tests`, label: localized.tests, ariaLabel: localized.tests, external: false },
    { id: 'house', href: `/${locale === 'es' ? 'en' : locale}/app`, label: localized.house, ariaLabel: localized.house, external: false },
  ];
  return <nav ref={nav} aria-label={navigationCopy[locale].mobile} className="mobile-bottom-navigation ia222-bottom-navigation">
    {/* Keep the six high-priority destinations on the compact bottom bar. The
        new love/intimacy hub remains prominent in the desktop menu and homepage. */}
    {mobileItems.map(item => {
      const Icon = icons[item.id as keyof typeof icons];
      const content = <><Icon aria-hidden="true" /><span>{item.label}</span></>;
      return item.external
        ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{content}</a>
        : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined} data-home-active={item.id === 'home' && current === 'home' ? 'true' : undefined}>{content}</Link>;
    })}
  </nav>;
}
