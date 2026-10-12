"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_ANALYTICS_EVENTS, analyticsDocumentResetPending, isPublicAnalyticsPath, ownsPublicAnalyticsTag, registerPublicAnalyticsTag, resetAnalyticsDocument, type PublicAnalyticsEvent, type PublicAnalyticsGtag } from "@/lib/public-analytics";

const protectedMeasurements = new Map<string, { externallyDisabled: boolean }>();

function hasConsent() {
  return document.documentElement.dataset.analyticsConsent === "granted";
}

function isCanonicalProductionHost() {
  return window.location.hostname === "holistichouse.vercel.app";
}

function installCollectionBoundary(measurementId: string) {
  if (protectedMeasurements.has(measurementId)) return true;
  const key = `ga-disable-${measurementId}` as const;
  const descriptor = Object.getOwnPropertyDescriptor(window, key);
  // Do not override somebody else's accessor or non-configurable opt-out.
  if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set)) return false;
  const state = { externallyDisabled: window[key] === true };
  Object.defineProperty(window, key, {
    configurable: false,
    get() {
      // Google reads this at event processing time. Inspect the real URL so an
      // SPA navigation is protected even before React's route effect runs.
      return state.externallyDisabled || analyticsDocumentResetPending() || !ownsPublicAnalyticsTag(measurementId)
        || !isCanonicalProductionHost() || !hasConsent()
        || !isPublicAnalyticsPath(window.location.pathname);
    },
    set(value: boolean) { state.externallyDisabled = value === true; },
  });
  protectedMeasurements.set(measurementId, state);
  return true;
}

function collectionAllowed(measurementId: string, pathname: string) {
  return isCanonicalProductionHost() && hasConsent()
    && pathname === window.location.pathname && isPublicAnalyticsPath(pathname)
    && !analyticsDocumentResetPending() && !protectedMeasurements.get(measurementId)?.externallyDisabled
    && (!window.gtag || (ownsPublicAnalyticsTag(measurementId) && window[`ga-disable-${measurementId}`] === false));
}

function publicPageContext(pathname: string) {
  return {
    page_location: window.location.origin + pathname,
    page_path: pathname,
    // A private page title can briefly survive an SPA transition. Do not read it.
    page_title: "Holistic House",
    // Referrer URLs can contain private paths, tokens or form data.
    page_referrer: "",
  };
}

function loadGoogleTag(measurementId: string, nonce?: string) {
  if (window.gtag) {
    // An unrelated/old global does not prove this destination was initialized.
    // Fail closed rather than inheriting unknown queues or routing elsewhere.
    if (!ownsPublicAnalyticsTag(measurementId)) return null;
    window.gtag("set", publicPageContext(window.location.pathname));
    return window.gtag;
  }
  // A pre-existing queue may contain another destination's commands. Loading
  // our SDK must not activate an unowned queue, even without a gtag global.
  if (window.dataLayer !== undefined) return null;
  window.dataLayer = [];
  const gtag: PublicAnalyticsGtag = function () {
    // Google dispatches Arguments as gtag commands; arrays are data-model calls.
    // eslint-disable-next-line prefer-rest-params -- The Google tag requires Arguments.
    window.dataLayer?.push(arguments);
  };
  window.gtag = gtag;
  registerPublicAnalyticsTag(measurementId, gtag);
  gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  // Set sanitized defaults before config, including for Google-generated events.
  gtag("set", publicPageContext(window.location.pathname));
  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: false, cookie_domain: "none", allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.id = "holistic-house-google-tag";
  script.async = true;
  script.referrerPolicy = "no-referrer";
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
    if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId) || !installCollectionBoundary(measurementId)) return;
    if (!isCanonicalProductionHost() || !isPublicAnalyticsPath(pathname)) {
      lastPage.current = null;
      resetAnalyticsDocument();
      return;
    }
    const sendPageView = () => {
      if (!collectionAllowed(measurementId, pathname) || lastPage.current === pathname) return;
      const gtag = loadGoogleTag(measurementId, nonce);
      if (!gtag) return;
      gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      gtag("event", "page_view", { ...publicPageContext(pathname), send_to: measurementId });
      lastPage.current = pathname;
    };
    const synchronizeConsent = () => {
      if (!collectionAllowed(measurementId, pathname)) {
        lastPage.current = null;
        return;
      }
      sendPageView();
    };
    const sendAcquisition = (event: Event) => {
      const name = (event as CustomEvent<{ event?: unknown }>).detail?.event;
      if (!collectionAllowed(measurementId, pathname) || !validEvent(name)) return;
      loadGoogleTag(measurementId, nonce)?.("event", name, { ...publicPageContext(pathname), send_to: measurementId });
    };
    window.addEventListener("holistic-house:analytics-consent", synchronizeConsent);
    window.addEventListener("holistic-house:acquisition", sendAcquisition);
    synchronizeConsent();
    return () => {
      window.removeEventListener("holistic-house:analytics-consent", synchronizeConsent);
      window.removeEventListener("holistic-house:acquisition", sendAcquisition);
    };
  }, [measurementId, nonce, pathname]);

  return null;
}

