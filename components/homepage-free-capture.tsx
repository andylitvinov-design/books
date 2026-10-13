"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Brain, Check, FileText, Flower2, HeartHandshake, Send, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { Locale } from "@/data/remedies";
import styles from "./consultation-choice-capture.module.css";

type FreeOffer = "situation" | "wu" | "stress";

const offerOrder: FreeOffer[] = ["situation", "wu", "stress"];
const offerIcons = { situation: FileText, wu: Flower2, stress: Brain };

const copy = {
  en: {
    eyebrow: "THREE FREE SERVICES · HOLISTIC HOUSE",
    title: "Choose your free assessment",
    lead: "Begin with the question that matters to you. Choose one of three free options below — no paid appointment is required.",
    question: "What would you like to explore?",
    offers: {
      situation: {
        title: "Free situation analysis",
        description: "Short questionnaire + hand drawing of Me / Goal / Problem. Request a personal written review.",
        action: "Start free situation analysis",
        note: "Next: complete the form and send your hand drawing. You will receive a written review, not a free live call.",
      },
      wu: {
        title: "Free Wu Xing resources & wellbeing analysis",
        description: "Explore your energy, balance and resources through a symbolic Five Elements profile.",
        action: "Explore my free Wu Xing profile",
        note: "Next: request the personal resource overview. Wu Xing is a symbolic self-reflection model, not a medical diagnosis.",
      },
      stress: {
        title: "Stress check & personality portrait",
        description: "Take free wellbeing and personality questionnaires. Get results, explanations and practical guidance.",
        action: "Start free stress & personality tests",
        note: "Next: choose and take your tests. You can view the results first and optionally sign in to keep a history.",
      },
    },
    free: "Free to start",
    withoutBooking: "No paid session required",
    paid: "Looking for a personal paid consultation? See options (€50 / 30 min or €100 / 60 min)",
    telegram: "Or write on Telegram",
    disclaimer: "Self-checks are not medical diagnoses. Written assessments are provided after you send a request; they are not free live consultations.",
  },
  ru: {
    eyebrow: "ТРИ БЕСПЛАТНЫЕ УСЛУГИ · HOLISTIC HOUSE",
    title: "Выберите бесплатный анализ",
    lead: "Начните с того, что важно именно вам. Выберите один из трёх вариантов — платная консультация не требуется.",
    question: "Что вы хотите исследовать?",
    offers: {
      situation: {
        title: "Бесплатный анализ ситуации",
        description: "Короткая анкета и рисунок «Я / Цель / Проблема». Запросите персональный письменный разбор.",
        action: "Начать бесплатный анализ ситуации",
        note: "Далее: заполните анкету и отправьте рисунок. Вы получите письменный разбор, не бесплатный звонок.",
      },
      wu: {
        title: "Бесплатный анализ ресурсов и самочувствия по У-Син",
        description: "Исследуйте энергию, баланс и ресурсы через символическую модель пяти стихий.",
        action: "Получить бесплатный профиль У-Син",
        note: "Далее: запросите личный обзор ресурсов. У-Син — символическая модель самопознания, не медицинская диагностика.",
      },
      stress: {
        title: "Анализ стресса и психологический портрет",
        description: "Пройдите бесплатные тесты самочувствия и личности. Получите результаты, пояснения и рекомендации.",
        action: "Пройти бесплатные психологические тесты",
        note: "Далее: выберите и пройдите тесты. Результаты можно посмотреть сразу и при желании сохранить в кабинете.",
      },
    },
    free: "Бесплатно",
    withoutBooking: "Без обязательной платной сессии",
    paid: "Нужна личная платная консультация? Форматы: €50 / 30 мин или €100 / 60 мин",
    telegram: "Или напишите в Telegram",
    disclaimer: "Опросники не ставят медицинский диагноз. Личный разбор выполняется письменно после получения запроса, не в формате бесплатного звонка.",
  },
} as const;

export function HomepageFreeCapture({ locale }: { locale: Locale }) {
  const titleId = useId();
  const t = copy[locale];
  const [selected, setSelected] = useState<FreeOffer>("situation");
  const active = t.offers[selected];
  const ActiveIcon = offerIcons[selected];
  const href = selected === "situation" ? `/${locale}/services/free-situation-review`
    : selected === "wu" ? `/${locale}/services/dao-health-profile`
      : `/${locale}/client#cabinet-tests`;

  return (
    <section
      className={styles.capture}
      data-home-free-capture="true"
      data-consultation-capture="home-free"
      data-consultation-cta="true"
      data-conversion-kind="home-free"
      lang={locale}
      aria-labelledby={titleId}
    >
      <p className={styles.eyebrow}><HeartHandshake size={19} aria-hidden="true" />{t.eyebrow}</p>
      <h2 className={styles.title} id={titleId}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <p className={styles.question}>{t.question}</p>
      <div className={`${styles.choices} ${styles.homeFreeChoices}`} data-choice-layout="home-free" role="group" aria-label={t.question}>
        {offerOrder.map((id, index) => {
          const Icon = offerIcons[id];
          return (
            <button
              key={id}
              type="button"
              className={`${styles.choice} ${styles.homeFreeChoice}`}
              data-home-free-option={id}
              data-selected={selected === id}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              <span className={styles.homeFreeNumber} aria-hidden="true">0{index + 1}</span>
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              <span className={styles.homeFreeOptionText}>
                <strong>{t.offers[id].title}</strong>
                <small>{t.offers[id].description}</small>
              </span>
              {selected === id ? <Check className={styles.homeFreeCheck} size={18} strokeWidth={2.6} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <AcquisitionEventLink
        prefetch={false}
        className={styles.action}
        href={href}
        event={selected === "stress" ? "self_check_start" : "service_request_start"}
        analyticsEvent={selected === "situation" ? "free_situation_assessment_click" : undefined}
        attributes={{ "data-home-free-action": selected }}
      >
        <ActiveIcon size={19} aria-hidden="true" />
        <span>{active.action}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </AcquisitionEventLink>
      <p className={styles.note}>{active.note}</p>
      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={14} aria-hidden="true" />{t.free}</span>
          <span><Check size={14} aria-hidden="true" />{t.withoutBooking}</span>
        </div>
        <div className={styles.secondary}>
          <Link prefetch={false} href={`/${locale}/services`}><ShieldCheck size={14} aria-hidden="true" />{t.paid}</Link>
          <AcquisitionEventLink
            prefetch={false}
            href="https://t.me/AndyTherapist"
            target="_blank"
            rel="noopener noreferrer"
            event="contact_click"
            attributes={{ "data-contact-channel": "telegram" }}
          >
            <Send size={14} aria-hidden="true" />{t.telegram}
          </AcquisitionEventLink>
        </div>
      </div>
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </section>
  );
}
