"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { StaticPortrait } from "@/components/static-portrait";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-free-diagnosis-banner.module.css";

const copy = {
  en: {
    eyebrow: "FREE · PERSONAL REVIEW",
    title: "Free situation assessment",
    description: "Explore one question with a short questionnaire and a hand-drawn ME · GOAL · PROBLEM sketch.",
    benefits: ["Personal written review", "A clearer next step", "No fee or video call"],
    order: "Request for free",
    close: "Hide contact options",
    details: "How it works",
    formTitle: "Where can we reply?",
    formLead: "Choose WhatsApp or Telegram. Your contact is saved before the chat opens.",
    note: "A symbolic review, not a medical diagnosis. A request is not a confirmed appointment.",
  },
  ru: {
    eyebrow: "БЕСПЛАТНО · ЛИЧНЫЙ РАЗБОР",
    title: "Бесплатная диагностика ситуации",
    description: "Один важный вопрос, короткая анкета и рисунок «Я · Цель · Проблема».",
    benefits: ["Личный письменный разбор", "Яснее следующий шаг", "Без оплаты и созвона"],
    order: "Заказать бесплатно",
    close: "Скрыть способы связи",
    details: "Как это работает",
    formTitle: "Куда вам ответить?",
    formLead: "Выберите WhatsApp или Telegram. Контакт сохраняется перед открытием чата.",
    note: "Символический разбор, не медицинский диагноз. Заявка не означает подтверждённую запись.",
  },
  es: {
    eyebrow: "GRATIS · REVISIÓN PERSONAL",
    title: "Evaluación gratuita de tu situación",
    description: "Una pregunta importante, un formulario breve y un dibujo YO · META · PROBLEMA.",
    benefits: ["Informe personal escrito", "Un próximo paso más claro", "Sin pago ni videollamada"],
    order: "Solicitar gratis",
    close: "Ocultar opciones de contacto",
    details: "Cómo funciona",
    formTitle: "¿Dónde podemos responderte?",
    formLead: "Elige WhatsApp o Telegram. Tu contacto se guarda antes de abrir el chat.",
    note: "Reflexión simbólica, no diagnóstico médico. La solicitud no confirma una cita.",
  },
} as const;

/** A one-click expansion uses the existing verified CRM enquiry path; no answers or drawings leave this banner. */
export function HomeFreeDiagnosisBanner({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const formId = useId();

  return (
    <section className={styles.root} id="home-free-diagnosis" data-home-free-diagnosis-banner lang={locale}
      aria-label={t.title}>
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className={styles.description}>{t.description}</p>
        </div>
        <div className={styles.photo} aria-hidden="true">
          <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" width={240} height={240}
            className={styles.portrait} sizes="(max-width: 760px) 90px, 140px" loading="lazy" />
        </div>
        <ul className={styles.benefits}>
          {t.benefits.map(benefit => <li key={benefit}><Check size={14} aria-hidden="true" />{benefit}</li>)}
        </ul>
        <div className={styles.actions}>
          <button className={styles.order} type="button" onClick={() => setOpen(value => !value)}
            aria-expanded={open} aria-controls={formId} data-home-diagnosis-order>
            {open ? t.close : t.order}
            {open ? <ChevronDown size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
          </button>
          <Link className={styles.details} href={"/" + locale + "/services/free-situation-review"} prefetch={false}>
            {t.details}
          </Link>
        </div>
        <div id={formId} className={styles.request} hidden={!open} data-home-diagnosis-request>
          <CompactLeadCapture
            locale={locale}
            variant="messenger"
            serviceTitle="Free drawing-based situation review"
            sourcePath={"/" + locale + "/services/free-situation-review"}
            title={t.formTitle}
            lead={t.formLead}
          />
        </div>
        <p className={styles.note}>{t.note}</p>
      </div>
    </section>
  );
}
