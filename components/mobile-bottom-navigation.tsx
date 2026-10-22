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
    if (!element) {
      document.body.style.removeProperty('--ia222-bottom-height');
      return;
    }

    // iOS Safari/Chrome can leave a fixed layer anchored to a stale layout
    // viewport after scrolling, dismissing the keyboard or restoring a tab.
    // Measure the visible viewport rather than assuming CSS bottom: 0 stayed
    // attached. Correct only a real gap, keeping the native safe-area padding.
    const viewport = window.visualViewport;
    let frame: number | null = null;
    let correction = 0;
    const measureHeight = () => {
      document.body.style.setProperty('--ia222-bottom-height', `${element.getBoundingClientRect().height}px`);
    };
    const dockToViewport = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const rect = element.getBoundingClientRect();
        // The existing focused-editor CSS hides the bar while the keyboard is
        // visible. Do not retain that transient displacement after blur.
        if (rect.height < 1 || rect.width < 1) {
          correction = 0;
          element.style.removeProperty('transform');
          return;
        }
        const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        if (!Number.isFinite(visibleBottom)) return;
        const gap = visibleBottom - rect.bottom;
        if (Math.abs(gap) > 1) {
          correction += gap;
          element.style.transform = `translate3d(0, ${correction}px, 0)`;
        }
      });
    };
    const onLayoutChange = () => { measureHeight(); dockToViewport(); };
    onLayoutChange();
    const observer = new ResizeObserver(onLayoutChange);
    observer.observe(element);
    window.addEventListener('scroll', dockToViewport, { passive: true });
    window.addEventListener('resize', onLayoutChange, { passive: true });
    viewport?.addEventListener('scroll', dockToViewport, { passive: true });
    viewport?.addEventListener('resize', onLayoutChange, { passive: true });
    window.addEventListener('pageshow', onLayoutChange);
    document.addEventListener('focusin', dockToViewport);
    document.addEventListener('focusout', onLayoutChange);
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', dockToViewport);
      window.removeEventListener('resize', onLayoutChange);
      viewport?.removeEventListener('scroll', dockToViewport);
      viewport?.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('pageshow', onLayoutChange);
      document.removeEventListener('focusin', dockToViewport);
      document.removeEventListener('focusout', onLayoutChange);
      element.style.removeProperty('transform');
      document.body.style.removeProperty('--ia222-bottom-height');
    };
  }, [hidden, locale]);
  if (hidden) return null;
  const current = activeCompactNavigationId(pathname);
  const mobileItems = getCompactNavigation(locale);
  return <nav ref={nav} aria-label={navigationCopy[locale].mobile} className="mobile-bottom-navigation ia222-bottom-navigation">
    {/* Keep six high-priority destinations on the bottom bar. Ideas is here;
        Cabinet remains in the top header, with the full Library in the expanded menu. */}
    {mobileItems.map(item => {
      const Icon = compactNavigationIcons[item.id as keyof typeof compactNavigationIcons];
      const content = <><Icon aria-hidden="true" /><span>{item.label}</span></>;
      return item.external
        ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{content}</a>
        : <Link key={item.id} data-nav-item={item.id} href={item.href} prefetch={false} aria-current={current === item.id ? 'page' : undefined} data-home-active={item.id === 'home' && current === 'home' ? 'true' : undefined}>{content}</Link>;
    })}
  </nav>;
}
