"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ACQUISITION_EVENTS } from "@/data/local-acquisition";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number];

type AcquisitionEventLinkProps = {
  attributes?: Record<string, string>;
  children: ReactNode;
  className?: string;
  event: AcquisitionEvent;
  href: string;
  id?: string;
  rel?: string;
  target?: string;
};

function emit(event: AcquisitionEvent) {
  const analyticsConsent = document.documentElement.dataset.analyticsConsent;
  if (analyticsConsent !== "granted") return;

  window.dispatchEvent(new CustomEvent("holistic-house:acquisition", { detail: { event } }));
  const dataLayer = (window as unknown as { dataLayer?: Array<{ event: string }> }).dataLayer;
  dataLayer?.push({ event });
}

export function AcquisitionEventLink({ attributes, children, event, ...props }: AcquisitionEventLinkProps) {
  return <Link {...props} {...attributes} onClick={() => emit(event)}>{children}</Link>;
}
