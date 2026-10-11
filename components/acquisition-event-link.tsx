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
  rel?: string;
  target?: string;
};

function emit(event: AcquisitionEvent, analyticsEvent?: PublicAnalyticsEvent) {
  const analyticsConsent = document.documentElement.dataset.analyticsConsent;
  if (analyticsConsent !== "granted") return;

  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
  if (analyticsEvent) {
    window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event: analyticsEvent } }));
  }
}

export function AcquisitionEventLink({ analyticsEvent, attributes, children, event, onClick, ...props }: AcquisitionEventLinkProps) {
  return <Link {...props} {...attributes} onClick={() => { onClick?.(); emit(event, analyticsEvent); }}>{children}</Link>;
}
