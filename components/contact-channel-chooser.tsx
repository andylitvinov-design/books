"use client";

import { useId, useState } from "react";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
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
  attributes,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const c = copy[locale];
  const telegramUrl = telegramEnquiryUrlFromWhatsApp(whatsappUrl);
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
      <div className={styles.panel} id={panelId} hidden={!open}>
        <p className={styles.question}>{c.question}</p>
        <div className={styles.choices} role="group" aria-label={c.question}>
          <AcquisitionEventLink
            prefetch={false}
            className={styles.whatsapp}
            href={whatsappUrl}
            event={event}
            analyticsEvent={analyticsEvent}
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
