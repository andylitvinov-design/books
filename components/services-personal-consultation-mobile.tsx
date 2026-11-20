"use client";

import Image from "next/image";
import { Camera, Video, Zap } from "lucide-react";
import { ServicesCardActions } from "@/components/services-card-actions";
import { StaticPortrait } from "@/components/static-portrait";
import type { PublicLocale } from "@/lib/public-locales";
import { TELEGRAM_SERVICE_OPTIONS } from "@/lib/assist/telegram-service-options.mjs";
import { telegramServiceRequestUrl } from "@/lib/assist/telegram-business-request.mjs";
import styles from "./services-personal-consultation-mobile.module.css";

const copy = {
  ru: {
    title: "Личная консультация",
    lead: "Выберите удобный формат",
    free: { title: TELEGRAM_SERVICE_OPTIONS.personal_express_review.titles.ru, detail: "Быстрый ответ на ваш запрос", tag: TELEGRAM_SERVICE_OPTIONS.personal_express_review.price.labels.ru, action: "Пройти сейчас" },
    remote: { title: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.titles.ru, detail: "Дистанционно по фото", action: "Заказать",
      request: "Хочу заказать расширенный дистанционный разбор по фото. Подскажите условия и безопасный способ передать материалы." },
    live: { title: "Личная диагностика", detail: "Видеосессия с практиком", action: "Записаться",
      request: "Хочу записаться на личную видеосессию с Андреем. Подскажите доступное время и стоимость до оплаты." },
    note: "Не медицинская диагностика. Фото передавайте только защищённым способом после согласования. Заявка — не запись и не оплата.",
  },
  en: {
    title: "Personal consultation",
    lead: "Choose your preferred format",
    free: { title: TELEGRAM_SERVICE_OPTIONS.personal_express_review.titles.en, detail: "A quick response to your question", tag: TELEGRAM_SERVICE_OPTIONS.personal_express_review.price.labels.en, action: "Start now" },
    remote: { title: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.titles.en, detail: "Remote · with a photo", action: "Request",
      request: "I would like an extended remote photo-based review. Please confirm the terms and a secure way to share materials." },
    live: { title: "Personal consultation", detail: "Video session with Andrey", action: "Book a session",
      request: "I would like a personal video session with Andrey. Please confirm availability and pricing before payment." },
    note: "For reflection, not medical diagnosis. Share photos only through an agreed secure channel. A request is not a booking or payment.",
  },
  es: {
    title: "Consulta personal",
    lead: "Elige el formato más cómodo",
    free: { title: TELEGRAM_SERVICE_OPTIONS.personal_express_review.titles.es, detail: "Una respuesta breve a tu consulta", tag: TELEGRAM_SERVICE_OPTIONS.personal_express_review.price.labels.es, action: "Empezar" },
    remote: { title: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.titles.es, detail: "A distancia · con foto", action: "Solicitar",
      request: "Quisiera una revisión ampliada a distancia con foto. Confirma las condiciones y cómo enviar los materiales de forma segura." },
    live: { title: "Consulta personal", detail: "Videollamada con Andrey", action: "Reservar",
      request: "Quisiera una sesión personal por videollamada con Andrey. Confirma el horario y el precio antes de pagar." },
    note: "Para la reflexión, no es diagnóstico médico. Envía fotos solo por un canal seguro acordado. Una solicitud no confirma cita ni pago.",
  },
} as const;


const descriptions = {
  en: {
    free: "A complimentary written express review of your question or situation. Share a short request to receive personal reflections and a possible next step; it is not a medical diagnosis.",
    remote: "A more detailed personal reflection at a distance, potentially using a photo after a secure channel is agreed. We clarify the goal, materials and individual conditions before any work begins.",
    live: "A one-to-one video consultation with Andrey to discuss your situation, explore perspectives and choose practical next steps. Session time and pricing are confirmed before booking.",
  },
  ru: {
    free: "Бесплатный краткий письменный разбор вопроса или ситуации. Вы описываете запрос и получаете личные наблюдения и возможный следующий шаг; это не медицинская диагностика.",
    remote: "Более подробный дистанционный разбор с возможностью использовать фотографию после согласования защищённого канала. Сначала уточняем тему, материалы и условия работы.",
    live: "Личная видеоконсультация с Андреем: обсуждение ситуации, поиск новых перспектив и возможных дальнейших шагов. Время и стоимость согласовываются до записи.",
  },
  es: {
    free: "Una revisión escrita breve y gratuita de tu pregunta o situación, con observaciones personales y un posible siguiente paso. No es un diagnóstico médico.",
    remote: "Una revisión personal más detallada a distancia, posiblemente con una foto enviada por un canal seguro acordado. Primero aclaramos el objetivo, los materiales y las condiciones.",
    live: "Una videoconferencia individual con Andrey para explorar tu situación, distintas perspectivas y próximos pasos. El horario y el precio se confirman antes de reservar.",
  },
} as const;

const priceLabels = {
  ru: { quote: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.price.labels.ru, session: "€100 / 60 мин" },
  en: { quote: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.price.labels.en, session: "€100 / 60 min" },
  es: { quote: TELEGRAM_SERVICE_OPTIONS.personal_extended_review.price.labels.es, session: "€100 / 60 min" },
} as const;

/** Mobile-only choice shelf inside the existing Services/Assist page; all orders use established first-party flows. */
export function ServicesPersonalConsultationMobile({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const d = descriptions[locale];

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
        <article className={styles.card} data-support-uniform-card data-consultation-choice="free">
          <div className={styles.photo} data-support-uniform-photo>
            <Image src="/images/holistic-house/messenger-zen-stones.svg" alt="" fill unoptimized sizes="(max-width:760px) 34vw, 110px" />
          </div>
          <div className={styles.content} data-support-uniform-copy>
            
            <h3>{t.free.title}</h3>
            <p><Zap size={18} aria-hidden="true" />{t.free.detail}</p>
          </div>
          <span className={styles.priceTag} data-support-uniform-price data-service-price-kind="free">{t.free.tag}</span>
          <ServicesCardActions locale={locale} title={t.free.title} description={d.free}
            href={"/" + locale + "/services/free-situation-review"}
            telegramUrl={telegramServiceRequestUrl("personal_express_review", locale) || undefined} trackingId="free" />
        </article>
        <article className={styles.card} data-support-uniform-card data-consultation-choice="remote-photo">
          <div className={styles.photo} data-support-uniform-photo>
            <Image src="/images/holistic-house/report-lighthouse-coast.webp" alt="" fill sizes="(max-width:760px) 34vw, 110px" />
          </div>
          <div className={styles.content} data-support-uniform-copy>
            <h3>{t.remote.title}</h3>
            <p><Camera size={19} aria-hidden="true" />{t.remote.detail}</p>
          </div>
          <span className={styles.priceTag} data-support-uniform-price data-service-price-kind="quote">{priceLabels[locale].quote}</span>
          <ServicesCardActions locale={locale} title={t.remote.title} description={d.remote}
            href={"/" + locale + "/services/alchemy-of-soul"} request={t.remote.request}
            telegramUrl={telegramServiceRequestUrl("personal_extended_review", locale) || undefined} trackingId="remote-photo" />
        </article>
        <article className={styles.card} data-support-uniform-card data-consultation-choice="video">
          <div className={styles.photo} data-support-uniform-photo>
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:760px) 34vw, 110px" />
          </div>
          <div className={styles.content} data-support-uniform-copy>
            <h3>{t.live.title}</h3>
            <p><Video size={19} aria-hidden="true" />{t.live.detail}</p>
          </div>
          <span className={styles.priceTag} data-support-uniform-price data-service-price-kind="paid">{priceLabels[locale].session}</span>
          <ServicesCardActions locale={locale} title={t.live.title} description={d.live}
            href={"/" + locale + "/services/free-consultation"} request={t.live.request} trackingId="video" />
        </article>
      </div>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
