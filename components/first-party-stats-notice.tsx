"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { safePublicPagePath } from "@/lib/analytics/public-page-traffic.mjs";
import { setFirstPartyConsent } from "./analytics-consent";

const publicStatsCookie = "hh_public_stats_consent";
const firstPartyCookie = (name: string) => document.cookie.split("; ")
  .find(part => part.startsWith(name + "="))?.split("=")[1];

const statsTranslations = {
  en: {
    title: "Count anonymous page visits?",
    description: "Optional public-page views and broad sources only. No IP, identity or health data. Google/Meta stay off.",
    allow: "Allow", deny: "No, thanks", details: "Privacy details",
  },
  ru: {
    title: "Разрешить анонимный подсчёт посещений?",
    description: "Только публичные страницы и общие источники, без IP, аккаунта и данных о здоровье. Google/Meta отключены.",
    allow: "Разрешить", deny: "Нет, спасибо", details: "О приватности",
  },
  es: {
    title: "¿Permitir el conteo anónimo de visitas?",
    description: "Solo páginas públicas y fuentes generales; sin IP, identidad ni datos de salud. Google/Meta siguen desactivados.",
    allow: "Permitir", deny: "No, gracias", details: "Privacidad",
  },
};

/** Small dismissible choice, never a blocking modal or an implicit opt-in.
 * Display only on explicitly allowlisted public marketing pages. */
export function FirstPartyStatsNotice() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [expressFormOpen, setExpressFormOpen] = useState(false);
  const locale = pathname?.split("/")[1];
  const copy = locale === "ru" ? statsTranslations.ru :
    locale === "es" ? statsTranslations.es : statsTranslations.en;

  useEffect(() => {
    setShow(Boolean(safePublicPagePath(pathname)) &&
      !firstPartyCookie(publicStatsCookie) &&
      firstPartyCookie("hh_public_stats_skip") !== "1");
  }, [pathname]);

  // A visitor filling the privacy-sensitive free review should never have
  // an analytics opt-in banner covering the phone, description or consent.
  // The independent stats choice stays undecided and reappears when the
  // visitor closes the form; opening the form never grants tracking consent.
  useEffect(() => {
    if (!/^\/(?:en|ru|es)\/services\/free-situation-review$/.test(pathname || "")) {
      setExpressFormOpen(false);
      return;
    }
    const panel = document.querySelector('[data-personal-express-enquiry]');
    if (!panel) { setExpressFormOpen(false); return; }
    const sync = () => setExpressFormOpen(panel.getAttribute('data-expanded') === 'true');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(panel, { attributes: true, attributeFilter: ['data-expanded'] });
    return () => observer.disconnect();
  }, [pathname]);

  function choose(allow: boolean) {
    setFirstPartyConsent(allow);
    setShow(false);
  }

  if(!show || expressFormOpen)return null;
  return (
    <aside data-first-party-consent
      aria-label={copy.title}
      className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md rounded-2xl border border-stone-300 bg-stone-50 p-3 text-stone-900 shadow-lg md:bottom-4 md:left-auto md:right-4">
      <p className="m-0 text-sm font-semibold">{copy.title}</p>
      <p className="mt-1 mb-2 text-xs leading-snug">{copy.description}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => choose(true)}
          className="min-h-11 rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white">{copy.allow}</button>
        <button type="button" onClick={() => choose(false)}
          className="min-h-11 rounded-full border border-stone-400 bg-white px-3 py-2 text-sm">{copy.deny}</button>
        <Link href="/privacy" className="text-xs underline underline-offset-2">{copy.details}</Link>
      </div>
    </aside>
  );
}

