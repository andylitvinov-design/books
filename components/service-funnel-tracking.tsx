"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";

export type ServiceFunnelEvent = "impression" | "order" | "whatsapp" | "telegram";

function recordServiceEvent(serviceId: string, event: ServiceFunnelEvent) {
  if (!serviceId) return;
  // Counters only: no visitor identifier, referrer, query text or message content.
  // keepalive makes Order and messenger exits count despite immediate navigation.
  void fetch("/api/marketplace/service-event", {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceId, event }),
  }).catch(() => {
    // Analytics failures must never block the visitor's main action.
  });
}

/** A real impression requires the containing service card/hero to be on screen. */
export function ServiceFunnelImpression({ serviceId }: { serviceId: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = marker.current?.closest("[data-service-funnel-card]") || marker.current?.parentElement;
    if (!element) return;
    let recorded = false;
    const mark = () => {
      if (recorded) return;
      recorded = true;
      recordServiceEvent(serviceId, "impression");
    };
    if (typeof IntersectionObserver === "undefined") {
      mark();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.25)) {
        mark();
        observer.disconnect();
      }
    }, { threshold: [0, 0.25] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [serviceId]);
  return <span ref={marker} hidden aria-hidden="true" />;
}

type ServiceLinkProps = ComponentProps<typeof Link> & {
  serviceId: string;
  event: Exclude<ServiceFunnelEvent, "impression">;
};
export function TrackedServiceLink({ serviceId, event, onClick, ...props }: ServiceLinkProps) {
  return <Link {...props} onClick={e => {
    onClick?.(e);
    if (!e.defaultPrevented) recordServiceEvent(serviceId, event);
  }} />;
}
type ExternalServiceLinkProps = ComponentProps<"a"> & {
  serviceId: string;
  event: "whatsapp" | "telegram";
};
export function TrackedServiceExternalLink({ serviceId, event, onClick, ...props }: ExternalServiceLinkProps) {
  return <a {...props} onClick={e => {
    onClick?.(e);
    if (!e.defaultPrevented) recordServiceEvent(serviceId, event);
  }} />;
}
