"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_ANALYTICS_AVAILABLE, isPublicAnalyticsPath } from "@/lib/public-analytics";

const consentCookie = "holistic_house_analytics_consent";
type ConsentChoice = "granted" | "denied";

function savedConsent(): ConsentChoice {
  const value = document.cookie.split("; ").find((item) => item.startsWith(consentCookie + "="))?.split("=")[1];
  return value === "granted" ? "granted" : "denied";
}

function eraseAnalyticsCookies() {
  for (const item of document.cookie.split("; ")) {
    const name = item.split("=")[0];
    if (name === "_ga" || name.startsWith("_ga_")) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    }
  }
}

function applyConsent(value: ConsentChoice) {
  document.documentElement.dataset.analyticsConsent = PUBLIC_ANALYTICS_AVAILABLE ? value : "denied";
  // A loaded Google tag must also respect withdrawal and private-page navigation.
  if (PUBLIC_ANALYTICS_AVAILABLE) window.gtag?.("consent", "update", {
    analytics_storage: value,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (!PUBLIC_ANALYTICS_AVAILABLE || value === "denied") eraseAnalyticsCookies();
  if (PUBLIC_ANALYTICS_AVAILABLE && value === "granted") window.dispatchEvent(new Event("holistic-house:analytics-consent"));
}

// Synchronize previously saved consent without ever interrupting a visitor.
// No analytics tag is loaded for new visitors: the default is denied.
export function AnalyticsConsent() {
  const pathname = usePathname();

  useEffect(() => {
    applyConsent(isPublicAnalyticsPath(pathname) ? savedConsent() : "denied");
  }, [pathname]);

  return null;
}

// Optional, discoverable controls on the Privacy page, never a floating banner.
export function AnalyticsPreferences() {
  const [choice, setChoice] = useState<ConsentChoice>("denied");

  useEffect(() => {
    setChoice(savedConsent());
  }, []);

  function decide(value: ConsentChoice) {
    document.cookie = `${consentCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    applyConsent(value);
    setChoice(value);
  }

  return (
    <section className="mt-4 rounded-xl border border-stone-300 bg-stone-50 p-4" aria-label="Analytics preferences">
      <p className="m-0 text-sm">
        Analytics is temporarily unavailable while privacy safeguards are verified.
        This version does not load Google Analytics. Your saved preference is kept.
      </p>
      <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Choose analytics setting">
        <button
          type="button"
          onClick={() => decide("granted")}
          disabled={!PUBLIC_ANALYTICS_AVAILABLE}
          aria-pressed={choice === "granted"}
          className="min-h-11 rounded-full border border-stone-500 bg-white px-4 py-2 text-sm text-stone-800"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          aria-pressed={choice === "denied"}
          className="min-h-11 rounded-full border border-stone-500 bg-white px-4 py-2 text-sm text-stone-800"
        >
          Keep analytics off
        </button>
      </div>
      <p aria-live="polite" className="mb-0 mt-3 text-sm">
        Saved preference: <strong>{choice === "granted" ? "On" : "Off"}</strong>
      </p>
    </section>
  );
}


const publicStatsCookie = "hh_public_stats_consent";
const publicStatsChoiceEvent = "holistic-house:public-stats-consent";
function firstPartyCookie(name: string) {
  return document.cookie.split("; ").find(part => part.startsWith(name + "="))?.split("=")[1];
}
export function setFirstPartyConsent(allow: boolean) {
  // Keep both opt-out and explicit resumption durable. Anonymous aggregate
  // counts need no analytics identity cookie and never interrupt visitors.
  document.cookie = publicStatsCookie + "=" + (allow ? "v1" : "denied") +
    "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
  window.dispatchEvent(new Event(publicStatsChoiceEvent));
}

/** First-party anonymous aggregates run without a popup, with an opt-out here.
 * Google/Meta tracking stays disabled and subject to separate consent. */
export function FirstPartyStatsPreferences() {
  const [allowed, setAllowed] = useState(true);
  const [excluded, setExcluded] = useState(false);

  useEffect(() => {
    setAllowed(firstPartyCookie(publicStatsCookie) !== "denied");
    setExcluded(firstPartyCookie("hh_public_stats_skip") === "1");
  }, []);

  function decide(allow: boolean) {
    setFirstPartyConsent(allow);
    setAllowed(allow);
  }
  function exclude(skip: boolean) {
    document.cookie = `hh_public_stats_skip=${skip ? "1" : ""}; Path=/; Max-Age=${skip ? 31536000 : 0}; SameSite=Lax; Secure`;
    setExcluded(skip);
    window.dispatchEvent(new Event(publicStatsChoiceEvent));
  }

  return (
    <section data-first-party-consent className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-label="Anonymous website statistics">
      <p className="m-0 text-sm text-stone-800">
        Automatic first-party aggregate counts cover public-page entrances, page views,
        and button/link clicks using coarse sources such as Google or direct.
        Statistics store no visitor/session IDs, IP addresses, full referring URLs,
        search queries, private account pages, health answers or message texts.
        No tracking cookie is needed to count a visit. We delete aggregates after
        90 days. You can opt out of future counts here. Google and Meta tracking remain off.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Anonymous website statistics consent">
        <button type="button" onClick={() => decide(true)} aria-pressed={allowed}
          className="min-h-11 rounded-full border border-amber-800 bg-white px-4 py-2 text-sm text-amber-950">
          Resume anonymous page counts
        </button>
        <button type="button" onClick={() => decide(false)} aria-pressed={!allowed}
          className="min-h-11 rounded-full border border-stone-500 bg-white px-4 py-2 text-sm text-stone-800">
          Stop counting my visits
        </button>
      </div>
      <label className="mt-3 flex items-center gap-3 text-sm text-stone-900">
        <input type="checkbox" checked={excluded} onChange={event => exclude(event.target.checked)}
          className="h-5 w-5" />
        Exclude visits and clicks from this browser, even after signing out
      </label>
      <p className="mb-0 mt-2 text-xs text-stone-700" aria-live="polite">
        Anonymous counts: {allowed ? "on by default" : "off by choice"} · This browser: {excluded ? "excluded" : "not excluded"}.
        Signed-in website owner visits are always excluded.
      </p>
    </section>
  );
}
