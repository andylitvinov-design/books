"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, FileText, HeartHandshake, Send, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import styles from "./consultation-choice-capture.module.css";

type Variant = "free" | "service" | "personal" | "reading";
type Topic = "personal" | "goal" | "business" | "wellbeing";
type ServiceChoice = "session" | "free" | "questions";

const topics: Topic[] = ["personal", "goal", "business", "wellbeing"];
const serviceChoices: ServiceChoice[] = ["session", "questions", "free"];
const telegramUrl = "https://t.me/AndyTherapist";

const copy = {
  en: {
    eyebrow: "PERSONAL CONSULTATIONS · WITH ANDREY",
    freeTitle: "Start with a free drawing assessment",
    freeLead: "Choose a topic, complete a coaching form and send a handwritten drawing. I'll reply with a written assessment.",
    personalTitle: "A free drawing assessment of your situation",
    personalLead: "Choose a topic and complete the coaching form and hand drawing. I'll send a personal written report. Live sessions are paid separately.",
    readingTitle: "Explore your situation through a drawing",
    readingLead: "Start with a free coaching questionnaire and pen-and-paper drawing. Receive a written report without booking a live call.",
    serviceTitle: "Choose your consultation format",
    serviceLead: "Personal sessions: 60 minutes for €100 or 30 minutes for €50. The free drawing assessment is separate and includes a written report, not a call.",
    chooseTopic: "What is your situation about?",
    chooseService: "Choose your format",
    topicOptions: {
      personal: "Personal situation",
      goal: "Goals & decisions",
      business: "Work & business",
      wellbeing: "Wellbeing & energy",
    },
    serviceOptions: {
      session: "60-minute personal session · €100",
      free: "Free drawing assessment + written report",
      questions: "30-minute express consultation · €50",
    },
    serviceActions: {
      session: "Book 60 min · €100",
      free: "Start free drawing assessment",
      questions: "Book 30 min · €50",
    },
    serviceMessages: {
      session: "I would like to book a paid personal session of 60 minutes for €100. Please confirm availability.",
      free: "I would like the free coaching-form and handwritten-drawing assessment with a written report.",
      questions: "I would like to book a paid 30-minute express consultation for €50. Please confirm availability.",
    },
    freeAction: "Start free drawing assessment",
    messageTitle: "Free drawing assessment — Holistic House",
    serviceMessageTitle: "Paid personal session enquiry — Holistic House",
    topicField: "Topic",
    serviceField: "Service",
    intentField: "What interests me",
    freeRequest: "I would like the free coaching-form and handwritten-drawing assessment with a written report.",
    serviceRequest: "Hello Andrey!",
    messageNote: "Choose WhatsApp or Telegram for your paid-session request. Nothing is sent until you press Send.",
    freeNote: "Next: fill out the coaching form, draw on paper and send both via WhatsApp. This is not a free call.",
    writtenReport: "Personal written report",
    paidHint: "Paid sessions: €50 / 30 min · €100 / 60 min",
    serviceNote: "This is an enquiry, not a confirmed booking or payment. Rates: €50 / 30 min or €100 / 60 min.",
    safeguard: "A symbolic written situation assessment, not a medical diagnosis.",
    personalReply: "Personal reply",
    noObligation: "No obligation",
    telegram: "Or write on Telegram",
    otherPath: "Explore a free situation review",
  },
  ru: {
    eyebrow: "ЛИЧНЫЕ КОНСУЛЬТАЦИИ · С АНДРЕЕМ",
    freeTitle: "Бесплатная диагностика по рисунку",
    freeLead: "Выберите тему, заполните коучинг-форму и отправьте рисунок ручкой. Я пришлю письменный отчёт.",
    personalTitle: "Бесплатная диагностика по рисунку",
    personalLead: "Выберите тему, заполните анкету и сделайте рисунок. Вы получите письменный разбор. Живые консультации оплачиваются отдельно.",
    readingTitle: "Исследуйте ситуацию через рисунок",
    readingLead: "Начните с коучинг-формы и рисунка ручкой, получите письменный отчёт — без бесплатного созвона.",
    serviceTitle: "Выберите формат обращения",
    serviceLead: "Личные сессии: 60 минут за €100 или 30 минут за €50. Бесплатная диагностика по рисунку — отдельная услуга с письменным отчётом.",
    chooseTopic: "На какую тему ваш запрос?",
    chooseService: "Выберите формат",
    topicOptions: {
      personal: "Личная ситуация",
      goal: "Цели и решения",
      business: "Работа и бизнес",
      wellbeing: "Самочувствие и ресурс",
    },
    serviceOptions: {
      session: "Личная сессия 60 минут · €100",
      free: "Бесплатная диагностика по рисунку + отчёт",
      questions: "Экспресс-консультация 30 минут · €50",
    },
    serviceActions: {
      session: "Записаться на 60 минут · €100",
      free: "Начать бесплатную диагностику",
      questions: "Записаться на 30 минут · €50",
    },
    serviceMessages: {
      session: "хочу записаться на платную личную сессию 60 минут за €100. Подскажите доступное время.",
      free: "хочу бесплатную диагностику по коучинг-форме и рисунку с письменным отчётом.",
      questions: "хочу записаться на платную экспресс-консультацию 30 минут за €50. Подскажите доступное время.",
    },
    freeAction: "Начать бесплатную диагностику по рисунку",
    messageTitle: "Бесплатная диагностика по рисунку — Holistic House",
    serviceMessageTitle: "Запрос на платную личную сессию — Holistic House",
    topicField: "Тема",
    serviceField: "Услуга",
    intentField: "Что меня интересует",
    freeRequest: "Хочу бесплатную диагностику по коучинг-форме и рисунку с письменным отчётом.",
    serviceRequest: "Здравствуйте, Андрей!",
    messageNote: "Выберите WhatsApp или Telegram для платной сессии. Сообщение отправится только после вашего подтверждения.",
    freeNote: "Далее: заполните коучинг-форму, нарисуйте на бумаге и отправьте материалы через WhatsApp. Это не бесплатный созвон.",
    writtenReport: "Персональный письменный отчёт",
    paidHint: "Платные сессии: €50 / 30 мин · €100 / 60 мин",
    serviceNote: "Это запрос, а не запись или оплата. Стоимость: €50 за 30 минут или €100 за 60 минут.",
    safeguard: "Символический письменный разбор ситуации, не медицинский диагноз.",
    personalReply: "Личный ответ",
    noObligation: "Без обязательств",
    telegram: "Или напишите в Telegram",
    otherPath: "Бесплатный разбор ситуации",
  },
  es: {
    eyebrow: "CONSULTAS PERSONALES · CON ANDREY",
    freeTitle: "Evaluación gratuita mediante dibujo",
    freeLead: "Elige un tema, completa el formulario de coaching y envía un dibujo a mano. Recibirás un informe escrito.",
    personalTitle: "Evaluación gratuita de tu situación mediante dibujo",
    personalLead: "Elige un tema, completa el formulario y dibuja a mano. Recibirás un informe escrito; las sesiones en directo son de pago.",
    readingTitle: "Explora tu situación mediante un dibujo",
    readingLead: "Empieza con un formulario de coaching y dibujo a mano. Recibe un informe escrito sin llamada gratuita.",
    serviceTitle: "Elige tu modalidad de consulta",
    serviceLead: "Sesiones personales: 60 minutos €100 o 30 minutos €50. La evaluación gratuita por dibujo incluye un informe escrito, no una llamada.",
    chooseTopic: "¿Sobre qué trata tu situación?",
    chooseService: "Elige la modalidad",
    topicOptions: {
      personal: "Situación personal",
      goal: "Objetivos y decisiones",
      business: "Trabajo y negocios",
      wellbeing: "Bienestar y energía",
    },
    serviceOptions: {
      session: "Sesión personal de 60 minutos · €100",
      free: "Evaluación gratuita por dibujo + informe",
      questions: "Consulta exprés de 30 minutos · €50",
    },
    serviceActions: {
      session: "Reservar 60 minutos · €100",
      free: "Iniciar evaluación gratuita",
      questions: "Reservar 30 minutos · €50",
    },
    serviceMessages: {
      session: "quisiera reservar una sesión personal de pago de 60 minutos por €100. Confirma la disponibilidad.",
      free: "evaluación gratuita del formulario de coaching y dibujo a mano con informe escrito.",
      questions: "quisiera reservar una consulta exprés de pago de 30 minutos por €50. Confirma la disponibilidad.",
    },
    freeAction: "Iniciar evaluación gratuita por dibujo",
    messageTitle: "Evaluación gratuita mediante dibujo — Holistic House",
    serviceMessageTitle: "Solicitud de sesión personal de pago — Holistic House",
    topicField: "Tema",
    serviceField: "Servicio",
    intentField: "Qué me interesa",
    freeRequest: "Solicito evaluación gratuita del formulario de coaching y dibujo a mano con informe escrito.",
    serviceRequest: "Hola Andrey.",
    messageNote: "Elige WhatsApp o Telegram para la consulta de pago. Solo se envía cuando confirmas Enviar.",
    freeNote: "Siguiente: rellena el formulario de coaching, dibuja en papel y envía ambos por WhatsApp. No es una llamada gratuita.",
    writtenReport: "Informe escrito personal",
    paidHint: "Sesiones de pago: €50 / 30 min · €100 / 60 min",
    serviceNote: "Es una consulta, no una reserva ni un pago. Tarifas: €50 / 30 minutos o €100 / 60 minutos.",
    safeguard: "Una evaluación simbólica escrita, no un diagnóstico médico.",
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
  wiseEnabled = false,
  paypalPersonalEnabled = false,
}: {
  locale: PublicLocale;
  variant: Variant;
  service?: string;
  id?: string;
  sitewide?: boolean;
  wiseEnabled?: boolean;
  paypalPersonalEnabled?: boolean;
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

  const isPaidRequest = isService && serviceChoice !== "free";
  const wiseProductId = serviceChoice === "session" ? "personal-session-60" : "express-consultation-30";
  const zenInquiryUrl = isPaidRequest ? buildZenTransferInquiry([wiseProductId], locale) : null;
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: service || (locale === "ru" ? "Личная консультация" : locale === "es" ? "Consulta individual" : "Personal consultation"),
    request: t.serviceMessages[serviceChoice],
    option: t.serviceOptions[serviceChoice],
  });
  const ctaHref = isPaidRequest ? whatsappUrl : "/" + locale + "/services/free-situation-review" + (isService ? "" : "?topic=" + topic);
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
      {isPaidRequest ? (
        <ContactChannelChooser
          locale={locale}
          whatsappUrl={whatsappUrl}
          className={styles.action}
          event="service_request_start"
          attributes={{ "data-consultation-action": serviceChoice }}
        />
      ) : (
        <AcquisitionEventLink
          prefetch={false}
          className={styles.action}
          href={ctaHref}
          event="service_request_start"
          analyticsEvent="free_situation_assessment_click"
          attributes={{ "data-consultation-action": isService ? serviceChoice : topic }}
        >
          <FileText size={19} aria-hidden="true" />
          <span>{cta}</span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </AcquisitionEventLink>
      )}
      {isPaidRequest && wiseEnabled ? (
        <div className={styles.wisePayment} data-wise-payment-link>
          <a href={"/api/payments/wise/" + wiseProductId} target="_blank" rel="noopener noreferrer">
            {locale === "ru" ? "Перевести через Wise" : locale === "es" ? "Transferir con Wise" : "Send via Wise"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <small>{locale === "ru"
            ? `После согласования времени проверьте получателя и сумму ${serviceChoice === "session" ? "€100" : "€50"} в Wise. Если используется WiseTag, нужна учётная запись Wise и сумму надо ввести вручную. Перевод не подтверждает запись автоматически.`
            : locale === "es"
              ? `Tras acordar la hora, comprueba el destinatario y ${serviceChoice === "session" ? "100 €" : "50 €"} en Wise. Un WiseTag requiere una cuenta Wise y el importe se introduce manualmente. La reserva se confirma aparte.`
              : `After agreeing a time, check the recipient and ${serviceChoice === "session" ? "€100" : "€50"} in Wise. A WiseTag requires a Wise account and you must enter the amount yourself. Booking is confirmed separately.`}</small>
        </div>
      ) : null}
      {isPaidRequest && paypalPersonalEnabled ? (
        <div className={styles.wisePayment} data-paypal-personal-offer>
          <a href={"/api/payments/paypal/" + wiseProductId} target="_blank" rel="noopener noreferrer">
            {locale === "ru" ? "Оплатить личным PayPal" : locale === "es" ? "Pagar con PayPal personal" : "Pay with personal PayPal"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <small>{locale === "ru"
            ? "После согласования времени. Выберите «Товары и услуги», проверьте получателя Andrii Litvinov и сумму. Подтверждение оплаты вручную."
            : locale === "es"
              ? "Después de acordar la hora. Elige Productos y servicios y comprueba que pagas a Andrii Litvinov. Verificación manual."
              : "After confirming the time. Select Goods & Services and verify recipient Andrii Litvinov. Payment is verified manually."}</small>
        </div>
      ) : null}
      {zenInquiryUrl ? (
        <div className={styles.wisePayment} data-zen-manual-request>
          <a href={zenInquiryUrl} target="_blank" rel="noopener noreferrer">
            {locale === "ru" ? "ZEN.COM · запросить перевод" : locale === "es" ? "ZEN.COM · solicitar transferencia" : "ZEN.COM · request transfer details"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <small>{locale === "ru"
            ? "Откроется только запрос в WhatsApp с суммой выбранной услуги. Это не оплата: сначала подтвердите доступность ZEN и реквизиты получателя."
            : locale === "es"
              ? "Solo se abre una consulta por WhatsApp con el importe. No es un pago; primero confirma si ZEN está disponible y los datos del destinatario."
              : "Opens a WhatsApp enquiry with the fixed amount, not a payment. Verify ZEN recipient eligibility and transfer instructions first."}</small>
        </div>
      ) : null}
      <p className={styles.note}>{isPaidRequest ? t.messageNote : t.freeNote}</p>
      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={14} aria-hidden="true" />{isPaidRequest ? t.personalReply : t.writtenReport}</span>
          <span><Check size={14} aria-hidden="true" />{t.noObligation}</span>
        </div>
        <div className={styles.secondary}>
          {isPaidRequest ? <Link prefetch={false} href={"/" + locale + "/services/free-situation-review"}><ShieldCheck size={14} aria-hidden="true" />{t.otherPath}</Link>
            : !isService ? <Link prefetch={false} href={"/" + locale + "/services"}><ShieldCheck size={14} aria-hidden="true" />{t.paidHint}</Link> : null}
          <AcquisitionEventLink prefetch={false} href={telegramUrl} target="_blank" rel="noopener noreferrer" event="contact_click" attributes={{ "data-contact-channel": "telegram" }}>
            <Send size={14} aria-hidden="true" />{t.telegram}
          </AcquisitionEventLink>
        </div>
      </div>
      <p className={styles.disclaimer}>{isPaidRequest ? t.serviceNote : t.safeguard}</p>
    </section>
  );
}
