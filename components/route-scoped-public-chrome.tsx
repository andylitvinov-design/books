"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { classifyPublicLead } from "@/lib/public-lead-capture";
import { isUnifiedMobileDockPath } from "@/lib/unified-mobile-dock.mjs";
import type { PublicLocale } from "@/lib/public-locales";

// These large components are absent on Home but were eagerly bundled by the
// root layout. Load them only when their existing route actually needs them.
// Keep SSR enabled so marketing service pages retain real, indexable CTAs.
const SitewideLeadCapture = dynamic(
  () => import("./sitewide-lead-capture").then(mod => mod.SitewideLeadCapture),
);
const MobileBottomNavigation = dynamic(
  () => import("./mobile-bottom-navigation").then(mod => mod.MobileBottomNavigation),
);

export function RouteScopedLeadCapture() {
  const pathname = usePathname() || "/";
  return classifyPublicLead(pathname) ? <SitewideLeadCapture /> : null;
}

export function RouteScopedMobileNavigation({ initialLocale }: { initialLocale: PublicLocale }) {
  const pathname = usePathname() || "/";
  // On Home and existing unified routes the dock already owns navigation.
  return isUnifiedMobileDockPath(pathname)
    ? null
    : <MobileBottomNavigation initialLocale={initialLocale} />;
}
