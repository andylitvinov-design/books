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
    action: "Send a free request", topicOptional: "Choose a topic (optional)", anyTopic: "Any topic",
    copyDetails: "Copy my details", copied: "Copied. Paste these details in your chat.", copyError: "Copy unavailable: select and copy the note below.",
    note: "Your contact and selected broad topic are saved only when you send the request. No marketing or paid booking.",
    situation: {
      title: "Your free written review",
      lead: "Leave just one contact. Andrey will explain how to share your questionnaire and drawing.",
      service: "Free written Situation Review",
      request: "I would like a free written situation review. Please tell me how to send my completed coaching questionnaire and the handwritten ME / GOAL / PROBLEM drawing. I understand this is not a live call.",
      topics: ["Relationships & family", "Personal decision", "Work & business", "Inner state / resources"],
    },
    dao: {
      title: "Your free Wu Xing enquiry",
      lead: "One contact is enough to request your free symbolic profile.",
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
    action: "Отправить бесплатный запрос", topicOptional: "Уточнить тему (необязательно)", anyTopic: "Любая тема",
    copyDetails: "Скопировать мой запрос", copied: "Скопировано. Вставьте эти детали в чат.", copyError: "Копирование недоступно: выделите текст ниже и скопируйте.",
    note: "Контакт и выбранная общая тема сохраняются только после отправки заявки. Без рекламной подписки и платной записи.",
    situation: {
      title: "Ваш бесплатный письменный разбор",
      lead: "Оставьте один контакт. Андрей подскажет, как прислать анкету и рисунок.",
      service: "Бесплатный письменный разбор ситуации",
      request: "Хочу получить бесплатный письменный разбор ситуации. Подскажите, как прислать коучинг-анкету и рисунок «Я / ЦЕЛЬ / ПРОБЛЕМА» от руки. Понимаю, что это не видеозвонок.",
      topics: ["Отношения и семья", "Личное решение", "Работа и бизнес", "Внутреннее состояние и ресурсы"],
    },
    dao: {
      title: "Бесплатный запрос профиля У-Син",
      lead: "Для запроса бесплатного профиля достаточно одного контакта.",
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
    action: "Enviar solicitud gratis", topicOptional: "Elegir un tema (opcional)", anyTopic: "Cualquier tema",
    copyDetails: "Copiar mis detalles", copied: "Copiado. Pega estos detalles en el chat.", copyError: "No se pudo copiar: selecciona el texto siguiente.",
    note: "El contacto y el tema general opcional se guardan solo al enviar la solicitud. Sin publicidad ni reserva de pago.",
    situation: {
      title: "Tu revisión gratuita por escrito",
      lead: "Deja un solo contacto. Andrey te explicará cómo compartir el cuestionario y el dibujo.",
      service: "Revisión escrita gratuita de la situación",
      request: "Quiero una revisión escrita gratuita de mi situación. Explícame cómo enviar el cuestionario y el dibujo YO / META / PROBLEMA a mano. Entiendo que no incluye videollamada.",
      topics: ["Relaciones y familia", "Decisión personal", "Trabajo y negocio", "Estado interior y recursos"],
    },
    dao: {
      title: "Tu consulta gratuita Wu Xing",
      lead: "Un solo contacto basta para pedir el perfil simbólico gratuito.",
      service: "Perfil simbólico gratuito de recursos Wu Xing",
      request: "Quisiera solicitar el perfil simbólico gratuito de recursos Wu Xing. Explícame el siguiente paso. Entiendo que no es una evaluación médica.",
      topics: ["Equilibrio y energía diaria", "Enfoque y dirección", "Relaciones y conexión", "Fortalezas personales y recursos"],
    },
  },
} as const;

export function FreeResourceEnquiry({ locale, kind }: { locale: PublicLocale; kind: EnquiryKind }) {
  const t = text[locale];
  const offer = t[kind];
  const [topic, setTopic] = useState(-1);
  const broadTopic = topic >= 0 ? offer.topics[topic] || "" : "";
  const whatsappUrl = whatsappEnquiryUrl({
    locale, service: offer.service, request: offer.request,
    ...(broadTopic ? { topic: broadTopic } : {}),
    // Only an editorially approved broad topic enters a messenger URL.
    pagePath: "/" + locale + "/services/" + (kind === "dao" ? "dao-health-profile" : "free-situation-review"),
  });

  return (
    <section className={styles.form} data-free-resource-enquiry={kind} aria-label={offer.title}>
      <p className={styles.eyebrow}><MessageCircle size={16} aria-hidden="true" />{offer.title}</p>
      <p className={styles.lead}>{offer.lead}</p>
      <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} quick resetKey={kind}
        publicTopic={broadTopic} label={t.action}
        event="service_request_start" attributes={{ "data-free-enquiry-kind": kind }} />
      <details className={styles.topicOptional}>
        <summary>{t.topicOptional}</summary>
        <select value={topic} aria-label={t.topic} onChange={event => setTopic(Number(event.target.value))}>
          <option value={-1}>{t.anyTopic}</option>
          {offer.topics.map((item, index) => <option value={index} key={item}>{item}</option>)}
        </select>
      </details>
      <p className={styles.note}><ShieldCheck size={16} aria-hidden="true" />{t.note}</p>
    </section>
  );
}
