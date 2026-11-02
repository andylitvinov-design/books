"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { safePublicPagePath } from "@/lib/analytics/public-page-traffic.mjs";
import { setFirstPartyConsent } from "@/components/analytics-consent";

type Locale = "ru" | "en" | "es";
const words: Record<Locale, {
  label: string; title: string; body: string;
  yes: string; no: string; details: string;
}> = {
  ru: {
    label: "Выбор анонимной статистики сайта",
    title: "Поможете улучшать Holistic House?",
    body: "С вашего разрешения считаем только просмотры открытых страниц и нажатия. Без имени, IP-адреса, ответов анкет и данных кабинета.",
    yes: "Разрешить", no: "Нет, спасибо", details: "Подробнее",
  },
  en: {
    label: "Anonymous website statistics choice",
    title: "Help us improve Holistic House?",
    body: "With your permission, we count visits to public pages and button clicks only. No name, IP address, assessment answers or private account data.",
    yes: "Allow", no: "No, thanks", details: "Details",
  },
  es: {
    label: "Preferencia de estadísticas anónimas",
    title: "¿Nos ayudas a mejorar Holistic House?",
    body: "Con tu permiso contamos visitas a páginas públicas y clics. Sin nombre, dirección IP, respuestas de evaluaciones ni datos privados.",
    yes: "Permitir", no: "No, gracias", details: "Detalles",
  },
};

function hasRecordedChoice() {
  return document.cookie.split("; ").some(part =>
    part.startsWith("hh_public_stats_consent=") || part === "hh_public_stats_skip=1");
}

/**
 * Previously visitors could consent only after navigating to /privacy,
 * so the existing no-identifier collector never received ordinary visits.
 * This small, dismissible choice appears ONCE on public marketing pages only.
 * It never records an event until the visitor explicitly presses Allow.
 * No GA4/Meta SDK is activated here.
 */
export function FirstPartyStatsNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(Boolean(
      window.location.hostname === "holistichouse.vercel.app" &&
      safePublicPagePath(pathname) &&
      !hasRecordedChoice()
    ));
  }, [pathname]);

  if (!visible) return null;
  const slug = pathname.split("/")[1];
  const locale: Locale = slug === "en" || slug === "es" ? slug : "ru";
  const copy = words[locale];

  function decide(allow: boolean) {
    // setFirstPartyConsent writes a durable v1/denied choice and notifies
    // PublicPageTraffic; only explicit Allow can trigger the first landing.
    setFirstPartyConsent(allow);
    setVisible(false);
  }

  return (
    <section
      data-first-party-consent
      aria-label={copy.label}
      className="fixed inset-x-3 z-[85] mx-auto w-auto max-w-[29rem] rounded-2xl border border-emerald-300/35 bg-[#10243a] p-4 text-white shadow-2xl sm:right-4 sm:left-auto sm:mx-0"
      style={{ bottom: "calc(var(--ia222-bottom-height, 0px) + 12px)" }}
    >
      <strong className="block text-[15px] font-semibold leading-5">{copy.title}</strong>
      <p className="mt-1 text-[13px] leading-[1.45] text-slate-200">{copy.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => decide(true)}
          className="min-h-11 rounded-xl bg-emerald-300 px-4 text-[14px] font-semibold text-[#10243a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {copy.yes}
        </button>
        <button type="button" onClick={() => decide(false)}
          className="min-h-11 rounded-xl border border-slate-500 px-3 text-[14px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {copy.no}
        </button>
        <Link href="/privacy" className="ml-auto py-2 text-[13px] underline underline-offset-4">{copy.details}</Link>
      </div>
    </section>
  );
}
