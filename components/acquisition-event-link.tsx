"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;

type AcquisitionEventLinkProps = {
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

function emit(event: AcquisitionEvent) {
  const analyticsConsent = document.documentElement.dataset.analyticsConsent;
  if (analyticsConsent !== "granted") return;

  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
}

export function AcquisitionEventLink({ attributes, children, event, onClick, ...props }: AcquisitionEventLinkProps) {
  return <Link {...props} {...attributes} onClick={() => { onClick?.(); emit(event); }}>{children}</Link>;
}
