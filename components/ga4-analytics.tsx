"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_ANALYTICS_AVAILABLE, PUBLIC_ANALYTICS_EVENTS, isPublicAnalyticsPath, type PublicAnalyticsEvent } from "@/lib/public-analytics";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; }
}

function hasConsent() {
  return document.documentElement.dataset.analyticsConsent === "granted";
}

function isCanonicalProductionHost() {
  return window.location.hostname === "holistichouse.vercel.app";
}

function loadGoogleTag(measurementId: string, nonce?: string) {
  if (window.gtag) return window.gtag;
  window.dataLayer = window.dataLayer || [];
  const gtag: Gtag = (...args) => { window.dataLayer?.push(args); };
  window.gtag = gtag;
  gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: false });
  const script = document.createElement("script");
  script.id = "holistic-house-google-tag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  if (nonce) script.nonce = nonce;
  document.head.appendChild(script);
  return gtag;
}

function validEvent(value: unknown): value is PublicAnalyticsEvent {
  return typeof value === "string" && (PUBLIC_ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export function Ga4Analytics({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!PUBLIC_ANALYTICS_AVAILABLE || !measurementId || !isCanonicalProductionHost() || !isPublicAnalyticsPath(pathname)) return;
    const sendPageView = () => {
      if (!hasConsent() || lastPage.current === pathname) return;
      const gtag = loadGoogleTag(measurementId, nonce);
      gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      gtag("event", "page_view", { page_location: window.location.origin + pathname, page_path: pathname, page_title: document.title });
      lastPage.current = pathname;
    };
    const sendAcquisition = (event: Event) => {
      const name = (event as CustomEvent<{ event?: unknown }>).detail?.event;
      if (!hasConsent() || !validEvent(name)) return;
      loadGoogleTag(measurementId, nonce)("event", name);
    };
    window.addEventListener("holistic-house:analytics-consent", sendPageView);
    window.addEventListener("holistic-house:acquisition", sendAcquisition);
    sendPageView();
    return () => {
      window.removeEventListener("holistic-house:analytics-consent", sendPageView);
      window.removeEventListener("holistic-house:acquisition", sendAcquisition);
    };
  }, [measurementId, nonce, pathname]);

  return null;
}
