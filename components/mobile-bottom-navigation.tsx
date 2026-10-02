"use client";

import { BookOpen, CircleUserRound, GraduationCap, House, Sparkles, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { PublicLocale } from '@/lib/public-locales';
import { activeNavigationId, getSiteNavigation, navigationCopy } from '@/lib/site-navigation-model';

import { useNavigationLocale } from './use-navigation-locale';

const icons = { home: House, library: BookOpen, services: Sparkles, academy: GraduationCap, about: UserRound, cabinet: CircleUserRound };

export function MobileBottomNavigation({ initialLocale = 'en' }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname();
  const locale = useNavigationLocale(initialLocale);
  const nav = useRef<HTMLElement>(null);
  const hidden = /^\/(admin(?:\/|$)|(?:ru|en)\/prescriptions(?:\/|$)|document-preview(?:\/|$))/.test(pathname);

  useEffect(() => {
    const element = nav.current;
    const update = () => document.body.style.setProperty('--ia222-bottom-height', `${element?.getBoundingClientRect().height ?? 0}px`);
    update();
    const observer = element ? new ResizeObserver(update) : undefined;
    if (element) observer?.observe(element);
    return () => {
      observer?.disconnect();
      document.body.style.removeProperty('--ia222-bottom-height');
    };
  }, [hidden, locale]);

  if (hidden) return null;
  const current = activeNavigationId(pathname);

  return <nav ref={nav} aria-label={navigationCopy[locale].mobile} className="mobile-bottom-navigation ia222-bottom-navigation">
    {getSiteNavigation(locale).map(item => {
      const Icon = icons[item.id];
      const content = <><Icon aria-hidden="true" /><span>{item.label}</span></>;
      return item.external
        ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{content}</a>
        : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined} data-home-active={item.id === 'home' && current === 'home' ? 'true' : undefined}>{content}</Link>;
    })}
  </nav>;
}
