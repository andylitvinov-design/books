"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, HeartHandshake } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
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
    action: "Start free review",
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
    action: "Начать диагностику",
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
    action: "Iniciar evaluación",
    safety: "Una reflexión simbólica escrita, no un diagnóstico médico ni una llamada gratuita.",
  },
} as const;

export function ClientAssessmentInvite({ locale }: { locale: PublicLocale }) {
  const t = copy[locale] || copy.en;
  const titleId = useId();
  const [topic, setTopic] = useState<Topic>("personal");
  const destinationLocale = locale === "es" ? "en" : locale;
  const href = "/" + destinationLocale + "/services/free-situation-review?topic=" + topic;

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

        <Link href={href} className={styles.action} data-monitor-action="free-situation-review">
          {t.action}<ArrowUpRight size={19} aria-hidden="true" />
        </Link>
        <small className={styles.safety}>{t.safety}</small>
      </div>
    </section>
  );
}
