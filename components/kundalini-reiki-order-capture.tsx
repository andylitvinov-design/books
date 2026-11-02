"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GraduationCap } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./academy-course-capture.module.css";

type OptionId = "free" | "personal" | "training";

const optionOrder: OptionId[] = ["free", "personal", "training"];
const optionImages: Record<OptionId, string> = {
  free: "/academy/kundalini-reiki/kundalini-manual-level-1.jpg",
  personal: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
  training: "/academy/kundalini-reiki/kundalini-manual-level-3.jpg",
};

const copy = {
  en: {
    eyebrow: "KUNDALINI REIKI · WITH ANDREY",
    title: "Choose how to begin",
    lead: "Three simple ways to start. Choose what interests you, and I'll explain the next step personally.",
    choose: "I would like to",
    options: {
      free: { title: "Try the free Level 1 introduction", description: "Start with the basics and request a free introductory initiation." },
      personal: { title: "Request personal Level 1", description: "One-to-one initiation with format and fee confirmed personally." },
      training: { title: "Explore all three levels", description: "Ask about lessons, practice, next dates and availability." },
    },
    messages: {
      free: "I'd like to start the free Kundalini Reiki Level 1 introduction. Please tell me about the introductory initiation and how to begin.",
      personal: "I'd like to request a personal Kundalini Reiki Level 1 initiation. Please confirm the format, availability and current fee.",
      training: "I'd like to explore Kundalini Reiki training for Levels 1–3. Please share the format, next available dates and current fees.",
    },
    action: "Request my selected option",
    note: "Your contact is saved only after you submit the short request. Then choose WhatsApp or Telegram; you decide whether to send the chat.",
    reply: "Personal reply",
    noObligation: "No obligation",
    freeLesson: "Read the free Level 1 introduction",
  },
  ru: {
    eyebrow: "КУНДАЛИНИ РЕЙКИ · С АНДРЕЕМ",
    title: "Выберите, с чего начать",
    lead: "Три простых варианта. Выберите подходящий — и я лично подскажу следующий шаг.",
    choose: "Я хочу",
    options: {
      free: { title: "Попробовать 1-ю ступень бесплатно", description: "Начать с основ и запросить бесплатную вводную инициацию." },
      personal: { title: "Личную инициацию 1-й ступени", description: "Индивидуальное обучение; формат и стоимость уточним лично." },
      training: { title: "Пройти все три ступени", description: "Узнать об уроках, практиках, датах и доступности." },
    },
    messages: {
      free: "Хочу начать бесплатную вводную первую ступень Кундалини Рейки. Расскажите об инициации и как начать.",
      personal: "Хочу запросить личную инициацию первой ступени Кундалини Рейки. Подскажите формат, доступность и актуальную стоимость.",
      training: "Хочу узнать об обучении Кундалини Рейки по трём ступеням: формат, ближайшие даты и актуальная стоимость.",
    },
    action: "Заказать выбранный вариант",
    note: "Контакт сохраняется после подтверждения заявки. Затем выбирайте WhatsApp или Telegram — сообщение отправляете только вы.",
    reply: "Личный ответ",
    noObligation: "Без обязательств",
    freeLesson: "Изучить бесплатную вводную 1-ю ступень",
  },
  es: {
    eyebrow: "KUNDALINI REIKI · CON ANDREY",
    title: "Elige cómo empezar",
    lead: "Tres maneras sencillas de comenzar. Elige una y te explicaré personalmente el siguiente paso.",
    choose: "Quiero",
    options: {
      free: { title: "Probar el Nivel 1 gratis", description: "Comenzar por lo básico y solicitar la iniciación introductoria gratuita." },
      personal: { title: "Una iniciación personal de Nivel 1", description: "Sesión individual; modalidad y precio a confirmar." },
      training: { title: "Conocer los tres niveles", description: "Preguntar por lecciones, práctica, fechas y disponibilidad." },
    },
    messages: {
      free: "Quiero empezar con la introducción gratuita de Kundalini Reiki Nivel 1. ¿Cómo solicito la iniciación introductoria?",
      personal: "Quiero una iniciación personal de Kundalini Reiki Nivel 1. Confírmame modalidad, disponibilidad y precio actual.",
      training: "Quiero conocer la formación de Kundalini Reiki de tres niveles, fechas disponibles y precio actual.",
    },
    action: "Solicitar la opción elegida",
    note: "Guardamos tu contacto solo al confirmar la solicitud. Después eliges WhatsApp o Telegram; tú decides enviar el mensaje.",
    reply: "Respuesta personal",
    noObligation: "Sin compromiso",
    freeLesson: "Leer la introducción gratuita de Nivel 1",
  },
} as const;

/** One course-specific Academy selector; the established server enquiry flow records the lead before chat handoff. */
export function KundaliniReikiOrderCapture({ locale }: { locale: PublicLocale }) {
  const [selected, setSelected] = useState<OptionId>("free");
  const c = copy[locale];
  const pagePath = "/" + locale + "/academy/reiki/kundalini-reiki";
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: "Kundalini Reiki",
    request: c.messages[selected],
    option: c.options[selected].title,
    pagePath,
  });

  return (
    <section
      className={styles.capture}
      id="kundalini-enquire"
      data-consultation-cta="kundalini"
      data-kundalini-course-capture
      lang={locale}
      aria-labelledby="kundalini-contact-title"
    >
      <p className={styles.eyebrow}><GraduationCap size={20} aria-hidden="true" />{c.eyebrow}</p>
      <h2 className={styles.title} id="kundalini-contact-title">{c.title}</h2>
      <p className={styles.lead}>{c.lead}</p>
      <p className={styles.question} id="kundalini-course-question">{c.choose}</p>

      <div className={styles.choices} role="group" aria-labelledby="kundalini-course-question">
        {optionOrder.map((id) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              className={styles.choice}
              aria-pressed={active}
              data-selected={active}
              data-kundalini-choice={id}
              onClick={() => setSelected(id)}
            >
              <span className={styles.photo}>
                <Image src={optionImages[id]} alt="" fill sizes="64px" />
              </span>
              <span className={styles.choiceCopy}>
                <strong>{c.options[id].title}</strong>
                <small>{c.options[id].description}</small>
              </span>
              <span className={styles.indicator} aria-hidden="true">
                {active ? <Check size={16} strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <ContactChannelChooser
        locale={locale}
        whatsappUrl={whatsappUrl}
        label={c.action}
        className={styles.action}
        stayAfterSave
        event="academy_course_enquiry_click"
        attributes={{ "data-kundalini-course-option": selected }}
      />
      <p className={styles.note}>{c.note}</p>
      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={15} aria-hidden="true" />{c.reply}</span>
          <span><Check size={15} aria-hidden="true" />{c.noObligation}</span>
        </div>
        <div className={styles.links}>
          <Link prefetch={false} href={pagePath + "/free-initiation"}>
            {c.freeLesson} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
