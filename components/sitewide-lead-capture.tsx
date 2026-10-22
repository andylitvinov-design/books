"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { classifyPublicLead, courseTopicForPath, trainingEnquiryUrl } from "@/lib/public-lead-capture";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { coreOfferDetailData, type DetailKind } from "@/components/core-service-detail";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import styles from "./sitewide-lead-capture.module.css";

const copy = {
  en: {
    personal: { title: "Want to talk about your next step?", lead: "Leave a contact — Andrey will personally reply about a suitable service." },
    reading: { title: "Have a question after reading?", lead: "Leave a contact for a free written starting point." },
    training: { title: "Ready to begin?", lead: "Ask Andrey about the programme, next start and how to join.", order: "Order", note: "You send the message yourself. No booking or payment is made automatically." },
    core: { title: "Interested in this personal service?", lead: "Leave a contact — Andrey will explain the next step." },
    network: { title: "Ask this practitioner", lead: "Choose an offer and send a request to its practitioner.", action: "View request options" },
  },
  ru: {
    personal: { title: "Хотите обсудить свой вопрос?", lead: "Оставьте контакт — Андрей лично ответит по подходящей услуге." },
    reading: { title: "Появился вопрос после чтения?", lead: "Оставьте контакт — подскажем бесплатный письменный первый шаг." },
    training: { title: "Готовы начать?", lead: "Спросите Андрея о программе, ближайшем старте и записи.", order: "Заказать", note: "Сообщение отправляете вы сами. Запись и оплата не оформляются автоматически." },
    core: { title: "Интересует эта услуга?", lead: "Оставьте контакт — Андрей подскажет следующий шаг." },
    network: { title: "Свяжитесь с этим мастером", lead: "Выберите услугу и отправьте запрос непосредственно её автору.", action: "Выбрать услугу" },
  },
  es: {
    personal: { title: "¿Quieres hablar sobre el siguiente paso?", lead: "Deja tu contacto y Andrey responderá personalmente." },
    reading: { title: "¿Tienes preguntas después de leer?", lead: "Deja tu contacto para recibir orientación inicial gratuita por escrito." },
    training: { title: "¿Listo para empezar?", lead: "Pregunta a Andrey por el programa, las próximas fechas y cómo unirte.", order: "Solicitar", note: "Tú decides si envías el mensaje. No se reserva ni cobra nada automáticamente." },
    core: { title: "¿Te interesa este servicio?", lead: "Deja tu contacto y Andrey te explicará cómo seguir." },
    network: { title: "Consulta con este profesional", lead: "Elige una oferta y envía la solicitud directamente al profesional.", action: "Ver servicios" },
  },
} as const;

export function SitewideLeadCapture() {
  const pathname = usePathname();
  // Avoid a hydration mismatch on rewritten public routes; classify after mount.
  const [clientPath, setClientPath] = useState<string | null>(null);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const messengerPanelId = useId();
  const [legacyBookLocale, setLegacyBookLocale] = useState<"en" | "ru">("ru");
  useEffect(() => {
    setClientPath(pathname);
    setMessengerOpen(false);
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

  // A single course order action opens an explicit messenger choice.
  // No email/phone collection, automatic message sending or false CRM lead.
  // Inbound contacts are created only by a connected official CRM webhook.
  if (kind === "training") {
    const t = copy[locale].training;
    const whatsappHref = trainingEnquiryUrl(locale, pathname);
    const telegramHref = telegramEnquiryUrlFromWhatsApp(whatsappHref);
    return (
      <aside className={styles.training} data-sitewide-capture="training"
        data-academy-messenger-order lang={locale} aria-label={t.title}>
        <Image className={styles.trainingPortrait}
          src="/images/holistic-house/andy-about.png"
          alt="" width={72} height={72} loading="lazy" unoptimized />
        <div className={styles.trainingCopy}>
          <span className={styles.trainingEyebrow}>HOLISTIC HOUSE · ACADEMY</span>
          <h2>{t.title}</h2>
          <p className={styles.trainingCourse}>{courseTopicForPath(pathname)}</p>
          <p className={styles.trainingLead}>{t.lead}</p>
        </div>
        <div className={styles.trainingAction}>
          <button type="button" className={styles.trainingOrder}
            data-academy-order-button aria-expanded={messengerOpen}
            aria-controls={messengerPanelId}
            onClick={() => setMessengerOpen(value => !value)}>
            <ShoppingBag size={19} aria-hidden="true" />
            {t.order}
            <ChevronDown className={styles.trainingChevron} size={17} aria-hidden="true" />
          </button>
          <div id={messengerPanelId} className={styles.trainingChannels} hidden={!messengerOpen}>
            <AcquisitionEventLink href={whatsappHref} target="_blank"
              rel="noopener noreferrer" prefetch={false}
              event="academy_course_enquiry_click" analyticsEvent="whatsapp_handoff_click"
              attributes={{"data-messenger-channel":"whatsapp"}}>
              <MessageCircle size={18} aria-hidden="true" /> WhatsApp <ArrowRight size={17} aria-hidden="true" />
            </AcquisitionEventLink>
            <AcquisitionEventLink href={telegramHref} target="_blank"
              rel="noopener noreferrer" prefetch={false}
              event="academy_course_enquiry_click"
              attributes={{"data-messenger-channel":"telegram"}}>
              <Send size={18} aria-hidden="true" /> Telegram <ArrowRight size={17} aria-hidden="true" />
            </AcquisitionEventLink>
            <p className={styles.trainingNote}>{t.note}</p>
          </div>
        </div>
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
