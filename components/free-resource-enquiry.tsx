"use client";

import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-resource-enquiry.module.css";

type EnquiryKind = "situation" | "dao";
const text = {
  en: {
    name: "Your name (optional)",
    namePlaceholder: "How should Andrey address you?",
    topic: "What would you like to explore?",
    question: "A little about your question (optional)",
    questionPlaceholder: "One or two sentences are enough.",
    action: "Continue with a free request",
    copyDetails: "Copy my details", copied: "Copied. Paste these details in your chat.", copyError: "Copy unavailable: select and copy the note below.",
    note: "Choose WhatsApp or Telegram to review the prepared message. Nothing is stored on this page or sent before you confirm it in the messenger.",
    situation: {
      title: "Your free written review",
      lead: "Start with one topic. Andrey will explain how to send the short questionnaire and your handwritten drawing.",
      service: "Free written Situation Review",
      request: "I would like a free written situation review. Please tell me how to send my completed coaching questionnaire and the handwritten ME / GOAL / PROBLEM drawing. I understand this is not a live call.",
      topics: ["Relationships & family", "Personal decision", "Work & business", "Inner state / resources"],
    },
    dao: {
      title: "Your free Wu Xing enquiry",
      lead: "Choose an area that interests you and prepare a short message for a personal symbolic resource review.",
      service: "Free symbolic Wu Xing Resource Profile",
      request: "I would like to request the free symbolic Wu Xing Resource Profile. Please explain the next step. I understand this is a self-reflection model, not a medical assessment.",
      topics: ["Balance & everyday energy", "Focus & direction", "Relationships & connection", "Personal strengths & resources"],
    },
  },
  ru: {
    name: "Как к вам обращаться? (необязательно)",
    namePlaceholder: "Ваше имя",
    topic: "Какой вопрос хотите исследовать?",
    question: "Пара слов о запросе (необязательно)",
    questionPlaceholder: "Достаточно одного-двух предложений.",
    action: "Продолжить бесплатный запрос",
    copyDetails: "Скопировать мой запрос", copied: "Скопировано. Вставьте эти детали в чат.", copyError: "Копирование недоступно: выделите текст ниже и скопируйте.",
    note: "Выберите WhatsApp или Telegram, проверьте текст и сами подтвердите отправку. Сайт не сохраняет ответы и не отправляет их автоматически.",
    situation: {
      title: "Ваш бесплатный письменный разбор",
      lead: "Выберите тему. Андрей подскажет, как прислать короткую анкету и рисунок от руки.",
      service: "Бесплатный письменный разбор ситуации",
      request: "Хочу получить бесплатный письменный разбор ситуации. Подскажите, как прислать коучинг-анкету и рисунок «Я / ЦЕЛЬ / ПРОБЛЕМА» от руки. Понимаю, что это не видеозвонок.",
      topics: ["Отношения и семья", "Личное решение", "Работа и бизнес", "Внутреннее состояние и ресурсы"],
    },
    dao: {
      title: "Бесплатный запрос профиля У-Син",
      lead: "Выберите область интереса и подготовьте короткий запрос на символический профиль ресурсов.",
      service: "Бесплатный символический профиль ресурсов У-Син",
      request: "Хочу получить бесплатный символический профиль ресурсов У-Син. Подскажите следующий шаг. Понимаю, что это инструмент самоисследования, а не медицинская диагностика.",
      topics: ["Баланс и энергия", "Фокус и направление", "Отношения и контакт", "Сильные стороны и опоры"],
    },
  },
  es: {
    name: "Tu nombre (opcional)",
    namePlaceholder: "¿Cómo te llamas?",
    topic: "¿Qué te gustaría explorar?",
    question: "Unas palabras sobre tu pregunta (opcional)",
    questionPlaceholder: "Una o dos frases son suficientes.",
    action: "Continuar con la solicitud gratuita",
    copyDetails: "Copiar mis detalles", copied: "Copiado. Pega estos detalles en el chat.", copyError: "No se pudo copiar: selecciona el texto siguiente.",
    note: "Elige WhatsApp o Telegram, revisa el mensaje y confirma el envío tú mismo. Esta página no almacena ni envía tus respuestas automáticamente.",
    situation: {
      title: "Tu revisión gratuita por escrito",
      lead: "Elige un tema. Andrey te explicará cómo enviar el cuestionario breve y tu dibujo a mano.",
      service: "Revisión escrita gratuita de la situación",
      request: "Quiero una revisión escrita gratuita de mi situación. Explícame cómo enviar el cuestionario y el dibujo YO / META / PROBLEMA a mano. Entiendo que no incluye videollamada.",
      topics: ["Relaciones y familia", "Decisión personal", "Trabajo y negocio", "Estado interior y recursos"],
    },
    dao: {
      title: "Tu consulta gratuita Wu Xing",
      lead: "Elige un aspecto que te interese y prepara una solicitud para una reflexión simbólica sobre tus recursos.",
      service: "Perfil simbólico gratuito de recursos Wu Xing",
      request: "Quisiera solicitar el perfil simbólico gratuito de recursos Wu Xing. Explícame el siguiente paso. Entiendo que no es una evaluación médica.",
      topics: ["Equilibrio y energía diaria", "Enfoque y dirección", "Relaciones y conexión", "Fortalezas personales y recursos"],
    },
  },
} as const;

export function FreeResourceEnquiry({ locale, kind }: { locale: PublicLocale; kind: EnquiryKind }) {
  const t = text[locale];
  const offer = t[kind];
  const [topic, setTopic] = useState(0);
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const privateContext = [
    name.trim() ? t.name + ": " + name.trim().slice(0, 80) : "",
    question.trim() ? t.question + ": " + question.trim().slice(0, 350) : "",
  ].filter(Boolean).join(" | ");
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: offer.service,
    request: offer.request,
    topic: offer.topics[topic],
    // Only the editorially approved broad topic is placed in either messenger URL.
    // Visitor-specific name/question stay in the page until intentionally copied.
    pagePath: "/" + locale + "/services/" + (kind === "dao" ? "dao-health-profile" : "free-situation-review"),
  });
  async function copyPrivateContext() {
    if (!privateContext) return;
    try {
      await navigator.clipboard.writeText(privateContext);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className={styles.form} data-free-resource-enquiry={kind} aria-label={offer.title}>
      <p className={styles.eyebrow}><MessageCircle size={16} aria-hidden="true" />{offer.title}</p>
      <p className={styles.lead}>{offer.lead}</p>
      <div className={styles.fields}>
        <label>{t.topic}
          <select value={topic} onChange={(event) => setTopic(Number(event.target.value))}>
            {offer.topics.map((item, index) => <option key={item} value={index}>{item}</option>)}
          </select>
        </label>
        <label>{t.name}
          <input value={name} onChange={(event) => { setName(event.target.value); setCopyStatus("idle"); }} type="text" maxLength={80} autoComplete="name" placeholder={t.namePlaceholder} />
        </label>
        <label>{t.question}
          <textarea rows={3} maxLength={350} value={question} onChange={(event) => { setQuestion(event.target.value); setCopyStatus("idle"); }} placeholder={t.questionPlaceholder} />
        </label>
      </div>
      {privateContext ? <div className={styles.copyRegion}>
        <button type="button" className={styles.copyButton} onClick={() => { void copyPrivateContext(); }}>{t.copyDetails}</button>
        <p className={styles.copyStatus} role="status">{copyStatus === "copied" ? t.copied : copyStatus === "error" ? t.copyError : null}</p>
        {copyStatus === "error" ? <textarea readOnly value={privateContext} rows={3} aria-label={t.copyDetails} onFocus={(event) => event.currentTarget.select()} /> : null}
      </div> : null}
      <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
        className={styles.action} event="service_request_start" attributes={{ "data-free-enquiry-kind": kind }} />
      <p className={styles.note}><ShieldCheck size={16} aria-hidden="true" />{t.note}</p>
    </section>
  );
}
