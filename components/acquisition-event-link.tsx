"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;

type AcquisitionEventLinkProps = {
  analyticsEvent?: PublicAnalyticsEvent;
  attributes?: Record<string, string>;
  children: ReactNode;
  className?: string;
  event: AcquisitionEvent;
  href: string;
  id?: string;
  onClick?: () => void;
  prefetch?: boolean;
  nativeNavigation?: boolean;
  rel?: string;
  target?: string;
};

function emit(event: AcquisitionEvent) {
  const analyticsConsent = document.documentElement.dataset.analyticsConsent;
  if (analyticsConsent !== "granted") return;

  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
}

export function AcquisitionEventLink({ analyticsEvent, attributes, children, event, onClick, prefetch, nativeNavigation = false, ...props }: AcquisitionEventLinkProps) {
  const track = () => { onClick?.(); emit(event); if (analyticsEvent) emit(analyticsEvent); };
  // Public Home can be served from a separate CDN document. Its practitioner
  // link must remain a native, one-tap navigation even before Next hydration.
  // All other acquisition links preserve their existing client-side behavior.
  if (nativeNavigation) return <a {...props} {...attributes} onClick={track}>{children}</a>;
  return <Link {...props} {...attributes} prefetch={prefetch} onClick={track}>{children}</Link>;
}
