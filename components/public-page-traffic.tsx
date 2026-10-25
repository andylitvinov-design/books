"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { safePublicPagePath, sourceFromPublicEntry } from "@/lib/analytics/public-page-traffic.mjs";

const hasCookie = (name: string, value: string) =>
  document.cookie.split("; ").some(part => part === name + "=" + value);

function optedIn() {
  return hasCookie("hh_public_stats_consent", "v1") &&
    !hasCookie("hh_public_stats_skip", "1");
}

function sendPublicStat(path: string, source: string, event: "landing" | "view" | "click") {
  if (!optedIn()) return;
  // Page, coarse source and event only: no arbitrary URL, campaign details,
  // user or session identifier, input values, or referral query parameters.
  void fetch("/api/analytics/public-page", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, source, event }),
  }).catch(() => {});
}

/** Public marketing paths only; Google and advertising analytics remain on hold. */
export function PublicPageTraffic() {
  const pathname = usePathname();
  const originalSource = useRef<string | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = safePublicPagePath(pathname);
    if (!path || !optedIn()) return;
    if (originalSource.current === null) {
      originalSource.current = sourceFromPublicEntry(window.location.href, document.referrer);
    }
    if (lastPath.current !== path) {
      sendPublicStat(path, originalSource.current, lastPath.current === null ? "landing" : "view");
      lastPath.current = path;
    }

    const recordClick = (event: MouseEvent) => {
      if (!event.isTrusted || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("a[href],button")) return;
      if (safePublicPagePath(window.location.pathname) !== path) return;
      sendPublicStat(path, originalSource.current || "unknown", "click");
    };
    document.addEventListener("click", recordClick);
    return () => document.removeEventListener("click", recordClick);
  }, [pathname]);

  return null;
}
