"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { classifyPublicLead } from "@/lib/public-lead-capture";

// The existing SitewideLeadCapture sets clientPath in useEffect and renders
// nothing during SSR. Load the substantial consented enquiry UI *only* for
// relevant public service, academy or library routes, never on Home.
// This retains the same user-facing form and existing privacy checks.
const DeferredCapture = dynamic(
  () => import("./sitewide-lead-capture").then(module => module.SitewideLeadCapture),
  { ssr: false, loading: () => null },
);

export function SitewideLeadCaptureDeferred() {
  const pathname = usePathname() || "/";
  if (!classifyPublicLead(pathname)) return null;
  return <DeferredCapture />;
}
