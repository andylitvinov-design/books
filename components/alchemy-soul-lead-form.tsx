"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/data/remedies";
type AlchemyLocale = Locale | "es";
import styles from "./alchemy-soul-landing.module.css";

type Format = "60" | "30" | "month";
type Topic = "relationships" | "stress" | "business" | "direction" | "other";

const copy = {
  ru: {
    format: "Формат",
    topics: "Тема",
    formatNames: {
      "60": "Личная сессия · 60 минут · €100",
      "30": "Экспресс · 30 минут · €50",
      month: "4 недели сопровождения · обсудить условия",
    },
    topicNames: {
      relationships: "Отношения",
      stress: "Стресс и внутренние блоки",
      business: "Работа и деньги",
      direction: "Цели и смысл",
      other: "Другая тема",
    },
    action: "Запросить сеанс",
    note: "Форма отправляет на сайт ваши контакты, согласие на личный ответ и необязательный комментарий для регистрации заявки в CRM. После подтверждения получения можно по желанию открыть WhatsApp или Telegram. Время подтверждается лично, автоматической оплаты нет.",
    privacy: "Не вводите здесь диагнозы или медицинские сведения — подробности обсудим лично.",
    telegram: "Или напишите мне в Telegram",
    greeting: "Здравствуйте! Хочу заказать сеанс «Алхимия души / Психогомеопатия».",
    formatField: "Формат",
    topicField: "Тема",
    question: "Подскажите, пожалуйста, свободное время и следующие шаги.",
  },
  en: {
    format: "Session format",
    topics: "Topic",
    formatNames: {
      "60": "Personal session · 60 min · €100",
      "30": "Express review · 30 min · €50",
      month: "Four-week support · discuss details",
    },
    topicNames: {
      relationships: "Relationships",
      stress: "Stress and inner blocks",
      business: "Work and money",
      direction: "Goals and meaning",
      other: "Another topic",
    },
    action: "Request a session",
    note: "The form sends your contact details, reply consent and optional note to the site for CRM registration. After receipt confirmation, WhatsApp and Telegram are optional. We confirm the session time personally; there is no automatic charge.",
    privacy: "Please don't enter diagnoses or confidential health details here. We can discuss your question directly.",
    telegram: "Or message me on Telegram",
    greeting: "Hello! I would like to book an Alchemy of the Soul / Psycho-homeopathy session.",
    formatField: "Format",
    topicField: "Topic",
    question: "Please let me know availability and the next steps.",
  },
  es: {
    format: "Formato de la sesión",
    topics: "Tema",
    formatNames: {
      "60": "Sesión personal · 60 minutos · €100",
      "30": "Revisión exprés · 30 minutos · €50",
      month: "Acompañamiento de cuatro semanas · consultar condiciones",
    },
    topicNames: {
      relationships: "Relaciones",
      stress: "Estrés y bloqueos internos",
      business: "Trabajo y dinero",
      direction: "Metas y sentido",
      other: "Otro tema",
    },
    action: "Solicitar una sesión",
    note: "El formulario envía tus datos de contacto, consentimiento para una respuesta personal y nota opcional al sitio para registrar la solicitud en el CRM. Tras confirmar la recepción, WhatsApp y Telegram son opcionales. Confirmamos la hora personalmente; no hay cobro automático.",
    privacy: "No incluyas diagnósticos ni datos médicos confidenciales. Podemos hablar de los detalles personalmente.",
    telegram: "O escríbeme por Telegram",
    greeting: "¡Hola! Quisiera solicitar una sesión de Alquimia del Alma / Psicohomeopatía.",
    formatField: "Formato",
    topicField: "Tema",
    question: "¿Podrías indicarme los horarios disponibles y los siguientes pasos?",
  },
} as const;

/** One simple, intentional handoff; do not capture clinical data or send automatically. */
export function AlchemySoulLeadForm({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const formId = useId();
  const [format, setFormat] = useState<Format>("60");
  const [topic, setTopic] = useState<Topic>("relationships");

  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: locale === "ru" ? "Алхимия души / Психогомеопатия" : locale === "es" ? "Alquimia del Alma / Psicohomeopatía" : "Alchemy of the Soul / Psycho-homeopathy",
    request: t.greeting + " " + t.question,
    option: t.formatNames[format],
    topic: t.topicNames[topic],
    pagePath: "/" + locale + "/services/alchemy-of-soul",
  });

  return (
    <div className={styles.leadForm} data-alchemy-lead-form="single">
      <label htmlFor={formId + "-format"}>{t.format}
        <select id={formId + "-format"} value={format} onChange={(value) => setFormat(value.target.value as Format)}>
          <option value="60">{t.formatNames["60"]}</option>
          <option value="30">{t.formatNames["30"]}</option>
          <option value="month">{t.formatNames.month}</option>
        </select>
      </label>
      <label htmlFor={formId + "-topic"}>{t.topics}
        <select id={formId + "-topic"} value={topic} onChange={(value) => setTopic(value.target.value as Topic)}>
          {(["relationships", "stress", "business", "direction", "other"] as const).map(key => (
            <option value={key} key={key}>{t.topicNames[key]}</option>
          ))}
        </select>
      </label>
      <div className={styles.formOrder}>
        <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
          event="service_request_start" className={styles.formOrderButton}
          attributes={{ "data-alchemy-booking": "personalised" }} />
      </div>
      <p className={styles.formNote}>{t.note}</p>
      <p className={styles.formPrivacy}><ShieldCheck size={14} aria-hidden="true" />{t.privacy}</p>
    </div>
  );
}


/**
 * Instant order directly underneath the price cards. The selected product
 * controls BOTH WhatsApp and Telegram drafts from the site's standard chooser.
 */
export function AlchemySoulFormatSelector({ locale, wiseEnabled = false, paypalPersonalEnabled = false }: { locale: AlchemyLocale; wiseEnabled?: boolean; paypalPersonalEnabled?: boolean }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<Format>("60");
  const zenInquiryUrl = selected === "month" ? null :
    buildZenTransferInquiry([selected === "30" ? "express-consultation-30" : "personal-session-60"], locale);
  const data = locale === "ru" ? {
    short: "Экспресс-разбор", long: "Личная сессия",
    shortText: "Уточнить ситуацию и следующий шаг.",
    longText: "Более глубокая работа с вашим запросом.",
    monthTitle: "Поддержка в течение месяца",
    monthText: "2 личные сессии + 4 недели сопровождения",
    monthNote: "Стоимость согласуется отдельно · без подписки",
    choice: "Выберите формат",
    choiceHint: "Выберите формат, затем отправьте запрос на удобное время.",
    free: "Сначала бесплатно?",
    freeAction: "Письменный разбор ситуации",
    request: "Здравствуйте! Хочу заказать выбранную услугу «Алхимия души / Психогомеопатия». Уточните, пожалуйста, доступное время и подтвердите условия.",
  } : locale === "es" ? {
    short: "Revisión exprés", long: "Sesión personal",
    shortText: "Aclarar el tema y un primer paso realista.",
    longText: "Explorar en más profundidad tu situación y tus patrones.",
    monthTitle: "Acompañamiento personal de cuatro semanas",
    monthText: "2 sesiones personales + 4 semanas de seguimiento",
    monthNote: "Precio acordado individualmente · sin suscripción",
    choice: "Elige un formato",
    choiceHint: "Selecciona un formato y pulsa Solicitar una sesión.",
    free: "¿Prefieres comenzar gratis?",
    freeAction: "Revisión escrita de tu situación",
    request: "¡Hola! Quisiera solicitar el servicio elegido de Alquimia del Alma / Psicohomeopatía. Indícame los horarios disponibles y confirma las condiciones.",
  } : {
    short: "Express review", long: "Personal session",
    shortText: "Clarify the issue and a realistic first step.",
    longText: "Explore your situation and patterns in more depth.",
    monthTitle: "Four-week personal support",
    monthText: "2 personal sessions + 4 weeks of follow-up",
    monthNote: "Price agreed individually · no subscription",
    choice: "Choose a format",
    choiceHint: "Choose your format, then ask about availability.",
    free: "Prefer to start free?",
    freeAction: "Written situation review",
    request: "Hello! I would like to book the selected Alchemy of the Soul / Psycho-homeopathy service. Please share available times and confirm the terms.",
  };
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: locale === "ru" ? "Алхимия души / Психогомеопатия" : locale === "es" ? "Alquimia del Alma / Psicohomeopatía" : "Alchemy of the Soul / Psycho-homeopathy",
    request: data.request,
    option: t.formatNames[selected],
    pagePath: "/" + locale + "/services/alchemy-of-soul",
  });
  return (
    <div data-alchemy-booking-formats>
      <div className={styles.optionGrid} role="group" aria-label={data.choice}>
        <button type="button" data-alchemy-format="30" aria-pressed={selected === "30"}
          onClick={() => setSelected("30")}
          className={[styles.optionCard, selected === "30" ? styles.optionSelected : ""].filter(Boolean).join(" ")}>
          <span className={styles.optionTime}>{locale === "ru" ? "30 минут" : locale === "es" ? "30 minutos" : "30 minutes"}</span>
          <strong>€50</strong><span className={styles.optionName}>{data.short}</span>
          <span className={styles.optionDescription}>{data.shortText}</span>
          <span className={styles.optionCheck} aria-hidden="true"><Check size={15} /></span>
        </button>
        <button type="button" data-alchemy-format="60" aria-pressed={selected === "60"}
          onClick={() => setSelected("60")}
          className={[styles.optionCard, styles.optionFeatured, selected === "60" ? styles.optionSelected : ""].filter(Boolean).join(" ")}>
          <span className={styles.optionTime}>{locale === "ru" ? "60 минут" : locale === "es" ? "60 minutos" : "60 minutes"}</span>
          <strong>€100</strong><span className={styles.optionName}>{data.long}</span>
          <span className={styles.optionDescription}>{data.longText}</span>
          <span className={styles.optionCheck} aria-hidden="true"><Check size={15} /></span>
        </button>
      </div>
      <button type="button" data-alchemy-format="month" aria-pressed={selected === "month"}
        onClick={() => setSelected("month")}
        className={[styles.monthlyCard, selected === "month" ? styles.monthlySelected : ""].filter(Boolean).join(" ")}>
        <span><span className={styles.monthlyName}>{data.monthTitle}</span>
          <span className={styles.monthlyText}>{data.monthText}</span>
          <small>{data.monthNote}</small></span>
        <span className={styles.monthlySparkle} aria-hidden="true">✧</span>
      </button>
      <p className={styles.formatHint}>{data.choiceHint}</p>
      <div className={styles.optionsOrder}>
        <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
          event="service_request_start" className={styles.optionsOrderButton}
          attributes={{ "data-alchemy-booking": "formats" }} />
      </div>
      {selected !== "month" && (wiseEnabled || paypalPersonalEnabled || Boolean(zenInquiryUrl)) ? (
        <details className={styles.paymentDisclosure} data-alchemy-payment-disclosure>
          <summary>{locale === "ru" ? "Способы оплаты — после подтверждения времени" : locale === "es" ? "Opciones de pago — tras confirmar la hora" : "Payment options — after confirming a time"}</summary>
          <div className={styles.paymentDisclosureBody}>
          {wiseEnabled ? (
            <div className={styles.wisePayment} data-wise-payment-link>
              <a className={styles.wisePaymentCta}
                href={"/api/payments/wise/" + (selected === "30" ? "express-consultation-30" : "personal-session-60")}
                target="_blank" rel="noopener noreferrer">
                {locale === "ru" ? "Перевести через Wise" : locale === "es" ? "Transferir con Wise" : "Send via Wise"}
              </a>
              <small>{locale === "ru"
                ? `После согласования времени проверьте получателя и сумму ${selected === "30" ? "€50" : "€100"} в Wise. При WiseTag нужен аккаунт Wise, сумму введите вручную. Поступление проверяется отдельно.`
                : locale === "es"
                  ? `Después de acordar la hora, verifica el destinatario y ${selected === "30" ? "50 €" : "100 €"} en Wise. WiseTag requiere una cuenta Wise y debes escribir el importe. Comprobamos los pagos manualmente.`
                  : `After agreeing a time, check the recipient and ${selected === "30" ? "€50" : "€100"} in Wise. WiseTag requires a Wise account and manual amount entry. We verify receipt separately; no automatic booking.`}</small>
            </div>
          ) : null}
          {paypalPersonalEnabled ? (
            <div className={styles.wisePayment} data-paypal-personal-offer>
              <a className={styles.wisePaymentCta}
                href={"/api/payments/paypal/" + (selected === "30" ? "express-consultation-30" : "personal-session-60")}
                target="_blank" rel="noopener noreferrer">
                {locale === "ru" ? "Оплатить личным PayPal" : locale === "es" ? "Pagar con PayPal personal" : "Pay with personal PayPal"}
              </a>
              <small>{locale === "ru"
                ? "После согласования сеанса. Выберите «Товары и услуги», проверьте получателя Andrii Litvinov; поступление проверяется вручную."
                : locale === "es"
                  ? "Tras acordar la sesión, elige Productos y servicios y comprueba Andrii Litvinov. Verificación manual."
                  : "After agreeing the session, choose Goods & Services and verify Andrii Litvinov. Manual payment verification."}</small>
              <Link href={"/" + locale + "/payments"}>
                {locale === "ru" ? "Условия и подтверждение оплаты" : locale === "es" ? "Instrucciones y confirmación" : "Payment details & confirmation"}
              </Link>
            </div>
          ) : null}
          {zenInquiryUrl ? (
            <div className={styles.wisePayment} data-zen-manual-request>
              <a className={styles.wisePaymentCta} href={zenInquiryUrl}
                target="_blank" rel="noopener noreferrer">
                {locale === "ru" ? "ZEN.COM · запросить перевод" : locale === "es" ? "ZEN.COM · solicitar transferencia" : "ZEN.COM · request transfer details"}
              </a>
              <small>{locale === "ru"
                ? "Это запрос реквизитов для разовой сессии, а не оплата. Сначала согласуйте время и подтвердите возможность перевода в ZEN."
                : locale === "es"
                  ? "Solicitud de instrucciones para transferencia, no un pago. Acuerda la sesión y verifica si ZEN está disponible."
                  : "Only a request for transfer instructions, not a completed payment. Agree a session time and confirm ZEN availability first."}</small>
            </div>
          ) : null}
          </div>
        </details>
      ) : null}
      <p className={styles.freeOption}>{data.free} <Link href={"/" + locale + "/services/free-situation-review"}>{data.freeAction}</Link></p>
    </div>
  );
}
