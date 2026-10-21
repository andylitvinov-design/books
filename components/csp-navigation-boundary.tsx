"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isNativePsiAlchemy } from "@/lib/native/client";

declare global {
  interface Window {
    __hhOwnsHistoryEntry?: () => boolean;
    __cspPreHydration?: { destination: string | null; dispose: () => void };
  }
}

function privatePath(pathname: string) {
  const decoded = (() => { try { return decodeURIComponent(pathname) } catch { return pathname } })().replace(/\/+/g, '/')
  return /^\/(en|ru|es)\/client(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/report(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/prescriptions\//.test(decoded)
    || /^\/(ru|en)\/app(?:\/|$)/.test(decoded)
    || /^\/api\/app(?:\/|$)/.test(decoded)
    || decoded.startsWith('/api/client')
    || decoded.startsWith('/api/prescriptions/')
    || decoded.startsWith('/api/prescription-access')
    || decoded.startsWith('/api/admin/')
    || /^\/admin(?:\/|$)/.test(decoded)
    || decoded.startsWith('/document-preview/')
}

function cspClassForPath(pathname: string) {
  // Must match middleware.ts. Otherwise the uploader continuously replaces its
  // own URL after hydration, making iPhone scrolling and taps impossible.
  if (pathname === "/admin/youtube-upload") return "youtube-uploader";
  if (/^\/(en|ru|es)\/app\/practice\/?$/.test(pathname)) return "practitioner-youtube";
  if (pathname === "/admin/videos") return "video-manager";
  if (privatePath(pathname)) return "private";
  if (/^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(pathname)) return "tantra-media";
  if (pathname.startsWith("/api/")) return "restricted";
  return "public-video";
}

/**
 * Next client navigation keeps the CSP of the document that was first loaded.
 * Reload when navigation crosses a CSP class, so a public iframe never
 * inherits a restrictive document policy and a private document never inherits
 * a public embed policy. Foreign-document history entries also need a fresh
 * router instead of replaying a tree from an earlier document.
 */
export function CspNavigationBoundary() {
  const pathname = usePathname();
  const documentClass = useRef<string | undefined>(undefined);
  const interruptedRouterNavigation = useRef(false);

  useEffect(() => {
    documentClass.current ??= document.body.dataset.cspClass;
    const crossesPolicy = (url: URL) => url.origin === window.location.origin
      && documentClass.current && documentClass.current !== cspClassForPath(url.pathname);
    const onClick = (event: MouseEvent) => {
      // Native links keep their existing private-link and external-browser policy.
      if (isNativePsiAlchemy() || event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (!crossesPolicy(url)) return;
      // Capture before Next's link handler commits a page under the old policy.
      event.preventDefault();
      window.location.assign(url.href);
    };
    const ownsCurrentEntry = window.__hhOwnsHistoryEntry;
    const onPopState = (event?: Event) => {
      const url = new URL(window.location.href);
      const restoresInterruptedRouter = event?.type === "pageshow"
        && (event as PageTransitionEvent).persisted && interruptedRouterNavigation.current;
      // Next restores its history tree on persisted pageshow as well as popstate.
      const restoresForeignRouter = (event?.type === "popstate"
        || (event?.type === "pageshow" && (event as PageTransitionEvent).persisted))
        && ownsCurrentEntry?.() === false;
      if (!crossesPolicy(url) && !restoresInterruptedRouter && !restoresForeignRouter) return;
      // Reload foreign-document history trees even when the CSP class matches.
      // Prevent Next from replaying the stale canonical URL while this document
      // is being replaced. Capture runs before the router's history listeners.
      event?.stopImmediatePropagation();
      interruptedRouterNavigation.current = true;
      window.location.replace(url.href);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    window.addEventListener("pageshow", onPopState, true);
    // Take over only after listeners exist. The parser-time guard preserves a
    // Back/Forward destination if Next hydration replays its old canonical URL.
    const earlyNavigation = window.__cspPreHydration;
    earlyNavigation?.dispose();
    delete window.__cspPreHydration;
    if (earlyNavigation?.destination) {
      interruptedRouterNavigation.current = true;
      window.location.replace(earlyNavigation.destination);
    } else {
      onPopState();
    }
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      window.removeEventListener("pageshow", onPopState, true);
    };
  }, []);

  useEffect(() => {
    documentClass.current ??= document.body.dataset.cspClass;
    if (documentClass.current && documentClass.current !== cspClassForPath(window.location.pathname)) {
      // Programmatic router/history navigation also needs a fresh document.
      // Replace preserves the history entry and pins the destination before
      // Next can replay an old canonical URL. On bfcache restore, discard the
      // interrupted router state even when the original document policy fits.
      interruptedRouterNavigation.current = true;
      window.location.replace(window.location.href);
    }
  }, [pathname]);

  return null;
}

