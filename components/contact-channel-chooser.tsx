"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { readOrganicEventReferral, withOrganicEventReferral } from "@/lib/organic-event-referrals";
import styles from "./contact-channel-chooser.module.css";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;

const copy = {
  en: {
    order: "Order",
    question: "Where would you like to send your request?",
    note: "Your selected request is prepared in the chat. You review it and press Send yourself.",
  },
  ru: {
    order: "Заказать",
    question: "Куда отправить вашу заявку?",
    note: "Ваш запрос будет подготовлен в чате. Проверьте текст и отправьте его сами.",
  },
  es: {
    order: "Solicitar",
    question: "¿Dónde quieres enviar tu solicitud?",
    note: "Tu solicitud se prepara en el chat. Revísala y pulsa Enviar personalmente.",
  },
} as const;

type Props = {
  locale: PublicLocale;
  whatsappUrl: string;
  className?: string;
  label?: string;
  event?: AcquisitionEvent;
  analyticsEvent?: PublicAnalyticsEvent;
  onChannelClick?: (channel: "whatsapp" | "telegram") => void;
  attributes?: Record<string, string>;
  id?: string;
};

/** Two-step, no-registration contact handoff; changing selections updates both prepared messages. */
export function ContactChannelChooser({
  locale,
  whatsappUrl,
  className,
  label,
  event = "contact_click",
  analyticsEvent,
  onChannelClick,
  attributes,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [publicEventSearch, setPublicEventSearch] = useState("");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Capture ONLY approved public UTM tokens, never any personal URL query text.
  // No storage, cookies, analytics request or identity association is created.
  useEffect(() => {
    const referral = readOrganicEventReferral(window.location.search, window.location.pathname);
    setPublicEventSearch(referral ? "?" + new URLSearchParams({
      utm_source: referral.source,
      utm_medium: "organic_event",
      utm_campaign: referral.campaign,
      ...(referral.content ? { utm_content: referral.content } : {}),
    }).toString() : "");
  }, [pathname]);
  // A new selected service should never inherit the previous open handoff.
  useEffect(() => setOpen(false), [whatsappUrl]);
  // Show the newly revealed mini-form even if the order button sits at the bottom of a phone viewport.
  useEffect(() => {
    if (!open) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open]);
  const c = copy[locale];
  const referredWhatsappUrl = withOrganicEventReferral(whatsappUrl, publicEventSearch, pathname, locale);
  const telegramUrl = telegramEnquiryUrlFromWhatsApp(referredWhatsappUrl);
  return (
    <div className={styles.wrapper} data-contact-channel-chooser>
      <button
        id={id}
        type="button"
        className={[styles.trigger, className].filter(Boolean).join(" ")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        data-contact-order
      >
        <ShoppingBag size={20} aria-hidden="true" />
        <span>{label || c.order}</span>
        <ChevronDown className={styles.chevron} size={21} aria-hidden="true" />
      </button>
      <div ref={panelRef} className={styles.panel} id={panelId} hidden={!open}>
        <p className={styles.question}>{c.question}</p>
        <div className={styles.choices} role="group" aria-label={c.question}>
          <AcquisitionEventLink
            prefetch={false}
            className={styles.whatsapp}
            href={referredWhatsappUrl}
            event={event}
            analyticsEvent={analyticsEvent}
            onClick={() => onChannelClick?.("whatsapp")}
            target="_blank"
            rel="noopener noreferrer"
            attributes={{ ...attributes, "data-contact-channel": "whatsapp" }}
          >
            <MessageCircle size={20} aria-hidden="true" /> WhatsApp
          </AcquisitionEventLink>
          <AcquisitionEventLink
            prefetch={false}
            className={styles.telegram}
            href={telegramUrl}
            event={event}
            analyticsEvent={analyticsEvent}
            onClick={() => onChannelClick?.("telegram")}
            target="_blank"
            rel="noopener noreferrer"
            attributes={{ ...attributes, "data-contact-channel": "telegram" }}
          >
            <Send size={20} aria-hidden="true" /> Telegram
          </AcquisitionEventLink>
        </div>
        <small className={styles.note}>{c.note}</small>
      </div>
    </div>
  );
}
