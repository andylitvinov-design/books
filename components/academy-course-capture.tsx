"use client";

import { useState } from "react";
import Image from "next/image";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import Link from "next/link";
import { ArrowRight, Check, GraduationCap } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./academy-course-capture.module.css";

type CourseId = "tantra" | "kundalini" | "yggdrasil";

const courseOrder: CourseId[] = ["tantra", "kundalini", "yggdrasil"];
const courses: Record<CourseId, { title: string; path: string; image: string }> = {
  tantra: {
    title: "Tantra Reiki",
    path: "tantra-reiki",
    image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
  },
  kundalini: {
    title: "Kundalini Reiki",
    path: "kundalini-reiki",
    image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
  },
  yggdrasil: {
    title: "Reiki Yggdrasil",
    path: "yggdrasil",
    image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  },
};

const copy: Record<PublicLocale, {
  eyebrow: string;
  title: string;
  lead: string;
  choose: string;
  descriptions: Record<CourseId, string>;
  request: string;
  action: string;
  details: string;
  telegram: string;
  note: string;
  reply: string;
  noObligation: string;
}> = {
  en: {
    eyebrow: "HOLISTIC HOUSE ACADEMY · WITH ANDREY",
    title: "Choose your Reiki course",
    lead: "Three paths to learn with me. Select the one that speaks to you, and ask about the next available start.",
    choose: "I would like to join",
    descriptions: {
      tantra: "Body awareness, life energy and connection",
      kundalini: "A clear three-level introduction to energy practice",
      yggdrasil: "Reiki, runes and a deeper structured learning path",
    },
    request: "I would like to enrol in this course. Please tell me about the starting level, upcoming dates, format, availability and current fees.",
    action: "Request to join",
    details: "Explore the selected course",
    telegram: "Or ask on Telegram",
    note: "Choose WhatsApp or Telegram. No message is sent until you press Send; enrolment is confirmed personally.",
    reply: "Personal reply",
    noObligation: "No obligation",
  },
  ru: {
    eyebrow: "АКАДЕМИЯ HOLISTIC HOUSE · С АНДРЕЕМ",
    title: "Выберите свой курс Рейки",
    lead: "Три направления обучения. Выберите подходящее и узнайте, когда можно начать.",
    choose: "Хочу записаться на",
    descriptions: {
      tantra: "Телесная чувствительность, энергия жизни и контакт",
      kundalini: "Понятный базовый путь из трёх ступеней",
      yggdrasil: "Рейки, руны и глубокая последовательная программа",
    },
    request: "Хочу записаться на этот курс. Подскажите подходящую первую ступень, ближайшие даты, формат, наличие мест и актуальную стоимость.",
    action: "Записаться на",
    details: "Подробнее о выбранном курсе",
    telegram: "Или написать в Telegram",
    note: "Выберите WhatsApp или Telegram: заявка будет содержать название курса. Сообщение отправляется только вами, запись подтверждается лично.",
    reply: "Личный ответ",
    noObligation: "Без обязательств",
  },
  es: {
    eyebrow: "ACADEMIA HOLISTIC HOUSE · CON ANDREY",
    title: "Elige tu curso de Reiki",
    lead: "Tres caminos para aprender conmigo. Elige el que más te interese y consulta cuándo puedes empezar.",
    choose: "Quiero inscribirme en",
    descriptions: {
      tantra: "Conciencia corporal, energía vital y conexión",
      kundalini: "Una introducción clara de tres niveles",
      yggdrasil: "Reiki, runas y un recorrido de aprendizaje profundo",
    },
    request: "Me gustaría inscribirme en este curso. ¿Cuál es el nivel inicial, las próximas fechas, la modalidad, las plazas disponibles y el precio actual?",
    action: "Solicitar inscripción en",
    details: "Conocer el curso elegido",
    telegram: "O preguntar en Telegram",
    note: "Elige WhatsApp o Telegram. El mensaje incluirá el curso elegido y solo se envía al pulsar Enviar; la inscripción se confirma personalmente.",
    reply: "Respuesta personal",
    noObligation: "Sin compromiso",
  },
};

export function AcademyCourseCapture({ locale }: { locale: PublicLocale }) {
  const [selected, setSelected] = useState<CourseId>("tantra");
  const c = copy[locale];
  const course = courses[selected];
  const coursePath = "/" + locale + "/academy/reiki/" + course.path;
  const enquiryUrl = whatsappEnquiryUrl({
    locale,
    service: course.title,
    request: c.request,
    option: c.action + " " + course.title,
    pagePath: coursePath,
  });

  return (
    <section
      className={styles.capture}
      data-consultation-cta="academy"
      data-academy-course-capture
      lang={locale}
      aria-labelledby="academy-course-capture-title"
    >
      <p className={styles.eyebrow}><GraduationCap aria-hidden="true" size={20} /> {c.eyebrow}</p>
      <h2 className={styles.title} id="academy-course-capture-title">{c.title}</h2>
      <p className={styles.lead}>{c.lead}</p>

      <p className={styles.question} id="academy-course-question">{c.choose}</p>
      <div className={styles.choices} role="group" aria-labelledby="academy-course-question">
        {courseOrder.map((id) => {
          const item = courses[id];
          const active = id === selected;
          return (
            <button
              type="button"
              className={styles.choice}
              data-selected={active}
              aria-pressed={active}
              data-academy-course-choice={id}
              key={id}
              onClick={() => setSelected(id)}
            >
              <span className={styles.photo}><Image src={cardArtworkUrl(item.image)} unoptimized={hasCardArtwork(item.image)} alt="" fill sizes="64px" /></span>
              <span className={styles.choiceCopy}>
                <strong>{item.title}</strong>
                <small>{c.descriptions[id]}</small>
              </span>
              <span className={styles.indicator} aria-hidden="true">{active ? <Check size={16} strokeWidth={3} /> : null}</span>
            </button>
          );
        })}
      </div>

      <ContactChannelChooser
        stayAfterSave
        locale={locale}
        whatsappUrl={enquiryUrl}
        className={styles.action}
        event="academy_course_enquiry_click"
        attributes={{ "data-academy-course": selected }}
      />
      <p className={styles.note}>{c.note}</p>

      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={15} aria-hidden="true" /> {c.reply}</span>
          <span><Check size={15} aria-hidden="true" /> {c.noObligation}</span>
        </div>
        <div className={styles.links}>
          <Link prefetch={false} href={coursePath}>{c.details} <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
