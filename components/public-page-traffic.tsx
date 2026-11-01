"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { safePublicPagePath, sourceFromPublicEntry } from "@/lib/analytics/public-page-traffic.mjs";
import { ENQUIRY_ATTRIBUTION_COOKIE, ENQUIRY_ATTRIBUTION_TTL, advanceEnquiryAttribution } from "@/lib/analytics/enquiry-attribution.mjs";

const readCookie = (name: string) => document.cookie.split("; ").find(part => part.startsWith(name + "="))?.slice(name.length + 1) || "";
const hasCookie = (name: string, value: string) =>
  document.cookie.split("; ").some(part => part === name + "=" + value);

function optedIn() {
  return hasCookie("hh_public_stats_consent", "v1") &&
    !hasCookie("hh_public_stats_skip", "1");
}
function enquiryOptedIn() {
  return hasCookie("hh_enquiry_attribution_consent", "v1") && !hasCookie("hh_public_stats_skip", "1");
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
  const lastAttributionPath = useRef<string | null>(null);
  const attributionObservedInDocument = useRef(false);

  useEffect(() => {
    const path = safePublicPagePath(pathname);
    if (!path) {
      const recordGap = (event?: Event) => {
        if (!enquiryOptedIn()) {
          document.cookie = ENQUIRY_ATTRIBUTION_COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax";
          attributionObservedInDocument.current = false;
          return;
        }
        // Preserve only an already-approved first touch; a private or unknown
        // page is represented by a gap, never by its URL or query parameters.
        const priorCookie = readCookie(ENQUIRY_ATTRIBUTION_COOKIE);
        const gap = advanceEnquiryAttribution(priorCookie, {
          path: pathname, href: window.location.href, referrer: document.referrer,
          contextUnknown: !priorCookie && (Boolean(event) || attributionObservedInDocument.current),
        });
        if (gap) {
          document.cookie = ENQUIRY_ATTRIBUTION_COOKIE + "=" + gap +
            "; Path=/; SameSite=Lax; Max-Age=" + ENQUIRY_ATTRIBUTION_TTL +
            (window.location.protocol === "https:" ? "; Secure" : "");
          attributionObservedInDocument.current = true;
        }
      };
      recordGap();
      window.addEventListener("holistic-house:public-stats-consent", recordGap);
      lastPath.current = null;
      lastAttributionPath.current = null;
      originalSource.current = null;
      return () => window.removeEventListener("holistic-house:public-stats-consent", recordGap);
    }

    const recordPage = (event?: Event) => {
      if (!enquiryOptedIn()) {
        document.cookie = ENQUIRY_ATTRIBUTION_COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax";
        lastAttributionPath.current = null;
        attributionObservedInDocument.current = false;
      } else if (lastAttributionPath.current !== path || !readCookie(ENQUIRY_ATTRIBUTION_COOKIE)) {
        // This separate consent explicitly covers linking source context to an enquiry.
        const priorCookie = readCookie(ENQUIRY_ATTRIBUTION_COOKIE);
        const nextCookie = advanceEnquiryAttribution(priorCookie, {
          path, href: window.location.href, referrer: document.referrer,
          contextUnknown: !priorCookie && (Boolean(event) || attributionObservedInDocument.current),
        });
        if (nextCookie) {
          document.cookie = ENQUIRY_ATTRIBUTION_COOKIE + "=" + nextCookie +
            "; Path=/; SameSite=Lax; Max-Age=" + ENQUIRY_ATTRIBUTION_TTL +
            (window.location.protocol === "https:" ? "; Secure" : "");
          lastAttributionPath.current = path;
          attributionObservedInDocument.current = true;
        }
      }
      if (!optedIn()) { lastPath.current = null; originalSource.current = null; return; }
      if (lastPath.current === path) return;
      if (originalSource.current === null)
        originalSource.current = sourceFromPublicEntry(window.location.href, document.referrer);
      sendPublicStat(path, originalSource.current, lastPath.current === null ? "landing" : "view");
      lastPath.current = path;
    };

    // A visitor who explicitly consents on the current landing page should
    // count that landing without requiring an additional route navigation.
    recordPage();
    window.addEventListener("holistic-house:public-stats-consent", recordPage);

    const recordClick = (event: MouseEvent) => {
      if (!optedIn() || !event.isTrusted || event.defaultPrevented) return;
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
