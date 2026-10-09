"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, HeartHandshake, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./consultation-choice-capture.module.css";

type Variant = "free" | "service" | "personal" | "reading";
type Topic = "personal" | "goal" | "business" | "wellbeing";
type ServiceChoice = "session" | "free" | "questions";

const topics: Topic[] = ["personal", "goal", "business", "wellbeing"];
const serviceChoices: ServiceChoice[] = ["session", "free", "questions"];
const telegramUrl = "https://t.me/AndyTherapist";

const copy = {
  en: {
    eyebrow: "PERSONAL CONSULTATIONS · WITH ANDREY",
    freeTitle: "Let's explore your next step",
    freeLead: "Choose one topic. We can discuss the rest personally in a free introductory conversation.",
    personalTitle: "What would you like to explore?",
    personalLead: "A personal question, a difficult decision or feeling stuck — you can start with one simple message.",
    readingTitle: "Would you like to talk about your situation?",
    readingLead: "From reading to a personal conversation. Start with a free introduction, without choosing a method.",
    serviceTitle: "How would you like to begin?",
    serviceLead: "Ask about this personal service. I'll personally confirm the format, available times and price before any booking.",
    chooseTopic: "What would you like to talk about?",
    chooseService: "Choose what interests you",
    topicOptions: {
      personal: "Personal situation",
      goal: "Goals & decisions",
      business: "Work & business",
      wellbeing: "Wellbeing & energy",
    },
    serviceOptions: {
      session: "Request a personal session",
      free: "Free introductory conversation",
      questions: "Ask about format & fees",
    },
    serviceActions: {
      session: "Request a personal session",
      free: "Request free introduction",
      questions: "Ask about this service",
    },
    serviceMessages: {
      session: "I'd like to request a personal session. Please tell me about availability, format and fees.",
      free: "I'd like to have a free introductory conversation before deciding about a session.",
      questions: "I'd like to know more about the format, duration and fees before deciding.",
    },
    freeAction: "Request free consultation",
    messageTitle: "Free introductory conversation — Holistic House",
    serviceMessageTitle: "Personal session enquiry — Holistic House",
    topicField: "Topic",
    serviceField: "Service",
    intentField: "What interests me",
    freeRequest: "Hello Andrey! I'd like to arrange a free introductory conversation about this topic.",
    serviceRequest: "Hello Andrey!",
    messageNote: "WhatsApp opens a prepared message. Nothing is sent until you press Send.",
    serviceNote: "This is an enquiry, not a confirmed appointment or payment. Dates and fees are agreed personally.",
    safeguard: "An introductory conversation, not a medical diagnosis.",
    personalReply: "Personal reply",
    noObligation: "No obligation",
    telegram: "Or write on Telegram",
    otherPath: "Explore a free situation review",
  },
  ru: {
    eyebrow: "ЛИЧНЫЕ КОНСУЛЬТАЦИИ · С АНДРЕЕМ",
    freeTitle: "Давайте найдём следующий шаг",
    freeLead: "Выберите одну тему. Остальное обсудим лично на бесплатной вводной беседе.",
    personalTitle: "Что вы хотели бы обсудить?",
    personalLead: "Личная ситуация, сложное решение или ощущение тупика — начать можно с одного сообщения.",
    readingTitle: "Хотите обсудить вашу ситуацию?",
    readingLead: "От материала — к личному разговору. Начните с бесплатной беседы, не выбирая метод заранее.",
    serviceTitle: "Как вам удобнее начать?",
    serviceLead: "Выберите вариант. Я лично уточню формат, доступное время и стоимость до подтверждения записи.",
    chooseTopic: "Что вас сейчас интересует?",
    chooseService: "Выберите, что вам нужно",
    topicOptions: {
      personal: "Личная ситуация",
      goal: "Цели и решения",
      business: "Работа и бизнес",
      wellbeing: "Самочувствие и ресурс",
    },
    serviceOptions: {
      session: "Записаться на личную сессию",
      free: "Бесплатная вводная беседа",
      questions: "Узнать формат и стоимость",
    },
    serviceActions: {
      session: "Запросить запись на сессию",
      free: "Записаться на бесплатную беседу",
      questions: "Задать вопрос об услуге",
    },
    serviceMessages: {
      session: "Хочу запросить личную сессию. Подскажите доступное время, формат и стоимость.",
      free: "Хочу сначала договориться о бесплатной вводной беседе, прежде чем решать насчёт сессии.",
      questions: "Хочу узнать формат, продолжительность и стоимость, прежде чем записываться.",
    },
    freeAction: "Записаться на бесплатный разбор",
    messageTitle: "Бесплатная вводная консультация — Holistic House",
    serviceMessageTitle: "Запрос на личную сессию — Holistic House",
    topicField: "Тема",
    serviceField: "Услуга",
    intentField: "Что меня интересует",
    freeRequest: "Здравствуйте, Андрей! Хочу договориться о бесплатной вводной беседе по этой теме.",
    serviceRequest: "Здравствуйте, Андрей!",
    messageNote: "Откроется подготовленное сообщение WhatsApp. Оно отправится только после вашего подтверждения.",
    serviceNote: "Это запрос, а не подтверждённая запись или оплата. Время и стоимость согласуются лично.",
    safeguard: "Вводная беседа, не медицинская диагностика.",
    personalReply: "Личный ответ",
    noObligation: "Без обязательств",
    telegram: "Или напишите в Telegram",
    otherPath: "Бесплатный разбор ситуации",
  },
  es: {
    eyebrow: "CONSULTAS PERSONALES · CON ANDREY",
    freeTitle: "Exploremos tu próximo paso",
    freeLead: "Elige un tema. Podemos hablar de los detalles personalmente en una conversación gratuita.",
    personalTitle: "¿Qué te gustaría explorar?",
    personalLead: "Una situación personal, una decisión difícil o sentirte bloqueado: empieza con un mensaje sencillo.",
    readingTitle: "¿Quieres hablar de tu situación?",
    readingLead: "De la lectura a una conversación personal. Empieza gratis sin elegir un método.",
    serviceTitle: "¿Cómo te gustaría empezar?",
    serviceLead: "Elige una opción. Confirmaré personalmente la modalidad, el horario y el precio antes de reservar.",
    chooseTopic: "¿Sobre qué te gustaría hablar?",
    chooseService: "Elige qué te interesa",
    topicOptions: {
      personal: "Situación personal",
      goal: "Objetivos y decisiones",
      business: "Trabajo y negocios",
      wellbeing: "Bienestar y energía",
    },
    serviceOptions: {
      session: "Solicitar una sesión personal",
      free: "Conversación inicial gratuita",
      questions: "Consultar formato y precio",
    },
    serviceActions: {
      session: "Solicitar una sesión",
      free: "Solicitar conversación gratuita",
      questions: "Consultar este servicio",
    },
    serviceMessages: {
      session: "Quisiera solicitar una sesión personal. ¿Cuáles son la disponibilidad, la modalidad y el precio?",
      free: "Quisiera tener una conversación inicial gratuita antes de decidir si reservo una sesión.",
      questions: "Quisiera conocer la modalidad, la duración y el precio antes de decidir.",
    },
    freeAction: "Solicitar conversación gratuita",
    messageTitle: "Conversación inicial gratuita — Holistic House",
    serviceMessageTitle: "Solicitud de sesión personal — Holistic House",
    topicField: "Tema",
    serviceField: "Servicio",
    intentField: "Qué me interesa",
    freeRequest: "Hola Andrey. Quisiera acordar una conversación inicial gratuita sobre este tema.",
    serviceRequest: "Hola Andrey.",
    messageNote: "WhatsApp abre un mensaje preparado. Solo se envía cuando confirmas Enviar.",
    serviceNote: "Es una consulta, no una reserva ni un pago. Confirmaremos personalmente la fecha y el precio.",
    safeguard: "Una conversación inicial, no un diagnóstico médico.",
    personalReply: "Respuesta personal",
    noObligation: "Sin compromiso",
    telegram: "O escribe por Telegram",
    otherPath: "Explorar una evaluación gratuita",
  },
} as const;

function isTopic(value: string | null): value is Topic {
  return topics.some((topic) => topic === value);
}

export function ConsultationChoiceCapture({
  locale,
  variant,
  service,
  id,
  sitewide = false,
}: {
  locale: PublicLocale;
  variant: Variant;
  service?: string;
  id?: string;
  sitewide?: boolean;
}) {
  const t = copy[locale];
  const titleId = useId();
  const [topic, setTopic] = useState<Topic>("personal");
  const [serviceChoice, setServiceChoice] = useState<ServiceChoice>("session");
  const isService = variant === "service";

  // Existing ?topic= links still preselect a topic, without putting private notes in URLs.
  useEffect(() => {
    if (variant === "service") return;
    const requestedTopic = new URLSearchParams(window.location.search).get("topic");
    if (isTopic(requestedTopic)) setTopic(requestedTopic);
  }, [variant]);

  const heading = isService ? t.serviceTitle : variant === "reading" ? t.readingTitle
    : variant === "personal" ? t.personalTitle : t.freeTitle;
  const lead = isService ? t.serviceLead : variant === "reading" ? t.readingLead
    : variant === "personal" ? t.personalLead : t.freeLead;

  const message = isService
    ? [
        t.serviceMessageTitle,
        t.serviceField + ": " + (service || (locale === "ru" ? "Личная консультация" : locale === "es" ? "Consulta individual" : "Personal consultation")),
        t.intentField + ": " + t.serviceOptions[serviceChoice],
        "",
        t.serviceRequest + " " + t.serviceMessages[serviceChoice],
      ].join("\n")
    : [
        t.messageTitle,
        t.topicField + ": " + t.topicOptions[topic],
        "",
        t.freeRequest,
      ].join("\n");
  const whatsappUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(message);
  const cta = isService ? t.serviceActions[serviceChoice] : t.freeAction;

  return (
    <section
      id={id}
      className={styles.capture}
      data-consultation-capture={variant}
      data-consultation-cta={sitewide ? undefined : "true"}
      data-conversion-kind={isService ? "personal" : variant}
      lang={locale}
      aria-labelledby={titleId}
    >
      <p className={styles.eyebrow}><HeartHandshake size={19} aria-hidden="true" />{t.eyebrow}</p>
      <h2 id={titleId} className={styles.title}>{heading}</h2>
      <p className={styles.lead}>{lead}</p>
      <p className={styles.question}>{isService ? t.chooseService : t.chooseTopic}</p>
      <div className={styles.choices} data-choice-layout={isService ? "service" : "topic"} role="group" aria-label={isService ? t.chooseService : t.chooseTopic}>
        {isService
          ? serviceChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.choice}
              aria-pressed={serviceChoice === choice}
              data-selected={serviceChoice === choice}
              onClick={() => setServiceChoice(choice)}
            >
              {serviceChoice === choice ? <Check size={17} strokeWidth={2.7} aria-hidden="true" /> : null}
              <span>{t.serviceOptions[choice]}</span>
            </button>
          ))
          : topics.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.choice}
              aria-pressed={topic === choice}
              data-selected={topic === choice}
              onClick={() => setTopic(choice)}
            >
              {topic === choice ? <Check size={17} strokeWidth={2.7} aria-hidden="true" /> : null}
              <span>{t.topicOptions[choice]}</span>
            </button>
          ))}
      </div>
      <AcquisitionEventLink
        prefetch={false}
        className={styles.action}
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        event="service_request_start"
        attributes={{ "data-contact-channel": "whatsapp", "data-consultation-action": isService ? serviceChoice : topic }}
      >
        <MessageCircle size={19} aria-hidden="true" />
        <span>{cta}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </AcquisitionEventLink>
      <p className={styles.note}>{t.messageNote}</p>
      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={14} aria-hidden="true" />{t.personalReply}</span>
          <span><Check size={14} aria-hidden="true" />{t.noObligation}</span>
        </div>
        <div className={styles.secondary}>
          {isService ? <Link prefetch={false} href={"/" + locale + "/services/free-situation-review"}><ShieldCheck size={14} aria-hidden="true" />{t.otherPath}</Link> : null}
          <AcquisitionEventLink prefetch={false} href={telegramUrl} target="_blank" rel="noopener noreferrer" event="contact_click" attributes={{ "data-contact-channel": "telegram" }}>
            <Send size={14} aria-hidden="true" />{t.telegram}
          </AcquisitionEventLink>
        </div>
      </div>
      <p className={styles.disclaimer}>{isService ? t.serviceNote : t.safeguard}</p>
    </section>
  );
}
