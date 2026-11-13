"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Video, Zap } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { StaticPortrait } from "@/components/static-portrait";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-personal-consultation-mobile.module.css";

const copy = {
  ru: {
    title: "Личная консультация",
    lead: "Выберите удобный формат",
    free: { title: "Экспресс-диагностика", detail: "Быстрый ответ на ваш запрос", tag: "Бесплатно", action: "Пройти сейчас" },
    remote: { title: "Расширенная диагностика", detail: "Дистанционно по фото", action: "Заказать",
      request: "Хочу заказать расширенный дистанционный разбор по фото. Подскажите условия и безопасный способ передать материалы." },
    live: { title: "Личная диагностика", detail: "Видеосессия с практиком", action: "Записаться",
      request: "Хочу записаться на личную видеосессию с Андреем. Подскажите доступное время и стоимость до оплаты." },
    note: "Не медицинская диагностика. Фото передавайте только защищённым способом после согласования. Заявка — не запись и не оплата.",
  },
  en: {
    title: "Personal consultation",
    lead: "Choose your preferred format",
    free: { title: "Express review", detail: "A quick response to your question", tag: "Free", action: "Start now" },
    remote: { title: "Extended review", detail: "Remote · with a photo", action: "Request",
      request: "I would like an extended remote photo-based review. Please confirm the terms and a secure way to share materials." },
    live: { title: "Personal consultation", detail: "Video session with Andrey", action: "Book a session",
      request: "I would like a personal video session with Andrey. Please confirm availability and pricing before payment." },
    note: "For reflection, not medical diagnosis. Share photos only through an agreed secure channel. A request is not a booking or payment.",
  },
  es: {
    title: "Consulta personal",
    lead: "Elige el formato más cómodo",
    free: { title: "Revisión exprés", detail: "Una respuesta breve a tu consulta", tag: "Gratis", action: "Empezar" },
    remote: { title: "Revisión ampliada", detail: "A distancia · con foto", action: "Solicitar",
      request: "Quisiera una revisión ampliada a distancia con foto. Confirma las condiciones y cómo enviar los materiales de forma segura." },
    live: { title: "Consulta personal", detail: "Videollamada con Andrey", action: "Reservar",
      request: "Quisiera una sesión personal por videollamada con Andrey. Confirma el horario y el precio antes de pagar." },
    note: "Para la reflexión, no es diagnóstico médico. Envía fotos solo por un canal seguro acordado. Una solicitud no confirma cita ni pago.",
  },
} as const;

/** Mobile-only choice shelf inside the existing Services/Assist page; all orders use established first-party flows. */
export function ServicesPersonalConsultationMobile({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const pagePath = "/" + locale + "/services";
  const remoteServiceTitle = t.remote.title + " · " + t.remote.detail;
  const videoServiceTitle = t.live.title + " · " + t.live.detail;

  return (
    <section id="assist-personal-consultation" className={styles.section}
      data-assist-personal-consultation lang={locale} aria-labelledby="assist-consultation-title">
      <header className={styles.heading}>
        <div>
          <h2 id="assist-consultation-title">{t.title}</h2>
          <p>{t.lead}</p>
        </div>
      </header>
      <div className={styles.cards}>
        <article className={styles.card} data-consultation-choice="free">
          <div className={styles.photo}>
            <Image src="/images/holistic-house/messenger-zen-stones.svg" alt="" fill unoptimized sizes="110px" />
          </div>
          <div className={styles.content}>
            <span className={styles.freeTag}>{t.free.tag}</span>
            <h3>{t.free.title}</h3>
            <p><Zap size={18} aria-hidden="true" />{t.free.detail}</p>
            <Link href={"/" + locale + "/services/free-situation-review#request-free-review"}
              prefetch={false} className={styles.action} data-consultation-action="free">
              {t.free.action}<ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </article>
        <article className={styles.card} data-consultation-choice="remote-photo">
          <div className={styles.photo}>
            <Image src="/images/holistic-house/report-lighthouse-coast.webp" alt="" fill sizes="110px" />
          </div>
          <div className={styles.content}>
            <h3>{t.remote.title}</h3>
            <p><Camera size={19} aria-hidden="true" />{t.remote.detail}</p>
            <div className={styles.order} data-consultation-action="remote-photo">
              <ContactChannelChooser locale={locale}
                whatsappUrl={whatsappEnquiryUrl({locale,service:remoteServiceTitle,request:t.remote.request,pagePath})}
                publicServiceTitle={remoteServiceTitle} publicTopic="Remote photo-based personal reflection · contact only"
                label={t.remote.action} className={styles.action}
                compactPhone compactTrigger stayAfterSave />
            </div>
          </div>
        </article>
        <article className={styles.card} data-consultation-choice="video">
          <div className={styles.photo}>
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="110px" />
          </div>
          <div className={styles.content}>
            <h3>{t.live.title}</h3>
            <p><Video size={19} aria-hidden="true" />{t.live.detail}</p>
            <div className={styles.order} data-consultation-action="video">
              <ContactChannelChooser locale={locale}
                whatsappUrl={whatsappEnquiryUrl({locale,service:videoServiceTitle,request:t.live.request,pagePath})}
                publicServiceTitle={videoServiceTitle} publicTopic="Personal video consultation · contact only"
                label={t.live.action} className={styles.action}
                compactPhone compactTrigger stayAfterSave />
            </div>
          </div>
        </article>
      </div>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
