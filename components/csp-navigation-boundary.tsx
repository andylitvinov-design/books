"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isNativePsiAlchemy } from "@/lib/native/client";

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
  if (pathname === "/admin/videos") return "video-manager";
  if (privatePath(pathname)) return "private";
  if (/^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(pathname)) return "tantra-media";
  if (pathname.startsWith("/api/")) return "restricted";
  return "public-video";
}

/**
 * Next client navigation keeps the CSP of the document that was first loaded.
 * Reload only when navigation crosses a CSP class, so a public iframe never
 * inherits a restrictive document policy and a private document never inherits
 * a public embed policy.
 */
export function CspNavigationBoundary() {
  const pathname = usePathname();
  const documentClass = useRef<string | undefined>(undefined);

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
    const onPopState = () => {
      if (crossesPolicy(new URL(window.location.href))) window.location.reload();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPopState);
    // Back can occur before hydration installs listeners, and bfcache restores
    // a document without remounting React. Always compare the actual address.
    onPopState();
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPopState);
    };
  }, []);

  useEffect(() => {
    documentClass.current ??= document.body.dataset.cspClass;
    if (documentClass.current && documentClass.current !== cspClassForPath(window.location.pathname)) {
      // Programmatic router/history navigation also needs a fresh document.
      // Reload, rather than assign, preserves the existing Back/Forward entry.
      window.location.reload();
    }
  }, [pathname]);

  return null;
}

