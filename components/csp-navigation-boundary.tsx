"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function cspClassForPath(pathname: string) {
  if (pathname === "/admin/videos") return "video-manager";
  if (/^\/(en|ru|es)\/(client|app)(?:\/|$)/.test(pathname)
    || /^\/(en|ru)\/(report|prescriptions)(?:\/|$)/.test(pathname)
    || /^\/(api\/app|api\/client|api\/prescriptions|api\/prescription-access|api\/admin)(?:\/|$)/.test(pathname)
    || /^\/(admin|document-preview)(?:\/|$)/.test(pathname)) return "private";
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
    if (documentClass.current && documentClass.current !== cspClassForPath(pathname)) {
      window.location.assign(window.location.href);
    }
  }, [pathname]);

  return null;
}
