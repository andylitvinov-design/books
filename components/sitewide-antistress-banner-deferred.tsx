"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { PublicLocale } from "@/lib/public-locales";

// The approved Home never shows this ribbon. Defer its stylesheet and
// optional downstream route CSS instead of forcing them into Home's head.
// Keep SSR enabled on other pages, retaining their original visible ribbon.
const RouteBanner = dynamic(
  () => import("./sitewide-antistress-banner").then(mod => mod.SitewideAntistressBanner),
  { loading: () => null },
);

export function SitewideAntistressBannerDeferred({
  initialLocale = "en",
}: { initialLocale?: PublicLocale }) {
  const pathname = usePathname() || "";
  if (pathname === "/" || /^\/(?:ru|en|es)\/?$/.test(pathname)) return null;
  return <RouteBanner initialLocale={initialLocale} />;
}
