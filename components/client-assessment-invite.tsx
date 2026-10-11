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
    kicker: "Free drawing assessment",
    title: "Feeling stuck? Start with a free drawing review.",
    intro: "Describe your problem in a coaching form, draw ME / GOAL / PROBLEM with a pen on paper, and receive my written report.",
    choose: "What is your question about?",
    options: {
      personal: "Personal situation",
      goal: "Goals & decisions",
      business: "Work & business",
      wellbeing: "Wellbeing & energy",
    },
    action: "Start free drawing assessment",
    note: "Next: complete the coaching form and attach a photo of your paper drawing. Nothing is sent until you confirm it in WhatsApp.",
    trust: ["Written report", "No obligation", "You decide what to send"],
    artOne: "Choose your topic",
    artTwo: "Draw and send",
    safety: "A symbolic drawing assessment, not a medical diagnosis or free call.",
  },
  ru: {
    kicker: "Бесплатная диагностика ситуации",
    title: "Бесплатная диагностика ситуации по рисунку",
    intro: "Опишите проблему в коучинг-форме, нарисуйте ручкой «Я — цель — проблема» и получите письменный отчёт.",
    choose: "К какой теме относится ваш запрос?",
    options: {
      personal: "Личная ситуация",
      goal: "Цели и решения",
      business: "Работа и бизнес",
      wellbeing: "Самочувствие и ресурс",
    },
    action: "Начать диагностику по рисунку",
    note: "На следующей странице заполните анкету и подготовьте фото рисунка. Отправка — только после подтверждения в WhatsApp.",
    trust: ["Письменный отчёт", "Без обязательств", "Отправляете сами"],
    artOne: "Выберите тему",
    artTwo: "Рисунок и отчёт",
    safety: "Символический разбор рисунка, не медицинский диагноз. Бесплатного звонка нет.",
  },
  es: {
    kicker: "Evaluación gratuita mediante dibujo",
    title: "¿No sabes por dónde empezar? Empieza con un dibujo.",
    intro: "Describe tu situación en el formulario de coaching, dibuja YO / META / PROBLEMA con bolígrafo y recibe un informe escrito.",
    choose: "¿Sobre qué trata tu consulta?",
    options: {
      personal: "Situación personal",
      goal: "Metas y decisiones",
      business: "Trabajo y negocios",
      wellbeing: "Bienestar y energía",
    },
    action: "Iniciar evaluación gratuita mediante dibujo",
    note: "En la siguiente página prepara tus respuestas y una foto del dibujo. Tú decides cuándo enviarlas por WhatsApp.",
    trust: ["Informe escrito", "Sin compromiso", "Tú decides qué enviar"],
    artOne: "Elige el tema",
    artTwo: "Dibuja y envía",
    safety: "Una interpretación simbólica del dibujo, no un diagnóstico médico ni una llamada gratuita.",
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
