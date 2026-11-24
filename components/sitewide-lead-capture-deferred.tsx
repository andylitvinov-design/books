"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { classifyPublicLead } from "@/lib/public-lead-capture";
import { loadOptionalLeadCapture } from "@/lib/deferred-lead-capture.mjs";

// Keep the large consented form out of Home/private routes. Unlike a
// rejected React.lazy/next-dynamic promise, a cancelled WebKit script load
// during hard history navigation must not become an uncaught render error.
export function SitewideLeadCaptureDeferred() {
  const pathname = usePathname() || "/";
  const route = classifyPublicLead(pathname);
  const [Capture, setCapture] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!classifyPublicLead(pathname) || Capture) return;
    let disposed = false;
    let pending = false;
    const active = () => !disposed &&
      !(window as Window & { __hhOptionalReadsDeparting?: boolean }).__hhOptionalReadsDeparting;
    const load = async () => {
      if (pending || !active()) return;
      pending = true;
      setFailed(false);
      const result = await loadOptionalLeadCapture(
        () => import("./sitewide-lead-capture"),
        active,
      );
      pending = false;
      if (!active()) return;
      if (result.status === "ready") setCapture(() => result.module.SitewideLeadCapture);
      else if (result.status === "failed") setFailed(true);
    };
    void load();
    // A BFCache restoration may resume a page whose previous optional
    // import was cancelled. Try again on the restored active document.
    const resume = () => { void load(); };
    window.addEventListener("pageshow", resume);
    return () => {
      disposed = true;
      window.removeEventListener("pageshow", resume);
    };
  }, [pathname, Capture, retry]);

  if (!route) return null;
  if (Capture) return <Capture />;
  if (!failed) return null;
  const label = route.locale === "ru" ? "Повторить загрузку формы" :
    route.locale === "es" ? "Volver a cargar el formulario" : "Retry loading enquiry";
  return <button type="button" data-sitewide-capture-retry onClick={() => setRetry(value => value + 1)}>{label}</button>;
}
