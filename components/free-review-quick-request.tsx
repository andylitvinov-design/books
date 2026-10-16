"use client";

import { useId, useState } from "react";
import { MessageCircle } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./free-review-quick-request.module.css";

const copy = {
  en: {
    eyebrow: "FREE PERSONAL SITUATION REVIEW",
    title: "Tell me what you would like to change",
    lead: "A short message is enough to begin. No questionnaire, drawing or account needed for this first enquiry.",
    name: "Your name (optional)",
    namePlaceholder: "How should I address you?",
    question: "What would you like help with? (optional)",
    questionPlaceholder: "A decision, relationship, work, inner balance…",
    action: "Request my free review",
    request: "I'd like to start the free personal situation review and receive instructions for the written report.",
    nameLabel: "Name",
    questionLabel: "Initial question",
    note: "Choose WhatsApp or Telegram, review the prepared message and press Send there. Nothing is sent or stored on this page. To prepare the complete written review, I may ask for a short questionnaire and a paper drawing afterwards. This is not a free live call.",
  },
  ru: {
    eyebrow: "БЕСПЛАТНЫЙ ЛИЧНЫЙ РАЗБОР",
    title: "С чего вы хотите начать?",
    lead: "Для первого обращения достаточно пары слов. Никаких анкет, рисунков и регистрации.",
    name: "Как к вам обращаться? (необязательно)",
    namePlaceholder: "Ваше имя",
    question: "С чем хотите разобраться? (необязательно)",
    questionPlaceholder: "Отношения, решение, работа, внутреннее состояние…",
    action: "Получить бесплатный разбор",
    request: "Хочу начать бесплатный личный разбор ситуации и получить инструкции для письменного отчёта.",
    nameLabel: "Имя",
    questionLabel: "Мой вопрос",
    note: "Выберите WhatsApp или Telegram, проверьте сообщение и нажмите «Отправить» в мессенджере. На сайте данные не сохраняются и не отправляются. Для полного письменного разбора я затем могу попросить короткую анкету и рисунок на бумаге. Бесплатного созвона нет.",
  },
  es: {
    eyebrow: "REVISIÓN PERSONAL GRATUITA",
    title: "¿Qué te gustaría cambiar?",
    lead: "Un mensaje breve es suficiente para empezar. Sin formulario largo, dibujo ni registro en el primer contacto.",
    name: "Tu nombre (opcional)",
    namePlaceholder: "¿Cómo te llamas?",
    question: "¿Qué te gustaría explorar? (opcional)",
    questionPlaceholder: "Relaciones, decisiones, trabajo, equilibrio personal…",
    action: "Solicitar revisión gratuita",
    request: "Quiero comenzar la revisión personal gratuita y recibir indicaciones para el informe escrito.",
    nameLabel: "Nombre",
    questionLabel: "Mi pregunta",
    note: "Elige WhatsApp o Telegram, revisa el mensaje preparado y pulsa Enviar allí. Esta página no envía ni guarda tus datos. Para el informe completo puedo pedir después un formulario breve y un dibujo en papel. No incluye una llamada gratuita.",
  },
} as const;

export function FreeReviewQuickRequest({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const headingId = useId();
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const context = [
    ...(name.trim() ? [t.nameLabel + ": " + name.trim().slice(0, 80)] : []),
    ...(question.trim() ? [t.questionLabel + ": " + question.trim().slice(0, 300)] : []),
  ].join(" | ");
  // The optional text goes only into a visitor-triggered messenger draft, never a server request.
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: t.eyebrow,
    request: t.request,
    context,
    pagePath: "/" + locale + "/services/free-situation-review",
  });

  return (
    <section className={styles.card} aria-labelledby={headingId} data-free-quick-request lang={locale}>
      <p className={styles.eyebrow}><MessageCircle size={17} aria-hidden="true"/>{t.eyebrow}</p>
      <h2 id={headingId}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
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
      <ContactChannelChooser
        locale={locale}
        whatsappUrl={whatsappUrl}
        label={t.action}
        className={styles.action}
        event="service_request_start"
        attributes={{ "data-free-review-quick-enquiry": "true" }}
      />
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
