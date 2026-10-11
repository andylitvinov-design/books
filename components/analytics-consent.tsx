"use client";

import { useEffect, useState } from "react";
import { isPublicAnalyticsPath } from "@/lib/public-analytics";
import { usePathname } from "next/navigation";

const consentCookie = "holistic_house_analytics_consent";

function savedConsent() {
  return document.cookie.split("; ").find((item) => item.startsWith(consentCookie + "="))?.split("=")[1];
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<string | null>(null);
  const isPublic = isPublicAnalyticsPath(pathname);

  useEffect(() => {
    const current = isPublic ? savedConsent() : "denied";
    document.documentElement.dataset.analyticsConsent = current === "granted" ? "granted" : "denied";
    setChoice(current ?? null);
    if (current === "granted") window.dispatchEvent(new Event("holistic-house:analytics-consent"));
  }, [isPublic, pathname]);

  function decide(value: "granted" | "denied") {
    document.cookie = `${consentCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    document.documentElement.dataset.analyticsConsent = value;
    setChoice(value);
    if (value === "granted") window.dispatchEvent(new Event("holistic-house:analytics-consent"));
  }

  if (!isPublic || choice) return null;
  return <aside className="analytics-consent" aria-label="Analytics privacy choice">
    <p>Allow privacy-first site analytics? We measure public page visits and selected enquiry steps only. We never send questionnaire answers, names, email, drawings, scores, reports, or health information.</p>
    <div><button type="button" onClick={() => decide("granted")}>Allow analytics</button><button type="button" onClick={() => decide("denied")}>No thanks</button></div>
  </aside>;
}
