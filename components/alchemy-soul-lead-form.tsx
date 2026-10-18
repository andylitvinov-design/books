"use client";

import { useId, useState } from "react";
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
      month: "4 недели сопровождения · обсудить условия",
    },
    topicNames: {
      relationships: "Отношения",
      stress: "Стресс и внутренние блоки",
      business: "Работа и деньги",
      direction: "Цели и смысл",
      other: "Другая тема",
    },
    action: "Заказать сеанс",
    note: "Выберите WhatsApp или Telegram, проверьте заявку и подтвердите отправку. Время сеанса согласуется лично, без автоматической оплаты.",
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
      month: "Four-week support · discuss details",
    },
    topicNames: {
      relationships: "Relationships",
      stress: "Stress and inner blocks",
      business: "Work and money",
      direction: "Goals and meaning",
      other: "Another topic",
    },
    action: "Book a session",
    note: "Choose WhatsApp or Telegram and confirm sending. We agree the session time personally; no automatic charge.",
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
    note: "Elige WhatsApp o Telegram, revisa el mensaje y decide si lo envías. Acordaremos la hora personalmente; no se realiza ningún cobro automático.",
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
  const [name, setName] = useState("");

  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: locale === "ru" ? "Алхимия души / Психогомеопатия" : locale === "es" ? "Alquimia del Alma / Psicohomeopatía" : "Alchemy of the Soul / Psycho-homeopathy",
    request: t.greeting + " " + t.question,
    option: t.formatNames[format],
    topic: t.topicNames[topic],
    ...(name.trim() ? { context: t.nameField + ": " + name.trim() } : {}),
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
      <label htmlFor={formId + "-name"}>{t.name}
        <input id={formId + "-name"} name="name" autoComplete="given-name" maxLength={70} placeholder={t.namePlaceholder} value={name} onChange={(value) => setName(value.target.value)} />
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
export function AlchemySoulFormatSelector({ locale }: { locale: AlchemyLocale }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<Format>("60");
  const data = locale === "ru" ? {
    short: "Экспресс-разбор", long: "Личная сессия",
    shortText: "Уточнить ситуацию и следующий шаг.",
    longText: "Более глубокая работа с вашим запросом.",
    monthTitle: "Поддержка в течение месяца",
    monthText: "2 личные сессии + 4 недели сопровождения",
    monthNote: "Стоимость согласуется отдельно · без подписки",
    choice: "Выберите формат",
    choiceHint: "Отметьте подходящий формат и нажмите «Заказать сеанс».",
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
    choiceHint: "Select the format, then tap Book a session.",
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
      <p className={styles.freeOption}>{data.free} <Link href={"/" + locale + "/services/free-situation-review"}>{data.freeAction}</Link></p>
    </div>
  );
}
