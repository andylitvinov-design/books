"use client";

import Link from "next/link";
import { ArrowUpRight, Brain, Compass, Flower2 } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { Locale } from "@/data/remedies";
import styles from "./free-insights-paths.module.css";

type OfferId = "stress" | "situation" | "wu";
type OfferCopy = { id: OfferId; label: string; title: string; description: string; action: string };
const COPY: Record<Locale, { eyebrow: string; title: string; intro: string; paths: OfferCopy[] }> = {
  en: {
    eyebrow: "THREE FREE STARTING POINTS",
    title: "Start with a free personal assessment",
    intro: "Choose a personal written review or a self-check with clear results. No paid session is required.",
    paths: [
      {
        id: "situation",
        label: "Free · Written review",
        title: "Free situation analysis",
        description: "Describe your question, complete a short form and draw Me / Goal / Problem. Request Andrey's personal written reflection.",
        action: "Request free situation analysis",
      },
      {
        id: "wu",
        label: "Free · Five Elements",
        title: "Free Wu Xing resources & wellbeing profile",
        description: "Explore energy, balance and inner resources through a symbolic Five Elements model. Request a personal written profile.",
        action: "Request free Wu Xing profile",
      },
      {
        id: "stress",
        label: "Free · Self-tests",
        title: "Stress assessment & personality portrait",
        description: "Take stress, wellbeing and personality questionnaires. See scores, explanations and practical recommendations, and save results to track changes.",
        action: "Start free tests",
      },
    ],
  },
  ru: {
    eyebrow: "ТРИ БЕСПЛАТНЫЕ ВОЗМОЖНОСТИ",
    title: "Начните с бесплатного анализа",
    intro: "Выберите личный письменный разбор или пройдите тесты с понятными результатами. Платная сессия не требуется.",
    paths: [
      {
        id: "situation",
        label: "Бесплатно · Письменный разбор",
        title: "Бесплатный анализ ситуации",
        description: "Опишите вопрос, заполните короткую анкету и сделайте рисунок «Я / Цель / Проблема». Запросите персональный письменный разбор.",
        action: "Заказать анализ ситуации",
      },
      {
        id: "wu",
        label: "Бесплатно · Пять стихий",
        title: "Бесплатный анализ ресурсов и самочувствия по У-Син",
        description: "Исследуйте энергию, баланс и внутренние ресурсы через символическую модель пяти стихий. Запросите личный письменный профиль.",
        action: "Заказать профиль У-Син",
      },
      {
        id: "stress",
        label: "Бесплатно · Тестирование",
        title: "Анализ стресса и психологический портрет",
        description: "Пройдите опросники о стрессе, самочувствии и чертах личности. Получите показатели, объяснения и рекомендации, сохраняйте результаты в кабинете.",
        action: "Пройти бесплатные тесты",
      },
    ],
  },
};
const ICONS = { stress: Brain, situation: Compass, wu: Flower2 };

export function FreeInsightsPaths({
  locale,
  variant = "public",
  testHref,
}: {
  locale: Locale;
  variant?: "public" | "cabinet";
  testHref?: string;
}) {
  const content = COPY[locale];
  const inCabinet = variant === "cabinet";
  const headingId = inCabinet ? "cabinet-free-insights-title" : "free-insights-title";
  return (
    <section
      id={inCabinet ? undefined : "free-insights"}
      className={[styles.shell, inCabinet ? styles.cabinet : ""].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
      data-free-insights={variant}
    >
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id={headingId}>{content.title}</h2>
        </div>
        <p className={styles.intro}>{content.intro}</p>
      </header>
      <div className={styles.grid}>
        {content.paths.map((path, index) => {
          const Icon = ICONS[path.id];
          const href = path.id === "stress"
            ? (testHref || "/" + locale + "/client")
            : "/" + locale + "/services/" + (path.id === "situation" ? "free-situation-review" : "dao-health-profile");
          const action = <>{path.action}<ArrowUpRight size={16} aria-hidden="true" /></>;
          return (
            <article className={styles.item} key={path.id} data-free-insights-offer={path.id}>
              <div className={styles.meta}>
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                <span className={styles.number}>0{index + 1}</span>
                <span className={styles.label}>{path.label}</span>
              </div>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              {inCabinet ? (
                <Link className={styles.action} href={href} prefetch={false}>{action}</Link>
              ) : (
                <AcquisitionEventLink
                  className={styles.action}
                  href={href}
                  event={path.id === "stress" ? "self_check_start" : "service_request_start"}
                >{action}</AcquisitionEventLink>
              )}
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        {locale === "ru"
          ? "У-Син — символическая модель ресурсов, не медицинская диагностика. Тесты не ставят диагноз. Личные разборы письменные, это не бесплатный звонок."
          : "Wu Xing is a symbolic reflection, not a health diagnosis. Self-checks are not medical diagnoses. Personal reviews are written after a request, not free live calls."}
      </p>
    </section>
  );
}
