"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MandatoryMessengerActions } from "@/components/mandatory-messenger-actions";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-card-actions.module.css";

const words = {
  en: {
    details: "Details",
    order: "Order",
    full: "Read full service description",
    choose: "Choose your preferred way to order",
    enquire: "I would like to enquire about this Holistic House service. Please confirm the available format and terms.",
  },
  ru: {
    details: "Детали",
    order: "Заказать",
    full: "Подробное описание услуги",
    choose: "Выберите удобный способ заказа",
    enquire: "Хочу заказать эту услугу Holistic House. Подскажите доступный формат и условия.",
  },
  es: {
    details: "Detalles",
    order: "Solicitar",
    full: "Leer la descripción completa",
    choose: "Elige cómo prefieres solicitar el servicio",
    enquire: "Quiero solicitar este servicio de Holistic House. Confirma el formato disponible y las condiciones.",
  },
} as const;

type Props = {
  locale: PublicLocale;
  title: string;
  description: string;
  href: string;
  request?: string;
  option?: string;
  whatsappUrl?: string;
  className?: string;
  trackingId?: string;
  telegramUrl?: string;
  actionTrackingId?: string;
};

/** One source of truth for the two actions on every public Services card. */
export function ServicesCardActions({
  locale, title, description, href, request, option, whatsappUrl, className, trackingId, telegramUrl, actionTrackingId,
}: Props) {
  const [expanded, setExpanded] = useState<"details" | "order" | null>(null);
  const id = useId().replace(/:/g, "");
  const t = words[locale];
  const messageUrl = whatsappUrl || whatsappEnquiryUrl({
    locale, service: title, request: request || t.enquire, option, pagePath: href,
  });
  const toggle = (next: "details" | "order") => {
    setExpanded(current => current === next ? null : next);
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}
      data-service-card-actions data-service-card-tracking={trackingId} lang={locale}>
      <div className={styles.controls} data-service-card-controls role="group" aria-label={title}>
        <button type="button" className={styles.detailsButton}
          aria-expanded={expanded === "details"} aria-controls={id + "-details"}
          onClick={() => toggle("details")}>
          {t.details}<ChevronDown size={16} aria-hidden="true" />
        </button>
        <button type="button" className={styles.orderButton} data-assist-best-action={actionTrackingId}
          aria-expanded={expanded === "order"} aria-controls={id + "-order"}
          onClick={() => toggle("order")}>
          {t.order}<ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.panel} id={id + "-details"} role="region"
        aria-label={t.details + ": " + title} data-service-card-details hidden={expanded !== "details"}>
        <p>{description}</p>
        <Link href={href} prefetch={false} className={styles.fullLink}>
          {t.full}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className={[styles.panel, styles.orderPanel].join(" ")} id={id + "-order"} role="region"
        aria-label={t.order + ": " + title} data-service-card-order hidden={expanded !== "order"}>
        <MandatoryMessengerActions locale={locale} whatsappUrl={messageUrl} telegramUrl={telegramUrl}
          compact collapsed={false} label={t.choose} active={expanded==="order"} />
      </div>
    </div>
  );
}
