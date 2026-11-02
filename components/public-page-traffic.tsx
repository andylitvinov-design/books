"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { safePublicPagePath, sourceFromPublicEntry } from "@/lib/analytics/public-page-traffic.mjs";

const hasCookie = (name: string, value: string) =>
  document.cookie.split("; ").some(part => part === name + "=" + value);

function countAllowed() {
  // An explicit refusal (including one saved before this change) stays binding.
  // New visitors can contribute anonymous aggregates without a tracking cookie.
  return window.location.hostname === "holistichouse.vercel.app" &&
    !hasCookie("hh_public_stats_consent", "denied") &&
    !hasCookie("hh_public_stats_skip", "1");
}

function sendPublicStat(path: string, source: string, event: "landing" | "view" | "click") {
  if (!countAllowed()) return;
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

/** Automatic anonymous aggregate counts on allowlisted public marketing paths only.
 * Google and advertising analytics remain off. */
export function PublicPageTraffic() {
  const pathname = usePathname();
  const originalSource = useRef<string | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = safePublicPagePath(pathname);
    if (!path) {
      lastPath.current = null;
      originalSource.current = null;
      return;
    }

    const recordPage = () => {
      if (!countAllowed() || lastPath.current === path) return;
      if (originalSource.current === null)
        originalSource.current = sourceFromPublicEntry(window.location.href, document.referrer);
      sendPublicStat(path, originalSource.current, lastPath.current === null ? "landing" : "view");
      lastPath.current = path;
    };

    // Record the public landing without a popup. The Privacy-page opt-out
    // event permits counting again after someone deliberately resumes it.
    recordPage();
    window.addEventListener("holistic-house:public-stats-consent", recordPage);

    const recordClick = (event: MouseEvent) => {
      if (!countAllowed() || !event.isTrusted || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element) ||
          target.closest("[data-first-party-consent]") ||
          !target.closest("a[href],button")) return;
      if (safePublicPagePath(window.location.pathname) !== path) return;
      sendPublicStat(path, originalSource.current || "unknown", "click");
    };
    document.addEventListener("click", recordClick);
    return () => {
      window.removeEventListener("holistic-house:public-stats-consent", recordPage);
      document.removeEventListener("click", recordClick);
    };
  }, [pathname]);

  return null;
}
