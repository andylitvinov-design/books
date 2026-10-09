"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Compass, HeartHandshake, ShieldCheck } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./client-assessment-invite.module.css";

type Topic = "goal" | "business" | "personal" | "wellbeing";

const topics: Topic[] = ["personal", "goal", "business", "wellbeing"];
const copy = {
  en: {
    kicker: "Free personal introduction",
    title: "Feeling stuck? We can explore your next step together.",
    intro: "A goal, a difficult decision or something personal — start with a calm one-to-one conversation. Share only what feels comfortable.",
    choose: "What would you like to talk about?",
    options: {
      personal: "Personal situation",
      goal: "Goals & decisions",
      business: "Work & business",
      wellbeing: "Wellbeing & energy",
    },
    action: "Request a free conversation",
    note: "The next page lets you prepare a request. Nothing is sent until you confirm it in WhatsApp.",
    trust: ["Personal reply", "No obligation", "Private conversation"],
    artOne: "Choose your topic",
    artTwo: "Talk it through",
    safety: "An introductory conversation, not a medical diagnosis.",
  },
  ru: {
    kicker: "Личное знакомство · бесплатно",
    title: "Не знаете, с чего начать? Давайте разберёмся вместе.",
    intro: "Важная цель, сложное решение или личный вопрос — начните со спокойного разговора один на один. Подробностями можно поделиться позже.",
    choose: "О чём хотите поговорить?",
    options: {
      personal: "Личная ситуация",
      goal: "Цели и решения",
      business: "Работа и бизнес",
      wellbeing: "Самочувствие и ресурс",
    },
    action: "Запросить бесплатный разбор",
    note: "На следующей странице можно подготовить обращение. Оно отправится только после вашего подтверждения в WhatsApp.",
    trust: ["Личный ответ", "Без обязательств", "Конфиденциально"],
    artOne: "Выберите тему",
    artTwo: "Обсудим вместе",
    safety: "Вводная беседа, а не медицинский диагноз.",
  },
  es: {
    kicker: "Conversación personal gratuita",
    title: "¿No sabes por dónde empezar? Podemos hablarlo juntos.",
    intro: "Una meta, una decisión o una situación personal: comienza con una conversación tranquila. Comparte solo lo que desees.",
    choose: "¿De qué te gustaría hablar?",
    options: {
      personal: "Situación personal",
      goal: "Metas y decisiones",
      business: "Trabajo y negocios",
      wellbeing: "Bienestar y energía",
    },
    action: "Solicitar una conversación gratuita",
    note: "La siguiente página prepara un mensaje que solo se envía cuando lo confirmes en WhatsApp.",
    trust: ["Respuesta personal", "Sin compromiso", "Conversación privada"],
    artOne: "Elige el tema",
    artTwo: "Conversemos",
    safety: "Una conversación inicial, no un diagnóstico médico.",
  },
} as const;

export function ClientAssessmentInvite({ locale }: { locale: PublicLocale }) {
  const t = copy[locale] || copy.en;
  const [topic, setTopic] = useState<Topic>("personal");
  const destinationLocale = locale === "es" ? "en" : locale;
  const href = "/" + destinationLocale + "/services/free-situation-review?topic=" + topic;

  return (
    <section className={styles.invite} aria-label={t.kicker} data-client-assessment-invite>
      <div className={styles.content}>
        <span className={styles.kicker}><HeartHandshake size={17} aria-hidden="true" />{t.kicker}</span>
        <h2>{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>

        <fieldset className={styles.topics}>
          <legend>{t.choose}</legend>
          <div className={styles.options}>
            {topics.map((option) => (
              <button key={option} type="button" aria-pressed={topic === option} onClick={() => setTopic(option)}>
                {topic === option && <Check size={15} aria-hidden="true" />}
                {t.options[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.actions}>
          <Link href={href} className={styles.action} data-monitor-action="free-situation-review">
            {t.action}<ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <p>{t.note}</p>
        </div>
        <div className={styles.trust}>
          {t.trust.map((item) => <span key={item}><ShieldCheck size={15} aria-hidden="true" />{item}</span>)}
        </div>
        <small className={styles.safety}>{t.safety}</small>
      </div>

      <div className={styles.art} aria-hidden="true">
        <div className={styles.orbit}>
          <span className={styles.orbitInner} />
          <span className={styles.orbitMarkOne} />
          <span className={styles.orbitMarkTwo} />
          <span className={styles.artCore}><Compass size={61} strokeWidth={1.15} /></span>
        </div>
        <div className={styles.artLabel}><span>01</span>{t.artOne}</div>
        <div className={styles.artLabel}><span>02</span>{t.artTwo}</div>
      </div>
    </section>
  );
}
