"use client";

import Image from "next/image";
import { ArrowRight, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { usePathname } from "next/navigation";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-diagnosis-offers.module.css";

type OfferId = "situation-written-free" | "wu-xing-free" | "personal-session-30-eur50";
type Offer = {
  id: OfferId;
  label: string;
  title: string;
  summary: string;
  price: string;
  detail: string;
  steps: readonly string[];
  imageAlt: string;
};

const photos: Record<OfferId, string> = {
  "situation-written-free": "/images/holistic-house/hero-olive-incense.webp",
  "wu-xing-free": "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  "personal-session-30-eur50": "/images/holistic-house/andy-about.png",
};

const copy: Record<PublicLocale, {
  eyebrow: string; heading: string; lead: string; process: string; order: string; close: string;
  formTitle: string; formLead: string; formLabel: string; safety: string;
  inlineCta: string; inlineHint: string; messengerRequest: string;
  offers: readonly Offer[];
}> = {
  en: {
    eyebrow: "CHOOSE YOUR FORMAT",
    heading: "Choose how to begin",
    lead: "Two free written reviews. Or talk with Andrey for €50 / 30 min.",
    process: "How it works", order: "Request", close: "Close form",
    formTitle: "Request your diagnosis or session",
    formLead: "Enter your phone, agree to one personal reply, then choose WhatsApp or Telegram. Review and send the prepared message in your chat. No appointment or payment is confirmed.",
    inlineCta: "Request free diagnosis", inlineHint: "One short form · WhatsApp or Telegram · No charge",
    messengerRequest: "I would like to request this service. Please tell me the next step.",
    formLabel: "Which option would you like?",
    safety: "Wu Xing is a traditional symbolic Five Elements framework for reflection, not a medical diagnosis or treatment. A request is not a booking; the €50 personal session is arranged and paid for separately.",
    offers: [
      {
        id: "situation-written-free", label: "01 · SITUATION REVIEW", title: "Free situation diagnosis",
        summary: "A personal written perspective on one situation, goal or decision.",
        price: "FREE", detail: "Together we clarify what you want, what seems to block the way and which resources may already be available. You receive a personal written response, without a live call or payment.",
        steps: ["Describe the issue, your goal and what feels most difficult.", "Answer the short coaching questionnaire and sketch ME — GOAL — PROBLEM.", "Agree a secure way to share your materials and receive written insights and a possible next step."],
        imageAlt: "Warm, quiet coaching setting",
      },
      {
        id: "wu-xing-free", label: "02 · FIVE ELEMENTS", title: "Free energy & wellbeing review — Wu Xing (Five Elements)",
        summary: "Explore your energy and resources with the symbolic Five Elements.",
        price: "FREE", detail: "Wood reflects direction, Fire connection, Earth stability, Metal boundaries and Water restoration. This symbolic reflection highlights resources worth strengthening; it is not a medical test or treatment.",
        steps: ["Choose the life area where you feel depleted or out of balance.", "Answer a few questions about your energy, habits and resources.", "Receive a personal Five Elements reflection and suggestions for a small practical step."],
        imageAlt: "Traditional East Asian landscape and temple",
      },
      {
        id: "personal-session-30-eur50", label: "03 · LIVE WITH ANDREY", title: "Personal consultation",
        summary: "30 minutes with Andrey to focus on your question and options.",
        price: "30 MIN · €50", detail: "For questions needing a live conversation rather than a written reply. You can clarify the central difficulty, examine possible patterns and leave with a clearer direction. Online or by arrangement.",
        steps: ["Briefly tell Andrey what you would like to discuss.", "Agree the time and online or in-person format.", "Confirm the 30-minute session and €50 payment separately before meeting."],
        imageAlt: "Portrait of Andrey Litvinov",
      },
    ],
  },
  ru: {
    eyebrow: "ВЫБЕРИТЕ СВОЙ ФОРМАТ",
    heading: "Выберите удобный формат",
    lead: "Два бесплатных письменных разбора. Или беседа с Андреем — €50 / 30 мин.",
    process: "Как проходит", order: "Заказать", close: "Закрыть форму",
    formTitle: "Заказать диагностику или консультацию",
    formLead: "Укажите телефон, согласитесь на один личный ответ и выберите WhatsApp или Telegram. Проверьте текст и нажмите «Отправить» в чате. Запись и оплата ещё не подтверждены.",
    inlineCta: "Заказать бесплатную диагностику", inlineHint: "Одна короткая форма · WhatsApp или Telegram · Бесплатно",
    messengerRequest: "Хочу заказать эту услугу. Подскажите, пожалуйста, следующий шаг.",
    formLabel: "Какой вариант вам нужен?",
    safety: "У-Син (Пять стихий) — традиционная символическая модель для самоисследования, а не медицинская диагностика или лечение. Запрос не подтверждает запись; консультация за €50 согласовывается и оплачивается отдельно.",
    offers: [
      {
        id: "situation-written-free", label: "01 · РАЗБОР СИТУАЦИИ", title: "Бесплатная диагностика ситуации",
        summary: "Личный письменный взгляд на ситуацию, цель или решение.",
        price: "БЕСПЛАТНО", detail: "Поможем отделить главную задачу от мешающих обстоятельств, увидеть внутренние и внешние ресурсы и наметить реальный следующий шаг. Личный письменный ответ — без звонка и оплаты.",
        steps: ["Кратко опишите ситуацию, цель и то, что сейчас мешает.", "Ответьте на вопросы коучинговой анкеты и нарисуйте «Я — ЦЕЛЬ — ПРОБЛЕМА».", "Передайте материалы согласованным защищённым способом и получите письменный разбор с возможным следующим шагом."],
        imageAlt: "Уютное пространство для коучингового разбора",
      },
      {
        id: "wu-xing-free", label: "02 · ПЯТЬ СТИХИЙ", title: "Диагностика энергии и здоровья по У-Син (Пять стихий)",
        summary: "Исследуйте ресурсы и внутреннюю опору через Пять стихий.",
        price: "БЕСПЛАТНО", detail: "Дерево — направление, Огонь — контакт, Земля — устойчивость, Металл — границы, Вода — восстановление. Разбор помогает осмыслить состояние и подобрать небольшой практический шаг; это не медицинская диагностика.",
        steps: ["Выберите сферу жизни, в которой не хватает сил или равновесия.", "Ответьте на несколько вопросов об энергии, привычках и ресурсах.", "Получите персональное осмысление по пяти стихиям и ориентир для самостоятельной практики."],
        imageAlt: "Восточный пейзаж и храм",
      },
      {
        id: "personal-session-30-eur50", label: "03 · ВСТРЕЧА С АНДРЕЕМ", title: "Личная консультация",
        summary: "30 минут с Андреем: прояснить вопрос и варианты действий.",
        price: "30 МИН · €50", detail: "Когда важен живой диалог, а не письменный ответ: уточним суть сложности, рассмотрим возможные закономерности и варианты движения. Онлайн или лично по согласованию.",
        steps: ["Коротко сообщите, что хотите обсудить.", "Согласуйте время и формат встречи с Андреем.", "Отдельно подтвердите 30-минутную консультацию и оплату €50."],
        imageAlt: "Портрет Андрея Литвинова",
      },
    ],
  },
  es: {
    eyebrow: "ELIGE TU FORMATO",
    heading: "Elige cómo empezar",
    lead: "Dos revisiones escritas gratis. O una conversación con Andrey por €50 / 30 min.",
    process: "Cómo funciona", order: "Solicitar", close: "Cerrar formulario",
    formTitle: "Solicita tu revisión o consulta",
    formLead: "Introduce tu teléfono, acepta una respuesta personal y elige WhatsApp o Telegram. Revisa y envía el mensaje en tu chat. Aún no hay cita ni pago confirmado.",
    inlineCta: "Solicitar diagnóstico gratuito", inlineHint: "Un formulario breve · WhatsApp o Telegram · Gratis",
    messengerRequest: "Quisiera solicitar este servicio. Indícame, por favor, el siguiente paso.",
    formLabel: "¿Qué formato prefieres?",
    safety: "Wu Xing (Cinco Elementos) es un marco simbólico tradicional de reflexión, no un diagnóstico o tratamiento médico. La sesión de €50 requiere una confirmación y un pago por separado.",
    offers: [
      {
        id: "situation-written-free", label: "01 · SITUACIÓN", title: "Diagnóstico gratuito de tu situación",
        summary: "Una mirada escrita sobre tu situación, meta o decisión.",
        price: "GRATIS", detail: "Aclara tu objetivo, distingue los obstáculos y reconoce recursos que ya tienes. Recibirás una respuesta escrita personalizada con posibles próximos pasos, sin videollamada ni pago.",
        steps: ["Describe brevemente la dificultad, tu objetivo y qué te bloquea.", "Responde al cuestionario y dibuja YO — META — PROBLEMA.", "Acuerda cómo compartir tus materiales con seguridad y recibe una reflexión escrita."],
        imageAlt: "Espacio cálido y tranquilo para coaching",
      },
      {
        id: "wu-xing-free", label: "02 · CINCO ELEMENTOS", title: "Revisión de energía y bienestar Wu Xing (Cinco Elementos)",
        summary: "Explora tus recursos con los Cinco Elementos simbólicos.",
        price: "GRATIS", detail: "Madera representa dirección, Fuego conexión, Tierra estabilidad, Metal límites y Agua recuperación. Esta lectura simbólica orienta la reflexión y una práctica sencilla; no evalúa ni trata problemas médicos.",
        steps: ["Elige el ámbito donde te falta energía o equilibrio.", "Responde a unas preguntas sobre tus hábitos y recursos.", "Recibe una reflexión personal y una orientación práctica basada en los cinco elementos."],
        imageAlt: "Paisaje oriental tradicional con templo",
      },
      {
        id: "personal-session-30-eur50", label: "03 · CON ANDREY", title: "Consulta personal",
        summary: "30 minutos con Andrey para explorar tu pregunta y opciones.",
        price: "30 MIN · €50", detail: "Si necesitas conversar en directo y no solo recibir un informe escrito, puedes aclarar tu dificultad, contemplar otras perspectivas y decidir qué hacer después. Online o según lo acordado.",
        steps: ["Cuenta brevemente de qué quieres hablar.", "Acuerda con Andrey el horario y el formato de la reunión.", "Confirma por separado la sesión de 30 minutos y el pago de €50."],
        imageAlt: "Retrato de Andrey Litvinov",
      },
    ],
  },
};

export function FreeDiagnosisOffers({ locale, children, intro, compact = false }: { locale: PublicLocale; children?: ReactNode; intro?: ReactNode; compact?: boolean }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<OfferId>("situation-written-free");
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const activeOffer = t.offers.find(offer => offer.id === selected) ?? t.offers[0];

  useEffect(() => {
    if (!requestOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRequestOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [requestOpen]);

  function requestOffer(id: OfferId) {
    setSelected(id);
    setRequestOpen(true);
  }

  return (
    <section className={styles.wrap} data-free-diagnosis-layout={compact ? "compact" : "full"} data-free-diagnosis-options lang={locale}
      aria-labelledby="free-diagnosis-options-title">
      <div className={styles.inlineCapture} id="request-free-review" data-diagnosis-placement="top">
        <button className={styles.inlineRequest} id="free-diagnosis-top" type="button"
          onClick={() => requestOffer("situation-written-free")} aria-haspopup="dialog">
          <MessageCircle size={18} aria-hidden="true" />{t.inlineCta}<ArrowRight size={18} aria-hidden="true" />
        </button>
        <p className={styles.inlineHint}>{t.inlineHint}</p>
      </div>
      {intro}
      <header className={styles.heading} id="free-diagnosis-options">
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="free-diagnosis-options-title">{t.heading}</h2>
        <p>{t.lead}</p>
      </header>
      <div className={styles.scenes}>
        {t.offers.map((offer, index) => (
          <article className={styles.scene} key={offer.id} data-diagnosis-offer={offer.id}
            aria-labelledby={"diagnosis-offer-title-" + index}>
            <div className={styles.photo}>
              <Image src={photos[offer.id]} alt={offer.imageAlt} fill loading="lazy"
                sizes="(max-width: 720px) 100vw, 48vw" />
              <span className={styles.photoIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")} / 03
              </span>
            </div>
            <div className={styles.content}>
              <div className={styles.topline}>
                <span>{offer.label}</span><strong>{offer.price}</strong>
              </div>
              <h3 id={"diagnosis-offer-title-" + index}>{offer.title}</h3>
              <p className={styles.summary}>{offer.summary}</p>
              {compact ? <details className={styles.expandedInfo}>
                <summary>{t.process}</summary>
                <p className={styles.detail}>{offer.detail}</p>
                <ol>{offer.steps.map((step, stepIndex) => (
                  <li key={step}><span aria-hidden="true">{stepIndex + 1}</span>{step}</li>
                ))}</ol>
              </details> : <>
                <p className={styles.detail}>{offer.detail}</p>
                <div className={styles.process}>
                  <h4>{t.process}</h4>
                  <ol>{offer.steps.map((step, stepIndex) => (
                    <li key={step}><span aria-hidden="true">{stepIndex + 1}</span>{step}</li>
                  ))}</ol>
                </div>
              </>}
              <button className={styles.order} type="button"
                onClick={() => requestOffer(offer.id)} data-diagnosis-order={offer.id}
                aria-label={t.order + ": " + offer.title}>
                {t.order}<ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {requestOpen ? <button type="button" className={styles.scrim}
        aria-label={t.close} onClick={() => setRequestOpen(false)} /> : null}
      <div className={styles.formWrap} id="free-diagnosis-request-dialog" data-diagnosis-order-form
        data-open={requestOpen ? "true" : "false"}
        role={requestOpen ? "dialog" : undefined} aria-modal={requestOpen || undefined}
        aria-labelledby="diagnosis-request-heading">
        <header className={styles.formHeading}>
          <div><p className={styles.eyebrow}>{t.formTitle}</p>
            <h3 id="diagnosis-request-heading">{activeOffer.title}</h3></div>
          {requestOpen ? <button ref={closeButtonRef} className={styles.close} type="button" aria-label={t.close}
            onClick={() => setRequestOpen(false)}><X size={21} aria-hidden="true" /></button> : null}
        </header>
        {requestOpen ? <>
          <p className={styles.formLead}>{t.formLead}</p>
          <ContactChannelChooser key={selected} locale={locale}
            whatsappUrl={whatsappEnquiryUrl({
              locale, service: activeOffer.title, request: t.messengerRequest,
              option: activeOffer.price, pagePath: pathname,
            })}
            compactPhone stayAfterSave resetKey={selected}
            publicTopic={activeOffer.label + " · " + activeOffer.price} />
          <p className={styles.modalSafety}>{t.safety}</p>
        </> : null}
      </div>
      {children}
      <div className={styles.inlineCapture} data-diagnosis-placement="bottom">
        <button className={styles.inlineRequest} id="free-diagnosis-bottom" type="button"
          onClick={() => requestOffer("situation-written-free")} aria-haspopup="dialog">
          <MessageCircle size={18} aria-hidden="true" />{t.inlineCta}<ArrowRight size={18} aria-hidden="true" />
        </button>
        <p className={styles.inlineHint}>{t.inlineHint}</p>
      </div>
      <p className={styles.safety}><ShieldCheck size={16} aria-hidden="true" />{t.safety}</p>
    </section>
  );
}
