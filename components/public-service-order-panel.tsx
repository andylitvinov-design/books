import Link from "next/link";
import { ArrowUpRight, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { PublicService } from "@/lib/practitioners/public-types";
import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./public-service-order-panel.module.css";

type Locale = "en" | "ru" | "es";

const copy = {
  en: {
    eyebrow: "A simple next step",
    title: "Order this service",
    freeTitle: "Order your free Wu Xing introduction",
    description: "Choose where to send your enquiry. A prepared message opens in your app; review it and press Send yourself.",
    freeDescription: "No payment or account needed. Choose a messenger and ask Andrey how to begin your personal Wu Xing resource profile.",
    request: "I would like to order this service. Please confirm the format and any fee before we proceed.",
    freeRequest: "I would like to order the free personal Wu Xing diagnostic. Please tell me how to begin and what information you need.",
    noContact: "The practitioner's contact channels are not published yet. See their profile for current options.",
    profile: "Practitioner profile",
    free: "Free · no payment",
    notBooked: "Sending a message is an enquiry, not an automatic booking. Avoid sharing sensitive medical information.",
  },
  ru: {
    eyebrow: "Простой следующий шаг",
    title: "Заказать услугу",
    freeTitle: "Заказать бесплатную диагностику У-Син",
    description: "Выберите мессенджер. Откроется подготовленная заявка, которую вы проверите и отправите самостоятельно.",
    freeDescription: "Без оплаты и регистрации. Напишите Андрею, чтобы уточнить начало личного анализа ресурсов по У-Син.",
    request: "Хочу заказать эту услугу. Подскажите формат и согласуйте стоимость до начала.",
    freeRequest: "Хочу заказать бесплатную личную диагностику У-Син. Подскажите, как начать и какие данные нужны.",
    noContact: "Контакты мастера пока не опубликованы. Посмотрите доступные способы связи в его профиле.",
    profile: "Профиль мастера",
    free: "Бесплатно · без оплаты",
    notBooked: "Сообщение — заявка, а не автоматическая запись. Не отправляйте конфиденциальные медицинские данные.",
  },
  es: {
    eyebrow: "Un paso sencillo",
    title: "Solicitar este servicio",
    freeTitle: "Solicita tu introducción gratuita a Wu Xing",
    description: "Elige una aplicación. Se abrirá un mensaje preparado; revísalo y envíalo personalmente.",
    freeDescription: "Sin pagos ni registro. Pregunta a Andrey cómo empezar tu perfil simbólico de recursos Wu Xing.",
    request: "Quiero solicitar este servicio. Confirma el formato y el precio antes de empezar.",
    freeRequest: "Quiero solicitar el diagnóstico personal gratuito Wu Xing. ¿Cómo puedo empezar y qué datos necesitas?",
    noContact: "El profesional aún no ha publicado sus contactos. Consulta su perfil.",
    profile: "Perfil del profesional",
    free: "Gratis · sin pago",
    notBooked: "Enviar el mensaje no confirma una reserva. No compartas información médica sensible.",
  },
} as const;

function publicContact(value: string | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function publicTelegram(value: string | undefined) {
  const username = (value || "").replace(/^@/, "").trim();
  return /^[A-Za-z0-9_]{5,32}$/.test(username) ? username : null;
}

/** Public-only, provider-aware handoff. Never route another practitioner's orders to Andy. */
export function PublicServiceOrderPanel({
  locale,
  service,
  specialized = false,
}: {
  locale: Locale;
  service: PublicService;
  specialized?: boolean;
}) {
  const t = copy[locale];
  const andy = service.practitionerSlug === "andy-litvinov";
  const free = service.pricingMode === "free" ||
    (service.pricingMode !== "contact" && service.confirmedPrice === 0);
  const pagePath = "/" + locale + "/services/" +
    encodeURIComponent(service.practitionerSlug) + "/" + encodeURIComponent(service.slug);
  const description = specialized ? t.freeDescription : t.description;
  const message = specialized ? t.freeRequest : t.request;
  const whatsappNumber = publicContact(service.whatsapp);
  const telegramHandle = publicTelegram(service.telegram);
  const preparedText = [
    locale === "ru" ? "Здравствуйте!" : locale === "es" ? "¡Hola!" : "Hello!",
    service.copy.title,
    message,
    "https://holistichouse.vercel.app" + pagePath,
  ].join("\n");

  const whatsappUrl = andy
    ? whatsappEnquiryUrl({ locale, service: service.copy.title, request: message, pagePath })
    : whatsappNumber
      ? "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(preparedText)
      : null;
  const telegramUrl = andy && whatsappUrl
    ? telegramEnquiryUrlFromWhatsApp(whatsappUrl)
    : telegramHandle
      ? "https://t.me/" + telegramHandle + "?text=" + encodeURIComponent(preparedText)
      : null;

  return (
    <section className={styles.panel} id="service-order" aria-labelledby="service-order-title"
      data-public-service-order={service.slug} data-free-service={free}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}><ShieldCheck size={16} aria-hidden="true" /> {t.eyebrow}</p>
        <h2 id="service-order-title">{specialized ? t.freeTitle : t.title}</h2>
        <p>{description}</p>
        {free ? <span className={styles.free}>{t.free}</span> : null}
      </div>
      {whatsappUrl || telegramUrl ? (
        <div className={styles.channels} role="group" aria-label={locale === "ru" ? "Выбор мессенджера" : locale === "es" ? "Elige mensajería" : "Choose a messenger"}>
          {whatsappUrl ? <AcquisitionEventLink href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            prefetch={false} className={styles.whatsapp} event="service_request_start"
            attributes={{ "data-service-slug": service.slug, "data-contact-channel": "whatsapp" }}>
            <MessageCircle size={21} aria-hidden="true" /> WhatsApp <ArrowUpRight size={17} aria-hidden="true" />
          </AcquisitionEventLink> : null}
          {telegramUrl ? <AcquisitionEventLink href={telegramUrl} target="_blank" rel="noopener noreferrer"
            prefetch={false} className={styles.telegram} event="service_request_start"
            attributes={{ "data-service-slug": service.slug, "data-contact-channel": "telegram" }}>
            <Send size={20} aria-hidden="true" /> Telegram <ArrowUpRight size={17} aria-hidden="true" />
          </AcquisitionEventLink> : null}
        </div>
      ) : (
        <Link className={styles.profile} href={"/" + locale + "/masters/" + encodeURIComponent(service.practitionerSlug)}>
          {t.noContact} <span>{t.profile} →</span>
        </Link>
      )}
      <p className={styles.note}>{t.notBooked}</p>
    </section>
  );
}
