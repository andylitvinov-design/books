"use client";
import { compactNavigationIcons } from './compact-navigation-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { PublicLocale } from '@/lib/public-locales';
import { activeCompactNavigationId, getCompactNavigation, isPublicTestDiscoveryPath, navigationCopy } from '@/lib/site-navigation-model';
import { useNavigationLocale } from './use-navigation-locale';

// Compact two-line visual labels. Full translated names remain on aria-label.
const mobileBarLabels = {
  en: { home: 'Home', analysis: 'Free Analysis', courses: 'Courses', profile: 'My Profile', alchemy: 'Psychic Alchemy', pro: 'Pro', temple: 'Holistic Support' },
  ru: { home: 'Домой', analysis: 'Разбор', courses: 'Курсы', profile: 'Профиль', alchemy: 'Алхимия души', pro: 'Pro', temple: 'Поддержка' },
  es: { home: 'Inicio', analysis: 'Análisis', courses: 'Cursos', profile: 'Mi perfil', alchemy: 'Alquimia del Alma', pro: 'Pro', temple: 'Apoyo holístico' },
} as const;

export function MobileBottomNavigation({ initialLocale = 'en' }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname();
  const locale = useNavigationLocale(initialLocale);
  const nav = useRef<HTMLElement>(null);
  // /client and /client/tests are public test-selection pages; other client
  // paths, private account routes and documents must keep the bar hidden.
  const clientRoute = /^\/(?:ru|en|es)\/client(?:\/|$)/.test(pathname);
  const hidden = /^\/(?:ru|en|es)\/holistic-support\/mobile(?:\/|$)/.test(pathname)
    || /^\/(?:admin|document-preview)(?:\/|$)/.test(pathname)
    || /^\/(?:ru|en|es)\/(?:prescriptions|app)(?:\/|$)/.test(pathname)
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
    let heightPress: { pointerId: number; value: string; priority: string } | null = null;
    let heightReleaseTimer: number | null = null;
    const measureHeight = () => {
      if (heightPress) return;
      document.body.style.setProperty('--ia222-bottom-height', `${element.getBoundingClientRect().height}px`);
    };
    const finishHeightPress = () => {
      if (heightReleaseTimer !== null) window.clearTimeout(heightReleaseTimer);
      heightReleaseTimer = null;
      if (!heightPress) return;
      const saved = heightPress;
      heightPress = null;
      // WebKit can reject normal-priority custom-property replacements while
      // our temporary important pin exists. Remove only that owned pin first.
      document.body.style.removeProperty('--ia222-bottom-height');
      if (saved.value) document.body.style.setProperty('--ia222-bottom-height', saved.value, saved.priority);
      else document.body.style.removeProperty('--ia222-bottom-height');
      measureHeight();
    };
    const onConsentPointerDown = (event: PointerEvent) => {
      if (!event.isTrusted || !event.isPrimary || event.button !== 0) return;
      finishHeightPress();
      if (!window.matchMedia('(max-width: 767px)').matches || !(event.target instanceof Element)) return;
      const label = event.target.closest('label');
      const control = event.target.closest<HTMLInputElement>('input[type="checkbox"]')
        || label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      const channelButton = control ? null : event.target.closest<HTMLButtonElement>('button[data-contact-channel-submit]');
      const form = control?.form || channelButton?.form;
      const editor = document.activeElement;
      if (!form || !(editor instanceof HTMLInputElement) || editor.type !== 'tel' || editor.form !== form) return;
      const fromConsent = control && !control.disabled
        && form.closest('[data-contact-channel-chooser][data-compact-phone-trigger="true"]');
      // The current chooser's phone-to-channel gesture needs the same computed
      // clearance pin; hiding the dock alone does not preserve root geometry.
      const phoneField = editor.closest('[data-phone-country-input]');
      const fromPhoneChannel = channelButton?.isConnected === true && !channelButton.disabled
        && form.closest('[data-contact-channel-chooser][data-reiki-phone-enquiry]')
        && phoneField;
      if (!fromConsent && !fromPhoneChannel) return;
      // Focused-editor CSS can reserve zero dock space. Preserve that computed
      // geometry through the real press, not an assumed nonzero dock height.
      // Phone blur must not resize the root scroller between down and release.
      const height = window.getComputedStyle(document.body).getPropertyValue('--ia222-bottom-height');
      if (!height.trim()) return;
      heightPress = { pointerId: event.pointerId,
        value: document.body.style.getPropertyValue('--ia222-bottom-height'),
        priority: document.body.style.getPropertyPriority('--ia222-bottom-height') };
      document.body.style.setProperty('--ia222-bottom-height', height, 'important');
    };
    const onConsentPointerUp = (event: PointerEvent) => {
      if (!heightPress || heightPress.pointerId !== event.pointerId || heightReleaseTimer !== null) return;
      // Physical release resolves before this next-task flush; a delayed
      // compatibility click retains the browser's resolved down/up target.
      // Also release when removal/disable suppresses that click altogether.
      const releasing = heightPress;
      heightReleaseTimer = window.setTimeout(() => {
        if (heightPress !== releasing) return;
        heightReleaseTimer = null;
        finishHeightPress();
      }, 0);
    };
    const onConsentPointerCancel = (event: PointerEvent) => {
      if (heightPress?.pointerId === event.pointerId) finishHeightPress();
    };
    const onConsentVisibility = () => { if (document.visibilityState === 'hidden') finishHeightPress(); };
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
    document.addEventListener('pointerdown', onConsentPointerDown, { capture: true, passive: true });
    document.addEventListener('pointerup', onConsentPointerUp, { capture: true, passive: true });
    document.addEventListener('pointercancel', onConsentPointerCancel, { capture: true, passive: true });
    document.addEventListener('keydown', finishHeightPress, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onConsentVisibility);
    window.addEventListener('blur', finishHeightPress);
    window.addEventListener('pagehide', finishHeightPress);
    return () => {
      finishHeightPress();
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', dockToViewport);
      window.removeEventListener('resize', onLayoutChange);
      viewport?.removeEventListener('scroll', dockToViewport);
      viewport?.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('pageshow', onLayoutChange);
      document.removeEventListener('focusin', dockToViewport);
      document.removeEventListener('focusout', onLayoutChange);
      document.removeEventListener('pointerdown', onConsentPointerDown, true);
      document.removeEventListener('pointerup', onConsentPointerUp, true);
      document.removeEventListener('pointercancel', onConsentPointerCancel, true);
      document.removeEventListener('keydown', finishHeightPress, true);
      document.removeEventListener('visibilitychange', onConsentVisibility);
      window.removeEventListener('blur', finishHeightPress);
      window.removeEventListener('pagehide', finishHeightPress);
      element.style.removeProperty('transform');
      document.body.style.removeProperty('--ia222-bottom-height');
    };
  }, [hidden, locale]);
  useEffect(() => {
    // Keep the fixed dock from taking the release half of an editor-to-channel
    // gesture. CSS hides it during text focus, but input blur precedes mouseup.
    // Do not change focus, capture the pointer, cancel events or invoke actions.
    const element = nav.current;
    if (!element) return;
    let activation: { pointerId: number; button: HTMLButtonElement; released: boolean;
      visibility: string; visibilityPriority: string; pointerEvents: string; pointerEventsPriority: string } | null = null;
    let completionTimer: number | null = null;
    const restore = () => {
      if (completionTimer !== null) window.clearTimeout(completionTimer);
      completionTimer = null;
      if (!activation) return;
      const saved = activation;
      activation = null;
      for (const [property, value, priority] of [
        ['visibility', saved.visibility, saved.visibilityPriority],
        ['pointer-events', saved.pointerEvents, saved.pointerEventsPriority],
      ]) {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      restore();
      if (!window.matchMedia('(max-width: 767px)').matches || !(event.target instanceof Element)) return;
      const channelButton = event.target.closest<HTMLButtonElement>('button[data-compact-channel]');
      const phoneChannelButton = channelButton ? null : event.target.closest<HTMLButtonElement>('button[data-contact-channel-submit]');
      const collectionButton = channelButton || phoneChannelButton ? null : event.target.closest<HTMLButtonElement>('button[data-test-collection]');
      const button = channelButton || phoneChannelButton || collectionButton;
      const editor = document.activeElement;
      if (!button || button.disabled || !(editor instanceof Element)) return;
      const form = channelButton?.closest('form[data-compact-lead-form]');
      const fromContact = form && editor.matches('input[name="contact"]')
        && editor.closest('form[data-compact-lead-form]') === form;
      // The current compact phone chooser uses different controls from the
      // legacy lead form. Its phone blur must not expose the dock mid-click.
      const phoneForm = phoneChannelButton?.closest('form');
      const fromCompactPhone = event.isTrusted && phoneChannelButton?.isConnected === true && phoneForm
        && phoneForm.closest('[data-contact-channel-chooser][data-reiki-phone-enquiry]')
        && editor.matches('input[type="tel"]') && editor.closest('[data-phone-country-input]')
        && editor.closest('form') === phoneForm;
      const pickerSelector = '[data-prelogin-test-picker][data-public-test-picker="true"]';
      const picker = collectionButton?.closest(pickerSelector);
      // A public collection sits outside the search form. Keep its native
      // release reachable when search blur restores the overlapping dock.
      const fromPublicSearch = event.isTrusted && collectionButton?.isConnected === true && picker
        && editor.matches('input#hh-test-hero-search[type="search"]') && editor.closest(pickerSelector) === picker;
      if (!fromContact && !fromCompactPhone && !fromPublicSearch) return;
      activation = { pointerId: event.pointerId, button, released: false,
        visibility: element.style.getPropertyValue('visibility'), visibilityPriority: element.style.getPropertyPriority('visibility'),
        pointerEvents: element.style.getPropertyValue('pointer-events'), pointerEventsPriority: element.style.getPropertyPriority('pointer-events') };
      element.style.setProperty('visibility', 'hidden');
      element.style.setProperty('pointer-events', 'none');
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!activation || event.pointerId !== activation.pointerId || activation.released) return;
      // Touch can implicitly capture the pointer: event.target alone does not
      // establish that release is still over the original button.
      const hit = Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? document.elementFromPoint(event.clientX, event.clientY) : null;
      if (!activation.button.isConnected || activation.button.disabled || !(event.target instanceof Node)
        || !activation.button.contains(event.target) || !hit || !activation.button.contains(hit)) { restore(); return; }
      activation.released = true;
      const completing = activation;
      // End this completed gesture on the next timer task even if a browser
      // suppresses mouseup/click (or a later handler removes/disables the button).
      // Never use a microtask: compatibility mouseup may still need the hold.
      // Delayed clicks keep their native pointerdown/up targets; do not synthesize one.
      completionTimer = window.setTimeout(() => {
        if (activation !== completing) return;
        completionTimer = null;
        restore();
      }, 0);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (activation?.pointerId === event.pointerId) restore();
    };
    // The native mouseup target is already resolved here. Restoring now does not
    // retarget that event, and also releases a gesture whose click is suppressed.
    // Pointer-only activation instead restores at click, after its target exists.
    const onMouseUp = () => { if (activation?.released) restore(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') restore(); };
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    document.addEventListener('pointercancel', onPointerCancel, { capture: true, passive: true });
    document.addEventListener('mouseup', onMouseUp, { capture: true, passive: true });
    for (const type of ['click', 'contextmenu', 'dragstart', 'keydown'])
      document.addEventListener(type, restore, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', restore);
    window.addEventListener('pagehide', restore);
    return () => {
      restore();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      for (const type of ['click', 'contextmenu', 'dragstart', 'keydown'])
        document.removeEventListener(type, restore, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', restore);
      window.removeEventListener('pagehide', restore);
    };
  }, [hidden, locale]);
  if (hidden) return null;
  const current = activeCompactNavigationId(pathname);
  const mobileItems = getCompactNavigation(locale);
  return <nav ref={nav} aria-label={navigationCopy[locale].mobile} className="mobile-bottom-navigation ia222-bottom-navigation">
    {/* Seven public journeys; Temple Insights and legacy topics stay in the expanded menu. */}
    {mobileItems.map(item => {
      const Icon = compactNavigationIcons[item.id as keyof typeof compactNavigationIcons];
      const shortLabel = mobileBarLabels[locale][item.id as keyof typeof mobileBarLabels.en];
      const content = <><Icon aria-hidden="true" /><span>{shortLabel}</span></>;
      return item.external
        ? <a key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} rel="noreferrer">{content}</a>
        : <Link key={item.id} data-nav-item={item.id} href={item.href} aria-label={item.ariaLabel} prefetch={false} aria-current={current === item.id ? 'page' : undefined} data-home-active={item.id === 'home' && current === 'home' ? 'true' : undefined}>{content}</Link>;
    })}
  </nav>;
}
