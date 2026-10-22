"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { parseEnquiryReceipt, RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./service-enquiry-thank-you.module.css";

const copy = {
  en: {
    eyebrow: "Holistic House · Request received",
    title: "Thank you for reaching out!",
    subtitle: "Your request has been saved. I'll be happy to explore the next step with you.",
    reference: "Your reference",
    nextTitle: "What happens next?",
    next: "Andrey will review your enquiry and contact you personally using the details you provided. The date, availability and payment are confirmed separately.",
    noBooking: "Submitting a request does not reserve a session or charge your card.",
    mediaTitle: "A personal welcome from Andrey",
    mediaSub: "You can watch this short introduction while you wait for a reply.",
    more: "Explore services",
    contact: "Contact us",
    pending: "Checking your request confirmation…",
    unavailableTitle: "Open this page after sending a request",
    unavailable: "No recent confirmed request is available in this browser tab. Please submit the service or course form first. Opening this page alone does not register an enquiry.",
    back: "Browse services",
  },
  ru: {
    eyebrow: "Holistic House · Заявка получена",
    title: "Спасибо за вашу заявку!",
    subtitle: "Ваш запрос сохранён. Буду рад помочь вам определить следующий шаг.",
    reference: "Номер обращения",
    nextTitle: "Что будет дальше?",
    next: "Андрей ознакомится с заявкой и свяжется с вами лично по оставленному контакту. Время, наличие мест и оплата подтверждаются отдельно.",
    noBooking: "Отправка заявки не означает, что встреча забронирована или деньги списаны.",
    mediaTitle: "Личное видеообращение Андрея",
    mediaSub: "Можно посмотреть короткое знакомство, пока вы ожидаете ответа.",
    more: "Посмотреть услуги",
    contact: "Написать нам",
    pending: "Проверяем подтверждение заявки…",
    unavailableTitle: "Откройте страницу после отправки заявки",
    unavailable: "В этой вкладке нет недавнего подтверждения. Сначала заполните форму на странице услуги или курса. Сам просмотр страницы не создаёт заявку.",
    back: "Перейти к услугам",
  },
  es: {
    eyebrow: "Holistic House · Solicitud recibida",
    title: "¡Gracias por tu solicitud!",
    subtitle: "Hemos guardado tu consulta. Será un placer acompañarte en el próximo paso.",
    reference: "Número de solicitud",
    nextTitle: "¿Qué sigue?",
    next: "Andrey revisará tu solicitud y se pondrá en contacto contigo utilizando los datos que facilitaste. La fecha, las plazas y el pago se confirman por separado.",
    noBooking: "Enviar una solicitud no reserva una sesión ni realiza un cobro.",
    mediaTitle: "Un mensaje personal de Andrey",
    mediaSub: "Puedes ver esta breve presentación mientras esperas su respuesta.",
    more: "Ver servicios",
    contact: "Contactarnos",
    pending: "Comprobando la confirmación…",
    unavailableTitle: "Abre esta página después de enviar tu solicitud",
    unavailable: "No hay una confirmación reciente en esta pestaña. Primero envía el formulario de servicio o curso. Visitar esta página no crea una solicitud.",
    back: "Explorar servicios",
  },
} as const;

type ReceiptState = "checking" | "missing" | string;

export function ServiceEnquiryThankYou({
  locale, video,
}: { locale: PublicLocale; video: PublishedSiteVideo | null }) {
  const c = copy[locale];
  const [receipt, setReceipt] = useState<ReceiptState>("checking");

  useEffect(() => {
    try {
      const value = parseEnquiryReceipt(window.sessionStorage.getItem(RECEIPT_SESSION_KEY));
      setReceipt(value?.referenceCode ?? "missing");
    } catch {
      setReceipt("missing");
    }
  }, []);

  const confirmed = /^HH-[A-F0-9]{12}$/.test(receipt);
  return (
    <main className={styles.page}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrap} data-service-thank-you>
        <section className={styles.hero}>
          <div className={styles.copy}>
            {confirmed ? (
              <>
                <p className={styles.kicker}><CheckCircle2 size={17} aria-hidden="true" />{c.eyebrow}</p>
                <h1>{c.title}</h1>
                <p className={styles.intro}>{c.subtitle}</p>
                <div className={styles.reference}>
                  <span>{c.reference}</span>
                  <strong>{receipt}</strong>
                </div>
              </>
            ) : (
              <>
                <p className={styles.kicker}><ShieldCheck size={17} aria-hidden="true" />Holistic House</p>
                <h1>{receipt === "checking" ? c.pending : c.unavailableTitle}</h1>
                {receipt !== "checking" && <p className={styles.intro}>{c.unavailable}</p>}
              </>
            )}
          </div>
          <div className={styles.portrait}>
            <Image src="/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp"
              width={320} height={400} alt="Andrey Litvinov" unoptimized sizes="(max-width: 480px) 220px, 320px" />
          </div>
        </section>
        {confirmed && (
          <>
            <section className={styles.details}>
              <MailCheck size={27} aria-hidden="true" />
              <div>
                <h2>{c.nextTitle}</h2>
                <p>{c.next}</p>
                <p className={styles.note}>{c.noBooking}</p>
              </div>
            </section>
            {video && (
              <section className={styles.video} aria-label={c.mediaTitle}>
                <h2>{c.mediaTitle}</h2>
                <p>{c.mediaSub}</p>
                <SiteVideoPlayer video={video} locale={locale} compact />
              </section>
            )}
          </>
        )}
        <nav className={styles.actions} aria-label={c.more}>
          <Link href={"/" + locale + "/services"} className={styles.primary}>{confirmed ? c.more : c.back}<ArrowRight size={18} aria-hidden="true" /></Link>
          {confirmed && <Link href={"/" + locale + "/contact"} className={styles.secondary}>{c.contact}</Link>}
        </nav>
      </div>
    </main>
  );
}
