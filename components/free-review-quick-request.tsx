"use client";

import { useId, useState } from "react";
import { MessageCircle } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./free-review-quick-request.module.css";

type ConsultationFormat = "free" | "mini" | "full";
const formats: ConsultationFormat[] = ["free", "mini", "full"];

const copy = {
  en: {
    eyebrow: "PERSONAL GUIDANCE · ANDREY LITVINOV",
    title: "Choose your consultation",
    lead: "Select the format that suits you. A short message is enough to start — no long questionnaire or account.",
    choose: "Which format would you prefer?",
    options: {
      free: {
        label: "Free consultation",
        detail: "Personal written situation review · no live call",
        price: "Free",
        request: "I would like the free written situation review. Please send me instructions for the short questionnaire and hand drawing. I understand this is not a live call.",
      },
      mini: {
        label: "Mini session",
        detail: "Personal consultation · 30 minutes",
        price: "€50",
        request: "I would like to book a paid 30-minute personal mini session for €50. Please let me know the available times.",
      },
      full: {
        label: "Full session",
        detail: "Personal consultation · 60 minutes",
        price: "€100",
        request: "I would like to book a paid 60-minute personal session for €100. Please let me know the available times.",
      },
    },
    service: "Personal consultation with Andrey Litvinov",
    name: "Your name (optional)",
    namePlaceholder: "How should I address you?",
    question: "What would you like help with? (optional)",
    questionPlaceholder: "A decision, relationship, work, inner balance…",
    action: "Send my request",
    nameLabel: "Name",
    questionLabel: "Initial question",
    detailsLabel: "Add your name or a short note (optional)",
    privacyLabel: "How the request works",
    shortNote: "The free option is a written review, not a call. You choose where to send your message.",
    note: "Choose WhatsApp or Telegram, review the message and press Send there. No booking or payment is made automatically. The free option is a written review (questionnaire + paper drawing), not a free live call. Nothing is stored or sent by this website.",
  },
  ru: {
    eyebrow: "ЛИЧНАЯ КОНСУЛЬТАЦИЯ · АНДРЕЙ ЛИТВИНОВ",
    title: "Выберите формат консультации",
    lead: "Начните с короткой заявки без большой анкеты и регистрации.",
    choose: "Какой формат вам подходит?",
    options: {
      free: {
        label: "Бесплатная консультация",
        detail: "Письменный разбор ситуации · без созвона",
        price: "Бесплатно",
        request: "Хочу получить бесплатный письменный разбор ситуации. Пришлите инструкцию к короткой анкете и рисунку от руки. Понимаю, что это не созвон.",
      },
      mini: {
        label: "Мини-сессия",
        detail: "Личная консультация · 30 минут",
        price: "€50",
        request: "Хочу записаться на платную мини-сессию 30 минут за €50. Подскажите доступное время.",
      },
      full: {
        label: "Полноценная сессия",
        detail: "Личная консультация · 60 минут",
        price: "€100",
        request: "Хочу записаться на полноценную платную сессию 60 минут за €100. Подскажите доступное время.",
      },
    },
    service: "Личная консультация Андрея Литвинова",
    name: "Как к вам обращаться? (необязательно)",
    namePlaceholder: "Ваше имя",
    question: "С чем хотите разобраться? (необязательно)",
    questionPlaceholder: "Отношения, решение, работа, внутреннее состояние…",
    action: "Отправить заявку",
    nameLabel: "Имя",
    questionLabel: "Мой вопрос",
    detailsLabel: "Добавить имя или пару слов о запросе (необязательно)",
    privacyLabel: "Как отправляется заявка",
    shortNote: "Бесплатный формат — письменный разбор, не созвон. Сообщение вы отправляете сами.",
    note: "Выберите WhatsApp или Telegram, проверьте сообщение и нажмите «Отправить» в мессенджере. Запись и оплата не происходят автоматически. Бесплатный вариант — письменный разбор по анкете и рисунку, без созвона. Сайт ничего не сохраняет и не отправляет сам.",
  },
  es: {
    eyebrow: "CONSULTA PERSONAL · ANDREY LITVINOV",
    title: "Elige tu tipo de consulta",
    lead: "Una solicitud breve es suficiente para empezar, sin formulario largo ni registro.",
    choose: "¿Qué opción prefieres?",
    options: {
      free: {
        label: "Consulta gratuita",
        detail: "Revisión escrita de tu situación · sin llamada",
        price: "Gratis",
        request: "Quiero una revisión escrita gratuita de mi situación. Envíame instrucciones para el formulario breve y el dibujo a mano. Entiendo que no incluye una llamada.",
      },
      mini: {
        label: "Mini sesión",
        detail: "Consulta personal · 30 minutos",
        price: "€50",
        request: "Quisiera reservar una mini sesión personal de 30 minutos por €50. Indícame los horarios disponibles.",
      },
      full: {
        label: "Sesión completa",
        detail: "Consulta personal · 60 minutos",
        price: "€100",
        request: "Quisiera reservar una sesión personal completa de 60 minutos por €100. Indícame los horarios disponibles.",
      },
    },
    service: "Consulta personal con Andrey Litvinov",
    name: "Tu nombre (opcional)",
    namePlaceholder: "¿Cómo te llamas?",
    question: "¿Qué te gustaría explorar? (opcional)",
    questionPlaceholder: "Relaciones, decisiones, trabajo, equilibrio personal…",
    action: "Enviar solicitud",
    nameLabel: "Nombre",
    questionLabel: "Mi pregunta",
    detailsLabel: "Añadir nombre o pregunta (opcional)",
    privacyLabel: "Cómo funciona la solicitud",
    shortNote: "La opción gratuita es un informe escrito, sin llamada. Tú decides cómo enviar el mensaje.",
    note: "Elige WhatsApp o Telegram, revisa el mensaje y pulsa Enviar allí. No se reserva ni se cobra automáticamente. La opción gratuita es un informe escrito con formulario y dibujo, no una llamada. Este sitio no almacena ni envía tus datos.",
  },
} as const;

/** Both capture placements share this one source of truth for price, duration and handoff. */
export function FreeReviewQuickRequest({ locale, pagePath }: { locale: PublicLocale; pagePath?: string }) {
  const t = copy[locale];
  const headingId = useId();
  const formatName = useId();
  const [format, setFormat] = useState<ConsultationFormat>("free");
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const selected = t.options[format];
  const context = [
    ...(name.trim() ? [t.nameLabel + ": " + name.trim().slice(0, 80)] : []),
    ...(question.trim() ? [t.questionLabel + ": " + question.trim().slice(0, 300)] : []),
  ].join(" | ");

  // Visitor decides to open a messenger and press Send; there is no silent request or charge.
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: t.service,
    option: [selected.label, selected.detail, selected.price].join(" · "),
    request: selected.request,
    context,
    pagePath: pagePath || "/" + locale + "/services/free-situation-review",
  });

  return (
    <section className={styles.card} aria-labelledby={headingId} data-free-quick-request lang={locale}>
      <p className={styles.eyebrow}><MessageCircle size={17} aria-hidden="true"/>{t.eyebrow}</p>
      <h2 id={headingId}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <fieldset className={styles.formatChoices}>
        <legend>{t.choose}</legend>
        <div className={styles.optionList}>
          {formats.map((value) => {
            const option = t.options[value];
            return (
              <label key={value} className={styles.option} data-selected={format === value} data-consultation-option={value}>
                <input type="radio" name={formatName} value={value} checked={format === value}
                  onChange={() => setFormat(value)} />
                <span className={styles.optionText}>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
                <span className={styles.optionPrice}>{option.price}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <details className={styles.moreFields}>
        <summary>{t.detailsLabel}</summary>
        <div className={styles.fields}>
          <label>{t.name}
            <input type="text" autoComplete="given-name" maxLength={80}
              value={name} placeholder={t.namePlaceholder} onChange={(event) => setName(event.target.value)}/>
          </label>
          <label>{t.question}
            <textarea rows={2} maxLength={300}
              value={question} placeholder={t.questionPlaceholder} onChange={(event) => setQuestion(event.target.value)}/>
          </label>
        </div>
      </details>
      <ContactChannelChooser
        locale={locale}
        whatsappUrl={whatsappUrl}
        label={t.action}
        className={styles.action}
        event="service_request_start"
        attributes={{ "data-free-review-quick-enquiry": "true", "data-consultation-format": format }}
      />
      <p className={styles.shortNote}>{t.shortNote}</p>
      <details className={styles.privacyNote}>
        <summary>{t.privacyLabel}</summary>
        <p className={styles.note}>{t.note}</p>
      </details>
    </section>
  );
}
