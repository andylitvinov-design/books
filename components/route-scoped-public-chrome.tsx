"use client";

import { usePathname } from "next/navigation";
import { classifyPublicLead } from "@/lib/public-lead-capture";
import { isUnifiedMobileDockPath } from "@/lib/unified-mobile-dock.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { SitewideLeadCapture } from "./sitewide-lead-capture";
import { MobileBottomNavigation } from "./mobile-bottom-navigation";

// Import both components through the normal Next module graph so the request
// nonce is attached to every server-rendered chunk under strict-dynamic CSP.
// The static Home route bypasses this React shell and remains separately cached.

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
