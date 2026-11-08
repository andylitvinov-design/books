"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { classifyPublicLead, courseTopicForPath } from "@/lib/public-lead-capture";
import { coreOfferDetailData, type DetailKind } from "@/components/core-service-detail";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import styles from "./sitewide-lead-capture.module.css";

const copy = {
  en: {
    personal: { title: "Let’s find your next step", lead: "Choose WhatsApp or Telegram and send your message. Andrey will answer personally." },
    reading: { title: "Have a question after reading?", lead: "Ask for a written starting point in Telegram or WhatsApp." },
    training: { title: "Interested in this course?", lead: "Ask about the course in Telegram or WhatsApp." },
    core: { title: "Interested in this personal service?", lead: "Write to Andrey in Telegram or WhatsApp." },
    network: { title: "Ask this practitioner", lead: "Choose an offer and send a request to its practitioner.", action: "View request options" },
  },
  ru: {
    personal: { title: "Обсудим ваш следующий шаг?", lead: "Напишите в Telegram или WhatsApp — Андрей ответит лично." },
    reading: { title: "Появился вопрос после чтения?", lead: "Напишите в Telegram или WhatsApp — подскажем первый шаг." },
    training: { title: "Интересует этот курс?", lead: "Напишите в Telegram или WhatsApp — уточним программу." },
    core: { title: "Интересует эта услуга?", lead: "Напишите в Telegram или WhatsApp — Андрей подскажет следующий шаг." },
    network: { title: "Свяжитесь с этим мастером", lead: "Выберите услугу и отправьте запрос непосредственно её автору.", action: "Выбрать услугу" },
  },
  es: {
    personal: { title: "Hablemos de tu siguiente paso", lead: "Elige Telegram o WhatsApp para escribirnos. Andrey responderá personalmente." },
    reading: { title: "¿Tienes preguntas después de leer?", lead: "Escribe por Telegram o WhatsApp para recibir orientación." },
    training: { title: "¿Te interesa este curso?", lead: "Pregunta por el curso en Telegram o WhatsApp." },
    core: { title: "¿Te interesa este servicio?", lead: "Escribe por Telegram o WhatsApp para consultar los próximos pasos." },
    network: { title: "Consulta con este profesional", lead: "Elige una oferta y envía la solicitud directamente al profesional.", action: "Ver servicios" },
  },
} as const;

export function SitewideLeadCapture() {
  const pathname = usePathname();
  // Avoid a hydration mismatch on rewritten public routes; classify after mount.
  const [clientPath, setClientPath] = useState<string | null>(null);
  const [legacyBookLocale, setLegacyBookLocale] = useState<"en" | "ru">("ru");
  useEffect(() => {
    setClientPath(pathname);
    if (/^\/books\/[^/]+/.test(pathname)) {
      setLegacyBookLocale(new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ru");
    }
  }, [pathname]);

  const route = clientPath ? classifyPublicLead(clientPath) : null;
  if (!route) return null;
  const locale = (/^\/books\/[^/]+/.test(pathname) ? legacyBookLocale : route.locale) as "en" | "ru" | "es";
  const kind = route.kind as "training" | "reading" | "personal" | "network";
  const relative = pathname.replace(/^\/(en|ru|es)(?=\/|$)/, "");
  const coreMatch = relative.match(/^\/services\/(dao-health-profile|alchemy-of-soul|hypnotherapy-course)\/?$/);
  const coreSlugToKind: Record<string, DetailKind> = {
    "dao-health-profile": "dao",
    "alchemy-of-soul": "alchemy",
    "hypnotherapy-course": "hypnotherapy",
  };
  const coreKind = coreMatch ? coreSlugToKind[coreMatch[1]] || null : null;

  // This dedicated landing already has a complete service-specific form.
  if (coreKind === "alchemy") return null;

  // Independent practitioners own their enquiries. Do not send these to Andrey's CRM.
  if (kind === "network") {
    const networkService = /^\/services\/[a-z0-9-]+\/[a-z0-9-]+/.test(relative);
    const networkMaster = /^\/masters\/[a-z0-9-]+/.test(relative);
    const href = networkService ? "#request-service"
      : networkMaster ? "#practitioner-services" : "/" + locale + "/services/catalog";
    const t = copy[locale].network;
    return (
      <aside className={styles.network} data-sitewide-capture={kind} lang={locale}>
        <h2>{t.title}</h2>
        <p>{t.lead}</p>
        <Link href={href} prefetch={false}>{t.action}<ArrowRight size={16} aria-hidden="true" /></Link>
      </aside>
    );
  }

  const offer = coreKind ? coreOfferDetailData(locale, coreKind) : null;
  const serviceTitle = offer?.title || (kind === "training" ? courseTopicForPath(pathname)
    : kind === "reading" ? "Free written Situation Review"
      : "Personal session with Andrey Litvinov");
  const t = offer ? copy[locale].core : copy[locale][kind];
  return (
    <div data-sitewide-capture={offer ? "core-service" : kind}
      data-core-service-capture={coreKind || undefined} lang={locale}>
      <CompactLeadCapture
        locale={locale}
        serviceTitle={serviceTitle}
        title={t.title}
        lead={t.lead}
      />
    </div>
  );
}
