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
