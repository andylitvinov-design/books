"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { CompactLeadCapture } from "@/components/compact-lead-capture";
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
  moreHref?: string;
  moreLabel?: string;
};

const photos: Record<OfferId, string> = {
  "situation-written-free": "/images/holistic-house/hero-olive-incense.webp",
  "wu-xing-free": "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  "personal-session-30-eur50": "/images/holistic-house/andy-about.png",
};

const copy: Record<PublicLocale, {
  eyebrow: string; heading: string; lead: string; details: string; order: string;
  formTitle: string; formLead: string; formLabel: string; safety: string;
  offers: readonly Offer[];
}> = {
  en: {
    eyebrow: "CHOOSE YOUR FORMAT",
    heading: "Three ways to get clarity",
    lead: "The first two options are free written reflections. The third is a 30-minute personal session for €50.",
    details: "Details", order: "Request",
    formTitle: "Request your diagnosis or session",
    formLead: "Select one option, leave a contact and choose WhatsApp or Telegram. Your request is saved for Andrey to reply; it is not a confirmed appointment or payment.",
    formLabel: "Which option would you like?",
    safety: "Wu Xing is a traditional symbolic Five Elements framework for reflection, not a medical diagnosis or treatment. A request is not a booking; the €50 personal session is arranged and paid for separately.",
    offers: [
      {
        id: "situation-written-free", label: "01 · SITUATION REVIEW", title: "Free situation diagnosis",
        summary: "Understand a difficulty, what may be holding you back and possible ways forward.",
        price: "FREE", detail: "A written personal reflection on one question about relationships, work or a life decision — no live call.",
        steps: ["Clarify your question and desired outcome.", "Fill in the short coaching questionnaire and draw ME — GOAL — PROBLEM.", "Agree how to share your materials securely and receive a personal written reflection."],
        imageAlt: "Warm, quiet coaching setting",
        moreHref: "/services/free-situation-review", moreLabel: "Read about the written review",
      },
      {
        id: "wu-xing-free", label: "02 · FIVE ELEMENTS", title: "Free energy & wellbeing review — Wu Xing (Five Elements)",
        summary: "Explore your energy, resources and personal balance through the Five Elements.",
        price: "FREE", detail: "A symbolic resource overview based on Wood, Fire, Earth, Metal and Water, intended for personal reflection rather than assessing medical health.",
        steps: ["Choose the area of life you want to explore.", "Request an individual Wu Xing resource review.", "Discuss a reflective next step with Andrey."],
        imageAlt: "Traditional East Asian landscape and temple",
        moreHref: "/services/dao-health-profile", moreLabel: "How the Five Elements approach works",
      },
      {
        id: "personal-session-30-eur50", label: "03 · LIVE WITH ANDREY", title: "Personal consultation",
        summary: "Discuss your situation directly with Andrey and explore practical next steps together.",
        price: "30 MIN · €50", detail: "A personal 30-minute consultation, online or by arrangement. Date, format and payment are confirmed directly with you.",
        steps: ["Send a consultation request and your preferred contact.", "Agree a suitable time and format with Andrey.", "Payment and the appointment are confirmed separately."],
        imageAlt: "Portrait of Andrey Litvinov",
      },
    ],
  },
  ru: {
    eyebrow: "ВЫБЕРИТЕ СВОЙ ФОРМАТ",
    heading: "Три способа разобраться в ситуации",
    lead: "Первые два варианта — бесплатные письменные разборы. Третий — личная консультация 30 минут за €50.",
    details: "Детали", order: "Заказать",
    formTitle: "Заказать диагностику или консультацию",
    formLead: "Выберите вариант, оставьте контакт и нажмите WhatsApp или Telegram. Заявка сохранится для ответа Андрея. Это ещё не запись и не оплата.",
    formLabel: "Какой вариант вам нужен?",
    safety: "У-Син (Пять стихий) — традиционная символическая модель для самоисследования, а не медицинская диагностика или лечение. Запрос не подтверждает запись; консультация за €50 согласовывается и оплачивается отдельно.",
    offers: [
      {
        id: "situation-written-free", label: "01 · РАЗБОР СИТУАЦИИ", title: "Бесплатная диагностика ситуации",
        summary: "Разбор сложности, препятствий и возможных путей решения вашего вопроса.",
        price: "БЕСПЛАТНО", detail: "Личный письменный разбор одного вопроса: отношения, работа, решение или жизненная ситуация. Без видеозвонка.",
        steps: ["Опишите сложность и желаемый результат.", "Ответьте на коучинговые вопросы и нарисуйте «Я — ЦЕЛЬ — ПРОБЛЕМА».", "Согласуйте безопасную передачу материалов и получите личный письменный ответ."],
        imageAlt: "Уютное пространство для коучингового разбора",
        moreHref: "/services/free-situation-review", moreLabel: "Как проходит письменный разбор",
      },
      {
        id: "wu-xing-free", label: "02 · ПЯТЬ СТИХИЙ", title: "Диагностика энергии и здоровья по У-Син (Пять стихий)",
        summary: "Исследуйте собственные ресурсы, энергию и баланс по традиционной модели пяти стихий.",
        price: "БЕСПЛАТНО", detail: "Символический анализ ресурсов по пяти элементам: Дерево, Огонь, Земля, Металл и Вода. Не является проверкой медицинского здоровья.",
        steps: ["Выберите сферу жизни, которую хотите исследовать.", "Запросите индивидуальный разбор ресурсов У-Син.", "Обсудите с Андреем ориентиры для самоисследования."],
        imageAlt: "Восточный пейзаж и храм",
        moreHref: "/services/dao-health-profile", moreLabel: "Подробнее о системе У-Син",
      },
      {
        id: "personal-session-30-eur50", label: "03 · ВСТРЕЧА С АНДРЕЕМ", title: "Личная консультация",
        summary: "Лично обсудите свой запрос с Андреем и наметьте следующие шаги.",
        price: "30 МИН · €50", detail: "Индивидуальная консультация 30 минут онлайн или по согласованию. День, формат и оплата подтверждаются отдельно.",
        steps: ["Оставьте заявку и удобный контакт.", "Согласуйте с Андреем время и формат встречи.", "Подтвердите запись и оплату отдельно."],
        imageAlt: "Портрет Андрея Литвинова",
      },
    ],
  },
  es: {
    eyebrow: "ELIGE TU FORMATO",
    heading: "Tres maneras de ganar claridad",
    lead: "Las dos primeras son revisiones escritas gratuitas. La tercera es una consulta personal de 30 minutos por €50.",
    details: "Detalles", order: "Solicitar",
    formTitle: "Solicita tu revisión o consulta",
    formLead: "Elige un formato, deja tu contacto y utiliza WhatsApp o Telegram. Tu solicitud se guarda para la respuesta de Andrey; no es una reserva ni un pago confirmado.",
    formLabel: "¿Qué formato prefieres?",
    safety: "Wu Xing (Cinco Elementos) es un marco simbólico tradicional de reflexión, no un diagnóstico o tratamiento médico. La sesión de €50 requiere una confirmación y un pago por separado.",
    offers: [
      {
        id: "situation-written-free", label: "01 · SITUACIÓN", title: "Diagnóstico gratuito de tu situación",
        summary: "Comprende la dificultad, los obstáculos y posibles caminos para resolverla.",
        price: "GRATIS", detail: "Reflexión personal por escrito sobre una pregunta de relaciones, trabajo o decisiones; sin videollamada.",
        steps: ["Aclara tu situación y tu objetivo.", "Completa el cuestionario de coaching y dibuja YO — META — PROBLEMA.", "Acuerda cómo compartir los materiales de forma segura y recibe una reflexión escrita."],
        imageAlt: "Espacio cálido y tranquilo para coaching",
        moreHref: "/services/free-situation-review", moreLabel: "Cómo funciona la revisión escrita",
      },
      {
        id: "wu-xing-free", label: "02 · CINCO ELEMENTOS", title: "Revisión de energía y bienestar Wu Xing (Cinco Elementos)",
        summary: "Explora tus recursos y equilibrio personal desde el modelo tradicional de los cinco elementos.",
        price: "GRATIS", detail: "Reflexión simbólica a través de Madera, Fuego, Tierra, Metal y Agua; no evalúa la salud médica.",
        steps: ["Elige el área de tu vida que deseas explorar.", "Solicita una revisión personalizada de recursos Wu Xing.", "Habla con Andrey de un siguiente paso reflexivo."],
        imageAlt: "Paisaje oriental tradicional con templo",
        moreHref: "/services/dao-health-profile", moreLabel: "Conocer el método Wu Xing",
      },
      {
        id: "personal-session-30-eur50", label: "03 · CON ANDREY", title: "Consulta personal",
        summary: "Habla directamente con Andrey sobre tu situación y los próximos pasos.",
        price: "30 MIN · €50", detail: "Sesión personal de 30 minutos online o según lo acordado. La fecha, el formato y el pago se confirman por separado.",
        steps: ["Deja tu solicitud y un contacto.", "Acuerda un horario y formato con Andrey.", "Confirma la reserva y el pago por separado."],
        imageAlt: "Retrato de Andrey Litvinov",
      },
    ],
  },
};

export function FreeDiagnosisOffers({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [selected, setSelected] = useState<OfferId>("situation-written-free");

  return (
    <section className={styles.wrap} id="free-diagnosis-options" data-free-diagnosis-options lang={locale}
      aria-labelledby="free-diagnosis-options-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="free-diagnosis-options-title">{t.heading}</h2>
        <p>{t.lead}</p>
      </header>
      <div className={styles.cards}>
        {t.offers.map(offer => (
          <article className={styles.card} key={offer.id} data-diagnosis-offer={offer.id}
            data-diagnosis-selected={selected === offer.id ? "true" : "false"}>
            <div className={styles.photo}>
              <Image src={photos[offer.id]} alt={offer.imageAlt} fill loading="lazy"
                sizes="(max-width: 540px) 95px, 200px" />
            </div>
            <div className={styles.content}>
              <div className={styles.topline}>
                <span>{offer.label}</span><strong>{offer.price}</strong>
              </div>
              <h3>{offer.title}</h3>
              <p className={styles.summary}>{offer.summary}</p>
              <div className={styles.actions}>
                <details className={styles.details}>
                  <summary>{t.details}<ChevronDown size={16} aria-hidden="true" /></summary>
                  <div className={styles.expanded}>
                    <p>{offer.detail}</p>
                    <ul>{offer.steps.map(step => <li key={step}>{step}</li>)}</ul>
                    {offer.moreHref ? (
                      <Link href={"/" + locale + offer.moreHref} prefetch={false}>
                        {offer.moreLabel}<ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </details>
                <a className={styles.order} href="#request-free-review"
                  onClick={() => setSelected(offer.id)} data-diagnosis-order={offer.id}
                  aria-label={t.order + ": " + offer.title}>
                  {t.order}<ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.formWrap}>
        <CompactLeadCapture locale={locale} id="request-free-review"
          serviceTitle="Holistic House — diagnosis and personal session enquiry"
          title={t.formTitle} lead={t.formLead} formatLabel={t.formLabel}
          formatOptions={t.offers.map(offer => ({ value: offer.id, label: offer.title + " · " + offer.price }))}
          selectedFormatValue={selected} onFormatChange={(value) => setSelected(value as OfferId)}
          disclaimer={t.safety} />
      </div>
      <p className={styles.safety}><ShieldCheck size={16} aria-hidden="true" />{t.safety}</p>
    </section>
  );
}
