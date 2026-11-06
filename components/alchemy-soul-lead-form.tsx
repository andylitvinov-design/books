"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/data/remedies";
type AlchemyLocale = Locale | "es";
import styles from "./alchemy-soul-landing.module.css";

type Format = "60" | "30" | "month";
type Topic = "relationships" | "stress" | "business" | "direction" | "other";

const copy = {
  ru: {
    name: "Как к вам обращаться? (необязательно)",
    namePlaceholder: "Ваше имя",
    format: "Формат",
    topics: "Тема",
    formatNames: {
      "60": "Личная сессия · 60 минут · €100",
      "30": "Экспресс · 30 минут · €50",
      month: "Личное сопровождение · 4 недели · €200 · 2 × 60 минут",
    },
    topicNames: {
      relationships: "Отношения",
      stress: "Стресс и внутренние блоки",
      business: "Работа и деньги",
      direction: "Цели и смысл",
      other: "Другая тема",
    },
    action: "Забронировать сеанс",
    note: "Забронируйте по телефону или через Google. Время сначала подтверждает Андрей; автоматического списания нет.",
    privacy: "Не вводите здесь диагнозы или медицинские сведения — подробности обсудим лично.",
    telegram: "Или напишите мне в Telegram",
    greeting: "Здравствуйте! Хочу заказать сеанс «Алхимия души / Психогомеопатия».",
    formatField: "Формат",
    topicField: "Тема",
    nameField: "Имя",
    question: "Подскажите, пожалуйста, свободное время и следующие шаги.",
  },
  en: {
    name: "Your name (optional)",
    namePlaceholder: "How should I address you?",
    format: "Session format",
    topics: "Topic",
    formatNames: {
      "60": "Personal session · 60 min · €100",
      "30": "Express review · 30 min · €50",
      month: "Four-week personal support · €200 · 2 × 60 min",
    },
    topicNames: {
      relationships: "Relationships",
      stress: "Stress and inner blocks",
      business: "Work and money",
      direction: "Goals and meaning",
      other: "Another topic",
    },
    action: "Book a Session",
    note: "Book with your phone or Google. Andrey confirms a time personally before payment; no automatic charge.",
    privacy: "Please don't enter diagnoses or confidential health details here. We can discuss your question directly.",
    telegram: "Or message me on Telegram",
    greeting: "Hello! I would like to book an Alchemy of the Soul / Psycho-homeopathy session.",
    formatField: "Format",
    topicField: "Topic",
    nameField: "Name",
    question: "Please let me know availability and the next steps.",
  },
  es: {
    name: "¿Cómo te llamas? (opcional)",
    namePlaceholder: "Tu nombre",
    format: "Formato de la sesión",
    topics: "Tema",
    formatNames: {
      "60": "Sesión personal · 60 minutos · €100",
      "30": "Revisión exprés · 30 minutos · €50",
      month: "Acompañamiento de cuatro semanas · 200 € · 2 × 60 min",
    },
    topicNames: {
      relationships: "Relaciones",
      stress: "Estrés y bloqueos internos",
      business: "Trabajo y dinero",
      direction: "Metas y sentido",
      other: "Otro tema",
    },
    action: "Reservar una sesión",
    note: "Reserva con tu teléfono o Google. Andrey confirmará primero la hora; no hay cobro automático.",
    privacy: "No incluyas diagnósticos ni datos médicos confidenciales. Podemos hablar de los detalles personalmente.",
    telegram: "O escríbeme por Telegram",
    greeting: "¡Hola! Quisiera solicitar una sesión de Alquimia del Alma / Psicohomeopatía.",
    formatField: "Formato",
    topicField: "Tema",
    nameField: "Nombre",
    question: "¿Podrías indicarme los horarios disponibles y los siguientes pasos?",
  },
} as const;

/** One simple, intentional handoff; do not capture clinical data or send automatically. */
export function AlchemySoulLeadForm({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const formId = useId();
  const [format, setFormat] = useState<Format>("60");
  const [topic, setTopic] = useState<Topic>("relationships");
  // Only a public product choice survives Google OAuth; no contact or health data.
  useEffect(() => {
    try {
      const previous = window.sessionStorage.getItem("hh-alchemy-contact-format");
      if (previous === "30" || previous === "60" || previous === "month") setFormat(previous);
    } catch { /* Private browsing can block storage. */ }
  }, []);
  const selectFormat = (value: Format) => {
    setFormat(value);
    try { window.sessionStorage.setItem("hh-alchemy-contact-format", value); }
    catch { /* The form remains usable without storage. */ }
  };

  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: locale === "ru" ? "Алхимия души / Психогомеопатия" : locale === "es" ? "Alquimia del Alma / Psicohomeopatía" : "Alchemy of the Soul / Psycho-homeopathy",
    request: t.greeting + " " + t.question,
    option: t.formatNames[format],
    // A personal topic belongs only in the consented CRM request, never the
    // WhatsApp/Telegram draft, where it might reveal sensitive context.
    pagePath: "/" + locale + "/services/alchemy-of-soul",
  });

  return (
    <div className={styles.leadForm} data-alchemy-lead-form="single">
      <label htmlFor={formId + "-format"}>{t.format}
        <select id={formId + "-format"} value={format} onChange={(value) => selectFormat(value.target.value as Format)}>
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
        {format === "month" ? (
          <Link className={styles.monthlyLearnMore} href={"/" + locale + "/services/personal-support"} data-alchemy-monthly-link>
            {locale === "ru" ? "Условия и заявка · €200" : locale === "es" ? "Detalles y solicitud · 200 €" : "Details & enquiry · €200"}
          </Link>
        ) : (
          <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
            compactPhone compactTrigger stayAfterSave resetKey={format + ":" + topic}
            bookingSku={format === "30" ? "express-consultation-30" : "personal-session-60"}
            publicTopic={t.formatField + ": " + t.formatNames[format] + "; " + t.topicField + ": " + t.topicNames[topic]}
            event="service_request_start" className={styles.formOrderButton}
            attributes={{ "data-alchemy-booking": "personalised" }} />
        )}
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
export function AlchemySoulFormatSelector({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<Format>("60");
  useEffect(() => {
    try {
      const previous = window.sessionStorage.getItem("hh-alchemy-selected-format");
      if (previous === "30" || previous === "60" || previous === "month") setSelected(previous);
    } catch { /* Default approved option remains. */ }
  }, []);
  const selectFormat = (value: Format) => {
    setSelected(value);
    try { window.sessionStorage.setItem("hh-alchemy-selected-format", value); }
    catch { /* No storage dependency. */ }
  };
  const data = locale === "ru" ? {
    short: "Экспресс-разбор", long: "Личная сессия",
    shortText: "Уточнить ситуацию и следующий шаг.",
    longText: "Более глубокая работа с вашим запросом.",
    monthTitle: "Поддержка в течение месяца",
    monthText: "2 × 60 минут + вопросы между сессиями",
    monthNote: "€200 за месяц · без автопродления",
    choice: "Выберите формат",
    choiceHint: "Выберите формат и забронируйте по телефону или Google. Оплата — после подтверждения времени.",
    free: "Сначала бесплатно?",
    freeAction: "Письменный разбор ситуации",
    request: "Здравствуйте! Хочу заказать выбранную услугу «Алхимия души / Психогомеопатия». Уточните, пожалуйста, доступное время и подтвердите условия.",
  } : locale === "es" ? {
    short: "Revisión exprés", long: "Sesión personal",
    shortText: "Aclarar el tema y un primer paso realista.",
    longText: "Explorar en más profundidad tu situación y tus patrones.",
    monthTitle: "Acompañamiento personal de cuatro semanas",
    monthText: "2 × 60 min + preguntas entre sesiones",
    monthNote: "200 € al mes · sin renovación automática",
    choice: "Elige un formato",
    choiceHint: "Elige un formato y reserva con teléfono o Google. El pago aparece tras confirmar la hora.",
    free: "¿Prefieres comenzar gratis?",
    freeAction: "Revisión escrita de tu situación",
    request: "¡Hola! Quisiera solicitar el servicio elegido de Alquimia del Alma / Psicohomeopatía. Indícame los horarios disponibles y confirma las condiciones.",
  } : {
    short: "Express review", long: "Personal session",
    shortText: "Clarify the issue and a realistic first step.",
    longText: "Explore your situation and patterns in more depth.",
    monthTitle: "Four-week personal support",
    monthText: "2 × 60 min + questions between sessions",
    monthNote: "€200 per month · no automatic renewal",
    choice: "Choose a format",
    choiceHint: "Choose your format, then book by phone or Google. Andrey confirms the time before payment.",
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
          onClick={() => selectFormat("30")}
          className={[styles.optionCard, selected === "30" ? styles.optionSelected : ""].filter(Boolean).join(" ")}>
          <span className={styles.optionTime}>{locale === "ru" ? "30 минут" : locale === "es" ? "30 minutos" : "30 minutes"}</span>
          <strong>€50</strong><span className={styles.optionName}>{data.short}</span>
          <span className={styles.optionDescription}>{data.shortText}</span>
          <span className={styles.optionCheck} aria-hidden="true"><Check size={15} /></span>
        </button>
        <button type="button" data-alchemy-format="60" aria-pressed={selected === "60"}
          onClick={() => selectFormat("60")}
          className={[styles.optionCard, styles.optionFeatured, selected === "60" ? styles.optionSelected : ""].filter(Boolean).join(" ")}>
          <span className={styles.optionTime}>{locale === "ru" ? "60 минут" : locale === "es" ? "60 minutos" : "60 minutes"}</span>
          <strong>€100</strong><span className={styles.optionName}>{data.long}</span>
          <span className={styles.optionDescription}>{data.longText}</span>
          <span className={styles.optionCheck} aria-hidden="true"><Check size={15} /></span>
        </button>
      </div>
      <button type="button" data-alchemy-format="month" aria-pressed={selected === "month"}
        onClick={() => selectFormat("month")}
        className={[styles.monthlyCard, selected === "month" ? styles.monthlySelected : ""].filter(Boolean).join(" ")}>
        <span><span className={styles.monthlyName}>{data.monthTitle}</span>
          <span className={styles.monthlyText}>{data.monthText}</span>
          <small>{data.monthNote}</small></span>
        <span className={styles.monthlySparkle} aria-hidden="true">✧</span>
      </button>
      <details className={styles.formatMore} data-alchemy-format-details>
        <summary>{locale === "ru" ? "Чем отличаются форматы" : locale === "es" ? "Qué incluye cada formato" : "What each format includes"}</summary>
        <div>
          <p><strong>{data.short}</strong> — {data.shortText}</p>
          <p><strong>{data.long}</strong> — {data.longText}</p>
          <p><strong>{data.monthTitle}</strong> — {data.monthText} {data.monthNote}</p>
        </div>
      </details>
      <p className={styles.formatHint}>{data.choiceHint}</p>
      <div className={styles.optionsOrder}>
        {selected === "month" ? (
          <Link className={styles.monthlyLearnMore} href={"/" + locale + "/services/personal-support"} data-alchemy-monthly-link>
            {locale === "ru" ? "Подробнее и запросить · €200" : locale === "es" ? "Detalles y solicitud · 200 €" : "View monthly support · €200"}
          </Link>
        ) : (
          <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
            compactPhone compactTrigger stayAfterSave resetKey={selected}
            bookingSku={selected === "30" ? "express-consultation-30" : "personal-session-60"}
            publicTopic={t.formatField + ": " + t.formatNames[selected]}
            event="service_request_start" className={styles.optionsOrderButton}
            attributes={{ "data-alchemy-booking": "formats" }} />
        )}
      </div>
      <p className={styles.freeOption}>{data.free} <Link href={"/" + locale + "/services/free-situation-review"}>{data.freeAction}</Link></p>
    </div>
  );
}
