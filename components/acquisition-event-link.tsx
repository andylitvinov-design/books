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
  nativeNavigation?: boolean;
  prefetch?: boolean;
  rel?: string;
  target?: string;
};

function emit(event: AcquisitionEvent) {
  const analyticsConsent = document.documentElement.dataset.analyticsConsent;
  if (analyticsConsent !== "granted") return;

  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
}

export function AcquisitionEventLink({
  analyticsEvent, attributes, children, event, onClick, nativeNavigation = false, prefetch, ...props
}: AcquisitionEventLinkProps) {
  const handleClick = () => { onClick?.(); emit(event); if (analyticsEvent) emit(analyticsEvent); };
  // The free-review handoff must work even when WebKit's hydrated Next router
  // is busy after an in-page request-form hash navigation. Preserve the real
  // browser GET and the same consent-gated acquisition event.
  if (nativeNavigation) return <a {...props} {...attributes} onClick={handleClick}>{children}</a>;
  return <Link {...props} {...attributes} prefetch={prefetch} onClick={handleClick}>{children}</Link>;
}
