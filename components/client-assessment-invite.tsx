"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, HeartHandshake } from "lucide-react";

import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./client-assessment-invite.module.css";

type Topic = "goal" | "business" | "personal" | "wellbeing";

const topics: Topic[] = ["personal", "goal", "business", "wellbeing"];
const copy = {
  en: {
    title: "Free drawing-based situation review",
    intro: "A short questionnaire and a hand drawing of Me / Goal / Problem. Receive a personal written review.",
    choose: "Choose a topic",
    options: {
      personal: "Personal situation",
      goal: "Goals & decisions",
      business: "Work & business",
      wellbeing: "Wellbeing & energy",
    },
    action: "Get your complimentary assessment",
    details: "More about the service",
    service: "Free drawing-based situation review",
    request: "I would like to receive a free drawing-based situation review as a gift. Please send me the short questionnaire and instructions for the drawing by hand. I understand that I will receive a written report, not a free live call.",
    safety: "A written symbolic review, not a medical diagnosis or a free call.",
  },
  ru: {
    title: "Бесплатная диагностика по рисунку",
    intro: "Короткая анкета и рисунок «Я — цель — проблема». В ответ — письменный разбор.",
    choose: "Тема запроса",
    options: {
      personal: "Личная ситуация",
      goal: "Цели и решения",
      business: "Работа и бизнес",
      wellbeing: "Самочувствие и ресурс",
    },
    action: "Получить диагностику в подарок",
    details: "Подробнее об услуге",
    service: "Бесплатная диагностика ситуации по рисунку",
    request: "Хочу получить диагностику ситуации по рисунку в подарок. Пришлите, пожалуйста, короткую анкету и инструкцию для рисунка от руки «Я — цель — проблема». Понимаю, что услуга включает письменный разбор, без бесплатного созвона.",
    safety: "Письменный символический разбор — не медицинский диагноз и не бесплатный созвон.",
  },
  es: {
    title: "Evaluación gratuita mediante dibujo",
    intro: "Un breve formulario y un dibujo de Yo / Meta / Problema. Recibe una respuesta personal por escrito.",
    choose: "Elige el tema",
    options: {
      personal: "Situación personal",
      goal: "Metas y decisiones",
      business: "Trabajo y negocios",
      wellbeing: "Bienestar y energía",
    },
    action: "Recibir evaluación de regalo",
    details: "Más información sobre el servicio",
    service: "Evaluación gratuita mediante dibujo",
    request: "Quisiera recibir de regalo una evaluación de mi situación mediante un dibujo. Envíame el formulario breve y las instrucciones para dibujar a mano. Entiendo que recibiré un informe escrito, no una llamada gratuita.",
    safety: "Una reflexión simbólica escrita, no un diagnóstico médico ni una llamada gratuita.",
  },
} as const;

export function ClientAssessmentInvite({ locale }: { locale: PublicLocale }) {
  const t = copy[locale] || copy.en;
  const titleId = useId();
  const [topic, setTopic] = useState<Topic>("personal");
  const href = "/" + locale + "/services/free-situation-review?topic=" + topic;
  // The selected topic and approved public service details are the only context
  // passed to the messenger. No test answers, private links or reports are shared.
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: t.service,
    request: t.request,
    topic: t.options[topic],
    pagePath: "/" + locale + "/services/free-situation-review",
  });

  return (
    <section className={styles.invite} aria-labelledby={titleId} lang={locale} data-client-assessment-invite>
      <div className={styles.content}>
        <div className={styles.heading}>
          <span className={styles.icon}><HeartHandshake size={19} aria-hidden="true" /></span>
          <div>
            <h2 id={titleId}>{t.title}</h2>
            <p className={styles.intro}>{t.intro}</p>
          </div>
        </div>

        <fieldset className={styles.topics}>
          <legend>{t.choose}</legend>
          <div className={styles.options}>
            {topics.map((option) => (
              <button key={option} type="button" aria-pressed={topic === option} onClick={() => setTopic(option)}>
                {topic === option ? <Check size={14} aria-hidden="true" /> : null}
                {t.options[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.order} data-monitor-action="free-situation-review" data-gift-drawing-order>
          <ContactChannelChooser
            locale={locale}
            whatsappUrl={whatsappUrl}
            label={t.action}
            className={styles.action}
            event="service_request_start"
            analyticsEvent="free_situation_assessment_click"
            attributes={{ "data-gift-assessment-topic": topic }}
          />
        </div>
        <div className={styles.footer}>
          <small className={styles.safety}>{t.safety}</small>
          <Link href={href} className={styles.details} prefetch={false}>
            {t.details}<ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
